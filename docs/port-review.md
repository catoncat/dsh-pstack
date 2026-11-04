# pstack 移植审查报告

- 轮次（round）：`baseline`
- 上游提交：pstack `ae5650febf4320793844c12c4adaa937f417f8da`（`0.15.36`）；DSH `05b1cae8db6e674c5685101494d4eec24652424a`（`0.2.2-alpha.3`）
- 完成时间（completed_at）：2026-11-04T16:45:50+08:00
- 结论：`review port` 通过，`doc` 完成；无开放 finding、core 验收事项或 blocker。

## 最终覆盖

第 8 节逐项记录 135 个唯一能力的状态。完整 79 项、已覆盖但有适配语义差异 6 项、条件覆盖 35 项、部分覆盖 2 项、平台排除 13 项。平台排除不计为通过。

部分覆盖项是 `SKL-25`（技能 `paths` 不自动挂载）和 `SKL-32`（mp4 与逐帧核验需要外部工具）。`U-01` 至 `U-06` 的未决证据保留在 `pstack/README.md` 第 9.3 节，未因文档完成而核销。8 个插件内实现项均已实现并通过审查，3 个本地 EXT 保持 `active`。

## 文档产物

- `pstack/harness/docs/harness/dsh.md`：英文宿主适配，保留上游六个章节，追加 `Local replacements` 与 `Optional plugins`。生成副本 `pstack/pstack/docs/harness/dsh.md` 由生成器刷新。
- `pstack/README.md`：中文能力审查与最终覆盖，保留 135 项状态、证据、缺口和未决证据。
- `README.md`、`README.zh.md`：已同步全部 OPT 包名、默认状态、独立 worktree 选择规则、互斥关系、默认推荐、能力边界与降级方案；DSH 版本对照只保留在这两个文件。

## doc 自检

1. **能力边界：PASS。** OPT-01 至 OPT-09 的包名、`cwd` 精确匹配、provider 槽、互斥、外部工具、未确认子代理 transcript 和视频缺口在 `pstack/README.md`、`dsh.md` 与双语根 README 中一致。
2. **措辞一致：PASS。** 跳过行采用 `Skipped in DeepSeek Harness: <step>. <reason>.`，未启用能力不写成通过；默认关闭与实验性状态、随包 `agents/` 和 `LICENSE`、技能经 `pstack_skill` 加载而资源按相对路径读取的表述已核对。
3. **归类判断：PASS。** 七个 Local replacements 条目均有 README 替代方案，且上游名字出现在随包技能、playbook 或 reference 的运行期步骤中。纯平台排除和可选插件降级没有混入该小节；`check:harness-doc` 的模板、映射和随包引用检查通过。
4. **版本边界：PASS。** 根双语 README 保留 DSH `0.2.2-alpha.3` 与 `0.2.2-alpha.2` 的版本对照；随包 README 和 `dsh.md` 只描述当前 DSH 行为。`engines.dsh` 为 `>=0.2.2-alpha.3`，DSH catalog 与 lockfile 为 `0.2.2-alpha.3`，锁文件中的 Cordis 为 `4.0.6-alpha.2`。当前 `package.json` 无冗余 Cordis peer 依赖，删除提交为 `7f74745`。破坏性基线提交 `c1870fd` 标题为 `feat!: support dsh0.2.2-alpha.3`。

## 整文档审查

按上游 `technical-writing` 与 `unslop` 技能审读 `dsh.md`、`pstack/README.md` 和双语根 README。修正了 `maxDepth` 重复说明、`workspace` 与精确 `cwd` 的混用、上轮文档状态残留和可选插件缺项；没有新增重复状态表。135 行状态表由临时校验脚本核对，行数与唯一编号均为 135，分类计数与最终结论一致。checker 确认英文模板的章节、行和引用完整，生成树无手工编辑。

## compact

`node pstack/scripts/port-fixes.mjs compact` 退出 0：`No retired FIX records; compact passed.` 活跃台账与 archive 均为空，无编号退役或复用。

## 验证记录

适用约定：根 `AGENTS.md`、`docs/decisions/AGENTS.md`；pstack 生成树、插件工具、脚本命令、依赖 catalog 和 playground 的 accepted 决策；版本边界、`maxDepth`、角色查询和提交格式的 proposed 决策。验证环境：vite-plus `1.4.0`，项目配置 Node `24.22.1`、pnpm `12.15.0`，仓库根执行。未启动 playground 或真实模型会话，本阶段仅做文档核对。

| 检查 | 命令 | 退出码 | 结果 |
|---|---|---:|---|
| 静态检查 | `vp check` | 0 | 95 个文件格式正确；0 errors；1 个既有 warning：`pstack/scripts/generate-pstack-harness-tree.mjs:204` 的 `require-array-sort-compare` |
| 插件测试 | `vp test` | 0 | 18 个测试文件、123 个测试通过 |
| 适配文档对账 | `vp run @internal/pstack#check:harness-doc` | 0 | 生成树与适配文档一致，2/2 任务成功 |
| 生成树漂移 | `node pstack/scripts/generate-pstack-harness-tree.mjs --check` | 0 | `pstack/pstack is up to date.` |
| FIX 重放 | `node pstack/scripts/port-fixes.mjs replay` | 0 | `No active FIX records; replay passed.` |
| 覆盖计数 | `node .tmp/verify-port-doc.mjs` | 0 | 135 行、135 个唯一 ID；79/6/35/2/13 与 README 一致 |

未覆盖、证据不足和有意跳过项：无新增。既有 `U-01` 至 `U-06` 保留；真实会话仍按 playground 约定由用户操作并确认，本轮未代跑。
