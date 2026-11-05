# pstack 移植审查报告

- 轮次（round）：`baseline`
- 上游提交：pstack `ae5650febf4320793844c12c4adaa937f417f8da`（`0.15.36`）；DSH `05b1cae8db6e674c5685101494d4eec24652424a`（`0.2.2-alpha.3`）
- 开始时间（started_at）：2026-11-04T22:20:39+08:00
- 审查日期：2026-11-05（`review port` 全量复核）
- 受审提交：本仓 `532bff36afee55edffd884f2fbfad29fe8e0d799`（`implement port` 产物）；`audit` 基线 `c7227f9`
- 适用约定：根 `AGENTS.md`（Vite+ 门禁与 playground 唯一真实环境）、`docs/decisions/AGENTS.md`（决策检索）、`docs/architecture.md`（模块边界）。相交 accepted 决策：[插件工具面](../decisions/2026-10-28-pstack-plugin-tools.md)、[生成树与适配树](../decisions/2026-10-29-pstack-harness-tree-port.md)、[Web profile 基准](../decisions/2026-11-04-web-profile-baseline.md)、[DSH 命名空间外链](../decisions/2026-11-04-dsh-namespace-external.md)、[playground 真实测试](../decisions/2026-10-30-playground-real-plugin-testing.md)、[pnpm catalog 分类](../decisions/2026-10-30-pnpm-catalog-dependencies.md)、[pnpm 默认 store home](../decisions/2026-10-30-pnpm-default-store-home.md)、[脚本命令位置](../decisions/2026-10-30-script-commands-in-vite-config.md)、[配置页 i18n](../decisions/2026-10-30-pstack-config-page-i18n.md)、[skills 目录边界](../decisions/2026-10-28-skills-directory-scope.md)、[决策状态更新](../decisions/2026-10-28-decision-skill-lifecycle.md)。与当前实现一致，无冲突；`proposed` 记录不作为本轮审查依据。破坏性版本边界按 `references/contract.md` §6 与 [破坏性分界政策](../decisions/2026-11-04-dsh-breaking-version-boundary-policy.md)（proposed，待落地方向）、[破坏性提交格式](../decisions/2026-11-04-breaking-change-commit-format.md)（proposed）核对。
- 验证环境：本仓 workspace-write 沙箱（`/home/leihaohao/workspace/dsh-pstack`，`vp v1.5.0` 本地 `vite-plus v1.4.0`），pstack `ae5650f` / DSH `05b1cae` 固定子模块提交，无网络依赖。真实运行层按 [playground 真实测试决策](../decisions/2026-10-30-playground-real-plugin-testing.md)：涉及用户所选模型的会话由用户操作并确认，本轮只做命令/配置层，不代跑真实会话、不另建 home 或 profile。

## Findings

（本轮全量复核未发现开放 finding；无 `status: active` FIX、无 `fixed-pending-review` 待复核项、无待修复 port finding、无 EXT 破坏、无 replay 冲突或退役候选。详见下节逐项观察。）

