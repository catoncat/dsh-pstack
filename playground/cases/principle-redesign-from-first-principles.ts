import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-redesign-from-first-principles",
  skill: "principle-redesign-from-first-principles",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt:
    "我们现在只支持单币种，要加多币种支持。我打算在原来的金额字段旁边再加一个 currency 字段就行。",
  workspaceFiles: {
    "src/money.ts": `export interface Money {
  amount: number;
}

export function add(a: Money, b: Money): Money {
  return { amount: a.amount + b.amount };
}`,
    "src/checkout.ts": `import { add } from "./money";

export function total(prices: Money[]): Money {
  return prices.reduce(add, { amount: 0 });
}`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-redesign-from-first-principles" },
  ],
  intent:
    "把新需求直接贴到旧设计上会留下隐患，正确做法是按“如果一开始就要多币种会怎么设计”重做并贯通所有引用。",
};
