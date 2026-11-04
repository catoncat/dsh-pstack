# EXT-004：pstack 推荐可选插件启用页

- status: review
- repair_target: extension
- required_behavior: 在 DSH `05b1cae8db6e674c5685101494d4eec24652424a` 的 Web/Desktop Plugins 页中，推荐项必须能读取并切换官方统一暴露的 Change requests & worktrees（OPT-02），它同时提供 forge 面板与模型侧 `create_worktree`。独立 `@deepseek-ai/dsh-experimental-tool-worktree` 没有 Plugins 卡片，不能继续作为本页的默认启用目标；默认推荐和一键启用不得造成独立 worktree 与 forge 同时选择。保留非 Web profile 的独立 bundle 适配说明，不把它误写为本页可开关的卡片。既有角色配置分区、插件状态映射、失败汇总与首次启用引导不得回归。
- port_round: baseline

## 实现记录（2026-11-04，`implement EXT-004`）

受审基线：DSH `05b1cae8db6e674c5685101494d4eec24652424a`（`0.2.2-alpha.3`）。按复审要求把 Web/Desktop 的默认启用目标从隐藏的独立 `@deepseek-ai/dsh-experimental-tool-worktree` 改为官方统一的 Change requests & worktrees（`@deepseek-ai/dsh-experimental-forge-bundle`），并处理两个 bundle 的互斥与迁移提示：

- `src/internal/optional-plugins.ts`：`OPT-02`（forge bundle）改为 `recommended: true`；`OPT-01`（独立 worktree bundle）改为 `profileOnly: true`、`switchable: false`，仅保留非 Web profile 适配说明；两行增加 `exclusiveWith`，forge 与 `worktree` / `tool-worktree` 互斥。
- `src/client/optional-plugins-state.ts`：`OptionalPluginRow` 增加 `blockedBy`；新增 `conflictingEnabledBundles`；行的开关在未被互斥 bundle 阻塞时才可启用（已启用仍可关闭）；一键启用跳过被阻塞的推荐项并记 `skipped` 结果。
- `src/client/OptionalPluginsPage.tsx`：卡片展示 `profileOnlyGuidance` 与 `mutexWarning`；`changeResultText` 增加 `skipped`；直接开关与“一键启用推荐项”都在启用前拦截互斥组合，失败汇总保留。
- `src/client/optional-plugins-locales.ts`：中英同步新增 `profileOnlyGuidance`、`mutexWarning`、`resultSkippedConflict`，重写 OPT-01 / OPT-02 文案，移除不再使用的 `suggestedTag`。

未改 `pstack/runtime/**`、`pstack/harness/**`、`pstack/pstack/**` 或 port 能力行为。根 `README.md` / `README.zh.md` 与 `dsh.md` 的 OPT-01/02 语义同步属于 `docs/port-review.md` 的 DOC-01（port 层），不在本 EXT 实现范围。

## 本轮验证

- `vp test run optional-plugins`：退出 0；`tests/optional-plugins.test.ts`（14）与 `tests/optional-plugins-page.test.tsx`（6）共 20 个用例通过。新增用例覆盖默认推荐为 OPT-02、独立 bundle 非推荐且不可开关、互斥阻塞、一键启用跳过互斥项、`skipped` 文案。
- `vp test`：退出 0；18 个测试文件、122 个测试通过。
- `vp check`：退出 0；0 errors，仅保留既有 `pstack/scripts/generate-pstack-harness-tree.mjs:204` warning。
- `vp run typecheck`：退出 0。
- `node pstack/scripts/generate-pstack-harness-tree.mjs --check`：退出 0，`pstack/pstack is up to date.`
- `vp run @internal/pstack#check:harness-doc`：退出 0，`harness doc is consistent with README, the upstream template, and src.`

未运行真实 UI 与模型会话：按 playground 决策，涉及用户所选模型的会话由用户操作并确认；本轮以 SSR 渲染与纯状态用例覆盖页面行为，真实安装组合验证留给复核与 Issue #4 验收。

## 路由

- `docs/extensions.md` EXT-004 状态保持 `broken`（实现待复核，复核通过后转 `active`）。
- `docs/port-state.yaml` blocker 不变：`mode: issue`，`active_item: EXT-004`，`resume_route: review port`，允许 `implement EXT-004` 与 `review EXT-004`。
- 下一步：`/pstack-port review EXT-004`。
