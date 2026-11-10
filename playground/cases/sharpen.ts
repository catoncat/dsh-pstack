import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "sharpen",
  skill: "sharpen",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "我想做一个团队内部的知识库搜索工具，先别执行。帮我把这个任务想得更深一点、而不是更大，然后把我这段请求重写一版，让我照着发出去能得到更靠谱的结果。",
  workspaceFiles: {
    "README.md": `# 团队知识库

内部文档散落在 Confluence、代码仓库和一堆群里，检索非常困难，大家常靠问人。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "sharpen" },
  ],
  intent: "用户要求把任务做得更深而不是更大并重写提示词、且不执行任务，正是 sharpen 的用途。",
};
