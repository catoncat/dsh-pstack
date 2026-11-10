# 阶段一 raw 验证 findings

本文逐技能记录 raw 上游技能在 DSH Web 真实会话中的观察、需要的 dsh.md 适配说明、需要的插件工具。判定口径：阶段一不判通过，失败即发现。证据在 `playground/.workers/w<k>/evidence/` 的 JSON 与截图，原始会话在对应 worker 的 `home/sessions/`。结论经用户确认后按 `port/AGENTS.md` 流程回填 `port/audit.md` 与 `port/dsh.md`。

## 方法与环境

环境为 raw 模式：不装 dsh-pstack，用官方 `@deepseek-ai/dsh-skill-filesystem` 挂载 `upstream/cursor-plugins/pstack/skills`。主探针 magpie/workbuddy/minimax-m3.1-flash low。approval 策略固定 never。默认技能根未关闭，宿主用户技能可见，skillLoads 可能包含宿主技能名称。

全量批次为 4 worker 并行、动态端口、短探针（principle-light 120 秒、behavior 300 秒），58 个用例全部取到证据，typescript-best-practices 因首轮漏跑而单独补齐。早批次的完整运行记录（单实例、完整等待）保留在本文末的明细与 `.dsh` 证据里。

两点读表约定。skillLoads 表示「发起了加载请求」，是否成功要结合 toolCalls 里的 skill 错误判断，本文表格的「加载请求」列只列请求名。本轮有 29 个用例被重复执行两次，原因是 run-case 子进程在写工作区文件时被再次触发，证据按 capturedAt 取最新，不影响结论，但阶段二前必须修掉 run-batch 的子进程重入。

## 横切发现

### X1 57 个技能声明 disable-model-invocation，标准 skill 工具无法加载

上游 58 个技能里 57 个在 frontmatter 写了 `disable-model-invocation: true`，唯一例外是 setup-pstack。raw 环境没有 pstack_skill，模型改用标准 skill 工具加载，全部被拒并报错，随后多数模型退回用 read 或 bash 直接读 SKILL.md 正文，任务看起来照样完成。这就是「技能未加载但行为正确」的真正原因，不是模型没选，而是工具层拒绝。适配必须提供 pstack_skill 并在 dsh.md 写明，pstack 技能只能经 pstack_skill 或直接读文件访问，标准 skill 工具会失败。阶段二用 skill-loaded 与 preset-active 断言证明加载发生。

### X2 审批墙挂起无人值守会话

早期 how 用例调用 plugin_manager 触发 approval/asked，无人应答，turn 挂到超时。approval 只有 ask 与 never 两值。已固定 never，被门控的动作确定性拒绝，模型看到拒绝继续。

### X3 DSH bash 工具要求 description 必填

大量用例首轮 bash 调用因缺 description 报错后重试（architect、arena、benchmark-checklist、swarm、principle-exhaust-the-design-space、principle-explain-the-number 等）。Cursor 的 Bash 没有该必填字段。dsh.md 的工具映射必须写明 bash 的 description 必填与语义，减少首轮工具错误。

### X4 无人值守会话的 ask_user_question 失败关闭

make-bot-ui、principle-outcome-oriented-execution 调用 ask_user_question 报错，因为没有可应答的人类。dsh.md 需说明在无人值守或子代理会话里提问会失败，preset 指令应让模型自行决策并汇报，而不是停下发问。

### X5 无角色路由与模型目录

interrogate 的 list_subagent_models 报 `Only the parent route is available for children`，只能用一个父路由跑所有审查者。arena 与 swarm 只能用标准 subagent 做基础 fan-out，无法给每个 runner 或 worker 指定角色与 effort。这正是 pstack_subagent 与 pstack_models 要补的能力。

### X6 渲染与平台能力走 dsh.md 的本地替代

ketchup-video 尝试生成视频脚本时 edit 报错，DSH 无视频渲染，按 dsh.md 用文本摘要替代。statechart 用 Mermaid 文本输出状态图。make-bot-ui 的 routine、sender key、wake loop 属 Cursor Automations，DSH 无对应服务，按 Cursor-only 舍弃。这些已在 dsh.md 的 Local replacements 与 Cursor-only 表覆盖，属已映射而非缺口。

