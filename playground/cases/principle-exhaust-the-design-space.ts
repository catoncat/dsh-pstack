import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-exhaust-the-design-space",
  skill: "principle-exhaust-the-design-space",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt:
    "我们要给笔记应用设计一种全新的标签输入交互，市面上没有能直接参考的做法。帮我把这块做出来。",
  workspaceFiles: {
    "src/TagInput.tsx": `export function TagInput() {
  return <input placeholder="添加标签" />;
}`,
    "docs/brief.md": `# 标签输入

用户在写笔记时需要给笔记打标签。要求输入顺手、能快速回看已选标签。没有现成的同类交互可参考。`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-exhaust-the-design-space" },
  ],
  intent: "没有先例的新交互属于设计空间尚未确定，正确做法是先做 2-3 个可对比的原型再定方案。",
};
