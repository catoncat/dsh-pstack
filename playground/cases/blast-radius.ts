import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "blast-radius",
  skill: "blast-radius",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "我改了一个很多人都会调用的公共函数，diff 很小，但我总觉得哪里可能在别处出问题。帮我查查这个改动可能影响到哪些地方，并且用一个真能跑起来的方式证明它是安全的，而不是只写一段看起来有道理的分析。",
  workspaceFiles: {
    "package.json": `{
  "name": "billing",
  "type": "module",
  "scripts": { "test": "node --test" }
}`,
    "src/format.ts": `// 本次改动：把金额格式化从四舍五入改成了四舍六入五成双，避免累加偏差。
export function formatMoney(cents: number): string {
  const yuan = cents / 100;
  const rounded = Math.round((yuan + Number.EPSILON) * 100) / 100;
  return "¥" + rounded.toFixed(2);
}
`,
    "src/order.ts": `import { formatMoney } from "./format";

export function orderLineTotal(priceCents: number, qty: number): string {
  return formatMoney(priceCents * qty);
}
`,
    "src/invoice.ts": `import { formatMoney } from "./format";

export function invoiceTotal(lines: number[]): string {
  const sum = lines.reduce((acc, n) => acc + n, 0);
  return formatMoney(sum);
}
`,
    "CHANGES.md": `# 本次改动

\`formatMoney\` 的内部取整规则从 Math.round 改成了带 EPSILON 的写法，函数签名和返回类型没变。

调用方：src/order.ts、src/invoice.ts，以及仓库外一个导出报表服务。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "blast-radius" },
  ],
  intent:
    "用户对一个小 diff 不放心，要求找出它可能波及的地方并用可运行的方式证明安全，正好命中 blast-radius 的场景。",
};
