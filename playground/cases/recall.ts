import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "recall",
  skill: "recall",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "帮我接上之前的进度：我最近在这个项目里到底做了什么、现在卡在什么地方、下一步最该干什么，给我一个简明的现状，别从零重新讲一遍。",
  workspaceFiles: {
    "package.json": `{
  "name": "search-service",
  "type": "module",
  "scripts": { "test": "vitest run" }
}`,
    "src/search.ts": `export function search(query: string, docs: string[]): string[] {
  return docs.filter((d) => d.includes(query));
}
`,
    "CHANGELOG.md": `# 变更记录

- 修复搜索结果偶发顺序不稳定（改用稳定排序）。
- 待办：搜索结果分页还没做，大结果集会卡。
- 已回滚：尝试用 worker 线程做后台索引，内存暴涨被撤下。
`,
    "README.md": `# search-service

内部文档检索服务。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "recall" },
  ],
  intent: "用户在续接工作前要求重建最近的工作上下文与下一步，正是 recall 的用途。",
};
