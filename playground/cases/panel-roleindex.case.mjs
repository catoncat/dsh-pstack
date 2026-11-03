import { subagentPrompt, verifySubagent, distinctModelPair } from "./_shared.mjs";

export default {
  id: "CASE-PANEL-02",
  title: "列表角色 roleIndex 选择（非 panel）",
  build(routes) {
    const pair = distinctModelPair(routes);
    if (!pair) return { skip: "允许清单里没有两条不同模型的路由" };
    const [a, b] = pair;
    return {
      roleLines: [`swarm workers: ${a.label}, ${b.label}`],
      prompt: subagentPrompt({ role: "swarm workers", roleIndex: "1" }),
      verify({ calls }) {
        return verifySubagent(calls, {
          role: "swarm workers",
          expectChildren: 1,
          routeLabels: [b.label],
          extra: [/entry 2 was selected/],
        });
      },
    };
  },
};
