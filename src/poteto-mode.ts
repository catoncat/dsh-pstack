/**
 * `pstack-poteto-mode`: mount the full `poteto-mode` skill as a persistent section.
 *
 * A root session that selects the `poteto-mode` preset keeps this section for its
 * whole life, so the model never has to load the skill again between turns.
 */

import { readFileSync } from "node:fs";
import { dirname } from "node:path";

import type { Context } from "@deepseek-ai/cordis";

import { HARNESS_DOC_PATH, POTETO_MODE_SKILL_PATH } from "./paths.ts";

/** Cordis row name. */
export const name = "pstack-poteto-mode";

/** The services this row requires. */
export const inject = ["systemPrompt"];

/** Stable section name. */
export const SECTION_NAME = "pstack:poteto-mode";

/** Section order. */
export const SECTION_ORDER = 10;

/** The prompt section shape accepted by the system prompt registry. */
export interface PromptSectionLike {
  readonly name: string;
  readonly order: number;
  readonly text: string;
  readonly interpolate?: boolean;
}

/** The slice of `ctx.systemPrompt` this row writes to. */
export interface SystemPromptHost {
  systemPrompt: {
    section(section: PromptSectionLike): () => void;
  };
}

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

/**
 * Build the persistent section from a skill file and the DSH adapter path.
 *
 * The leading YAML frontmatter is stripped, and `interpolate: false` keeps any
 * literal `{{...}}` in the skill body from being resolved as a prompt variable.
 */
export function createPotetoModeSection(
  skillPath: string = POTETO_MODE_SKILL_PATH,
  harnessDocPath: string = HARNESS_DOC_PATH,
): PromptSectionLike {
  const body = readFileSync(skillPath, "utf8").replace(FRONTMATTER, "");
  const skillDirectory = dirname(skillPath);
  const text = [
    "You are running in the persistent pstack `poteto-mode` root preset. The full `poteto-mode` skill below stays in this system prompt for every turn of the session.",
    "",
    `- Skill file: ${skillPath}`,
    `- Skill directory: ${skillDirectory}`,
    `- DSH adapter: ${harnessDocPath}`,
    "",
    `Read the DSH adapter at ${harnessDocPath} once per session before you follow this skill.`,
    "",
    body.replace(/^\n+/, ""),
  ].join("\n");
  return { name: SECTION_NAME, order: SECTION_ORDER, interpolate: false, text };
}

/** Register the persistent section on this row. */
export function apply(ctx: Context): void {
  const host = ctx as unknown as SystemPromptHost;
  const section = createPotetoModeSection();
  ctx.effect(() => host.systemPrompt.section(section), "pstack.poteto-mode.section()");
}
