import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-fix-root-causes",
  skill: "principle-fix-root-causes",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt:
    "保存按钮偶尔报 Cannot read properties of undefined (reading 'id')，我在报错那行加了个 if (!obj) return 就先不崩了。你帮我看看下一步该怎么处理。",
  workspaceFiles: {
    "src/save.ts": `export function saveDraft(draftId: string, store: DraftStore) {
  const draft = store.byId[draftId];
  // 加了一行：if (!draft) return;
  return store.persist(draft.id, draft.body);
}`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-fix-root-causes" },
  ],
  intent:
    "在报错处加判空只是压住症状，正确做法是回溯到第一个产生错误状态的地方并判断该状态是否合法，从根因修复。",
};
