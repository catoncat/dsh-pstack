# Playground agent 须知

- 本目录只做真实浏览器验证。
- 环境准备与执行一律走脚本，手动步骤与常见坑见 `docs/workspace-session.md`。
- 端口不再固定。每个 worker 用 `dsh --port 0` 动态分配端口，从启动输出解析真实端口。不要写死任何固定端口。
- 多 worker 各自一套运行期目录，全在 `playground/.workers/w<k>/` 下（home、browser、workspace、evidence）。不要跨 worker 共用 home 或浏览器 profile。
- worker 数默认按机器核数与可用内存自适应，`--workers N` 可覆盖。worker 内串行，worker 间并行。
- 改了插件源码先 `vp run build` 再 `--reset` 重启。
- 浏览器操作序列必须在单一进程内完成，agent-browser daemon 随进程树退出。并行只能靠多个子进程，不能在一个进程里并发 agent-browser。
- 用例 prompt 必须是自然的用户请求，不得点名工具或展开调用参数。adapted 轮每个目标首次调用成功才算通过，失败后重试、重复加载或先错后对判失败。
- raw 轮以短探针为主，只取技能加载、preset、首轮工具错误这类早期信号，到点点击停止按钮中止，证据标 `truncated`。adapted 轮完整回归用 `--timeout` 等 turn/end。
- raw 轮不判通过，失败即发现，写入 `reports/skill-audit.md`。每次运行生成的 `reports/run-raw-*.md` 是产物，已忽略。
- 不要与手动会话共享同一运行期目录做写入。
- 真实会话的模型选择由用户确认。agent 用会话事件佐证调用与返回。

## 审核与审批

- `reports/skill-audit.md` 是待审批审核报告，每个技能一节，固定行：上游能力、当前实现与会话结果、当前实现与工具错误、当前实现与缺口、证据、建议的 dsh.md 适配、建议的插件工具、审批状态。两条建议行留空，由用户在审批时填写。
- 审批结果写回 `cases.lock.json`。每个技能记 caseFile、skillPath、skillHash、status、cursorOnly、cursorNote，审批后补 approvedAt、approvedRound、approvedHash。
- `cases.lock.json` 的 baseline 记 dshVersion、pstackCommit、compatibilityKey。上游 SKILL.md 哈希、pstack 提交或 DSH 版本范围变化时 `vp run playground:check` 报漂移，受影响的技能需重新审批，未变的沿用旧审批。
- 破坏性更新更换 baseline.compatibilityKey；approve 时会把当前 compatibilityKey 写进 approvedCompatibilityKey，换了 key 后旧审批自动失效，check 报需重新审批。README 兼容行由发布流程处理，不在 playground 重复。
- 审批命令是 `vp run playground:approve -- --skill a,b --round N`。
- 闭环：raw 轮跑完出 skill-audit，用户逐条审批并填写建议，按建议实现 dsh.md 与插件工具，`vp run build`，adapted 轮只跑失败用例，循环到没有实现缺陷，收敛后整体复跑一次。
- cursor-only 只排除真正依赖的技能，当前 make-bot-ui。poteto-mode、poteto-help、reflect 文本提到但已审为不依赖，理由在 lock 的 cursorNote。check 会扫描所有技能 Markdown，新技能提到 Cursor-only 能力即报待审，需排除或记入 CURSOR_MENTION_REVIEWED。
