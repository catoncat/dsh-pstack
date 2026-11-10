import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "show-me-your-work",
  skill: "show-me-your-work",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "我要对这个模块做一轮持续的查询性能优化，会跑很久、中途我会离开。帮你在推进的过程里维护一份可以事后审阅的决策日志：每一步选了什么、为什么、证据在哪、结果如何，我回来能顺着它核对。",
  workspaceFiles: {
    "package.json": `{
  "name": "query-perf",
  "type": "module",
  "scripts": { "bench": "node bench/query.bench.mjs" }
}`,
    "src/query.ts": `export function findMatches(rows: string[], needle: string): number[] {
  const hits: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].includes(needle)) hits.push(i);
  }
  return hits;
}
`,
    "bench/query.bench.mjs": `import { findMatches } from "../src/query.ts";

const rows = Array.from({ length: 200000 }, (_, i) => "row-" + i + "-" + (i % 7));
const start = performance.now();
const hits = findMatches(rows, "row-123");
console.log("hits", hits.length, "in", (performance.now() - start).toFixed(1), "ms");
`,
    "README.md": `# query-perf

内部检索模块，准备做一轮性能优化。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "show-me-your-work" },
    { kind: "artifact-contains", detail: "decisions.tsv::phase" },
  ],
  intent:
    "一段长时、无人值守、事后需要审计的优化工作，用户要求维护决策日志，正是 show-me-your-work 的用途。",
};
