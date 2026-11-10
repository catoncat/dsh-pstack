// Run a set of skill cases across N workers in parallel: round-robin the cases into
// per-worker queues, then run each worker's queue serially by spawning one run-case
// child process per case. Parallelism comes from the child processes, because the
// agent-browser daemon cannot be driven concurrently inside one process.

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
import { REPO_ROOT } from "./lib/env";
import { WORKERS_DIR, workerCount } from "./lib/worker";

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

interface CaseResult {
  worker: number;
  caseId: string;
  passed: boolean;
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

async function main(): Promise<void> {
  const mode = argValue("--mode") as Mode | undefined;
  if (mode !== "raw" && mode !== "adapted")
    throw new Error(
      "usage: run-batch.ts --mode raw|adapted [--workers N] [--cases a,b,c | --all] [--probe <seconds>] [--timeout <seconds>]",
    );
  const workersArg = Number(argValue("--workers") ?? String(workerCount() || 4));
  if (!Number.isInteger(workersArg) || workersArg < 1)
    throw new Error("--workers must be a positive integer");

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
  acquireLock(lockFile);
  try {
    await runQueues(queues, mode, probe, timeout, workersArg, caseIds, logFile);
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
        const { code, output } = await runCase(caseArgs(worker, caseId, mode, probe, timeout));
        const passed = code === 0;
        appendFileSync(
          logFile,
          `\n===== worker ${worker} ${caseId} [${mode}] exit=${code ?? "?"} =====\n${output}\n`,
        );
        results.push({ worker, caseId, passed, code });
        console.log(
          `[run-batch] worker ${worker} ${caseId} ${passed ? "PASS" : "FAIL"} (exit ${code ?? "?"})`,
        );
      }
    }),
  );

  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;
  console.log(`[run-batch] total=${results.length} passed=${passed} failed=${failed}`);
  console.log(`[run-batch] log=${logFile}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(`[run-batch] ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
