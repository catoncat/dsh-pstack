export default {
  id: "CASE-SUBAGENT-MAXDEPTH-01",
  title: "普通任务派发时 pstack_subagent 的 maxDepth 参数",
  build() {
    return {
      prompt: [
        "请用 pstack 的普通子代理（不要使用只读代理）完成这个任务：读取 playground/README.md，并用一句话总结其中的准备步骤。",
        "必须由子代理完成，不要自己阅读；拿到子代理结果后再给我最终回答。",
      ].join("\n"),
      verify({ calls }) {
        const subagentCalls = calls.filter((call) => call.tool === "pstack_subagent");
        if (subagentCalls.length === 0) {
          return { ok: false, detail: "模型没有调用 pstack_subagent" };
        }
        if (subagentCalls.length > 1) {
          return {
            ok: false,
            detail: `pstack_subagent 调用了 ${subagentCalls.length} 次，期望一次成功`,
          };
        }
        const input = subagentCalls[0].input ?? {};
        if (input.agent !== "general") {
          return {
            ok: false,
            detail: `pstack_subagent agent=${JSON.stringify(input.agent)}，期望 general`,
          };
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
