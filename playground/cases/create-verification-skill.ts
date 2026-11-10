import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "create-verification-skill",
  skill: "create-verification-skill",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "taskboard 是个命令行小工具，目前我们没有任何脚本化的办法去证明它的行为对不对，每次只能手动敲命令看结果。帮这个仓库生成一个项目本地的验证技能，让 agent 能像真实用户一样把它跑起来、走一遍功能、并把证据留下来。",
  workspaceFiles: {
    "package.json": `{
  "name": "taskboard",
  "type": "module",
  "bin": { "taskboard": "./src/cli.mjs" },
  "scripts": { "start": "node src/cli.mjs" }
}`,
    "src/cli.mjs": `import { load, save } from "./store.mjs";

const [command, ...args] = process.argv.slice(2);
const db = load();

if (command === "add") {
  const id = String(db.tasks.length + 1);
  db.tasks.push({ id, title: args.join(" "), done: false });
  save(db);
  console.log("added " + id);
} else if (command === "list") {
  for (const task of db.tasks) {
    console.log((task.done ? "[x] " : "[ ] ") + task.id + " " + task.title);
  }
} else if (command === "done") {
  const task = db.tasks.find((t) => t.id === args[0]);
  if (!task) {
    console.error("no such task");
    process.exit(1);
  }
  task.done = true;
  save(db);
  console.log("done " + task.id);
} else {
  console.log("usage: taskboard add <title> | list | done <id>");
}
`,
    "src/store.mjs": `import { readFileSync, writeFileSync, existsSync } from "node:fs";

const FILE = new URL("../tasks.json", import.meta.url);

export function load() {
  if (!existsSync(FILE)) return { tasks: [] };
  return JSON.parse(readFileSync(FILE, "utf8"));
}

export function save(db) {
  writeFileSync(FILE, JSON.stringify(db, null, 2));
}
`,
    "README.md": `# taskboard

一个最小的命令行待办工具。

\`\`\`
node src/cli.mjs add "写周报"
node src/cli.mjs list
node src/cli.mjs done 1
\`\`\`

数据存在同目录的 tasks.json 里。
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "create-verification-skill" },
    {
      kind: "artifact-contains",
      detail: ".cursor/skills/verify-taskboard/SKILL.md::verify-taskboard",
    },
  ],
  intent:
    "项目缺少脚本化驱动应用来证明行为的办法，用户要求生成一个可复用的本地验证技能，正是 create-verification-skill 的目标产物。",
};
