import { subagentPrompt, verifySubagent } from "./_shared.mjs";

export default {
  id: "CASE-ROLE-01",
  title: "角色路由解析 / 单角色委派",
  build(routes) {
    const a = routes[0];
    return {
      roleLines: [`bug-fix: ${a.label}`],
      prompt: subagentPrompt({ role: "bug-fix" }),
      verify({ calls }) {
        return verifySubagent(calls, {
          role: "bug-fix",
          expectChildren: 1,
          routeLabels: [a.label],
          forbid: [/has no line/],
        });
      },
    };
  },
};
