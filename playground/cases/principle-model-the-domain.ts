import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-model-the-domain",
  skill: "principle-model-the-domain",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt:
    "订单状态现在散在好几个文件的一堆 if/else 里，我还要再加一个“部分退款”状态，怕越改越乱。帮我加一下。",
  workspaceFiles: {
    "src/orderStatus.ts": `export function canCancel(status: string) {
  return status === "created" || status === "paid";
}

export function canRefund(status: string) {
  return status === "paid" || status === "shipped";
}

export function label(status: string) {
  if (status === "created") return "待支付";
  if (status === "paid") return "已支付";
  if (status === "shipped") return "已发货";
  return "未知";
}`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-model-the-domain" },
  ],
  intent:
    "状态散落在条件分支里再新增状态会继续膨胀，正确做法是把领域编码成状态机或可辨识联合，让非法状态不可表示。",
};
