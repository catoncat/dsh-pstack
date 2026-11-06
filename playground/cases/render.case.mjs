import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { bad, ok, resultText } from "./_shared.mjs";

const fixture = join(process.cwd(), "playground/.dsh/render-case.mmd");
const output = join(process.cwd(), "playground/.dsh/render-case.svg");

export default {
  id: "CASE-PSTACK-RENDER-01",
  title: "pstack_render 调用渲染器或报告缺失依赖",
  build() {
    return {
      setup() {
        mkdirSync(dirname(fixture), { recursive: true });
        writeFileSync(fixture, "flowchart LR\n  A[input] --> B[svg]\n", "utf8");
      },
      cleanup() {
        rmSync(fixture, { force: true });
        rmSync(output, { force: true });
      },
      prompt: [
        "请把 `playground/.dsh/render-case.mmd` 里的 Mermaid 图渲染成 SVG，输出到 `playground/.dsh/render-case.svg`。",
        "如果当前环境缺少渲染器，请返回原始 Mermaid 并说明缺少什么，不要安装依赖。",
      ].join("\n"),
      verify({ calls }) {
        const renderCalls = calls.filter((call) => call.tool === "pstack_render");
        if (renderCalls.length === 0) return bad("没有调用 pstack_render");
        if (renderCalls.length > 1)
          return bad(`pstack_render 调用了 ${renderCalls.length} 次，期望一次成功`);
        const input = renderCalls[0].input ?? {};
        if (input.kind !== "pele")
          return bad(`pstack_render kind=${JSON.stringify(input.kind)}，期望 pele`);
        if (typeof input.input !== "string" || !input.input.includes("render-case.mmd"))
          return bad(`pstack_render input=${JSON.stringify(input.input)}，期望 render-case.mmd`);
        if (typeof input.output !== "string" || !input.output.includes("render-case.svg"))
          return bad(`pstack_render output=${JSON.stringify(input.output)}，期望 render-case.svg`);
        const text = resultText(renderCalls[0]);
        if (text.length === 0) return bad("pstack_render 没有返回结果说明");
        return ok(`pstack_render 一次处理 Mermaid 渲染请求：${text.slice(0, 200)}`);
      },
    };
  },
};
