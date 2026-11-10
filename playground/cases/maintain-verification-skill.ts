import type { SkillCase } from "../types";

export const skillCase: SkillCase = {
  id: "maintain-verification-skill",
  skill: "maintain-verification-skill",
  kind: "behavior",
  stages: ["raw", "adapted"],
  prompt:
    "我们给 taskboard 写的那个验证技能和里面的功能清单，最近应用改了不少地方，帮我整体审一遍，让它跟现在的应用对得上；能修的修正，真修不了的告诉我。",
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
  for (const task of db.tasks) console.log((task.done ? "[x] " : "[ ] ") + task.id + " " + task.title);
} else if (command === "done") {
  const task = db.tasks.find((t) => t.id === args[0]);
  if (!task) process.exit(1);
  task.done = true;
  save(db);
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
    ".cursor/skills/verify-taskboard/SKILL.md": `---
name: verify-taskboard
description: Drive the taskboard CLI like a user and prove add/list/done work.
---

# Verify taskboard

## Launch

Run \`node src/cli.mjs <command>\` from the repo root, with a clean tasks.json.

## Drive

- add: \`node src/cli.mjs add "写周报"\`
- list: \`node src/cli.mjs list\`
- done: \`node src/cli.mjs done 1\`

## Evidence

Capture the stdout of each command. Clean up tasks.json afterwards.

## Cleanup

Delete tasks.json.

## Feature map

See features/README.md.
`,
    ".cursor/skills/verify-taskboard/features/README.md": `# Feature map

- add-task.md
- archive-task.md
`,
    ".cursor/skills/verify-taskboard/features/add-task.md": `# Add task

## Sub-features

Add a task with a title.

## How to get to it (user POV)

Run the add command.

## Driving it with taskboard

\`node src/cli.mjs add "写周报"\`

## Gotchas

None.
`,
    ".cursor/skills/verify-taskboard/features/archive-task.md": `# Archive task

## Sub-features

Archive a completed task so it no longer shows in the list.

## How to get to it (user POV)

Run \`taskboard archive <id>\`.

## Driving it with taskboard

\`node src/cli.mjs archive 1\`

## Gotchas

None.
`,
  },
  expect: [
    { kind: "turn-completed" },
    { kind: "no-tool-error" },
    { kind: "no-duplicate-skill-load" },
    { kind: "skill-loaded", detail: "maintain-verification-skill" },
  ],
  intent:
    "已有的验证技能与功能地图要跟改过之后的应用对齐审计，其中 archive 功能在应用里已不存在，正是 maintain-verification-skill 的定期维护场景。",
};
