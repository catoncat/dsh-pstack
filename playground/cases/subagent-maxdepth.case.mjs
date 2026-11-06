export default {
  id: "CASE-SUBAGENT-MAXDEPTH-01",
  title: "pstack_subagent 不会传入 maxDepth 0",
  build() {
    return {
      prompt: [
        "这是一次工具参数验证，不要解释。",
        "请必须调用一次 `pstack_subagent` 工具，派生一个 `general` 子代理，任务只返回 `ready`。",
        "该子代理不能再继续派生子代理；请按工具 schema 选择最合适的 `maxDepth` 值。",
        "其他参数按工具要求填写，`role`、`roleIndex`、`reasoningEffort`、`cwd` 如未使用请传 null。",
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
