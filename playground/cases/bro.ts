import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "bro",
  skill: "bro",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "你上面那段解释太绕了，我完全没听懂。用大白话重新说一遍，别用行话，就像一个人跟另一个人说话那样。要重说的内容是：「本季度我们将通过跨部门协同与资源整合，推动用户增长飞轮的范式转移，实现存量用户价值的深度释放。」",
  workspaceFiles: {
    "README.md": `# 项目

一个正在开发中的服务。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "bro" },
  ],
  intent: "用户直接要求把一段满是行话的内容换成没有术语的人话重讲一遍，正是 bro 的唯一触发场景。",
};
