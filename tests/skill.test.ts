import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import {
  createPstackSkillTool,
  readSkillResource,
  renderLoadedSkill,
  type SkillsHost,
} from "../src/skill.ts";
import type { SkillDefinition } from "@deepseek-ai/dsh-skill";
import type { ToolRunContext } from "@deepseek-ai/dsh-tools";

const directories: string[] = [];

function temporarySkill(): SkillDefinition {
  const directory = mkdtempSync(join(tmpdir(), "pstack-skill-"));
  directories.push(directory);
  mkdirSync(join(directory, "references"));
  writeFileSync(join(directory, "references", "explorer-prompt.md"), "explore this\n");
  writeFileSync(
    join(directory, "SKILL.md"),
    "---\nname: how\ndescription: walk code\n---\n\n# How\n",
  );
  return {
    name: "how",
    description: "walk code",
    provider: "pstack",
    resourceBase: { kind: "directory", path: directory },
    content: "# How\n",
    invocation: { modelInvocable: false, userInvocable: true },
    source: "bundled",
  };
}

const exec = { signal: new AbortController().signal } as unknown as ToolRunContext;

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe("pstack_skill", () => {
  it("loads a hidden skill by name", async () => {
    const definition = temporarySkill();
    const skills: SkillsHost = { get: async (name) => (name === "how" ? definition : undefined) };
    const tool = createPstackSkillTool(skills);
    const result = await tool.execute({ name: "how" }, exec);
    expect(result).toMatchObject({ name: "how", provider: "pstack", content: "# How\n" });
    expect(renderLoadedSkill(result as never)).toContain('<skill_content name="how">');
  });

  it("reads a relative resource and refuses traversal", async () => {
    const definition = temporarySkill();
    await expect(readSkillResource(definition, "references/explorer-prompt.md")).resolves.toEqual({
      path: "references/explorer-prompt.md",
      content: "explore this\n",
    });
    await expect(readSkillResource(definition, "../secret.txt")).rejects.toThrow(
      /escapes the skill directory/,
    );
  });

  it("reports an unknown skill", async () => {
    const tool = createPstackSkillTool({ get: async () => undefined });
    await expect(tool.execute({ name: "nope" }, exec)).rejects.toThrow(
      'skill "nope" is unknown or no longer available',
    );
  });
});
