# pstack 移植审查报告

- 轮次（round）：`baseline`
- 上游提交：pstack `ae5650febf4320793844c12c4adaa937f417f8da`（`0.15.36`）；DSH `05b1cae8db6e674c5685101494d4eec24652424a`（`0.2.2-alpha.3`）
- 开始时间（started_at）：2026-11-04T10:46:34+08:00

## Findings

### DOC-01：OPT-01 与 OPT-02 的适配文档未同步 forge/worktree 合并

- `origin`：doc
- `status`：fixed-pending-review
- `affected_ext`：EXT-004
- `required_behavior`：`pstack/README.md` §1.8 已确认 DSH `05b1cae` 将 forge 面板与模型侧 `create_worktree` 合并到 `@deepseek-ai/dsh-experimental-forge-bundle`；适配文档必须同步说明 OPT-01 在 Web/Desktop 经 OPT-02 启用、独立 bundle 无 Plugins 卡片，以及 OPT-02 同时提供模型侧 `create_worktree`。双语根 README 必须保留这些启用条件与能力边界；文档状态与已验证基线须更新到本轮日期和 DSH `0.2.2-alpha.3`。`EXT-004` 的推荐目录与默认启用项仍指向独立 worktree bundle，需复核这是有意保留的非 Web 路径还是应改默认推荐，不能直接宣称 OPT-01 与 OPT-02 的启用行为已一致。
- `evidence`：当前 `pstack/harness/docs/harness/dsh.md` 的 OPT-01 行要求启用独立 worktree 包，OPT-02 行写「The optional bundle adds no model-side change-request tool」且未列 `create_worktree`；当前提交 DSH 的 [tool-worktree README](../upstream/deepseek-harness/packages/experimental/tool-worktree/README.md#L26-L37) 明确独立 bundle 无 Plugins 卡片且 Web/Desktop 经 forge bundle 提供工具，[forge-bundle README](../upstream/deepseek-harness/packages/experimental/forge-bundle/README.md#L26-L40) 明确同一开关同时挂载面板与模型工具。当前 `README.md` 与 `README.zh.md` 仍写 worktree 与 forge 可共存、已验证至 `0.2.2-alpha.2`，而 `src/internal/optional-plugins.ts` 仍把独立 tool-worktree 作为 OPT-01 默认推荐。`pstack/README.md` §8.5 文档完成日期仍为 2026-11-03，与本结论冲突。

## 实现记录

`implement port` 的范围是 `pstack/README.md` 第 5 节的 `PI-01`～`PI-09`（`PI-04` 已随上游 `1ba91fc` 删除 `orch.ts` 与 `store.ts` 退役），以及 `docs/port-fixes.yaml` 中 `status: active` 的 FIX。本轮没有 active FIX；8 个插件内实现项逐项读取现有实现后全部记为「保留」，生产代码沿用已通过前轮审查的实现，本轮没有新增、修改或删除代码。

保留依据：`docs/port-prepare.md` 已确认 pstack 子树在 `4dd1d05..ae5650f` 间无文件差异（树哈希同为 `4719e1c4b4c43bac85d4206a8b41dd2899769c1c`）；本轮 DSH 参考提交由 `ce7073d` 更新到 `05b1cae`（`0.2.2-alpha.3`），与插件公共接口相关的源码变化只有 `packages/preset/agent-preset-registry/src/mount.ts` 的 `EntryTree.commit` 内部签名调整，不触及插件实际使用的公共接口。`ctx.skills.get()`、`ctx.llm.listProviders/listModels/resolveModelInfo`、`ctx.subagents.startActivation`、`ctx.tools.register`、`ctx.workingDirectory.ensure` 的签名未变，`vp run typecheck` 与 `vp check` 通过；没有出现需要改动 `src/**`、`tests/**`、`pstack/runtime/**` 或 `pstack/harness/**` 的新需求。

| 编号 | 覆盖能力 | 实现位置 | 验证用例 |
|---|---|---|---|
| PI-01 | `TOOL-04b`、`SKL-01`、`SKL-02`、`SKL-29` | `src/skill.ts`、`src/internal/skill-provider.ts`、`src/internal/frontmatter.ts`、`src/index.ts` | `tests/skill.test.ts`：隐藏技能按名称加载、相对资源可读且拒绝绝对路径与 `../` 越界、未知名称报错、非法名称在访问注册表前拒绝；`tests/skill-provider.test.ts`：frontmatter 解析、重名拒绝、伪造 locator 拒绝 |
| PI-02 | `MOD-01`、`MOD-04`、`MOD-06`、`SET-01`、`SET-02`、`SET-04`、`SET-06` | `src/models.ts`、`src/subagent.ts`、`src/internal/role-config.ts`、`src/internal/role-manifest.ts`、`src/internal/role-grammar.ts`、`src/internal/role-editor.ts`、`src/internal/effort.ts` | `tests/models.test.ts`（provider、route、effort 枚举与过滤）、`tests/subagent.test.ts`（角色行、自动面板、`roleIndex`、缺失回退、旧文件名忽略、格式错误行号）、`tests/role-editor.test.ts`（17 角色快照、单行写回、幂等、校验拒绝、不可读文件保护）、`tests/effort.test.ts`（effort schema 与模型选择） |
| PI-03 | `SCR-01`、`PB-21` | `pstack/runtime/skills/poteto-mode/scripts/check-plan.mjs` | `check-plan.test.ts`：H1、How to read this、Program checklist、五个 program H3、10 lanes、perf 四项、review gate、appendix 与退出码 1/2；DSH tick 同时接受 `/loop 1h` 或 `create_goal` 加 `schedule_create` |
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

| 检查 | 命令或用例 | 退出码 | 结果 |
|---|---|---|---|
| 静态检查 | `vp check` | 0 | 95 个文件格式正确；0 errors；1 个既有 warning：`pstack/scripts/generate-pstack-harness-tree.mjs:204` 的 `require-array-sort-compare` |
| 显式类型 | `vp run typecheck` | 0 | `tsc --noEmit` 通过（缓存命中） |
| 插件测试 | `vp test` | 0 | 18 个测试文件、118 个测试通过 |
| 运行时测试 | `vp run @internal/pstack#test` | 0 | 12 个 suite、76 个测试通过、0 失败 |
| 构建 | `vp run build` | 0 | 5/5 任务成功；根发布 ESM 22 个文件、client 2 个文件；`replace:scripts` 替换 3 组技能脚本并解析 5 个 id |
| 生成树漂移 | `node pstack/scripts/generate-pstack-harness-tree.mjs --check` | 0 | `pstack/pstack is up to date.` |
| 适配文档对账 | `vp run @internal/pstack#check:harness-doc` | 0 | `harness doc is consistent with README, the upstream template, and src.`（2/2 任务成功） |
| FIX 重放 | `node pstack/scripts/port-fixes.mjs replay` | 0 | `No active FIX records; replay passed.` |
| 脚本入口 | 五个随包入口逐个调用 | 0/1/2 | `check-plan` 无参数 2、`watch-pr --help` 0、`worktree-audit --help` 0、`log` 无参数 1、`statechart` 无参数 2，符合各脚本契约 |
| 技能索引 | `node --input-type=module` 加载 `dist/index.mjs` 的 `loadBundledSkillIndexes(SKILL_ROOTS)` | 0 | 64 个技能加载成功，其中 61 个为隐藏技能，64 个为用户可调用 |
| playground 组合 | `DSH_HOME=$PWD/playground/.dsh dsh --profile pstack-playground --dump-config` | 0 | DSH `0.2.2-alpha.3` 合成配置包含六条 `dsh-pstack` 行、两个 agent preset 与 `pstack-subagent.maxDepth: 2` |

## 范围检查

本轮改动只涉及 `pstack/README.md` 的实现说明与审查字段、`docs/port-review.md` 的实现、验证与审查证据、`docs/port-state.yaml` 的阶段字段。`docs/extensions.md`、`docs/port-fixes.yaml`、`docs/port-fixes-archive.yaml` 无差异；`src/**`、`tests/**`、`pstack/runtime/**`、`pstack/harness/**` 无改动；`pstack/pstack/` 与 `dist/` 只由生成器与构建刷新，没有手写。`git diff --name-only` 仅列出上述三个文件。

## 审查记录（2026-11-04，review port）

- 受审提交：`d9ea909653ced57d4fd05623b6769d4cacb6314f`（`docs: pstack port baseline implement（PI 复核与 review 状态）`）；审查开始时 `git status --porcelain` 无输出。
- 上游基线：pstack `ae5650febf4320793844c12c4adaa937f417f8da`（`0.15.36`）；DSH `05b1cae8db6e674c5685101494d4eec24652424a`（`0.2.2-alpha.3`）。
- 审查范围：`pstack/README.md` 第 2～8 节全部 135 个能力行与 `PI-01`～`PI-09` 的实现；`docs/extensions.md` 的 3 个 `active` EXT；`docs/port-fixes.yaml` 中的全部 FIX；公共 API、权限、最小性与共享影响。
- 工作项：本轮没有 core Issue 或 core EXT；`active` EXT 为 EXT-003、EXT-004、EXT-005，均登记了验收历史；无 `proposed`、`broken`、`retired` 条目；无 `active` FIX。
- 审查结论：通过，无 open finding。`pstack/README.md` 的 122 个实现项审查列为 `通过`，13 个平台排除项为 `通过（平台排除）`；`docs/port-state.yaml` 的 `phase` 置为 `doc`。
- 适用 `AGENTS.md`：根 `AGENTS.md`（Vite+ 工具链、`.tmp` 与 `playground` 使用约定）、`playground/AGENTS.md`（固定端口与真实运行验证约定）与 `docs/decisions/AGENTS.md`（决策记录检索与状态规则）。
- 适用 accepted 决策：`docs/decisions/2026-10-28-pstack-plugin-tools.md`（`src/**`、`tests/**`、`cordis.patch.yml`）、`docs/decisions/2026-10-29-pstack-harness-tree-port.md`（`pstack/**`）、`docs/decisions/2026-10-28-skills-directory-scope.md`（`skills/**`）、`docs/decisions/2026-10-30-playground-real-plugin-testing.md`（真实运行验证环境）、`docs/decisions/2026-10-30-script-commands-in-vite-config.md`（构建与验证命令）、`docs/decisions/2026-10-30-pstack-config-page-i18n.md`（Client locale）。
- 验证环境：`vp` 环境 Node `24.22.1`（`package.json` devEngines；直接 `node --version` 为 `26.13.0`）、vite-plus `1.4.0`、pnpm `12.15.0`；单元与集成测试在仓库根执行；真实运行层使用 `playground/.dsh` 的 `pstack-playground` profile 做 `--dump-config` 检查，涉及用户所选模型的真实会话按 playground 决策由用户操作，本轮不代跑。

### 1. 门禁结果

| 检查 | 命令 | 退出码 | 结果 |
|---|---|---|---|
| 静态检查 | `vp check` | 0 | 95 个文件格式正确；0 errors；1 个既有 warning：`pstack/scripts/generate-pstack-harness-tree.mjs:204` 的 `require-array-sort-compare` |
| 显式类型 | `vp run typecheck` | 0 | `tsc --noEmit` 通过（缓存命中） |
| 构建 | `vp run build` | 0 | 5/5 任务成功；根发布 ESM 22 个文件、client 2 个文件；`replace:scripts` 替换 3 组技能脚本并解析 5 个 id |
| 插件测试 | `vp test` | 0 | 18 个测试文件、118 个测试通过 |
| 运行时测试 | `vp run @internal/pstack#test` | 0 | 12 个 suite、76 个测试通过、0 失败 |
| 适配文档对账 | `vp run @internal/pstack#check:harness-doc` | 0 | `harness doc is consistent with README, the upstream template, and src.`（2/2 任务成功） |
| 生成树漂移 | `node pstack/scripts/generate-pstack-harness-tree.mjs --check` | 0 | `pstack/pstack is up to date.` |
| FIX 重放 | `node pstack/scripts/port-fixes.mjs replay` | 0 | `No active FIX records; replay passed.` |
| playground 组合 | `DSH_HOME=$PWD/playground/.dsh dsh --profile pstack-playground --dump-config` | 0 | 合成配置包含六条 `dsh-pstack` 行、两个 agent preset 与 `pstack-subagent.maxDepth: 2` |

### 2. active EXT 验收测试

| EXT | required_behavior 摘要 | 验收测试 | 结果 |
|---|---|---|---|
| EXT-003 | 角色模型配置页：17 个角色、缺失/loaded/unreadable 状态、路由与 effort 编辑、重置、与 `/setup-pstack` 共用 `$DSH_HOME/pstack-models.mdc`、按行号报告问题 | `tests/role-page.test.tsx`（8）、`tests/role-editor.test.ts`（22）、`tests/role-state.test.ts`（6）、`tests/roles-remote.test.ts`（5）、`tests/roles-service.test.ts`（4），合计 45 个测试 | 退出 0；全部通过 |
| EXT-004 | 推荐可选插件启用页：OPT-01～OPT-09 分组与标签、bundle 状态、单项开关、一键启用推荐项、首次启用引导 | `tests/optional-plugins-page.test.tsx`（5）、`tests/optional-plugins.test.ts`（11），合计 16 个测试 | 退出 0；全部通过 |
| EXT-005 | bundle 配置模态框：仅 dsh-pstack bundle 显示「配置」、Settings 风格弹窗、插件/角色双分区、双语词典 | `tests/bundle-config-dialog.test.tsx`（2）、`tests/client-plugin.test.ts`（2），合计 4 个测试 | 退出 0；全部通过 |

EXT-003 的验收历史记录在 `docs/extensions.md`（Issue #2、#8、#14）；EXT-004 见 Issue #4；EXT-005 见 Issue #12。本轮重新运行上述自动化验收测试，真实安装与界面证据仍以对应 Issue 的验收评论为准。

### 3. 能力表核对

- `pstack/README.md` 第 2～4 节共 135 个原子能力（`SCR-06`、`SCR-07` 只作脚本去向记录，不计入编号）；第 8 节恰有 135 行，无缺行、无重复、无多余行，编号覆盖 `TOOL`、`SUB`、`AGT`、`MOD`、`SET`、`PATH`、`SCR`、`SKL`、`PB`、`PRIN`、`AUT`、`EXCL` 全部前缀。
- 第 3.1 节统计自洽：映射 47（完整 44、部分 3）、标准模式 72（完整 18、部分 54）、可选插件 3（完整 1、部分 2）、平台排除 13，合计 135。
- 第 8 节实现状态：122 个 `已实现`（含 2 个 `已实现（Issue #1）`）、13 个 `不适用（平台排除）`；审查状态：122 个 `通过`、13 个 `通过（平台排除）`。
- 证据链接：扫描 `pstack/README.md` 的 324 条相对文件链接（320 条带 `#L` 行号），全部目标存在且行号在目标文件范围内；未发现失效或越界链接。
- 生成树与随包树：`pstack/pstack` 557 个文件，含 58 个 `SKILL.md`、23 个 playbook；`dist/pstack` 178 个文件，与 `docs/port-prepare.md` 的结构基线一致。
- 上游清点：`upstream/cursor-plugins/pstack` 共 169 个 Markdown，其中 33 个 statechart `report.md` 测试夹具，136 个需求或说明文档；58 个非 benny `SKILL.md`、23 个 playbook、2 个 agent 定义、11 个 benny 文档，与 §1.3、§9.4 一致。
- 上游子树：`git -C upstream/cursor-plugins rev-parse 4dd1d05:pstack` 与 `ae5650f:pstack` 均为 `4719e1c4b4c43bac85d4206a8b41dd2899769c1c`，确认基线轮沿用同一 pstack 子树。

### 4. PI-01～PI-09 实现核对

| 编号 | 实现位置 | 本次核对 |
|---|---|---|
| PI-01 | `src/skill.ts`、`src/internal/skill-provider.ts`、`src/internal/frontmatter.ts`、`src/index.ts` | `pstack_skill` 按名称加载隐藏技能与相对资源，拒绝绝对路径和 `../` 越界，未知名称报错；`tests/skill.test.ts` 4 个、`tests/skill-provider.test.ts` 4 个用例通过 |
| PI-02 | `src/models.ts`、`src/subagent.ts`、`src/internal/role-config.ts`、`src/internal/role-manifest.ts`、`src/internal/role-grammar.ts`、`src/internal/role-editor.ts`、`src/internal/effort.ts` | `pstack_models` 只读枚举 provider/model/effort；角色行按 `provider/model [effort]` 解析，17 个角色与自动面板按 manifest 解析；`tests/models.test.ts` 2、`tests/subagent.test.ts` 12、`tests/role-editor.test.ts` 22、`tests/effort.test.ts` 3 个用例通过 |
| PI-03 | `pstack/runtime/skills/poteto-mode/scripts/check-plan.mjs` | H1、How to read this、Program checklist、五个 program H3、10 lanes、perf 四项、review gate、appendix 与退出码 0/1/2 均在实现中；`check-plan.test.ts` 8 个用例通过 |
| PI-05 | `pstack/runtime/skills/poteto-mode/scripts/watch-pr/{watch-pr,cli,github,policy,render,types}.ts` | 与 pstack `ae5650f` 的 `cli.ts`、`github.ts`、`policy.ts`、`render.ts`、`types.ts` 逐字相同；启动器去掉 Bun bootstrap；single、stack、queued-stack、`--status-only`、JSON/pretty、四种 verdict 与退出码由测试覆盖 |
| PI-06 | `pstack/runtime/skills/poteto-mode/scripts/worktree-audit.ts` | TSV 列、base 解析、bucket 分类、未知 usage 不判 safe、目录符号链接不遍历；`worktree-audit.test.ts` 4 个用例通过 |
| PI-07 | `pstack/runtime/skills/show-me-your-work/scripts/log.ts` | header 只写一次、UTC 时间戳、tab 与换行清理、公式前缀转义、用法错误退出 1；`log.test.ts` 3 个用例通过 |
| PI-08 | `cordis.patch.yml` 的 `poteto-agent` 与 `comment-sicko` preset、`src/subagent.ts`、`src/internal/effort.ts` | `agent` 到 preset 映射、poteto-agent 注入 `poteto-mode` 绝对路径、comment-sicko 的 `dsh-tool-fs` 静态关闭 `write`/`edit`、`general` 不挂 preset 均有测试；`maxDepth` 省略/null/0 默认 1 与运行中改 effort 走 `Agent.model.select` 均有测试 |
| PI-09 | `pstack/runtime/skills/statechart/scripts/**`（26 个源文件，另 1 个测试；随包不含上游 corpus） | `statechart.ts` 只在 `.ts` 与 `.mjs` worker 入口间选择；`run.ts`、`worker.ts`、`pipeline.ts`、`ir.ts`、`backends/**`、`frontends/**`、`passes/**` 与上游逐字相同；`statechart.test.ts` 7 个用例通过，TLC、Java、mise 仍为外部前提 |

`pstack_roles` 由 `src/role-catalog.ts` 实现，直接读取 `src/internal/role-manifest.ts` 的 `ROLE_MANIFEST`，返回每个角色的 `shape`、`autoPanel` 与 `roleIndex` 适用性；`tests/role-catalog.test.ts` 6 个用例通过。`pstack_script` 的五个 id 与 `src/internal/script-registry.ts` 的 `SCRIPT_ENTRIES` 一致；`pstack/scripts/replace-scripts.mjs` 的 `REPLACED` 集合为 `poteto-mode`、`show-me-your-work`、`statechart`，构建时整目录替换。

### 5. 公共 API、权限、最小性与共享影响

- **公共 API**：`package.json` 的 `.`、`./models`、`./remote`、`./role-catalog`、`./roles`、`./script`、`./skill`、`./subagent`、`./client` 与 `./locale/*.json` 均有实际产物；`dist/*.mjs` 的八个入口加 `dist/client.mjs` 齐全；`cordis.patch.yml` 注册 6 条行，模型可见工具为 `pstack_skill`、`pstack_models`、`pstack_roles`、`pstack_subagent`、`pstack_script`，另声明两个 agent preset。
- **权限**：`pstack_skill` 只读，资源路径经过绝对路径与 `../` 越界检查；`pstack_models` 只读且单 provider 失败不影响其他 provider；`pstack_roles` 只读且仅读取 manifest，不读文件；`pstack_subagent` 在启动前统一校验 route 与 effort，`cwd` 只允许会话目录内或带 `.git` 的独立工作树，`comment-sicko` 的 `dsh-tool-fs` 静态关闭 `write` 与 `edit`；`pstack_script` 以封闭 id 启动随包 Node 脚本，不经过 bash 审批与文件系统沙箱是 AD-01 已接受并在工具描述中明示的代价。角色配置页的 `save` 只写入 `$DSH_HOME/pstack-models.mdc`，保存前按实时模型目录校验并原子替换，不可读文件不会被覆盖。
- **最小性**：本轮没有新增运行时依赖；`pstack_roles` 只增加一个只读工具入口与一个 manifest 投影，没有新增文件读写；`maxDepth` 处理只涉及参数 schema、解析与计划逻辑；`src/**`、`tests/**` 的入口均有消费者或测试覆盖。
- **共享影响**：审查阶段只改 `pstack/README.md`、`docs/port-review.md` 与 `docs/port-state.yaml` 三个文件；`src/**`、`tests/**`、`pstack/runtime/**`、`pstack/harness/**` 无新增改动；`pstack/pstack/` 与 `dist/` 只由生成器与构建刷新，没有手写；`docs/extensions.md`、`docs/port-fixes.yaml`、`docs/port-fixes-archive.yaml` 无待处理条目。
- **DSH 0.2.2-alpha.3 兼容**：`packages/preset/agent-preset-registry/src/mount.ts` 的 `EntryTree.commit` 内部签名调整不触及插件实际使用的公共接口；`ctx.skills.get()`、`ctx.llm.listProviders/listModels/resolveModelInfo`、`ctx.subagents.startActivation`、`ctx.tools.register`、`ctx.workingDirectory.ensure` 的签名未变；本轮的 `vp run typecheck`、`vp run build`、`vp test` 与 playground `--dump-config` 均通过。

### 6. 非阻断观察

| 编号 | 位置 | 观察 |
|---|---|---|
| C-01 | `pstack/scripts/generate-pstack-harness-tree.mjs:204` | `.sort()` 缺少 compare 参数，保留 `vp check` 的既有 warning；不改变生成树结果，不阻断本轮审查 |

### 7. 结论

全部 `active` EXT 的验收测试与全部 `active` FIX 的 replay 均通过；`pstack/README.md` 的 135 个能力行逐项核对无阻断项；没有 `open`、`reopened`、`fixed-pending-review` 或 `blocked` finding。`docs/port-state.yaml` 的 `phase` 置为 `doc`，下一步执行 `/pstack-port doc`。

## 复审记录（2026-11-04，`review port`，DOC-01）

- 受审提交：`369a2bab7b32079c809041c8a1f6599258a06521`（`docs: pstack port baseline review（DSH 05b1cae 复核通过）`）。审查开始时已有 `doc` 留下的 DOC-01 开放 finding 与 `phase: review` 未提交状态；本轮保留原报告，不将旧「通过」记录改写为本次结论。
- 上游基线：pstack `ae5650febf4320793844c12c4adaa937f417f8da`（`0.15.36`）；DSH `05b1cae8db6e674c5685101494d4eec24652424a`（`0.2.2-alpha.3`）。两个子模块工作树无改动。
- 审查范围：`pstack/README.md` 的 135 个能力行、OPT-01/OPT-02 与文档覆盖、PI-01～PI-09 现有实现和上游对照、公共 API、权限与共享影响、全部登记 EXT 与 FIX。
- 工作项：没有 core Issue 或 core EXT。EXT-003 与 EXT-005 保持 active；EXT-004 判为 broken，`repair_target: extension`，证据见 `docs/extensions/EXT-004/review.md`。没有 active 或退役 FIX。
- 适用 `AGENTS.md`：根 `AGENTS.md`、`playground/AGENTS.md`、`docs/decisions/AGENTS.md`；只读 DSH 证据另读其根、`packages/`、`packages/experimental/` 与 `docs/` 的适用约定。
- 适用 accepted 决策：`2026-10-28-pstack-plugin-tools.md`（工具面与权限）、`2026-10-29-pstack-harness-tree-port.md`（适配树）、`2026-10-28-skills-directory-scope.md`（补充技能）、`2026-10-30-playground-real-plugin-testing.md`（真实验证环境）、`2026-10-30-script-commands-in-vite-config.md`（命令）、`2026-10-30-pstack-config-page-i18n.md`（Client locale）。本轮没有决策记录变更。
- 验证环境：仓库根 `/home/leihaohao/workspace/dsh-pstack`；Vite+ Node `24.22.1`、vite-plus `1.4.0`、Vitest `5.0.5`；直接 Node `26.13.0`；DSH CLI `0.2.2-alpha.3`。真实运行检查仅使用 `playground/.dsh` 的 `pstack-playground` profile，不新建 home/profile，不启动服务或调用用户所选模型。

### 复审门禁与行为验证

| 检查 | 命令或范围 | 退出码 | 结果 |
|---|---|---:|---|
| 静态检查 | `vp check` | 0 | 95 个文件格式正确；0 errors；既有 `pstack/scripts/generate-pstack-harness-tree.mjs:204` warning 保留 |
| 显式类型 | `vp run typecheck` | 0 | `tsc --noEmit` 通过（缓存重放） |
| 插件测试 | `vp test` | 0 | 18 个文件、118 个测试通过 |
| 运行时测试 | `vp run @internal/pstack#test` | 0 | 12 个 suite、76 个测试通过（缓存重放） |
| 构建 | `vp run build` | 0 | 5/5 任务成功；3 组技能脚本替换，5 个脚本 id 解析，22 个 Host 产物与 Client 产物生成 |
| 适配文档对账 | `vp run @internal/pstack#check:harness-doc` | 0 | 结构、OPT id 与包名等既有检查通过；不检查 OPT-01/02 的启用与组合语义 |
| 生成树漂移 | `node pstack/scripts/generate-pstack-harness-tree.mjs --check` | 0 | `pstack/pstack is up to date.` |
| FIX replay | `node pstack/scripts/port-fixes.mjs replay` | 0 | 没有 active FIX；`No active FIX records; replay passed.` |
| active EXT 验收 | EXT-003：45 个用例；EXT-004：16 个用例；EXT-005：4 个用例（均含于 `vp test`） | 0 | 自动化全部通过；EXT-004 用例仍固定旧推荐，未覆盖新 DSH 约束，不能据此判 EXT 通过 |
| 能力编号与链接 | 只读脚本扫描 `pstack/README.md` | 0 | 135 个状态编号、无重复；324 个相对文件链接存在，其中 320 个行号均在范围内 |
| playground 合成 | `DSH_HOME=$PWD/playground/.dsh dsh --profile pstack-playground --dump-config` | 0 | 6 条 pstack 行、2 个 preset 与 `maxDepth: 2` 存在；未启用冲突可选 bundle |

### 复审发现与分诊

1. **DOC-01 保持 open。** `pstack/README.md` §1.8、§3.3 已按当前 DSH 写出统一入口，但 `pstack/harness/docs/harness/dsh.md:88-89`、根 `README.md:139-140` 与 `README.zh.md:139-140` 仍是旧说明；§8.5 的文档完成日期已过期。`check:harness-doc` 退出 0 不是语义通过证据。
2. **EXT-004 判为 broken，repair_target 为 extension。** 上游 README 与升级指南证明 Web/Desktop 独立 worktree bundle 被隐藏、forge bundle 同时提供模型工具、同时选择会插入重复行；本页仍默认推荐独立 bundle，且直接开关与一键启用未表达这些限制。修复落点是 EXT-004 的 `src/**`、Client 词典与验收测试，不是只改 port 文档。
3. **公共接口与权限未见新增阻断。** 五个工具及 Host/Client 出口与 `cordis.patch.yml` 一致；`pstack_skill` 只读并检查资源越界，`pstack_models` 与 `pstack_roles` 只读，`pstack_subagent` 启动前校验路由、effort 与 cwd，`comment-sicko` 静态移除写工具，`pstack_script` 的直接进程/沙箱代价仍在 AD-01 明示范围内。当前差异检查中这些 API 未出现破坏。
4. **范围与最小性。** 本轮未改生产代码、测试、上游、生成树手写源或 FIX 台账。审查产物仅更新 `docs/port-review.md`、`docs/port-state.yaml`、`pstack/README.md`、`docs/extensions.md`，并新建 `docs/extensions/EXT-004/review.md`；临时只读检查脚本位于 gitignored `.tmp/`。`git diff --check` 通过。

### 复审结论

不通过。全部五条必需门禁退出 0，但 DOC-01 仍未解决且 EXT-004 的实际组合行为不满足当前 DSH 约束。`docs/port-state.yaml` 建立 EXT-004 的 `mode: issue` blocker，port 保持 `active/review`，`resume_route: review port`，不进入 `doc`。当前只允许 `implement EXT-004` 与 `review EXT-004`；EXT 复核通过前不执行 Issue #4 验收。下一步：`/pstack-port implement EXT-004`。

### 有意跳过与证据不足

- 未启动 playground Web 服务、未操作真实 UI、未运行涉及用户所选模型的会话；本轮通过 DSH 当前提交的组合定义与升级指南确定冲突，不伪写真实组合通过。EXT 修复后须补相应真实验证。
- 未运行 `playground/cases-run.mjs` 或真实 TLC、视频、外部 forge 流程；其限制保留在 §9.3，与本次 finding 无新增关系。
- 未抽查代替全量 EXT：全部三个登记 EXT 的既有自动化验收均执行；真实安装历史不代替当前 DSH 的兼容复核。
- 除上述两项外，没有新增证据不足或未覆盖项。

## 再次复审记录（2026-11-04，`review port`，EXT-004 修复后）

- 受审提交：`e6124ba771c0845cb6729dcf047b37358ba3aea4`（`docs(issue-4): 复核验收通过并恢复 port review`）；审查开始时 `git status --porcelain` 无输出。
- 上游基线：pstack `ae5650febf4320793844c12c4adaa937f417f8da`（`0.15.36`）；DSH `05b1cae8db6e674c5685101494d4eec24652424a`（`0.2.2-alpha.3`）。两个子模块工作树无改动。
- 审查范围：DOC-01 的 `required_behavior`、EXT-004 修复对全部 active EXT 与共享实现的影响、`pstack/README.md` 的 135 个能力行、PI-01～PI-09 现有实现、公共 API、权限与最小性、全部 active FIX。
- 工作项：没有 core Issue 或 core EXT；EXT-003、EXT-004、EXT-005 均为 active，EXT-004 的 `repair_target: extension` 修复与 Issue #4 验收已完成，工作文件按契约删除；没有 active 或退役 FIX。
- 适用 `AGENTS.md`：根 `AGENTS.md`、`playground/AGENTS.md`、`docs/decisions/AGENTS.md`；只读 DSH 证据另读其根、`packages/`、`packages/experimental/` 与 `docs/` 的适用约定。
- 适用 accepted 决策：`2026-10-28-pstack-plugin-tools.md`（工具面与权限）、`2026-10-29-pstack-harness-tree-port.md`（适配树）、`2026-10-28-skills-directory-scope.md`（补充技能）、`2026-10-30-playground-real-plugin-testing.md`（真实验证环境）、`2026-10-30-script-commands-in-vite-config.md`（命令）、`2026-10-30-pstack-config-page-i18n.md`（Client locale）。本轮没有决策记录变更。
- 验证环境：仓库根 `/home/leihaohao/workspace/dsh-pstack`；Vite+ Node `24.22.1`、vite-plus `1.4.0`、Vitest `5.0.5`；直接 Node `26.13.0`；DSH CLI `0.2.2-alpha.3`。真实运行检查仅使用 `playground/.dsh` 的 `pstack-playground` profile 做 `--dump-config`，不新建 home/profile，不启动服务或调用用户所选模型。

### 再次复审门禁与行为验证

| 检查 | 命令或范围 | 退出码 | 结果 |
|---|---|---:|---|
| 静态检查 | `vp check` | 0 | 95 个文件格式正确；0 errors；既有 `pstack/scripts/generate-pstack-harness-tree.mjs:204` warning 保留 |
| 显式类型 | `vp run typecheck` | 0 | `tsc --noEmit` 通过（缓存重放） |
| 构建 | `vp run build` | 0 | 5/5 任务成功；3 组技能脚本替换，5 个脚本 id 解析，22 个 Host 产物与 Client 产物生成 |
| 插件测试 | `vp test` | 0 | 18 个文件、122 个测试通过，包含全部 active EXT 验收用例 |
| 运行时测试 | `vp run @internal/pstack#test` | 0 | 12 个 suite、76 个测试通过（缓存重放） |
| 适配文档对账 | `vp run @internal/pstack#check:harness-doc` | 0 | 结构、OPT id 与包名等既有检查通过；仍不检查 OPT-01/02 的启用与组合语义 |
| 生成树漂移 | `node pstack/scripts/generate-pstack-harness-tree.mjs --check` | 0 | `pstack/pstack is up to date.` |
| FIX replay | `node pstack/scripts/port-fixes.mjs replay` | 0 | 没有 active FIX；`No active FIX records; replay passed.` |
| 能力编号与链接 | `node .tmp/review-port-check.mjs` | 0 | 135 个状态编号、无重复；324 个相对文件链接存在且行号均在范围内 |
| playground 合成 | `DSH_HOME=$PWD/playground/.dsh dsh --profile pstack-playground --dump-config` | 0 | 6 条 pstack 行、2 个 preset 与 `maxDepth: 2` 存在；未启用冲突可选 bundle |

active EXT 验收均包含在上述 `vp test` 中：EXT-003 的 45 个用例（`role-page` 8、`role-editor` 22、`role-state` 6、`roles-remote` 5、`roles-service` 4）、EXT-004 的 20 个用例（`optional-plugins-page` 6、`optional-plugins` 14）、EXT-005 的 4 个用例（`bundle-config-dialog` 2、`client-plugin` 2）全部通过。EXT-004 新增用例覆盖默认推荐 OPT-02/OPT-06、OPT-01 不提供页面开关、独立 worktree 阻断 forge 单项启用与一键启用、已启用 forge 仍可关闭，以及冲突结果文案。

### 再次复审发现与分诊

1. **DOC-01 保持 open。** `pstack/harness/docs/harness/dsh.md:88-89` 的 OPT-01 仍缺 Web/Desktop 统一入口与独立 bundle 无卡片约束，OPT-02 仍漏模型侧 `create_worktree`；根 `README.md:139-140` 与 `README.zh.md:139-140` 仍写两个 bundle 可共存，兼容版本仍停在 `0.2.2-alpha.2`。DSH 升级指南明确同时选择会插入重复 `worktree` 与 `tool-worktree` id，必须移除独立选择。`check:harness-doc` 退出 0 不是语义通过证据。保持开放 finding，`port.phase` 置为 `implement`，不建立 blocker。
2. **EXT-004 修复有效且保持 active。** 实现目录与页面状态一致：默认推荐统一 forge 入口，独立 worktree 只作非 Web profile 说明；单项与一键启用都依据 `blockedBy` 拒绝冲突，关闭操作不被冲突阻止。全部 active EXT 验收通过，不需重新标 broken 或建立 blocker。
3. **公共接口与权限未见新增阻断。** 本轮 EXT 修复只改 Client 展示和状态决策，没有新增模型可见工具、Host 入口、文件写入或进程执行；五个工具及权限边界与既有审查一致。`cordis.patch.yml` 的六条行与两个 preset 经 playground 合成确认。
4. **范围与最小性。** EXT 修复涉及四个 `src/**` 文件与两个 `tests/**` 文件，没有新增运行时依赖；port 基线脚本、运行时、上游、生成树手写源和 FIX 台账无变化。本轮审查只更新 `docs/port-review.md`、`docs/port-state.yaml` 与 `pstack/README.md`；`git diff --check` 通过。

### 再次复审结论

不通过。EXT-004 与全部五条必需门禁通过，但 DOC-01 的适配文档与双语 README 仍未同步当前 DSH 行为。`docs/port-state.yaml` 设 `active/implement`、`blocker: null`，不进入 `doc`。下一步：`/pstack-port implement port`。

### 有意跳过与证据不足

- 未启动 playground Web 服务或重复操作真实 UI；EXT-004 的当前真实安装与 UI 证据已由 Issue #4 复核验收记录，本轮用全量自动化和 profile 合成复核共享回归。未运行涉及用户所选模型的会话。
- 未运行 `playground/cases-run.mjs`、真实 TLC、视频或外部 forge 流程；其外部前提与证据限制保留在 §9.3，与 DOC-01 无新增关系。
- 除 DOC-01 外，没有新增证据不足或未覆盖项。

## 实现记录（2026-11-04，`implement port`，DOC-01）

- 工作项：DOC-01（`origin: doc`，`affected_ext: EXT-004`），本轮唯一开放 port finding；无 `status: active` FIX；无 core Issue/EXT。范围仅文档同步：`pstack/harness/docs/harness/dsh.md`、根 `README.md`、根 `README.zh.md` 与 `pstack/README.md` §8.5，不改 `src/**`、`tests/**`、`pstack/runtime/**`、EXT 登记与 FIX 台账。
- 上游基线：pstack `ae5650febf4320793844c12c4adaa937f417f8da`（`0.15.36`）；DSH `05b1cae8db6e674c5685101494d4eec24652424a`（`0.2.2-alpha.3`）。两个子模块工作树无改动，`git status --porcelain` 起始无输出。
- 冻结事实（DSH `05b1cae`）：[tool-worktree README](../upstream/deepseek-harness/packages/experimental/tool-worktree/README.md#L28-L28) 说明 Web/Desktop 经 Change requests & worktrees 启用、独立 bundle 无 Plugins 卡片、其它 profile 走 `dsh.profile.bundles`；[forge-bundle README](../upstream/deepseek-harness/packages/experimental/forge-bundle/README.md#L30-L30) 说明同一开关同时启用面板与模型侧 `create_worktree`；[升级指南](../upstream/deepseek-harness/docs/upgrade-guide/v0.2.2-alpha.2/forge-worktree-entry/guide.md#L12-L14) 说明同时选择独立 bundle 与 forge bundle 会插入重复 `worktree` / `tool-worktree` id、必须移除独立选择。
- 修复内容（对照 `required_behavior`）：
  - `pstack/harness/docs/harness/dsh.md`：`OPT-01` 行补 Web/Desktop 经 `OPT-02` 统一启用、独立 bundle 无 Plugins 卡片、非 Web profile 经 `dsh.profile.bundles` 且不得与 `OPT-02` 同时选择；`OPT-02` 行补模型侧 `create_worktree`，把「无模型侧变更请求工具」限定为变更请求工具并明确附带 `create_worktree`。
  - 根 `README.md` / `README.zh.md`：`会话与隔离` 的 worktree 行补统一入口、无卡片与互斥；forge 行补 `create_worktree` 并删除「可共存」的错误说明；Compat 表 DSH 已验证基线由 `0.2.2-alpha.2` 更新为 `0.2.2-alpha.3`。
  - `pstack/README.md` §8.5 文档状态更新为本轮修正、待 `review port` 复核。
  - EXT-004 的默认推荐与互斥修复已完成并恢复 `active`（见上一节复审记录），本轮不修改 EXT 登记。
- 生成树：`pstack/pstack/docs/harness/dsh.md` 仅由 `generate-pstack-harness-tree.mjs` 刷新，无手写。

| 检查 | 命令 | 退出码 | 结果 |
|---|---|---:|---|
| 静态检查 | `vp check` | 0 | 95 个文件格式正确；0 errors；保留既有 `pstack/scripts/generate-pstack-harness-tree.mjs:204` `require-array-sort-compare` warning |
| 显式类型 | `vp run typecheck` | 0 | `tsc --noEmit` 通过（缓存命中） |
| 构建 | `vp run build` | 0 | 5/5 任务成功；3 组技能脚本替换、5 个脚本 id 解析、22 个 Host 产物与 Client 产物生成 |
| 插件测试 | `vp test` | 0 | 18 个文件、122 个测试通过 |
| 运行时测试 | `vp run @internal/pstack#test` | 0 | 12 个 suite、76 个测试通过、0 失败 |
| 适配文档对账 | `vp run @internal/pstack#check:harness-doc` | 0 | `harness doc is consistent with README, the upstream template, and src.`（2/2 任务成功；C3 的 OPT 编号与包名一致） |
| 生成树漂移 | `node pstack/scripts/generate-pstack-harness-tree.mjs --check` | 0 | `pstack/pstack is up to date.` |
| FIX 重放 | `node pstack/scripts/port-fixes.mjs replay` | 0 | `No active FIX records; replay passed.` |

- 未覆盖/有意跳过：未启动 playground Web 服务或操作真实 UI，本轮为文档同步，不涉及真实运行层；未改 `playground/README.md` 的本地 DSH 基线说明（非 port 文档产物，属 `playground/` 开发环境注记，超出本工作项范围）。
- 适用范围检查：`git diff --name-only` 为 `README.md`、`README.zh.md`、`pstack/README.md`、`pstack/harness/docs/harness/dsh.md`、`pstack/pstack/docs/harness/dsh.md`；`pstack/pstack/**` 仅由生成器刷新。除上述文档与状态文件外无改动。
- 结论：DOC-01 置 `fixed-pending-review`，`docs/port-state.yaml` 设 `active/review`，等待 `/pstack-port review port` 复核。

## 未解决限制

无新增未解决限制。`pstack/README.md` §9.3 的 `U-01` 至 `U-06` 保持原样：视频录制工具链、headless `ask_user_question` 回答者、子代理 transcript 覆盖、浏览器截图证据、连续工作树创建、宿主外部命令可用性仍按「当前提交未证实」处理，不在本轮实现范围内。真实会话层未在本轮执行：按 playground 决策，涉及用户所选模型的会话由用户操作并确认；本机 `playground/config.json` 仍以旧 provider `cpa` 记录模型，而当前同步部署为 `magpie`，`vp run cases:check` 因该 gitignored 本地配置退出 2，不影响上述插件实现与门禁结论。
