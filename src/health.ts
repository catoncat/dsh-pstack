/**
 * Route health for model pools.
 *
 * A pool picks its first healthy candidate, so "healthy" has to be a durable
 * fact about a concrete `provider/model` pair, not a guess made per call. One
 * child outcome at a time is enough: a completed child resets the streak, a
 * failed child extends it. Two consecutive failures put the route on cooldown,
 * after which it is attempted again so a recovered gateway heals itself.
 */

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

import { resolveDshHome } from "./role-config.ts";
import { isRoute, type Route } from "./route.ts";

/** Health file name under `$DSH_HOME`. */
export const HEALTH_FILENAME = "pstack-health.json";

/** Consecutive failures that mark a route unhealthy. */
export const FAILURE_THRESHOLD = 2;

/** How long an unhealthy route stays out of the pool. */
export const COOLDOWN_MS = 30 * 60 * 1000;

/** One route's rolling outcome record. */
export interface RouteHealth {
  readonly ok: number;
  readonly fail: number;
  readonly consecutiveFail: number;
  readonly lastOkAt?: number;
  readonly lastFailureAt?: number;
  readonly lastError?: string;
}

/** The whole health file. */
export interface HealthFile {
  readonly version: 1;
  readonly routes: Readonly<Record<string, RouteHealth>>;
}

const EMPTY: HealthFile = { version: 1, routes: {} };

/** Absolute health path for one harness home. */
export function healthFilePath(dshHome: string = resolveDshHome()): string {
  return join(dshHome, HEALTH_FILENAME);
}

/** Health key for a concrete route: the model pair, ignoring the effort dial. */
export function healthKey(route: Route): string | undefined {
  return isRoute(route) ? `${route.provider}/${route.model}` : undefined;
}

/** Read the health file. A missing or unreadable file reads as empty, never throws. */
export function readHealth(path: string = healthFilePath()): HealthFile {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return EMPTY;
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed !== "object" || parsed === null) return EMPTY;
    const routes = (parsed as { routes?: unknown }).routes;
    if (typeof routes !== "object" || routes === null) return EMPTY;
    const clean: Record<string, RouteHealth> = {};
    for (const [key, value] of Object.entries(routes as Record<string, unknown>)) {
      const entry = normalizeEntry(value);
      if (entry !== undefined) clean[key] = entry;
    }
    return { version: 1, routes: clean };
  } catch {
    return EMPTY;
  }
}

function normalizeEntry(value: unknown): RouteHealth | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  const count = (input: unknown): number =>
    typeof input === "number" && Number.isSafeInteger(input) && input >= 0 ? input : 0;
  const stamp = (input: unknown): number | undefined =>
    typeof input === "number" && Number.isFinite(input) ? input : undefined;
  const ok = count(record["ok"]);
  const fail = count(record["fail"]);
  if (ok === 0 && fail === 0) return undefined;
  return {
    ok,
    fail,
    consecutiveFail: count(record["consecutiveFail"]),
    ...(stamp(record["lastOkAt"]) === undefined ? {} : { lastOkAt: stamp(record["lastOkAt"])! }),
    ...(stamp(record["lastFailureAt"]) === undefined
      ? {}
      : { lastFailureAt: stamp(record["lastFailureAt"])! }),
    ...(typeof record["lastError"] === "string" ? { lastError: record["lastError"] } : {}),
  };
}

/** Whether a route sits in its failure cooldown. */
export function isUnhealthy(health: HealthFile, route: Route, now: number = Date.now()): boolean {
  const key = healthKey(route);
  if (key === undefined) return false;
  return isUnhealthyKey(health, key, now);
}

/** Whether one health key sits in its failure cooldown. */
export function isUnhealthyKey(health: HealthFile, key: string, now: number): boolean {
  const entry = health.routes[key];
  if (entry === undefined) return false;
  if (entry.consecutiveFail < FAILURE_THRESHOLD) return false;
  const last = entry.lastFailureAt;
  if (last === undefined) return true;
  return now - last < COOLDOWN_MS;
}

/** Record one outcome and persist. Failure to write is contained by the caller's path. */
export function recordOutcome(
  path: string,
  route: Route,
  outcome: "ok" | "fail",
  now: number = Date.now(),
  error?: string,
): void {
  const key = healthKey(route);
  if (key === undefined) return;
  const current = readHealth(path);
  const previous = current.routes[key] ?? { ok: 0, fail: 0, consecutiveFail: 0 };
  const next: RouteHealth =
    outcome === "ok"
      ? {
          ok: previous.ok + 1,
          fail: previous.fail,
          consecutiveFail: 0,
          lastOkAt: now,
          ...(previous.lastFailureAt === undefined
            ? {}
            : { lastFailureAt: previous.lastFailureAt }),
          ...(previous.lastError === undefined ? {} : { lastError: previous.lastError }),
        }
      : {
          ok: previous.ok,
          fail: previous.fail + 1,
          consecutiveFail: previous.consecutiveFail + 1,
          ...(previous.lastOkAt === undefined ? {} : { lastOkAt: previous.lastOkAt }),
          lastFailureAt: now,
          ...(error === undefined ? {} : { lastError: truncate(error) }),
        };
  writeHealth(path, { version: 1, routes: { ...current.routes, [key]: next } });
}

/** Write the whole file atomically. Missing directories are created. */
export function writeHealth(path: string, health: HealthFile): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(health, undefined, 2)}\n`, "utf8");
  renameSync(temporary, path);
}

function truncate(text: string): string {
  return text.length <= 300 ? text : `${text.slice(0, 300)}...`;
}
