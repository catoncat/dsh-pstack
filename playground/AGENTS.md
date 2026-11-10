# Playground agent 须知

- 本目录只做 browser 验证，不新增 headless 用例或 headless runner。
- 环境准备与执行一律走脚本，手动步骤与常见坑见 `docs/workspace-session.md`。
- 端口不再固定。每个 worker 用 `dsh --port 0` 动态分配端口，从启动输出解析真实端口。不要再写死 17353。
- 多 worker 各自一套运行期目录，全在 `playground/.workers/w<k>/` 下（home、browser、workspace、evidence）。不要跨 worker 共用 home 或浏览器 profile。
- 默认 4 个 worker，`--workers N` 可调。worker 内串行，worker 间并行。
- 改了插件源码先 `vp run build` 再 `--reset` 重启。
- 浏览器操作序列必须在单一进程内完成，agent-browser daemon 随进程树退出。并行只能靠多个子进程，不能在一个进程里并发 agent-browser。
- 用例 prompt 必须是自然的用户请求，不得点名工具或展开调用参数。阶段二每个目标首次调用成功才算通过，失败后重试、重复加载或先错后对判失败。
- 阶段一以短探针为主，只取技能加载、preset、首轮工具错误这类早期信号，到点点击停止按钮中止，证据标 `truncated`。阶段二完整回归用 `--timeout` 等 turn/end。
- 阶段一不判通过，失败即发现，写入 `reports/stage1-findings.md`。每次运行生成的 `reports/stage1-raw-*.md` 是产物，已忽略。
- 不要与手动会话共享同一运行期目录做写入。
- 真实会话的模型选择由用户确认。agent 用会话事件佐证调用与返回。
