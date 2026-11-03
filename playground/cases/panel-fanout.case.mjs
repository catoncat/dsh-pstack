import { subagentPrompt, verifySubagent, distinctModelPair } from "./_shared.mjs";

export default {
  id: "CASE-PANEL-01",
  title: "自动 panel 扇出 · 路由互异",
  build(routes) {
    const pair = distinctModelPair(routes);
    if (!pair) return { skip: "允许清单里没有两条不同模型的路由，无法验证跨模型 panel" };
    const [a, b] = pair;
    return {
      roleLines: [`arena runners: ${a.label}, ${b.label}`],
      prompt: subagentPrompt({ role: "arena runners" }),
      verify({ calls }) {
        return verifySubagent(calls, {
          role: "arena runners",
          expectChildren: 2,
          routeLabels: [a.label, b.label],
          forbid: [/has one configured entry/, /resolve to the same route/],
        });
      },
    };
  },
};
