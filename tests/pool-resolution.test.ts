import { describe, expect, it } from "vite-plus/test";

import { resolveRoleRoutes } from "../src/pool-resolution.ts";
import { parseRoleFileDocument } from "../src/role-file.ts";
import { parseRoute, type Route } from "../src/route.ts";
import type { HealthFile } from "../src/health.ts";

function route(value: string): Route {
  const parsed = parseRoute(value);
  if (parsed.route === undefined) throw new Error(parsed.issue);
  return parsed.route;
}

function healthy(): HealthFile {
  return { version: 1, routes: {} };
}

function unhealthy(routes: readonly Route[], now: number): HealthFile {
  const entries: Record<
    string,
    { ok: number; fail: number; consecutiveFail: number; lastFailureAt: number }
  > = {};
  for (const value of routes) {
    if (value.kind !== "route") continue;
    entries[`${value.provider}/${value.model}`] = {
      ok: 0,
      fail: 2,
      consecutiveFail: 2,
      lastFailureAt: now,
    };
  }
  return { version: 1, routes: entries };
}

function documentWith(text: string) {
  return parseRoleFileDocument(text, "/tmp/pstack-models.mdc");
}

describe("pool lines", () => {
  it("parses a pool and keeps its order", () => {
    const document = documentWith(
      "pool code: a/one [high], b/two\n\nfeature, refactoring: pool code\n",
    );
    const pool = document.pools.get("code");
    expect(pool?.routes).toHaveLength(2);
    expect(document.roles.get("feature, refactoring")?.routes).toEqual([
      { kind: "pool", name: "code" },
    ]);
  });

  it("rejects a pool inside a pool and reports the line", () => {
    const document = documentWith("pool a: b/two\npool c: pool a\n");
    expect(document.pools.get("c")).toBeUndefined();
    expect(document.issues.some((issue) => issue.message.includes("another pool"))).toBe(true);
  });

  it("reports a duplicate pool definition", () => {
    const document = documentWith("pool a: b/two\npool a: c/three\n");
    expect(document.issues.some((issue) => issue.message.includes("already defined"))).toBe(true);
  });
});

describe("pool resolution", () => {
  it("picks the first healthy candidate", () => {
    const document = documentWith("pool code: a/one, b/two\n");
    const pools = document.pools;
    const result = resolveRoleRoutes([route("pool code")], pools, healthy(), 1000);
    expect(result.routes).toEqual([route("a/one")]);
  });

  it("skips a candidate in its failure cooldown", () => {
    const document = documentWith("pool code: a/one, b/two\n");
    const now = 1000;
    const health = unhealthy([route("a/one")], now);
    const result = resolveRoleRoutes([route("pool code")], document.pools, health, now + 1);
    expect(result.routes).toEqual([route("b/two")]);
    expect(result.diagnostics.join(" ")).toContain("a/one");
  });

  it("gives two reviewers distinct models", () => {
    const document = documentWith("pool review: a/one, b/two, c/three\n");
    const result = resolveRoleRoutes(
      [route("pool review"), route("pool review")],
      document.pools,
      healthy(),
      1000,
    );
    expect(result.routes).toEqual([route("a/one"), route("b/two")]);
  });

  it("starts fewer reviewers when only one candidate is healthy", () => {
    const document = documentWith("pool review: a/one, b/two\n");
    const now = 1000;
    const health = unhealthy([route("b/two")], now);
    const result = resolveRoleRoutes(
      [route("pool review"), route("pool review")],
      document.pools,
      health,
      now + 1,
    );
    expect(result.routes).toEqual([route("a/one")]);
    expect(result.diagnostics.join(" ")).toContain("skipped");
  });

  it("fails loudly when every candidate is unhealthy", () => {
    const document = documentWith("pool code: a/one\n");
    const now = 1000;
    expect(() =>
      resolveRoleRoutes(
        [route("pool code")],
        document.pools,
        unhealthy([route("a/one")], now),
        now + 1,
      ),
    ).toThrow(/no healthy route/);
  });

  it("fails loudly on an undefined pool", () => {
    expect(() => resolveRoleRoutes([route("pool missing")], new Map(), healthy(), 1000)).toThrow(
      /not defined/,
    );
  });
});
