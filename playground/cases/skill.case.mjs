import { callFor, resultText, ok, bad } from "./_shared.mjs";

export default {
  id: "CASE-SKILL-01",
  title: "pstack_skill 加载隐藏技能",
  build() {
    return {
      roleLines: [],
      prompt:
        '这是一次工具能力自检。请直接调用 pstack_skill 工具一次，name 传 "poteto-mode"，不要传 resource。把返回内容前 5 行贴出来。不要用其他工具、不要先解释。',
      verify({ calls }) {
        const call = callFor(calls, "pstack_skill");
        if (!call) return bad("模型没有调用 pstack_skill");
        if (call.input?.name !== "poteto-mode")
          return bad(`name 入参是 ${JSON.stringify(call.input?.name)}`);
        if (call.result?.status !== "completed")
          return bad(`pstack_skill 返回 ${call.result?.status ?? "无结果"}`);
        const text = resultText(call);
        if (text.trim().length < 50) return bad("加载内容过短，可能不是 SKILL.md");
        return ok(`加载 ${text.length} 字符`);
      },
    };
  },
};
