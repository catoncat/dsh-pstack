# 决定：DSH 命名空间整体外链，dsh 依赖只登记为 devDependencies（cordis 另加 peer）

Status: accepted
Date: 2026-11-04
Scope: package.json, pnpm-workspace.yaml, pnpm-lock.yaml, vite.config.ts, src/**, docs/**
Implemented-by: commit:71eb18f017a48f30ddab92cef40e2fb8c98e3904
Review: 2027-05-04

## 背景

vite-plus/tsdown 默认把 `dependencies` 与 `peerDependencies` 当 external、把其余依赖内联进产物。`@deepseek-ai/cordis` 在 `7f74745` 删除 peer 后不属于任何字段，于是被内联：`dist/roles.mjs` 自带一份 cordis（宿主加客户端产物共 277.82 kB），构建还把 `inlinedDependencies`（cordis、cosmokit、standard-schema）写回 `package.json`，每次 build 都弄脏工作区。

宿主在运行期提供全部 `@deepseek-ai/*` 模块：profile 安装时 DSH 的 profile-resolution 会把未本地安装的宿主包拦截到安装副本；link 检出则按祖先 manifest 的 peer 声明拦截。插件自带第二份框架副本既浪费体积，也可能让 `Service` 与注册表身份和宿主不一致。上游 `docs/user/develop/basic/publish.md` 规定：实例必须与宿主共享的 dsh 包同时声明为 `peerDependencies` 与 `devDependencies`，独立版本的第三方依赖留在 `dependencies`。

## 决定

- `vite.config.ts` 的两个 pack 共用同一个通配 `/^@deepseek-ai\//` 设置 `deps.neverBundle`（宿主 pack 同时设 `deps.dts.neverBundle`），不逐一枚举包名：新增 DSH 依赖自动保持外链。客户端 pack 原先逐条列出的 `@deepseek-ai/*` 条目并入该通配。
- `package.json` 的十个 `@deepseek-ai/dsh-*` 从 `dependencies` 移到 `devDependencies`（仍引用 `catalog:types`）；`@deepseek-ai/cordis` 以 `catalog:types`（`~4.0.6-alpha.2`）同时登记为 `peerDependencies` 与 `devDependencies`；`dependencies` 只保留随包脚本运行需要的 `commander`。
- 运行期解析：profile 安装不装 devDependencies，宿主包由 DSH 拦截到安装副本；link 检出（playground）按根 manifest 的 cordis peer 拦截到宿主副本，其余 DSH 包解析仓库内的 dev 副本。
- 验证：产物 JS 277.82 kB → 158.75 kB；`dist/*.mjs` 只外链 `@deepseek-ai/cordis` 与 `@deepseek-ai/dsh-typert-protocol`；构建不再写 `inlinedDependencies`；playground 实跑确认六个插件行、Plugins 页、bundle 详情页与配置模态框（推荐插件、角色配置两页）全部加载且 console 无错误。

## 备选方案

- **保持 cordis 内联，通配只写 `/^@deepseek-ai\/dsh-/`。** 不选：产物继续带第二份框架副本，`inlinedDependencies` 继续写回 `package.json`，且与“宿主提供框架”的运行模型相悖。
- **cordis 只登记为 devDependencies。** 不选：link 检出没有 peer 声明时 DSH 不拦截，插件会解析仓库内的第二份 cordis；上游 publish.md 明确要求 peer + dev 双登记。
- **在 `neverBundle` 里逐一枚举包名。** 不选：新增 DSH 依赖要改构建配置，漏一项就再次内联。

## 后果

- 得到：产物只含插件自身代码；宿主模块单一实例；build 不再弄脏 `package.json`；新增 DSH 依赖无需改构建配置。
- 付出：`package.json` 多一个 cordis peer 范围（`~4.0.6-alpha.2`），DSH 破坏性更新抬 `engines.dsh` 时要同步抬它；`types` catalog 里混入一个范围条目而非精确版本。
- 重新考虑的时机：DSH 改为不再拦截未声明的宿主包（那时要把 dsh-* 移回 `dependencies`），或 vite-plus 改变 `neverBundle` 的通配语义。
