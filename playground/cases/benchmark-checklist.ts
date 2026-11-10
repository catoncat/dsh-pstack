import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "benchmark-checklist",
  skill: "benchmark-checklist",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "我把列表渲染从直接渲染改成了虚拟滚动，自己跑了个脚本，结果看起来快了大概三倍，想把这个数字写进 PR 的说明里。你帮我把这个性能结论把把关，看看到底能不能这么报。",
  workspaceFiles: {
    "package.json": `{
  "name": "list-perf",
  "type": "module",
  "scripts": { "bench": "node bench/render.bench.mjs" }
}`,
    "src/list.ts": `export function renderList(items: string[], viewport: number): string[] {
  // 只渲染视口范围内的条目，模拟虚拟滚动。
  return items.slice(0, viewport);
}
`,
    "bench/render.bench.mjs": `import { renderList } from "../src/list.ts";

const items = Array.from({ length: 60000 }, (_, i) => "row-" + i);

const start = performance.now();
const visible = renderList(items, 30);
const elapsed = performance.now() - start;

console.log("rendered", visible.length, "in", elapsed.toFixed(1), "ms");
`,
    "bench/RESULTS.md": `# 手测结果

只在本机跑了一次。

- 改之前：约 1200ms
- 改之后：约 400ms
`,
    "README.md": `# list-perf

一个渲染长列表的小库，最近把整表渲染换成了视口渲染。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "benchmark-checklist" },
  ],
  intent:
    "用户要把自己测出的加速比写进 PR，正好命中 benchmark-checklist 声明的“报告自己测出的加速或回归前先核对测量”的场景。",
};
