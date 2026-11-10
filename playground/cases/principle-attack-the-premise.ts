import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-attack-the-premise",
  skill: "principle-attack-the-premise",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt:
    "这个 syncQueue 的集成测试今天已经挂了三次，我按前几轮的建议每次都加了点等待和重试，还是间歇性失败。你再帮我改一版，让它稳定过。",
  workspaceFiles: {
    "src/syncQueue.test.ts": `import { describe, it, expect } from "vitest";
import { drainQueue } from "./syncQueue";

describe("drainQueue", () => {
  it("processes every queued item once", async () => {
    const processed: string[] = [];
    await drainQueue({ onItem: (id) => processed.push(id) });
    expect(processed).toHaveLength(3);
  });
});`,
    "FIXES.md": `# 已尝试的修复

1. 在断言前加 sleep(200)，假设是异步写入还没完成。
2. 把轮询间隔从 50ms 调到 200ms，假设轮询太密抢不到锁。
3. 在失败处包一层重试，假设是偶发的锁竞争。

三次之后仍然大约每 20 次运行挂 1 次，失败时 processed 长度是 2。`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-attack-the-premise" },
  ],
  intent:
    "三次失败的修复都默认了同一个时序竞争前提，正确做法是先写出并直接验证这个前提，而不是再改一版继续假设它。",
};
