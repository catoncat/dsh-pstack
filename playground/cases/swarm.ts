import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "swarm",
  skill: "swarm",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "这五个页面要逐个核对是否符合新的无障碍规范，一个人做得太慢。帮我把它并行拆开跑，每个分片都要有各自的结论，最后汇总成一份报告。",
  workspaceFiles: {
    "docs/a11y.md": `# 无障碍规范

- 每张图片必须有 alt。
- 每个表单控件必须有 label。
- 颜色对比度至少 4.5:1。
- 重要交互必须能纯键盘完成。`,
    "pages/page-01.html": `<html><body><img src="a.png"><input type="text"></body></html>
`,
    "pages/page-02.html": `<html><body><img src="b.png" alt="图表"><label>姓名<input type="text"></label></body></html>
`,
    "pages/page-03.html": `<html><body><button onclick="go()">提交</button></body></html>
`,
    "pages/page-04.html": `<html><body><div style="color:#bbb;background:#fff">灰色说明文字</div><img src="d.png"></body></html>
`,
    "pages/page-05.html": `<html><body><a href="#" onclick="toggle()">展开</a><input placeholder="搜索"></body></html>
`,
    "package.json": `{
  "name": "pages",
  "private": true
}`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "swarm" },
  ],
  intent: "把一批页面按分片并行核对并汇总成单份报告，正是 swarm 声明的并行分片覆盖场景。",
};