| 维度 | 观察 | 结论 |
|---|---|---|
| README 能力与覆盖 | 135 项原子能力、47 映射 / 72 标准 / 3 可选 / 13 平台排除计数与 §3.1、§9.4 一致；§8 审查列沿用上轮「通过」，本轮无需求或分类变化 | 无开放 finding |
| core `required_behavior` | 本轮无 core Issue / EXT 输入，无 core `required_behavior` 待覆盖 | 无 |
| 公共 API | 在 DSH `05b1cae` 复核 `ctx.skills.get()`（`packages/skill/skill/src/index.ts:500`）、`ctx.llm.listProviders/listModels/resolveModelInfo`（`packages/llm/llm/src/index.ts:483/718`）、`ctx.subagents.startActivation`（`packages/subagent/subagent/src/index.ts:264`）签名未变；`host-contract.ts` 全为 `import type`，无运行期依赖 | 无漂移 |
| 权限与副作用 | `pstack_skill` 只读并按相对路径越界检查；`pstack_models`/`pstack_roles` 只读；`pstack_subagent` 每次委派重读角色文件、写工具由 preset 静态移除；`pstack_script` 封闭 id 用 `process.execPath` 启动（AD-01 已接受的沙箱代价） | 与 §6.1 一致 |
| 最小性 | `implement port` 提交 `532bff3` 的 `git diff --name-only` 仅 `docs/port-review.md`、`docs/port-state.yaml`、`pstack/README.md`；未改 `src/**`、`tests/**`、`pstack/runtime/**`、`pstack/harness/**`；`pstack/pstack/` 与 `dist/` 无手写 | 最小 |
| 共享影响 | 5 条门禁、全部 active EXT 验收测试、runtime PI 套件、显式 typecheck 全通过；`generate --check` 无漂移；EXT 登记表 3 项保持 `active`、无意外变化 | 无回归 |
| 适配文档门禁 | `check:harness-doc` 通过（无 FAIL，不触发 R-12 开放 finding） | 通过 |
| DSH 破坏性版本边界（§6） | `engines.dsh: >=0.2.2-alpha.3`；`peerDependencies.@deepseek-ai/cordis: catalog:types`（`~4.0.6-alpha.2`）；`pnpm-workspace.yaml` 的 `catalog:types` 各 `@deepseek-ai/dsh-*` 均为 `0.2.2-alpha.3`、`minimumReleaseAgeExclude` 同步 `alpha.3`；`pnpm-lock.yaml` 一致；`src/**`/`tests/**` 无旧 DSH 兼容分支（仅 `tests/optional-plugins.test.ts` 的版本对照守卫）；`pstack/README.md` 与 `dsh.md` 无旧版不支持说明；`dsh.md` 仅六个模板章节 + `## Local replacements` + `## Optional plugins`；双语根 README 有版本对照表（`0.2.2-alpha.3` 及更新 / `0.2.2-alpha.2` 及更早 `v0.2.1`）；破坏性提交 `c1870fd feat!: support dsh0.2.2-alpha.3` 使用 `type!:` | 对齐 |
| 范围检查 | 工作树审查起始为 clean；本分支只写 `docs/port-review.md`、`pstack/README.md` 审查字段与 `docs/port-state.yaml` 阶段字段 | 符合 §4 写入边界 |

## 实现记录

`implement port` 的范围是 `pstack/README.md` 第 5 节的 `PI-01`～`PI-09`（`PI-04` 已随上游 `1ba91fc` 删除 `orch.ts` 与 `store.ts` 退役），以及 `docs/port-fixes.yaml` 中 `status: active` 的 FIX。本轮 `docs/port-fixes.yaml` 的 `fixes` 为空，没有 active FIX；8 个插件内实现项逐项读取现有实现后全部记为「保留」，生产代码沿用已通过前轮审查的实现，本轮没有新增、修改或删除代码。

保留依据：`docs/port-prepare.md` 已确认 pstack 子树在 `4dd1d05..ae5650f` 间无文件差异（树哈希同为 `4719e1c4b4c43bac85d4206a8b41dd2899769c1c`）；本轮 DSH 参考提交与上一轮同为 `05b1cae`（`0.2.2-alpha.3`），公共接口按该提交复核签名未变。`vp run typecheck`、`vp check` 通过，没有出现需要改动 `src/**`、`tests/**`、`pstack/runtime/**` 或 `pstack/harness/**` 的新需求。

本轮沿用已落地的 DSH 破坏性版本边界，并按当前提交复核无漂移（见 Findings 的版本边界行）。`docs/decisions/AGENTS.md` 检索出的相交 accepted 决策与当前实现一致，无冲突；`proposed` 记录不作为本轮实现依据。