## 全量证据总表

| 技能 | 加载请求 | 工具错误 | 结束 | 观察摘要 |
| --- | --- | --- | --- | --- |
| architect | - | 2: bash | 完成 | 没有 docs/ 目录和 git 仓库可参考，我按现有三个 stub 模块的形状写一份设计稿 |
| arena | - | 1: bash | 截断 | Read the current state. Now I'll spawn several |
| automate-me | writing-for-agents | 1: bash | 截断 |  |
| benchmark-checklist | - | 2: bash | 完成 | ## 结论：这个「快 3 倍」不能这么报 我把这个仓库和脚本都过了一遍，并实际跑了基准。结论 |
| blast-radius | - | - | 截断 | Now let me build a real, runnable proof agains |
| bro | - | - | 完成 | 大白话版： 这个季度，我们不再靠拉新用户，而是换个玩法——让已经存在的用户更值钱。具体做法是 |
| correct | - | - | 截断 |  |
| create-formal-verification-skill | - | - | 截断 |  |
| create-verification-skill | writing-for-agents | - | 截断 | I'll start by exploring the repository to unde |
| figure-it-out | - | - | 截断 | 我先看一下这个仓库的实际结构，再来设计流程。 I have the full picture |
| how | - | - | 完成 | I'll explore the source to build the mental mo |
| in-your-own-words | in-your-own-words | 1: skill | 截断 |  |
| interrogate | - | 7: list_subagent_models/subagent/bash | 截断 | Only the parent route is available for childre |
| ketchup | - | - | 完成 | 我先说明一点：这轮对话我看不到你上一条消息的内容，所以我下面的"从上一条到现在"是按仓库里留 |
| ketchup-video | - | 1: edit | 截断 | Now I'll build the video. Writing the render s |
| maintain-formal-verification-skill | - | - | 截断 | I'll start by finding the formal verification  |
| maintain-verification-skill | writing-for-agents | - | 完成 | I'll start by finding the taskboard verificati |
| make-bot-ui | - | 1: ask_user_question | 截断 | I'll look at the workspace first to understand |
| no-comments | - | - | 完成 | I'll look at the changes in this repo first. O |
| poteto-help | - | - | 完成 | 看完了 pstack 的技能清单和 DSH 适配文档，给你两条直接结论。 ## 审查 PR  |
| poteto-mode | agent-browser | - | 截断 | Let me look at how the app currently runs, the |
| principle-attack-the-premise | - | - | 截断 |  |
| principle-boundary-discipline | - | - | 完成 | 现有代码只有两个文件，我来加一层"物流接口边界适配"，把脏数据挡在主流程之外。 全部符合预期 |
| principle-build-the-lever | - | - | 完成 | I'll find the components using `data-value` fi |
| principle-encode-lessons-in-structure | - | - | 截断 |  |
| principle-exhaust-the-design-space | - | 2: bash | 截断 |  |
| principle-experience-first | - | 2: read/bash | 完成 | 我先把这个原则读进来了（`pstack/skills/principle-experienc |
| principle-explain-the-number | - | 1: bash | 截断 |  |
| principle-fix-root-causes | principle-fix-root-causes | 1: skill | 截断 | 我先看了现场：这个工作区里只有 `src/save.ts` 一个文件，`DraftStore |
| principle-foundational-thinking | principle-foundational-thinking | 2: read/skill | 截断 |  |
| principle-guard-the-context-window | principle-guard-the-context-window | 2: skill/job_output | 完成 | I'll find the log directory first. The skill i |
| principle-laziness-protocol | - | - | 完成 | 看了一下三个文件，调用点其实已经是"固定规格"的样子： ``` src/image.ts p |
| principle-make-operations-idempotent | - | 1: bash | 截断 | Now re-test, including a "broken halfway then  |
| principle-migrate-callers-then-delete-legacy-apis | principle-migrate-callers-then-delete-legacy-apis | 1: skill | 截断 |  |
| principle-minimize-reader-load | - | - | 完成 | 主要问题在 `src/checkout.ts`：为了凑出"调用链"而层层包装。 原来读一遍要 |
| principle-model-the-domain | - | - | 截断 |  |
| principle-never-block-on-the-human | - | - | 完成 | I'll look at the test files first. 已统一完成。 **改动 |
| principle-outcome-oriented-execution | - | 1: ask_user_question | 截断 |  |
| principle-prove-it-works | - | - | 截断 | I'll look into the CSV export issue. |
| principle-redesign-from-first-principles | - | - | 完成 | 两个文件都读完了。先说结论：**“旁边加个 currency 字段”这个方案在类型层面是防不 |
| principle-separate-before-serializing-shared-state | principle-separate-before-serializing-shared-state | 1: skill | 截断 |  |
| principle-sequence-verifiable-units | - | - | 截断 |  |
| principle-subtract-before-you-add | - | - | 截断 |  |
| principle-test-behavior-not-implementation | - | - | 截断 | Workspace has no test setup yet; `vp test` (vi |
| principle-type-system-discipline | - | - | 完成 | 已改好 [src/transfer.ts](src/transfer.ts)： - 用品牌类 |
| recall | - | - | 完成 | 已接上。下面是现状（基于分支 `playground-browser-rework`、后台批 |
| reflect | - | - | 截断 | I'll ground myself in the workspace files firs |
| setup-pstack | setup-pstack | - | 截断 | I'll load the setup-pstack skill first. |
| sharpen | - | - | 完成 | 下面分两部分：**先把问题想深**（哪些地方是真正的难点），然后**给你一版可以直接发出去的 |
| show-me-your-work | decision-write | 1: edit | 截断 | Baseline measured. Now building the candidate  |
| statechart | - | - | 完成 | 状态图已按 [src/payment.ts](src/payment.ts) 里的 `nex |
| swarm | - | 2: bash | 完成 | 五个页面已定位，规范见 [docs/a11y.md](docs/a11y.md)。现在并行开 |
| tdd | - | - | 完成 | I'll start by exploring the project to find th |
| teach | teach | 3: skill/job_output/bash | 截断 | 我先把这套鉴权中间件的代码找出来看看。 技能文件在 pstack 包里，我已读完 `teac |
| technical-writing | - | - | 完成 | I'll look at the project first. 项目结构很小，而且 `src |
| typescript-best-practices | - | - | 完成 | I'll start by exploring the workspace structur |
| unslop | - | - | 完成 | 改好了：[docs/intro.md](docs/intro.md) 主要调整： - 删掉「 |
| why | - | - | 完成 | 我把仓库里能找到的证据都翻了一遍（只有 6 个文件，没有 `docs/decisions/` |

