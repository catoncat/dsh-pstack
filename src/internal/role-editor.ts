/**
 * Role-file editing behind the Plugins configuration page.
 *
 * The writer changes exactly one role line and leaves every other byte of the
 * file alone: unknown lines, malformed lines, comments, and `# budget` survive a
 * save. Saves are validated against the live `pstack_models` catalogue before
 * the first byte is written, so a rejected save leaves the file unchanged.
 */

import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { CatalogueResult } from "../models.ts";
import { updateRoleDocument } from "./role-grammar.ts";
import {
  INHERIT_PARENT_ALIASES,
  ROLE_MANIFEST,
  findRoleSpec,
  type ManifestRoleSpec,
  type RoleSpec,
} from "./role-manifest.ts";
import {
  normalizeRoleName,
  readRoleConfiguration,
  type RoleConfiguration,
  type RoleEntry,
  type Route,
} from "./role-config.ts";
import type {
  RoleFileSnapshot,
  RoleView,
  RouteView,
  SaveRoleRequest,
  SaveRoleResult,
} from "./role-wire.ts";

function routeView(route: Route): RouteView {
  if (route.kind === "inherit") {
    return { kind: "inherit", alias: route.alias ?? "inherit-parent" };
  }
  return {
    kind: "route",
    provider: route.provider,
    model: route.model,
    ...(route.effort === undefined ? {} : { effort: route.effort }),
  };
}

function roleView(spec: ManifestRoleSpec, entry: RoleEntry | undefined): RoleView {
  return {
    key: spec.key,
    shape: spec.shape,
    configured: entry !== undefined,
    ...(entry === undefined ? {} : { line: entry.line }),
    routes: entry === undefined ? [] : entry.routes.map(routeView),
    issues: entry === undefined ? [] : [...entry.issues],
  };
}

/** Project a parsed file onto the manifest, preserving order and per-line issues. */
export function snapshotFromConfiguration(config: RoleConfiguration): RoleFileSnapshot {
  if (config.status === "unreadable") {
    return {
      path: config.path,
      status: "unreadable",
      reason: config.reason,
      roles: ROLE_MANIFEST.map((spec) => roleView(spec, undefined)),
      issues: [],
      canSave: false,
    };
  }
  if (config.status === "missing") {
    return {
      path: config.path,
      status: "missing",
      roles: ROLE_MANIFEST.map((spec) => roleView(spec, undefined)),
      issues: [],
      canSave: true,
    };
  }
  return {
    path: config.path,
    status: "loaded",
    ...(config.budget === undefined ? {} : { budget: config.budget }),
    roles: ROLE_MANIFEST.map((spec) => roleView(spec, config.roles.get(spec.key))),
    issues: config.issues.map((issue) => ({
      ...(issue.line === undefined ? {} : { line: issue.line }),
      message: issue.message,
    })),
    canSave: true,
  };
}

export interface ValidatedSave {
  readonly spec: RoleSpec;
  readonly routes: readonly Route[];
}

export type SaveValidation =
  | { readonly ok: true; readonly value: ValidatedSave }
  | { readonly ok: false; readonly reason: string };

