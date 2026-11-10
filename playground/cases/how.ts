import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "how",
  skill: "how",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "在动支付重试这块之前，我想先彻底搞懂它现在是怎么运转的：一次支付失败之后重试是怎么被触发、退避时间怎么算、状态又是在哪里更新的。相关的模块都在 src 下面，帮我讲清楚，让我形成能支撑后面改动的心智模型。",
  workspaceFiles: {
    "package.json": `{
  "name": "payments",
  "type": "module",
  "scripts": { "start": "node src/payments.ts" }
}`,
    "src/payments.ts": `import { withRetry } from "./retry";
import { recordStatus } from "./ledger";

export async function charge(amount: number): Promise<void> {
  await withRetry(async (attempt) => {
    recordStatus("attempt", attempt);
    await callGateway(amount);
  });
  recordStatus("charged", amount);
}

async function callGateway(amount: number): Promise<void> {
  await new Promise((r) => setTimeout(r, 10));
  if (amount > 10000) throw new Error("gateway declined");
}
`,
    "src/retry.ts": `export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 100;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}
`,
    "src/ledger.ts": `const entries: Array<{ kind: string; value: number }> = [];

export function recordStatus(kind: string, value: number): void {
  entries.push({ kind, value });
}

export function allEntries() {
  return entries;
}
`,
    "README.md": `# payments

支付服务，负责扣款、重试和状态记账。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "how" },
  ],
  intent:
    "用户在改动前要求彻底搞懂支付重试子系统的运行流程，正好命中 how 声明的“改代码前先获得子系统架构解释”的场景。",
};
