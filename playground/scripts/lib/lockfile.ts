// cases.lock.json is the pinned map from upstream pstack skills to playground cases,
// plus the release baseline. It records, per skill, which case file covers it, the
// SKILL.md content hash, an audit status and approval record, and the exclusion table
// for Cursor-only skills. lock.ts regenerates it; check.ts compares the stored copy
// against disk and the current package/upstream baseline to detect drift.

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { CASES_DIR, RAW_SKILLS_DIR, REPO_ROOT } from "./env";

export const LOCK_FILE = join(REPO_ROOT, "playground", "cases.lock.json");
export const PACKAGE_JSON = join(REPO_ROOT, "package.json");

export type SkillStatus = "audited" | "excluded" | "pending";

export interface SkillLock {
  /** Repo-relative path to the covering case file, or null when none exists. */
  caseFile: string | null;
  skillPath: string;
  skillHash: string;
  status: SkillStatus;
  /** True only when the skill truly depends on a dsh.md Cursor-only feature. */
  cursorOnly: boolean;
  /** Why the skill is cursor-only, or the review note when it is not. */
  cursorNote: string;
  /** ISO timestamp of the last approval, present only after approve.ts runs. */
  approvedAt?: string;
  /** The run-batch round the approval was granted in. */
  approvedRound?: number;
  /** The SKILL.md hash accepted at approval time; drift from disk or skillHash is a fault. */
  approvedHash?: string;
  /** The compatibilityKey in force when the approval was granted; a changed key voids it. */
  approvedCompatibilityKey?: string;
}

/** The release baseline: what dsh version, upstream commit, and compatibility key this lock pins. */
export interface Baseline {
  /** The package.json engines.dsh range this baseline pins. */
  dshVersion: string;
  /** The upstream/cursor-plugins commit this baseline pins. */
  pstackCommit: string;
  /** Release compatibility key; carried forward verbatim once set. */
  compatibilityKey: string;
}

export interface Exclusion {
  skill: string;
  reason: string;
}

export interface LockFile {
  baseline: Baseline;
  round?: number;
  status?: string;
  skills: Record<string, SkillLock>;
  exclusions: Exclusion[];
}

/** The review note on every skill that uses none of dsh.md's Cursor-only features. */
export const CURSOR_FREE_NOTE = "reviewed dsh.md Cursor-only features: none used";

/**
 * The one source of truth for Cursor-only dependencies: a skill qualifies only when a
 * step truly needs dsh.md's Cursor-only services (Automations/routines, Bugbot, cloud
 * agents, Cursor Projects, built-in PR tool). Merely describing those features, or using
 * the words "automation"/"routine" in prose, does not qualify.
 */
export const CURSOR_ONLY_REASONS: Record<string, string> = {
  "make-bot-ui":
    "依赖 Cursor Automations 的 routine 与 SendToUser webhook（sender key、wake loop），DSH 无对应服务，按 dsh.md Cursor-only features 舍弃",
};

// The exclusion table is generated from the cursor-only table, never maintained separately.
export const EXCLUSIONS: Record<string, string> = CURSOR_ONLY_REASONS;

export function sha256File(path: string): string {
  return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

export function upstreamSkillFile(name: string): string {
  return join(RAW_SKILLS_DIR, name, "SKILL.md");
}

/** Skill directory names currently present upstream, sorted for a stable lock order. */
export function upstreamSkillNames(): string[] {
  if (!existsSync(RAW_SKILLS_DIR)) return [];
  return readdirSync(RAW_SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** Skill names that have a case file under playground/cases (index.ts excluded). */
export function caseSkills(): string[] {
  if (!existsSync(CASES_DIR)) return [];
  return readdirSync(CASES_DIR)
    .filter((name) => name.endsWith(".ts") && name !== "index.ts")
    .map((name) => name.slice(0, -3))
    .sort();
}

export function readLock(): LockFile | null {
  if (!existsSync(LOCK_FILE)) return null;
  return JSON.parse(readFileSync(LOCK_FILE, "utf8")) as LockFile;
}

/** The engines.dsh range from package.json, the version the baseline must match. */
export function packageDshVersion(): string {
  const manifest = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")) as {
    engines?: { dsh?: string };
  };
  const dsh = manifest.engines?.dsh;
  if (typeof dsh !== "string" || dsh.trim() === "")
    throw new Error("package.json must declare engines.dsh");
  return dsh;
}

/** The current upstream/cursor-plugins HEAD, the commit the baseline must match. */
export function upstreamCommit(): string {
  const result = spawnSync("git", ["-C", "upstream/cursor-plugins", "rev-parse", "HEAD"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) return "unknown";
  return result.stdout.trim() || "unknown";
}

/** Derive a first compatibility key from the DSH range. */
function derivedCompatibilityKey(): string {
  const version =
    packageDshVersion()
      .replace(/^[^0-9]*/, "")
      .split(/\s/)[0] ?? "0.0.0";
  return `dsh-${version}+port-v1`;
}

/** Build the release baseline, carrying an existing compatibilityKey forward verbatim. */
function buildBaseline(existing: LockFile | null): Baseline {
  const prior = existing?.baseline;
  const compatibilityKey = prior?.compatibilityKey ?? derivedCompatibilityKey();
  return {
    dshVersion: packageDshVersion(),
    pstackCommit: upstreamCommit(),
    compatibilityKey,
  };
}

/** Build the lock from disk, preserving each existing skill's status and approval record and defaulting new ones to pending. */
export function buildLock(existing: LockFile | null): LockFile {
  const cases = new Set(caseSkills());
  const skills: Record<string, SkillLock> = {};
  for (const name of upstreamSkillNames()) {
    const cursorOnly = name in CURSOR_ONLY_REASONS;
    const prior = existing?.skills[name];
    // Cursor-only skills are excluded by definition; any other skill never stays excluded.
    const status: SkillStatus = cursorOnly
      ? "excluded"
      : prior?.status === "excluded"
        ? "pending"
        : (prior?.status ?? "pending");
    const entry: SkillLock = {
      caseFile: cases.has(name) ? `playground/cases/${name}.ts` : null,
      skillPath: `upstream/cursor-plugins/pstack/skills/${name}/SKILL.md`,
      skillHash: sha256File(upstreamSkillFile(name)),
      status,
      cursorOnly,
      cursorNote: cursorOnly ? CURSOR_ONLY_REASONS[name] : CURSOR_FREE_NOTE,
    };
    // A plain regeneration must not erase an existing approval record.
    if (prior?.approvedAt !== undefined) entry.approvedAt = prior.approvedAt;
    if (prior?.approvedRound !== undefined) entry.approvedRound = prior.approvedRound;
    if (prior?.approvedHash !== undefined) entry.approvedHash = prior.approvedHash;
    if (prior?.approvedCompatibilityKey !== undefined)
      entry.approvedCompatibilityKey = prior.approvedCompatibilityKey;
    skills[name] = entry;
  }
  const exclusions = Object.entries(CURSOR_ONLY_REASONS)
    .map(([skill, reason]) => ({ skill, reason }))
    .sort((a, b) => a.skill.localeCompare(b.skill));
  return {
    baseline: buildBaseline(existing),
    round: existing?.round ?? 0,
    status: existing?.status ?? "pending-approval",
    skills,
    exclusions,
  };
}

export function writeLock(lock: LockFile): void {
  writeFileSync(LOCK_FILE, `${JSON.stringify(lock, null, 2)}\n`);
}
