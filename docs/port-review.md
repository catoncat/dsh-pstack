# pstack 移植审查报告

- 轮次（round）：`baseline`
- 上游提交：pstack `ae5650febf4320793844c12c4adaa937f417f8da`（`0.15.36`）；DSH `05b1cae8db6e674c5685101494d4eec24652424a`（`0.2.2-alpha.3`）
- 完成时间（completed_at）：2026-11-04T13:51:29+08:00
- 结论：port 轮次完成。实现审查通过，documentation-only 的 DOC-01 已解决，无开放 finding；无 core Issue 或 core EXT 验收事项。

## 最终产物

- [pstack/harness/docs/harness/dsh.md](../pstack/harness/docs/harness/dsh.md)：英文 DSH 适配文档；保留上游模板六个章节，追加 `Local replacements` 与 `Optional plugins`。
- [pstack/pstack/docs/harness/dsh.md](../pstack/pstack/docs/harness/dsh.md)：由生成器刷新的副本，与手写源逐字一致。
- [pstack/README.md](../pstack/README.md)：135 个原子能力的实现、审查、文档与最终覆盖记录。
- [README.md](../README.md)、[README.zh.md](../README.zh.md)：两个根 README 语言版本已同步动态内容。
- [docs/port-fixes.yaml](port-fixes.yaml)、[docs/port-fixes-archive.yaml](port-fixes-archive.yaml)：compact 后均无记录；无退役候选或编号复用。

## DOC-01 与 OPT 降级结论

DOC-01 已解决。OPT-01 记录独立 worktree bundle 无 Plugins 卡片、非 Web profile 的 `dsh.profile.bundles` 选择路径、Web/Desktop 既有独立选择保持隐藏并由 profile 文件管理；Web/Desktop 默认通过 OPT-02 的 Change requests & worktrees 同时启用面板和模型侧 `create_worktree`。独立 bundle 与 forge bundle 不得同时选择，避免重复 `worktree` 与 `tool-worktree` id。OPT-02 记录 GitHub 状态需要 `gh` 登录、本地建树不需要、没有模型侧变更请求工具、没有 stack verdict 或 `origin` CLI。双语根 README 的 DSH 已验证基线为 `0.2.2-alpha.3`。

| OPT | 未启用 fallback / skip | 主要边界 |
|---|---|---|
| OPT-01 | `bash` 执行 `git worktree add`，路径传给子代理 `cwd`；云 dashboard 或专用云机器输出 DSH 跳过行 | 本地 ref、不 fetch、每次调用改变 Session 目录、不自动为每个子代理建树；独立 bundle 与 OPT-02 互斥 |
| OPT-02 | `bash` 执行 `gh`；保留 `watch-pr` | GitHub 状态需登录；无模型侧变更请求工具，但有 `create_worktree`；与独立 worktree bundle 互斥 |
| OPT-03 | 项目浏览器脚本；无可用驱动时输出 DSH 跳过行 | 基础包加一个 provider；单 provider 槽；无视频；Stagehand 需 Chromium 与独立模型 |
| OPT-04 | 项目桌面驱动；无可用驱动时输出 DSH 跳过行 | 仅 macOS PTC；单 computer-use provider 槽；Windows 未完成；无视频 |
| OPT-05 | `bash` 前台命令或后台 job | 仅终端；加到所有 Agent；持久状态需清理；无视频 |
| OPT-06 | 用户提供的 resume note 或证据；历史转写读取输出 DSH 跳过行 | 跨会话要求精确 `cwd`；当前会话用 `session_event_search`；子代理覆盖未证实 |
| OPT-07 | 本地文件与标准搜索、fetch；缺失 MCP 类别标未搜索 | 每个 server 单独配置；无自动类别发现 |
| OPT-08 | `pstack_subagent`、`workflow`、`todo_write` | 与 `pstack_subagent` 冲突；替换全局子代理控制 |
| OPT-09 | `create_goal` 加 `schedule_create` 或后台 `bash` watcher | 不是同一 Session 常驻循环；无事件 watcher；不订阅 forge 事件 |

## 运行期替代

| 上游名字 | DSH 替代 |
|---|---|
| `create-skill` | `writing-for-agents`，直接写并验证 `SKILL.md` |
| `/deslop` | `/no-comments` |
| `/loop` | `create_goal`、`schedule_create` 或后台 `bash` watcher；不订阅 forge 事件 |
| `/automate` | `writing-for-agents`；历史证据用 OPT-06 fallback |
| Custom Mode | 每个任务调用 `/poteto-mode`；`poteto-agent` 仅作 delegate，不替代常驻根模式 |
| `/visualize` | Mermaid；渲染媒体用宿主图像、视频或 ffmpeg 工具 |
| `control-ui`、`control-cli`、`cursor-team-kit` | 可选 browser、desktop 或 terminal 插件；缺失 GUI 或视频证据标跳过 |

