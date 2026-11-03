# pstack 移植审查报告

- 轮次（round）：`baseline`
- 上游提交：pstack `ae5650febf4320793844c12c4adaa937f417f8da`（`0.15.36`）；DSH `ce7073d51254c26cd63b22a60835b8f948deb447`（`0.2.2-alpha.2`）
- 开始时间（started_at）：2026-11-03T14:01:26+08:00
- 完成时间（completed_at）：2026-11-03T14:28:38+08:00

## doc 自检

| 项目 | 结果 | 证据 |
|---|---|---|
| 能力边界 | PASS | `pstack/README.md` §3.3 的 `OPT-01` 至 `OPT-09` 与 `dsh.md` 的 Optional plugins 表逐项对应；每行都有启用能力、支持边界和未启用 fallback 或跳过行；package 集合由 `check:harness-doc` 的 C3 核对一致。 |
| 措辞一致 | PASS | 跳过行统一为 `Skipped in DeepSeek Harness: <step>. <reason>.`；会话目录与精确 `cwd` 分开表述；`maxDepth` 写明默认 1、行配置上限 2、`0` 按 1 处理；随包清单包含 `skills/`、`docs/guide/`、`agents/`、`README.md` 和 `LICENSE`；技能由 `pstack_skill` 加载，相对资源原处读取。 |
| 归类判断 | PASS | `Local replacements` 的 7 行为 `create-skill`、`/deslop`、`/loop`、`/automate`、Custom Mode、`/visualize`、`control-ui`/`control-cli`/`cursor-team-kit`；每个名字都有 README 记录的替代方案，并出现在随包技能、playbook 或 reference 的运行期步骤中；`docs/harness-doc.yaml` 的 builtins 检查通过。 |

## 整文档审查

- `pstack/harness/docs/harness/dsh.md`：保留上游模板的六个章节及其顺序，追加 `Local replacements` 与 `Optional plugins`；9 个 `OPT` 行均含启用能力和未启用处理；无 `poteto-models.mdc`、`~/.claude/` 等过时名称；unslop 扫描无命中。
- `pstack/README.md`：§8 共 135 个唯一能力行，122 个 `已实现`、13 个 `不适用（平台排除）`；324 个相对链接全部可解析；每个能力 ID 只在分阶段状态表定义一次；本轮没有 core `required_behavior` 或 core EXT 输入。
- 根 README：`README.md` 与 `README.zh.md` 同步核对；均记录 58 个技能、23 个 playbook、5 个原生工具、2 个 agent preset、5 个随包脚本；pstack 上游基线提交更新为 `ae5650f`；可选插件表覆盖 9 个插件包。
- `docs/port-fixes.yaml`：`compact` 退出 0，无退役候选，活跃台账保持为空。
- 五条门禁均退出 0：`vp check`、`vp test`、`vp run @internal/pstack#check:harness-doc`、`node pstack/scripts/generate-pstack-harness-tree.mjs --check`、`node pstack/scripts/port-fixes.mjs replay`。
