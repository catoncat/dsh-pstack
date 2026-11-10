import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "interrogate",
  skill: "interrogate",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "我这有个还没合并的改动，加了一条带缓存的查询路径。我想让几个模型从对抗的角度认真把它拆一遍，只保留能用真实运行证明的问题，别给我风格、命名或者“将来可能出事”那类猜测。",
  workspaceFiles: {
    "package.json": `{
  "name": "reporting",
  "type": "module",
  "scripts": { "test": "vitest run" }
}`,
    "src/query.ts": `import { db } from "./db";

const cache = new Map<string, unknown[]>();

export function getInvoices(accountId: string, tenant: string): unknown[] {
  // 本次改动：用 accountId 做缓存键，想省掉重复查询。
  const key = accountId;
  const hit = cache.get(key);
  if (hit) return hit;
  const rows = db.query("select * from invoices where account_id = ?", [accountId]);
  cache.set(key, rows);
  return rows;
}
`,
    "src/db.ts": `export const db = {
  query(sql: string, params: unknown[]): unknown[] {
    return [{ id: "inv-1", sql, params }];
  },
};
`,
    "CHANGES.md": `# 未合并改动

在 getInvoices 外面加了一个进程内缓存，键是 accountId，用来减少重复查询。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "interrogate" },
  ],
  intent:
    "用户要求多模型对抗式地把一个改动拆开、只留可复现的问题，正好命中 interrogate 声明的对抗多模型审查场景。",
};
