/** The parsed line model behind the role file and its editor. */

import { budgetLineValue } from "./budget.ts";
import { findRole, normalizeRoleName, type RoleSpec } from "./role-manifest.ts";
import { POOL_NAME, parseRouteValue, validateRoleRouteShape, type Route } from "./route.ts";

/** One recognized role line. */
export interface RoleEntry {
  readonly line: number;
  readonly key: string;
  readonly spec: RoleSpec;
  readonly routes: readonly Route[];
  readonly issues: readonly string[];
}

/** One named model pool: ordered concrete candidates shared by several roles. */
export interface PoolEntry {
  readonly line: number;
  readonly name: string;
  readonly routes: readonly Route[];
  readonly issues: readonly string[];
}

/** A file-level issue. Unknown and malformed lines are reported, never dropped. */
export interface RoleFileIssue {
  readonly line?: number;
  readonly message: string;
}

/** One physical line, classified once for parsing and editing. */
export type RoleFileLine =
  | { readonly kind: "blank"; readonly line: number; readonly raw: string }
  | { readonly kind: "comment"; readonly line: number; readonly raw: string }
  | {
      readonly kind: "pool";
      readonly line: number;
      readonly raw: string;
      readonly name: string;
      readonly routes: readonly Route[];
      readonly issues: readonly string[];
    }
  | {
      readonly kind: "role";
      readonly line: number;
      readonly raw: string;
      readonly key: string;
      readonly spec: RoleSpec;
      readonly routes: readonly Route[];
      readonly issues: readonly string[];
    }
  | {
      readonly kind: "other";
      readonly line: number;
      readonly raw: string;
      readonly issue?: string;
    };

/** Parsed role file with its original lines preserved for the editor. */
export interface RoleFileDocument {
  readonly path: string;
  readonly budget?: string;
  readonly lines: readonly RoleFileLine[];
  readonly pools: ReadonlyMap<string, PoolEntry>;
  readonly roles: ReadonlyMap<string, RoleEntry>;
  readonly issues: readonly RoleFileIssue[];
}

/** Parse role-file text into a document and its semantic view. */
export function parseRoleFileDocument(text: string, path: string): RoleFileDocument {
  const roles = new Map<string, RoleEntry>();
  const pools = new Map<string, PoolEntry>();
  const issues: RoleFileIssue[] = [];
  const lines: RoleFileLine[] = [];
  let budget: string | undefined;

  if (text !== "") {
    text.split(/\r?\n/).forEach((rawLine, index) => {
      const line = index + 1;
      const trimmed = rawLine.trim();
      if (trimmed === "") {
        lines.push({ kind: "blank", line, raw: rawLine });
        return;
      }
      if (trimmed.startsWith("#")) {
        const value = budgetLineValue(rawLine);
        if (value !== undefined && value !== "") budget = value;
        lines.push({ kind: "comment", line, raw: rawLine });
        return;
      }

      const colon = rawLine.indexOf(":");
      if (colon === -1) {
        const message = `expected \`<role>: <value>\`, found ${JSON.stringify(trimmed)}`;
        issues.push({ line, message });
        lines.push({ kind: "other", line, raw: rawLine, issue: message });
        return;
      }
      const rawKey = rawLine.slice(0, colon).trim();
      if (rawKey === "") {
        const message = "the role key is empty";
        issues.push({ line, message });
        lines.push({ kind: "other", line, raw: rawLine, issue: message });
        return;
      }
      const pool = /^pool\s+(.+)$/i.exec(rawKey);
      if (pool !== null) {
        parsePoolLine(rawLine, colon, pool[1]!.trim(), line, pools, issues, lines);
        return;
      }
      const spec = findRole(rawKey);
      if (spec === undefined) {
        const message = `unknown pstack role ${JSON.stringify(rawKey)}`;
        issues.push({ line, message });
        lines.push({ kind: "other", line, raw: rawLine, issue: message });
        return;
      }

      const parsed = parseRouteValue(rawLine.slice(colon + 1));
      const entryIssues = [...parsed.issues];
      const shapeIssue = validateRoleRouteShape(spec, parsed.routes);
      if (shapeIssue !== undefined) entryIssues.push(shapeIssue);
      for (const issue of entryIssues) issues.push({ line, message: `${rawKey}: ${issue}` });

      lines.push({
        kind: "role",
        line,
        raw: rawLine,
        key: spec.key,
        spec,
        routes: parsed.routes,
        issues: entryIssues,
      });
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
  }

  return {
    path,
    ...(budget === undefined ? {} : { budget }),
    lines,
    pools,
    roles,
    issues,
  };
}

/** Parse one `pool <name>: <routes>` line and register the healthy ones. */
function parsePoolLine(
  rawLine: string,
  colon: number,
  rawName: string,
  line: number,
  pools: Map<string, PoolEntry>,
  issues: RoleFileIssue[],
  lines: RoleFileLine[],
): void {
  const name = rawName.toLowerCase().replace(/\s+/g, " ").trim();
  const entryIssues: string[] = [];
  if (!POOL_NAME.test(name)) {
    entryIssues.push(
      `the pool name ${JSON.stringify(name)} must be lowercase letters, digits and hyphens`,
    );
  }
  const parsed = parseRouteValue(rawLine.slice(colon + 1));
  entryIssues.push(...parsed.issues);
  for (const route of parsed.routes) {
    if (route.kind === "inherit") {
      entryIssues.push("a pool cannot contain `inherit-parent` or `auto`; use concrete routes");
    }
    if (route.kind === "pool") entryIssues.push("a pool cannot contain another pool");
  }
  const routes = parsed.routes.filter((route) => route.kind === "route");
  if (routes.length === 0 && entryIssues.length === 0) {
    entryIssues.push("the pool is empty; add at least one `<provider>/<model> [effort]`");
  }
  const previous = pools.get(name);
  if (previous !== undefined) {
    issues.push({
      line,
      message: `pool "${name}" is already defined on line ${previous.line}; line ${line} wins`,
    });
  }
  for (const issue of entryIssues) issues.push({ line, message: `pool ${name}: ${issue}` });
  lines.push({ kind: "pool", line, raw: rawLine, name, routes, issues: entryIssues });
  if (routes.length === 0) return;
  pools.set(name, { line, name, routes, issues: entryIssues });
}

/** Whether a line is the pool entry the editor is looking for. */
export function isPoolLineFor(
  line: RoleFileLine,
  name: string,
): line is Extract<RoleFileLine, { kind: "pool" }> {
  return line.kind === "pool" && line.name === name.toLowerCase().trim();
}

/** Whether a line is the role entry the editor is looking for. */
export function isRoleLineFor(
  line: RoleFileLine,
  key: string,
): line is Extract<RoleFileLine, { kind: "role" }> {
  return line.kind === "role" && normalizeRoleName(line.key) === normalizeRoleName(key);
}
