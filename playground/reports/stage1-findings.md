# 阶段一 raw 验证 findings

本文逐技能记录 raw 上游技能在 DSH Web 真实会话中的观察、需要的 dsh.md 适配说明、需要的插件工具。判定口径：阶段一不判通过，失败即发现。证据在 `playground/.workers/w<k>/evidence/` 的 JSON 与截图，原始会话在对应 worker 的 `home/sessions/`。结论经用户确认后按 `port/AGENTS.md` 流程回填 `port/audit.md` 与 `port/dsh.md`。

## 方法与环境

环境为 raw 模式：不装 dsh-pstack，用官方 `@deepseek-ai/dsh-skill-filesystem` 挂载 `upstream/cursor-plugins/pstack/skills`。主探针 magpie/workbuddy/minimax-m3.1-flash low。approval 策略固定 never。默认技能根未关闭，宿主用户技能可见，skillLoads 可能包含宿主技能名称。

全量批次为 4 worker 并行、动态端口、短探针（principle-light 120 秒、behavior 300 秒），58 个用例全部取到证据，typescript-best-practices 因首轮漏跑而单独补齐。早批次的完整运行记录（单实例、完整等待）保留在 `.dsh` 证据里，本轮的逐技能观察见下文。

两点读表约定。skillLoads 表示「发起了加载请求」，是否成功要结合 toolCalls 里的 skill 错误判断，本文表格的「加载请求」列只列请求名。本轮有 29 个用例被重复执行两次，原因是 run-case 子进程在写工作区文件时被再次触发，证据按 capturedAt 取最新，不影响结论，但阶段二前必须修掉 run-batch 的子进程重入。

## 横切发现

### X1 57 个技能声明 disable-model-invocation，标准 skill 工具无法加载

上游 58 个技能里 57 个在 frontmatter 写了 `disable-model-invocation: true`，唯一例外是 setup-pstack。raw 环境没有 pstack_skill，模型改用标准 skill 工具加载，全部被拒并报错，随后多数模型退回用 read 或 bash 直接读 SKILL.md 正文，任务看起来照样完成。这就是「技能未加载但行为正确」的真正原因，不是模型没选，而是工具层拒绝。适配必须提供 pstack_skill 并在 dsh.md 写明，pstack 技能只能经 pstack_skill 或直接读文件访问，标准 skill 工具会失败。阶段二用 skill-loaded 与 preset-active 断言证明加载发生。

### X2 审批墙挂起无人值守会话

早期 how 用例调用 plugin_manager 触发 approval/asked，无人应答，turn 挂到超时。approval 只有 ask 与 never 两值。已固定 never，被门控的动作确定性拒绝，模型看到拒绝继续。

### X3 DSH bash 工具要求 description 必填

大量用例首轮 bash 调用因缺 description 报错后重试（architect、arena、benchmark-checklist、swarm、principle-exhaust-the-design-space、principle-explain-the-number 等）。Cursor 的 Bash 没有该必填字段。dsh.md 的工具映射必须写明 bash 的 description 必填与语义，减少首轮工具错误。

### X4 skill 工具拒绝 disable-model-invocation 技能

`skill` 工具对上游 pstack 技能报 `Error: skill "in-your-own-words" is not available for model invocation`，同样出现在 principle-fix-root-causes、principle-guard-the-context-window、teach、principle-foundational-thinking、principle-migrate-callers-then-delete-legacy-apis、principle-separate-before-serializing-shared-state 等。上游 pstack 技能大多标了 `disable-model-invocation: true`，raw 挂载下模型只能看到目录却无法用内置 skill 工具加载，这是「技能几乎不被加载」的主因之一。X1 给出总体统计，本条给出工具层的逐技能错误样本。适配必须提供 pstack_skill 工具并写明用法。

### X5 无人值守下 ask_user_question 必然被中止

`ask_user_question` 在无人值守会话报 `Error: ask_user_question was aborted before the user answered`，出现在 principle-outcome-oriented-execution、make-bot-ui。依赖向用户提问的技能在无人值守会话拿不到回答。dsh.md 需说明这类技能要改走可自主决策路径，或标注需要操作者在场。

### X6 无角色路由与模型目录

interrogate 的 list_subagent_models 报 `Only the parent route is available for children`，只能用一个父路由跑所有审查者。arena 与 swarm 只能用标准 subagent 做基础 fan-out，无法给每个 runner 或 worker 指定角色与 effort。这正是 pstack_subagent 与 pstack_models 要补的能力。

### X7 渲染与平台能力走 dsh.md 的本地替代

ketchup-video 尝试生成视频脚本时 edit 报错，DSH 无视频渲染，按 dsh.md 用文本摘要替代。statechart 用 Mermaid 文本输出状态图。make-bot-ui 的 routine、sender key、wake loop 属 Cursor Automations，DSH 无对应服务，按 Cursor-only 舍弃。这些已在 dsh.md 的 Local replacements 与 Cursor-only 表覆盖，属已映射而非缺口。

## 逐技能观察

按技能名字母序排列，共 58 条。truncated=true 的条目为短探针窗口内观察，未跑完整。

### architect

- 会话 session-9c0e0253-e55c-4aaf-9a1e-0e0ecb54f149（w0），raw，minimax low。
- observed：turnEnd=completed，未截断，13 次调用，工具错误 bash，样本 Error: invalid arguments: missing required property "description"。说设计稿已写到 docs/offline-draft-sync-design.md，没有实现代码，把三个 stub 模块扩成五层，storage 不认识网络、net 不认识草稿模型、ui 只通过 engine 说话。
- neededAdapterNotes：dsh.md 需把「跨层新功能、要求先定类型与边界再写码」路由到 architect 的触发指令；raw 不加载即证据。
- neededPluginTools：无
- verdict：gap

### arena

- 会话 session-00717f25-759a-463b-a46d-7ddd69682437（w1），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，15 次调用，工具错误 bash，样本 Error: tool call aborted。说已读现状，正在并行拉起若干独立设计方案并等四个候选，同时在看模块该放哪。
- neededAdapterNotes：dsh.md 需把「无先例的接口或视觉、要多个候选再选底嫁接」路由到 arena；Cursor Task 到 DSH 委派的映射要写明，候选多模型要靠 pstack_subagent。
- neededPluginTools：pstack_subagent（arena runners 需要每 runner 独立模型与 effort）
- verdict：gap

