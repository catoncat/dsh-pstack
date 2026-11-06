import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { bad, ok, resultText } from "./_shared.mjs";

const roleFile = join(process.cwd(), "playground/.dsh/pstack-models.mdc");
let previous;

function setupRoleFile(text) {
  mkdirSync(dirname(roleFile), { recursive: true });
  previous = existsSync(roleFile) ? readFileSync(roleFile, "utf8") : undefined;
  writeFileSync(roleFile, text, "utf8");
}

function restoreRoleFile() {
  if (previous === undefined) rmSync(roleFile, { force: true });
  else writeFileSync(roleFile, previous, "utf8");
}

export default {
  id: "CASE-PSTACK-SUBAGENT-PANEL-01",
  title: "pstack_subagent 自动面板启动多个子代理",
  build(routes) {
    const route = routes[0];
    const entry = `${route.provider}/${route.model}`;
    return {
      setup() {
        setupRoleFile(`arena runners: ${entry}, ${entry}\n`);
      },
      cleanup: restoreRoleFile,
      prompt: [
        "请使用 pstack 的 `arena runners` 角色做一次子代理调用，让它的自动面板启动两个普通的、非只读子代理，分别简单说明当前仓库的包导出配置。",
        "只发起一次子代理调用，不要拆成多次；只报告启动结果和每个子代理的路由。",
      ].join("\n"),
      verify({ calls }) {
        const subagentCalls = calls.filter((call) => call.tool === "pstack_subagent");
        if (subagentCalls.length === 0) return bad("没有调用 pstack_subagent");
        if (subagentCalls.length > 1)
          return bad(`pstack_subagent 调用了 ${subagentCalls.length} 次，期望一次成功`);
        const input = subagentCalls[0].input ?? {};
        if (input.role !== "arena runners")
          return bad(`pstack_subagent role=${JSON.stringify(input.role)}，期望 arena runners`);
        const text = resultText(subagentCalls[0]);
        if (!text.includes("started 2 children"))
          return bad(`自动面板没有启动两个子代理：${text.slice(0, 300)}`);
        const routeOccurrences = text.split(`route=${entry}`).length - 1;
        if (routeOccurrences < 2) return bad(`结果未报告两条 ${entry} 路由：${text.slice(0, 300)}`);
        return ok(`pstack_subagent 一次启动 arena runners 自动面板，两个子代理均使用 ${entry}`);
      },
    };
  },
};
