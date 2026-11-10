import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "correct",
  skill: "correct",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "我们团队让 agent 改这个仓库时总犯同样的错：有人为了让测试通过就去改测试断言迁就实现，还有人把同一份配置在两个文件里各定义一遍。帮我从最近的提交和评审里把这些反复出现的错误归个类，然后在仓库层面动手，让下一个 agent 不可能再犯。",
  workspaceFiles: {
    "CONTRIBUTING.md": `# 贡献须知

- 不要为了让测试通过而修改测试断言。
- 配置只能有一份来源。`,
    "src/config.ts": `export interface Config {
  apiBase: string;
  timeoutMs: number;
}

export const config: Config = {
  apiBase: "https://api.internal",
  timeoutMs: 3000,
};
`,
    "src/settings.ts": `// 第二份配置，历史上为了“方便”从 config.ts 复制出来的。
export const settings = {
  apiBase: "https://api.internal",
  timeoutMs: 5000,
};
`,
    "tests/config.test.ts": `import { test, expect } from "vitest";
import { config } from "../src/config";

test("config has the expected timeout value", () => {
  // 这条断言把实现细节写死了，改配置就得改测试。
  expect(config.timeoutMs).toBe(3000);
});
`,
    "CHANGELOG.md": `# 变更记录

- 修复支付回调偶发超时（两个配置文件的 timeout 不一致导致）。
- 修复订单导出测试不稳定（有人直接把断言改宽了）。
`,
    "package.json": `{
  "name": "billing-core",
  "type": "module",
  "scripts": { "test": "vitest run" }
}`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "correct" },
  ],
  intent:
    "用户点名了反复出现的同类错误并要求在仓库层面根除，正好命中 correct 声明的“让下一个 agent 无法再犯”的用途。",
};
