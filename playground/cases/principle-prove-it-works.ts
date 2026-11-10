import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-prove-it-works",
  skill: "principle-prove-it-works",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt: "导出 CSV 时 total 那一列总是空的，麻烦修一下，弄好告诉我就行。",
  workspaceFiles: {
    "src/export.ts": `export function toCsv(rows: Order[]): string {
  const header = "id,total";
  const body = rows.map((r) => r.id + "," + r.total);
  return [header, ...body].join("\\n");
}`,
    "data/sample-orders.json": `[{"id":"A1","total":120},{"id":"B2","total":80}]`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-prove-it-works" },
  ],
  intent:
    "完成任务后必须对真实产物验证，正确做法是实际跑一次导出并读取生成文件确认列有值，而不是凭改完代码或编译通过就宣布完成。",
};
