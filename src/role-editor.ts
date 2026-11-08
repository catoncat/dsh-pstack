/**
 * Role-file editing behind the settings page.
 *
 * A save changes or removes one logical role entry and preserves the other
 * logical lines. The editor normalizes line endings and the final newline.
 * Concrete routes are validated against the live model catalogue before the
 * first byte is written, so a rejected save leaves the file unchanged.
 */

import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

import type { LlmRuntime } from "@deepseek-ai/dsh-llm";

import { collectCatalogue } from "./models.ts";
import {
  isBudgetRowBlocked,
  planBudget,
  parseBudgetApplyRequest,
  renderBudgetText,
  type BudgetApplyRequest,
} from "./budget.ts";
import { parseRoleFileDocument, isRoleLineFor } from "./role-file.ts";
import {
  parseRoleConfiguration,
  readRoleConfiguration,
  type RoleConfiguration,
  type RoleEntry,
  type Route,
} from "./role-config.ts";
import { ROLE_MANIFEST, findRole } from "./role-manifest.ts";
import { renderRouteValue, validateRouteParts } from "./route.ts";
import {
  parseSaveRoleRequest,
  type RoleFileSnapshot,
  type RoleView,
  type RouteView,
  type SaveRoleRequest,
  type SaveRoleResult,
  type BudgetApplyResult,
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
  if (
    typeof request !== "object" ||
    request === null ||
    typeof request.key !== "string" ||
    !Array.isArray(request.routes)
  ) {
    return { ok: false, reason: "the save request must carry a role key and a route list" };
  }
  const spec = findRole(request.key);
  if (spec === undefined)
    return { ok: false, reason: `unknown pstack role ${JSON.stringify(request.key)}` };
  if (spec.shape === "single" && request.routes.length > 1) {
    return { ok: false, reason: `role "${spec.key}" holds at most one route` };
  }
  if (request.routes.length === 0) return { ok: true, key: spec.key, routes: [] };
  const routes: Route[] = [];
  for (const [index, route] of request.routes.entries()) {
    if (typeof route !== "object" || route === null) {
      return { ok: false, reason: `route ${index + 1} must be an object` };
    }
    if (route.kind === "inherit") {
      if (route.alias !== "inherit-parent" && route.alias !== "auto") {
        return { ok: false, reason: `route ${index + 1} has an unknown inheritance alias` };
      }
      routes.push({ kind: "inherit", alias: route.alias });
      continue;
    }
    if (route.kind !== "route") {
      return { ok: false, reason: `route ${index + 1} has an unknown kind` };
    }
    if (typeof route.provider !== "string" || typeof route.model !== "string") {
      return { ok: false, reason: `route ${index + 1} needs provider and model strings` };
    }
    const provider = route.provider.trim();
    const model = route.model.trim();
    if (provider === "" || model === "") {
      return { ok: false, reason: `route ${index + 1} needs both a provider and a model` };
    }
    if (route.effort !== undefined && typeof route.effort !== "string") {
      return { ok: false, reason: `route ${index + 1} has a non-string effort` };
    }
    const effort = route.effort?.trim();
    const routeIssue = validateRouteParts(provider, model, effort);
    if (routeIssue !== undefined) {
      return { ok: false, reason: `route ${index + 1} ${routeIssue}` };
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
  return renderRouteValue(routes);
}

/** Replace or append one role line, preserving the other logical lines. */
export function updateRoleText(text: string, key: string, value: string): string {
  const document = parseRoleFileDocument(text.replace(/\n$/, ""), "");
  let target = -1;
  document.lines.forEach((line, index) => {
    if (isRoleLineFor(line, key)) target = index;
  });
  const lines = document.lines.map((line, index) =>
    index === target ? `${key}: ${value}` : line.raw,
  );
  if (target === -1) {
    if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
    lines.push(`${key}: ${value}`);
  }
  return `${lines.join("\n")}\n`;
}

/** Remove every matching role line. Clearing an absent role is a no-op. */
export function removeRoleText(text: string, key: string): string {
  const document = parseRoleFileDocument(text.replace(/\n$/, ""), "");
  const remaining = document.lines
    .filter((line) => !isRoleLineFor(line, key))
    .map((line) => line.raw);
  if (remaining.length === document.lines.length) return text;
  return remaining.length === 0 ? "" : `${remaining.join("\n")}\n`;
}

/** Save one role and return the reloaded snapshot. */
export async function saveRoleConfiguration(
  path: string,
  request: SaveRoleRequest,
  llm: LlmRuntime,
  signal: AbortSignal,
): Promise<SaveRoleResult> {
  signal.throwIfAborted();
  let parsed: SaveRoleRequest;
  try {
    parsed = parseSaveRoleRequest(request);
  } catch (error) {
    return { ok: false, reason: describeError(error) };
  }

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

  let next: string;
  if (parsed.routes.length === 0) {
    const validation = validateSaveRequest(parsed, { providers: [], truncated: false });
    if (!validation.ok) return validation;
    next = removeRoleText(text, validation.key);
  } else if (parsed.routes.every((route) => route.kind === "inherit")) {
    const validation = validateSaveRequest(parsed, { providers: [], truncated: false });
    if (!validation.ok) return validation;
    next = updateRoleText(text, validation.key, renderRoleValue(validation.routes));
  } else {
    let catalogue: Awaited<ReturnType<typeof collectCatalogue>>;
    try {
      catalogue = await collectCatalogue(llm, undefined, signal);
    } catch (error) {
      signal.throwIfAborted();
      return {
        ok: false,
        reason: `the model catalogue could not be loaded: ${describeError(error)}`,
      };
    }
    signal.throwIfAborted();
    const validation = validateSaveRequest(parsed, catalogue);
    if (!validation.ok) return validation;
    if (current.status === "loaded") {
      try {
        text = readFileSync(path, "utf8");
      } catch (error) {
        return { ok: false, reason: `the role file could not be read: ${describeError(error)}` };
      }
    }
    next = updateRoleText(text, validation.key, renderRoleValue(validation.routes));
  }

  if (next === text) {
    return { ok: true, snapshot: snapshotFromConfiguration(readRoleConfiguration(path)) };
  }

  try {
    writeAtomically(path, next);
  } catch (error) {
    return { ok: false, reason: `the role file could not be written: ${describeError(error)}` };
  }
  return { ok: true, snapshot: snapshotFromConfiguration(parseRoleConfiguration(next, path)) };
}

/** Apply one global budget target to the role file in a single atomic write. */
export async function saveBudgetConfiguration(
  path: string,
  request: BudgetApplyRequest,
  llm: LlmRuntime,
  signal: AbortSignal,
): Promise<BudgetApplyResult> {
  signal.throwIfAborted();
  let parsed: BudgetApplyRequest;
  try {
    parsed = parseBudgetApplyRequest(request);
  } catch (error) {
    return { ok: false, reason: describeError(error) };
  }

  const initial = readRoleConfiguration(path);
  if (initial.status === "unreadable") {
    return { ok: false, reason: `the role file is unreadable: ${initial.reason}` };
  }

  let catalogue: Awaited<ReturnType<typeof collectCatalogue>>;
  try {
    catalogue = await collectCatalogue(llm, undefined, signal);
  } catch (error) {
    signal.throwIfAborted();
    return {
      ok: false,
      reason: `the model catalogue could not be loaded: ${describeError(error)}`,
    };
  }
  signal.throwIfAborted();

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

  try {
    const document = parseRoleFileDocument(text, path);
    const inputs = ROLE_MANIFEST.map((spec) => ({
      key: spec.key,
      shape: spec.shape,
      autoPanel: spec.autoPanel,
      configured: document.roles.has(spec.key),
      routes: document.roles.get(spec.key)?.routes ?? [{ kind: "inherit" as const }],
    }));
    const plan = planBudget(inputs, catalogue, parsed);
    const blocked = plan.rows.filter(isBudgetRowBlocked);
    if (blocked.length > 0) {
      return {
        ok: false,
        reason: `the budget needs attention for: ${blocked.map((row) => row.key).join(", ")}`,
      };
    }
    const next = renderBudgetText(text, plan, updateRoleText);
    if (next === text) {
      return { ok: true, snapshot: snapshotFromConfiguration(readRoleConfiguration(path)) };
    }
    writeAtomically(path, next);
    return { ok: true, snapshot: snapshotFromConfiguration(parseRoleConfiguration(next, path)) };
  } catch (error) {
    return { ok: false, reason: describeError(error) };
  }
}

function writeAtomically(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, text, "utf8");
    renameSync(temporary, path);
  } catch (error) {
    try {
      rmSync(temporary, { force: true });
    } catch {}
    throw error;
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
