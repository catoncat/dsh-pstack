import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "statechart",
  skill: "statechart",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "我们的支付流程有几个状态：创建、支付中、已支付、失败、退款。帮我把它画成一张状态图，并且标出哪种走法会违反“已支付的订单不能直接跳到退款”这条规则；我要拿给产品经理看，所以图要能看懂。",
  workspaceFiles: {
    "package.json": `{
  "name": "payments",
  "type": "module"
}`,
    "src/payment.ts": `export type PaymentState = "created" | "paying" | "paid" | "failed" | "refunding" | "refunded";

export function next(state: PaymentState, event: string): PaymentState {
  if (state === "created" && event === "pay") return "paying";
  if (state === "paying" && event === "ok") return "paid";
  if (state === "paying" && event === "fail") return "failed";
  if (state === "paid" && event === "refund") return "refunding";
  if (state === "refunding" && event === "ok") return "refunded";
  // 漏洞：这里允许从 paid 直接被标记成 refunded，跳过了 refunding。
  if (state === "paid" && event === "force_refund") return "refunded";
  return state;
}
`,
    "README.md": `# payments

支付流程状态机，目前状态转移写在一个函数里。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "statechart" },
  ],
  intent:
    "用户要把支付状态流转画成状态图并标出违反不变式的路径给非技术读者看，正是 statechart 的用途。",
};
