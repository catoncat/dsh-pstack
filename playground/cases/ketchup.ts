import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "ketchup",
  skill: "ketchup",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "把这次对话从我上一条消息到现在都发生了什么，用大白话给我捋一遍，最后把还等我拍板的事列出来，让我光看这一条回复就能决定。",
  workspaceFiles: {
    "README.md": `# 通知服务

给内部系统发通知的小服务，正在改造中。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "ketchup" },
  ],
  intent:
    "用户要求把本对话自上次发言以来的变化讲清楚并列出待他决定的事项，正是 ketchup 的触发场景。",
};
