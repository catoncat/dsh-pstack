// Run a set of skill cases across N workers in parallel: round-robin the cases into
// per-worker queues, then run each worker's queue serially by spawning one run-case
// child process per case. Parallelism comes from the child processes, because the
// agent-browser daemon cannot be driven concurrently inside one process. Every case
// transition rewrites playground/.workers/progress.json so a run is observable.

import { spawn } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import type { Mode } from "../types";
import { listCaseIds } from "./lib/cases";
import { computeWorkers } from "./lib/capacity";
import { REPO_ROOT } from "./lib/env";
import { progressFilePath, updateProgress, writeProgress } from "./lib/progress";
import { WORKERS_DIR } from "./lib/worker";

const VPX = process.platform === "win32" ? "vpx.cmd" : "vpx";

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function selectCases(): string[] {
  const casesFlag = argValue("--cases");
  if (casesFlag !== undefined)
    return [
      ...new Set(
        casesFlag
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id !== ""),
      ),
    ];
  return listCaseIds();
}

function distribute(ids: string[], workers: number): string[][] {
  const queues: string[][] = Array.from({ length: workers }, () => []);
  ids.forEach((id, index) => queues[index % workers].push(id));
  return queues;
}

interface RunResult {
  code: number | null;
  output: string;
}

function runCase(args: string[]): Promise<RunResult> {
  return new Promise((resolvePromise) => {
    const child = spawn(VPX, args, { cwd: REPO_ROOT, env: process.env });
    let output = "";
    let settled = false;
    const finish = (result: RunResult): void => {
      if (settled) return;
      settled = true;
      resolvePromise(result);
    };
    child.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output += chunk.toString();
    });
    child.on("error", (error) =>
      finish({ code: -1, output: `${output}\nspawn error: ${error.message}` }),
    );
    child.on("close", (code) => finish({ code, output }));
  });
}

function caseArgs(
  worker: number,
  caseId: string,
  mode: Mode,
  probe: number | undefined,
  timeout: number | undefined,
): string[] {
  const args = [
    "playground/scripts/run-case.ts",
    "--worker",
    String(worker),
    "--case",
    caseId,
    "--mode",
    mode,
  ];
  if (probe !== undefined) args.push("--probe", String(probe));
  else if (timeout !== undefined) args.push("--timeout", String(timeout));
  return args;
}

type Outcome = "passed" | "failed" | "error";

interface CaseResult {
  worker: number;
  caseId: string;
  outcome: Outcome;
  code: number | null;
}

function acquireLock(lockFile: string): void {
  if (existsSync(lockFile)) {
    const held = Number(readFileSync(lockFile, "utf8").trim());
    let alive = false;
    if (Number.isInteger(held) && held > 0) {
      try {
        process.kill(held, 0);
        alive = true;
      } catch {
        alive = false;
      }
    }
    if (alive)
      throw new Error(
        `another run-batch is already running (pid ${held}). A long batch moved to the background may still hold the lock; wait or stop it first.`,
      );
    rmSync(lockFile, { force: true });
  }
  writeFileSync(lockFile, `${process.pid}\n`);
}

/** Exit code 2 means run-case classified it as infrastructure; everything else nonzero is a FAIL. */
function outcomeFor(code: number | null): Outcome {
  if (code === 0) return "passed";
  if (code === 2) return "error";
  return "failed";
}

/** Pull the verdict's failure list out of run-case's final JSON line so status shows a reason. */
function summarizeFailure(output: string): string {
  const lines = output.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line.startsWith("{") || !line.endsWith("}")) continue;
    try {
      const parsed = JSON.parse(line) as { failures?: unknown };
      if (Array.isArray(parsed.failures) && parsed.failures.length > 0)
        return parsed.failures.join("; ");
    } catch {
      // not the verdict line
    }
  }
  return "";
}