## 分类适配结论

### 根与工作流技能，触发要确定性

poteto-mode 以根 preset 常驻系统提示投递，用 preset-active 断言，raw 为 standard 故失败即缺口。其余工作流技能（how、why、architect、arena、interrogate、figure-it-out、swarm、reflect、tdd、benchmark-checklist、blast-radius、correct、unslop、no-comments、technical-writing、typescript-best-practices、bro、in-your-own-words、recall、sharpen、ketchup、ketchup-video、show-me-your-work、automate-me、poteto-help）的触发依赖描述匹配，raw 下几乎不加载。适配要把触发做成生成树里的适配读取提示加 preset 内的路由指令。

### 需要 pstack_subagent 与 pstack_models 的技能

interrogate 要多个审查者各用不同模型族从对抗角度攻击，arena 要多个 runner 各做一版，swarm 要把分片派给多个 worker，setup-pstack 要枚举真实路由并写 `$DSH_HOME/pstack-models.mdc`。raw 下都退化成单路由或直接读文件。需要 pstack_subagent 提供角色化委派与路由，pstack_models 提供实时路由目录。证据见 X5 与 interrogate、arena、swarm、setup-pstack 各条。

### 技能创建与审计类

create-verification-skill、create-formal-verification-skill、maintain-verification-skill、maintain-formal-verification-skill 依赖 create-skill，raw 下模型改用了宿主随包的 writing-for-agents，说明 dsh.md 的 create-skill 到 writing-for-agents 映射可用。需要保证 writing-for-agents 以 vendored 形式随包，且 dsh.md 记录该映射。