| 编号 | 覆盖能力 | 实现位置 | 验证用例 |
|---|---|---|---|
| PI-01 | `TOOL-04b`、`SKL-01`、`SKL-02`、`SKL-29` | `src/skill.ts`、`src/internal/skill-provider.ts`、`src/internal/frontmatter.ts`、`src/index.ts` | `tests/skill.test.ts`：隐藏技能按名称加载、相对资源可读且拒绝绝对路径与 `../` 越界、未知名称报错、非法名称在访问注册表前拒绝；`tests/skill-provider.test.ts`：frontmatter 解析、重名拒绝、伪造 locator 拒绝 |
| PI-02 | `MOD-01`、`MOD-04`、`MOD-06`、`SET-01`、`SET-02`、`SET-04`、`SET-06` | `src/models.ts`、`src/subagent.ts`、`src/internal/role-config.ts`、`src/internal/role-manifest.ts`、`src/internal/role-grammar.ts`、`src/internal/role-editor.ts`、`src/internal/effort.ts` | `tests/models.test.ts`（provider、route、effort 枚举与过滤）、`tests/subagent.test.ts`（角色行、自动面板、`roleIndex`、缺失回退、旧文件名忽略、格式错误行号）、`tests/role-editor.test.ts`（17 角色快照、单行写回、幂等、校验拒绝、不可读文件保护）、`tests/effort.test.ts`（effort schema 与模型选择） |
| PI-03 | `SCR-01`、`PB-21` | `pstack/runtime/skills/poteto-mode/scripts/check-plan.mjs`（源 `check-plan.ts` 编译产物） | `check-plan.test.ts`：H1、How to read this、Program checklist、五个 program H3、10 lanes、perf 四项、review gate、appendix 与退出码 1/2；DSH tick 同时接受 `/loop 1h` 或 `create_goal` 加 `schedule_create` |
| PI-05 | `SCR-02`、`PB-13`、`PB-14`、`PB-17`、`PB-18` | `pstack/runtime/skills/poteto-mode/scripts/watch-pr/{watch-pr,cli,github,policy,render,types}.ts` | `watch-pr/cli.test.ts`、`github.test.ts`、`policy.test.ts`：single、stack、queued-stack、`--status-only`、JSON 与 pretty、四种 verdict、退出码、`gh` 读取与分页、Bugbot review pass 计数 |
| PI-06 | `SCR-03`、`PB-22` | `pstack/runtime/skills/poteto-mode/scripts/worktree-audit.ts` | `worktree-audit.test.ts`：TSV 列、base 解析、bucket 分类、未知 usage 不判 safe、目录符号链接不遍历 |
| PI-07 | `SCR-04`、`SKL-30`、`PB-04` | `pstack/runtime/skills/show-me-your-work/scripts/log.ts` | `log.test.ts`：header 只写一次、UTC 时间戳、tab 与换行清理、公式前缀转义、用法错误退出 1 |
| PI-08 | `SUB-02`、`SUB-03`、`AGT-01`、`AGT-02`、`SKL-05`、`SKL-24` | `cordis.patch.yml` 的 `poteto-agent` 与 `comment-sicko` preset、`src/subagent.ts`、`src/internal/effort.ts` | `tests/subagent.test.ts`：agent 到 preset 映射、poteto-agent 注入 `poteto-mode` 绝对路径、comment-sicko 静态移除 `write` 与 `edit`、普通子代理行为不变、`maxDepth` 省略/null/0 默认 1；`tests/effort.test.ts`：运行中改 effort 走 `Agent.model.select` |
| PI-09 | `SCR-05`、`SKL-33` | `pstack/runtime/skills/statechart/scripts/**`（26 个源文件，另 1 个精选行为测试；随包不含上游 corpus） | `statechart.test.ts`：TLA+ 值语法、配置、消息、pipeline、缺 spec 退出 2、fake TLC 的 worker 路径与 `report.md`、`chart.mmd`、`tlc.out`、`tlc-RULE.out` 输出 |

`pstack_script` 的五个 id 由 `src/internal/script-registry.ts` 固定为 `check-plan`、`watch-pr`、`worktree-audit`、`log`、`statechart`；`pstack/scripts/replace-scripts.mjs` 的 `REPLACED` 集合为 `poteto-mode`、`show-me-your-work`、`statechart`，构建时整目录替换上游附带的脚本。