/** Validate one save against the manifest and the live catalogue. */
export function validateSaveRequest(
  request: SaveRoleRequest,
  catalogue: CatalogueResult,
): SaveValidation {
  if (typeof request !== "object" || request === null || Array.isArray(request)) {
    return { ok: false, reason: "the save request must be an object" };
  }
  if (typeof request.key !== "string") {
    return { ok: false, reason: "the save request must name a role" };
  }
  const spec = findRoleSpec(normalizeRoleName(request.key));
  if (spec === undefined) {
    return { ok: false, reason: `unknown role ${JSON.stringify(request.key)}` };
  }
  if (!Array.isArray(request.routes)) {
    return { ok: false, reason: `role "${spec.key}" must carry a route list` };
  }
  if (spec.shape === "single" && request.routes.length !== 1) {
    return {
      ok: false,
      reason: `role "${spec.key}" holds a single route; save exactly one`,
    };
  }
  if (request.routes.length === 0) {
    return { ok: false, reason: `role "${spec.key}" must keep at least one route` };
  }

  const routes: Route[] = [];
  for (let index = 0; index < request.routes.length; index += 1) {
    const route = request.routes[index] as RouteView;
    const position = request.routes.length === 1 ? "the route" : `route ${index + 1}`;
    if (typeof route !== "object" || route === null || Array.isArray(route)) {
      return { ok: false, reason: `${position} must be an object` };
    }
    if (route.kind === "inherit") {
      const alias = route.alias ?? "inherit-parent";
      if (!INHERIT_PARENT_ALIASES.includes(alias)) {
        return {
          ok: false,
          reason: `${position} has unknown inheritance alias ${JSON.stringify(alias)}; use \`inherit-parent\` or \`auto\``,
        };
      }
      routes.push({ kind: "inherit", alias });
      continue;
    }
    const unknownKind = (route as { readonly kind?: unknown }).kind;
    if (unknownKind !== "route") {
      return { ok: false, reason: `${position} has unknown kind ${JSON.stringify(unknownKind)}` };
    }
    const provider = typeof route.provider === "string" ? route.provider.trim() : "";
    const model = typeof route.model === "string" ? route.model.trim() : "";
    if (provider === "" || model === "") {
      return { ok: false, reason: `${position} needs both a provider and a model` };
    }
    const providerEntry = catalogue.providers.find((candidate) => candidate.provider === provider);
    if (providerEntry === undefined) {
      return {
        ok: false,
        reason: `provider ${JSON.stringify(provider)} is not in the live model directory; run \`pstack_models\` and pick a registered provider`,
      };
    }
    if (providerEntry.error !== undefined) {
      return {
        ok: false,
        reason: `provider ${JSON.stringify(provider)} could not be discovered: ${providerEntry.error}`,
      };
    }
    const modelEntry = providerEntry.models.find((candidate) => candidate.id === model);
    if (modelEntry === undefined) {
      return {
        ok: false,
        reason: `provider ${JSON.stringify(provider)} does not advertise model ${JSON.stringify(model)}`,
      };
    }
    if (modelEntry.error !== undefined) {
      return {
        ok: false,
        reason: `model ${JSON.stringify(`${provider}/${model}`)} could not be resolved: ${modelEntry.error}`,
      };
    }
    const effort = typeof route.effort === "string" ? route.effort.trim() : route.effort;
    if (effort !== undefined && effort !== "") {
      if (!modelEntry.efforts.includes(effort)) {
        return {
          ok: false,
          reason: `model ${JSON.stringify(`${provider}/${model}`)} does not declare effort ${JSON.stringify(effort)}; declared efforts: ${
            modelEntry.efforts.length === 0 ? "none" : modelEntry.efforts.join(", ")
          }`,
        };
      }
      routes.push({ kind: "route", provider, model, effort });
      continue;
    }
    if (effort === "") {
      return { ok: false, reason: `${position} has an empty effort; drop the effort or pick one` };
    }
    routes.push({ kind: "route", provider, model });
  }
  return { ok: true, value: { spec, routes } };
}

/** Render one role's routes in the role-file grammar. */
export function renderRoleValue(routes: readonly Route[]): string {
  return routes
    .map((route) =>
      route.kind === "inherit"
        ? (route.alias ?? "inherit-parent")
        : route.effort === undefined
          ? `${route.provider}/${route.model}`
          : `${route.provider}/${route.model} [${route.effort}]`,
    )
    .join(", ");
}

/** Update the winning role through the same line grammar used by the parser. */
export function updateRoleText(text: string, spec: RoleSpec, value: string): string {
  return updateRoleDocument(text, spec, value);
}

function writeAtomically(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, text, "utf8");
    renameSync(temporary, path);
  } catch (error) {
    rmSync(temporary, { force: true });
    throw error;
  }
}

/**
 * Save one role and return the reloaded snapshot.
 *
 * A missing file is created with just this role. An unreadable file is never
 * overwritten. Every refusal leaves the existing bytes untouched.
 */
export function saveRoleConfiguration(
  path: string,
  request: SaveRoleRequest,
  catalogue: CatalogueResult,
): SaveRoleResult {
  const current = readRoleConfiguration(path);
  if (current.status === "unreadable") {
    return {
      ok: false,
      reason: `the role file is unreadable: ${current.reason}`,
    };
  }
  const validation = validateSaveRequest(request, catalogue);
  if (!validation.ok) return validation;

  let existing = "";
  if (current.status === "loaded") {
    try {
      existing = readFileSync(path, "utf8");
    } catch (error) {
      return { ok: false, reason: `the role file could not be read: ${describeError(error)}` };
    }
  }
  const next = updateRoleText(
    existing,
    validation.value.spec,
    renderRoleValue(validation.value.routes),
  );
  try {
    writeAtomically(path, next);
  } catch (error) {
    return { ok: false, reason: `the role file could not be written: ${describeError(error)}` };
  }
  return { ok: true, snapshot: snapshotFromConfiguration(readRoleConfiguration(path)) };
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? `${error.message} (${code})` : error.message;
  }
  return String(error);
}
