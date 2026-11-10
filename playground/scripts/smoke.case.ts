import type { SkillCase } from "../types";

/** Infrastructure smoke fixture: proves the prepared web instance can run one real turn. */
export const skillCase: SkillCase = {
  id: "smoke",
  skill: "smoke",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt: "请只回复四个字：基建可用",
  workspaceFiles: {},
  expect: [{ kind: "turn-completed" }],
  intent:
    "验证基建本身：浏览器能新建会话、发送 prompt、会话落盘并正常 turn end，不涉及任何技能语义。",
};
