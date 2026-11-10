# 阶段一审核报告

本报告待用户逐条审批。当前实现只作对照，不是结论。审批通过后按建议实现适配与插件工具，`vp run build` 出构建版 dsh-pstack，阶段二用构建版只跑阶段一失败的用例，跑完回填本报告的缺口闭合状态。

## 闭环流程

1. 出审核报告，每技能四列，全部标记待审批。
2. 用户逐条审批。
3. 按审批实现适配与插件工具，`vp run build`。
4. 阶段二用构建版只跑阶段一 raw 失败的用例。
5. 跑完更新本报告，标记缺口是否闭合，进入下一轮。

## 审批口径

- 每节四列固定为：上游能力、当前实现状态与缺口、建议的 dsh.md 适配与插件工具、待审批。
- 当前实现列只陈述 raw 探针观察，判定以审批后的适配为准。
- 横切发现 X1 至 X7 见文末，各技能的缺口引用它们。

## 逐技能审核

### architect

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Sketch types, signatures, and module structure before code, then stay in the loop while implementation fills in. Use for /architect, 'architect this', 'design this', or non-trivial work where jumping to code would lock in the wrong shape. |
| 当前实现状态与缺口 | turnEnd=completed；9 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 |
| 待审批 | 待审批 |

### arena

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Spawn N parallel candidates at the same task, pick a base, graft the strongest parts of the losers into it. Use for /arena, 'arena this', 'throw it in the arena', or when one attempt at a non-trivial artifact would lock in the wrong shape. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；15 次调用；成功加载 无；工具错误 job_output/bash。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝）；bash 缺 description（X3） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 另需 pstack_subagent 给每个 runner 独立模型与 effort。 |
| 待审批 | 待审批 |

### automate-me

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Use for "automate me", "create/update/refresh my -mode skill", "turn/capture my preferences or working style into a skill", or wanting agents to follow how the user works. Drafts or revises a personal -mode skill via create-skill + unslop, optionally pulling fresh evidence from recent transcripts. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；10 次调用；成功加载 writing-for-agents；工具错误 ask_user_question。缺口：无人值守提问失败（X5） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 执行类任务保留原任务，不做额外工具依赖。 |
| 待审批 | 待审批 |

### benchmark-checklist

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Vet a perf measurement (limiter, tuning, limits, errors, repeatability, relevance, and whether the work happened) before you report or act on it. Use when you run a benchmark or report a speedup or regression you measured. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；43 次调用；成功加载 无；工具错误 skill。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 执行类任务保留原任务，不做额外工具依赖。 |
| 待审批 | 待审批 |

### blast-radius

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Find what a change could break somewhere else before it ships, beyond the diff, and prove the one fact it's safe because of by running real code instead of writing it up. Use for 'blast radius of X', 'what could this break', or reviewing a small diff you don't trust. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；40 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 执行类任务保留原任务，不做额外工具依赖。 |
| 待审批 | 待审批 |

### bro

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Restate the last message in plain human language, with no jargon. |
| 当前实现状态与缺口 | turnEnd=completed；0 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 执行类任务保留原任务，不做额外工具依赖。 |
| 待审批 | 待审批 |

### correct

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Find the mistakes agents keep repeating in this repo and make each one impossible. Try architecture first, then types, then a lint whose error names the fix, then a test, and write docs last. Prove each check fails on a real past mistake. Repeat this each time the operator corrects you. Use for /correct. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；47 次调用；成功加载 无；工具错误 bash。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝）；bash 缺 description（X3） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 执行类任务保留原任务，不做额外工具依赖。 |
| 待审批 | 待审批 |

### create-formal-verification-skill

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Generate a project-local skill that formally verifies the code where a bug costs the most and tests reach the least, in any language, with whichever verification tool fits. Use for /create-formal-verification-skill, "model-check this race", "prove this invariant", or when concurrency, retries, state machines, parsers, or unsafe code need more than tests. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；35 次调用；成功加载 writing-for-agents；工具错误 无。缺口：无早期信号缺口 |
| 建议的 dsh.md 适配与插件工具 | dsh.md 的 create-skill 映射到随包的 vendored writing-for-agents，并保证该技能随包。 |
| 待审批 | 待审批 |

