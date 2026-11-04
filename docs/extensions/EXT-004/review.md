# EXT-004：pstack 推荐可选插件启用页

- status: passed
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

实现时未运行真实 UI 与模型会话：按 playground 决策，涉及用户所选模型的会话由用户操作并确认；当时以 SSR 渲染与纯状态用例覆盖页面行为。真实安装组合验证已由本轮复核完成，证据见下方「复核证据」。

## 路由

- `docs/extensions.md` EXT-004 状态：`active`（2026-11-04 复核通过）。
- `docs/port-state.yaml` blocker：`mode: issue`，`active_item: "#4"`，`resume_route: review port`，允许 `issue #4`。
- 下一步：`/pstack-port issue #4`。

## 复核证据（2026-11-04，`review EXT-004`）

- 受审提交：`5e961c6750c6a225fec1c5dc9269b85ea0d2dca3`（实现）、`4c899c49d42f7480d4670139317a2a4bcbb1f985`（测试）、`e3f38ab08422dbfb37ed9493ab18d50e281c2226`（实现记录，审查 HEAD）；审查开始时 `git status --porcelain` 无输出。
- 上游基线：DSH `05b1cae8db6e674c5685101494d4eec24652424a`（`0.2.2-alpha.3`）；pstack `ae5650febf4320793844c12c4adaa937f417f8da`（`0.15.36`）。两个子模块工作树无改动。
- 适用 `AGENTS.md`：根 `AGENTS.md`、`playground/AGENTS.md`、`docs/decisions/AGENTS.md`。适用 accepted 决策：`2026-10-28-pstack-plugin-tools.md`（`src/**`、`tests/**`）、`2026-10-30-pstack-config-page-i18n.md`（`src/client/**`、`tests/**`）、`2026-10-30-playground-real-plugin-testing.md`（真实运行验证环境）。
- 自动化门禁：`vp check` 退出 0（95 个文件格式通过，0 errors，仅既有 `pstack/scripts/generate-pstack-harness-tree.mjs:204` warning）；`vp test run optional-plugins` 退出 0（2 个文件 / 20 个用例）；`vp test` 退出 0（18 个文件 / 122 个用例）；`vp run typecheck` 退出 0；`vp run @internal/pstack#check:harness-doc` 退出 0（2/2）；`node pstack/scripts/generate-pstack-harness-tree.mjs --check` 退出 0；`node pstack/scripts/port-fixes.mjs replay` 退出 0（无 active FIX）；`vp run build` 退出 0（5/5 任务）。
- `required_behavior` 对照：`src/internal/optional-plugins.ts` 的 OPT-02 为默认推荐、OPT-01 为 `profileOnly` + `switchable: false`；`src/client/optional-plugins-state.ts` 的 `conflictingEnabledBundles` 与 `enableRecommendedPlugins` 在启用前拦截并记录 `skipped`；`src/client/OptionalPluginsPage.tsx` 展示 `profileOnlyGuidance` / `mutexWarning` 并处理直接开关；以上均有 `tests/optional-plugins.test.ts`（14）与 `tests/optional-plugins-page.test.tsx`（6）覆盖。
- 真实安装（playground，`DSH_HOME=playground/.dsh`，`vp run playground`，127.0.0.1:17353，zh）：默认状态 `插件 → pstack 工作流 → 配置 → 推荐插件` 显示「默认推荐 OPT-02、OPT-06」；OPT-01 无开关并显示「无 Plugins 卡片…」，OPT-02 与 OPT-06 各显示「启用」。点击「一键启用推荐项」后汇总为「成功 0 项，需重启 2 项，失败 0 项，跳过 0 项」，profile `package.json` 的 `dsh.profile.bundles` 增加 forge 与 session-search，未加入 `@deepseek-ai/dsh-experimental-tool-worktree`。
- 互斥实测：在 playground 运行期 profile 临时加入 `@deepseek-ai/dsh-experimental-tool-worktree` 后刷新，OPT-02 行显示「此项与 @deepseek-ai/dsh-experimental-tool-worktree 冲突；请先关闭它。」且不提供「启用」；再点「一键启用推荐项」汇总为「成功 0 项，需重启 1 项，失败 0 项，跳过 1 项」，profile 只新增 session-search，forge 未加入。测试后运行期 profile 已还原为 base + web-app + dsh-pstack，未改 `playground/profile/`。
- 范围：`git diff --name-only 13e90a1..e3f38ab` 仅涉及 `docs/extensions.md`、`docs/extensions/EXT-004/review.md`、`src/client/OptionalPluginsPage.tsx`、`src/client/optional-plugins-locales.ts`、`src/client/optional-plugins-state.ts`、`src/internal/optional-plugins.ts`、`tests/optional-plugins-page.test.tsx`、`tests/optional-plugins.test.ts`；未改 `pstack/runtime/**`、`pstack/harness/**`、`pstack/pstack/**` 或 `pstack/README.md`。
- 截图：`.tmp/review-ext004-recommended.png` 与 `.tmp/review-ext004-mutex.png`（gitignored，不随提交）。
- 结论：`required_behavior` 全部有实现、自动化或真实安装证据；无未解决 finding。EXT 工作文件写 `passed`，登记表恢复 `active`；下一步 `/pstack-port issue #4`。
