// 用例共享助手。`*.case.mjs` 从这里导入，`import.meta.glob("./cases/*.case.mjs")` 不会匹配本文件。

export function callFor(calls, tool) {
  return calls.find((call) => call.tool === tool);
}

export function resultText(call) {
  return String(call?.result?.result ?? "");
}

export function ok(detail) {
  return { ok: true, detail };
}

export function bad(detail) {
  return { ok: false, detail };
}

export function firstLine(text) {
  const line = text.split("\n").find((l) => l.trim() !== "") ?? "";
  return line.length > 200 ? `${line.slice(0, 200)}…` : line;
}

export function subagentPrompt({ role, roleIndex = "null", reasoningEffort = "null" }) {
  return [
    "这是一次工具能力自检。请直接调用 pstack_subagent 工具本身，不要用 pstack_skill、不要用 /arena、不要先解释。",
    "参数如下：",
    '- description: "case probe"',
    '- prompt: "只回复 OK，不要调用任何工具。"',
    '- agent: "general"',
    `- role: "${role}"`,
    `- roleIndex: ${roleIndex}`,
    `- reasoningEffort: ${reasoningEffort}`,
    "- cwd: null",
    "- maxDepth: 1",
    "调用后把工具返回原样贴出来。",
  ].join("\n");
}

export function verifySubagent(
  calls,
  { role, expectChildren, routeLabels, forbid = [], extra = [] },
) {
  const call = callFor(calls, "pstack_subagent");
  if (!call) return bad("模型没有调用 pstack_subagent");
  if (call.input?.role !== role)
    return bad(`role 入参是 ${JSON.stringify(call.input?.role)}，期望 ${JSON.stringify(role)}`);
  if (call.result?.status !== "completed")
    return bad(`pstack_subagent 返回 ${call.result?.status ?? "无结果"}`);
  const text = resultText(call);
  const marker = `started ${expectChildren} ${expectChildren === 1 ? "child" : "children"}`;
  if (!text.includes(marker)) return bad(`未出现 "${marker}"：${firstLine(text)}`);
  for (const label of routeLabels) {
    if (!text.includes(label)) return bad(`返回里没有路由 "${label}"：${firstLine(text)}`);
  }
  for (const pattern of forbid) {
    if (pattern.test(text)) return bad(`出现不该有的诊断：${text.match(pattern)?.[0]}`);
  }
  for (const pattern of extra) {
    if (!pattern.test(text)) return bad(`缺少期望内容 ${pattern}：${firstLine(text)}`);
  }
  return ok(`${marker}；路由 ${routeLabels.join(" / ")}`);
}

export function distinctModelPair(routes) {
  const a = routes[0];
  const b = routes.find((r) => r.provider !== a.provider || r.model !== a.model);
  return b ? [a, b] : undefined;
}

export function modelWithTwoEfforts(routes) {
  const groups = new Map();
  for (const route of routes) {
    if (route.effort === undefined) continue;
    const key = `${route.provider}/${route.model}`;
    const list = groups.get(key) ?? [];
    list.push(route);
    groups.set(key, list);
  }
  for (const list of groups.values()) if (list.length >= 2) return list;
  return undefined;
}
