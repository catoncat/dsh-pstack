import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "automate-me",
  skill: "automate-me",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "我想让你以后都按我的习惯来干活。这个仓库里我写代码、做验证、写文档都有一套固定偏好，你帮我把这些整理成一个属于我的“个人模式”技能，以后新对话加载它就能沿用我的风格。",
  workspaceFiles: {
    "notes/preferences.md": `# 我的一些工作偏好

- 回复尽量短，先给结论再给理由。
- 改代码前先写一个能失败的测试，再改到通过。
- 提交前自己把真实流程跑一遍，不接受“能编译就算过”。
- 文档里少用形容词，多写具体命令和路径。
- 能用脚本批量做的活不要手敲。`,
    "src/example.ts": `// 我习惯把手写的属性校验换成 schema，再从 schema 推导类型。
export interface User {
  id: string;
  email: string;
}

export function parseUser(input: unknown): User {
  const raw = input as Record<string, unknown>;
  return { id: String(raw.id), email: String(raw.email) };
}
`,
    "README.md": `# 内部工具

一个团队内部使用的小工具，长期维护，主要由 agent 协助改动。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "automate-me" },
  ],
  intent:
    "用户要求把自己的工作习惯固化成一个可复用的个人模式技能，正是 automate-me 描述的唯一目标。",
};
