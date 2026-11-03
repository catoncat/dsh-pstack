import { describe, expect, it } from "vite-plus/test";

import { ROLE_MANIFEST } from "../src/internal/role-manifest.ts";
import {
  TOOL_NAME,
  createPstackRoleCatalogTool,
  renderRoleCapabilities,
  roleCapabilities,
} from "../src/role-catalog.ts";

const autoPanels = ["arena runners", "architect runners", "interrogate reviewers"];
const listSelectable = ["arena cross-judge pool", "swarm workers"];

describe("pstack_roles", () => {
  it("reports every manifest role in manifest order", () => {
    const roles = roleCapabilities();
    expect(roles).toHaveLength(ROLE_MANIFEST.length);
    expect(roles.map((role) => role.role)).toEqual(ROLE_MANIFEST.map((role) => role.key));
  });

  it("marks automatic panels with roleIndex not-applicable", () => {
    const roles = roleCapabilities();
    for (const key of autoPanels) {
      const role = roles.find((candidate) => candidate.role === key)!;
      expect(role.shape).toBe("list");
      expect(role.autoPanel).toBe(true);
      expect(role.roleIndex).toBe("not-applicable");
    }
  });

  it("marks only non-panel list roles as accepting roleIndex", () => {
    const accepting = roleCapabilities()
      .filter((role) => role.roleIndex === "optional")
      .map((role) => role.role);
    expect(accepting).toEqual(listSelectable);
  });

  it("marks every single role as one child with no roleIndex", () => {
    for (const role of roleCapabilities()) {
      if (role.shape !== "single") continue;
      expect(role.autoPanel).toBe(false);
      expect(role.roleIndex).toBe("not-applicable");
      expect(role.usage).toMatch(/single route/);
    }
  });

  it("renders the classification the caller needs before dispatch", () => {
    const text = renderRoleCapabilities(roleCapabilities());
    expect(text).toContain("arena runners — shape=list, autoPanel=true; roleIndex=not-applicable");
    expect(text).toContain("arena cross-judge pool — shape=list; roleIndex=optional");
    expect(text).toContain("feature, refactoring — shape=single; roleIndex=not-applicable");
  });

  it("exposes a parameterless tool returning every role", async () => {
    const tool = createPstackRoleCatalogTool();
    expect(tool.name).toBe(TOOL_NAME);
    const result = (await tool.execute({}, { signal: new AbortController().signal } as never)) as {
      roles: readonly unknown[];
    };
    expect(result.roles).toHaveLength(ROLE_MANIFEST.length);
  });
});
