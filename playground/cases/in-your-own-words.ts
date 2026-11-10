import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "in-your-own-words",
  skill: "in-your-own-words",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "先别动手。用你自己的话告诉我，你觉得我的目标到底是什么、想解决什么问题，我想看看我们俩的理解一致不一致。",
  workspaceFiles: {
    "README.md": `# 库存预警服务

一个给仓库用的库存预警服务，目前每天定时扫描库存，低于阈值就发邮件。
`,
    "docs/issue.md": `# 待处理

运营反馈：大促期间库存变化很快，每天扫描一次太慢，经常等预警发出来货已经卖光了。希望能更快发现低库存，同时别把重复的预警邮件刷爆。`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "in-your-own-words" },
  ],
  intent: "用户在动手前要求先复述他的目标和要解决的问题，正是 in-your-own-words 的定义场景。",
};
