/**
 * Pool resolution: turn role references into the concrete routes one call starts.
 *
 * A role may name a pool, and a panel repeats the same pool once per reviewer.
 * Each reference takes the next healthy candidate that this call has not used,
 * so two reviewers never land on the same model by accident. When a pool has no
 * healthy candidate left the reference is dropped with a diagnostic, which is
 * the "start fewer, say why" rule. A pool with no healthy candidate at all is a
 * hard error, because silently starting nothing is worse than saying so.
 */

import { healthKey, isUnhealthy, type HealthFile } from "./health.ts";
import type { PoolEntry } from "./role-file.ts";
import { isRoute, type Route } from "./route.ts";

export interface RouteResolution {
  readonly routes: readonly Route[];
  readonly diagnostics: readonly string[];
}

/** Expand pool references against pools and current health. */
export function resolveRoleRoutes(
  refs: readonly Route[],
  pools: ReadonlyMap<string, PoolEntry>,
  health: HealthFile,
  now: number = Date.now(),
): RouteResolution {
  const routes: Route[] = [];
  const diagnostics: string[] = [];
  const used = new Set<string>();

  for (const ref of refs) {
    if (!isRoute(ref) && ref.kind !== "pool") {
      routes.push(ref);
      continue;
    }
    if (isRoute(ref)) {
      routes.push(ref);
      const key = healthKey(ref);
      if (key !== undefined) used.add(key);
      continue;
    }

    const entry = pools.get(ref.name);
    if (entry === undefined) {
      throw new Error(
        `the role refers to pool "${ref.name}", which is not defined; add a \`pool ${ref.name}: <routes>\` line`,
      );
    }
    if (entry.issues.length > 0) {
      throw new Error(
        `pool "${ref.name}" has invalid configuration on line ${entry.line}: ${entry.issues.join("; ")}`,
      );
    }
    const healthy = entry.routes.filter((route) => !isUnhealthy(health, route, now));
    if (healthy.length === 0) {
      throw new Error(
        `pool "${ref.name}" has no healthy route; candidates: ${entry.routes
          .map((route) => renderRoute(route))
          .join(", ")}`,
      );
    }
    const next = healthy.find((route) => {
      const key = healthKey(route);
      return key === undefined || !used.has(key);
    });
    if (next === undefined) {
      diagnostics.push(
        `pool "${ref.name}" has ${healthy.length} healthy route${healthy.length === 1 ? "" : "s"}, all already used by this call; one entry was skipped`,
      );
      continue;
    }
    routes.push(next);
    const key = healthKey(next);
    if (key !== undefined) used.add(key);
    const skipped = entry.routes.filter((route) => isUnhealthy(health, route, now));
    if (skipped.length > 0) {
      diagnostics.push(
        `pool "${ref.name}" skipped ${skipped.map((route) => renderRoute(route)).join(", ")} because those routes are in their failure cooldown`,
      );
    }
  }

  if (routes.length === 0) {
    throw new Error(
      `no route resolved for this call; diagnostics: ${diagnostics.length === 0 ? "(none)" : diagnostics.join("; ")}`,
    );
  }
  return { routes, diagnostics: dedupe(diagnostics) };
}

function renderRoute(route: Route): string {
  if (route.kind === "inherit") return route.alias;
  if (route.kind === "pool") return `pool ${route.name}`;
  return route.effort === undefined
    ? `${route.provider}/${route.model}`
    : `${route.provider}/${route.model} [${route.effort}]`;
}

function dedupe(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}
