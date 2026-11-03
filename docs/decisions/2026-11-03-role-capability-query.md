# 决定：新增只读角色能力查询 pstack_roles，让派发前可查角色分类

Status: proposed
Date: 2026-11-03
Scope: src/**, tests/**, cordis.patch.yml, package.json, docs/**, README.md, README.zh.md
Implemented-by: -
Review: 2027-05-03

## 背景

`pstack_subagent` 去掉了所有隐式默认，调用方必须显式传 `roleIndex` 与 `maxDepth`。实际派发中反复出现两类误用：把 `roleIndex` 传给自动面板，或在单角色上传了不该传的序号；`maxDepth` 也常被写成不适合当前委派的值。这两类都不是漏传，而是传了错值。根因是「某个角色是否接受 `roleIndex`」只存在于 `src/internal/role-manifest.ts` 的 `shape` / `autoPanel` 与 `pstack/harness/docs/harness/dsh.md` 的文字说明里；模型在派发前没有可查询的事实，只能凭记忆或翻源码。

## 决定

新增只读工具 `pstack_roles`：`src/role-catalog.ts`，`cordis.patch.yml` 增加 `pstack-role-catalog` 行，`package.json` 增加 `./role-catalog` 出口。它直接读取 `ROLE_MANIFEST`，逐个返回 `role`、`shape`、`autoPanel`，以及派发所需的 `roleIndex` 适用性（`not-applicable` | `optional`）与展开方式说明；不读角色文件、不持策略。`pstack_subagent` 的 `roleIndex` 参数描述指向 `pstack_roles`，模型可在派发前先查该传什么。

本记录扩展 `docs/decisions/2026-10-28-pstack-plugin-tools.md` 的工具面，从四个工具增加到五个。

## 备选方案

- **只在 `pstack_subagent` 的工具描述里加一句使用示例。** 不选：它仍依赖模型在派发前记住并正确回忆角色分类，不能把分类变成可查询的事实；同一轮纠正后下一轮仍重复同类误用，说明记忆不够可靠。
- **给 `roleIndex` / `maxDepth` 设隐式默认。** 不选：违背此前「每个参数必须显式传递」的取舍，且默认值可能意外允许孙代理或选中错误条目；失去的显式控制比这几类误用更难发现。
- **在 `pstack_subagent` 内返回角色分类诊断。** 不选：诊断发生在调用之后，无法在派发前指导参数选择。

## 后果

- 模型在派发前能查到角色的 `shape` 与 `autoPanel`，`roleIndex` 误用从「靠记忆」变成「查事实」。
- 工具面从四个模型可见工具增加到五个；`pstack_roles` 与 `ROLE_MANIFEST` 同源，manifest 改动不会让查询漂移。
- `maxDepth` 仍没有按角色的查询：它不是角色属性，本次不覆盖；若同类误用持续，可另加派发参数指引或默认策略。
