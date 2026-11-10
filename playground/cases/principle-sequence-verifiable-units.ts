import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-sequence-verifiable-units",
  skill: "principle-sequence-verifiable-units",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt: "我要把十五个页面从 class 组件改成函数组件，准备一口气全改完，最后一起跑测试。",
  workspaceFiles: {
    "src/pages/Home.tsx": `import React from "react";

export class Home extends React.Component {
  render() {
    return <div>Home</div>;
  }
}`,
    "docs/pages.md": `# 待改造页面

共 15 个 class 组件：Home, About, Cart, Profile, ...`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-sequence-verifiable-units" },
  ],
  intent:
    "多步相似改动的正确做法是拆成每个都以可验证状态收尾的小单元、逐个验证并对评审者按顺序呈现，而不是一次性改完再统一测。",
};
