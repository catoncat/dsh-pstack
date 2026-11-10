// Run one skill case against the prepared web instance end to end: materialize the
// case workspace, drive the real composer in one browser process, locate the session
// it created, wait for the turn to end, and persist evidence plus a verdict.

import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { Mode, SkillCase, ToolCallEvidence } from "../types";
import { createBrowserSession, type BrowserSession } from "./lib/browser";
import { loadCase, loadCaseFile } from "./lib/cases";
import { buildVerdict, digestSession, readSessionEvents, toSessionEvidence } from "./lib/evidence";
import { DSH_HOME, EVIDENCE_DIR, WORKSPACE_ROOT, readWebUrl } from "./lib/env";

const COMPOSER_SELECTOR = '[data-composer-input="true"]';
const NEW_SESSION_LABEL = "新会话";
const DEFAULT_WAIT_SECONDS = 900;
const POLL_INTERVAL_MS = 2_000;

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const sleep = (ms: number): void => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

interface SessionFile {
  id: string;
  file: string;
}

function listSessionFiles(): SessionFile[] {
  const root = join(DSH_HOME, "sessions");
  if (!existsSync(root)) return [];
  const files: SessionFile[] = [];
  for (const slug of readdirSync(root)) {
    const slugDir = join(root, slug);
    if (!statSync(slugDir).isDirectory()) continue;
    for (const id of readdirSync(slugDir)) {
      const file = join(slugDir, id, "session.v4.jsonl.zstd");
      if (existsSync(file)) files.push({ id, file });
    }
  }
  return files;
}

function firstUserText(events: ReturnType<typeof readSessionEvents>): string {
  for (const event of events) {
    if (event.type !== "user/message") continue;
    const source = event.data?.source as { kind?: string } | undefined;
    if (source?.kind !== "user") continue;
    const content = event.data?.content as Array<{ type?: string; text?: string }> | undefined;
    const text = (content ?? [])
      .map((part) => (part.type === "text" ? (part.text ?? "") : ""))
      .join("");
    if (text !== "") return text;
  }
  return "";
}

function waitFor(predicate: () => boolean, timeoutMs: number, intervalMs = 500): boolean {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    sleep(intervalMs);
  }
  return predicate();
}

/** Dismiss the preview notice if a fresh profile still shows it. */
function dismissPreview(session: BrowserSession): void {
  const body = session.eval<string>("document.body.innerText");
  if (!body.includes("预览版说明")) return;
  session.eval<boolean>(
    `(() => {
      const button = [...document.querySelectorAll("button")].find((element) => element.innerText.trim() === "继续");
      if (!button) return false;
      button.click();
      return true;
    })()`,
  );
  session.wait(2000);
}

/**
 * Create a session inside the case's own workspace when its sidebar row exposes the
 * per-workspace new-session action, else fall back to the header button (single
 * workspace / smoke). Without this, every case would land in whichever workspace is
 * most recent and lose its own workspaceFiles.
 */
function startSession(session: BrowserSession, workspaceTitle: string): string {
  const viaWorkspace = session.eval<string>(
    `(() => {
      const title = ${JSON.stringify(workspaceTitle)};
      const button = [...document.querySelectorAll("button")].find((element) => {
        const label = element.getAttribute("aria-label") || "";
        return label.includes(title) && (label.includes("新建会话") || label.toLowerCase().includes("new session"));
      });
      if (button) { button.click(); return "workspace"; }
      const header = [...document.querySelectorAll("button")].find((element) => element.innerText.trim() === ${JSON.stringify(NEW_SESSION_LABEL)});
      if (header) { header.click(); return "header"; }
      return "none";
    })()`,
  );
  if (viaWorkspace === "none")
    throw new Error(`could not find a "${NEW_SESSION_LABEL}" button to start a session`);
  return viaWorkspace;
}

function materializeWorkspace(caseId: string, files: Record<string, string>): string {
  const workspaceDir = join(WORKSPACE_ROOT, caseId);
  rmSync(workspaceDir, { recursive: true, force: true });
  mkdirSync(workspaceDir, { recursive: true });
  for (const [relative, content] of Object.entries(files)) {
    const target = join(workspaceDir, relative);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return workspaceDir;
}

interface MatchResult {
  id: string;
  file: string;
}

function waitForSession(
  before: Set<string>,
  startedAtMs: number,
  prompt: string,
  waitMs: number,
): MatchResult | null {
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    for (const { id, file } of listSessionFiles()) {
      // The app creates a blank session on open and reuses it on "新会话", so an id in
      // `before` can still be the target once its zstd log is rewritten. mtime tells us
      // the log moved after we started sending.
      const recent = !before.has(id) || statSync(file).mtimeMs >= startedAtMs - 2000;
      if (!recent) continue;
      const events = readSessionEvents(file);
      if (events.length === 0) continue;
      if (!firstUserText(events).includes(prompt)) continue;
      if (events.some((event) => event.type === "turn/end")) return { id, file };
    }
    sleep(POLL_INTERVAL_MS);
  }
  return null;
}

