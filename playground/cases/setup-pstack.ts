import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "setup-pstack",
  skill: "setup-pstack",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "帮我配置一下 pstack 每个角色分别用哪个模型、给多大推理预算。我们整体用中等预算就好，别太贵也别太抠。",
  workspaceFiles: {
    "package.json": `{
  "name": "my-app",
  "type": "module"
}`,
    "README.md": `# my-app

一个普通的前端项目。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "setup-pstack" },
  ],
  intent: "用户要求为 pstack 各角色配置模型与推理预算，正是 setup-pstack 的用途。",
};