async function main(): Promise<void> {
  const mode = argValue("--mode") as Mode | undefined;
  if (mode !== "raw" && mode !== "adapted")
    throw new Error(
      "usage: run-batch.ts --mode raw|adapted [--workers N] [--cases a,b,c | --all] [--probe <seconds>] [--timeout <seconds>]",
    );
  const workersFlag = argValue("--workers");
  const explicitWorkers = workersFlag !== undefined ? Number(workersFlag) : undefined;
  if (explicitWorkers !== undefined && (!Number.isInteger(explicitWorkers) || explicitWorkers < 1))
    throw new Error("--workers must be a positive integer");
  const capacity = computeWorkers(explicitWorkers);
  const workersArg = capacity.workers;
  if (explicitWorkers === undefined)
    console.log(
      `[run-batch] 检测到 ${capacity.cores} 核 / ${capacity.availableGB.toFixed(1)} G 可用，采用 ${workersArg} 个 worker`,
    );
  else console.log(`[run-batch] --workers override：采用 ${workersArg} 个 worker`);

  const probeArg = argValue("--probe");
  const probe = probeArg !== undefined ? Number(probeArg) : undefined;
  if (probe !== undefined && (!Number.isFinite(probe) || probe <= 0))
    throw new Error("--probe must be a positive number of seconds");
  const timeoutArg = argValue("--timeout");
  const timeout = timeoutArg !== undefined ? Number(timeoutArg) : undefined;
  if (timeout !== undefined && (!Number.isFinite(timeout) || timeout <= 0))
    throw new Error("--timeout must be a positive number of seconds");

  const caseIds = selectCases();
  if (caseIds.length === 0) throw new Error("no cases selected; pass --cases a,b,c or --all");

  const queues = distribute(caseIds, workersArg);
  mkdirSync(WORKERS_DIR, { recursive: true });
  const logFile = join(WORKERS_DIR, "run-batch.log");
  const lockFile = join(WORKERS_DIR, "run-batch.lock");
  const progressFile = progressFilePath();

  acquireLock(lockFile);
  try {
    const now = new Date().toISOString();
    const perWorker: Record<string, { done: number; total: number }> = {};
    queues.forEach((queue, worker) => {
      perWorker[`w${worker}`] = { done: 0, total: queue.length };
    });
    writeProgress(progressFile, {
      total: caseIds.length,
      done: 0,
      passed: 0,
      failed: 0,
      error: 0,
      running: [],
      startedAt: now,
      updatedAt: now,
      perWorker,
      failures: [],
      workers: capacity.workers,
      cores: capacity.cores,
      availableGB: capacity.availableGB,
    });

    await runQueues(queues, mode, probe, timeout, workersArg, caseIds, logFile, progressFile);
  } finally {
    rmSync(lockFile, { force: true });
  }
}

async function runQueues(
  queues: string[][],
  mode: Mode,
  probe: number | undefined,
  timeout: number | undefined,
  workersArg: number,
  caseIds: string[],
  logFile: string,
  progressFile: string,
): Promise<void> {
  writeFileSync(
    logFile,
    `run-batch ${new Date().toISOString()} mode=${mode} workers=${workersArg} probe=${probe ?? "-"} timeout=${timeout ?? "-"}\n`,
  );
  console.log(
    `[run-batch] mode=${mode} workers=${workersArg} probe=${probe ?? "per-case"} cases=${caseIds.length}`,
  );

  const results: CaseResult[] = [];
  await Promise.all(
    queues.map(async (queue, worker) => {
      for (const caseId of queue) {
        updateProgress(progressFile, (state) => {
          state.running.push({ worker, case: caseId });
        });
        const { code, output } = await runCase(caseArgs(worker, caseId, mode, probe, timeout));
        const outcome = outcomeFor(code);
        const reason =
          outcome === "error"
            ? "infra"
            : outcome === "failed"
              ? summarizeFailure(output) || `exit ${code ?? "?"}`
              : "";
        appendFileSync(
          logFile,
          `\n===== worker ${worker} ${caseId} [${mode}] exit=${code ?? "?"} =====\n${output}\n`,
        );
        updateProgress(progressFile, (state) => {
          state.running = state.running.filter(
            (entry) => !(entry.worker === worker && entry.case === caseId),
          );
          state.done += 1;
          if (outcome === "passed") state.passed += 1;
          else if (outcome === "error") state.error += 1;
          else state.failed += 1;
          const workerProgress = state.perWorker[`w${worker}`];
          if (workerProgress) workerProgress.done += 1;
          if (outcome !== "passed") state.failures.push({ case: caseId, worker, reason });
        });
        results.push({ worker, caseId, outcome, code });
        const label = outcome === "passed" ? "PASS" : outcome === "error" ? "ERROR" : "FAIL";
        console.log(`[run-batch] worker ${worker} ${caseId} ${label} (exit ${code ?? "?"})`);
      }
    }),
  );

  const passed = results.filter((result) => result.outcome === "passed").length;
  const failed = results.filter((result) => result.outcome === "failed").length;
  const error = results.filter((result) => result.outcome === "error").length;
  console.log(
    `[run-batch] total=${results.length} passed=${passed} failed=${failed} error=${error}`,
  );
  console.log(`[run-batch] log=${logFile}`);
  if (failed > 0 || error > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(`[run-batch] ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