### automate-me

- 会话 session-13b5d042-571c-41e7-8c42-8bb94b9f03ed（w2），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，30 次调用，工具错误 bash，样本 Error: tool call aborted。无最后一段话（窗口在产出前截断）。
- neededAdapterNotes：dsh.md 需把「把我的工作习惯固化成可复用个人技能」映射到 automate-me，并说明它依赖 create-skill，raw 下模型会用宿主 writing-for-agents。
- neededPluginTools：无
- verdict：gap

### benchmark-checklist

- 会话 session-311f598d-e508-49fa-b970-aa1526b14f76（w3），raw，minimax low。
- observed：turnEnd=completed，未截断，16 次调用，工具错误 bash，样本 Error: invalid arguments: missing required property "description"。说这个「快 3 倍」不能这么报，脚本没有改前基线，实测 0.0 到 0.1ms 与记录的约 400ms 差三个数量级。
- neededAdapterNotes：dsh.md 需把「把自测加速比写进 PR」前置触发 benchmark-checklist；并写明 X3 的 bash description 必填。
- neededPluginTools：无
- verdict：gap

### blast-radius

- 会话 session-c9a41377-5f60-4639-8ccc-0fb2188874ed（w0），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，35 次调用，无工具错误。说正在对真实源码构建可运行证明，并用精确参考实现做严谨对比。
- neededAdapterNotes：dsh.md 需把「小 diff 怕波及、要可运行证明」路由到 blast-radius；并说明证明要用真实源码跑，不能只靠推断。
- neededPluginTools：无
- verdict：gap

### bro

- 会话 session-5cc9cf90-3823-47b9-8cee-088d5421bb92（w1），raw，minimax low。
- observed：turnEnd=completed，未截断，0 次调用，无工具错误。直接给大白话版，说本季度不砸钱拉新，改成把老用户伺候好、跨部门资源合用。
- neededAdapterNotes：dsh.md 需把「把行话换成大白话重讲」映射到 bro。纯文本任务，raw 直接可完成，没有加载缺口。
- neededPluginTools：无
- verdict：clean

### correct

- 会话 session-de4c2e43-8fb2-49b8-8f7f-4b2115077ff1（w2），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，28 次调用，无工具错误。无最后一段话（窗口在产出前截断）。
- neededAdapterNotes：dsh.md 需把「同类错误反复出现、要仓库层面根除」路由到 correct；说明要把规则用 lint 或 hook 结构固化，而不是加文字。
- neededPluginTools：无
- verdict：gap

### create-formal-verification-skill

- 会话 session-03029baa-c27d-42e7-87bb-0b1c6d21e37e（w3），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，19 次调用，无工具错误。无最后一段话（窗口在产出前截断）。
- neededAdapterNotes：dsh.md 需把「并发竞态要生成形式化验证技能」映射到 create-formal-verification-skill，并记录 create-skill 到 writing-for-agents 的映射。
- neededPluginTools：无
- verdict：gap

### create-verification-skill

- 会话 session-1835c968-249b-4ca4-9d47-d85468c3f447（w0），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，41 次调用，无工具错误。说先探索 taskboard 仓库、理解上游技能形状，规划并构建项目本地验证技能，正在写 helper 脚本与 SKILL.md。
- neededAdapterNotes：dsh.md 需记录 create-skill 到 writing-for-agents 的映射，并把「缺少脚本化驱动应用证明行为」映射到 create-verification-skill。
- neededPluginTools：无
- verdict：gap

### figure-it-out

- 会话 session-0e08eac5-5dba-457c-b10c-067d7b814a3c（w1），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，33 次调用，无工具错误。说已看清仓库，发现 packages/ui 依赖 @mono/core 的 workspace 协议 npm 解析不了、webpack 用了没装的 ts-loader，两者都成为工作单元。
- neededAdapterNotes：dsh.md 需说明 figure-it-out 的 bespoke playbook 在 DSH 的落地形态；触发依赖描述匹配不稳，需适配提示强化，避免 raw 下不加载就直接跑整场迁移。
- neededPluginTools：无
- verdict：gap

### how

- 会话 session-e80d3900-a105-4500-9c87-5eb50edfc5a1（w2），raw，minimax low。
- observed：turnEnd=completed，未截断，14 次调用，无工具错误。说读完三个模块并用临时探针实测时间线，给出 payments、retry、ledger 的分工与重试触发链路。
- neededAdapterNotes：dsh.md 需把「改代码前先搞懂子系统运行流程」路由到 how；bash description 必填（X3）。
- neededPluginTools：无
- verdict：gap

### in-your-own-words

- 会话 session-995288df-8550-40fb-b5f4-7d295e5265b0（w3），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，40 次调用，工具错误 skill，样本 Error: skill "in-your-own-words" is not available for model invocation。无最后一段话（窗口在产出前截断）。
- neededAdapterNotes：dsh.md 必须提供 pstack_skill 才能加载该 disable-model-invocation 技能；把「动手前先复述目标与问题」映射到它。
- neededPluginTools：pstack_skill（加载该技能本体）
- verdict：gap

### interrogate

- 会话 session-25e3e9f7-5135-4560-860b-1a4a689ba485（w0），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，47 次调用，工具错误 list_subagent_models, subagent, bash，样本 Error: child LLM route "magpie/magpie/workbuddy/minimax-m3.1-flash" is not allowed for this Session。说只有父路由可用，所有 adversary 只能用父模型，正在搭审查范围和每 adversary 沙箱。
- neededAdapterNotes：dsh.md 需把「多模型对抗审查 diff、findings 必须可复现」路由到 interrogate；多审查者要不同模型族角度，标准 subagent 只给基础 fan-out，跨模型多样性要靠 pstack_subagent 的 role 路由。
- neededPluginTools：pstack_subagent（interrogate reviewers 角色池，每 reviewer 独立路由）
- verdict：gap

