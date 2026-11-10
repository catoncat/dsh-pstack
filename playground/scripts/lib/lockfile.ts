// cases.lock.json is the pinned map from upstream pstack skills to playground cases.
// It records, per skill, which case file covers it, the SKILL.md content hash, and an
// audit status, plus the exclusion table for Cursor-only skills. lock.ts regenerates
// it; check.ts compares the generated-and-stored copy against disk to detect drift.

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { CASES_DIR, RAW_SKILLS_DIR, REPO_ROOT } from "./env";

export const LOCK_FILE = join(REPO_ROOT, "playground", "cases.lock.json");

export type SkillStatus = "audited" | "excluded" | "pending";

export interface SkillLock {
  /** Repo-relative path to the covering case file, or null when none exists. */
  caseFile: string | null;
  skillPath: string;
  skillHash: string;
  status: SkillStatus;
}

export interface Exclusion {
  skill: string;
  reason: string;
}

export interface LockFile {
  upstream: { repo: string; commit: string };
  skills: Record<string, SkillLock>;
  exclusions: Exclusion[];
}

// Skills that cannot run on DSH at all. This table, not the per-skill status, is the
// source of truth: a fresh lock marks these excluded and records why.
export const EXCLUSIONS: Record<string, string> = {
  "make-bot-ui":
    "依赖 Cursor Automations / routine / SendToUser webhook，DSH 无对应服务，按 dsh.md Cursor-only features 舍弃",
};

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

function upstreamCommit(): string {
  const result = spawnSync("git", ["-C", "upstream/cursor-plugins", "rev-parse", "HEAD"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) return "unknown";
  return result.stdout.trim() || "unknown";
}

/** Build the lock from disk, preserving each existing skill's status and defaulting new ones to pending. */
export function buildLock(existing: LockFile | null): LockFile {
  const cases = new Set(caseSkills());
  const skills: Record<string, SkillLock> = {};
  for (const name of upstreamSkillNames()) {
    const prior = existing?.skills[name]?.status;
    const status: SkillStatus = prior ?? (name in EXCLUSIONS ? "excluded" : "pending");
    skills[name] = {
      caseFile: cases.has(name) ? `playground/cases/${name}.ts` : null,
      skillPath: `upstream/cursor-plugins/pstack/skills/${name}/SKILL.md`,
      skillHash: sha256File(upstreamSkillFile(name)),
      status,
    };
  }
  const exclusions = Object.entries(EXCLUSIONS)
    .map(([skill, reason]) => ({ skill, reason }))
    .sort((a, b) => a.skill.localeCompare(b.skill));
  return {
    upstream: { repo: "cursor-plugins/pstack", commit: upstreamCommit() },
    skills,
    exclusions,
  };
}

export function writeLock(lock: LockFile): void {
  writeFileSync(LOCK_FILE, `${JSON.stringify(lock, null, 2)}\n`);
}
