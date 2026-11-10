# 运行 playground 验证

本文件是 `SKILL.md` 的中文对照版，仅供人工审阅，不被 `SKILL.md` 引用。驱动只跑浏览器的 playground 走完整个验证闭环，对真实 DSH Web 会话逐技能验证。全程不做 headless。报告名不带阶段序号，待审批审核报告是 `reports/skill-audit.md`，单次运行是 `reports/run-raw-<日期>.md` 或 `reports/run-adapted-<日期>.md`。

## 1. 准备机器

在仓库根执行。

1. `vp install`。
2. 按 `port/AGENTS.md` 准备生成树，再 `vp run build`。
3. 确认 `dsh` 在 PATH 中。
4. 复制 `playground/config.example.json` 为 `playground/config.json`，填允许的 provider、apiKey、模型与思考等级。该文件已忽略。

## 2. 准备 worker

worker 数按机器自适应，可覆盖。每个 worker 独占 `playground/.workers/w<k>/`，有自己的 DSH home、浏览器 profile、工作区根和证据目录，端口由 `dsh --port 0` 动态分配，不存在固定端口。

```sh
vp run playground:prepare -- --mode raw --reset
vp run playground:prepare -- --mode raw --reset --workers 6
vp run playground:prepare -- --reuse --workers 4
```

`--reuse` 保留已有 profile、工作区与证据，只重启要跑的 worker。轮次之间用它，证据才不会丢。

## 3. 落地浏览器 profile

```sh
vp run playground:bootstrap -- --all
```

## 4. raw 轮

用短探针跑所有可跑用例，principle 120 秒、behavior 300 秒，到点中止 in-flight turn 并把证据标 truncated。

```sh
vp run playground:run-batch -- --mode raw --all
vp run playground:status
vp run playground:collect -- --mode raw
```

collect 生成 `reports/run-raw-<日期>.md`，并把本轮证据归档到 `reports/evidence/<轮次>-<日期>/`，每行都带自己的归档证据文件。

然后写审核报告 `reports/skill-audit.md`，每个技能一节，固定四列：上游能力、当前实现状态与缺口、建议的 dsh.md 适配与插件工具、待审批。状态从待审批开始。停在这里，把报告交给操作者逐节审批。

## 5. 审批后实现适配

对每个获批的节，实现建议的 dsh.md 适配与插件工具，再构建可发布插件。

```sh
vp run build
```

## 6. adapted 回归轮

只跑上一轮失败的用例。

```sh
vp run playground:prepare -- --mode adapted --reuse --workers 4
vp run playground:run-batch -- --mode adapted --only-failed
vp run playground:run-batch -- --mode adapted --skills <a>,<b>
vp run playground:collect -- --mode adapted
```

`--only-failed` 读取跨轮次的最新证据，选出 verdict 失败或出现 infra error 的用例。`--skills` 把技能名映射到用例。进度在 `playground/status` 与 `playground/.workers/progress.json`，带轮次号。

每个失败按四类处理。

- 实现缺陷：改实现，`vp run build`，重启受影响 worker，重跑受影响用例。
- 用例缺陷：改用例，更新 `cases.lock.json`，重跑该用例。
- 环境错误：自动重试一次，仍失败再排查。
- 真实遗留：写进审核报告遗留列并写明原因，不重跑。

循环到某一轮不再有实现缺陷、剩余全部是已声明遗留为止。

## 7. 收敛复跑

收敛后，对所有用例完整跑一次 adapted，确保没有用例漏验。

```sh
vp run playground:prepare -- --mode adapted --reuse
vp run playground:run-batch -- --mode adapted --all
vp run playground:collect -- --mode adapted
```

通过判定：每个用例都通过，或每个未通过的用例都是已声明遗留并写明原因。若完整复跑暴露新的实现缺陷，回到第 6 步。

## 8. 收口报告

把 `reports/skill-audit.md` 每一节更新到最终状态，已通过或遗留并写原因，并把轮次与状态写进 `cases.lock.json`。下一轮从第 5 步开始。

## 约定

- 用例 prompt 必须是自然的用户请求，不得点名工具或展开调用参数。
- 模型选择由操作者确认，每台机器确认一次；agent 用会话事件佐证。
- 上游技能集与每个技能的用例映射在 `playground/cases.lock.json`，`vp run playground:check` 会报漂移。
- cursor-only 技能在 lock 里标 excluded 并写理由，不建用例，`--all` 只覆盖可跑技能。
