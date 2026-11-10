import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-outcome-oriented-execution",
  skill: "principle-outcome-oriented-execution",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt:
    "这次把配置系统从 JSON 文件迁到环境变量。过渡期我准备加一个双写兼容层，让旧读法和新读法同时能用。你觉得这个方案如何？",
  workspaceFiles: {
    "src/config.ts": `import fs from "node:fs";

export function loadConfig() {
  const raw = fs.readFileSync("config.json", "utf8");
  return JSON.parse(raw);
}`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-outcome-oriented-execution" },
  ],
  intent:
    "有明确阶段边界的迁移应朝目标架构收敛，正确判断是允许计划内的过渡性破坏、不保留会变成长期债的临时兼容层。",
};
