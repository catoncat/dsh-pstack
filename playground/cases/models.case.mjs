import { callFor, resultText, ok, bad } from "./_shared.mjs";

export default {
  id: "CASE-MODELS-01",
  title: "pstack_models 实时目录",
  build() {
    return {
      roleLines: [],
      prompt:
        "这是一次工具能力自检。请直接调用 pstack_models 工具一次，把 provider id 和每个 provider 下的 model 列出来。不要用其他工具、不要先解释。",
      verify({ calls }) {
        const call = callFor(calls, "pstack_models");
        if (!call) return bad("模型没有调用 pstack_models");
        if (call.result?.status !== "completed")
          return bad(`pstack_models 返回 ${call.result?.status ?? "无结果"}`);
        const text = resultText(call);
        if (text.trim().length < 10) return bad("pstack_models 返回为空");
        return ok(`返回 ${text.length} 字符`);
      },
    };
  },
};
