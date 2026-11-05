<div align="center">
  <img src="./assets/logo.png" width="144" alt="dsh-pstack logo" />
  <h1>dsh-pstack</h1>
  <p><strong>把 pstack 带进 DeepSeek Harness</strong></p>
  <p><a href="./README.md">English</a> · 中文</p>
  <p>
    <a href="https://npmx.dev/package/dsh-pstack"><img src="https://img.shields.io/npm/v/dsh-pstack?style=flat-square&colorA=080f12&colorB=1fa669" alt="npm version" /></a>
    <a href="https://github.com/l246804/dsh-pstack/blob/main/LICENSE"><img src="https://img.shields.io/github/license/l246804/dsh-pstack?style=flat-square&colorA=080f12&colorB=1fa669" alt="license" /></a>
  </p>
</div>

`dsh-pstack` 是 [pstack](https://github.com/cursor/plugins/tree/main/pstack) 面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的社区移植项目。

> [!IMPORTANT]
> [!IMPORTANT]
> 本分支包含开发基建。可安装的插件请使用已发布版本。

## 开发

初始化固定版本的上游子模块并安装依赖。

```sh
git submodule update --init --recursive
vp install
```

移植基准见 [`port/README.md`](./port/README.md)。其中定义能力审核、生成的 `pstack/` 树、随包技能和验证方式。

浏览器与无头验证见 [playground 指南](./playground/README.md)。

## 随包技能

`skills/` 工作区包含独立维护的技能。`skills/authored/` 是本仓技能，`skills/.agents/skills/` 是通过 [`skills/package.json`](./skills/package.json) 的 `skills` 声明加载的 vendored 技能，来源与哈希记录在 [`skills/skills-lock.json`](./skills/skills-lock.json)。cursor-team-kit 技能来自固定 ref 的 `cursor/plugins`，保留的上游 MIT 许可证与来源说明在 [`licenses/cursor-team-kit`](./licenses/cursor-team-kit)。

| 技能 | 来源 | 作用 |
|---|---|---|
| `writing-for-agents` | vendored | 编写技能与 agent 文档。 |
| `retro` | vendored | 只读复盘 agent 环境，不修改仓库。 |
| `deslop` | vendored | 清理 diff 中的 AI 代码噪声。 |
| `control-ui` | vendored | 驱动并检查本地 Web、IDE 或 Electron UI，产出证据。 |
| `control-cli` | vendored | 驱动并检查交互式 CLI 或 TUI，产出证据。 |
| `decision-write` | authored | 创建、落地和取代决策记录。 |
| `decision-audit` | authored | 审计决策记录状态与关联关系。 |
| `setup-project-docs` | authored | 搭建可持续维护的项目文档。 |
| `docs-drift` | authored | 检查文档漂移并修复获批项。 |

## 兼容性

每行记录一个已发布版本及其依赖基线。DSH 或 pstack 的破坏性变更需要新基线时，追加一行。

| 依赖 | 兼容范围 | dsh-pstack 发布版本 |
|---|---|---|
| DSH | `<=0.2.2-alpha.2` | `v0.2.1` |
| pstack | `0.15.36` | `v0.2.1` |

## 鸣谢

[pstack](https://github.com/cursor/plugins/tree/main/pstack) 由 Lauren Tan 与 Cursor 团队设计并开源。[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 由 DeepSeek 团队提供。[cursor/plugins `cursor-team-kit`](https://github.com/cursor/plugins/tree/main/cursor-team-kit) 提供 vendored 的 `deslop`、`control-ui` 与 `control-cli` 技能。[mattpocock/skills](https://github.com/mattpocock/skills) 提供 vendored 的 `writing-for-agents` 与 `retro` 技能。

本项目是社区移植，不是 Cursor 或 DeepSeek 官方发行。

## License

本仓原创代码与文档采用 [MIT License](./LICENSE) © [leiwang](https://github.com/l246804)。上游项目及 vendored 技能保留各自的许可证与声明。