### 公共接口与权限边界

| 工具 | 公共接口 | 权限与副作用 |
|---|---|---|
| `pstack_skill` | `ctx.skills.get(name)`；只读 `SKILL.md` 与技能目录内的相对资源 | 只读；资源路径经过绝对路径与 `../` 越界检查；不进入宿主文件系统写入 |
| `pstack_models` | `ctx.llm.listProviders()`、`listModels()`、`resolveModelInfo()` | 只读；不写文件，不推断 live adapter 未报告的 route；单 provider 失败不影响其他 provider |
| `pstack_roles` | `src/internal/role-manifest.ts` 的 `ROLE_MANIFEST` | 只读；无参数；`shape`、`autoPanel`、`roleIndex` 适用性直接来自 manifest |
| `pstack_subagent` | `ctx.subagents.startActivation`，preset 由 `cordis.patch.yml` 声明 | 每次委派重读 `$DSH_HOME/pstack-models.mdc`；启动前统一校验 route 与 effort；`comment-sicko` 的写工具由 preset 静态移除；`maxDepth` 默认 1、`pstack-subagent` 行配置上限 2 |
| `pstack_script` | `src/internal/script-registry.ts` 的封闭 id 集合 | 用 `process.execPath` 启动随包脚本；不经过 bash 审批与文件系统沙箱是 AD-01 已接受的代价 |

### 上游对照

| 文件组 | 对照结果 |
|---|---|
| `watch-pr/{cli,github,policy,render,types}.ts` | 与 pstack `ae5650f` 逐字相同；`watch-pr` 启动器去掉 Bun bootstrap，改为 Node 入口；测试按 DSH 环境适配 |
| `statechart/{run,worker,pipeline,ir}.ts`、`backends/**`、`frontends/**`、`passes/**` | `worker.ts`、`ir.ts`、`backends/**`、`frontends/**`、`passes/**` 与上游逐字相同；`pipeline.ts` 只去掉未使用的类型导入，`run.ts` 只补 `exitClass` 的返回类型，`statechart.ts` 只按运行文件扩展选择 `worker.ts` 或 `worker.mjs` |
| `check-plan.mjs` | 只把 `/loop 1h` 检查扩展为 `/loop 1h` 或 `create_goal` 加 `schedule_create` 的 DSH tick；其余检查不变 |
| `worktree-audit.ts`、`log.ts` | Node 等价重写，输入、输出格式与退出码由行为测试固定 |
| `statechart/scripts/test/**` | 按 7.1 的 B 方案不随包发布；入口行为由精选测试覆盖，TLC 端到端留在有 `TLA2TOOLS`、Java、mise 的环境复核 |

## 验证记录

本分支按 `references/review.md` §3 运行全部五条门禁，并逐项运行全部 `active` EXT 验收测试（不抽查）与全部 `active` FIX replay（台账为空，无 active 记录）。每条命令记录实际退出码。

### 五条门禁（`review port` 要求全部运行）

| # | 命令 | 退出码 | 结果 |
|---|---|---|---|
| 1 | `vp check` | 0 | 94 个文件格式正确；0 errors；1 个既有 warning：`pstack/scripts/generate-pstack-harness-tree.mjs:204` 的 `require-array-sort-compare`（非本轮新增） |
| 2 | `vp test` | 0 | 18 个测试文件、123 个测试通过 |
| 3 | `vp run @internal/pstack#check:harness-doc` | 0 | `harness doc is consistent with README, the upstream template, and src.`；`generate --check` 子任务 `pstack/pstack is up to date.`（2/2 任务成功） |
| 4 | `node pstack/scripts/generate-pstack-harness-tree.mjs --check` | 0 | `pstack/pstack is up to date.` |
| 5 | `node pstack/scripts/port-fixes.mjs replay` | 0 | `No active FIX records; replay passed.` |

### 全量 active EXT 验收测试（不抽查）

