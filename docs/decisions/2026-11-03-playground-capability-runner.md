# 决定：playground 增加允许模型清单与能力自动化 runner

Status: proposed
Date: 2026-11-03
Scope: playground/**, vite.config.ts, docs/architecture.md, docs/glossary.md
Implemented-by: -
Review: 2027-05-03

## 背景

playground 目前只提供真实环境与场景清单，真实会话必须用户手动跑，移植能力（`pstack_skill` / `pstack_models` / `pstack_subagent` / panel / `pstack_script`）的真实行为无法被 agent 自动回归。用户希望用一份「允许 agent 使用的模型（含思考等级）」前提配置，让 agent 跑用例时自动写 `pstack-models.mdc` 并执行。2026-10-30 决策规定 playground 不内置写死插件内容的断言脚本；能力级 runner 只断言工具契约的可观察事实（child 数量、route 互异、脚本输出），不写死插件文案或 UI。

## 决定

- 配置来自 `playground/config.json`（`playground/config.example.json` 模板，gitignore）：每个 provider 一层，含 `apiKey` 与“模型 → 思考等级”；runner 按部署的 `apiKeyEnv` 注入 key 并校验路由。
- 新增 `playground/run-cases.mjs`（用例逻辑）、`playground/cases-run.mjs`（用 Vite `runnerImport` 运行，使 `import.meta.glob` 生效）与根 `vite.config.ts` 的 `cases` / `cases:list` / `cases:check` task；用例为 `playground/cases/*.case.mjs`，经 `import.meta.glob("./cases/*.case.mjs", { eager: true })` 动态注册；runner 读 `config.json`、用 `playground/.dsh/cordis.patch.yml` 校验路由属于本机部署、按用例临时写 `pstack-models.mdc`、用 `dsh headless --json --profile pstack-headless` 跑真实会话、解析 `tool_call` / `tool_result` 做能力级断言、报告写 `playground/.dsh/cases-report/`。
- runner 缺所需 provider key 时直接失败，不静默跑；preset 用例因 headless 缺 `agentPresets` 服务仍留 web 会话。

## 备选方案

- **只保留手动用例。** 不可自动回归，用户要逐条手跑；不选。
- **让 agent 驱动已开的 17353 web 会话。** 凭据在进程内，但浏览器驱动脆弱且越过「真实会话由用户操作」口径；不选（保留为备选）。
- **把断言写进 `tests/`。** mock 宿主覆盖不到真实工具派发与子代理路由；不选。
- **把允许模型写死在提交文件。** 会把本机特定路由写进版本库；不选。

## 后果

- 在 `config.json` 填好 provider apiKey 后，agent 一条命令自动跑能力用例并出报告；未填时仍可手动跑。
- runner 共享 `playground/.dsh`，会临时改写 `pstack-models.mdc`，不能与手动会话并发；preset 能力仍需 web 会话。
- 依赖 headless 事件流（`tool_call` / `tool_result`）与 `dsh-headless` bundle；DSH 升级若改事件结构需同步 runner。
