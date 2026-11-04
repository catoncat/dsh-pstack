# 决定：破坏性变更提交使用 `type!:` 格式

Status: proposed
Date: 2026-11-04
Scope: **
Implemented-by: -
Review: 2027-05-04

## 背景

`changelogithub` 15.0.5 从 Conventional Commits 生成 release changelog。它由 `changelogen` 提供解析，README 明确支持 `chore!: drop node v10` 这种写法。解析正则把 `!` 识别在 type/scope 之后、冒号之前：

```text
(?<type>[a-z]+)(\((?<scope>.+)\))?(?<breaking>!)?: (?<description>.+)
```

`!feat: ...` 把 `!` 放在 type 前，无法匹配该正则，不会被识别为 breaking，也不会进入 changelog 的 Breaking Changes 段。本插件的 DSH 破坏性适配和版本分界必须可靠出现在 release changelog 中，因此提交标题必须使用受支持的格式。

## 决定

所有本插件实现的破坏性变更提交必须使用 Conventional Commits 的 `type!:` 形式：

- `feat!: <description>`，例如 `feat!: support dsh0.2.2-alpha.3`
- 有 scope 时写成 `feat(scope)!: <description>`，`!` 仍在冒号前
- 不使用 `!feat: ...`
- 不在正文只用 `BREAKING CHANGE:` 代替标题标记，因为 `changelogithub` 不解析正文脚注作为 breaking

普通变更不使用 `!`。release changelog 中的 Breaking Changes 项来自这些提交标题。

## 备选方案

- `!feat: ...`：不选。`changelogithub` 和 `changelogen` 的解析器要求 `!` 在 type 之后，前置感叹号不会识别。
- 只在正文写 `BREAKING CHANGE:`：不选。当前 `changelogithub` 只从标题解析 `isBreaking`，正文脚注不会生成 Breaking Changes 段。
- 不写 breaking 标记，靠 release 手工补充：不选。容易遗漏，且每次发布都要人工修改。

## 后果

破坏性提交标题统一，`changelogithub` 会把它们归入 Breaking Changes。提交者需要记住 `type!:` 的顺序；不符合格式的提交不会触发 breaking changelog 段，必须在合并前改写提交标题。
