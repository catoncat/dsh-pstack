# pstack 移植审查报告

- 轮次（round）：`baseline`
- 上游提交：pstack `ae5650febf4320793844c12c4adaa937f417f8da`（`0.15.36`）；DSH `05b1cae8db6e674c5685101494d4eec24652424a`（`0.2.2-alpha.3`）
- 完成时间（completed_at）：2026-11-05T10:41:00+08:00
- 结论：`review port` 通过，`doc` 完成；无开放 finding、core 验收事项或 blocker。本轮为 `baseline` 轮次，无 core Issue 或 EXT 输入。

## 最终覆盖

第 8 节逐项记录 135 个唯一能力的状态。完整 79 项、已覆盖但有适配语义差异 6 项、条件覆盖 35 项、部分覆盖 2 项、平台排除 13 项。平台排除不计为通过。

部分覆盖项是 `SKL-25`（技能 `paths` 不自动挂载）和 `SKL-32`（mp4 与逐帧核验需要外部工具）。`U-01` 至 `U-05` 的未决证据保留在 `pstack/README.md` 第 9.3 节，未因文档完成而核销。8 个插件内实现项均已实现并通过 2026-11-05 的 `review port` 全量复核，3 个本地 EXT 保持 `active`。

## 文档产物

- `pstack/harness/docs/harness/dsh.md`：英文宿主适配，保留上游六个章节，追加 `Local replacements` 与 `Optional plugins`。本轮对账一致，未改写；生成副本 `pstack/pstack/docs/harness/dsh.md` 由生成器核对无漂移。
- `pstack/README.md`：中文能力审查与最终覆盖，更新文档状态区（§8 引言、§8.5、§9.4）记录本轮 `doc` 完成；135 项状态、证据、缺口和未决证据保留原样。
- `README.md`、`README.zh.md`：逐项核对版本、计数、入口、原生工具、随包脚本、OPT 集合与版本对照，动态内容无差异，本轮未改写。

## doc 自检

1. **能力边界：PASS。** README 可选插件表 OPT-02 至 OPT-09 的支持范围与缺口在 `dsh.md` 对应行均有准确限制：forge 无模型侧变更请求工具与 stack verdict、browser 单 provider 槽与图像模型要求、CUA 仅 macOS PTC 与单槽、终端不覆盖 GUI 且不录像、session-search 子代理 transcript 覆盖未证实、MCP 无默认 server 与类别发现、Agent Teams 无 PR frontier 且禁用全局 child controls、ralph 非常驻循环且无事件 watcher。每个 OPT 都有启用能力、未启用 fallback 或合规跳过行；Optional plugins 小节保留 3 条 `Skipped in DeepSeek Harness` 行。
2. **措辞一致：PASS。** 跳过行采用 `Skipped in DeepSeek Harness: <step>. <reason>.`；会话搜索统一写精确 `cwd` 相等而非 `workspace`，不用模糊 workspace 表述；默认值与实验性状态一致；随包清单含 `agents/` 与 `LICENSE`；技能经 `pstack_skill` 加载，资源按相对路径读取，不写成直接读 `SKILL.md`。未启用能力不写成通过。
3. **归类判断：PASS。** `Local replacements` 的 `create-skill`、`/deslop`、`/loop`、`/automate`、Custom Mode、`/visualize`、`control-ui`、`control-cli`、`cursor-team-kit` 均有 README 替代方案，且上游名字全部出现在随包技能、playbook 或 reference 的运行期步骤中（143 个随包 Markdown 逐一核对）。纯平台排除与 `OPT-*` 降级没有混入该小节；`check:harness-doc` 的模板行、章节、引用与 `src/` 参数核对通过。
4. **版本边界：PASS。** 本轮沿用已落地的 DSH `0.2.2-alpha.3` 破坏性基线，非新触发轮次。根双语 README 保留 DSH `0.2.2-alpha.3` 与 `0.2.2-alpha.2` 的版本对照；`pstack/README.md` 与 `dsh.md` 只描述当前 DSH 行为，无旧版不支持说明或兼容分支；`src/**`、`tests/**` 无旧 DSH 运行时分支（仅版本对照守卫测试）。`engines.dsh` 为 `>=0.2.2-alpha.3`，DSH catalog 与 `minimumReleaseAgeExclude` 为 `0.2.2-alpha.3`，Cordis peer 为 `~4.0.6-alpha.2`；破坏性基线提交 `c1870fd` 标题为 `feat!: support dsh0.2.2-alpha.3`，使用 `type!:`。

