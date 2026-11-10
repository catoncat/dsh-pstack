import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-minimize-reader-load",
  skill: "principle-minimize-reader-load",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt: "帮我看下这段结账逻辑，为什么读起来这么绕，能不能简化一下？",
  workspaceFiles: {
    "src/checkout.ts": `let lastTotal = 0;

function computeRaw(items: Item[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
function withTax(total: number) {
  return total * 1.1;
}
function wrapWithTax(items: Item[]) {
  return withTax(computeRaw(items));
}
function wrapWithTaxAgain(items: Item[]) {
  return wrapWithTax(items);
}

export function checkout(items: Item[]) {
  lastTotal = wrapWithTaxAgain(items);
  return lastTotal;
}`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-minimize-reader-load" },
  ],
  intent:
    "代码难追踪时要按层数与隐藏状态判断读者负担，正确做法是折叠单调用方包装、缩小可变状态，而不是只看行数。",
};
