// Collect the evidence files for one stage, across every worker, into a Markdown
// report: per-case verdict, worker, truncation, route, tool errors, duplicate skill
// loads, and the reasons behind each failure.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Expectation, Mode, SessionEvidence } from "../types";
import { loadCase, loadSmokeCase } from "./lib/cases";
import { buildVerdict, digestSession, toSessionEvidence } from "./lib/evidence";
import { REPORT_DIR } from "./lib/env";
import { WORKERS_DIR, workerPaths } from "./lib/worker";

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
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
function loadEvidenceByMode(mode: Mode): SessionEvidence[] {
  if (!existsSync(WORKERS_DIR)) return [];
  const collected: SessionEvidence[] = [];
  for (const workerDir of readdirSync(WORKERS_DIR)) {
    if (!/^w\d+$/.test(workerDir)) continue;
    const evidenceDir = join(WORKERS_DIR, workerDir, "evidence");
    if (!existsSync(evidenceDir)) continue;
    for (const name of readdirSync(evidenceDir)) {
      if (!name.endsWith(".json")) continue;
      try {
        const evidence = JSON.parse(
          readFileSync(join(evidenceDir, name), "utf8"),
        ) as SessionEvidence;
        if (evidence.mode === mode) collected.push(evidence);
      } catch {
        // skip a partial or non-evidence json
      }
    }
  }
  return collected;
}

function latestPerCase(files: SessionEvidence[]): Map<string, SessionEvidence> {
  const latest = new Map<string, SessionEvidence>();
  for (const evidence of files) {
    const current = latest.get(evidence.caseId);
    if (!current || evidence.capturedAt > current.capturedAt) latest.set(evidence.caseId, evidence);
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

async function main(): Promise<void> {
  const mode = argValue("--mode") as Mode | undefined;
  if (mode !== "raw" && mode !== "adapted") throw new Error("usage: collect.ts --mode raw|adapted");

  const collected = loadEvidenceByMode(mode);
  if (collected.length === 0)
    throw new Error(
      `no ${mode} evidence under ${WORKERS_DIR}/w*/evidence; run playground:run-batch first`,
    );
  const perCase = latestPerCase(collected);

  const rows: string[] = [];
  let passed = 0;
  for (const caseId of [...perCase.keys()].sort()) {
    const stored = perCase.get(caseId) as SessionEvidence;
    const worker = Number.isInteger(stored.worker) ? stored.worker : 0;
    // Re-digest from the session log so verdicts track the current pipeline even
    // when the stored evidence predates a digest field.
    const evidence =
      stored.sessionFile && existsSync(stored.sessionFile)
        ? toSessionEvidence(
            digestSession(stored.sessionFile, stored.sessionId, worker),
            stored.caseId,
            stored.mode,
            stored.sessionFile,
            stored.capturedAt,
            stored.truncated ?? false,
          )
        : stored;
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
    rows.push(
      `| ${escapeCell(caseId)} | w${worker} | ${status} | ${evidence.truncated ? "yes" : "no"} | ${escapeCell(evidence.turnEndReason ?? "none")} | ${escapeCell(route)} | ${escapeCell(errors.join(", ") || "-")} | ${escapeCell(duplicates.join(", ") || "-")} | ${escapeCell(failures.join("; ") || "-")} |`,
    );
  }

  const date = new Date().toISOString().slice(0, 10);
  const lines = [
    `# Stage 1 evidence — ${mode} — ${date}`,
    "",
    `Generated ${new Date().toISOString()} from ${WORKERS_DIR}/w*/evidence.`,
    "",
    `- total: ${perCase.size}`,
    `- passed: ${passed}`,
    `- failed: ${perCase.size - passed}`,
    "",
    "| case | worker | verdict | truncated | turn end | route | tool errors | duplicate loads | failures |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
    "",
  ];

  mkdirSync(REPORT_DIR, { recursive: true });
  const reportFile = join(REPORT_DIR, `stage1-${mode}-${date}.md`);
  writeFileSync(reportFile, lines.join("\n"));
  console.log(`[collect] ${perCase.size} cases, ${passed} passed, ${perCase.size - passed} failed`);
  console.log(`[collect] report=${reportFile}`);
}

main().catch((error: unknown) => {
  console.error(`[collect] ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