### ketchup

- 会话 session-618e16a9-8b10-4de2-bfa4-db6979da7d20（w2），raw，minimax low。
- observed：turnEnd=completed，未截断，31 次调用，无工具错误。说看不到上一条消息，按仓库痕迹反推自上次到现在的变化，复述 58 技能浏览器验证项目的进展。
- neededAdapterNotes：dsh.md 需把「讲清自上次发言以来的变化并列出待决定事项」映射到 ketchup；说明无上一条消息时按仓库痕迹反推。
- neededPluginTools：无
- verdict：gap

### ketchup-video

- 会话 session-9ab7178b-6749-4e2d-9a87-a38cf2fb7f27（w1），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，29 次调用，工具错误 edit，样本 Error: tool call aborted before dispatch。说接下来构建视频并写渲染脚本。
- neededAdapterNotes：dsh.md 需说明 DSH 无视频渲染（X7），ketchup-video 按文本摘要替代，不要把缺渲染器当成技能缺陷。
- neededPluginTools：无
- verdict：blocked

### maintain-formal-verification-skill

- 会话 session-959295a3-a6f8-47b1-a17c-bb8770680936（w3），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，30 次调用，无工具错误。说旧 spec 根本解析不了，反斜杠加斜杠在 TLA+ 是析取不是集合并，旧 spec 从未真正可运行。
- neededAdapterNotes：dsh.md 需记录 create-skill 到 writing-for-agents 的映射，并把「代码变更后形式化验证没重跑、要判断漂移还是 bug」映射到该技能。
- neededPluginTools：无
- verdict：gap

### maintain-verification-skill

- 会话 session-4cccce17-bfeb-4ee6-9a7a-5e532de2a146（w0），raw，minimax low。
- observed：turnEnd=completed，未截断，40 次调用，无工具错误。说找到 taskboard 验证技能、验证隔离副本方案，发现应用漂移（done 成功不打印、无 no such task 提示），据此重写技能。
- neededAdapterNotes：dsh.md 需记录 create-skill 到 writing-for-agents 的映射，并把「验证技能与功能地图要跟改过的应用对齐审计」映射到该技能。
- neededPluginTools：无
- verdict：gap

### make-bot-ui

- 会话 session-9ca7eba3-392a-4d69-84a2-030ecdc33186（w1），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，12 次调用，工具错误 ask_user_question，样本 Error: ask_user_question was aborted before the user answered。说看工作区找 Grok Bot，找到 repo 技能 make-bot-ui，准备加载并查 DSH 有没有唤醒 bot 的能力（没有 Cursor routines）。
- neededAdapterNotes：dsh.md 需说明无人值守下 ask_user_question 必中止（X5），依赖提问的技能要改走自主决策或标注需要操作者在场；routine 与 webhook 属 Cursor-only（X7）。
- neededPluginTools：无
- verdict：blocked

### no-comments

- 会话 session-ee7af008-a255-4d8f-ba0e-08614b61b99f（w2），raw，minimax low。
- observed：turnEnd=completed，未截断，8 次调用，无工具错误。说只有 src/report.ts 属本次改动，删掉复读型注释，保留解释 why 的 toFixed 注释，代码逻辑没动。
- neededAdapterNotes：dsh.md 需把「提交前清理复读注释、只留解释 why」映射到 no-comments。纯文本任务，raw 直接可完成。
- neededPluginTools：无
- verdict：gap

### poteto-help

- 会话 session-dc066840-d9fe-4d3e-96e7-29b8d8a87055（w3），raw，minimax low。
- observed：turnEnd=completed，未截断，15 次调用，无工具错误。说看完 pstack 技能清单和 DSH 适配文档，建议审查 PR 用 interrogate，并区分 blast-radius 与 babysit。
- neededAdapterNotes：dsh.md 需把「问该选哪个技能、如何上手 pstack」映射到 poteto-help，其答案要靠 pstack 技能清单与 dsh.md 适配文档。
- neededPluginTools：无
- verdict：clean

### poteto-mode

- 会话 session-21d802ee-c632-4c26-a0ad-7dacb6ed0576（w0），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，55 次调用，无工具错误。说先看应用怎么跑再设计功能，应用是 stub，随后写代码、16 个测试通过、起 Chrome 无沙箱验证浏览器。
- neededAdapterNotes：dsh.md 需写明 poteto-mode 以根 preset 常驻系统提示投递，目录投递不触发；raw 观察到的「功能请求不加载 poteto-mode」即该条证据；preset 内要有路由指令。
- neededPluginTools：dsh-pstack/preset 根 preset 注册行（生成树已有），阶段二用 preset-active 断言
- verdict：gap

### principle-attack-the-premise

- 会话 session-9a210c63-f552-4b1d-8a4c-d7448595fbc8（w1），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，29 次调用，无工具错误。无最后一段话（窗口在产出前截断）。
- neededAdapterNotes：dsh.md 需说明应用某原则前先用 pstack_skill 完整读其叶子（X4）；把「多个修复共享同一前提」映射到该叶子。
- neededPluginTools：pstack_skill（应用前读到叶子）
- verdict：gap

### principle-boundary-discipline

- 会话 session-c3c09d64-1814-49ce-82fb-7c6450797464（w2），raw，minimax low。
- observed：turnEnd=completed，未截断，13 次调用，无工具错误。说加一层物流接口边界适配，parseShippingUpdate 收 unknown、永不抛异常，在多个候选键和嵌套结构里找状态。
- neededAdapterNotes：dsh.md 需说明应用某原则前先用 pstack_skill 读其叶子（X4）；把「接外部接口时边界解析校验、核心保持纯函数」映射到该叶子。
- neededPluginTools：pstack_skill（应用前读到叶子）
- verdict：gap

### principle-build-the-lever

