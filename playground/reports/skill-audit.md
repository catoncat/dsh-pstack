# 技能审核报告

基线：dsh >=0.2.2-rc.1，pstack ae5650febf4320793844c12c4adaa937f417f8da，compatibilityKey dsh-0.2.2-rc.1+port-v1。

本报告待用户逐条审批。当前实现只作事实描述，不是结论；建议列留空，由用户在审批时填写。审批后按用户填写的建议实现适配与插件工具，`vp run build` 出构建版 dsh-pstack，adapted 轮只用构建版跑 raw 轮失败的用例，跑完回填本报告的缺口闭合状态。

## 闭环流程

1. 出审核报告，每个技能给出上游能力与当前实现事实，建议列留空待审批。
2. 用户逐条审批，并填写建议的 dsh.md 适配与插件工具。
3. 按用户填写的建议实现适配与插件工具，`vp run build`。
4. adapted 轮用构建版只跑 raw 轮失败的用例。
5. 跑完更新本报告，标记缺口是否闭合，进入下一轮。

## 审批口径

- 每节固定行：上游能力、当前实现与会话结果、当前实现与工具错误、当前实现与缺口、证据、建议的 dsh.md 适配、建议的插件工具、待审批。
- 建议的 dsh.md 适配与建议的插件工具两行留空，由用户在审批时填写，报告不预填。
- 横切发现 X1 至 X7 见文末，各技能的缺口引用它们。

## 逐技能审核

