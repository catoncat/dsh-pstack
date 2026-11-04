# 决定：插件以 DSH Web profile 为唯一基准，非 Web profile 适配内容不再登记

Status: proposed
Date: 2026-11-04
Scope: README.md, README.zh.md, docs/**, src/**, tests/**, pstack/**, playground/**, .agents/skills/pstack-port/**
Implemented-by: -
Review: 2027-05-04

## 背景

本仓文档同时描述多种 DSH profile 形态：带 web app 的 Web/Desktop profile（有 Plugins 页）、没有 web app 的 profile（只能手写 `dsh.profile.bundles` 选 bundle）、以及 headless（`dsh headless`，无 `agentPresets` 服务，`ask_user_question` 没有人类回答者）。

DSH `0.2.2-alpha.3` 合并 forge 面板与 worktree 模型工具后，独立 worktree bundle 在 Plugins 页没有卡片，只对手改 profile 文件的非 Web 场景有意义。为了让文档“完整”，`OPT-01` 以纯说明行留在可选插件目录里（`profileOnly: true`、`switchable: false`），页面为它单独渲染一段 profile 指引，双语根 README 多一行安装说明，`dsh.md` 多一行互斥告诫，`pstack/README.md` 多一条 headless 未决证据。这些内容都无法在本仓验证：playground 提交的 profile 从随附 `web` 模板复制，插件的安装入口、配置页与推荐插件区也只在有 web app 的 profile 上存在。

代价是每轮移植审查和每次 DSH 破坏性更新都要多核对一套死路径，目录里还出现“看得见却开关不了”的行。

## 决定

基准只有一个：DSH Web profile（随附 `web` 模板 + `dsh-pstack`，即 `playground/profile/` 提交的形态）。文档、可选插件目录、页面与测试只描述该 profile 下可观察的行为。

已裁剪的内容：

- `OPT-01`（独立 worktree bundle 说明行）从 `src/internal/optional-plugins.ts`、`OptionalPluginsPage.tsx` 的 `profileOnly` 分支、`optional-plugins-locales.ts`、两份 `dsh.md`、`pstack/README.md`、双语根 README、`docs/extensions.md` EXT-004、`.agents/skills/pstack-port/SPEC.md` 与相关测试中移除。目录编号保持 `OPT-02`～`OPT-09`，不重排、不复用 `OPT-01`。
- 本地工作树的启用路径统一写 `OPT-02`（Change requests & worktrees，含模型侧 `create_worktree`）；未启用时的替代统一写 `bash` 的 `gh` 与 `git worktree add`。
- `OPT-02` 的 `exclusiveWith` 互斥保护保留：profile 文件里残留的独立 worktree bundle 仍会阻塞 forge 开关、显示 `mutexWarning`，并在“一键启用推荐项”里跳过。它是 Web profile 上的防御行为，不是非 Web 适配。
- headless 的 `ask_user_question` 回答者问题（原 `U-02`）移出 `pstack/README.md` 第 9.3 节，其余未决项顺延为 `U-02`～`U-05`；`TOOL-02` 的最终覆盖写 `完整（live root）`；`dsh.md` 的 `AskQuestion` 行不再给 headless 纯文本提问替代。

例外：playground 的自动化测试可以用非 Web 形态。`playground/run-cases.mjs` 继续用 `dsh headless --json --profile pstack-headless` 跑能力用例，`playground/browser.mjs` 继续驱动 17353 的 Web 会话；它们是开发期验证手段，不是对用户 profile 的承诺，见 [2026-11-03-playground-capability-runner.md](2026-11-03-playground-capability-runner.md) 与 [2026-10-30-playground-real-plugin-testing.md](2026-10-30-playground-real-plugin-testing.md)。原 `playground/cases/preset.case.mjs` 只是记录 headless 缺 `agentPresets` 的跳过占位，已删除；preset 路由仍由 `playground/README.md` 场景清单第 5 项的真实 Web 会话验证。

## 备选方案

- **继续并列维护 Web 与非 Web 两套启用路径（保留 `OPT-01` 行与 `profileOnly` 指引）。** 不选：独立 bundle 在 Plugins 页无卡片、本仓无法在 playground 验证，每轮审查都要多核对一套死路径，还要维护“不得同时选择”这类只有手改 profile 才触发的约束。
- **把非 Web 内容收进单独小节而不删除。** 不选：`src/internal/optional-plugins.ts` 是页面与测试的唯一目录来源，收进小节仍会在页面渲染出一行开关不了的条目，且仍要跟随 DSH 版本维护。
- **连 playground 的 headless runner 一起裁掉，只留 Web 会话验证。** 不选：headless runner 是 agent 唯一能自动回归真实工具派发与子代理路由的手段，裁掉会把回归成本全部转给人工操作。

## 后果

- 得到：可选插件目录、双语根 README、`dsh.md`、EXT-004 与测试只描述一条启用路径；`check:harness-doc` 的 `OPT-*` 对账不再需要为非 Web 行开例外；未决证据从 6 项降到 5 项，135 项能力计数与分类不变。
- 付出：手改 profile 文件或使用无 web app profile 的用户得不到本仓说明，只能读 DSH 官方文档；他们同时选了独立 worktree bundle 与 forge bundle 时，页面只给互斥警告，不解释如何移除。
- 重新考虑的时机：本仓要正式支持非 Web profile（例如提供 headless 专用配置或文档），或 DSH 让独立 worktree bundle 重新出现在 Plugins 页。恢复时新增编号，不复用 `OPT-01`，除非语义完全相同。