- 会话 session-d0fdcb2a-f4d1-44e5-90ad-3a87415fcc68（w3），raw，minimax low。
- observed：turnEnd=completed，未截断，21 次调用，无工具错误。说实际只有两个组件不是 41 个，按技能先手改一个再写可复跑 codemod，在 Button 上跑并对照已手改的 Card 验证。
- neededAdapterNotes：dsh.md 需说明应用某原则前先用 pstack_skill 读其叶子（X4）；把「可单脚本跑完的批量编辑」映射到先建 codemod 的提示。
- neededPluginTools：pstack_skill（应用前读到叶子）
- verdict：gap

### principle-encode-lessons-in-structure

- 会话 session-81217226-735c-4865-9b4e-a944c19a69ae（w0），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，19 次调用，无工具错误。无最后一段话（窗口在产出前截断）。
- neededAdapterNotes：dsh.md 需说明应用某原则前先用 pstack_skill 读其叶子（X4）；把「同一指令重复书写仍不生效」映射到编码成 lint 或 hook 的提示。
- neededPluginTools：pstack_skill（应用前读到叶子）
- verdict：gap

### principle-exhaust-the-design-space

- 会话 session-e7260b9c-4624-4ca6-bfb7-679bee1abd18（w1），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，24 次调用，工具错误 bash，样本 Error: invalid arguments: missing required property "description"。无最后一段话（窗口在产出前截断）。
- neededAdapterNotes：dsh.md 需说明应用某原则前先用 pstack_skill 读其叶子（X4）；把「无先例新交互」映射到先做 2 到 3 个可对比原型；bash description 必填。
- neededPluginTools：pstack_skill（应用前读到叶子）
- verdict：gap

### principle-experience-first

- 会话 session-da4a6074-7baf-4b29-939c-73dc4ed423a2（w2），raw，minimax low。
- observed：turnEnd=completed，未截断，14 次调用，工具错误 read, bash，样本 Error: cannot read "/home/leihaohao/workspace/dsh-pstack/playground/.workers/w2/workspace/principle-experience-first/docs/decisions/AGENTS.md": not found。说读了这个原则后直接判定方案不行，堆十个开关不是用户需求，砍选项才是最省时间的做法。
- neededAdapterNotes：dsh.md 需说明应用某原则前先用 pstack_skill 读其叶子（X4）；把「功能范围取舍以体验为准、每个选项要能被证明」映射到该叶子。
- neededPluginTools：pstack_skill（应用前读到叶子）
- verdict：gap

### principle-explain-the-number

- 会话 session-d3ce8e9f-1a8b-4472-b698-8e31dbb2bf5e（w3），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，25 次调用，工具错误 bash，样本 Error: invalid arguments: missing required property "description"。无最后一段话（窗口在产出前截断）。
- neededAdapterNotes：dsh.md 需说明应用某原则前先用 pstack_skill 读其叶子（X4）；把「把加速比写进发布说明前先说明限制」映射到该叶子；bash description 必填。
- neededPluginTools：pstack_skill（应用前读到叶子）
- verdict：gap

### principle-fix-root-causes

- 会话 session-799f7f20-454a-49b6-8440-1c19b3a4c79f（w0），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，20 次调用，工具错误 skill，样本 Error: skill "principle-fix-root-causes" is not available for model invocation。说工作区只有 src/save.ts，DraftStore 定义和 byId 填充点不在，第一步是找出谁把 draft 放进 byId，if not draft return 是症状修复。
- neededAdapterNotes：dsh.md 必须提供 pstack_skill 加载该叶子（本地 skill 工具报 not available）；把「在报错处加判空压症状」映射到回溯根因的提示。
- neededPluginTools：pstack_skill（加载该叶子）
- verdict：gap

### principle-foundational-thinking

- 会话 session-d63c8003-0514-49aa-a594-496ba03af2e5（w1），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，21 次调用，工具错误 read, skill，样本 Error: cannot read "/home/leihaohao/workspace/dsh-pstack/playground/.workers/w1/workspace/principle-foundational-thinking/docs/architecture.md": not found。无最后一段话（窗口在产出前截断）。
- neededAdapterNotes：dsh.md 必须提供 pstack_skill 加载该叶子（本地 skill 工具报 not available）；把「写逻辑前先定核心类型与数据结构」映射到该叶子。
- neededPluginTools：pstack_skill（加载该叶子）
- verdict：gap

### principle-guard-the-context-window

- 会话 session-c51feb07-1b2c-4e15-8c9b-c25d84dbfe52（w2），raw，minimax low。
- observed：turnEnd=completed，未截断，24 次调用，工具错误 skill, job_output，样本 Error: skill "principle-guard-the-context-window" is not available for model invocation。说该技能是 harness-loaded，按它把批量读取分派给子代理，结论是日志目录只有 access-001.log 两行，README 说的三十个文件是假的。
- neededAdapterNotes：dsh.md 需提供 pstack_skill 加载该叶子，把「大量原始输入撑爆上下文」映射到分派子代理、主线留摘要，并说明叶子是 harness-loaded。
- neededPluginTools：pstack_skill（加载该叶子）
- verdict：gap

### principle-laziness-protocol

- 会话 session-a1ac2167-f95d-4392-9c4d-f7b8f9b23a68（w3），raw，minimax low。
- observed：turnEnd=completed，未截断，5 次调用，无工具错误。说三个文件调用点已是固定规格，结论是不用抽 service 层但参数该改，service 只把位置参数后移一层。
- neededAdapterNotes：dsh.md 需说明应用某原则前先用 pstack_skill 读其叶子（X4）；把「重构加抽象诱惑」映射到取最小改动、不新增转发包装的提示。
- neededPluginTools：pstack_skill（应用前读到叶子）
- verdict：gap

### principle-make-operations-idempotent

- 会话 session-7b9d0c1b-f65e-487e-b4a4-b027261b069c（w0），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，24 次调用，工具错误 bash，样本 Error: tool call aborted。说接下来重测，包括跑到一半坏掉再重跑的用例。
- neededAdapterNotes：dsh.md 需说明应用某原则前先用 pstack_skill 读其叶子（X4）；把「部署脚本在崩溃重试中运行」映射到每步收敛同一终态、可安全重跑。
- neededPluginTools：pstack_skill（应用前读到叶子）
- verdict：gap

