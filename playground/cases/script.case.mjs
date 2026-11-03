import { callFor, resultText, ok, bad, firstLine } from "./_shared.mjs";

export default {
  id: "CASE-SCRIPT-01",
  title: "pstack_script 跑随包脚本",
  build() {
    return {
      roleLines: [],
      prompt:
        '这是一次工具能力自检。请直接调用 pstack_script 工具一次，id 传 "statechart"，args 传 ["--help"]，background 传 false。把返回的 exitCode 和输出前几行贴出来。不要用其他工具、不要先解释。',
      verify({ calls }) {
        const call = callFor(calls, "pstack_script");
        if (!call) return bad("模型没有调用 pstack_script");
        if (call.input?.id !== "statechart")
          return bad(`id 入参是 ${JSON.stringify(call.input?.id)}`);
        if (call.result?.status !== "completed")
          return bad(`pstack_script 返回 ${call.result?.status ?? "无结果"}`);
        const text = resultText(call);
        if (!text.includes("Usage: statechart"))
          return bad(`输出里没有 statechart usage：${firstLine(text)}`);
        return ok("statechart --help 正常返回");
      },
    };
  },
};
