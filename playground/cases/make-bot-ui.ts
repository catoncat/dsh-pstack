import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "make-bot-ui",
  skill: "make-bot-ui",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "帮我做一个网页，页面上有几个按钮，点一下就能唤醒我的 Grok Bot 去跑对应的任务；我在手机上也要能打开这个页面，所以别只绑本机地址。",
  workspaceFiles: {
    "ui/index.html": `<!doctype html>
<html lang="zh">
  <head>
    <meta charset="utf-8" />
    <title>Bot 控制台</title>
  </head>
  <body>
    <h1>Bot 控制台</h1>
    <!-- 按钮和脚本待补 -->
  </body>
</html>
`,
    "README.md": `# bot 控制台

一个内部小页面，点按钮触发 Grok Bot 跑不同任务。目前只有一个空壳 HTML。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "make-bot-ui" },
  ],
  intent:
    "用户要做一个通过点击按钮经 webhook 唤醒 Grok Bot 的页面并要在手机上访问，正好命中 make-bot-ui 的场景。",
};