### principle-migrate-callers-then-delete-legacy-apis

- 会话 session-48eaf75d-7bf3-4477-a71b-829e749f26ba（w1），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，25 次调用，工具错误 skill，样本 Error: skill "principle-migrate-callers-then-delete-legacy-apis" is not available for model invocation。无最后一段话（窗口在产出前截断）。
- neededAdapterNotes：dsh.md 必须提供 pstack_skill 加载该叶子（本地 skill 工具报 not available）；把「无外部兼容需求时迁完调用方并删旧 API」映射到同一波完成。
- neededPluginTools：pstack_skill（加载该叶子）
- verdict：gap

### principle-minimize-reader-load

- 会话 session-b4c227ce-7c62-4cb7-a085-cda88c5584e1（w2），raw，minimax low。
- observed：turnEnd=completed，未截断，6 次调用，无工具错误。说问题在 checkout.ts 为凑调用链层层包装，wrapWithTaxAgain 零信息量、lastTotal 只写不读，改成两行。
- neededAdapterNotes：dsh.md 需说明应用某原则前先用 pstack_skill 读其叶子（X4）；把「代码难追踪按层数与隐藏状态判断」映射到折叠单调用包装、缩小可变状态。
- neededPluginTools：pstack_skill（应用前读到叶子）
- verdict：gap

### principle-model-the-domain

- 会话 session-a0e95683-077e-4869-b4cd-055100b5d9b2（w3），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，12 次调用，无工具错误。无最后一段话（窗口在产出前截断）。
- neededAdapterNotes：dsh.md 需说明应用某原则前先用 pstack_skill 读其叶子（X4）；把「状态散在条件分支再新增状态」映射到状态机或可辨识联合。
- neededPluginTools：pstack_skill（应用前读到叶子）
- verdict：gap

### principle-never-block-on-the-human

- 会话 session-75e86cd4-3a75-4df9-a615-ac147aba693a（w0），raw，minimax low。
- observed：turnEnd=completed，未截断，13 次调用，无工具错误。说把 tests 下 .spec.ts 统一成 .test.ts，依据 vite 配置 include 只匹配 .test，全仓已无 .spec 文件。
- neededAdapterNotes：dsh.md 需说明应用某原则前先用 pstack_skill 读其叶子（X4）；把「可回退且已授权的改动」映射到直接选定执行并汇报，不停下发问（与 X5 一致）。
- neededPluginTools：pstack_skill（应用前读到叶子）
- verdict：gap

### principle-outcome-oriented-execution

- 会话 session-5e5722c4-4c9d-4fb9-ab55-b6293fc7de0a（w1），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，14 次调用，工具错误 ask_user_question，样本 Error: ask_user_question was aborted before the user answered。无最后一段话（窗口在产出前截断）。
- neededAdapterNotes：dsh.md 需说明无人值守下 ask_user_question 必中止（X5）；该叶子的迁移场景要自主决策、允许计划内过渡破坏，不保留长期兼容层。
- neededPluginTools：pstack_skill（应用前读到叶子）
- verdict：blocked

### principle-prove-it-works

- 会话 session-dfa39ff4-5037-478a-a700-763a70f80a3b（w2），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，20 次调用，无工具错误。说接下来看 CSV 导出问题。
- neededAdapterNotes：dsh.md 需说明应用某原则前先用 pstack_skill 读其叶子（X4）；把「完成后要对真实产物验证」映射到实际跑产物读文件确认，不凭编译通过。
- neededPluginTools：pstack_skill（应用前读到叶子）
- verdict：gap

### principle-redesign-from-first-principles

- 会话 session-1e76e040-28a9-4447-80b8-34d02f9f856b（w3），raw，minimax low。
- observed：turnEnd=completed，未截断，25 次调用，无工具错误。说旁加 currency 字段在类型层防不住错误，按能防住非法状态的写法实现，并指出 checkout 没 import Money、浮点存金额的问题。
- neededAdapterNotes：dsh.md 需说明应用某原则前先用 pstack_skill 读其叶子（X4）；把「把新需求贴到旧设计」映射到按第一天就要多币种重做并贯通引用。
- neededPluginTools：pstack_skill（应用前读到叶子）
- verdict：gap

### principle-separate-before-serializing-shared-state

- 会话 session-34a84418-e4fc-40c1-932f-bc249f1afcfe（w0），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，26 次调用，工具错误 skill，样本 Error: skill "principle-separate-before-serializing-shared-state" is not available for model invocation。无最后一段话（窗口在产出前截断）。
- neededAdapterNotes：dsh.md 必须提供 pstack_skill 加载该叶子（本地 skill 工具报 not available）；把「并发写共享状态」映射到默认拆成各自拥有文件、读或报告处合并。
- neededPluginTools：pstack_skill（加载该叶子）
- verdict：gap

### principle-sequence-verifiable-units

- 会话 session-ec9006fd-c1df-4f9f-a384-402514835d53（w1），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，12 次调用，无工具错误。无最后一段话（窗口在产出前截断）。
- neededAdapterNotes：dsh.md 需说明应用某原则前先用 pstack_skill 读其叶子（X4）；把「多步相似改动」映射到拆成每个都以可验证状态收尾的小单元并逐个验证。
- neededPluginTools：pstack_skill（应用前读到叶子）
- verdict：gap

### principle-subtract-before-you-add

- 会话 session-09304fe5-7b6d-4e2b-91b9-cc159f3f4eea（w2），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，16 次调用，无工具错误。无最后一段话（窗口在产出前截断）。
- neededAdapterNotes：dsh.md 需说明应用某原则前先用 pstack_skill 读其叶子（X4）；把「演进系统要先删死代码和冗余」映射到先做减法再构建。
- neededPluginTools：pstack_skill（应用前读到叶子）
- verdict：gap

### principle-test-behavior-not-implementation

- 会话 session-a973e381-005b-43f2-a542-655f353277c4（w3），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，17 次调用，无工具错误。说工作区还没有测试环境、vp test（vitest）可用，接下来写代码和测试。
- neededAdapterNotes：dsh.md 需说明应用某原则前先用 pstack_skill 读其叶子（X4）；把「测试断言使用者可观察行为」映射到不断言内部调用顺序。
- neededPluginTools：pstack_skill（应用前读到叶子）
- verdict：gap

