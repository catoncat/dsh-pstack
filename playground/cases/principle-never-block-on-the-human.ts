import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-never-block-on-the-human",
  skill: "principle-never-block-on-the-human",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt:
    "tests 目录里的测试文件命名有点乱，有人用 .spec.ts 有人用 .test.ts。你顺手统一一下，弄完跟我说下结果。",
  workspaceFiles: {
    "tests/foo.spec.ts": `import { it } from "vitest";
it("works", () => {});`,
    "tests/bar.test.ts": `import { it } from "vitest";
it("works", () => {});`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-never-block-on-the-human" },
  ],
  intent:
    "这是可回退且用户已授权自行决定的改动，正确做法是直接选定一种并执行、随后汇报，而不是停下来问用户选哪种。",
};
