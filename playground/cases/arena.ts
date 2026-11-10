import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "arena",
  skill: "arena",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "我要给这个命令行工具换一个新的进度条渲染模块，接口和视觉都还没定，一次写成什么样很容易就定死了。麻烦你同时让几个独立方案各做一版，挑一个最合适的做底，再把其他方案里更好的部分并进来，最后给我一个成品，并说明为什么选它。",
  workspaceFiles: {
    "package.json": `{
  "name": "batch-cli",
  "type": "module",
  "bin": { "batch": "src/cli.ts" },
  "scripts": { "start": "tsx src/cli.ts" }
}`,
    "src/cli.ts": `import { renderProgress } from "./progress";

const total = 500;
for (let i = 0; i <= total; i += 10) {
  renderProgress(i, total);
  await new Promise((r) => setTimeout(r, 5));
}
`,
    "src/progress.ts": `// 目前的进度条，只是个占位实现。
export function renderProgress(done: number, total: number): void {
  process.stdout.write(String(done) + "/" + String(total) + "\\n");
}
`,
    "README.md": `# batch-cli

批量处理文件的命令行工具。当前进度条直接逐行打印数字，体验很差。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "arena" },
  ],
  intent:
    "接口和视觉都没有先例的非平凡产物，一次尝试容易锁死形状，正好命中 arena 声明的多候选、选底、嫁接场景。",
};