### principle-type-system-discipline

- 会话 session-b17640f9-2f78-45b9-8f7d-661ffd15ef4d（w0），raw，minimax low。
- observed：turnEnd=completed，未截断，8 次调用，无工具错误。说改好 src/transfer.ts，用品牌类型区分 Payer 与 Payee 账户号，提供构造函数和显式转换，交换参数会编译报错。
- neededAdapterNotes：dsh.md 需说明应用某原则前先用 pstack_skill 读其叶子（X4）；把「让非法状态不可表示」映射到给语义不同的原始类型打品牌、限制转换。
- neededPluginTools：pstack_skill（应用前读到叶子）
- verdict：gap

### recall

- 会话 session-16c47c83-08ee-4346-9bb6-376f5b50322a（w1），raw，minimax low。
- observed：turnEnd=completed，未截断，36 次调用，无工具错误。说已接上现状，基于分支、批跑日志、worker 证据目录和已提交 findings，说明 58 技能浏览器验证、4 worker 并行、已落 56 个证据。
- neededAdapterNotes：dsh.md 需把「续接工作前重建最近上下文与下一步」映射到 recall；说明它按仓库痕迹与证据反推。
- neededPluginTools：无
- verdict：gap

### reflect

- 会话 690679d3-590a-45bd-95ee-c38885c9d83d（w2），raw，minimax low。
- observed：turnEnd=null（未记录），truncated=true，短探针窗口内观察，未跑完整，5 次调用，无工具错误。说先在工作区文件里给自己打底。
- neededAdapterNotes：dsh.md 需把「会话结束后提炼经验并路由到技能修改与待办」映射到 reflect；本用例 turnEnd 未记录、窗口截断，需重跑取完整观察。
- neededPluginTools：无
- verdict：gap

### setup-pstack

- 会话 session-4d55d700-8cd3-4adf-8ba1-7cc99a9d59cf（w3），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，39 次调用，无工具错误。说先加载 setup-pstack 技能。
- neededAdapterNotes：dsh.md 需提供 pstack_models 枚举真实路由并写 $DSH_HOME/pstack-models.mdc，提供 pstack_skill 加载 setup-pstack 本体；把各角色模型与预算配置映射到该技能。
- neededPluginTools：pstack_models（枚举路由）+ pstack_skill（加载本体）
- verdict：gap

### sharpen

- 会话 session-b32d3a74-069b-411e-8c1a-b49192eb60ce（w0），raw，minimax low。
- observed：turnEnd=completed，未截断，0 次调用，无工具错误。分两部分，先把问题想深（知识库搜索真正的难点是语料权威副本与权限），再给一版可直接发出的请求。
- neededAdapterNotes：dsh.md 需把「把任务做深不做大、重写提示词且不执行」映射到 sharpen。纯文本任务，raw 直接可完成。
- neededPluginTools：无
- verdict：clean

### show-me-your-work

- 会话 session-b81c9dc9-2d86-4cfc-9958-fa0a8fac0dbb（w1），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，20 次调用，工具错误 bash，样本 Error: tool call aborted。说先理解工作区与约定，看项目的决策记录规范，计划搭审计留痕，基线 200k 行约 9ms，先建测量 harness。
- neededAdapterNotes：dsh.md 需把「长时无人值守、事后要审计」映射到 show-me-your-work 的决策留痕；说明 decision-write 属宿主技能，需随包或以等价决策日志替代。
- neededPluginTools：无
- verdict：gap

### statechart

- 会话 session-7912ce99-6a2a-410c-9073-ca29371d862d（w2），raw，minimax low。
- observed：turnEnd=completed，未截断，35 次调用，无工具错误。说按 payment.ts 的 next() 转移表画好状态图，红虚线是违规走法 已支付 force_refund 到已退款，并给产品经理写了图例。
- neededAdapterNotes：dsh.md 需说明 DSH 无原生图表渲染，statechart 按 Mermaid 文本或本地渲染替代（X7）；把「把状态流转画成状态图并标违规路径」映射到该技能。
- neededPluginTools：无
- verdict：gap

### swarm

- 会话 session-11692741-8e59-4ffe-8b60-9aa723b5ac09（w3），raw，minimax low。
- observed：turnEnd=completed，未截断，21 次调用，工具错误 bash，样本 Error: invalid arguments: missing required property "description"。说五个页面分片并行审查，两通过三不通过共六条必修缺陷，汇总成单份报告。
- neededAdapterNotes：dsh.md 需把「一批页面按分片并行核对并汇总」路由到 swarm；分片 worker 的模型与 effort 要靠 pstack_subagent，标准 subagent 只给基础 fan-out。
- neededPluginTools：pstack_subagent（分片 worker 的角色与路由）
- verdict：gap

### tdd

- 会话 session-f6dba7e5-9ac2-4986-9cba-dd0bc76e998b（w0），raw，minimax low。
- observed：turnEnd=completed，未截断，11 次调用，无工具错误。说找到 discount() 只精确匹配 30000，32000 不命中，先写失败测试确认红，再改成取小计能达到的最高阈值，转绿。
- neededAdapterNotes：dsh.md 需把「有明显单测路径的 bug、先写复现失败测试再修」路由到 tdd；raw 不加载即证据。
- neededPluginTools：无
- verdict：gap

### teach

- 会话 session-a491153e-6b38-4b8b-bf12-c1e70be12191（w1），raw，minimax low。
- observed：turnEnd=aborted，truncated=true，短探针窗口内观察，未跑完整，36 次调用，工具错误 skill, job_output, bash，样本 Error: skill "teach" is not available for model invocation。说找到鉴权中间件代码，读完 teach、how、why、unslop 原文，按 teach 要求并行跑 how 和 why。
- neededAdapterNotes：dsh.md 必须提供 pstack_skill 加载 teach（本地 skill 工具报 not available）；teach 要读 how、why、unslop 叶子，需 pstack_skill 加载。
- neededPluginTools：pstack_skill（加载 teach 与相关叶子）
- verdict：gap

