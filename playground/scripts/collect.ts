// Collect the evidence files for one stage, across every worker, into a Markdown
// report: per-case verdict, worker, truncation, route, tool errors, duplicate skill
// loads, the reasons behind each failure, and the archived evidence path. Before
// writing the report it copies this round's evidence JSON and screenshot into
// playground/reports/evidence/<round>-<date>/ so the report's evidence column points
// at a durable file rather than a worker dir that the next prepare may clear.

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join, relative } from "node:path";

import type { Expectation, Mode, SessionEvidence } from "../types";
import { loadCase, loadSmokeCase } from "./lib/cases";
import { buildVerdict, digestSession, toSessionEvidence } from "./lib/evidence";
import { PLAYGROUND_DIR, REPORT_DIR } from "./lib/env";
import { progressFilePath, readProgress } from "./lib/progress";
import { WORKERS_DIR, workerPaths } from "./lib/worker";

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

interface StoredEvidence {
  evidence: SessionEvidence;
  /** Absolute path of the evidence JSON on disk, the source we archive. */
  file: string;
}

async function resolveExpectations(
  caseId: string,
): Promise<{ expectations: Expectation[]; found: boolean }> {
  try {
    return { expectations: (await loadCase(caseId)).expect, found: true };
  } catch {
    try {
      const smoke = await loadSmokeCase();
      if (smoke.id === caseId) return { expectations: smoke.expect, found: true };
    } catch {
      // fall through
    }
  }
  return { expectations: [], found: false };
}

/** Every evidence JSON across all worker evidence dirs whose stored mode matches. */
function loadEvidenceByMode(mode: Mode): StoredEvidence[] {
  if (!existsSync(WORKERS_DIR)) return [];
  const collected: StoredEvidence[] = [];
  for (const workerDir of readdirSync(WORKERS_DIR)) {
    if (!/^w\d+$/.test(workerDir)) continue;
    const evidenceDir = join(WORKERS_DIR, workerDir, "evidence");
    if (!existsSync(evidenceDir)) continue;
    for (const name of readdirSync(evidenceDir)) {
      if (!name.endsWith(".json")) continue;
      const file = join(evidenceDir, name);
      try {
        const evidence = JSON.parse(readFileSync(file, "utf8")) as SessionEvidence;
        if (evidence.mode === mode) collected.push({ evidence, file });
      } catch {
        // skip a partial or non-evidence json
      }
    }
  }
  return collected;
}

function latestPerCase(files: StoredEvidence[]): Map<string, StoredEvidence> {
  const latest = new Map<string, StoredEvidence>();
  for (const stored of files) {
    const current = latest.get(stored.evidence.caseId);
    if (!current || stored.evidence.capturedAt > current.evidence.capturedAt)
      latest.set(stored.evidence.caseId, stored);
  }
  return latest;
}

function duplicateLoads(skillLoads: string[]): string[] {
  const counts = new Map<string, number>();
  for (const entry of skillLoads) {
    if (entry.includes("#")) continue;
    counts.set(entry, (counts.get(entry) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name);
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

/** Copy a case's evidence JSON and its sibling PNG into the round archive; return the repo-relative path. */
function archiveEvidence(sourceFile: string, archiveDir: string, archiveSubdir: string): string {
  if (!existsSync(sourceFile)) return "missing";
  const name = basename(sourceFile);
  try {
    copyFileSync(sourceFile, join(archiveDir, name));
    const png = sourceFile.replace(/\.json$/, ".png");
    if (existsSync(png)) copyFileSync(png, join(archiveDir, basename(png)));
  } catch {
    return "missing";
  }
  return `reports/evidence/${archiveSubdir}/${name}`;
}

async function main(): Promise<void> {
  const mode = argValue("--mode") as Mode | undefined;
  if (mode !== "raw" && mode !== "adapted") throw new Error("usage: collect.ts --mode raw|adapted");

  const collected = loadEvidenceByMode(mode);
  if (collected.length === 0)
    throw new Error(
      `no ${mode} evidence under ${WORKERS_DIR}/w*/evidence; run playground:run-batch first`,
    );
  const perCase = latestPerCase(collected);

  const round = readProgress(progressFilePath())?.round ?? 1;
  const date = new Date().toISOString().slice(0, 10);
  const archiveSubdir = `${round}-${date}`;
  const archiveDir = join(REPORT_DIR, "evidence", archiveSubdir);
  mkdirSync(archiveDir, { recursive: true });

  const rows: string[] = [];
  let passed = 0;
  for (const caseId of [...perCase.keys()].sort()) {
    const stored = perCase.get(caseId) as StoredEvidence;
    const worker = Number.isInteger(stored.evidence.worker) ? stored.evidence.worker : 0;
    // Re-digest from the session log so verdicts track the current pipeline even
    // when the stored evidence predates a digest field.
    const evidence =
      stored.evidence.sessionFile && existsSync(stored.evidence.sessionFile)
        ? toSessionEvidence(
            digestSession(stored.evidence.sessionFile, stored.evidence.sessionId, worker),
            stored.evidence.caseId,
            stored.evidence.mode,
            stored.evidence.sessionFile,
            stored.evidence.capturedAt,
            stored.evidence.truncated ?? false,
          )
        : stored.evidence;
    const { expectations, found } = await resolveExpectations(caseId);
    const workspaceDir = join(workerPaths(worker).workspaceRoot, caseId);
    const verdict = buildVerdict(expectations, evidence, workspaceDir);
    const failures = [...verdict.failures];
    if (!found) failures.push("no case definition found for this evidence");
    const status = evidence.truncated ? "PROBE" : failures.length === 0 ? "PASS" : "FAIL";
    if (status === "PASS") passed += 1;

    const errors = evidence.toolCalls
      .filter((call) => call.status === "error")
      .map((call) => call.name);
    const duplicates = duplicateLoads(evidence.skillLoads);
    const route = evidence.route
      ? `${evidence.route.provider}/${evidence.route.model}[${evidence.route.effort}]`
      : "unknown";
    const archived = archiveEvidence(stored.file, archiveDir, archiveSubdir);
    rows.push(
      `| ${escapeCell(caseId)} | w${worker} | ${status} | ${evidence.truncated ? "yes" : "no"} | ${escapeCell(evidence.turnEndReason ?? "none")} | ${escapeCell(route)} | ${escapeCell(errors.join(", ") || "-")} | ${escapeCell(duplicates.join(", ") || "-")} | ${escapeCell(failures.join("; ") || "-")} | ${escapeCell(archived)} |`,
    );
  }

  const lines = [
    `# Playground evidence — ${mode} — ${date}`,
    "",
    `Generated ${new Date().toISOString()} from ${relative(PLAYGROUND_DIR, WORKERS_DIR)}/w*/evidence; archived to reports/evidence/${archiveSubdir}/.`,
    "",
    `- total: ${perCase.size}`,
    `- passed: ${passed}`,
    `- failed: ${perCase.size - passed}`,
    "",
    "| case | worker | verdict | truncated | turn end | route | tool errors | duplicate loads | failures | evidence |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
  ];

  mkdirSync(REPORT_DIR, { recursive: true });
  const reportFile = join(REPORT_DIR, `run-${mode}-${date}.md`);
  writeFileSync(reportFile, lines.join("\n"));
  console.log(`[collect] ${perCase.size} cases, ${passed} passed, ${perCase.size - passed} failed`);
  console.log(`[collect] evidence archived to ${archiveDir}`);
  console.log(`[collect] report=${reportFile}`);
}

main().catch((error: unknown) => {
  console.error(`[collect] ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
