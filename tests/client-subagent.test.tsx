import { describe, expect, it } from "vite-plus/test";

import {
  delegationState,
  parseChildLines,
  readDelegationArgs,
} from "../src/client/SubagentCard.tsx";

describe("pstack subagent card boundary", () => {
  it("extracts displayed arguments through the lazy text reader", () => {
    const values: Record<string, string | undefined> = {
      description: "Fix the delegation card",
      agent: "general",
      role: "bug-fix",
      reasoningEffort: "high",
    };
    const reads: string[] = [];

    expect(
      readDelegationArgs({
        text: (key) => {
          reads.push(key);
          return values[key];
        },
      }),
    ).toEqual({
      description: "Fix the delegation card",
      agent: "general",
      role: "bug-fix",
      reasoningEffort: "high",
    });
    expect(reads).toEqual(["description", "agent", "role", "reasoningEffort"]);
  });

  it("maps host lifecycle and settled result fields to card states", () => {
    expect(delegationState("preparing")).toBe("preparing");
    expect(delegationState("start")).toBe("running");
    expect(delegationState("result", { isError: false })).toBe("ok");
    expect(delegationState("result", { isError: false, error: { code: "interrupted" } })).toBe(
      "stopped",
    );
    expect(delegationState("result", { isError: false, meta: { stopped: true } })).toBe("error");
    expect(delegationState("result", { isError: true })).toBe("error");
  });

  it("parses only complete child lines from settled text", () => {
    expect(
      parseChildLines([
        {
          type: "text",
          text: [
            "- child-123 (Fix the card) agent=general role=bug-fix route=provider/model effort=xhigh maxDepth=2",
            "diagnostic - child-ignored (ignored) agent=general role=bug-fix route=provider/model",
            "- child-456 (Review the card) agent=readonly role=review route=grok/model",
            "- child-ignored (ignored) agent=general role=bug-fix route=provider/model extra=diagnostic",
          ].join("\n"),
        },
      ]),
    ).toEqual([
      {
        id: "child-123",
        agent: "general",
        role: "bug-fix",
        route: "provider/model",
      },
      {
        id: "child-456",
        agent: "readonly",
        role: "review",
        route: "grok/model",
      },
    ]);
  });
});
