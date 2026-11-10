# Playground

本目录是 dsh-pstack 的 browser-only 真实环境验证基建。它对 58 个上游技能逐个留存测试用例，在真实 DSH Web 会话里执行，证据来自持久化会话事件与截图。不做 headless 验证，headless 缺 Web 标准 preset 的服务，结论不代表 Web 行为。

## 两阶段流程

阶段一 raw 发现。环境不装 dsh-pstack，用官方 `@deepseek-ai/dsh-skill-filesystem` 挂载 `upstream/cursor-plugins/pstack/skills` 的原始技能。逐用例执行，只记录证据与缺口，不判通过。每个技能的缺口汇总成需要的 dsh.md 适配说明与需要的插件工具，写入 `reports/stage1-findings.md`。结论经用户确认后按 `port/AGENTS.md` 的流程回填 `port/audit.md`。

阶段二 adapted 回归。适配说明与插件工具落地后，用同名用例在装了 dsh-pstack 的环境镜像复验，按首轮通过口径判定。

## 多 worker 并行

每个 worker 一套独立运行环境，目录在 `playground/.workers/w<k>/` 下，各自独立的 DSH home、浏览器 profile、工作区根、证据目录与动态端口（`dsh --port 0`）。worker 数默认按机器核数与可用内存自适应，`--workers N` 可覆盖，worker 内串行、worker 间并行。端口不再固定。

## 准备

1. 仓库根目录 `vp install`，按 `port/AGENTS.md` 准备生成树后 `vp run build`。
2. 确认 `dsh` 在 PATH 中。
3. 复制 `config.example.json` 为 `config.json`，填允许的 provider、apiKey、模型与思考等级。该文件已忽略。
4. `vp run playground:prepare -- --mode raw --workers 4 --reset`，再 `vp run playground:bootstrap -- --all`。

环境准备细节、手动流程、常见坑见 `docs/workspace-session.md`。

## 任务

```sh
vp run playground:prepare -- --mode raw --workers 4 --reset   # 建 N 个 worker 并启动
vp run playground:bootstrap -- --all                          # 浏览器引导，关弹窗并校验直达工作区
vp run playground:check                                       # 58 技能静态可加载检查
vp run playground:run-batch -- --mode raw --workers 4 --all   # 并行跑批，短探针为主
vp run playground:run -- --worker 0 --case <id> --mode raw    # 单用例调试
vp run playground:collect -- --mode raw                       # 汇总证据为报告
vp run playground:status                                      # 打印单一进度文件
vp run playground:lock                                        # 重算用例与上游 lock
vp run playground:stop                                        # 停全部 worker 与浏览器
vp run playground:browser -- --worker 0 --shot out.png        # 临时浏览器操作
```

运行期目录 `playground/.workers` 与每次运行生成的 `reports/stage1-raw-*.md` 都已忽略，`reports/stage1-findings.md` 是人工整理的结论，进库。

## 用例

`cases/<skill>.ts` 一个技能一个文件，形状见 `types.ts`。工作流技能是完整行为用例，principle 叶子是轻量用例。prompt 必须是自然的用户请求，不点名工具或技能。`cases/index.ts` 是注册表。素材规模收到刚好触发该技能的工作流，重型用例不让模型在 raw 环境把整件事跑完。

## 判定口径

阶段一只记证据，以短探针取早期信号，证据标 `truncated`。阶段二首轮通过需要同时满足用户产物正确、没有工具错误、没有重复技能加载、没有先错后对。bash 返回 completed 不代表命令成功，判定看事件与产物。涉及模型选择的结论由用户确认，agent 用会话日志佐证。
