// Static integrity check for the raw upstream pstack skills: every skill has a
// SKILL.md with frontmatter name/description, and every relative file the body
// points at actually exists. This catches broken references before a model run
// spends tokens chasing them.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { load as yamlLoad } from "js-yaml";

import { RAW_SKILLS_DIR } from "./lib/env";

interface SkillCheck {
  skill: string;
  ok: boolean;
  name: string;
  description: string;
  refs: number;
  problems: string[];
}

const REF_RE = /(\.\.?\/[^\s`)\]"'<>*]+|(?:playbooks|references|scripts|assets)\/[^\s`)\]"'<>*]+)/g;
const FILE_EXT_RE = /\.(md|mts|mjs|cjs|ts|js|sh|ya?ml|json|txt)$/i;

function stripFences(text: string): string {
  return text.replace(/```[\s\S]*?```/g, "");
}

function parseFrontmatter(text: string): Record<string, unknown> | null {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  try {
    const parsed = yamlLoad(match[1]);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function checkSkill(skill: string): SkillCheck {
  const skillDir = join(RAW_SKILLS_DIR, skill);
  const skillFile = join(skillDir, "SKILL.md");
  const problems: string[] = [];
  let name = "";
  let description = "";
  let refs = 0;

  if (!existsSync(skillFile)) {
    return { skill, ok: false, name, description, refs, problems: ["missing SKILL.md"] };
  }

  const text = readFileSync(skillFile, "utf8");
  const frontmatter = parseFrontmatter(text);
  if (!frontmatter) {
    problems.push("missing or invalid YAML frontmatter");
  } else {
    name = typeof frontmatter.name === "string" ? frontmatter.name : "";
    description = typeof frontmatter.description === "string" ? frontmatter.description : "";
    if (name === "") problems.push("frontmatter lacks name");
    if (description === "") problems.push("frontmatter lacks description");
  }

  const tokens = new Set<string>();
  for (const match of stripFences(text).matchAll(REF_RE)) {
    tokens.add(match[1].replace(/[.,;:]+$/, ""));
  }
  for (const token of tokens) {
    if (!FILE_EXT_RE.test(token)) continue;
    refs += 1;
    if (!existsSync(resolve(dirname(skillFile), token)))
      problems.push(`missing referenced file: ${token}`);
  }

  return { skill, ok: problems.length === 0, name, description, refs, problems };
}

function pad(value: string, width: number): string {
  return value.length >= width ? value : value + " ".repeat(width - value.length);
}

function renderTable(checks: SkillCheck[]): void {
  const headers = ["skill", "name", "refs", "status", "problems"];
  const rows = checks.map((check) => [
    check.skill,
    check.name || "-",
    String(check.refs),
    check.ok ? "ok" : "FAIL",
    check.problems.length === 0 ? "-" : check.problems.join("; "),
  ]);
  const widths = headers.map((header, column) =>
    Math.max(header.length, ...rows.map((row) => row[column].length)),
  );
  const line = (cells: string[]): string =>
    cells.map((cell, column) => pad(cell, widths[column])).join("  ");
  console.log(line(headers));
  console.log(widths.map((width) => "-".repeat(width)).join("  "));
  for (const row of rows) console.log(line(row));
}

function main(): void {
  const json = process.argv.includes("--json");
  if (!existsSync(RAW_SKILLS_DIR)) throw new Error(`raw skills dir not found: ${RAW_SKILLS_DIR}`);

  const skills = readdirSync(RAW_SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const checks = skills.map((skill) => checkSkill(skill));
  const failed = checks.filter((check) => !check.ok);
  const summary = {
    total: checks.length,
    ok: checks.length - failed.length,
    failed: failed.length,
  };

  if (json) {
    console.log(JSON.stringify({ summary, skills: checks }, null, 2));
  } else {
    renderTable(checks);
    console.log("");
    console.log(`${summary.total} skills, ${summary.ok} ok, ${summary.failed} failed`);
  }
  if (failed.length > 0) process.exitCode = 1;
}

main();
