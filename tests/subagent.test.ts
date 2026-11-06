import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import type { Agent } from "@deepseek-ai/dsh-agent";
import {
  normalizeConfig,
  parseDelegationArgs,
  planDelegation,
  startPlannedChildren,
  type SubagentRuntime,
} from "../src/subagent.ts";

const directories: string[] = [];

function home(text?: string): string {
  const directory = mkdtempSync(join(tmpdir(), "pstack-subagent-"));
  directories.push(directory);
  if (text !== undefined) writeFileSync(join(directory, "pstack-models.mdc"), text);
  return directory;
}

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function args(overrides: Record<string, unknown> = {}) {
  return parseDelegationArgs({
    description: "inspect parser",
    prompt: "Read the parser and report.",
    agent: "poteto-agent",
    role: null,
    roleIndex: null,
    reasoningEffort: null,
    cwd: null,
    ...overrides,
  });
}

function fakeRuntime(dshHome: string): SubagentRuntime {
  return {
    subagents: {
      getProvider: () => ({
        name: "spawn",
        capabilities: { agentOptions: true, agentPreset: true, depthLimit: true },
        inheritsParentContext: false,
      }),
      list: () => ["spawn"],
      resolveMaxDepth: () => 2,
      startActivation: async () => ({ childId: "child-1" }),
    },
    llm: { resolveCallConfig: async () => ({}) },
    workingDirectory: { ensure: async () => "/session" },
    dshHome,
    potetoModeSkillPath: "/pkg/pstack/skills/poteto-mode/SKILL.md",
  } as unknown as SubagentRuntime;
}

describe("pstack_subagent arguments and planning", () => {
  it("normalizes a default config and rejects unknown keys", () => {
    expect(normalizeConfig(undefined)).toEqual({ provider: "spawn" });
    expect(() => normalizeConfig({ nope: true })).toThrow(/unknown config field/);
  });

  it("rejects missing required arguments", () => {
    expect(() => parseDelegationArgs({ agent: "general" })).toThrow(/missing required argument/);
  });

  it("maps the three preset agents and general explicitly", () => {
    const runtime = fakeRuntime(home());
    expect(planDelegation(args(), runtime).children[0]?.agentPreset).toBe("poteto-agent");
    expect(planDelegation(args({ agent: "comment-sicko" }), runtime).children[0]?.agentPreset).toBe(
      "comment-sicko",
    );
    expect(planDelegation(args({ agent: "readonly" }), runtime).children[0]?.agentPreset).toBe(
      "readonly",
    );
    expect(
      planDelegation(args({ agent: "general" }), runtime).children[0]?.agentPreset,
    ).toBeUndefined();
  });

  it("reads a role file route and starts one child per panel entry", async () => {
    const dshHome = home("arena runners: cpa/model-a [high], cpa/model-b [low]\n");
    const runtime = fakeRuntime(dshHome);
    const plan = planDelegation(args({ role: "arena runners" }), runtime);
    expect(plan.children).toHaveLength(2);
    expect(plan.children.map((child) => child.routeLabel)).toEqual([
      "cpa/model-a [high]",
      "cpa/model-b [low]",
    ]);
  });

  it("starts planned children and returns their ids", async () => {
    const runtime = fakeRuntime(home());
    const plan = planDelegation(args(), runtime);
    const result = await startPlannedChildren(
      {
        options: { provider: "cpa", model: "parent" },
        session: { requestHeader: () => undefined },
      } as unknown as Agent,
      plan,
      runtime,
      new AbortController().signal,
    );
    expect(result.kind).toBe("activation");
    expect(result.children[0]?.childId).toBe("child-1");
  });

  it("rejects maxDepth 0 before planning", () => {
    expect(() => args({ maxDepth: 0 })).toThrow(/positive safe integer/);
  });

  it("defaults maxDepth to 1 when omitted", () => {
    const plan = planDelegation(args(), fakeRuntime(home()));
    expect(plan.children[0]?.maxDepth).toBe(1);
  });
});
