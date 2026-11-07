/** Host entry for dsh-pstack: the trusted hidden-skill loader. */

import type { Context } from "@deepseek-ai/cordis";

import { apply as applySkill } from "./skill.ts";

export const name = "pstack";

export const inject = ["skills", "tools"];

export function apply(ctx: Context): void {
  applySkill(ctx);
}

export { createPstackSkillTool } from "./skill.ts";
export { apply as applyModels, createPstackModelsTool } from "./models.ts";
export { apply as applyRoleCatalog, createPstackRolesTool } from "./role-catalog.ts";
export { apply as applySubagent, createPstackSubagentTool } from "./subagent.ts";
export { apply as applyReadonly } from "./readonly.ts";
export { apply as applyPotetoMode, createPotetoModeSection } from "./poteto-mode.ts";