### architect

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 写代码前先勾勒类型、签名与模块结构，并在实现填充时持续参与；适用于 /architect 或直接编码会锁死错误结构的重要工作。 |
| 当前实现：会话结果 | turnEnd=completed，调用 24 次 |
| 当前实现：工具错误 | todo_write |
| 当前实现：缺口 | 无早期信号缺口 |
| 证据 | playground/.workers/w0/evidence/w0-architect-adapted-2026-11-10T10-07-33-260Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### arena

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 就同一任务并行产出多个候选方案，选出一个基底，再把落选方案中最强的部分嫁接进去；适用于 /arena 或一次尝试会定死重要产物时。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 15 次 |
| 当前实现：工具错误 | bash |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载）；bash 缺少 description（X3） |
| 证据 | playground/reports/evidence/1-2026-11-10/w1-arena-raw-2026-11-10T08-55-33-877Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### automate-me

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 把用户的工作方式与偏好整理成一枚个人 -mode 技能，用 create-skill 与 unslop 起草或修订，可从近期对话补充证据；适用于 automate me 或希望 agent 遵循自己工作方式时。 |
| 当前实现：会话结果 | turnEnd=completed，调用 40 次 |
| 当前实现：工具错误 | write |
| 当前实现：缺口 | 无早期信号缺口 |
| 证据 | playground/reports/evidence/1-2026-11-10/w2-automate-me-raw-2026-11-10T08-55-33-865Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### benchmark-checklist

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 在报告或依据某项性能测量前核查它，检查限流、调优、上限、误差、可重复性、相关性以及该工作是否真的发生。 |
| 当前实现：会话结果 | turnEnd=completed，调用 35 次 |
| 当前实现：工具错误 | skill |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w3-benchmark-checklist-raw-2026-11-10T08-55-33-871Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### blast-radius

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 在改动上线前找出它在 diff 之外可能波及或破坏的地方，并通过运行真实代码证明那条安全依据，而非只写说明。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 44 次 |
| 当前实现：工具错误 | skill |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w4-blast-radius-raw-2026-11-10T08-55-33-872Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### bro

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 用平实直白的人类语言复述上一条消息，不夹杂任何术语或行话。 |
| 当前实现：会话结果 | turnEnd=completed，调用 0 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w5-bro-raw-2026-11-10T08-55-33-858Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### correct

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 找出 agent 在本仓库反复犯的错误并让它们不再可能发生：先试架构、类型，再试报错点明修法的 lint，再试测试，文档放最后。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 33 次 |
| 当前实现：工具错误 | bash |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载）；bash 缺少 description（X3） |
| 证据 | playground/reports/evidence/1-2026-11-10/w6-correct-raw-2026-11-10T08-55-33-881Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### create-formal-verification-skill

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 生成项目本地技能，用最合适的验证工具，对 bug 代价最高而测试覆盖最少的代码做形式化验证，支持任意语言。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 16 次 |
| 当前实现：工具错误 | bash |
| 当前实现：缺口 | bash 缺少 description（X3） |
| 证据 | playground/reports/evidence/1-2026-11-10/w7-create-formal-verification-skill-raw-2026-11-10T08-55-33-891Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### create-verification-skill

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 生成项目本地验证技能，像用户一样驱动应用，支持任意语言、框架或平台，用于缺少脚本化 UI、CLI 或服务行为验证的项目。 |
| 当前实现：会话结果 | turnEnd=completed，调用 39 次 |
| 当前实现：工具错误 | edit |
| 当前实现：缺口 | 无早期信号缺口 |
| 证据 | playground/reports/evidence/1-2026-11-10/w8-create-verification-skill-raw-2026-11-10T08-55-33-865Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### figure-it-out

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 在更窄的 playbook 都不适用时设计一份可审计的 playbook，覆盖大型迁移或多部分复杂改动，按任务规模调整严格度并记录决策。 |
| 当前实现：会话结果 | turnEnd=completed，调用 10 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w9-figure-it-out-raw-2026-11-10T08-55-33-899Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### how

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 解释子系统架构、运行时流程和新手上手心智模型，适用于改动前的代码走读，以及“这段该放哪里、哪个包负责、层级是否合适”的问题。 |
| 当前实现：会话结果 | turnEnd=completed，调用 14 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w10-how-raw-2026-11-10T08-55-33-935Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### in-your-own-words

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 用自己的话复述你认为用户的目标以及他们想解决的问题。适用于 /in-your-own-words。 |
| 当前实现：会话结果 | turnEnd=completed，调用 9 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w11-in-your-own-words-raw-2026-11-10T08-55-33-910Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### interrogate

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 让多个对抗方尝试击破一项改动或设计，只有通过实际运行证实的发现才被采信，适用于对抗评审、多模型评审与压力测试。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 55 次 |
| 当前实现：工具错误 | list_subagent_models、subagent、job_output |
| 当前实现：缺口 | 缺少角色路由（X6） |
| 证据 | playground/reports/evidence/1-2026-11-10/w0-interrogate-raw-2026-11-10T08-56-50-517Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### ketchup

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 用平实的文字和少量图示，向用户汇报自其上次发言以来本对话的变化，并逐条列出等待其决定的事项与所需依据。适用于 /ketchup。 |
| 当前实现：会话结果 | turnEnd=completed，调用 22 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w2-ketchup-raw-2026-11-10T08-59-17-065Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### ketchup-video

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 像 /ketchup 一样把用户拉回上下文，但用一段带字幕的幻灯片短视频呈现经过，并把等待决定的事项以文字置于其下。适用于 /ketchup-video。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 29 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w1-ketchup-video-raw-2026-11-10T09-00-57-102Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### maintain-formal-verification-skill

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 代码变更后让形式化验证重新对齐代码：找出改动过被验证代码的提交，更新模型、harness 或性质，重跑并判断每个失败是验证漂移还是代码 bug。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 32 次 |
| 当前实现：工具错误 | skill |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w3-maintain-formal-verification-skill-raw-2026-11-10T08-59-18-884Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### maintain-verification-skill

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 周期性维护项目的验证技能与功能映射：按功能并行阅读源码，用一个实时会话驱动每个功能，最多提交一个经证实的修正 PR。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 34 次 |
| 当前实现：工具错误 | read、skill |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w4-maintain-verification-skill-raw-2026-11-10T09-00-56-556Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### no-comments

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 派出 Comment Sicko，修复被接受的发现，并为被声明的约束提供固化手段。 |
| 当前实现：会话结果 | turnEnd=completed，调用 11 次 |
| 当前实现：工具错误 | edit |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w5-no-comments-raw-2026-11-10T08-55-55-792Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### poteto-help

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 引导用户完成 pstack 配置与 /poteto-mode 使用，并为任务挑选合适的技能、playbook 或 principle。输入 /poteto-help 即可提问。 |
| 当前实现：会话结果 | turnEnd=completed，调用 13 次 |
| 当前实现：工具错误 | plugin_manager |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w6-poteto-help-raw-2026-11-10T09-00-56-258Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### poteto-mode