以上名字均有 README 替代记录，并出现在随包技能、playbook 或 reference 的运行期步骤中。纯审查台账、无替代的平台排除与 OPT 降级未混入 `Local replacements`。

## doc 自检

1. **能力边界：PASS。** README 的 OPT-01 至 OPT-09 与 `dsh.md` 逐项一致，包含支持范围、缺口、默认状态、实验性、启用条件、fallback 或 skip。9 个 OPT 编号和准确包名集合一致。
2. **措辞一致：PASS。** 跳过行格式、`workspace` 与精确 `cwd`、默认值、随包 `skills/`、`docs/guide/`、`agents/`、`README.md`、`LICENSE`，以及 `pstack_skill` 加载技能与 `read` 读取已知文件的区分已核对。
3. **归类判断：PASS。** `Local replacements` 覆盖全部运行期替代，每个名字同时有 README 替代方案并出现在运行期文档；没有混入排除项或纯台账。

## 整文档审查

- **PASS。** 已按上游 `technical-writing` 与 `unslop` 完整复核 `dsh.md`、`pstack/README.md` 和双语根 README；reference mode 的能力记录保持事实、证据与缺口，安装与使用段保持 how-to mode。
- 修复了两处 DOC-01 待办叙述，改为完成状态；修正英文 `Friendly links` 的 sentence case 与导航文字；清除双语友情链接行的破折号。
- 独立复核后补正五处适配行为：单路由与自动面板的子代理计数；缺失角色行回退父级路由；预算目标的最低 effort 超限处理；Arena cross-judge 跳过继承别名并按模型族筛选；`poteto-agent` 仅作 delegate、不是常驻根模式。同步清理适配文档中的分号。
- 独立只读复核确认版本、数量、五个原生工具、两个 preset、五个脚本 id、OPT 集合与互斥、浏览器单 provider 槽和双语一致性无其他问题。
- 最终语义审计退出 0：9 个 OPT 行均有 fallback，135 个能力状态编号唯一，320 条相对证据链接存在且行号有效。
- 根 README 国际化核对：当前为 `README.md` 与 `README.zh.md` 两个独立语言文件，无同文件多语言段落；两文件对应动态内容均已同步，无缺失语言。架构无变化，`How it works` / `实现方式` 未改。

## 验证

适用约定：根 `AGENTS.md`、`playground/AGENTS.md`、`docs/decisions/AGENTS.md`；只读 DSH 证据另遵循其根、`packages/`、`packages/experimental/` 与 `docs/` 的 `AGENTS.md`。适用 accepted 决策为 `2026-10-28-pstack-plugin-tools.md`、`2026-10-29-pstack-harness-tree-port.md`、`2026-10-28-skills-directory-scope.md`、`2026-10-30-playground-real-plugin-testing.md`、`2026-10-30-script-commands-in-vite-config.md`、`2026-10-30-pstack-config-page-i18n.md`。其余 accepted 与 proposed 记录已按检索约定读取；本阶段没有决策记录变更。

验证环境：Vite+ `1.4.0`、Vite+ Node `24.22.1`、Vitest `5.0.5`、pnpm `12.15.0`；直接 Node `26.13.0`；DSH CLI `0.2.2-alpha.3`。测试在仓库根执行；本轮是文档收尾，未启动服务、未运行涉及用户所选模型的真实会话。

| 检查 | 命令 | 退出码 | 结果 |
|---|---|---:|---|
| 静态检查 | `vp check` | 0 | 95 个文件格式正确；0 errors；既有生成器第 204 行 `require-array-sort-compare` warning 保留 |
| 插件测试 | `vp test` | 0 | 18 个测试文件、122 个测试通过 |
| 适配文档对账 | `vp run @internal/pstack#check:harness-doc` | 0 | README、上游模板、`src/` 与生成树一致 |
| 生成树漂移 | `node pstack/scripts/generate-pstack-harness-tree.mjs --check` | 0 | `pstack/pstack is up to date.` |
| FIX replay | `node pstack/scripts/port-fixes.mjs replay` | 0 | 无 active FIX；replay 通过 |
| 语义审计 | `node .tmp/doc-final-audit.mjs` | 0 | OPT、能力编号、双语动态内容与证据链接全部通过 |

补充命令：`node pstack/scripts/port-fixes.mjs compact` 退出 0，无退役记录；`cmp -s pstack/harness/docs/harness/dsh.md pstack/pstack/docs/harness/dsh.md` 退出 0；`git diff --check` 退出 0。首次对账在修改手写源后、刷新生成树前按预期退出 1；生成器刷新后复验通过，不计为最终门禁失败。

## 未覆盖与有意跳过

- 本轮未启动 playground、操作真实 UI 或运行真实会话；EXT-004 的当前真实安装与 UI 证据沿用 Issue #4 验收。文档更新不新增运行行为。
- 未运行真实 TLC、视频、外部 forge 流程；`pstack/README.md` §9.3 的 U-01 至 U-06 六项未决证据保持原样，不因文档完成而核销。
- 无其他未覆盖、证据不足或有意跳过项。