### create-verification-skill

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Generate a project-local verification skill that drives your app the way a user does — any language, framework, or platform. Use for /create-verification-skill, "make a control skill for this repo", or when a project has no scripted way to prove UI/CLI/service behavior. |
| 当前实现状态与缺口 | turnEnd=completed；34 次调用；成功加载 writing-for-agents；工具错误 无。缺口：无早期信号缺口 |
| 建议的 dsh.md 适配与插件工具 | dsh.md 的 create-skill 映射到随包的 vendored writing-for-agents，并保证该技能随包。 |
| 待审批 | 待审批 |

### figure-it-out

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Design an auditable playbook when no narrower one fits: a large migration, an ambitious multi-part change, or work a human reviews after stepping away. Scales rigor to the task, runs a hypothesis loop, and logs decisions. Use for /figure-it-out or 'figure it out'. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；43 次调用；成功加载 无；工具错误 bash。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝）；bash 缺 description（X3） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 |
| 待审批 | 待审批 |

### how

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Use for "how does X work", code walkthroughs before changing something, and placement / ownership / layering questions ("where should this live", "which package owns this", "is this the right layer"). Explains subsystem architecture, runtime flow, onboarding mental models. Use why for motivation. |
| 当前实现状态与缺口 | turnEnd=completed；14 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 |
| 待审批 | 待审批 |

### in-your-own-words

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Restate in your own words what you think the user's goals are and what problem they're trying to solve. Use for /in-your-own-words. |
| 当前实现状态与缺口 | turnEnd=completed；8 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 |
| 待审批 | 待审批 |

### interrogate

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Use for "interrogate", "adversarial review", "multi-model review", "challenge this", "stress test this code", "find blind spots", or "tear this apart". Adversaries try to break a change or design, and only findings proven by a run survive. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；33 次调用；成功加载 无；工具错误 bash/subagent/job_output。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝）；bash 缺 description（X3）；缺角色路由（X6） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 另需 pstack_subagent 让每个审查者用不同模型族，pstack_models 提供路由目录。 |
| 待审批 | 待审批 |

### ketchup

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Catch the user up on what changed in this chat since their last message, in plain words and small visuals. List every item waiting on them with what they need to decide it from the reply alone. Use for /ketchup. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；42 次调用；成功加载 无；工具错误 skill。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 执行类任务保留原任务，不做额外工具依赖。 |
| 待审批 | 待审批 |

### ketchup-video

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Catch the user up like /ketchup, with a short subtitled video of slides for what happened and the waiting calls as text under it. Use for /ketchup-video. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；51 次调用；成功加载 无；工具错误 skill。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | 按 dsh.md 的 Local replacements 用本地替代输出，不声称渲染；保留文本结果作为证据。 |
| 待审批 | 待审批 |

### maintain-formal-verification-skill

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Bring a project's formal verification back in line with the code after the code changes: find the commits that touched verified code, update the model, harness, or properties to describe the code as it is now, rerun, and say whether each failure is drift in the verification or a bug in the code. Use for /maintain-formal-verification-skill, "is the model still true to the code", or after merges and refactors that touched verified code without rechecking it. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；51 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 的 create-skill 映射到随包的 vendored writing-for-agents，并保证该技能随包。 |
| 待审批 | 待审批 |

### maintain-verification-skill

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Periodic pass that keeps a project's verification skill and feature map honest: parallel source readers per feature, one live session driving every feature, at most one PR of proven corrections. Use for /maintain-verification-skill or "audit the verify skill". |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；53 次调用；成功加载 writing-for-agents；工具错误 无。缺口：无早期信号缺口 |
| 建议的 dsh.md 适配与插件工具 | dsh.md 的 create-skill 映射到随包的 vendored writing-for-agents，并保证该技能随包。 |
| 待审批 | 待审批 |

### no-comments

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Spawn Comment Sicko, fix accepted findings, and offer encodings for claimed constraints. |
| 当前实现状态与缺口 | turnEnd=completed；21 次调用；成功加载 无；工具错误 edit。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 执行类任务保留原任务，不做额外工具依赖。 |
| 待审批 | 待审批 |

### poteto-help

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Guides users through pstack setup, /poteto-mode, and picking the skill, playbook, or principle for a task. Type /poteto-help with a question. |
| 当前实现状态与缺口 | turnEnd=completed；12 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 回答里引用的 Cursor 专属能力按 dsh.md Cursor-only 舍弃，不当作可用功能。 |
| 待审批 | 待审批 |

### poteto-mode

| 维度 | 内容 |
| --- | --- |
| 上游能力 | poteto's agent style for concise, detailed responses, deliberate subagents, unslopped prose, simple code, and verified work. Use for poteto, /poteto-mode, or requests to work in this style. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；42 次调用；成功加载 agent-browser；工具错误 edit。缺口：无早期信号缺口 |
| 建议的 dsh.md 适配与插件工具 | 以根 preset 常驻系统提示投递，用 preset-active 断言。 |
| 待审批 | 待审批 |

