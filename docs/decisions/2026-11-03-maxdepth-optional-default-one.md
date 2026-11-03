# 决定：maxDepth 改为可选、默认 1，0 视为默认，消除“先传 0 再报错改 1”

Status: proposed
Date: 2026-11-03
Scope: src/subagent.ts, tests/subagent.test.ts, pstack/harness/**
Implemented-by: -
Review: 2027-05-03

## 背景

`pstack_subagent` 原先要求 `maxDepth` 必传整数。模型在没有合适默认值时习惯先写 `0`，而 `0` 在 pstack 里**永远无法创建子代理**：DSH 的 `resolveChildDepth` 用 `childDepth = parentDepth + 1` 判定，顶层父代理是 0，传入 `maxDepth: 0` 时 `1 > 0`，直接抛 `SubagentDepthError("subagent depth 1 exceeds maxDepth 0")`。调用失败后模型改成 `1` 重试，形成“先传 0 报错再改 1”的循环。

根因是语义误解加必传：子代理本身已是 depth 1，`0` 没有任何合法用途；“禁止孙代理”的最小值是 `1`，不是 `0`。把 `0` 设为合法值（nullable）只会放行这个必错值，无法阻止模型仍先选它。

## 决定

`maxDepth` 改为**可选**（从必传参数中移除）：省略、传 null、或传 `0` 都解析为安全默认 `1`——子代理存在，但不能继续委派。显式传 `2` 及以上（不超过 `pstack-subagent` 行配置上限，默认 2）可让子代理再委派一层；非整数或超过行上限仍在启动前报错。传 `0` 时在结果里给出一条诊断说明“子代理已是 depth 1，0 无法创建，已用 1”。

这样模型无需为 `maxDepth` 凭空猜整数，`0` 也不再导致一次失败重试。相适配：`pstack_subagent` 工具 schema、`src/subagent.ts` 的 `parseDelegationArgs` / `planDelegation`、`pstack/harness/docs/harness/dsh.md` 的 Subagent fields 行。

这条覆盖并取代同日 `2026-11-03-maxdepth-null-inherit.md`（已删除）中的“null 继承行上限、0 合法”设计；与 `2026-11-03-role-capability-query.md` 不冲突——那里拒绝的是给参数设隐式默认并配查询工具，这里是 `maxDepth` 这个必错值本身的问题。

## 备选方案

- **保持必传 + 传 0 直接报错。** 不选：正是当前“先 0 报错再改 1”的循环，把成本转成失败轮次。
- **nullable、null 继承行上限、0 合法。** 不选：0 仍然必错且模型仍会先选它，等于放行了错误值；实测仍出现重试。
- **彻底移除 maxDepth 参数，只由行配置控制。** 不选：失去“这次只允许直接子代理 / 这次允许再委派一层”的按调用控制，而该控制对视情况调整委派深度有用；默认 1 已覆盖最常见需求。

## 后果

- 首轮即成功：省略 `maxDepth` 得到 `1`，不再出现“0 报错再改 1”的循环。
- `0` 从“必错值”变为“按默认处理并给出诊断”，既不失败也不静默。
- 需要更深的委派时显式传 `2`（受行上限约束）；行配置 `maxDepth: 2` 仍是天花板。
- `comment-sicko` 的 preset 本就不挂子代理工具，默认 1 对它无影响。
