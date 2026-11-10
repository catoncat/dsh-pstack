import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "technical-writing",
  skill: "technical-writing",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "帮我把这个 parcel 项目的 README 重写一遍：写清楚它是干什么的、怎么跑起来、每个配置项是什么意思。现在这一版太乱了，我看着都费劲。",
  workspaceFiles: {
    "README.md": `# parcel

parcel 是一个打包配置工具。用起来很有讲究。你需要先安装依赖，然后再运行，运行之前要注意配置，配置很重要。有问题可以看看 docs。总之它是一个很强大的工具，能帮助你完成很多工作。
`,
    "package.json": `{
  "name": "parcel",
  "type": "module",
  "scripts": { "start": "node src/index.ts" }
}`,
    "src/index.ts": `import { readConfig } from "./config";

const config = readConfig();
export function run(): void {
  console.log("running with", config);
}
`,
    "config.example.json": `{
  "input": "src/index.ts",
  "outDir": "dist",
  "minify": true
}`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "technical-writing" },
    { kind: "artifact-contains", detail: "README.md::parcel" },
  ],
  intent:
    "用户要求按清晰的写作标准重写一个项目的 README，正是 technical-writing 声明的文档写作场景。",
};
