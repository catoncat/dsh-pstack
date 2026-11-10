import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "architect",
  skill: "architect",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "这个编辑器要加一个离线草稿同步：还没保存的草稿先落到本地，等联网后再同步到服务端，遇到冲突要能合并。它同时牵扯本地存储、网络同步和编辑器界面三层。先别写实现，帮我把核心类型、函数签名和各模块的边界定清楚，我确认形状之后再照着往下填。",
  workspaceFiles: {
    "package.json": `{
  "name": "notes-editor",
  "type": "module",
  "scripts": { "dev": "vite" },
  "dependencies": { "vite": "^5.0.0" }
}`,
    "src/storage/draftStore.ts": `export interface DraftRecord {
  id: string;
  body: string;
  updatedAt: number;
}

export function loadDrafts(): DraftRecord[] {
  throw new Error("not implemented");
}

export function saveDraft(draft: DraftRecord): void {
  throw new Error("not implemented");
}
`,
    "src/net/syncClient.ts": `export interface PushResult {
  ok: boolean;
  serverUpdatedAt: number;
}

export async function pushDraft(id: string, body: string): Promise<PushResult> {
  throw new Error("not implemented");
}
`,
    "src/ui/editor.ts": `export function mountEditor(root: HTMLElement): void {
  throw new Error("not implemented");
}
`,
    "src/index.ts": `import { mountEditor } from "./ui/editor";

mountEditor(document.getElementById("app")!);
`,
    "README.md": `# Notes editor

一个基于浏览器的本地笔记编辑器，目前只能在线编辑，没有离线能力。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "architect" },
  ],
  intent:
    "一个跨存储、网络、界面多层的非平凡新功能，用户明确要求先定类型与模块边界再写代码，正好命中 architect 声明的设计先行场景。",
};
