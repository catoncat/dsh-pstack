# pstack 移植审查报告

- 轮次（round）：`baseline`
- 上游提交：pstack `ae5650febf4320793844c12c4adaa937f417f8da`（`0.15.36`）；DSH `ce7073d51254c26cd63b22a60835b8f948deb447`（`0.2.2-alpha.2`）
- 开始时间（started_at）：2026-11-03T14:01:26+08:00

## findings

（空）

## 实现记录

`implement port` 的范围是 `pstack/README.md` 第 5 节的 `PI-01`～`PI-09`（`PI-04` 已随上游 `1ba91fc` 删除 `orch.ts` 与 `store.ts` 退役），以及 `docs/port-fixes.yaml` 中 `status: active` 的 FIX。本轮没有 active FIX；8 个插件内实现项逐项读取现有实现后全部记为「保留」，生产代码沿用已通过前轮审查的实现，本轮没有新增、修改或删除代码。

保留依据：`docs/port-prepare.md` 已确认 pstack 子树在 `4dd1d05..ae5650f` 间无文件差异（树哈希同为 `4719e1c4b4c43bac85d4206a8b41dd2899769c1c`），DSH 仍为 `ce7073d`；插件实际使用的 `ctx.skills.get()`、`ctx.llm.listProviders/listModels/resolveModelInfo`、`ctx.subagents.startActivation`、`ctx.tools.register`、`ctx.workingDirectory.ensure` 公共签名未被破坏，`vp run typecheck` 与 `vp check` 通过。没有出现需要改动 `src/**`、`tests/**`、`pstack/runtime/**` 或 `pstack/harness/**` 的新需求。

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
| playground 组合 | `DSH_HOME=$PWD/playground/.dsh dsh --profile pstack-playground --dump-config` | 0 | 六条 `dsh-pstack` 行、两个 agent preset 与 `pstack-subagent.maxDepth: 2` 均出现在合成配置中 |

## 范围检查

本轮改动只涉及 `pstack/README.md` 的实现说明、`docs/port-review.md` 的实现与验证证据、`docs/port-state.yaml` 的阶段字段。`docs/extensions.md`、`docs/port-fixes.yaml`、`docs/port-fixes-archive.yaml` 无差异；`src/**`、`tests/**`、`pstack/runtime/**`、`pstack/harness/**` 无改动；`pstack/pstack/` 与 `dist/` 只由生成器与构建刷新，没有手写。`git diff --name-only` 仅列出上述三个文件。

## 审查记录（2026-11-03，review port）

