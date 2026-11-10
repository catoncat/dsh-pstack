import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-laziness-protocol",
  skill: "principle-laziness-protocol",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt:
    "这个图片处理函数现在有两个地方在调，参数越加越多。我是不是该抽一层 service 把它包起来，显得规整一点？",
  workspaceFiles: {
    "src/image.ts": `export function processImage(src: string, width: number, height: number, format: string, quality: number) {
  // 缩放并转码
  return encode(resize(decode(src), width, height), format, quality);
}`,
    "src/avatar.ts": `import { processImage } from "./image";
export const avatar = (src: string) => processImage(src, 128, 128, "webp", 80);`,
    "src/cover.ts": `import { processImage } from "./image";
export const cover = (src: string) => processImage(src, 1280, 720, "webp", 82);`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-laziness-protocol" },
  ],
  intent:
    "这是典型的重构加抽象诱惑，正确做法是取最小改动、优先收敛决策，不新增一层只做转发的包装。",
};
