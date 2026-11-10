import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "create-formal-verification-skill",
  skill: "create-formal-verification-skill",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "我们有个任务队列，好几个 worker 会并发地从里面领任务，我担心会出现同一个任务被两个 worker 同时处理的竞态，可这种毛病普通的单元测试很难测出来。希望给这个仓库加一个项目本地的形式化验证技能，把“每个任务最多被一个 worker 处理一次”这类性质一直检查下去，以后改队列代码时也能跑。",
  workspaceFiles: {
    "package.json": `{
  "name": "task-queue",
  "type": "module",
  "scripts": { "test": "vitest run" }
}`,
    "src/queue.ts": `export interface Task {
  id: string;
  status: "pending" | "claimed" | "done";
}

export class Queue {
  private tasks = new Map<string, Task>();

  add(task: Task): void {
    this.tasks.set(task.id, task);
  }

  // 先读后写，两个 worker 同时调用会领到同一个任务。
  claim(): Task | undefined {
    const next = [...this.tasks.values()].find((t) => t.status === "pending");
    if (!next) return undefined;
    const claimed: Task = { ...next, status: "claimed" };
    this.tasks.set(next.id, claimed);
    return claimed;
  }

  complete(id: string): void {
    const task = this.tasks.get(id);
    if (task) this.tasks.set(id, { ...task, status: "done" });
  }
}
`,
    "src/worker.ts": `import { Queue } from "./queue";

export async function drain(queue: Queue, workers: number): Promise<void> {
  await Promise.all(
    Array.from({ length: workers }, async () => {
      for (;;) {
        const task = queue.claim();
        if (!task) return;
        queue.complete(task.id);
      }
    }),
  );
}
`,
    "README.md": `# task-queue

一个内存任务队列，多个 worker 并发领取并处理任务。目前没有任何形式的并发正确性检查。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "create-formal-verification-skill" },
  ],
  intent:
    "并发领取存在普通测试难以覆盖的竞态，用户要求生成检查不变式的形式化验证技能，正好命中 create-formal-verification-skill 的用途。",
};