### principle-attack-the-premise

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply when two or more fixes that share one premise have failed the same gate. Write the premise down and test it directly before you write another fix that assumes it. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；17 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-boundary-discipline

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply when wiring validation, error handling, or framework adapters. Concentrate guards at system boundaries (CLI, config, network, external APIs); trust internal types and keep business logic in pure functions. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；18 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-build-the-lever

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply to any non-trivial work, not just bulk work: edits, migrations, analyses, checks. Build the tool that does it or proves it (codemod, script, generator, or a skill your subagents follow) instead of working by hand. The tool is the artifact a reviewer can rerun. |
| 当前实现状态与缺口 | turnEnd=completed；8 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-encode-lessons-in-structure

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply when you catch yourself writing the same instruction a second time, or notice a recurring correction. Encode the rule as a lint, metadata flag, runtime check, or script instead of more text. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；21 次调用；成功加载 writing-for-agents；工具错误 skill。缺口：无早期信号缺口 |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-exhaust-the-design-space

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply when facing a novel UI interaction or architectural decision with no precedent in the codebase. Build 2-3 competing prototypes and compare side by side before committing. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；30 次调用；成功加载 无；工具错误 bash。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝）；bash 缺 description（X3） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-experience-first

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply when product, UX, or feature-scope tradeoffs come up. Choose user delight over implementation convenience; ship fewer polished features over more rough ones. |
| 当前实现状态与缺口 | turnEnd=completed；18 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-explain-the-number

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply before you measure, and before you trust, report, or act on a number you measured: a speedup, a regression, a throughput, a latency, or an eval result. Find what limits it, and rule out that it measured something other than the work you think. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；22 次调用；成功加载 无；工具错误 bash/skill。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝）；bash 缺 description（X3） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-fix-root-causes

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply when debugging. Trace each symptom back to the first place the system went wrong and fix it there. A guard is a fix only when the state it handles is legitimate. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；11 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-foundational-thinking

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply before writing logic: choosing core types and data structures, sequencing scaffold-vs-feature work, asking what concurrent actors share. Get the data structures right so downstream code becomes obvious. |
| 当前实现状态与缺口 | turnEnd=completed；4 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-guard-the-context-window

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply when context is filling up: large outputs, long files, repeated reads, fan-out planning. Route bulk to subagents; keep summaries in the main thread, not raw payloads. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；14 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-laziness-protocol

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply when refactoring, evaluating diff size, or tempted to add abstractions, layers, or signal threading. Bias toward deletion and the smallest change that solves the problem. |
| 当前实现状态与缺口 | turnEnd=completed；15 次调用；成功加载 无；工具错误 read。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-make-operations-idempotent

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply when designing commands, lifecycle steps, or processing loops that run amid crashes, restarts, and retries. Converge to the same end state regardless of partial prior runs. |
| 当前实现状态与缺口 | turnEnd=completed；5 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-migrate-callers-then-delete-legacy-apis

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply when introducing a new internal API while old callers still exist. Migrate callers and delete the old API in the same wave instead of preserving compatibility layers. |
| 当前实现状态与缺口 | turnEnd=completed；15 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-minimize-reader-load

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply when reviewing or shaping code that's hard to trace. Count layers between question and answer, and hidden state in the reader's head; collapse one-caller wrappers and shrink mutable scope. |
| 当前实现状态与缺口 | turnEnd=completed；6 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-model-the-domain

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply when writing stateful logic, or when code branches a lot or repeats a shape assumption across files. |
| 当前实现状态与缺口 | turnEnd=completed；15 次调用；成功加载 无；工具错误 bash/read。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝）；bash 缺 description（X3） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-never-block-on-the-human

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply when tempted to ask 'should I do X?' on reversible work. |
| 当前实现状态与缺口 | turnEnd=completed；19 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-outcome-oriented-execution

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply during planned rewrites and migrations with explicit phase boundaries. Converge on the target architecture; don't preserve smooth intermediate states with throwaway compatibility code. |
| 当前实现状态与缺口 | turnEnd=completed；20 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-prove-it-works

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply after completing a task, before declaring done. Verify against the real artifact (run the feature, read the actual value, inspect the diff), not a proxy, self-report, or 'it compiles.' |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；23 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-redesign-from-first-principles

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply when integrating a new requirement into an existing design. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；20 次调用；成功加载 无；工具错误 skill。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-separate-before-serializing-shared-state

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply when concurrent actors might write to the same file, branch, key, or state object. Eliminate the sharing first; serialize structurally only when one shared writer is a real invariant. |
| 当前实现状态与缺口 | turnEnd=completed；19 次调用；成功加载 无；工具错误 bash。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝）；bash 缺 description（X3） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-sequence-verifiable-units

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply to multi-step work (sweeps, migrations, runs of similar edits) and to how you stack commits and PRs. Break work into small units that each end in a verifiable state, check each before the next, and order delivery so the sequence proves itself to a reviewer. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；18 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-subtract-before-you-add

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply when sequencing an addition, refactor, or rewrite. Remove dead code, redundant validators, and stub references first, then build on the simpler base. |
| 当前实现状态与缺口 | turnEnd=completed；7 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-test-behavior-not-implementation

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply when you write, change, or keep a test. Assert what the code's users can observe, so that the test fails when that behavior breaks and keeps passing when only the internals change. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；19 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### principle-type-system-discipline

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Apply when designing types, reviewing a function signature, or writing code in any statically-typed language. Make illegal states unrepresentable, brand semantic primitives, parse external data at boundaries, exhaust variants, derive from authoritative schemas. |
| 当前实现状态与缺口 | turnEnd=completed；15 次调用；成功加载 无；工具错误 bash。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝）；bash 缺 description（X3） |
| 建议的 dsh.md 适配与插件工具 | dsh.md 写明 principle 叶子只能经 pstack_skill 完整读取，preset 正文要求应用某原则前先读其叶子。 |
| 待审批 | 待审批 |

