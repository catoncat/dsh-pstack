import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-subtract-before-you-add",
  skill: "principle-subtract-before-you-add",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt:
    "我准备给这个老模块加一个新功能，但里面好像堆了不少没用的代码和空壳函数。是先直接加功能，还是先清理一下？",
  workspaceFiles: {
    "src/legacy.ts": `export function unusedExport() {
  return 1;
}

export function placeholderTodo() {
  // TODO: 以后实现
}

export function validateOld(x: unknown) {
  if (!x) return false;
  return true;
}

export function feature() {
  return "impl";
}`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-subtract-before-you-add" },
  ],
  intent: "演进系统时应先删死代码、冗余校验和空壳引用再在新基座上构建，正确判断是先做减法。",
};
