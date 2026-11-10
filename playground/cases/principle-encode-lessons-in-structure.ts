import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-encode-lessons-in-structure",
  skill: "principle-encode-lessons-in-structure",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt:
    "我在团队规范文档里已经写了两遍“提交前不要手改 dist 目录”，但还是有人犯。这次我准备再把它加粗、放到最前面，你觉得够吗？",
  workspaceFiles: {
    "CONTRIBUTING.md": `# 贡献规范

## 提交

提交前不要手改 dist 目录。

## 构建

dist 由构建生成。再次提醒：提交前不要手改 dist 目录。`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-encode-lessons-in-structure" },
  ],
  intent:
    "同一条指令已被重复书写两次仍未生效，正确做法是把规则编码成 lint、钩子或运行时检查，而不是继续加文字。",
};
