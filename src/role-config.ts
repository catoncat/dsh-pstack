/**
 * `$DSH_HOME/pstack-models.mdc` reader and route selector.
 *
 * The role file is read again on every delegation. Missing, unreadable, and
 * loaded-with-issues are distinct states: a missing file means every role
 * inherits the parent route, while an unreadable file must fail loudly instead
 * of silently behaving like a fresh install.
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

import {
  INHERIT_ALIASES,
  PSTACK_MODELS_FILENAME,
  ROLE_MANIFEST,
  findRole,
  type InheritAlias,
  type RoleSpec,
} from "./role-manifest.ts";

/** One resolved child route. */
export type Route =
  | { readonly kind: "inherit"; readonly alias?: InheritAlias }
  | {
      readonly kind: "route";
      readonly provider: string;
      readonly model: string;
      readonly effort?: string;
    };

/** One recognized role line. */
export interface RoleEntry {
  readonly line: number;
  readonly key: string;
  readonly spec: RoleSpec;
  readonly routes: readonly Route[];
  readonly issues: readonly string[];
}

/** A file-level issue. Unknown and malformed lines are reported, never dropped. */
export interface RoleFileIssue {
  readonly line?: number;
  readonly message: string;
}

/** Parsed role-file state. */
export type RoleConfiguration =
  | { readonly status: "missing"; readonly path: string }
  | { readonly status: "unreadable"; readonly path: string; readonly reason: string }
  | {
      readonly status: "loaded";
      readonly path: string;
      readonly budget?: string;
      readonly roles: ReadonlyMap<string, RoleEntry>;
      readonly issues: readonly RoleFileIssue[];
    };

/** Absolute role-file path for one DSH home. */
export function modelsFilePath(dshHome: string): string {
  return join(dshHome, PSTACK_MODELS_FILENAME);
}

/** Resolve `$DSH_HOME`: environment first, then `~/.dsh`. */
export function resolveDshHome(
  env: Readonly<Record<string, string | undefined>> = process.env,
  home: string = homedir(),
): string {
  const raw = env["DSH_HOME"]?.trim();
  const path = raw === undefined || raw === "" ? join(home, ".dsh") : raw;
  const expanded =
    path === "~"
      ? home
      : path.startsWith("~/") || path.startsWith("~\\")
        ? join(home, path.slice(2))
        : path;
  return resolve(expanded);
}

/** Read the role file without throwing for a missing path. */
export function readRoleConfiguration(path: string): RoleConfiguration {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    if (isMissingFile(error)) return { status: "missing", path };
    return { status: "unreadable", path, reason: describeError(error) };
  }
  return parseRoleConfiguration(text, path);
}

/** Parse role-file text. Pure: no filesystem access. */
export function parseRoleConfiguration(text: string, path: string): RoleConfiguration {
  const roles = new Map<string, RoleEntry>();
  const issues: RoleFileIssue[] = [];
  let budget: string | undefined;

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1;
    const trimmed = rawLine.trim();
    if (trimmed === "") return;
    if (trimmed.startsWith("#")) {
      const match = /^#\s*budget\s*:\s*(.+)$/i.exec(trimmed);
      if (match !== null) budget = match[1]!.trim();
      return;
    }

    const colon = rawLine.indexOf(":");
    if (colon === -1) {
      issues.push({
        line,
        message: `expected \`<role>: <value>\`, found ${JSON.stringify(trimmed)}`,
      });
      return;
    }
    const rawKey = rawLine.slice(0, colon).trim();
    if (rawKey === "") {
      issues.push({ line, message: "the role key is empty" });
      return;
    }
    const spec = findRole(rawKey);
    if (spec === undefined) {
      issues.push({ line, message: `unknown pstack role ${JSON.stringify(rawKey)}` });
      return;
    }

    const parsed = parseRouteValue(rawLine.slice(colon + 1));
    const entryIssues = [...parsed.issues];
    if (spec.shape === "single" && parsed.routes.length > 1) {
      entryIssues.push("a single-route role cannot hold a comma-separated list");
    }
    for (const issue of entryIssues) issues.push({ line, message: `${rawKey}: ${issue}` });
    if (parsed.routes.length === 0) return;

    const previous = roles.get(spec.key);
    if (previous !== undefined) {
      issues.push({
        line,
        message: `role "${spec.key}" is already configured on line ${previous.line}; line ${line} wins`,
      });
    }
    roles.set(spec.key, {
      line,
      key: spec.key,
      spec,
      routes: parsed.routes,
      issues: entryIssues,
    });
  });

  return {
    status: "loaded",
    path,
    ...(budget === undefined ? {} : { budget }),
    roles,
    issues,
  };
}

