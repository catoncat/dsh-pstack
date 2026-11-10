import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "reflect",
  skill: "reflect",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "这次任务刚做完，帮我把这次对话里值得留下的经验提炼出来，判断哪些该落成对现有技能的具体修改、哪些该记进待办，给我具体建议。",
  workspaceFiles: {
    "TASK.md": `# 本次任务

给导出功能加 CSV 支持。做的时候发现两次返工：一次是忘了先写测试，一次是改错了日期格式。
`,
    "src/export.ts": `export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.join(",")).join("\\n");
}
`,
    "package.json": `{
  "name": "exporter",
  "type": "module",
  "scripts": { "test": "vitest run" }
}`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "reflect" },
  ],
  intent: "会话结束后要求把经验提炼并路由到具体的技能修改与待办，正是 reflect 的用途。",
};
