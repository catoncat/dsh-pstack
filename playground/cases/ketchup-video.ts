import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "ketchup-video",
  skill: "ketchup-video",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "把这次对话从我上一条消息到现在的变化做成一个带字幕的短视频给我看，最后把等我拍板的事用文字列在下面。",
  workspaceFiles: {
    "README.md": `# 通知服务

给内部系统发通知的小服务，正在改造中。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "ketchup-video" },
  ],
  intent:
    "用户要求用带字幕的短视频回顾本对话的变化并附上待决定事项，正是 ketchup-video 的触发场景。",
};
