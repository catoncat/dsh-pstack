import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-build-the-lever",
  skill: "principle-build-the-lever",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt: "仓库里四十多个组件还在用老的 data-value 属性，我要全部换成 data-testid，帮我改一下。",
  workspaceFiles: {
    "src/components/Button.tsx": `export function Button(props: { label: string }) {
  return <button data-value={props.label}>{props.label}</button>;
}`,
    "src/components/Card.tsx": `export function Card(props: { title: string }) {
  return <section data-value={props.title}>{props.title}</section>;
}`,
    "README.md": `# 组件目录

src/components 下共 41 个 .tsx 文件，测试节点统一用 data-value 标记。`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-build-the-lever" },
  ],
  intent:
    "这是一次可在单个脚本里跑完的批量编辑，正确做法是写一个可复跑的 codemod，而不是逐个手改四十多个文件。",
};
