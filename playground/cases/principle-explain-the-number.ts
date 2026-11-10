import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-explain-the-number",
  skill: "principle-explain-the-number",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt:
    "我优化了图片上传，本地跑了一遍从 2.0s 降到 1.1s，差不多快了一倍。帮我把这个写进发布说明。",
  workspaceFiles: {
    "bench/upload.ts": `const start = performance.now();
await upload(fixture);
console.log(performance.now() - start);`,
    "NOTES.md": `只在本机跑了一次；用的是本地磁盘，没有走真实网络；fixture 是 1MB 的小文件。`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-explain-the-number" },
  ],
  intent:
    "要把一个加速比写进发布说明前，必须先说明限制因素、跑数与波动并排除它测的是别的工作，而不是直接采信单次结果。",
};