### principle 叶子

24 个 principle 叶子同样是 disable-model-invocation 隐藏技能，raw 下用标准 skill 工具请求会报错，多数模型退回 read 直接读 SKILL.md。dsh.md 需说明叶子在应用前用 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。叶子的加载请求与工具错误见上表对应行。

### 渲染与平台能力

ketchup-video 无视频渲染、statechart 无 SVG 渲染、make-bot-ui 无 routine 与 webhook、visualize 无图表渲染。按 dsh.md 的 Local replacements 与 Cursor-only 表处理，属已映射。

### 每次适配都要落进 dsh.md 的通用三条

一是 pstack 技能只能经 pstack_skill 或直接读文件，标准 skill 工具会失败（X1）。二是 bash 工具 description 必填（X3）。三是无人值守会话里提问失败关闭，模型应自行决策并汇报（X4）。

## 早期完整运行记录明细

以下为单实例、完整等待阶段的详细记录，原样保留以追溯会话与证据。

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

### figure-it-out

- 会话 session（批次二，raw，minimax low），run-case 在 1500 秒窗口放弃等待，web 侧 turn 继续跑到 160 步以上，证据未落 evidence JSON，本条依据会话文件直接 digest。计划以 --timeout 3600 重跑取完整判定。
- observed：唯一加载了同名技能的用例（skill 调用 name=figure-it-out）。模型按迁移任务直接执行了完整搬迁（1114 事件、160 步、大量 write/edit/bash），超出窗口未见 turn/end。改造中已把素材规模从「十几个子包、好几天」收到「两三个子包、几个小时」，意图保持在「先设计可审计的执行流程」，改用短探针在全量批跑中重取证据。
- neededAdapterNotes：figure-it-out 的 bespoke playbook 流程在 DSH 的落地形态需要写清；触发依赖描述匹配的强度，不稳定，需由适配提示强化。
- neededPluginTools：无新增。
- verdict：gap（触发成功但窗口不足，重跑定论）。

### arena

- 会话 session-c45a9e2b，raw，minimax low。
- observed：44 次调用完成三候选并行产出、评审选底、嫁接优点的完整 bakeoff，行为与 arena 意图一致。委派用的是 DSH 标准 subagent 工具（3 次并行），不是 pstack_subagent。首次 bash 缺 description 报错（X3）后恢复。arena 未加载。
- neededAdapterNotes：多候选 bakeoff 路由到 arena 的触发指令；dsh.md 需写明 Cursor Task 到 DSH 委派工具的映射差异，标准 subagent 只有基础 fan-out，角色与路由控制要靠 pstack_subagent。
- neededPluginTools：pstack_subagent（角色/路由化委派，arena runners 需要每 runner 独立模型与 effort）。
- verdict：gap。

### interrogate

- 会话 session-aca6cc02，raw，minimax low。
- observed：50 次调用，用 DSH 标准 subagent 并行拉起四个审查者（租户隔离、可变状态共享、并发与生命周期、缓存逻辑），再逐条重跑复现脚本，最终留下 4 条可复现问题（跨租户泄漏、缓存返回同一数组实例、永不失效、无上限）。首次 write 报错后恢复。interrogate 未加载，委派仍未走 pstack_subagent。
- neededAdapterNotes：对抗式多模型审查路由到 interrogate 的触发指令；dsh.md 需写明多审查者要有不同模型族的角度，标准 subagent 只能给基础 fan-out，跨模型多样性要靠 pstack_subagent 的 role 路由。
- neededPluginTools：pstack_subagent（interrogate reviewers 角色池，每 reviewer 独立路由）。
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