### recall

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Reconstruct your recent working context from your own chat history, live state, and the shared record (user reports, prior fixes, incidents), then hand back a tight current-state brief. Use for 'recall my work on X', 'catch me up', 'what have I been working on', 'where did I leave off', before starting or resuming work. |
| 当前实现状态与缺口 | turnEnd=completed；28 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 执行类任务保留原任务，不做额外工具依赖。 |
| 待审批 | 待审批 |

### reflect

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；37 次调用；成功加载 无；工具错误 skill。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 |
| 待审批 | 待审批 |

### setup-pstack

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Configure which models pstack uses per role and at what reasoning budget. Detects your available models and writes an always-applied rule that overrides the skill defaults. Use for /setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；40 次调用；成功加载 setup-pstack；工具错误 list_subagent_models/ask_user_question。缺口：无人值守提问失败（X5）；缺角色路由（X6） |
| 建议的 dsh.md 适配与插件工具 | 需要 pstack_models 枚举真实路由，并写 $DSH_HOME/pstack-models.mdc。 |
| 待审批 | 待审批 |

### sharpen

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Make a task deeper, not bigger, then rewrite the prompt. Use for /sharpen. |
| 当前实现状态与缺口 | turnEnd=completed；5 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 执行类任务保留原任务，不做额外工具依赖。 |
| 待审批 | 待审批 |

### show-me-your-work

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Keep a reviewable decision trail for long-running or unattended work: a TSV log with one row per decision (what, why, evidence, result). Local by default; commit it when a reviewer needs the trail to trust the result. Use for /show-me-your-work, autonomous or multi-phase runs, or work a human reviews after stepping away. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；29 次调用；成功加载 decision-write；工具错误 无。缺口：无早期信号缺口 |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 执行类任务保留原任务，不做额外工具依赖。 |
| 待审批 | 待审批 |

### statechart

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Check a TLA+ model of a system that moves between states, such as a product flow, a protocol, or a service, and draw it as a Mermaid statechart. The report gives the shortest path to each state that breaks a rule. Use for /statechart, or to show a bug as a path through states. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；28 次调用；成功加载 agent-browser；工具错误 无。缺口：无早期信号缺口 |
| 建议的 dsh.md 适配与插件工具 | 按 dsh.md 的 Local replacements 用本地替代输出，不声称渲染；保留文本结果作为证据。 |
| 待审批 | 待审批 |

### swarm

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Fan out N parallel workers, drain them, and return one report. Use for /swarm, 'swarm this', or parallel coverage, races, gauntlets, and exploration. |
| 当前实现状态与缺口 | turnEnd=completed；9 次调用；成功加载 无；工具错误 workflow。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 另需 pstack_subagent 把分片派给多个 worker。 |
| 待审批 | 待审批 |

