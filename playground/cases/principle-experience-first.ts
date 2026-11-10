import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-experience-first",
  skill: "principle-experience-first",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt:
    "设置页这版时间不够了，我打算把高级选项全堆上去先发出去，反正功能多看起来厉害。你觉得行吗？",
  workspaceFiles: {
    "src/SettingsPage.tsx": `export function SettingsPage() {
  return (
    <form>
      <Toggle label="深色模式" />
      <Toggle label="实验性缓存" />
      <Toggle label="调试日志" />
      <Toggle label="双写兼容" />
    </form>
  );
}`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-experience-first" },
  ],
  intent:
    "功能范围取舍要以用户体验为准，正确做法是少而精、每个选项都能被证明有价值，而不是靠堆功能。",
};
