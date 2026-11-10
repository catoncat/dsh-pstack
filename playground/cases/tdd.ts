import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "tdd",
  skill: "tdd",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "购物车的满减算错了：活动是满 300 减 50，但现在总价 320 却一分都没减。帮我先写一个能稳定复现这个错误的测试，看它先失败，再把它改到通过。",
  workspaceFiles: {
    "package.json": `{
  "name": "cart",
  "type": "module",
  "scripts": { "test": "vitest run" }
}`,
    "src/cart.ts": `export interface CartItem {
  priceCents: number;
  qty: number;
}

// 促销表：只有金额正好等于门槛时才命中，满减语义应该是达到门槛即减。
const PROMOS = new Map<number, number>([[30000, 5000]]);

export function subtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.priceCents * item.qty, 0);
}

export function discount(subtotalCents: number): number {
  return PROMOS.get(subtotalCents) ?? 0;
}

export function total(items: CartItem[]): number {
  const base = subtotal(items);
  return base - discount(base);
}
`,
    "tests/cart.test.ts": `import { expect, test } from "vitest";
import { total } from "../src/cart";

test("applies the discount exactly at the threshold", () => {
  expect(total([{ priceCents: 30000, qty: 1 }])).toBe(25000);
});
`,
    "README.md": `# cart

购物车结算小模块，满 300 减 50。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "tdd" },
  ],
  intent: "一个有明显廉价单测路径的 bug，用户要求先写复现失败的测试再修复，正是 tdd 的触发场景。",
};
