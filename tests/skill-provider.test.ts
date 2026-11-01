import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { parseFrontmatter, validateSkillFrontmatter } from "../src/internal/frontmatter.ts";
import {
  createPstackSkillProvider,
  loadBundledSkillIndexes,
} from "../src/internal/skill-provider.ts";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function skillRoot(): string {
  const directory = mkdtempSync(join(tmpdir(), "pstack-skill-provider-"));
  directories.push(directory);
  return directory;
}

function writeSkill(root: string, name: string, frontmatterName = name): string {
  const directory = join(root, name);
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, "SKILL.md"),
    `---\nname: ${frontmatterName}\ndescription: Test ${name}\n---\n# ${name}\n`,
  );
  return directory;
}

describe("skill frontmatter", () => {
  it("reads quoted scalars, block values, and invocation flags", () => {
    const parsed = parseFrontmatter(
      [
        "---",
        "name: how",
        "description: >-",
        "  Explore code",
        "  in small steps",
        "whenToUse: |-",
        "  For architecture",
        "  questions",
        "disable-model-invocation: true",
        "user-invocable: false",
        "---",
        "# How",
      ].join("\n"),
    );
    expect(validateSkillFrontmatter(parsed.data, "skill")).toEqual({
      name: "how",
      description: "Explore code in small steps",
      whenToUse: "For architecture\nquestions",
      disableModelInvocation: true,
      userInvocable: false,
    });
    expect(parsed.body).toBe("# How");
  });

  it("preserves CRLF body lines and rejects invalid booleans", () => {
    const parsed = parseFrontmatter("---\r\nname: how\r\ndescription: Explore\r\n---\r\n# How\r\n");
    expect(parsed.body).toBe("# How\r\n");
    expect(() =>
      validateSkillFrontmatter(
        { name: "how", description: "Explore", "user-invocable": "yes" },
        "skill",
      ),
    ).toThrow(/must be true or false/);
  });
});

describe("bundled skill provider", () => {
  it("rejects duplicate skill names across roots", () => {
    const first = skillRoot();
    const second = skillRoot();
    writeSkill(first, "how");
    writeSkill(second, "how");
    expect(() =>
      loadBundledSkillIndexes([
        { path: first, label: "first" },
        { path: second, label: "second" },
      ]),
    ).toThrow(/offered by both/);
  });

  it("loads its own skill and refuses forged or renamed locators", async () => {
    const root = skillRoot();
    const directory = writeSkill(root, "how");
    const provider = createPstackSkillProvider(
      loadBundledSkillIndexes([{ path: root, label: "test" }]),
    );
    const listing = await provider.list({ signal: new AbortController().signal });
    const candidates = "candidates" in listing ? listing.candidates : listing;
    const [candidate] = candidates;
    expect(candidate).toBeDefined();
    const loaded = await provider.get(candidate!, {
      signal: new AbortController().signal,
    });
    expect(loaded?.content).toBe("# how\n");

    const locator = candidate!.locator as { directory: string; instructionFile: string };
    await expect(
      provider.get(
        {
          ...candidate!,
          locator: { ...locator, directory: join(directory, "elsewhere") },
        },
        { signal: new AbortController().signal },
      ),
    ).resolves.toBeUndefined();
    await expect(
      provider.get({ ...candidate!, name: "other" }, { signal: new AbortController().signal }),
    ).resolves.toBeUndefined();
  });
});
