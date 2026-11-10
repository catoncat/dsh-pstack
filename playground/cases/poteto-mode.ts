import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "poteto-mode",
  skill: "poteto-mode",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "帮我给这个记账应用加一个按月统计支出的报表页：数据从已有的交易列表算出来，要有空状态和加载中的样子，做完告诉我怎么验证它真的对。",
  workspaceFiles: {
    "package.json": `{
  "name": "ledger-app",
  "type": "module",
  "scripts": { "start": "node src/server.ts" }
}`,
    "src/transactions.ts": `export interface Transaction {
  id: string;
  date: string;
  amountCents: number;
  category: string;
}

export function listTransactions(): Transaction[] {
  return [
    { id: "t1", date: "2026-01-03", amountCents: 4200, category: "餐饮" },
    { id: "t2", date: "2026-01-08", amountCents: 12800, category: "购物" },
    { id: "t3", date: "2026-02-11", amountCents: 9900, category: "餐饮" },
  ];
}
`,
    "src/server.ts": `import { listTransactions } from "./transactions";

export function handle(_path: string): unknown {
  return { transactions: listTransactions() };
}
`,
    "README.md": `# 记账应用

本地记账小应用，目前只有一个交易列表接口，还没有任何统计页面。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "preset-active", detail: "poteto-mode" },
  ],
  intent:
    "一个真实的功能开发请求并要求给出可验证的完成标准，正是 poteto-mode 作为根 preset 常驻并调度其它技能的场景。raw 轮 环境没有 preset 机制，此断言预期失败并记为缺口。",
};
