# Playground agent 须知

- 本目录只做 browser 验证，不新增 headless 用例或 headless  runner。
- 启动用 `vp run playground:prepare`，改了插件源码先 `vp run build` 再 `--reset` 重启。
- 端口固定 17353。已有实例时沿用或先 `vp run playground:stop`，不自行换端口或停其他服务。
- 运行期 DSH home 是 `playground/.dsh`，浏览器 profile 是 `playground/.browser`。不要另建测试 home 或 profile。
- 环境准备一律走 prepare 与 bootstrap 脚本。手动步骤与常见坑见 `docs/workspace-session.md`。
- 浏览器操作序列必须在单一进程内完成，agent-browser daemon 随进程树退出。
- 用例 prompt 必须是自然的用户请求，不得点名工具或展开调用参数。阶段二每个目标首次调用成功才算通过，失败后重试、重复加载或先错后对判失败。
- 阶段一不判通过，失败即发现，写入 reports 的 findings。
- 不要用例并发运行，也不要与手动会话共享同一运行期配置做写入。
- 真实会话的模型选择由用户确认。agent 用 `playground/.dsh/sessions/` 下的会话事件佐证调用与返回。
