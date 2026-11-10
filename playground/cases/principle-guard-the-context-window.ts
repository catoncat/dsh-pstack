import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-guard-the-context-window",
  skill: "principle-guard-the-context-window",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt: "把日志目录下这三十个访问日志都读一遍，找出来可疑的请求，最后给我一句结论就行。",
  workspaceFiles: {
    "logs/access-001.log": `2025-03-01T00:00:01Z 200 GET /api/items 12ms
2025-03-01T00:00:02Z 401 POST /api/login 8ms
（每个文件约 5 万行）`,
    "logs/README.md": `# 日志

该目录有 30 个访问日志文件，单个约 5 万行。`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-guard-the-context-window" },
  ],
  intent: "大量原始日志会撑爆主上下文，正确做法是把批量读取分派给子代理、只在主线保留归纳结论。",
};
