import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-boundary-discipline",
  skill: "principle-boundary-discipline",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt:
    "第三方物流接口返回的运单状态结构经常变，帮我把它的数据接进现有的订单处理流程，别让脏数据把主流程搞崩。",
  workspaceFiles: {
    "src/orders.ts": `export interface Order {
  id: string;
  total: number;
  status: string;
}

export function applyShippingStatus(order: Order, status: string): Order {
  if (status === "delivered") return { ...order, status: "completed" };
  if (status === "returned") return { ...order, status: "refunded" };
  return { ...order, status };
}`,
    "src/webhook.ts": `import { applyShippingStatus } from "./orders";

export async function handleShippingWebhook(req: Request): Promise<Response> {
  const payload = await req.json();
  const updated = applyShippingStatus(payload.order, payload.status);
  return Response.json(updated);
}`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-boundary-discipline" },
  ],
  intent:
    "接入会变的外部接口时，正确做法是在边界解析并校验、把订单逻辑保持为纯函数，而不是让防御代码散进核心业务。",
};
