# 阶段一 raw 验证 findings

本文逐技能记录 raw 上游技能在 DSH Web 真实会话中的观察、需要的 dsh.md 适配说明、需要的插件工具。判定口径：阶段一不判通过，失败即发现。证据在 `playground/.dsh/evidence/` 的 JSON 与截图，原始会话在 `playground/.dsh/sessions/`。结论经用户确认后按 `port/AGENTS.md` 流程回填 `port/audit.md` 与 `port/dsh.md`。

## 方法与环境

环境为 raw 模式：不装 dsh-pstack，用官方 `@deepseek-ai/dsh-skill-filesystem` 挂载 `upstream/cursor-plugins/pstack/skills`。主探针 magpie/workbuddy/minimax-m3.1-flash low。批次一（poteto-mode、how、tdd、unslop）运行时 approval 策略为 ask，自批次二起 home patch 固定为 never。默认技能根未关闭，宿主用户技能可见，skillLoads 可能出现非 pstack 技能，判定只看 pstack 名字。每用例独立工作区，run-case 以会话事件 cwd 校验落点。

## 横切发现

### X1 目录投递不触发技能加载

四个用例无一加载 pstack 技能（skillLoads 为空或仅宿主技能），但任务本身都按技能意图完成了。raw 环境里技能只是目录里的一张卡片，自然请求不会主动加载它。适配的主机制必须是根 preset 常驻指令与生成树里的适配读取提示，而不是指望目录匹配。阶段二要用 skill-loaded 与 preset-active 断言证明加载发生。

### X2 审批墙挂起无人值守会话

批次一的 how 用例在第 48 秒调用 plugin_manager 触发 approval/asked，无人应答，turn 挂到 900 秒超时。approval 策略只有 ask 与 never 两值，没有自动批准。自批次二起 home patch 将策略固定为 never，被门控的动作确定性拒绝，模型看到拒绝后继续，拒绝记入证据。

### X3 DSH bash 工具 schema 差异

unslop 用例首次 bash 调用因缺 description 参数报错， Cursor 的 Bash 没有这个必填字段，模型重试后恢复。dsh.md 的工具映射需要写明 bash 的 description 必填与语义，减少首轮工具错误。

## 逐技能 findings

### poteto-mode

- 会话 session-71aa73ec，raw，minimax low。
- observed：自然功能请求（记账应用月报表页）端到端完成，85 次工具调用零错误，turn completed，模型自己起浏览器验证了三种界面状态并写了 20 个测试。会话 preset 为 standard，poteto-mode 从未加载，模型改为加载宿主技能 agent-browser 做浏览器验证。
- neededAdapterNotes：dsh.md 需写明 poteto-mode 以根 preset 常驻系统提示投递，目录投递不触发；raw 观察到的「功能请求不加载 poteto-mode」即该条的证据。
- neededPluginTools：dsh-pstack/preset 根 preset 注册行（生成树已有），阶段二用 preset-active 断言。
- verdict：gap。

### how

- 会话 session-4224cde4（批次二重跑，never 策略），raw，minimax low。批次一 session 因 X2 挂起 900 秒超时，截图 evidence/how-raw-2026-11-10T04-51-47-914Z.png。
- observed：重跑完整完成，11 次调用，产出支付重试子系统的调用链、退避算法、状态存储与缺陷清单，并跑了真实探针验证时间线。首次 bash 缺 description 报错（X3）后恢复。how 未加载。never 策略下未再出现审批挂起，模型本轮没有调用 plugin_manager。
- neededAdapterNotes：X3 的 bash schema 映射；子系统探究类任务路由到 how 的触发指令；清点可选插件的步骤在 never 策略下会被拒绝，dsh.md 应给出不依赖审批的替代（读推荐插件页或 official-plugins 技能）。
- neededPluginTools：无新增。
- verdict：gap。

### architect

- 会话 session-4f265a51，raw，minimax low。
- observed：跨层新功能请求产出完整设计文档（分层依赖、关键类型、判别联合、不变量、待拍板清单），7 次调用零错误，未动实现代码，行为与 architect 意图一致。architect 未加载。
- neededAdapterNotes：设计先行类任务路由到 architect 的触发指令属于适配层；raw 不加载即证据。
- neededPluginTools：无。
- verdict：gap。

### tdd

- 会话 session-c34c5a5d，raw，minimax low。
- observed：模型按测试先行完成了满减 bug 的复现、修复与全绿（16 次调用零错误），但从未加载 tdd 技能。行为符合技能意图，加载缺失。
- neededAdapterNotes：缺陷修复路由到 tdd playbook 的触发指令属于适配层（preset 指令与生成树适配提示），dsh.md 需保留该映射；raw 不加载即证据。
- neededPluginTools：无。
- verdict：gap。

### unslop

- 会话 session-a8cca675-e0a7，raw，minimax low。
- observed：首次 bash 调用缺 description 报错（X3），重试后完成文案重写，4 次调用，turn completed，unslop 未加载。
- neededAdapterNotes：X3 的 bash schema 映射； prose 清理任务路由到 unslop 的触发指令。
- neededPluginTools：无。
- verdict：gap。