- 受审提交：`5981e108625d5c82982b83a69c728092b3356a4b`（`docs: pstack port baseline implement（PI 复核与 review 状态）`）；审查开始时工作树干净（`git status --porcelain` 无输出）。
- 上游基线：pstack `ae5650febf4320793844c12c4adaa937f417f8da`（`0.15.36`）；DSH `ce7073d51254c26cd63b22a60835b8f948deb447`（`0.2.2-alpha.2`）。
- 审查范围：`pstack/README.md` 第 2～8 节全部 135 个能力行与 `PI-01`～`PI-09` 的实现；`docs/extensions.md` 的 3 个 `active` EXT；`docs/port-fixes.yaml` 中的全部 FIX；公共 API、权限、最小性与共享影响。
- 工作项：本轮没有 core Issue 或 core EXT；`active` EXT 为 EXT-003、EXT-004、EXT-005，均登记了验收历史；无 `proposed`、`broken`、`retired` 条目；无 `active` FIX。
- 审查结论：通过，无 open finding。`pstack/README.md` 的 122 个实现项审查列为 `通过`，13 个平台排除项为 `通过（平台排除）`；下一阶段为 `doc`。
- 适用 `AGENTS.md`：根 `AGENTS.md`（Vite+ 工具链、`.tmp` 与 `playground` 使用约定）与 `docs/decisions/AGENTS.md`（决策记录检索与状态规则）。
- 适用 accepted 决策：`docs/decisions/2026-10-28-pstack-plugin-tools.md`（`src/**`、`tests/**`、`cordis.patch.yml`）、`docs/decisions/2026-10-29-pstack-harness-tree-port.md`（`pstack/**`）、`docs/decisions/2026-10-28-skills-directory-scope.md`（`skills/**`）、`docs/decisions/2026-10-30-playground-real-plugin-testing.md`（真实运行验证环境）、`docs/decisions/2026-10-30-script-commands-in-vite-config.md`（构建与验证命令）、`docs/decisions/2026-10-30-pstack-config-page-i18n.md`（Client locale）。
- 验证环境：Node `24.22.1`（`package.json` devEngines）、vite-plus；单元与集成测试在仓库根执行；真实运行层使用 `playground/.dsh` 的 `pstack-playground` profile 做 `--dump-config` 检查，涉及用户所选模型的真实会话按 playground 决策由用户操作，本轮不代跑。

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
| 脚本入口 | 五个随包入口逐个调用 | 0/1/2 | `check-plan` 无参数 2、`watch-pr --help` 0、`worktree-audit --help` 0、`log` 无参数 1、`statechart` 无参数 2，符合各脚本契约 |
| 技能索引 | `node --input-type=module` 加载 `dist/index.mjs` 的 `loadBundledSkillIndexes(SKILL_ROOTS)` | 0 | 64 个技能加载成功，其中 61 个为隐藏技能，64 个为用户可调用 |
| playground 组合 | `DSH_HOME=$PWD/playground/.dsh dsh --profile pstack-playground --dump-config` | 0 | 六条 `dsh-pstack` 行、两个 agent preset 与 `pstack-subagent.maxDepth: 2` 均出现在合成配置中 |

### 2. active EXT 验收测试

| EXT | required_behavior 摘要 | 验收测试 | 结果 |
|---|---|---|---|
| EXT-003 | 角色模型配置页：17 个角色、缺失/loaded/unreadable 状态、路由与 effort 编辑、重置、与 `/setup-pstack` 共用 `$DSH_HOME/pstack-models.mdc`、按行号报告问题 | `tests/role-page.test.tsx`（8）、`tests/role-editor.test.ts`（22）、`tests/role-state.test.ts`（6）、`tests/roles-remote.test.ts`（5）、`tests/roles-service.test.ts`（4），合计 45 个测试 | 退出 0；全部通过 |
| EXT-004 | 推荐可选插件启用页：OPT-01～OPT-09 分组与标签、bundle 状态、单项开关、一键启用推荐项、首次启用引导 | `tests/optional-plugins-page.test.tsx`（5）、`tests/optional-plugins.test.ts`（11），合计 16 个测试 | 退出 0；全部通过 |
| EXT-005 | bundle 配置模态框：仅 dsh-pstack bundle 显示「配置」、Settings 风格弹窗、插件/角色双分区、双语词典 | `tests/bundle-config-dialog.test.tsx`（2）、`tests/client-plugin.test.ts`（2），合计 4 个测试 | 退出 0；全部通过 |

EXT-003 的验收历史记录在 `docs/extensions.md`（Issue #2、#8、#14）；EXT-004 见 Issue #4；EXT-005 见 Issue #12。本轮重新运行上述自动化验收测试，真实安装与界面证据仍以对应 Issue 的验收评论为准。

### 3. 能力表核对

- `pstack/README.md` 第 2～4 节共 135 个原子能力（`SCR-06`、`SCR-07` 只作脚本去向记录，不计入编号）；第 8 节恰有 135 行，无缺行、无多余行。
- 第 3.1 节统计自洽：映射 47（完整 44、部分 3）、标准模式 72（完整 18、部分 54）、可选插件 3（完整 1、部分 2）、平台排除 13，合计 135。
- 第 8 节实现状态：122 个 `已实现`（含 2 个 `已实现（Issue #1）`）、13 个 `不适用（平台排除）`；审查状态：122 个 `通过`、13 个 `通过（平台排除）`。
- 证据链接：扫描 `pstack/README.md` 的 324 条相对文件链接，全部存在且 `#L` 行号在目标文件范围内；未发现失效或越界链接。
- 生成树与随包树：`pstack/pstack` 557 个文件，含 58 个 `SKILL.md`、23 个 playbook；`dist/pstack` 178 个文件，与 `docs/port-prepare.md` 的结构基线一致。
- 上游子树：`git -C upstream/cursor-plugins rev-parse 4dd1d05:pstack` 与 `ae5650f:pstack` 均为 `4719e1c4b4c43bac85d4206a8b41dd2899769c1c`，确认基线轮沿用同一 pstack 子树。

