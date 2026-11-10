import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "poteto-help",
  skill: "poteto-help",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "我想用 pstack 来提高干活的质量，但不太清楚该从哪下手：想审查一个 PR 该用哪个技能，平时又该怎么开始用比较合适？",
  workspaceFiles: {
    "README.md": `# 内部服务

一个团队内部的后端服务。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "poteto-help" },
  ],
  intent: "用户在问该选哪个技能、如何开始使用 pstack，正是 poteto-help 作为 pstack 导览的用途。",
};
