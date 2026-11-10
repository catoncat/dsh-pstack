# 工作区与会话流程

本文件说明浏览器验证时如何拿到一个干净、直达工作区的环境，以及每个用例如何新建会话。脚本路径是主路径，手动路径是脚本不可用时的兜底。

## 一键准备

```sh
vp run playground:prepare -- --mode raw --reset
vp run playground:bootstrap
```

在会杀进程树的沙箱 shell 里（agent 工具调用常见），detached 的 web 会在单条命令结束后被回收。这种环境把 prepare、bootstrap、run-case、collect 串在同一条命令或同一个后台 job 里执行。真实终端可以分步执行，web 会持续存活。

prepare 完成这些事。重建 `playground/.dsh` 运行期 home。从 `playground/config.json` 读允许的 provider 与模型，结合宿主 web profile 的 provider 配置生成 home 级 cordis patch，默认模型设为主探针。复制 `~/.dsh/.credentials.yaml` 免去登录。按 `playground/cases/` 的每个用例预注册独立工作区到 `playground/.workspace/<caseId>`，并写入 home 的 `storages/workspace.json`。以 detached 方式在固定端口 17353 启动 `dsh web`，把带 token 的 URL 写入 `playground/.dsh/web-url.txt`，pid 写入 `playground/.dsh/web.pid`。raw 模式不装 dsh-pstack，用官方 `@deepseek-ai/dsh-skill-filesystem` 直接挂载 `upstream/cursor-plugins/pstack/skills`。adapted 模式安装本仓库插件，技能来自生成树。

bootstrap 完成这些事。用持久浏览器 profile（`playground/.browser/`）打开 token URL。若出现「预览版说明」弹窗则自动点掉，持久 profile 会让它不再出现。校验页面已直达预注册工作区且模型 chip 显示预期探针。截图存 `playground/.browser/ready.png`。

## 手动流程

脚本不可用或需要人工复核时按下面走。

1. 读 `playground/.dsh/web-url.txt`，打开其中的 token URL。直接打开裸端口会返回 401 认证页。
2. 首次打开会出现「预览版说明」弹窗，点「继续」。用持久 profile 的浏览器重开不会再弹。
3. 左侧「工作区」列表已预注册全部用例工作区，点名字即进入。需要新增时点工作区标题行的加号，选择 `playground/.workspace/` 下的目录。
4. 新建会话点侧栏顶部的「新会话」按钮。注意未命名的旧会话在列表里也显示为「新会话」，认准顶部带加号图标的那个。
5. 在输入框键入用例 prompt，按 Enter 发送。输入框清空即发送成功。未清空时点输入区右侧的圆形发送按钮。
6. 会话完成的信号是对话区出现「已完成」与用时。原始事件在 `playground/.dsh/sessions/<工作区slug>/<会话id>/session.v4.jsonl.zstd`，用 `zstdcat` 查看。

## 证据与判定

```sh
vp run playground:run -- --case <case-id> --mode raw
vp run playground:collect -- --mode raw
```

run-case 自动完成新建会话、键入、发送、等待 turn/end、截图，并把 SessionEvidence 与 CaseVerdict 写入 `playground/.dsh/evidence/`。collect 汇总成 `playground/reports/` 下的 markdown 报告。阶段一不判通过与否，失败即发现。阶段二沿用首轮通过口径，产物正确、无工具错误、无重复技能加载、无先错后对。

## 常见坑

端口 17353 被占用时 prepare 直接报错，不换端口，先确认是否有遗留实例并用 `vp run playground:stop` 停止。换了浏览器 profile 目录会重弹预览窗，重跑 bootstrap 即可。模型 chip 不显示预期探针时检查 `playground/config.json` 的允许列表与宿主 web profile 的 provider 配置。会话目录在发送时就创建但 zstd 文件有数秒 flush 延迟，轮询证据时窗口给足。