### 4. PI-01～PI-09 实现核对

| 编号 | 实现位置 | 本次核对 |
|---|---|---|
| PI-01 | `src/skill.ts`、`src/internal/skill-provider.ts`、`src/internal/frontmatter.ts` | `pstack_skill` 按名称加载隐藏技能与相对资源，拒绝绝对路径和 `../` 越界，未知名称报错；`tests/skill.test.ts` 4 个、`tests/skill-provider.test.ts` 4 个用例通过 |
| PI-02 | `src/models.ts`、`src/subagent.ts`、`src/internal/role-config.ts`、`src/internal/role-manifest.ts`、`src/internal/role-grammar.ts`、`src/internal/role-editor.ts`、`src/internal/effort.ts` | `pstack_models` 只读枚举 provider/model/effort；角色行按 `provider/model [effort]` 解析，17 个角色与自动面板按 manifest 解析；`tests/models.test.ts` 2、`tests/subagent.test.ts` 12、`tests/role-editor.test.ts` 22、`tests/effort.test.ts` 3 个用例通过 |
| PI-03 | `pstack/runtime/skills/poteto-mode/scripts/check-plan.mjs` | H1、How to read this、Program checklist、五个 program H3、10 lanes、perf 四项、review gate、appendix 与退出码 0/1/2 均在实现中；`check-plan.test.ts` 8 个用例通过 |
| PI-05 | `pstack/runtime/skills/poteto-mode/scripts/watch-pr/{watch-pr,cli,github,policy,render,types}.ts` | 与 pstack `ae5650f` 的 `cli.ts`、`github.ts`、`policy.ts`、`render.ts`、`types.ts` 逐字相同；启动器去掉 Bun bootstrap；single、stack、queued-stack、`--status-only`、JSON/pretty、四种 verdict 与退出码由测试覆盖 |
| PI-06 | `pstack/runtime/skills/poteto-mode/scripts/worktree-audit.ts` | TSV 列、base 解析、bucket 分类、未知 usage 不判 safe、目录符号链接不遍历；`worktree-audit.test.ts` 4 个用例通过 |
| PI-07 | `pstack/runtime/skills/show-me-your-work/scripts/log.ts` | header 只写一次、UTC 时间戳、tab 与换行清理、公式前缀转义、用法错误退出 1；`log.test.ts` 3 个用例通过 |
| PI-08 | `cordis.patch.yml` 的 `poteto-agent` 与 `comment-sicko` preset、`src/subagent.ts`、`src/internal/effort.ts` | `agent` 到 preset 映射、poteto-agent 注入 `poteto-mode` 绝对路径、comment-sicko 的 `dsh-tool-fs` 静态关闭 `write`/`edit`、`general` 不挂 preset 均有测试；`maxDepth` 省略/null/0 默认 1 与运行中改 effort 走 `Agent.model.select` 均有测试 |
| PI-09 | `pstack/runtime/skills/statechart/scripts/**`（26 个源文件，另 1 个测试；随包不含上游 corpus） | `statechart.ts` 只在 `.ts` 与 `.mjs` worker 入口间选择；`run.ts`、`worker.ts`、`pipeline.ts`、`ir.ts`、`backends/**`、`frontends/**`、`passes/**` 与上游逐字相同；`statechart.test.ts` 7 个用例通过，TLC、Java、mise 仍为外部前提 |

