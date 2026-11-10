# 工作区与会话流程

本文件说明浏览器验证时如何拿到干净、直达工作区的环境，多 worker 怎么在一条命令里备好，以及每个用例如何新建会话并收证据。脚本路径是主路径，手动路径是脚本不可用时的兜底。

## 多 worker 与动态端口

一个 worker 是一套独立运行环境，目录在 `playground/.workers/w<k>/` 下。

- `w<k>/home` 是它的 DSH_HOME，会话、存储、证据都在这里。
- `w<k>/browser` 是它的持久浏览器 profile。
- `w<k>/workspace/<caseId>` 是该 worker 跑某个用例的工作区。
- `w<k>/evidence` 放该 worker 的用例证据。

每个 worker 用 `dsh --port 0` 由系统动态分配端口，prepare 从启动输出 `dsh web: http://127.0.0.1:<port>/?token=...` 解析真实端口与 URL，写入该 worker 的 `web-url.txt`。端口不再固定，也不再有固定端口约定。worker 数默认按机器核数与可用内存自适应，`--workers N` 可覆盖，worker 内队列串行、worker 间并行。

## 一键准备

```sh
vp run playground:prepare -- --mode raw --workers 4 --reset
vp run playground:bootstrap -- --all
```

prepare 完成这些事。清空并重建 `playground/.workers`。为每个 worker 建 profile、复制凭据、写 home patch（默认探针与 filtered llm-pi-ai，approval 固定 never）、把全部用例工作区预注册到该 worker 的 `storages/workspace.json`。然后并行启动 N 个 web，逐个打印实际 URL 与端口，pid 与 url 落盘。adapted 模式下插件只安装一次，其余 worker 复制已安装的 profile，避免 pnpm store 竞争。

bootstrap 打开每个 worker 的 token URL，用各自的持久 profile 关掉预览弹窗，校验页面直达预注册工作区且模型 chip 是预期探针，截图存该 worker 的 `browser/ready.png`。`--worker <k>` 只校验一个，默认第一个。

运行期 home 的 approval 策略固定为 never。无人值守会话没有审批应答者，ask 会让敏感工具调用永久挂起。never 把需要审批的动作确定性拒绝，模型看到拒绝后继续，拒绝记进会话证据。

## 跑批与短探针

```sh
vp run playground:run-batch -- --mode raw --workers 4 --cases tdd,unslop,architect --probe 180
vp run playground:run-batch -- --mode raw --workers 4 --all
vp run playground:collect -- --mode raw
```

run-batch 把用例按轮转分到各 worker 队列并行跑，每用例把输出汇总到 `playground/.workers/run-batch.log`。raw 轮默认走短探针：只等到技能加载、preset、首轮工具错误这类早期信号，窗口按用例类型取，principle-light 120 秒、behavior 300 秒，`--probe` 可全局覆盖，用例字段 `probeSeconds` 可单独覆盖。探针到点仍未结束就点界面停止按钮中止，证据标 `truncated: true`。adapted 轮完整回归不加 `--probe`，用 `--timeout` 等 turn/end。

单个用例调试用 `vp run playground:run -- --worker 0 --case <id> --mode raw --probe 120`。

## 带轮次的重跑

adapted 轮只跑上一轮失败的用例。

第一轮 adapted 要用构建后的插件重建 worker profile，同时保留 raw 证据，因此这一次不加 `--reuse`。

```sh
vp run playground:prepare -- --mode adapted --workers 4
vp run playground:run-batch -- --mode adapted --only-failed
vp run playground:collect -- --mode adapted
```

之后的轮次重启同一批 worker，不动 profile、工作区与证据。

```sh
vp run playground:prepare -- --mode adapted --reuse --workers 4
vp run playground:run-batch -- --mode adapted --only-failed --round 2
vp run playground:run-batch -- --mode adapted --skills a,b
```

`--only-failed` 读跨轮次的最新证据，选 verdict 失败或 infra error 的用例。`--skills` 按技能名映射用例。`--round` 写入轮次。`--reuse` 不重建 profile、工作区与证据，只重启要跑的 worker。`progress.json` 带 round 字段，每轮加一。

失败四类与处理。实现缺陷改实现后 `vp run build` 再重启受影响 worker 重跑。用例缺陷改用例并更新 lock 后重跑该用例。环境错误自动重试一次仍失败再查。真实遗留写进审核报告遗留列，不重跑。

收敛判据是某轮不再有实现缺陷、剩余全部是已声明遗留。收敛后必须整体全量复跑一次 adapted，通过判定为全部通过或未通过者均为已声明遗留。

## 手动流程

脚本不可用或需要人工复核时按下面走。

1. 读 `playground/.workers/w<k>/web-url.txt`，打开其中的 token URL。直接打开裸端口会返回 401 认证页。
2. 首次打开会出现「预览版说明」弹窗，点「继续」。用该 worker 的持久 profile 重开不会再弹。
3. 左侧「工作区」已预注册全部用例工作区，点名字即进入。新增时点工作区标题行的加号，选择该 worker 的 `workspace/` 下目录。
4. 新建会话点侧栏顶部的「新会话」按钮。未命名的旧会话在列表里也显示为「新会话」，认准顶部带加号图标的那个。
5. 键入用例 prompt，按 Enter 发送，输入框清空即成功。未清空时点输入区右侧圆形发送按钮。
6. 完成的信号是对话区出现「已完成」与用时。原始事件在每个 worker 目录的 `sessions/<slug>/<id>/session.v4.jsonl.zstd`，用 `zstdcat` 查看。

## 证据与判定

run-case 把 SessionEvidence 与 CaseVerdict 写入 `w<k>/evidence/w<k>-<case>-<mode>-<stamp>.json`，文件名带 worker 前缀防串。collect 汇总全部 worker 的证据，重读会话日志重新 digest 再判定，渲染 `playground/reports/run-<mode>-<日期>.md`。raw 轮不判通过，失败即发现。adapted 轮沿用首轮通过口径，产物正确、无工具错误、无重复技能加载、无先错后对。

## 常见坑

worker 启动失败先看 `w<k>/web.log` 尾部。端口由系统分配，不需要也不应该固定。换了浏览器 profile 目录会重弹预览窗，重跑 bootstrap 即可。模型 chip 不显示预期探针时检查 `playground/config.json` 的允许列表与宿主 web profile 的 provider 配置。会话目录在发送时就创建但 zstd 文件有数秒 flush 延迟，轮询证据时窗口给足。detached 的 web 在会杀进程树的沙箱里无法跨命令存活，这种环境把 prepare、bootstrap、run-batch、collect 串在同一条命令或同一个后台 job 里。
