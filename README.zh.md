<div align="center">
  <img src="./assets/logo.png" width="144" alt="dsh-pstack logo" />
  <h1>dsh-pstack</h1>
  <p><strong>把严谨的 Agent 工作流带进 DeepSeek Harness。</strong></p>
  <p><a href="https://github.com/cursor/plugins/tree/main/pstack">pstack</a> 面向 <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a> 的社区移植项目。</p>
  <p><a href="./README.md">English</a> · 中文</p>
  <p>
    <a href="https://npmx.dev/package/dsh-pstack"><img src="https://img.shields.io/npm/v/dsh-pstack?style=flat-square&colorA=080f12&colorB=1fa669" alt="npm version" /></a>
    <a href="https://github.com/l246804/dsh-pstack/blob/main/LICENSE"><img src="https://img.shields.io/github/license/l246804/dsh-pstack?style=flat-square&colorA=080f12&colorB=1fa669" alt="license" /></a>
  </p>
</div>

> [!NOTE]
> 本项目是社区移植，不是 Cursor 或 DeepSeek 官方发行。当前预览版本为 `0.3.0-beta.1`。

## 概览

`dsh-pstack` 把 pstack 的严谨 Agent 工作流带进 DeepSeek Harness。它以 DSH 插件包的形式提供 pstack 技能、按角色派发子代理、角色模型配置和配套工具。

它面向那些不只看答案、也看过程的工程工作：实现前先规划，用隔离子代理并行处理，按角色使用明确的模型路由，并在宣布完成前对真实产物做验证。

| 指标 | 数值 |
|:--|:--|
| 已审核的 Cursor 能力 | **68** |
| 生成的 pstack 技能 | **58** |
| 内置 pstack 工具 | **5** |
| Agent 预设 | **5**（2 个根预设，3 个子代理预设） |
| 角色定义 | **17** |
| 审核结果 | **39 项直接映射 · 2 项官方插件 · 18 项插件实现 · 9 项有意舍弃** |

完整能力审核见 [`port/audit.md`](./port/audit.md)，运行时映射见 [`port/dsh.md`](./port/dsh.md)。

## 主要能力

### 预设与按角色路由的子代理

`pstack_subagent` 把工作派发给全新的子代理。一次调用可以选择一个 pstack 角色、一个自动面板，或用 `roleIndex` 选择列表角色中的某一项；`reasoningEffort` 可以调整所选路由的起始推理强度。每次结果都会返回子会话 id 和解析出的真实路由。

随包提供两个根预设和三个子代理预设：

| 预设 | 范围 | 用途 |
|---|---|---|
| `poteto-mode` | 根 | 把完整 `poteto-mode` 技能常驻系统提示，使用标准工具，并以 `pstack_subagent` 作为唯一直接派发入口。 |
| `poteto-mode-creator` | 根 | 同一套持久技能，使用创造模式工具，包含 `tool-cordis`、agent-preset 技能，并以 `pstack_subagent` 作为唯一直接派发入口。 |
| `poteto-agent` | 子代理 | 实现型子代理，注入 pstack 人格和 `poteto-mode` 指令。 |
| `comment-sicko` | 子代理 | 只读评论评审子代理，报告删除目标和 `MUST KILL` 符号。 |
| `readonly` | 子代理 | 带只读沙箱策略的研究子代理，用于检查和取证。 |

不要在任一 pstack 根预设下启用 Agent Teams。两者都拥有派发和任务协调能力。检测到 Agent Teams 服务时，pstack 根预设会直接启动失败。

### 明确的技能加载

生成的 pstack 树包含 58 个技能。大多数技能设置 `disable-model-invocation: true`，不进入模型目录，由 `pstack_skill` 按精确名称加载；可见的随包技能使用普通 `skill` 工具。

插件同时暴露 vendored 技能和本仓 authored 技能。`references/`、`playbooks/` 等相对资源在 `SKILL.md` 旁读取；只有仍位于技能目录内的 `../` 路径才被允许。

### 实时模型和角色查询

- `pstack_models` 列出当前 DSH 部署实际提供的模型路由，以及每条路由的推理强度 token。
- `pstack_roles` 列出每个 pstack 角色的 `shape`、`autoPanel`，以及是否适用 `roleIndex`。
- `$DSH_HOME/pstack-models.mdc` 保存角色路由。`pstack_subagent` 每次派发都会重新读取，因此修改后下一次派发生效，无需重启。

### Web 插件配置

打开 `dsh-pstack` 插件页，进入 **pstack 设置**。弹窗包含两个标签页：

- **推荐插件**：查看和管理与 pstack 配合的 DSH 官方插件。
- **角色模型**：用实时模型选项查看和编辑角色路由及角色预算。

### 可选渲染

`pstack_render` 处理 pstack 的可视化请求，但不会静默安装工具。安装 `pele@1.9.0` 时，它通过 Pele 将 Mermaid 图渲染为 SVG；系统有 ffmpeg 和 ImageMagick 时，它把幻灯片渲染为视频。缺少渲染器时返回明确的 `status: missing` 和安装提示。

## 快速开始

把插件安装到 DSH profile：

```sh
dsh plugin --profile web add dsh-pstack
```

也可以使用其他 profile：

```sh
dsh plugin --profile <profile> add dsh-pstack
```

然后：

