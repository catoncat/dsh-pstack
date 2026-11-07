# 术语表

本表固定代码、界面和文档中的核心概念。新增容易混淆的概念时补充定义，不复用已有术语表达另一种状态。

## Role（角色）

pstack 工作流中的委派职责，由 `src/role-manifest.ts` 的精确 key 标识。Role 决定子代理使用哪些模型路由以及路由如何展开；它不是 Agent preset，也不直接规定子代理的人格或工具集合。

## Route（路由）

一次子代理调用的模型选择，表示为以下两类之一：

- `route`：明确的 `provider/model`，可以带该模型公布的 reasoning effort。
- `inherit`：不向子代理传递模型覆盖，沿用父级路由；文件中的别名为 `inherit-parent` 或 `auto`。

角色文件中的 `routes: []` 是保存协议中的**删除该角色行**操作，不是一个继承路由。删除后角色处于未配置状态，委派时同样继承父级。

## Role shape 与 autoPanel

Role 的路由基数和展开方式：

- `single`：最多配置一条路由，不接受 `roleIndex`。
- `list`：配置多条路由。普通 list 通过 `roleIndex` 选择一条，缺省选择第一条。
- `autoPanel`：list 的特殊展开方式，一次调用为每条配置启动一个子代理，不接受 `roleIndex`。

`shape` 描述存储结构，`autoPanel` 描述是否自动展开，两者不可互相替代。

## Agent preset（Agent 预设）

the agent harness 对一类 Agent 的插件组合，包含人格、工具、沙箱及其他会话能力。根 preset 面向用户会话，子代理 preset 面向委派。`pstack_subagent` 的 `agent` 选择 preset 类别，`role` 选择模型路由，两者是正交配置。

## Generated tree（生成树）

由 `port/generate.mjs` 从固定上游和 `port/dsh.md` 整体生成的根 `pstack/` 目录，构建时复制到 `dist/pstack/`。

手工变更应落在生成来源、插件源码、测试或技能工作区。`port/audit.lock.json` 是上游能力审核的当前基线，不属于本仓工程决策记录目录。
