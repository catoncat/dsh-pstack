import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "no-comments",
  skill: "no-comments",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "提交之前帮我把这次改动里的注释过一遍，把那些只是复读代码在干嘛的注释删掉，只留下真正解释为什么这么写的。",
  workspaceFiles: {
    "package.json": `{
  "name": "reports",
  "type": "module"
}`,
    "src/report.ts": `// 这个文件负责生成报表。
// 下面是生成函数。

// 生成报表函数
export function buildReport(rows: number[]): string {
  // 定义 total 变量为 0
  let total = 0;
  // 遍历 rows
  for (const row of rows) {
    // 把 row 加到 total 上
    total += row;
  }
  // 返回结果
  // 用 toFixed 保留两位小数，是因为财务同事要求金额统一两位、避免四舍五入展示不一致
  return total.toFixed(2);
}
`,
    "CHANGES.md": `# 本次改动

新增 buildReport，用于把一组金额求和并按两位小数输出。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "no-comments" },
  ],
  intent: "提交前要求清理复读代码的注释、只保留解释 why 的注释，正是 no-comments 的使用场景。",
};
