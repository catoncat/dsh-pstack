import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "figure-it-out",
  skill: "figure-it-out",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "我要把这个用 Webpack 的 monorepo 迁到 Vite，涉及十几个子包和一堆共享配置，估计要做好几天，中间我会走开不盯着。先别急着改，帮我把这件事设计成一个严谨、每一步都可验证、又能让我回来审计的执行流程。",
  workspaceFiles: {
    "package.json": `{
  "name": "monorepo",
  "private": true,
  "workspaces": ["packages/*"],
  "devDependencies": { "webpack": "^5.0.0", "webpack-cli": "^5.0.0" }
}`,
    "webpack.config.js": `const path = require("path");

module.exports = {
  entry: "./packages/core/src/index.ts",
  output: { path: path.resolve(__dirname, "dist"), filename: "bundle.js" },
  resolve: { extensions: [".ts", ".js"] },
  module: { rules: [{ test: /\\.ts$/, use: "ts-loader" }] },
};
`,
    "packages/core/package.json": `{
  "name": "@mono/core",
  "version": "0.1.0",
  "main": "src/index.ts"
}`,
    "packages/ui/package.json": `{
  "name": "@mono/ui",
  "version": "0.1.0",
  "main": "src/index.ts",
  "dependencies": { "@mono/core": "workspace:*" }
}`,
    "packages/core/src/index.ts": `export const add = (a: number, b: number): number => a + b;
`,
    "README.md": `# monorepo

内部前端 monorepo，用 Webpack 构建，包之间互相 workspace 依赖。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "figure-it-out" },
  ],
  intent:
    "一个没有现成 playbook 的大型、跨包、多天且需要事后审计的迁移，正好命中 figure-it-out 声明的“先设计一套可审计的执行流程”的场景。",
};