| 维度 | 内容 |
| --- | --- |
| 上游能力 | poteto 的 agent 风格：简洁细致的回答、克制的子代理、去 AI 味的文字、简单代码与经验证的工作。适用于 /poteto-mode 或要求此风格时。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 40 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w7-poteto-mode-raw-2026-11-10T09-00-58-239Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-attack-the-premise

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 当两个或更多共享同一前提的修复都卡在同一道关卡时适用。写下该前提并直接检验它，而不是再写一个同样假设它的修复。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 8 次 |
| 当前实现：工具错误 | bash |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载）；bash 缺少 description（X3） |
| 证据 | playground/reports/evidence/1-2026-11-10/w8-principle-attack-the-premise-raw-2026-11-10T09-00-11-608Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-boundary-discipline

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 在接线校验、错误处理或框架适配层时适用。把守卫集中在系统边界（CLI、配置、网络、外部 API），信任内部类型，业务逻辑保持纯函数。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 21 次 |
| 当前实现：工具错误 | bash |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载）；bash 缺少 description（X3） |
| 证据 | playground/reports/evidence/1-2026-11-10/w9-principle-boundary-discipline-raw-2026-11-10T08-57-29-261Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-build-the-lever

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 适用于任何非平凡工作，不止批量活：改动、迁移、分析、检查。造出能做或能证明它的工具（codemod、脚本、生成器或技能），而非手工完成。 |
| 当前实现：会话结果 | turnEnd=completed，调用 7 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w10-principle-build-the-lever-raw-2026-11-10T08-57-04-982Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-encode-lessons-in-structure

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 当发现自己在第二次写下同一条指令，或注意到反复出现的更正时适用。把规则编码成 lint、元数据标记、运行时检查或脚本，而非更多文字。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 16 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w11-principle-encode-lessons-in-structure-raw-2026-11-10T08-57-08-122Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-exhaust-the-design-space

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 面对代码库中没有先例的新交互或架构决策时适用。构建两到三个互相竞争的 prototype，在定稿前并排比较。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 16 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w0-principle-exhaust-the-design-space-raw-2026-11-10T09-02-11-077Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-experience-first

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 在产品、UX 或功能范围的取舍出现时适用。选择用户愉悦而非实现便利；宁可少而精地交付，也不要多而粗。 |
| 当前实现：会话结果 | turnEnd=completed，调用 10 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w1-principle-experience-first-raw-2026-11-10T09-06-18-155Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-explain-the-number

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 在你测量前，以及在信任、报告或依据一个测得的数字（提速、回归、吞吐、延迟或 eval）前适用。找出其限制，排除它测错了对象。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 8 次 |
| 当前实现：工具错误 | job_output |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w2-principle-explain-the-number-raw-2026-11-10T09-02-59-408Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-fix-root-causes

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 调试时适用。把每个症状追溯到系统第一次出错的地方并在那里修复。只有当它处理的状态合法时，守卫才算修复。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 18 次 |
| 当前实现：工具错误 | skill |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w3-principle-fix-root-causes-raw-2026-11-10T09-04-41-094Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-foundational-thinking

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 写逻辑前适用：选定核心类型与数据结构，安排脚手架与功能工作的先后，追问并发参与者共享什么。数据结构定对，下游代码才会自然。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 17 次 |
| 当前实现：工具错误 | grep |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w4-principle-foundational-thinking-raw-2026-11-10T09-06-18-755Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-guard-the-context-window

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 当上下文快满时适用：大输出、长文件、重复读取、扇出规划。把批量内容交给子代理，主线程只留摘要，而非原始载荷。 |
| 当前实现：会话结果 | turnEnd=completed，调用 20 次 |
| 当前实现：工具错误 | skill |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w5-principle-guard-the-context-window-raw-2026-11-10T08-57-48-391Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-laziness-protocol

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 在重构、评估 diff 规模，或忍不住要加抽象、分层、信号透传时适用。偏向删除和解决问题的最小改动。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 10 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w6-principle-laziness-protocol-raw-2026-11-10T09-02-57-621Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-make-operations-idempotent

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 在设计会在崩溃、重启和重试中运行的命令、生命周期步骤或处理循环时适用。无论此前跑到哪，都收敛到同一终态。 |
| 当前实现：会话结果 | turnEnd=completed，调用 5 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w7-principle-make-operations-idempotent-raw-2026-11-10T09-06-18-871Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-migrate-callers-then-delete-legacy-apis

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 在旧调用方仍存在时引入新的内部 API 时适用。在同一次改动中迁移调用方并删除旧 API，而不是保留兼容层。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 11 次 |
| 当前实现：工具错误 | bash |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载）；bash 缺少 description（X3） |
| 证据 | playground/reports/evidence/1-2026-11-10/w8-principle-migrate-callers-then-delete-legacy-apis-raw-2026-11-10T09-02-32-634Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-minimize-reader-load

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 在评审或打磨难以追踪的代码时适用。数清问题到答案之间的层数、读者脑中的隐藏状态，收起单调用包装，缩小可变作用域。 |
| 当前实现：会话结果 | turnEnd=completed，调用 12 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w9-principle-minimize-reader-load-raw-2026-11-10T08-59-50-451Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-model-the-domain

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 在写有状态逻辑，或代码大量分支、多文件重复同一形状假设时适用。用状态机、类型化模型、注册表、reducer、边界等结构表达领域，而非散落条件判断。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 17 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w10-principle-model-the-domain-raw-2026-11-10T08-57-40-849Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-never-block-on-the-human

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 在可逆的工作上忍不住想问“我该做 X 吗”时适用。继续推进，呈现结果，让人来纠偏。 |
| 当前实现：会话结果 | turnEnd=completed，调用 15 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w11-principle-never-block-on-the-human-raw-2026-11-10T08-59-29-304Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-outcome-oriented-execution

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 在有明确阶段边界的计划性重写和迁移中适用。收敛到目标架构，不要用一次性兼容代码保留平滑的中间态。 |
| 当前实现：会话结果 | turnEnd=completed，调用 4 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w0-principle-outcome-oriented-execution-raw-2026-11-10T09-04-33-058Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-prove-it-works

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 在完成任务后、宣布完成前适用。针对真实产物验证（运行功能、读取真实值、查看 diff），而不是代理、自述或“能编译”。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 20 次 |
| 当前实现：工具错误 | bash |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载）；bash 缺少 description（X3） |
| 证据 | playground/reports/evidence/1-2026-11-10/w1-principle-prove-it-works-raw-2026-11-10T09-07-47-780Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-redesign-from-first-principles

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 在把新需求整合进既有设计时适用。像它从第一天就是基础设计那样重新设计。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 15 次 |
| 当前实现：工具错误 | bash |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载）；bash 缺少 description（X3） |
| 证据 | playground/reports/evidence/1-2026-11-10/w2-principle-redesign-from-first-principles-raw-2026-11-10T09-05-20-154Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-separate-before-serializing-shared-state

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 当并发参与者可能写入同一文件、分支、键或状态对象时适用。先消除共享；只有当单一共享写者确为不变式时才在结构上串行化。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 20 次 |
| 当前实现：工具错误 | grep、skill |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w3-principle-separate-before-serializing-shared-state-raw-2026-11-10T09-07-02-530Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-sequence-verifiable-units

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 适用于多步工作（扫尾、迁移、成批相似改动）与如何堆叠提交和 PR。拆成每个以可验证状态收尾的小单元，逐一检查后再继续。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 24 次 |
| 当前实现：工具错误 | bash、skill |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载）；bash 缺少 description（X3） |
| 证据 | playground/reports/evidence/1-2026-11-10/w4-principle-sequence-verifiable-units-raw-2026-11-10T09-08-39-706Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-subtract-before-you-add

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 在安排新增、重构或重写时适用。先移除死代码、冗余校验和桩引用，再在更简单的基础上构建。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 9 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w5-principle-subtract-before-you-add-raw-2026-11-10T08-59-53-023Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-test-behavior-not-implementation

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 在你编写、修改或保留一个测试时适用。断言代码使用者能观察到的行为，使该行为被破坏时测试失败，而只改内部实现时测试仍通过。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 20 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w6-principle-test-behavior-not-implementation-raw-2026-11-10T09-05-18-648Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### principle-type-system-discipline

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 在设计类型、评审函数签名或用静态类型语言写代码时适用。让非法状态无法表示，为语义原始类型打品牌，在边界解析外部数据，穷尽变体。 |
| 当前实现：会话结果 | turnEnd=completed，调用 13 次 |
| 当前实现：工具错误 | edit |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w7-principle-type-system-discipline-raw-2026-11-10T09-07-18-639Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### recall

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 从聊天历史、实时状态和共享记录重建近期工作上下文，交回一份紧凑的当前状态简报，适用于“回忆我在 X 上的工作”或开始、恢复工作前。 |
| 当前实现：会话结果 | turnEnd=completed，调用 22 次 |
| 当前实现：工具错误 | skill |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w8-recall-raw-2026-11-10T09-04-58-287Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### reflect

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 针对当前对话记录并行派出三个评审子代理，提炼经验并把每条落到某个既有技能的具体修改上。适用于用户说 reflect 时。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 41 次 |
| 当前实现：工具错误 | skill |
| 当前实现：缺口 | 无早期信号缺口 |
| 证据 | playground/reports/evidence/1-2026-11-10/w9-reflect-raw-2026-11-10T09-01-16-777Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### setup-pstack

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 配置 pstack 每个角色用哪些模型、以什么推理预算运行。检测可用模型并写出一条始终生效的规则覆盖技能默认值。适用于 /setup-pstack。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 33 次 |
| 当前实现：工具错误 | bash |
| 当前实现：缺口 | bash 缺少 description（X3） |
| 证据 | playground/reports/evidence/1-2026-11-10/w10-setup-pstack-raw-2026-11-10T09-00-01-999Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### sharpen

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 让任务变得更深入而非更庞大，然后重写 prompt。在 /sharpen 时使用。 |
| 当前实现：会话结果 | turnEnd=completed，调用 0 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w11-sharpen-raw-2026-11-10T09-01-03-579Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### show-me-your-work

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 为长时间或无人值守的工作保留可审阅的决策轨迹：一张每行一条决策（做什么、为什么、证据、结果）的 TSV 日志，默认留本地，需要审计时再提交。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 39 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 无早期信号缺口 |
| 证据 | playground/reports/evidence/1-2026-11-10/w0-show-me-your-work-raw-2026-11-10T09-05-10-119Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### statechart

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 检查在状态间迁移的系统（产品流程、协议或服务）的 TLA+ 模型，画成 Mermaid statechart，并给出到达每个破坏规则状态的最短路径；适用于 /statechart 或把 bug 表现为状态路径。 |
| 当前实现：会话结果 | turnEnd=completed，调用 23 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w1-statechart-raw-2026-11-10T09-10-07-229Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### swarm

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 并行扇出 N 个 worker，等它们跑完再返回一份报告。适用于 /swarm、“swarm 这个”，或并行覆盖、竞争、车轮战与探索。 |
| 当前实现：会话结果 | turnEnd=completed，调用 15 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w2-swarm-raw-2026-11-10T09-07-42-707Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### tdd

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 仅在用户明确要求 TDD、失败测试或回归测试时使用，或当 bug 有明显且廉价的本地测试目标时使用。测试路径不清、昂贵、集成繁重时跳过。 |
| 当前实现：会话结果 | turnEnd=completed，调用 11 次 |
| 当前实现：工具错误 | bash |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载）；bash 缺少 description（X3） |
| 证据 | playground/reports/evidence/1-2026-11-10/w3-tdd-raw-2026-11-10T09-09-23-349Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### teach

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 把一批工作讲解清楚，让人真正理解。运行 how 与 why 技能，把发现织成一段清晰的解释。适用于“教我这个”“帮我真正理解 X”。 |
| 当前实现：会话结果 | turnEnd=completed，调用 30 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w4-teach-raw-2026-11-10T09-11-00-410Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### technical-writing

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 分层技术写作标准：Diátaxis 结构、Google 开发者文风、STE 指令规则、Global English 语法。适用于 /technical-writing，或撰写评审文档、RFC、readme、PR 描述与提交信息时。 |
| 当前实现：会话结果 | turnEnd=completed，调用 11 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w5-technical-writing-raw-2026-11-10T09-02-14-050Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### typescript-best-practices

