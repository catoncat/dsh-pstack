export default {
  id: "CASE-SUBAGENT-MAXDEPTH-01",
  title: "普通任务派发时 pstack_subagent 的 maxDepth 参数",
  build() {
    return {
      prompt: [
        "请先用 pstack_subagent 派生一个 general 子代理，让它读取 playground/README.md 并只用一句话总结其中的准备步骤。",
        "必须通过子代理完成，不要直接回答；拿到子代理结果后再给我最终回答。",
      ].join("\n"),
      verify({ calls }) {
        const subagentCalls = calls.filter((call) => call.tool === "pstack_subagent");
        if (subagentCalls.length === 0) {
          return { ok: false, detail: "模型没有调用 pstack_subagent" };
        }
        const zeroCalls = subagentCalls.filter((call) => call.input?.maxDepth === 0);
        if (zeroCalls.length > 0) {
          return {
            ok: false,
            detail: `检测到 ${zeroCalls.length} 次 maxDepth:0 调用：${JSON.stringify(zeroCalls.map((call) => call.input))}`,
          };
        }
        return {
          ok: true,
          detail: `调用 ${subagentCalls.length} 次，未出现 maxDepth:0；参数：${JSON.stringify(subagentCalls.map((call) => call.input))}`,
        };
      },
    };
  },
};