### tdd

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Use only when the user explicitly asks for TDD, a failing test, or a regression test, OR when the bug has an obvious cheap local test target. Skip when the test path is unclear, expensive, integration-heavy, or not requested. |
| 当前实现状态与缺口 | turnEnd=completed；21 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 执行类任务保留原任务，不做额外工具依赖。 |
| 待审批 | 待审批 |

### teach

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Explain a body of work plainly so a person actually understands it. Runs the `how` and `why` skills and weaves what they find into one clear explanation. Use for 'teach me this', 'help me really understand X', 'explain this change or subsystem to me'. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；41 次调用；成功加载 find-skills；工具错误 skill/job_output/bash。缺口：bash 缺 description（X3） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 |
| 待审批 | 待审批 |

### technical-writing

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Layered technical-writing standard: Diátaxis structure, Google developer style sentences, STE instruction rules, Global English syntax. Use for /technical-writing or when writing or reviewing docs, RFCs, readmes, PR descriptions, or commit messages. |
| 当前实现状态与缺口 | turnEnd=completed；12 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 执行类任务保留原任务，不做额外工具依赖。 |
| 待审批 | 待审批 |

### typescript-best-practices

| 维度 | 内容 |
| --- | --- |
| 上游能力 | TypeScript best practices. Use when reading or editing any .ts or .tsx file. |
| 当前实现状态与缺口 | turnEnd=completed；14 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 执行类任务保留原任务，不做额外工具依赖。 |
| 待审批 | 待审批 |

### unslop

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Cut AI tells from any writing. |
| 当前实现状态与缺口 | turnEnd=completed；3 次调用；成功加载 无；工具错误 无。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 执行类任务保留原任务，不做额外工具依赖。 |
| 待审批 | 待审批 |

### why

| 维度 | 内容 |
| --- | --- |
| 上游能力 | Use for 'why does X work this way', 'why we picked Y', design rationale, regressions, postmortems, or data-backed thresholds. Discovers available MCPs and queries each evidence category (source control, issue tracker, long-form docs, real-time chat, infrastructure observability, error tracking, product analytics warehouse) in parallel, then returns a cited read on decisions and tradeoffs. Use how for runtime behavior. |
| 当前实现状态与缺口 | turnEnd=aborted（短探针截断）；47 次调用；成功加载 无；工具错误 skill。缺口：技能未被成功加载（X1，隐藏技能标准 skill 工具拒绝） |
| 建议的 dsh.md 适配与插件工具 | 在生成树的适配读取提示与根 preset 的路由指令里，把该类请求确定性路由到本技能，不再依赖描述匹配。 |
| 待审批 | 待审批 |

## 显式排除清单

| 技能 | 理由 |
| --- | --- |
| make-bot-ui | 依赖 Cursor Automations、routine、SendToUser webhook，DSH 无对应服务，按 dsh.md Cursor-only features 舍弃，不建用例不跑。 |

## 横切发现与通用适配

### X1 57 个技能声明 disable-model-invocation，标准 skill 工具无法加载

上游 58 个技能里 57 个写了 disable-model-invocation: true，唯一例外 setup-pstack。raw 环境没有 pstack_skill，模型改用标准 skill 工具加载被拒，随后退回直接读 SKILL.md。适配必须提供 pstack_skill 并写明 pstack 技能只能经它或直接读文件访问。

### X2 审批墙挂起无人值守会话

approval 只有 ask 与 never 两值，已固定 never，被门控动作确定性拒绝。

### X3 DSH bash 工具要求 description 必填

大量用例首轮 bash 缺 description 报错后重试。dsh.md 的 bash 映射要写明该必填字段。

### X4 skill 工具拒绝隐藏技能

逐技能错误样本，归因同 X1。

### X5 无人值守下 ask_user_question 必然被中止

依赖提问的技能在无人值守会话拿不到回答。dsh.md 需说明改走自主决策或标注需操作者在场。

### X6 无角色路由与模型目录

list_subagent_models 报 Only the parent route is available for children。需要 pstack_subagent 与 pstack_models。

### X7 渲染与平台能力走本地替代

ketchup-video 无视频渲染、statechart 无 SVG 渲染、make-bot-ui 无 routine。按 dsh.md Local replacements 与 Cursor-only 表处理。

## 证据索引

- 本报告引用 57 个技能，证据取自 playground/reports/evidence 与 playground/.workers 的最新用例 JSON。
- 每条证据路径需真实存在，缺失的条目在上表标为未取到证据。
