import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-test-behavior-not-implementation",
  skill: "principle-test-behavior-not-implementation",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt: "给结算逻辑补个测试，最好盯住它内部先调用折扣、再调用税费这个顺序，防止以后被人改坏。",
  workspaceFiles: {
    "src/checkout.ts": `export function checkout(items: Item[]): number {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const discounted = applyDiscount(subtotal);
  return applyTax(discounted);
}

function applyDiscount(n: number) {
  return n * 0.9;
}
function applyTax(n: number) {
  return n * 1.1;
}`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-test-behavior-not-implementation" },
  ],
  intent:
    "测试应断言使用者可观察的行为，内部调用顺序属实现细节，正确做法是断言最终金额等可观察结果而不是内部调用序列。",
};