### technical-writing

- 会话 session-73e604d4-23f1-4ca1-a191-6e49c30931d8（w2），raw，minimax low。
- observed：turnEnd=completed，未截断，9 次调用，无工具错误。说项目很小、src/index.ts 引用的 ./config 不存在跑不起来，按实际代码写 README 并标出缺口，实测 npm start 会失败。
- neededAdapterNotes：dsh.md 需把「按写作标准重写 README 或文档」映射到 technical-writing。纯文本任务，raw 直接可完成。
- neededPluginTools：无
- verdict：gap

### typescript-best-practices

- 会话 session-9c590657-f7b6-4573-809f-e4a6a019f1c9（w0），raw，minimax low。
- observed：turnEnd=completed，未截断，22 次调用，无工具错误。说重构 src/user.ts，把可选字段改成判别联合 Admin、Member、Guest，adminLevel 改字面量联合，tsc 与运行时都验过。
- neededAdapterNotes：dsh.md 需把「按类型纪律梳理 .ts（判别联合、去 any 与裸 as）」映射到 typescript-best-practices。
- neededPluginTools：无
- verdict：gap

### unslop

- 会话 session-59ee6b07-14af-4c30-9b2d-08aa864471ed（w2），raw，minimax low。
- observed：turnEnd=completed，未截断，4 次调用，工具错误 bash，样本 Error: invalid arguments: missing required property "description"。说改好 docs/intro.md，删掉赋能矩阵等空词、落到具体话、补真实立场、结尾改成邀请对话。
- neededAdapterNotes：dsh.md 需把「去掉 AI 腔、像真人写」映射到 unslop；bash description 必填（X3）。
- neededPluginTools：无
- verdict：gap

### why

- 会话 session-b04ffe0a-8503-4c07-bfda-2c4ec236712a（w1），raw，minimax low。
- observed：turnEnd=completed，未截断，9 次调用，无工具错误。说翻遍仓库证据，结论是直接动因是 2025-11-18 的重试风暴事故，措施是加指数退避加限制三次，改上限要先评估峰值。
- neededAdapterNotes：dsh.md 需把「追问设计动机与来源（是否有讨论或事故）」映射到 why；说明它按仓库证据还原，不编造。
- neededPluginTools：无
- verdict：gap

## 全量证据总表

