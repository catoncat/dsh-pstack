import {
  callFor,
  resultText,
  ok,
  bad,
  firstLine,
  subagentPrompt,
  modelWithTwoEfforts,
} from "./_shared.mjs";

export default {
  id: "CASE-EFFORT-01",
  title: "reasoningEffort 覆盖角色起点",
  build(routes) {
    const group = modelWithTwoEfforts(routes);
    if (!group) return { skip: "允许清单里没有一条同时声明两个思考等级的模型" };
    const low = group[0];
    const high = group[group.length - 1];
    return {
      roleLines: [`bug-fix: ${low.label}`],
      prompt: subagentPrompt({ role: "bug-fix", reasoningEffort: high.effort }),
      verify({ calls }) {
        const call = callFor(calls, "pstack_subagent");
        if (!call) return bad("模型没有调用 pstack_subagent");
        if (call.input?.reasoningEffort !== high.effort)
          return bad(
            `reasoningEffort 入参是 ${JSON.stringify(call.input?.reasoningEffort)}，期望 ${JSON.stringify(high.effort)}`,
          );
        const text = resultText(call);
        if (!text.includes("started 1 child")) return bad(`未起 1 个 child：${firstLine(text)}`);
        if (!text.includes(`effort=${high.effort}`))
          return bad(`child 未按覆盖后的 effort 运行：${firstLine(text)}`);
        if (!/overrides the effort/.test(text)) return bad("缺少覆盖诊断");
        return ok(`child effort=${high.effort}，并有覆盖诊断`);
      },
    };
  },
};