1. 如果插件管理器要求，重启 profile。
2. 打开 `dsh-pstack` 插件页，选择 **pstack 设置**。
3. 用 **角色模型** 标签页设置角色路由，或运行 `/setup-pstack`。
4. 新建会话时选择 `poteto-mode` 或 `poteto-mode-creator` 预设以获得持久模式，或在其它预设里用 `/poteto-mode` 处理单个任务。

本地开发和完整验证环境见 [`playground/README.md`](./playground/README.md)。

## 工具

| 工具 | 作用 |
|---|---|
| `pstack_skill` | 按精确名称加载 pstack、vendored 或 authored 技能，包括从模型目录隐藏的技能。可选 `resource` 读取技能目录下的相对资源。 |
| `pstack_subagent` | 启动按角色路由的子代理，包括自动面板和列表角色中的指定条目。 |
| `pstack_models` | 报告实时的 provider、model 和推理强度目录。 |
| `pstack_roles` | 报告角色形态、自动面板行为和 `roleIndex` 适用性。 |
| `pstack_render` | 在本地工具存在时渲染可选的 Mermaid 图、SVG 或视频产物。 |

插件还提供子代理预设和上述工具使用的技能文件系统根目录。

## 技能目录

`skills/` 工作区包含独立维护的技能。

- `skills/authored/` 是本仓维护的技能。
- `skills/.agents/skills/` 是通过 [`skills/package.json`](./skills/package.json) 的声明加载的 vendored 技能，来源和哈希记录在 [`skills/skills-lock.json`](./skills/skills-lock.json)。

| 技能 | 来源 | 作用 |
|---|---|---|
| `writing-for-agents` | vendored | 编写技能与 agent 文档。 |
| `retro` | vendored | 只读复盘 agent 环境，不修改仓库。 |
| `deslop` | vendored | 清理 diff 中的 AI 代码噪声。 |
| `control-ui` | vendored | 驱动和检查本地 Web、IDE 或 Electron UI，产出证据。 |
| `control-cli` | vendored | 驱动和检查交互式 CLI 或 TUI，产出证据。 |
| `decision-write` | authored | 创建、落地和取代决策记录。 |
| `decision-audit` | authored | 审计决策记录状态与关联关系。 |
| `setup-project-docs` | authored | 搭建可持续维护的项目文档。 |
| `docs-drift` | authored | 检查文档漂移并修复获批项。 |

## 仓库结构

| 路径 | 作用 |
|---|---|
| [`src/`](./src) | 插件实现：工具、子代理路由、角色配置、渲染和 Web 客户端。 |
| [`pstack/`](./pstack) | 生成的 pstack 技能树和适配文档，不要手工修改生成文件。 |
| [`port/`](./port) | 移植基准：审核记录、生成器、适配文档和维护规则。 |
| [`skills/`](./skills) | authored 与 vendored 技能工作区。 |
| [`playground/`](./playground) | 真实 profile 的浏览器与无头验证环境。 |
| `upstream/cursor-plugins/` | 固定版本的 pstack 上游子模块。 |

## 开发

初始化固定版本的上游源码并安装依赖：

```sh
git submodule update --init --recursive
vp install
```

常用命令：

```sh
vp run build             # 构建插件和生成包文件
vp test                  # 单元和行为测试
vp run playground        # 启动 Web playground
vp run cases             # 运行无头验证套件
node port/generate.mjs --check
```

修改移植、审核或生成树前先读 [`port/README.md`](./port/README.md)。它定义能力审核顺序、生成规则、本地扩展和回归记录。

测试套件包含 [`tests/preset-parity.test.ts`](./tests/preset-parity.test.ts) 的 preset 对比检查。审核基线更新时同步刷新 [`tests/fixtures/dsh-0.2.2-rc.1`](./tests/fixtures/dsh-0.2.2-rc.1)。

## 文档

| 文档 | 内容 |
|---|---|
| [`port/README.md`](./port/README.md) | 移植规则、审核流程、生成树和维护边界。 |
| [`port/audit.md`](./port/audit.md) | 68 项能力的证据、处置、剩余缺口和推荐方案。 |
| [`port/dsh.md`](./port/dsh.md) | Cursor/pstack 名称到 DSH 工具、字段、路径和本地替代的运行时映射。 |
| [`playground/README.md`](./playground/README.md) | 浏览器和无头验证环境。 |

## 兼容性

| 组件 | 基线 |
|---|---|
| DSH | `>=0.2.2-rc.1`；审核基线为 `0.2.2-rc.1` |
| pstack 上游 | `ae5650febf4320793844c12c4adaa937f417f8da`（`0.15.36`） |
| dsh-pstack | `0.3.0-beta.1` |

## 鸣谢

[pstack](https://github.com/cursor/plugins/tree/main/pstack) 由 Lauren Tan 与 Cursor 团队设计并开源。[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 由 DeepSeek 团队提供。[cursor/plugins `cursor-team-kit`](https://github.com/cursor/plugins/tree/main/cursor-team-kit) 提供 vendored 的 `deslop`、`control-ui` 与 `control-cli` 技能。[mattpocock/skills](https://github.com/mattpocock/skills) 提供 vendored 的 `writing-for-agents` 与 `retro` 技能。

## License

本仓原创代码与文档采用 [MIT License](./LICENSE) © [leiwang](https://github.com/l246804)。
