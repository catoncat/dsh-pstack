import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vite-plus/test";

const ROOT = process.cwd();
const BASELINE = join(ROOT, "tests", "fixtures", "dsh-0.2.2-rc.1");
const PATCH = readFileSync(join(ROOT, "cordis.patch.yml"), "utf8");

interface PluginRow {
  id: string;
  name: string;
  indent: number;
  disabled?: string;
}

const PSTACK_ROWS: PluginRow[] = [
  { id: "pstack-skill", name: "dsh-pstack", indent: 10 },
  { id: "pstack-subagent", name: "dsh-pstack/subagent", indent: 10 },
  { id: "poteto-mode-section", name: "dsh-pstack/poteto-mode", indent: 10 },
];

function clean(value: string): string {
  return value.trim().replace(/^["'](.*)["']$/, "$1");
}

function presetLines(source: string, presetId: string): string[] {
  const lines = source.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `    - id: ${presetId}`);
  if (start < 0) throw new Error(`preset "${presetId}" was not found`);
  const end = lines.findIndex((line, index) => index > start && line.startsWith("    - id: "));
  return lines.slice(start, end < 0 ? undefined : end);
}

function pluginRows(source: string, presetId: string): PluginRow[] {
  const lines = presetLines(source, presetId);
  const pluginsAt = lines.findIndex((line) => line === "        plugins:");
  if (pluginsAt < 0) throw new Error(`preset "${presetId}" has no plugins list`);

  const rows: PluginRow[] = [];
  let current: PluginRow | undefined;
  for (const line of lines.slice(pluginsAt + 1)) {
    const match = line.match(/^(\s*)- id:\s*(.+)$/);
    if (match !== null) {
      current = { id: clean(match[2]), name: "", indent: match[1].length };
      rows.push(current);
      continue;
    }
    const name = line.match(/^\s*name:\s*(.+)$/)?.[1];
    if (name !== undefined && current !== undefined && current.name === "") {
      current.name = clean(name);
    }
    const disabled = line.match(/^\s*disabled:\s*(.+)$/)?.[1];
    if (disabled !== undefined && current !== undefined && current.disabled === undefined) {
      current.disabled = disabled.trim();
    }
  }
  return rows;
}

function baselineRows(file: string, presetId: string): PluginRow[] {
  return pluginRows(readFileSync(join(BASELINE, file), "utf8"), presetId);
}

function expectedRootRows(baseline: PluginRow[]): PluginRow[] {
  return [
    ...baseline.filter((row) => row.id !== "tool-subagent" && row.id !== "tool-subagent-fork"),
    ...PSTACK_ROWS,
  ];
}

describe("poteto-mode preset parity", () => {
  it("matches the standard preset with only the documented delegation delta", () => {
    expect(pluginRows(PATCH, "preset-poteto-mode")).toEqual(
      expectedRootRows(baselineRows("standard.patch.yml", "preset-standard")),
    );
  });

  it("matches the Creator preset with only the documented delegation delta", () => {
    expect(pluginRows(PATCH, "preset-poteto-mode-creator")).toEqual(
      expectedRootRows(baselineRows("cordis.patch.yml", "preset-cordis")),
    );
  });

  it("keeps the pstack row config in both root presets", () => {
    const poteto = presetLines(PATCH, "preset-poteto-mode").join("\n");
    const creator = presetLines(PATCH, "preset-poteto-mode-creator").join("\n");
    for (const source of [poteto, creator]) {
      expect(source).toContain('name: "@deepseek-ai/dsh-skill-filesystem"');
      expect(source).toContain("id: pstack-subagent");
      expect(source).toContain("maxDepth: 2");
    }
    expect(PATCH).toContain("dist/pstack/skills");
    expect(creator).toContain("customSkillDirs");
  });
});
