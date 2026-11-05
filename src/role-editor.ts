/**
 * Role-file editing behind the settings page.
 *
 * A save changes exactly one role line and leaves every other byte intact.
 * Every route is validated against the live model catalogue before the first
 * byte is written, so a rejected save leaves the file unchanged.
 */

import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

import { collectCatalogue, type ModelsLlm } from "./models.ts";
import {
  parseRoleConfiguration,
  readRoleConfiguration,
  type RoleConfiguration,
  type RoleEntry,
  type Route,
} from "./role-config.ts";
import { ROLE_MANIFEST, findRole, normalizeRoleName } from "./role-manifest.ts";
import type {
  RoleFileSnapshot,
  RoleView,
  RouteView,
  SaveBudgetRequest,
  SaveBudgetResult,
  SaveRoleRequest,
  SaveRoleResult,
} from "./role-wire.ts";

/** Project one parsed file onto the manifest. */
export function snapshotFromConfiguration(config: RoleConfiguration): RoleFileSnapshot {
  if (config.status === "unreadable") {
    return {
      path: config.path,
      status: "unreadable",
      reason: config.reason,
      roles: ROLE_MANIFEST.map((role) => roleView(role.key, role.shape, undefined)),
      issues: [],
      canSave: false,
    };
  }
  if (config.status === "missing") {
    return {
      path: config.path,
      status: "missing",
      roles: ROLE_MANIFEST.map((role) => roleView(role.key, role.shape, undefined)),
      issues: [],
      canSave: true,
    };
  }
  return {
    path: config.path,
    status: "loaded",
    ...(config.budget === undefined ? {} : { budget: config.budget }),
    roles: ROLE_MANIFEST.map((role) => roleView(role.key, role.shape, config.roles.get(role.key))),
    issues: config.issues.map((issue) => ({
      ...(issue.line === undefined ? {} : { line: issue.line }),
      message: issue.message,
    })),
    canSave: true,
  };
}

function roleView(key: string, shape: "single" | "list", entry: RoleEntry | undefined): RoleView {
  return {
    key,
    shape,
    configured: entry !== undefined,
    ...(entry === undefined ? {} : { line: entry.line }),
    routes: entry === undefined ? [] : entry.routes.map(routeView),
    issues: entry === undefined ? [] : [...entry.issues],
  };
}

function routeView(route: Route): RouteView {
  if (route.kind === "inherit") return { kind: "inherit", alias: route.alias ?? "inherit-parent" };
  return {
    kind: "route",
    provider: route.provider,
    model: route.model,
    ...(route.effort === undefined ? {} : { effort: route.effort }),
  };
}

/** Validate a save against the manifest and the live model catalogue. */
export function validateSaveRequest(
  request: SaveRoleRequest,
  catalogue: Awaited<ReturnType<typeof collectCatalogue>>,
): { ok: true; key: string; routes: readonly Route[] } | { ok: false; reason: string } {
  if (typeof request !== "object" || request === null || !Array.isArray(request.routes)) {
    return { ok: false, reason: "the save request must carry a role key and a route list" };
  }
  const spec = findRole(request.key);
  if (spec === undefined)
    return { ok: false, reason: `unknown pstack role ${JSON.stringify(request.key)}` };
  if (spec.shape === "single" && request.routes.length !== 1) {
    return { ok: false, reason: `role "${spec.key}" holds a single route; save exactly one` };
  }
  if (request.routes.length === 0) {
    return { ok: false, reason: `role "${spec.key}" must keep at least one route` };
  }
  const routes: Route[] = [];
  for (const [index, route] of request.routes.entries()) {
    if (route.kind === "inherit") {
      if (route.alias !== "inherit-parent" && route.alias !== "auto") {
        return { ok: false, reason: `route ${index + 1} has an unknown inheritance alias` };
      }
      routes.push({ kind: "inherit", alias: route.alias });
      continue;
    }
    const provider = route.provider.trim();
    const model = route.model.trim();
    if (provider === "" || model === "") {
      return { ok: false, reason: `route ${index + 1} needs both a provider and a model` };
    }
    const providerEntry = catalogue.providers.find((entry) => entry.provider === provider);
    if (providerEntry === undefined) {
      return {
        ok: false,
        reason: `provider ${JSON.stringify(provider)} is not in the live model directory`,
      };
    }
    if (providerEntry.error !== undefined) {
      return {
        ok: false,
        reason: `provider ${JSON.stringify(provider)} failed discovery: ${providerEntry.error}`,
      };
    }
    const modelEntry = providerEntry.models.find((entry) => entry.id === model);
    if (modelEntry === undefined) {
      return {
        ok: false,
        reason: `provider ${JSON.stringify(provider)} does not advertise ${JSON.stringify(model)}`,
      };
    }
    if (modelEntry.error !== undefined) {
      return {
        ok: false,
        reason: `model ${JSON.stringify(`${provider}/${model}`)} failed discovery: ${modelEntry.error}`,
      };
    }
    const effort = route.effort?.trim();
    if (effort !== undefined && effort !== "" && !modelEntry.efforts.includes(effort)) {
      return {
        ok: false,
        reason: `model ${JSON.stringify(`${provider}/${model}`)} does not advertise effort ${JSON.stringify(effort)}`,
      };
    }
    routes.push({
      kind: "route",
      provider,
      model,
      ...(effort === undefined || effort === "" ? {} : { effort }),
    });
  }
  return { ok: true, key: spec.key, routes };
}

