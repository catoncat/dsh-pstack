// Static integrity check for the raw upstream pstack skills: every skill has a
// SKILL.md with frontmatter name/description, and every relative file the body
// points at actually exists. This catches broken references before a model run
// spends tokens chasing them.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { load as yamlLoad } from "js-yaml";

import { RAW_SKILLS_DIR } from "./lib/env";
import {
  caseSkills,
  EXCLUSIONS,
  LOCK_FILE,
  packageDshVersion,
  readLock,
  sha256File,
  upstreamCommit,
  upstreamSkillFile,
  upstreamSkillNames,
  type Baseline,
  type LockFile,
} from "./lib/lockfile";

/** A release compatibility key must name a dsh version and a port/legacy revision. */
const COMPATIBILITY_KEY_RE = /^[a-z0-9][a-z0-9.-]*\+(?:port|legacy)-v\d+$/;

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

interface DriftProblem {
  skill: string;
  reason: string;
}

/**
 * Compare cases.lock.json against the current upstream skills tree and cases directory.
 * Each returned problem names a skill and why it drifted from the locked state.
 */
function checkLockDrift(lock: LockFile): DriftProblem[] {
  const upstream = upstreamSkillNames();
  const upstreamSet = new Set(upstream);
  const cases = new Set(caseSkills());
  const problems: DriftProblem[] = [];

  const baseline: Baseline | undefined = lock.baseline;
  if (baseline === undefined) {
    problems.push({
      skill: "baseline",
      reason: "cases.lock.json 缺少 baseline，请运行 playground:lock 重新生成",
    });
  } else {
    const expectedDsh = packageDshVersion();
    if (baseline.dshVersion !== expectedDsh)
      problems.push({
        skill: "baseline.dshVersion",
        reason: `与 package.json engines.dsh 不一致（lock ${baseline.dshVersion}，当前 ${expectedDsh}）`,
      });
    const currentCommit = upstreamCommit();
    if (baseline.pstackCommit !== currentCommit)
      problems.push({
        skill: "baseline.pstackCommit",
        reason: `与当前上游提交不一致（lock ${baseline.pstackCommit}，当前 ${currentCommit}）`,
      });
    if (
      typeof baseline.compatibilityKey !== "string" ||
      !COMPATIBILITY_KEY_RE.test(baseline.compatibilityKey)
    )
      problems.push({
        skill: "baseline.compatibilityKey",
        reason: `缺失或格式不符（${baseline.compatibilityKey}）`,
      });
  }

  for (const skill of upstream) {
    const excluded = lock.skills[skill]?.status === "excluded" || skill in EXCLUSIONS;
    if (!cases.has(skill) && !excluded)
      problems.push({ skill, reason: "上游新增技能但没有用例且未 excluded" });
  }

  for (const skill of cases) {
    if (!upstreamSet.has(skill)) problems.push({ skill, reason: "用例存在但上游技能已不存在" });
  }

  for (const [skill, entry] of Object.entries(lock.skills)) {
    if (entry.status !== "audited") continue;
    if (entry.approvedAt === undefined || entry.approvedRound === undefined)
      problems.push({ skill, reason: "status=audited 但缺少 approvedAt/approvedRound" });
    if (entry.approvedCompatibilityKey !== baseline.compatibilityKey)
      problems.push({
        skill,
        reason: `status=audited 但 approvedCompatibilityKey 与当前基线不一致（approved ${entry.approvedCompatibilityKey ?? "未记录"}，当前 ${baseline.compatibilityKey}），需重新审批`,
      });
    if (!upstreamSet.has(skill)) continue;
    const current = sha256File(upstreamSkillFile(skill));
    if (entry.approvedHash !== undefined && current !== entry.approvedHash)
      problems.push({
        skill,
        reason: `status=audited 但 SKILL.md 哈希与 approvedHash 不一致（approved ${entry.approvedHash}，当前 ${current}）`,
      });
    if (current !== entry.skillHash)
      problems.push({
        skill,
        reason: `status=audited 但 SKILL.md 哈希不一致（lock ${entry.skillHash}，当前 ${current}）`,
      });
  }

  for (const [skill, entry] of Object.entries(lock.skills)) {
    if (entry.status === "excluded" && cases.has(skill))
      problems.push({ skill, reason: "excluded 技能却仍存在用例文件" });
  }

  // cursorOnly and status must agree: a cursor-only skill is excluded, and only it.
  for (const [skill, entry] of Object.entries(lock.skills)) {
    if (entry.cursorOnly && entry.status !== "excluded")
      problems.push({ skill, reason: "cursorOnly=true 但 status!=excluded" });
    if (entry.status === "excluded" && entry.cursorOnly !== true)
      problems.push({ skill, reason: "status=excluded 但 cursorOnly!=true" });
  }

  return problems;
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

  const lock = readLock();
  const drift = lock ? checkLockDrift(lock) : [];

  if (json) {
    console.log(
      JSON.stringify({ summary, skills: checks, lock: { present: lock !== null, drift } }, null, 2),
    );
  } else {
    renderTable(checks);
    console.log("");
    console.log(`${summary.total} skills, ${summary.ok} ok, ${summary.failed} failed`);
    console.log("");
    if (lock === null) {
      console.log(`[check] no cases.lock.json at ${LOCK_FILE}; run playground:lock first`);
    } else if (drift.length === 0) {
      console.log(
        `[check] cases.lock.json: no drift (${Object.keys(lock.skills).length} skills locked)`,
      );
    } else {
      console.log(`[check] cases.lock.json drift (${drift.length}):`);
      for (const problem of drift) console.log(`  - ${problem.skill}: ${problem.reason}`);
    }
  }
  if (failed.length > 0 || lock === null || drift.length > 0) process.exitCode = 1;
}

main();
