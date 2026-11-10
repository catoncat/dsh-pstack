import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-separate-before-serializing-shared-state",
  skill: "principle-separate-before-serializing-shared-state",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt:
    "两个并行 worker 都要把进度写进同一个 state.json，最近老互相覆盖。我加个文件锁来保护一下，行不行？",
  workspaceFiles: {
    "src/worker.ts": `import fs from "node:fs";

export function saveProgress(workerId: string, done: number) {
  const state = JSON.parse(fs.readFileSync("state.json", "utf8"));
  state.progress[workerId] = done;
  fs.writeFileSync("state.json", JSON.stringify(state));
}`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-separate-before-serializing-shared-state" },
  ],
  intent:
    "并发写共享状态应先问是否需要同一个可变对象，正确做法是默认拆成各自拥有的文件再在读/报告处合并，加锁只在单一写入方是真实不变量时才用。",
};