/** Render one role value in the file grammar. */
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

/** Replace or append one role line, leaving every other line unchanged. */
export function updateRoleText(text: string, key: string, value: string): string {
  const target = normalizeRoleName(key);
  const lines = text === "" ? [] : text.replace(/\n$/, "").split(/\r?\n/);
  let replaced = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    if (normalizeRoleName(line.slice(0, colon)) !== target) continue;
    lines[index] = `${key}: ${value}`;
    replaced = true;
    break;
  }
  if (!replaced) {
    if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
    lines.push(`${key}: ${value}`);
  }
  return `${lines.join("\n")}\n`;
}

/** Replace, append, or remove the budget comment line, leaving every other line unchanged. */
export function updateBudgetText(text: string, budget: string): string {
  const normalized = budget.trim();
  const lines = text === "" ? [] : text.replace(/\n$/, "").split(/\r?\n/);
  const index = lines.findIndex((line) => /^#\s*budget\s*:/i.test(line.trim()));
  if (index >= 0) {
    if (normalized === "") lines.splice(index, 1);
    else lines[index] = `# budget: ${normalized}`;
  } else if (normalized !== "") {
    lines.unshift(`# budget: ${normalized}`);
  }
  return lines.length === 0 ? "" : `${lines.join("\n")}\n`;
}

/** Save one role and return the reloaded snapshot. */
export async function saveRoleConfiguration(
  path: string,
  request: SaveRoleRequest,
  llm: ModelsLlm,
  signal: AbortSignal,
): Promise<SaveRoleResult> {
  const current = readRoleConfiguration(path);
  if (current.status === "unreadable") {
    return { ok: false, reason: `the role file is unreadable: ${current.reason}` };
  }
  const catalogue = await collectCatalogue(llm, undefined, signal);
  signal.throwIfAborted();
  const validation = validateSaveRequest(request, catalogue);
  if (!validation.ok) return validation;

  let text = "";
  if (current.status === "loaded") {
    try {
      text = readFileSync(path, "utf8");
    } catch (error) {
      return { ok: false, reason: `the role file could not be read: ${describeError(error)}` };
    }
  }
  const next = updateRoleText(text, validation.key, renderRoleValue(validation.routes));
  try {
    writeAtomically(path, next);
  } catch (error) {
    return { ok: false, reason: `the role file could not be written: ${describeError(error)}` };
  }
  return { ok: true, snapshot: snapshotFromConfiguration(parseRoleConfiguration(next, path)) };
}

/** Save the budget line and return the reloaded snapshot. */
export function saveBudgetConfiguration(
  path: string,
  request: SaveBudgetRequest,
): SaveBudgetResult {
  const current = readRoleConfiguration(path);
  if (current.status === "unreadable") {
    return { ok: false, reason: `the role file is unreadable: ${current.reason}` };
  }
  let text = "";
  if (current.status === "loaded") {
    try {
      text = readFileSync(path, "utf8");
    } catch (error) {
      return { ok: false, reason: `the role file could not be read: ${describeError(error)}` };
    }
  }
  const next = updateBudgetText(text, request.budget);
  try {
    writeAtomically(path, next);
  } catch (error) {
    return { ok: false, reason: `the role file could not be written: ${describeError(error)}` };
  }
  return { ok: true, snapshot: snapshotFromConfiguration(parseRoleConfiguration(next, path)) };
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

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
