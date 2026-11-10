import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "principle-make-operations-idempotent",
  skill: "principle-make-operations-idempotent",
  kind: "principle-light",
  stages: ["raw", "adapted"],
  prompt:
    "写个上线脚本，把 dist 打包上传到服务器再切到新版本。跑一半断了的话，重跑一下就能继续就行。",
  workspaceFiles: {
    "deploy.sh": `#!/usr/bin/env bash
set -euo pipefail
tar czf release.tgz dist
scp release.tgz server:/srv/app/release.tgz
ssh server "cd /srv/app && tar xzf release.tgz && ln -sfn /srv/app/dist current"`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "skill-loaded", detail: "principle-make-operations-idempotent" },
  ],
  intent:
    "部署脚本会在崩溃和重试中运行，正确做法是让每一步从当前状态收敛到同一终态、可安全重复执行。",
};
