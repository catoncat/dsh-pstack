import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "why",
  skill: "why",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "为什么我们的支付重试要做指数退避、而且最多只重试三次？这个决定当初是怎么定下来的，有没有相关的讨论或者事故推动？我想在改它之前先弄清来龙去脉。",
  workspaceFiles: {
    "package.json": `{
  "name": "payments",
  "type": "module"
}`,
    "src/retry.ts": `export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 200,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}
`,
    "src/payments.ts": `import { withRetry } from "./retry";

export async function charge(amount: number): Promise<void> {
  await withRetry(() => callGateway(amount));
}

async function callGateway(_amount: number): Promise<void> {
  // 真实网关调用
}
`,
    "docs/incidents/2025-11-retry-storm.md": `# 事故复盘：重试风暴

时间：2025-11-18

网关在高峰期抖动，客户端无条件立即重试，短时间内把请求量放大了好几倍，最终把网关压垮。

措施：改为指数退避，并限制最多三次，给网关留恢复时间。要改这个上限需要先评估峰值请求量。
`,
    "CHANGELOG.md": `# 变更记录

- 支付重试改为指数退避，最多三次（见 docs/incidents/2025-11-retry-storm.md）。
- 之后还调过 baseDelay 从 100ms 到 200ms。
`,
    "README.md": `# payments

支付服务，负责扣款和失败重试。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "why" },
  ],
  intent:
    "用户追问重试策略背后的决策与来源（是否有讨论或事故推动），正是 why 声明的设计动机调查场景。",
};
