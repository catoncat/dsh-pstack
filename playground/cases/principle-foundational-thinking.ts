import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-foundational-thinking",
  skill: "principle-foundational-thinking",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt:
    "下周开始做批量导入功能，我打算先把上传界面和按钮都写出来，数据模型和类型以后再补。这个顺序可以吗？",
  workspaceFiles: {
    "docs/plan.md": `# 批量导入

目标：用户一次上传 CSV，导入大量记录。

计划：
1. 先做上传界面和进度条
2. 之后再想数据结构和类型`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-foundational-thinking" },
  ],
  intent:
    "在写逻辑前应先定核心类型与数据结构，并先搭好后续阶段都受益的脚手架，正确判断要先定数据形状再写界面。",
};