| 技能 | 加载请求 | 工具错误 | 结束 | 观察摘要 |
| --- | --- | --- | --- | --- |
| architect | - | bash | 完成 | 没有 docs/ 目录和 git 仓库可参考 |
| arena | - | bash | 截断 | Read the current state |
| automate-me | writing-for-agents | bash | 截断 |  |
| benchmark-checklist | - | bash | 完成 | ## 结论：这个「快 3 倍」不能这么报 我 |
| blast-radius | - | - | 截断 | Now let me build a rea |
| bro | - | - | 完成 | 大白话版： 这个季度，我们不再靠拉新用户，而 |
| correct | - | - | 截断 |  |
| create-formal-verification-skill | - | - | 截断 |  |
| create-verification-skill | writing-for-agents | - | 截断 | I'll start by explorin |
| figure-it-out | - | - | 截断 | 我先看一下这个仓库的实际结构，再来设计流程。 |
| how | - | - | 完成 | I'll explore the sourc |
| in-your-own-words | in-your-own-words | skill | 截断 |  |
| interrogate | - | list_subagent_models, subagent, bash | 截断 | Only the parent route  |
| ketchup | - | - | 完成 | 我先说明一点：这轮对话我看不到你上一条消息的 |
| ketchup-video | - | edit | 截断 | Now I'll build the vid |
| maintain-formal-verification-skill | - | - | 截断 | I'll start by finding  |
| maintain-verification-skill | writing-for-agents | - | 完成 | I'll start by finding  |
| make-bot-ui | - | ask_user_question | 截断 | I'll look at the works |
| no-comments | - | - | 完成 | I'll look at the chang |
| poteto-help | - | - | 完成 | 看完了 pstack 的技能清单和 DSH  |
| poteto-mode | agent-browser | - | 截断 | Let me look at how the |
| principle-attack-the-premise | - | - | 截断 |  |
| principle-boundary-discipline | - | - | 完成 | 现有代码只有两个文件，我来加一层"物流接口 |
| principle-build-the-lever | - | - | 完成 | I'll find the componen |
| principle-encode-lessons-in-structure | - | - | 截断 |  |
| principle-exhaust-the-design-space | - | bash | 截断 |  |
| principle-experience-first | - | read, bash | 完成 | 我先把这个原则读进来了（`pstack/sk |
| principle-explain-the-number | - | bash | 截断 |  |
| principle-fix-root-causes | principle-fix-root-causes | skill | 截断 | 我先看了现场：这个工作区里只有 `src/s |
| principle-foundational-thinking | principle-foundational-thinking | read, skill | 截断 |  |
| principle-guard-the-context-window | principle-guard-the-context-window | skill, job_output | 完成 | I'll find the log dire |
| principle-laziness-protocol | - | - | 完成 | 看了一下三个文件，调用点其实已经是"固定规 |
| principle-make-operations-idempotent | - | bash | 截断 | Now re-test, including |
| principle-migrate-callers-then-delete-legacy-apis | principle-migrate-callers-then-delete-legacy-apis | skill | 截断 |  |
| principle-minimize-reader-load | - | - | 完成 | 主要问题在 `src/checkout.ts |
| principle-model-the-domain | - | - | 截断 |  |
| principle-never-block-on-the-human | - | - | 完成 | I'll look at the test  |
| principle-outcome-oriented-execution | - | ask_user_question | 截断 |  |
| principle-prove-it-works | - | - | 截断 | I'll look into the CSV |
| principle-redesign-from-first-principles | - | - | 完成 | 两个文件都读完了。先说结论：**“旁边加个  |
| principle-separate-before-serializing-shared-state | principle-separate-before-serializing-shared-state | skill | 截断 |  |
| principle-sequence-verifiable-units | - | - | 截断 |  |
| principle-subtract-before-you-add | - | - | 截断 |  |
| principle-test-behavior-not-implementation | - | - | 截断 | Workspace has no test  |
| principle-type-system-discipline | - | - | 完成 | 已改好 [src/transfer.ts]( |
| recall | - | - | 完成 | 已接上。下面是现状（基于分支 `playgr |
| reflect | - | - | 截断 | I'll ground myself in  |
| setup-pstack | setup-pstack | - | 截断 | I'll load the setup-ps |
| sharpen | - | - | 完成 | 下面分两部分：**先把问题想深**（哪些地方 |
| show-me-your-work | decision-write | bash | 截断 | I'll start by understa |
| statechart | - | - | 完成 | 状态图已按 [src/payment.ts] |
| swarm | - | bash | 完成 | 五个页面已定位，规范见 [docs/a11y |
| tdd | - | - | 完成 | I'll start by explorin |
| teach | teach | skill, job_output, bash | 截断 | 我先把这套鉴权中间件的代码找出来看看。 技能 |
| technical-writing | - | - | 完成 | I'll look at the proje |
| typescript-best-practices | - | - | 完成 | I'll start by explorin |
| unslop | - | bash | 完成 | 改好了：[docs/intro.md](do |
| why | - | - | 完成 | 我把仓库里能找到的证据都翻了一遍（只有 6  |

## 分类适配结论

### 根与工作流技能，触发要确定性

poteto-mode 以根 preset 常驻系统提示投递，用 preset-active 断言，raw 为 standard 故失败即缺口。其余工作流技能（how、why、architect、arena、interrogate、figure-it-out、swarm、reflect、tdd、benchmark-checklist、blast-radius、correct、unslop、no-comments、technical-writing、typescript-best-practices、bro、in-your-own-words、recall、sharpen、ketchup、ketchup-video、show-me-your-work、automate-me、poteto-help）的触发依赖描述匹配，raw 下几乎不加载。适配要把触发做成生成树里的适配读取提示加 preset 内的路由指令。

### 需要 pstack_subagent 与 pstack_models 的技能

interrogate 要多个审查者各用不同模型族从对抗角度攻击，arena 要多个 runner 各做一版，swarm 要把分片派给多个 worker，setup-pstack 要枚举真实路由并写 `$DSH_HOME/pstack-models.mdc`。raw 下都退化成单路由或直接读文件。需要 pstack_subagent 提供角色化委派与路由，pstack_models 提供实时路由目录。证据见 X6 与 interrogate、arena、swarm、setup-pstack 各条。

### 技能创建与审计类

create-verification-skill、create-formal-verification-skill、maintain-verification-skill、maintain-formal-verification-skill 依赖 create-skill，raw 下模型改用了宿主随包的 writing-for-agents，说明 dsh.md 的 create-skill 到 writing-for-agents 映射可用。需要保证 writing-for-agents 以 vendored 形式随包，且 dsh.md 记录该映射。

### principle 叶子

24 个 principle 叶子同样是 disable-model-invocation 隐藏技能，raw 下用标准 skill 工具请求会报错，多数模型退回 read 直接读 SKILL.md。dsh.md 需说明叶子在应用前用 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。叶子的加载请求与工具错误见上表对应行。

### 渲染与平台能力

ketchup-video 无视频渲染、statechart 无 SVG 渲染、make-bot-ui 无 routine 与 webhook、visualize 无图表渲染。按 dsh.md 的 Local replacements 与 Cursor-only 表处理，属已映射。

### 每次适配都要落进 dsh.md 的通用三条

一是 pstack 技能只能经 pstack_skill 或直接读文件，标准 skill 工具会失败（X1、X4）。二是 bash 工具 description 必填（X3）。三是无人值守会话里提问失败关闭，模型应自行决策并汇报（X5）。

## 覆盖核对

以下逐个核对 58 个技能，每条都有独立的 `### <skill>` 观察条目。

1. ✅ architect
2. ✅ arena
3. ✅ automate-me
4. ✅ benchmark-checklist
5. ✅ blast-radius
6. ✅ bro
7. ✅ correct
8. ✅ create-formal-verification-skill
9. ✅ create-verification-skill
10. ✅ figure-it-out
11. ✅ how
12. ✅ in-your-own-words
13. ✅ interrogate
14. ✅ ketchup
15. ✅ ketchup-video
16. ✅ maintain-formal-verification-skill
17. ✅ maintain-verification-skill
18. ✅ make-bot-ui
19. ✅ no-comments
20. ✅ poteto-help
21. ✅ poteto-mode
22. ✅ principle-attack-the-premise
23. ✅ principle-boundary-discipline
24. ✅ principle-build-the-lever
25. ✅ principle-encode-lessons-in-structure
26. ✅ principle-exhaust-the-design-space
27. ✅ principle-experience-first
28. ✅ principle-explain-the-number
29. ✅ principle-fix-root-causes
30. ✅ principle-foundational-thinking
31. ✅ principle-guard-the-context-window
32. ✅ principle-laziness-protocol
33. ✅ principle-make-operations-idempotent
34. ✅ principle-migrate-callers-then-delete-legacy-apis
35. ✅ principle-minimize-reader-load
36. ✅ principle-model-the-domain
37. ✅ principle-never-block-on-the-human
38. ✅ principle-outcome-oriented-execution
39. ✅ principle-prove-it-works
40. ✅ principle-redesign-from-first-principles
41. ✅ principle-separate-before-serializing-shared-state
42. ✅ principle-sequence-verifiable-units
43. ✅ principle-subtract-before-you-add
44. ✅ principle-test-behavior-not-implementation
45. ✅ principle-type-system-discipline
46. ✅ recall
47. ✅ reflect
48. ✅ setup-pstack
49. ✅ sharpen
50. ✅ show-me-your-work
51. ✅ statechart
52. ✅ swarm
53. ✅ tdd
54. ✅ teach
55. ✅ technical-writing
56. ✅ typescript-best-practices
57. ✅ unslop
58. ✅ why

共 58 条，逐个核对齐全，无遗漏。
