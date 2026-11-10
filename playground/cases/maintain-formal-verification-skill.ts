import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "maintain-formal-verification-skill",
  skill: "maintain-formal-verification-skill",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "我们给任务队列做的那套形式化验证，前阵子队列代码改过，但一直没重新跑验证。帮我把它和现在的代码重新对齐，重跑一遍，并告诉我如果有失败，是验证描述过时了，还是代码真的有 bug。",
  workspaceFiles: {
    "package.json": `{
  "name": "task-queue",
  "type": "module"
}`,
    "src/queue.ts": `export interface Task {
  id: string;
  status: "pending" | "claimed" | "done";
}

export class Queue {
  private tasks: Task[] = [];

  add(id: string): void {
    this.tasks.push({ id, status: "pending" });
  }

  // 新增了“批量领取”：一次可领多个任务。
  claimBatch(n: number): Task[] {
    const pending = this.tasks.filter((t) => t.status === "pending").slice(0, n);
    for (const t of pending) t.status = "claimed";
    return pending;
  }

  complete(id: string): void {
    const t = this.tasks.find((x) => x.id === id);
    if (t) t.status = "done";
  }
}
`,
    "spec/Queue.tla": `---- MODULE Queue ----
EXTENDS Naturals

VARIABLES pending, claimed, done

Init == pending = {"t1", "t2"} /\\ claimed = {} /\\ done = {}

Claim == \\E t \\in pending : pending' = pending \\ {t} /\\ claimed' = claimed \\/ {t} /\\ UNCHANGED done
Complete == \\E t \\in claimed : claimed' = claimed \\ {t} /\\ done' = done \\/ {t} /\\ UNCHANGED pending

Next == Claim \\/ Complete

AtMostOnce == \\A t : ~ (t \\in pending /\\ t \\in claimed)
====
`,
    "spec/Queue.cfg": `SPECIFICATION Spec
INVARIANT AtMostOnce
`,
    ".cursor/skills/verify-queue/SKILL.md": `---
name: verify-queue
description: Verify the task queue never lets two workers own one task. Use when changing src/queue.ts.
---

# Verify task queue

## Property

At most one worker owns a task at a time.

## Covered code

- src/queue.ts (Queue.add, Queue.claim)

## Bounds and assumptions

Two tasks, single process, in-memory only.

## Run

\`\`\`
tlc spec/Queue.tla -config spec/Queue.cfg
\`\`\`

## Sync commit

Last confirmed against code at commit a1b2c3d.
`,
    "README.md": `# task-queue

内存任务队列，附一个 TLA+ 形式化验证，检查任务不会被重复领取。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "maintain-formal-verification-skill" },
  ],
  intent:
    "已有的形式化验证在代码变更后没重新跑，用户要求把它与当前代码对齐并判断失败是漂移还是 bug，正是 maintain-formal-verification-skill 的用途。",
};
