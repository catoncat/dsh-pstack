import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-type-system-discipline",
  skill: "principle-type-system-discipline",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt: "给这个转账函数加点类型约束，现在账户 id 都用普通 string，我总担心把付款方和收款方传反。",
  workspaceFiles: {
    "src/transfer.ts": `export function transfer(fromAccountId: string, toAccountId: string, amount: number) {
  // 从付款账户扣款并给收款账户加款
  return { fromAccountId, toAccountId, amount };
}`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-type-system-discipline" },
  ],
  intent:
    "设计要求让非法状态不可表示，正确做法是给语义不同的原始类型打上不同品牌并限制转换，而不是继续共用 string。",
};