| EXT | 验收测试 | 退出码 | 结果 |
|---|---|---|---|
| EXT-003 角色模型配置页 | `vp test` `tests/role-page.test.tsx`、`role-editor.test.ts`、`role-state.test.ts`、`roles-remote.test.ts`、`roles-service.test.ts`、`role-catalog.test.ts`、`effort.test.ts`、`models.test.ts` | 0 | 8 文件、56 测试通过 |
| EXT-004 推荐可选插件启用页 | `vp test` `tests/optional-plugins.test.ts`、`optional-plugins-page.test.tsx` | 0 | 2 文件、21 测试通过（含 DSH `05b1cae` 版本对照与 forge/worktree 合并守卫） |
| EXT-005 bundle 配置模态框 | `vp test` `tests/bundle-config-dialog.test.tsx`、`client-plugin.test.ts` | 0 | 2 文件、4 测试通过 |

三个 EXT 登记表状态保持 `active`，无 `broken`，工作文件无待处理项（验收证据在对应 Issue 验收评论，符合 contract §2）。

### 补充验证

| 检查 | 命令或用例 | 退出码 | 结果 |
|---|---|---|---|
| 运行时 PI 套件 | `vp run @internal/pstack#test` | 0 | 12 suite、76 测试通过、0 失败（check-plan / watch-pr / worktree-audit / log / statechart 行为） |
| 显式类型 | `vp run typecheck` | 0 | `tsc --noEmit -p tsconfig.json` 通过（缓存命中） |
| 版本边界 | `grep` 核对 `package.json`、`pnpm-workspace.yaml`；`tests/optional-plugins.test.ts` | 0 | `engines.dsh: >=0.2.2-alpha.3`；各 `dsh-*` catalog 为 `0.2.2-alpha.3`；`minimumReleaseAgeExclude` 同步 `alpha.3`；版本对照只在双语根 README；破坏性提交 `feat!:`；`dsh.md` 无旧版说明、仅两追加小节 |
| 公共接口 | 在 DSH `05b1cae` 复核 `skills.get` / `llm.listProviders,listModels,resolveModelInfo` / `subagents.startActivation` 源码签名 | — | 签名未变，`host-contract.ts` 全为 `import type` |
| 范围检查 | `git diff --name-only 532bff3^ 532bff3` | — | 仅 `docs/port-review.md`、`docs/port-state.yaml`、`pstack/README.md`；无 port 基线手写源改动 |

## 范围检查

本轮 `review port` 改动只涉及 `docs/port-review.md`（本文件，全量复核证据）、`pstack/README.md` 的审查字段更新、`docs/port-state.yaml` 的阶段字段（`phase: doc`）。`docs/extensions.md`、`docs/port-fixes.yaml`、`docs/port-fixes-archive.yaml` 无差异；`src/**`、`tests/**`、`pstack/runtime/**`、`pstack/harness/**` 无改动；`pstack/pstack/` 与 `dist/` 只由生成器与构建刷新，没有手写。审查起始工作树为 clean。

## 未解决限制

无新增未解决限制。`pstack/README.md` §9.3 的 `U-01` 至 `U-05` 保持原样：视频录制工具链、子代理 transcript 覆盖、浏览器截图证据、连续工作树创建、宿主外部命令可用性仍按「当前提交未证实」处理，不在本轮实现范围内。真实会话层未在本轮执行：按 playground 决策，涉及用户所选模型的会话由用户操作并确认；本轮未启动 web 服务、未运行真实会话、未另建 home 或 profile。这些是有意跳过项，不计为失败。

## 结论

所有 `active` EXT 测试通过、FIX replay 通过（无 active 记录）、135 项能力与 core 需求（本轮无 core 输入）逐项覆盖、五条门禁退出 0、无开放 finding、DSH 破坏性变更轮次的版本边界与提交标记核对完成。按 `references/review.md` §3.3 通过处理：`port.phase` 设为 `doc`，`blocker` 保持 `null`，下一步 `/pstack-port doc`。