`pstack_roles` 由 `src/role-catalog.ts` 实现，直接读取 `src/internal/role-manifest.ts` 的 `ROLE_MANIFEST`，返回每个角色的 `shape`、`autoPanel` 与 `roleIndex` 适用性；`tests/role-catalog.test.ts` 6 个用例通过。`pstack_script` 的五个 id 与 `src/internal/script-registry.ts` 的 `SCRIPT_ENTRIES` 一致；`pstack/scripts/replace-scripts.mjs` 的 `REPLACED` 集合为 `poteto-mode`、`show-me-your-work`、`statechart`，构建时整目录替换。

### 5. 公共 API、权限、最小性与共享影响

- **公共 API**：`package.json` 的 `.`、`./models`、`./remote`、`./role-catalog`、`./roles`、`./script`、`./skill`、`./subagent`、`./client` 与 `./locale/*.json` 均有实际产物；`dist/*.mjs` 的九个入口齐全；`cordis.patch.yml` 注册 6 条行，模型可见工具为 `pstack_skill`、`pstack_models`、`pstack_roles`、`pstack_subagent`、`pstack_script`，另声明两个 agent preset。`vp run typecheck` 与 `vp check` 通过。
- **权限**：`pstack_skill` 只读，资源路径经过绝对路径与 `../` 越界检查；`pstack_models` 只读；`pstack_roles` 只读且仅读取 manifest，不读文件；`pstack_subagent` 在启动前统一校验 route 与 effort，`cwd` 只允许会话目录内或带 `.git` 的独立工作树，`comment-sicko` 的 `dsh-tool-fs` 静态关闭 `write` 与 `edit`；`pstack_script` 以封闭 id 启动随包 Node 脚本，不经过 bash 审批与文件系统沙箱是 AD-01 已接受并在工具描述中明示的代价。角色配置页的 `save` 只写入 `$DSH_HOME/pstack-models.mdc`，保存前按实时模型目录校验并原子替换，不可读文件不会被覆盖。
- **最小性**：本轮没有新增运行时依赖；`pstack_roles` 只增加一个只读工具入口与一个 manifest 投影，没有新增文件读写；`maxDepth` 改动只涉及参数 schema、解析与计划逻辑；`src/**`、`tests/**` 的入口均有消费者或测试覆盖。
- **共享影响**：审查阶段只改 `pstack/README.md`、`docs/port-review.md` 与 `docs/port-state.yaml` 三个文件；`src/**`、`tests/**`、`pstack/runtime/**`、`pstack/harness/**` 无新增改动；`pstack/pstack/` 与 `dist/` 只由生成器与构建刷新，没有手写；`docs/extensions.md`、`docs/port-fixes.yaml`、`docs/port-fixes-archive.yaml` 无待处理条目。

### 6. 非阻断观察

| 编号 | 位置 | 观察 |
|---|---|---|
| C-01 | `pstack/scripts/generate-pstack-harness-tree.mjs:204` | `.sort()` 缺少 compare 参数，保留 `vp check` 的既有 warning；不改变生成树结果，不阻断本轮审查 |

### 7. 结论

全部 `active` EXT 的验收测试与全部 `active` FIX 的 replay 均通过；`pstack/README.md` 的 135 个能力行逐项核对无阻断项；没有 `open`、`reopened`、`fixed-pending-review` 或 `blocked` finding。`docs/port-state.yaml` 的 `phase` 置为 `doc`，下一步执行 `/pstack-port doc`。

## 未解决限制

无新增未解决限制。`pstack/README.md` §9.3 的 `U-01` 至 `U-06` 保持原样：视频录制工具链、headless `ask_user_question` 回答者、子代理 transcript 覆盖、浏览器截图证据、连续工作树创建、宿主外部命令可用性仍按「当前提交未证实」处理，不在本轮实现范围内。真实会话层未在本轮执行：按 playground 决策，涉及用户所选模型的会话由用户操作并确认；本机 `playground/config.json` 仍以旧 provider `cpa` 记录模型，而当前同步部署为 `magpie`，`vp run cases:check` 因该 gitignored 本地配置退出 2，不影响上述插件实现与门禁结论。