## 整文档审查

按上游 `technical-writing` 与 `unslop` 技能审读 `dsh.md` 与 `pstack/README.md`。`dsh.md` 无 em dash、花引号、AI 词汇或被动堆叠，章节与上游模板一一对应，两个追加小节齐全；本轮无需修改。`pstack/README.md` 修正了 §8 引言与 §8.5 之间的文档状态重复表述，把「本轮 `doc` 对账无差异」收拢到 §8.5 单一权威位置，§8 引言改为指向 8.5 与 9.4；未新增重复状态表、未改能力状态或功能结论、未新增章节。135 行状态表与 79/6/35/2/13 计数经脚本复核一致。改完重跑 S-27 对账与五条门禁，均退出 0。

## compact

`node pstack/scripts/port-fixes.mjs compact` 退出 0：`No retired FIX records; compact passed.` 活跃台账 `docs/port-fixes.yaml` 与 `docs/port-fixes-archive.yaml` 均为空，无退役候选、无编号退役或复用；replay 不读 archive。

## 验证记录

适用约定：根 `AGENTS.md`（Vite+ 门禁与 playground 唯一真实环境）、`docs/decisions/AGENTS.md`（决策检索）、`docs/architecture.md`（模块边界）。相交 accepted 决策：插件工具面、生成树与适配树、Web profile 基准、DSH 命名空间外链、playground 真实测试、pnpm catalog 与默认 store home、脚本命令位置、配置页 i18n、skills 目录边界、决策状态更新；与当前实现一致，无冲突。`proposed` 记录不作为本轮依据。验证环境：vite-plus `1.4.0`，项目配置 Node `24.22.1`、pnpm `12.15.0`，仓库根 workspace-write 沙箱执行，pstack `ae5650f` / DSH `05b1cae` 固定子模块提交，无网络依赖。真实运行层按 playground 决策：涉及用户所选模型的会话由用户操作并确认，本轮只做命令、配置与文档层，不代跑真实会话、不另建 home 或 profile、未启动 web 服务。

| 检查 | 命令 | 退出码 | 结果 |
|---|---|---:|---|
| 静态检查 | `vp check` | 0 | 94 个文件格式正确；0 errors；1 个既有 warning：`pstack/scripts/generate-pstack-harness-tree.mjs:204` 的 `require-array-sort-compare`（非本轮新增） |
| 插件测试 | `vp test` | 0 | 18 个测试文件、123 个测试通过（含 `harness-doc.test.ts` 11 项、`optional-plugins.test.ts` 15 项、`port-fixes.test.ts` 4 项） |
| 适配文档对账 | `vp run @internal/pstack#check:harness-doc` | 0 | `harness doc is consistent with README, the upstream template and src.`；`generate --check` 子任务 `pstack/pstack is up to date.`（2/2 任务成功） |
| 生成树漂移 | `node pstack/scripts/generate-pstack-harness-tree.mjs --check` | 0 | `pstack/pstack is up to date.` |
| FIX 重放 | `node pstack/scripts/port-fixes.mjs replay` | 0 | `No active FIX records; replay passed.` |
| 覆盖计数与 OPT 边界 | `node .tmp/verify-port-doc.mjs` | 0 | 135 行、135 个唯一 ID；79/6/35/2/13 与 README §8、§9.4 一致；9 个 builtin、8 个章节、3 条跳过行、OPT-02 至 OPT-09 的 fallback 全通过；`SCR-06`/`SCR-07` 按 §2.6 只作去向记录 |

未覆盖、证据不足和有意跳过项：无新增。既有 `U-01` 至 `U-05` 保留；真实会话仍按 playground 约定由用户操作并确认，本轮未代跑。
