// Run one skill case against one prepared worker's web instance end to end:
// materialize the case workspace, drive the real composer in one browser process,
// locate the session it created, wait for turn/end (or a probe window), then persist
// evidence plus a verdict. In probe mode the turn is aborted at the window's end and
// the evidence is marked truncated. A missing session or an unreadable session log is
// an infrastructure error: retry once with a fresh session, then exit 2 (not a FAIL).

import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import type { Mode, SessionEvidence, SkillCase, ToolCallEvidence } from "../types";
import { createBrowserSession, type BrowserSession } from "./lib/browser";
import { loadCase, loadCaseFile } from "./lib/cases";
import {
  buildVerdict,
  digestSession,
  readSessionEvents,
  toSessionEvidence,
  type SessionDigest,
} from "./lib/evidence";
import { readWebUrl } from "./lib/env";
import { workerPaths, type WorkerPaths } from "./lib/worker";

const COMPOSER_SELECTOR = '[data-composer-input="true"]';
const NEW_SESSION_LABEL = "新会话";
const DEFAULT_WAIT_SECONDS = 900;
const POLL_INTERVAL_MS = 2_000;
/** Stage-one short-probe window per case kind, in seconds. */
const DEFAULT_PROBE_SECONDS: Record<SkillCase["kind"], number> = {
  behavior: 300,
  "principle-light": 120,
};

/** A failure that is the harness's fault, not the case's: no session, or an unreadable log. */
class InfraError extends Error {}

function isEnoent(error: unknown): boolean {
  return (error as NodeJS.ErrnoException | null)?.code === "ENOENT";
}

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