async function main(): Promise<void> {
  const mode = argValue("--mode") as Mode | undefined;
  if (mode !== "raw" && mode !== "adapted")
    throw new Error(
      "usage: run-case.ts --case <id> --mode raw|adapted [--case-file <path>] [--timeout <seconds>]",
    );
  const timeoutArg = Number(argValue("--timeout") ?? DEFAULT_WAIT_SECONDS);
  if (!Number.isFinite(timeoutArg) || timeoutArg <= 0)
    throw new Error("--timeout must be a positive number of seconds");
  const sessionWaitMs = timeoutArg * 1000;
  const caseFileArg = argValue("--case-file");
  const caseIdArg = argValue("--case");
  if (!caseFileArg && !caseIdArg) throw new Error("missing --case <id> (or --case-file <path>)");

  const skillCase: SkillCase = caseFileArg
    ? await loadCaseFile(caseFileArg)
    : await loadCase(caseIdArg as string);
  const caseId = skillCase.id;
  if (!skillCase.stages.includes(mode))
    console.warn(
      `[run-case] ${caseId} does not list stage "${mode}" (has ${skillCase.stages.join(",")}); running anyway`,
    );

  const workspaceDir = materializeWorkspace(caseId, skillCase.workspaceFiles);
  const url = readWebUrl();

  const session = createBrowserSession({ session: "playground" });
  const capturedAt = new Date().toISOString();
  const stamp = capturedAt.replace(/[:.]/g, "-");
  const evidenceFile = join(EVIDENCE_DIR, `${caseId}-${mode}-${stamp}.json`);
  const screenshotFile = join(EVIDENCE_DIR, `${caseId}-${mode}-${stamp}.png`);

  try {
    session.open(url);
    session.wait(6000);
    dismissPreview(session);

    const before = new Set(listSessionFiles().map((entry) => entry.id));
    const startedAtMs = Date.now();
    const startedVia = startSession(session, caseId);
    console.log(`[run-case] started session via ${startedVia} for workspace "${caseId}"`);

    session.wait(2500);
    if (
      !waitFor(
        () =>
          session.eval<number>(
            `document.querySelectorAll(${JSON.stringify(COMPOSER_SELECTOR)}).length`,
          ) > 0,
        15_000,
      )
    ) {
      throw new Error("composer did not appear after starting a session");
    }
    session.click(COMPOSER_SELECTOR);
    session.keyboardType(skillCase.prompt);
    session.wait(800);
    session.press("Enter");
    session.wait(2000);

    let composer = session.eval<string>(
      `(document.querySelector(${JSON.stringify(COMPOSER_SELECTOR)})?.innerText ?? "").trim()`,
    );
    if (composer !== "") {
      console.log("[run-case] composer not cleared after Enter; clicking the send button");
      session.eval<boolean>(
        `(() => {
          const candidates = [...document.querySelectorAll("button")].filter((button) => !button.disabled && button.querySelector("svg"));
          const last = candidates.at(-1);
          if (!last) return false;
          last.click();
          return true;
        })()`,
      );
      session.wait(2500);
      composer = session.eval<string>(
        `(document.querySelector(${JSON.stringify(COMPOSER_SELECTOR)})?.innerText ?? "").trim()`,
      );
    }

    const match = waitForSession(before, startedAtMs, skillCase.prompt, sessionWaitMs);
    if (!match) {
      session.screenshot(screenshotFile);
      throw new Error(
        `no session matching the prompt reached turn/end within ${sessionWaitMs / 1000}s (screenshot ${screenshotFile})`,
      );
    }
    session.wait(1000);
    session.screenshot(screenshotFile);

    const digest = digestSession(match.file, match.id);
    const evidence = toSessionEvidence(digest, caseId, mode, match.file, capturedAt);
    mkdirSync(EVIDENCE_DIR, { recursive: true });
    writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`);
    const verdict = buildVerdict(skillCase.expect, evidence, workspaceDir);

    console.log(`[run-case] ${caseId} [${mode}] ${verdict.passed ? "PASS" : "FAIL"}`);
    if (!verdict.passed) for (const failure of verdict.failures) console.log(`  - ${failure}`);
    console.log(
      `[run-case] route=${evidence.route ? `${evidence.route.provider}/${evidence.route.model}[${evidence.route.effort}]` : "unknown"} turnEnd=${evidence.turnEndReason ?? "none"}`,
    );
    console.log(
      `[run-case] toolCalls=${summarizeCalls(evidence.toolCalls)} skillLoads=${evidence.skillLoads.join(", ") || "none"}`,
    );
    console.log(`[run-case] evidence=${evidenceFile}`);
    console.log(JSON.stringify(verdict));
    process.exitCode = verdict.passed ? 0 : 1;
  } finally {
    session.close();
  }
}

function summarizeCalls(calls: ToolCallEvidence[]): string {
  if (calls.length === 0) return "none";
  const errors = calls.filter((call) => call.status === "error").map((call) => call.name);
  return `${calls.length} total${errors.length > 0 ? `, errors: ${errors.join("/")}` : ", no errors"}`;
}

main().catch((error: unknown) => {
  console.error(`[run-case] ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
