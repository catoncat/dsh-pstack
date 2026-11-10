// Collect the evidence files for one stage into a Markdown report: per-case verdict,
// route, tool errors, duplicate skill loads, and the reasons behind each failure.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { Expectation, Mode, SessionEvidence } from "../types";
import { loadCase, loadSmokeCase } from "./lib/cases";
import { buildVerdict } from "./lib/evidence";
import { EVIDENCE_DIR, REPORT_DIR, WORKSPACE_ROOT } from "./lib/env";

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

function latestPerCase(files: string[]): Map<string, SessionEvidence> {
  const latest = new Map<string, SessionEvidence>();
  for (const file of files) {
    const evidence = JSON.parse(readFileSync(file, "utf8")) as SessionEvidence;
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
  if (!existsSync(EVIDENCE_DIR))
    throw new Error(`no evidence dir ${EVIDENCE_DIR}; run playground:run first`);

  const files = readdirSync(EVIDENCE_DIR)
    .filter((name) => name.endsWith(".json") && name.includes(`-${mode}-`))
    .map((name) => join(EVIDENCE_DIR, name));
  const perCase = latestPerCase(files);

  const rows: string[] = [];
  let passed = 0;
  for (const caseId of [...perCase.keys()].sort()) {
    const evidence = perCase.get(caseId) as SessionEvidence;
    const { expectations, found } = await resolveExpectations(caseId);
    const workspaceDir = join(WORKSPACE_ROOT, caseId);
    const verdict = buildVerdict(expectations, evidence, workspaceDir);
    const failures = [...verdict.failures];
    if (!found) failures.push("no case definition found for this evidence");
    if (verdict.passed && failures.length === 0) passed += 1;

    const errors = evidence.toolCalls
      .filter((call) => call.status === "error")
      .map((call) => call.name);
    const duplicates = duplicateLoads(evidence.skillLoads);
    const route = evidence.route
      ? `${evidence.route.provider}/${evidence.route.model}[${evidence.route.effort}]`
      : "unknown";
    const status = failures.length === 0 ? "PASS" : "FAIL";
    rows.push(
      `| ${escapeCell(caseId)} | ${status} | ${escapeCell(evidence.turnEndReason ?? "none")} | ${escapeCell(route)} | ${escapeCell(errors.join(", ") || "-")} | ${escapeCell(duplicates.join(", ") || "-")} | ${escapeCell(failures.join("; ") || "-")} |`,
    );
  }

  const date = new Date().toISOString().slice(0, 10);
  const lines = [
    `# Stage 1 evidence — ${mode} — ${date}`,
    "",
    `Generated ${new Date().toISOString()} from ${EVIDENCE_DIR}.`,
    "",
    `- total: ${perCase.size}`,
    `- passed: ${passed}`,
    `- failed: ${perCase.size - passed}`,
    "",
    "| case | verdict | turn end | route | tool errors | duplicate loads | failures |",
    "| --- | --- | --- | --- | --- | --- | --- |",
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
