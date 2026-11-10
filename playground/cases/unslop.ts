import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "unslop",
  skill: "unslop",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt: "帮我把这段产品介绍里的 AI 味去掉，读起来要像一个真人写的，别那么模板化。",
  workspaceFiles: {
    "docs/intro.md": `# 关于我们

此外，我们的产品致力于赋能企业实现数智化转型，打造一体化、端到端的解决方案矩阵。我们深耕行业多年，凭借卓越的技术实力与深厚的行业积淀，持续为客户创造价值。值得一提的是，我们的平台不仅提供强大的数据处理能力，更通过多元化的功能模块，构建起完整的生态闭环，助力客户在激烈的市场竞争中脱颖而出。总而言之，选择我们，就是选择一个更加璀璨的未来。
`,
    "package.json": `{
  "name": "site",
  "private": true
}`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "unslop" },
  ],
  intent: "用户要求去掉文本里的 AI 腔、改得像真人写的，正是 unslop 的唯一用途。",
};
