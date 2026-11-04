# 决定：DSH 上游破坏性更新按插件版本分界处理

Status: proposed
Date: 2026-11-04
Scope: package.json, pnpm-workspace.yaml, README.md, README.zh.md, docs/extensions.md, src/**, tests/**, pstack/**
Implemented-by: -
Review: 2027-05-04

## 背景

DSH 处于预发布阶段，允许出现破坏性更新。本次例子是 DSH `0.2.2-alpha.3` 合并 forge 面板与 worktree 模型工具：独立 worktree bundle 不再出现在 Plugins 页，和 forge bundle 同时选择会产生重复 id。dsh-pstack `v0.2.1` 仍按旧组合实现，不能安全地运行在新 DSH 上。

[2026-10-30-dsh-version-range.md](2026-10-30-dsh-version-range.md) 只规定了统一的 `>=` 下限，没有规定上游破坏时如何划分插件版本。若每次单独写一条版本决策，会把一次性的旧版说明带进随包文档，下一次发布后还会过时。

## 决定

每次 DSH 出现已证实的破坏性更新时，按同一流程处理：

1. 把当前已发布、匹配旧 DSH 的插件版本固定为该旧 DSH 的最后支持版本。本次是 dsh-pstack `v0.2.1` 对应 DSH `0.2.2-alpha.2` 及更早版本。
2. 下一插件版本作为破坏性版本发布，`engines.dsh` 下限提升到该破坏版本，只实现新行为，不维护旧组合分支或兼容层。
3. 版本对照只写在根 `README.md` 与 `README.zh.md` 的 Compatibility 区，逐行列出 DSH 版本范围与对应的 dsh-pstack 版本。
4. 随包适配文档 `pstack/harness/docs/harness/dsh.md` 与 `pstack/README.md` 不写旧 DSH 不支持说明。它们只描述当前版本支持的行为，避免旧版说明随下个版本发布后过时。
5. release 的 changelog 使用破坏性提交标记，提交标题采用 Conventional Commits 的 `type!:` 形式，例如 `feat!:`；具体规则见 [2026-11-04-breaking-change-commit-format.md](2026-11-04-breaking-change-commit-format.md)。

本政策对未来每次 DSH 破坏性更新重复适用，不为单次版本变化新增决策记录；每次只需更新 README 的版本对照并提升安装范围。

## 备选方案

- 为每次破坏性更新新增一条单独决策：不选。记录重复，且容易把一次性版本说明写入随包文档。
- 同一个插件版本同时支持新旧 DSH：不选。需要按 DSH 版本维护两套推荐和文档，增加分支和回归成本。
- 只在 changelog 说明破坏性变化：不选。安装门槛仍允许旧 DSH 激活不匹配的插件版本。

## 后果

旧 DSH 用户按根 README 的版本对照停留在对应插件版本；新版本只跟随最新 DSH。根 README 是版本对照的唯一位置，随包文档保持当前行为。每次破坏性更新需要确认旧版最后发布号并同步提升 `engines.dsh` 与相关 peer 依赖。
