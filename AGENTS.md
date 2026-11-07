<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Running Scripts

Run TypeScript and JavaScript files with `vpx <file>`, for example `vpx ./scripts/seed.ts --dry-run`. It handles enums, decorators, JSX, and tsconfig `paths`, so do not add `tsx` or `ts-node` to run scripts. `vpx --watch <file>` reruns the file when a file it uses changes, in place of `tsx watch`. `vp node <file>` runs plain Node.js.

## Tool Versions

Run `vp toolchain` to show versions and relationships in the active Vite+
release. Add a tool name to select part of the graph. For example, run
`vp toolchain vite`. Use `--global` to ignore the local `vite-plus` package. Use
`vp why <package>` to show the package-manager dependency graph.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

# AGENTS.md

## Project docs

- 修改模块前阅读 `docs/architecture.md`；模块边界或入口变化时同步更新。
- 为概念命名时阅读 `docs/glossary.md`；引入新概念时补充术语。
- 开始任何仓库任务前，阅读 `docs/decisions/AGENTS.md`，按其中的查找规则阅读与任务相关的记录。

## Dependencies

- 所有 pnpm workspace 依赖先按用途归入 `pnpm-workspace.yaml` 的命名 `catalogs`，再用 `vp add --save-dev --save-catalog-name <分类>` 安装。
- 依赖声明只使用 `catalog:<分类>`，禁止裸 `catalog:`、直接版本号或写入顶层 `catalog:`。
- `pnpm-workspace.yaml` 保持 `catalogMode: strict`，依赖分类与 lockfile 由安装命令和约定保证，不另写策略测试。
- 生成树 `pstack/` 中的上游脚本 `package.json` 由生成器复制，不属于 pnpm workspace，不按本规则改写。

## Tests

- 新增测试用例优先写 TypeScript 文件（`tests/*.test.ts` 或 `tests/*.test.tsx`）。
- 非必要不写 JavaScript 测试文件（`.mjs` / `.js`）；只有测试对象本身是 JS/Node 模块且无法从 TS 测试覆盖时才使用。

## Porting

- 移植或升级 pstack、DSH 前读 `port/README.md`。其中保存能力审核、扩展保留目标和重建回归规则。
- 根 `pstack/` 只由生成器写入。手工内容放 `port/`、插件源码或测试目录。
- 根 `package.json` 的 `exports` 由根 `vite.config.ts` 生成。主 pack 的 `entry` 为 `./src/*.ts`；仅第一个 pack 的 `customExports` 补齐非源码入口。其他 pack 使用 `exports: false`。
- 上游脚本保持原样，不另写 Node 替代实现。

## Commits

- 破坏性变更提交使用 Conventional Commits 的 `type!:` 形式，例如 `feat!: ...`；不要使用 `!feat:`。

## Local scratch

- 本地验证的临时文件一律写仓库 `.tmp/`。Bash 每次调用是独立沙箱，`/tmp` 不跨调用保留，不要用它承载后续步骤要读的文件。
- 真实插件运行测试统一走 `playground/`。不要在 `~/.dsh` 或 `.tmp` 下另建测试用 home/profile。启动用 `vp run playground`。
- 浏览器截图和不涉及模型选择的 UI 交互由 agent 自动化。真实会话的模型选择由用户确认，agent 用会话日志佐证。