function listSessionFiles(paths: WorkerPaths): SessionFile[] {
  const root = join(paths.home, "sessions");
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

function materializeWorkspace(
  paths: WorkerPaths,
  caseId: string,
  files: Record<string, string>,
): string {
  const workspaceDir = join(paths.workspaceRoot, caseId);
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

/** Find the session whose first user message contains the prompt, created after `startedAtMs`. */
function findMatchingSession(
  paths: WorkerPaths,
  before: Set<string>,
  startedAtMs: number,
  prompt: string,
): MatchResult | null {
  for (const { id, file } of listSessionFiles(paths)) {
    // The app creates a blank session on open and reuses it on "新会话", so an id in
    // `before` can still be the target once its zstd log is rewritten. mtime tells us
    // the log moved after we started sending.
    const recent = !before.has(id) || statSync(file).mtimeMs >= startedAtMs - 2000;
    if (!recent) continue;
    const events = readSessionEvents(file);
    if (events.length === 0) continue;
    if (!firstUserText(events).includes(prompt)) continue;
    return { id, file };
  }
  return null;
}

function sessionHasTurnEnd(file: string): boolean {
  return readSessionEvents(file).some((event) => event.type === "turn/end");
}

/** Poll until the matched session reaches turn/end or `waitMs` elapses, returning the best match. */
function waitForMatch(
  paths: WorkerPaths,
  before: Set<string>,
  startedAtMs: number,
  prompt: string,
  waitMs: number,
): { match: MatchResult | null; ended: boolean } {
  const deadline = Date.now() + waitMs;
  let match: MatchResult | null = null;
  while (Date.now() < deadline) {
    match = findMatchingSession(paths, before, startedAtMs, prompt);
    if (match && sessionHasTurnEnd(match.file)) return { match, ended: true };
    sleep(POLL_INTERVAL_MS);
  }
  if (!match) match = findMatchingSession(paths, before, startedAtMs, prompt);
  return { match, ended: match ? sessionHasTurnEnd(match.file) : false };
}

/**
 * Click the stop button to abort an in-flight turn. First an aria-label match, then the
 * visible "停止" label, then the last enabled svg button as a fallback.
 */
function stopInFlightTurn(session: BrowserSession): string {
  return session.eval<string>(
    `(() => {
      const buttons = [...document.querySelectorAll("button")];
      const aria = buttons.find((button) => /停止|stop/i.test(button.getAttribute("aria-label") || ""));
      if (aria) { aria.click(); return "aria"; }
      const text = buttons.find((button) => button.innerText.trim() === "停止");
      if (text) { text.click(); return "text"; }
      const withSvg = buttons.filter((button) => !button.disabled && button.querySelector("svg"));
      const last = withSvg.at(-1);
      if (last) { last.click(); return "svg"; }
      return "none";
    })()`,
  );
}

interface AttemptOutcome {
  digest: SessionDigest;
  matchFile: string;
  truncated: boolean;
}

interface AttemptInput {
  url: string;
  paths: WorkerPaths;
  skillCase: SkillCase;
  workerIndex: number;
  waitMs: number;
  probeSeconds: number | null;
  timeoutSeconds: number;
  screenshotFile: string;
}

/**
 * One full attempt against a freshly opened browser session: open, start a session, send
 * the prompt, locate the created session, wait for turn/end or the probe window, and
 * digest the log. Throws InfraError when no session appears or its log cannot be read.
 */
function attemptCase(input: AttemptInput): AttemptOutcome {
  const { url, paths, skillCase, workerIndex, waitMs, probeSeconds, timeoutSeconds } = input;
  const caseId = skillCase.id;
  const workerTag = `w${workerIndex}`;
  const session = createBrowserSession({
    session: `w${workerIndex}`,
    browserDir: paths.browserDir,
  });
  try {
    session.open(url);
    session.wait(6000);
    dismissPreview(session);

    const before = new Set(listSessionFiles(paths).map((entry) => entry.id));
    const startedAtMs = Date.now();
    const startedVia = startSession(session, caseId);
    console.log(
      `[run-case] worker ${workerIndex} started session via ${startedVia} for workspace "${caseId}"`,
    );

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

    const { match, ended } = waitForMatch(paths, before, startedAtMs, skillCase.prompt, waitMs);
    let truncated = false;
    if (!match) {
      throw new InfraError(
        `no session matching the prompt appeared within ${waitMs / 1000}s (worker ${workerTag})`,
      );
    }
    if (!ended) {
      if (probeSeconds === null) {
        session.screenshot(input.screenshotFile);
        throw new Error(
          `no session matching the prompt reached turn/end within ${timeoutSeconds}s (screenshot ${input.screenshotFile})`,
        );
      }
      const how = stopInFlightTurn(session);
      session.wait(2000);
      truncated = true;
      console.log(
        `[run-case] probe window ${probeSeconds}s expired without turn/end; stopped turn via ${how} (truncated)`,
      );
    }
    session.wait(1000);
    session.screenshot(input.screenshotFile);

    if (!existsSync(match.file))
      throw new InfraError(`session log vanished before read: ${match.file} (worker ${workerTag})`);
    let digest: SessionDigest;
    try {
      digest = digestSession(match.file, match.id, workerIndex);
    } catch (error) {
      if (isEnoent(error))
        throw new InfraError(`reading session log hit ENOENT: ${match.file} (worker ${workerTag})`);
      throw error;
    }
    return { digest, matchFile: match.file, truncated };
  } finally {
    session.close();
  }
}

/** Evidence record for a run that failed on infrastructure twice; counted as ERROR, not FAIL. */
function buildInfraEvidence(
  caseId: string,
  mode: Mode,
  workerIndex: number,
  workspaceDir: string,
  capturedAt: string,
): SessionEvidence {
  return {
    caseId,
    mode,
    worker: workerIndex,
    truncated: false,
    sessionId: "",
    sessionFile: "",
    workspacePath: workspaceDir,
    agentPreset: null,
    route: null,
    skillLoads: [],
    toolCalls: [],
    turnEndReason: null,
    assistantText: "",
    capturedAt,
    error: "infra",
    verdict: { passed: false, failures: ["infra"] },
  };
}

async function main(): Promise<void> {
  const mode = argValue("--mode") as Mode | undefined;
  if (mode !== "raw" && mode !== "adapted")
    throw new Error(
      "usage: run-case.ts --worker <k> --case <id> --mode raw|adapted [--probe <seconds>] [--timeout <seconds>] [--case-file <path>]",
    );
  const workerIndex = Number(argValue("--worker") ?? "0");
  if (!Number.isInteger(workerIndex) || workerIndex < 0)
    throw new Error("--worker must be a non-negative integer");
  const paths = workerPaths(workerIndex);

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

  const probeFlag = argValue("--probe");
  const timeoutFlag = argValue("--timeout");
  const timeoutSeconds = timeoutFlag !== undefined ? Number(timeoutFlag) : DEFAULT_WAIT_SECONDS;
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0)
    throw new Error("--timeout must be a positive number of seconds");
  let probeSeconds: number | null;
  if (probeFlag !== undefined) {
    const parsed = Number(probeFlag);
    if (!Number.isFinite(parsed) || parsed <= 0)
      throw new Error("--probe must be a positive number of seconds");
    probeSeconds = parsed;
  } else if (timeoutFlag !== undefined) {
    probeSeconds = null; // explicit --timeout runs the full wait, no short probe
  } else {
    probeSeconds = skillCase.probeSeconds ?? DEFAULT_PROBE_SECONDS[skillCase.kind];
  }
  const waitMs = probeSeconds !== null ? probeSeconds * 1000 : timeoutSeconds * 1000;

  const workspaceDir = materializeWorkspace(paths, caseId, skillCase.workspaceFiles);
  const url = readWebUrl(paths);

  const workerTag = `w${workerIndex}`;
  const capturedAt = new Date().toISOString();
  const stamp = capturedAt.replace(/[:.]/g, "-");
  const evidenceFile = join(paths.evidenceDir, `${workerTag}-${caseId}-${mode}-${stamp}.json`);
  const screenshotFile = join(paths.evidenceDir, `${workerTag}-${caseId}-${mode}-${stamp}.png`);

  const attemptInput: AttemptInput = {
    url,
    paths,
    skillCase,
    workerIndex,
    waitMs,
    probeSeconds,
    timeoutSeconds,
    screenshotFile,
  };

  let outcome: AttemptOutcome;
  try {
    outcome = attemptCase(attemptInput);
  } catch (error) {
    if (!(error instanceof InfraError)) throw error;
    console.error(
      `[run-case] INFRA ${workerTag} ${caseId}: ${error.message}; closing browser and retrying once with a fresh session`,
    );
    try {
      outcome = attemptCase(attemptInput);
    } catch (retryError) {
      if (!(retryError instanceof InfraError)) throw retryError;
      console.error(
        `[run-case] ERROR ${workerTag} ${caseId}: infra retry failed: ${retryError.message}`,
      );
      const evidence = buildInfraEvidence(caseId, mode, workerIndex, workspaceDir, capturedAt);
      mkdirSync(paths.evidenceDir, { recursive: true });
      writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`);
      console.log(`[run-case] ${workerTag} ${caseId} [${mode}] ERROR error=infra`);
      console.log(`[run-case] evidence=${evidenceFile}`);
      process.exitCode = 2;
      return;
    }
  }

  const evidence = toSessionEvidence(
    outcome.digest,
    caseId,
    mode,
    outcome.matchFile,
    capturedAt,
    outcome.truncated,
  );
  const verdict = buildVerdict(skillCase.expect, evidence, workspaceDir);
  evidence.verdict = { passed: verdict.passed, failures: verdict.failures };
  mkdirSync(paths.evidenceDir, { recursive: true });
  writeFileSync(evidenceFile, `${JSON.stringify(evidence, null, 2)}\n`);

  console.log(
    `[run-case] ${workerTag} ${caseId} [${mode}] probe=${probeSeconds ?? "-"} truncated=${outcome.truncated} ${verdict.passed ? "PASS" : "FAIL"}`,
  );
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