| 维度 | 内容 |
| --- | --- |
| 上游能力 | TypeScript 最佳实践。在阅读或编辑任何 .ts 或 .tsx 相关代码时使用。 |
| 当前实现：会话结果 | turnEnd=completed，调用 14 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w6-typescript-best-practices-raw-2026-11-10T09-07-40-459Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### unslop

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 去除任何写作中的 AI 腔调，让文字读起来不像机器生成。 |
| 当前实现：会话结果 | turnEnd=completed，调用 3 次 |
| 当前实现：工具错误 | 无 |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载） |
| 证据 | playground/reports/evidence/1-2026-11-10/w7-unslop-raw-2026-11-10T09-09-28-778Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

### why

| 维度 | 内容 |
| --- | --- |
| 上游能力 | 适用于“为什么 X 这样运作”“为什么选 Y”、设计理由、回归、复盘或数据支撑的阈值。发现可用 MCP，并行查询各类证据后返回带引用的决策与取舍解读。 |
| 当前实现：会话结果 | turnEnd=aborted，短探针截断，调用 45 次 |
| 当前实现：工具错误 | read、skill、bash |
| 当前实现：缺口 | 技能未被成功加载（X1，隐藏技能无法用标准 skill 工具加载）；bash 缺少 description（X3） |
| 证据 | playground/reports/evidence/1-2026-11-10/w8-why-raw-2026-11-10T09-07-42-821Z.json |
| 建议的 dsh.md 适配 | 待审批填写 |
| 建议的插件工具 | 待审批填写 |
| 审批状态 | 待审批 |

## 显式排除清单

| 技能 | 理由 |
| --- | --- |
| make-bot-ui | 依赖 Cursor Automations 的 routine 与 SendToUser webhook（sender key、wake loop），DSH 无对应服务，按 dsh.md Cursor-only features 舍弃 |

## cursor-only 审计

对 lock 内 58 个技能逐个核对 dsh.md 的 Cursor-only features（Automations/routines、Bugbot、cloud agents、Cursor Projects、内置 PR 工具）。

- 依赖并排除：make-bot-ui。
- 仅正文提及但不依赖：poteto-help、poteto-mode，说明里涉及 Bugbot 或 cloud，但实际路径用 gh 与本地工具，不排除。
- 其余技能无 Cursor-only 依赖，cursorNote 记为 none used。

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