/** Parse one role value: a single route or a comma-separated list. */
export function parseRouteValue(raw: string): {
  routes: readonly Route[];
  issues: readonly string[];
} {
  const routes: Route[] = [];
  const issues: string[] = [];
  const segments = raw.split(",");
  segments.forEach((segment, index) => {
    const value = segment.trim();
    if (value === "") {
      if (index !== segments.length - 1) issues.push(`entry ${index + 1} of the list is empty`);
      return;
    }
    const parsed = parseRoute(value);
    if (parsed.route === undefined) issues.push(parsed.issue);
    else routes.push(parsed.route);
  });
  if (routes.length === 0 && issues.length === 0) {
    issues.push(
      "the value is empty; use `inherit-parent`, `auto`, or `<provider>/<model> [effort]`",
    );
  }
  return { routes, issues };
}

/** Parse one route token. */
export function parseRoute(raw: string): { route?: Route; issue: string } {
  const value = raw.trim();
  if (value === "") return { issue: "the value is empty" };
  const alias = value.toLowerCase();
  if ((INHERIT_ALIASES as readonly string[]).includes(alias)) {
    return { route: { kind: "inherit", alias: alias as "inherit-parent" | "auto" }, issue: "" };
  }

  const slash = value.indexOf("/");
  if (slash <= 0 || slash === value.length - 1) {
    return {
      issue: `${JSON.stringify(value)} is not a route; use \`inherit-parent\`, \`auto\`, or \`<provider>/<model> [effort]\``,
    };
  }
  const provider = value.slice(0, slash).trim();
  let rest = value.slice(slash + 1).trim();
  let effort: string | undefined;
  const bracket = /\s*\[([^[\]]*)\]\s*$/.exec(rest);
  if (bracket !== null) {
    effort = bracket[1]!.trim();
    rest = rest.slice(0, bracket.index).trim();
  }
  const model = rest;
  if (provider === "" || model === "" || /\s/.test(provider) || /\s/.test(model)) {
    return {
      issue: `${JSON.stringify(value)} is not a route; provider and model cannot contain spaces`,
    };
  }
  if (effort !== undefined && effort === "") {
    return { issue: `${JSON.stringify(value)} has empty brackets; drop them or name an effort` };
  }
  if (effort !== undefined && /\s/.test(effort)) {
    return { issue: `${JSON.stringify(value)} has a multi-word effort; an effort is one token` };
  }
  return {
    route: { kind: "route", provider, model, ...(effort === undefined ? {} : { effort }) },
    issue: "",
  };
}

/** How one role expands into children. */
export type RouteSelectionMode = "single" | "panel" | "selected";

export interface RouteSelection {
  readonly role: RoleSpec;
  readonly mode: RouteSelectionMode;
  readonly configured: boolean;
  readonly routes: readonly Route[];
  readonly total: number;
  readonly roleIndex?: number;
}

/** Resolve one role into the routes this call starts. */
export function selectRoutes(
  spec: RoleSpec,
  entry: RoleEntry | undefined,
  roleIndex: number | undefined,
): RouteSelection {
  if (spec.shape === "single" && roleIndex !== undefined) {
    throw new Error(`role "${spec.key}" holds a single route, so \`roleIndex\` does not apply`);
  }
  if (spec.autoPanel && roleIndex !== undefined) {
    throw new Error(
      `role "${spec.key}" is an automatic panel: it starts one child per entry, so \`roleIndex\` does not apply`,
    );
  }
  if (entry === undefined) {
    return {
      role: spec,
      mode: spec.autoPanel ? "panel" : "single",
      configured: false,
      routes: [{ kind: "inherit" }],
      total: 1,
    };
  }
  if (entry.issues.length > 0) {
    throw new Error(
      `role "${spec.key}" has invalid configuration on line ${entry.line}: ${entry.issues.join("; ")}`,
    );
  }
  if (spec.autoPanel) {
    return {
      role: spec,
      mode: "panel",
      configured: true,
      routes: entry.routes,
      total: entry.routes.length,
    };
  }
  if (spec.shape === "list") {
    const index = roleIndex ?? 0;
    const route = entry.routes[index];
    if (route === undefined) {
      throw new Error(
        `role "${spec.key}" has ${entry.routes.length} entries, so \`roleIndex\` ${index} is out of range`,
      );
    }
    return {
      role: spec,
      mode: "selected",
      configured: true,
      routes: [route],
      total: entry.routes.length,
      roleIndex: index,
    };
  }
  const route = entry.routes[0];
  if (route === undefined) throw new Error(`role "${spec.key}" has no route`);
  return { role: spec, mode: "single", configured: true, routes: [route], total: 1 };
}

/** Resolve an exact role key or throw a diagnostic that lists the manifest. */
export function requireRole(raw: string): RoleSpec {
  const spec = findRole(raw);
  if (spec !== undefined) return spec;
  throw new Error(
    `unknown pstack role ${JSON.stringify(raw)}; role names come from the pstack role manifest, not free text. Known roles: ${ROLE_MANIFEST.map((role) => role.key).join(", ")}`,
  );
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { code?: unknown }).code === "ENOENT"
  );
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
