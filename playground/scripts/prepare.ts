// Prepare N playground workers end to end. Every worker gets its own clean DSH home,
// mode-specific profile, model routes, credentials, pre-registered case workspaces,
// and a detached web instance on an OS-assigned port. Workers run in parallel; within
// a worker the run queue stays serial.

import { cpSync, mkdirSync, rmSync } from "node:fs";

import {
  buildProfile,
  copyCredentials,
  installPlugins,
  loadProviderPlan,
  profileDirFor,
  registerWorkspaces,
  resetHome,
  startWeb,
  stopWeb,
  writeHomePatch,
  type ProviderPlan,
} from "./lib/env";
import type { Mode } from "../types";
import { listCaseIds } from "./lib/cases";
import { computeWorkers } from "./lib/capacity";
import { listWorkers, workerCount, workerPaths, WORKERS_DIR } from "./lib/worker";

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

interface Started {
  index: number;
  url: string;
  port: number;
}

const asyncSleep = (ms: number): Promise<void> =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

/**
 * The web prints its URL just before the listener finishes binding, and the token URL
 * answers 3xx/401 to a plain probe (the token is redeemed by the browser, not a bare
 * GET). Any HTTP response at all proves the port is bound and serving, so accept it.
 */
async function waitReachable(url: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url, { signal: AbortSignal.timeout(3000), redirect: "manual" });
      return true;
    } catch {
      // not bound yet
    }
    await asyncSleep(500);
  }
  return false;
}

/** Hard-fail unless every worker took a distinct port and answers HTTP on it. */
async function assertWorkersHealthy(started: Started[]): Promise<void> {
  const ports = started.map((entry) => entry.port);
  const unique = new Set(ports);
  if (unique.size !== ports.length)
    throw new Error(`workers bound duplicate ports: ${ports.join(", ")}`);
  for (const entry of started) {
    if (!(await waitReachable(entry.url, 30_000)))
      throw new Error(`worker ${entry.index} is not reachable at ${entry.url} after 30s`);
  }
}

/** Restart web only for workers 0..count-1, retaining each worker's profile, home, workspaces, and evidence. */
async function runReuse(plan: ProviderPlan, count: number): Promise<void> {
  const workers = Array.from({ length: count }, (_, index) => workerPaths(index));
  for (const paths of workers) {
    const { stopped } = stopWeb(paths);
    if (stopped) console.log(`[prepare] reuse: stopped worker ${paths.index}`);
  }
  const started: Started[] = await Promise.all(
    workers.map(async (paths) => {
      const { url, port } = await startWeb(paths, plan);
      return { index: paths.index, url, port };
    }),
  );
  for (const entry of started)
    console.log(`[prepare] worker ${entry.index} url=${entry.url} port=${entry.port}`);
  await assertWorkersHealthy(started);
  console.log(
    `[prepare] reuse: restarted ${count} worker(s); profile, home, workspaces and evidence retained`,
  );
}

async function main(): Promise<void> {
  const mode = argValue("--mode") as Mode | undefined;
  if (mode !== "raw" && mode !== "adapted") {
    throw new Error(
      "usage: prepare.ts --mode raw|adapted [--reset | --reuse] [--workers N] [--main <model-substring>]",
    );
  }
  const mainFilter = argValue("--main");
  const reset = process.argv.includes("--reset");
  const reuse = process.argv.includes("--reuse");
  if (reset && reuse) throw new Error("--reset 与 --reuse 互斥");
  const workersFlag = argValue("--workers");
  const explicitWorkers = workersFlag !== undefined ? Number(workersFlag) : undefined;
  if (explicitWorkers !== undefined && (!Number.isInteger(explicitWorkers) || explicitWorkers < 1))
    throw new Error("--workers must be a positive integer");

  if (reuse) {
    const plan = loadProviderPlan(mainFilter);
    const count = explicitWorkers ?? workerCount();
    if (count < 1) throw new Error("--reuse 需要已准备的 worker 目录，或显式 --workers N");
    await runReuse(plan, count);
    return;
  }

  const capacity = computeWorkers(explicitWorkers);
  const workersArg = capacity.workers;
  if (explicitWorkers === undefined)
    console.log(
      `[prepare] 检测到 ${capacity.cores} 核 / ${capacity.availableGB.toFixed(1)} G 可用，采用 ${workersArg} 个 worker`,
    );
  else console.log(`[prepare] --workers override：采用 ${workersArg} 个 worker`);

  if (reset) {
    for (const paths of listWorkers()) {
      const { stopped } = stopWeb(paths);
      if (stopped) console.log(`[prepare] reset: stopped worker ${paths.index}`);
    }
    rmSync(WORKERS_DIR, { recursive: true, force: true });
    console.log("[prepare] reset: cleared playground/.workers");
  }
  mkdirSync(WORKERS_DIR, { recursive: true });

  // Shrinking the fleet without --reset leaves the higher-numbered workers running and
  // still owning their homes; stop and delete them so the count matches --workers.
  if (!reset) {
    for (const paths of listWorkers()) {
      if (paths.index < workersArg) continue;
      const { stopped } = stopWeb(paths);
      rmSync(paths.root, { recursive: true, force: true });
      console.log(
        `[prepare] pruned worker ${paths.index}: stopped=${stopped} removed=${paths.root}`,
      );
    }
  }

  const plan = loadProviderPlan(mainFilter);
  const caseIds = listCaseIds();
  const workers = Array.from({ length: workersArg }, (_, index) => workerPaths(index));

  let installedProfile: string | null = null;
  for (const paths of workers) {
    if (reset) resetHome(paths);
    else mkdirSync(paths.home, { recursive: true });
    buildProfile(paths, mode);
    copyCredentials(paths);
    writeHomePatch(paths, plan);
    registerWorkspaces(paths, caseIds);

    if (mode !== "adapted") continue;
    if (paths.index === 0) {
      console.log("[prepare] installing dsh-pstack into worker 0 profile (dsh plugin install)");
      installPlugins(paths);
      installedProfile = profileDirFor(paths);
    } else if (installedProfile !== null) {
      try {
        cpSync(installedProfile, profileDirFor(paths), { recursive: true, force: true });
        console.log(`[prepare] worker ${paths.index}: cloned installed profile from worker 0`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `[prepare] worker ${paths.index}: profile clone failed (${message}); installing independently`,
        );
        installPlugins(paths);
      }
    }
  }

  const started: Started[] = await Promise.all(
    workers.map(async (paths) => {
      const { url, port } = await startWeb(paths, plan);
      return { index: paths.index, url, port };
    }),
  );
  for (const entry of started)
    console.log(`[prepare] worker ${entry.index} url=${entry.url} port=${entry.port}`);
  await assertWorkersHealthy(started);

  console.log(
    `[prepare] mode=${mode} workers=${workersArg} main=${plan.main.provider}/${plan.main.model}[${plan.main.effort}] (${plan.main.name})`,
  );
  console.log(
    `[prepare] capacity workers=${workersArg} cores=${capacity.cores} availableGB=${capacity.availableGB.toFixed(1)} (${capacity.reason})`,
  );
  console.log(
    `[prepare] allowed routes: ${plan.routes.map((route) => `${route.provider}/${route.model}[${route.efforts.join(",")}]`).join(", ")}`,
  );
  console.log(`[prepare] workspaces=${caseIds.length} per worker (registered in each worker home)`);
  console.log(`[prepare] apiKeyEnv=${plan.apiKeyEnv}`);
}

main().catch((error: unknown) => {
  console.error(`[prepare] ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
