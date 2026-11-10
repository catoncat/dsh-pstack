// Per-worker runtime layout. Each worker owns its own DSH home, browser profile,
// workspace root, evidence dir, and web lifecycle files, so parallel workers never
// share a writable path.

import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

import { PLAYGROUND_DIR } from "./env";

// A probe run may point PLAYGROUND_WORKERS_DIR at a sibling dir so the cross-probe
// evidence never overwrites the primary probe's sessions and report. Resolve it
// absolute: workspace rows the web reads must be absolute paths or the app shows an
// empty "pick a workspace" state.
const OVERRIDE = process.env.PLAYGROUND_WORKERS_DIR;
export const WORKERS_DIR = OVERRIDE
  ? resolve(PLAYGROUND_DIR, OVERRIDE)
  : join(PLAYGROUND_DIR, ".workers");

export interface WorkerPaths {
  index: number;
  root: string;
  home: string;
  browserDir: string;
  workspaceRoot: string;
  evidenceDir: string;
  urlFile: string;
  pidFile: string;
  logFile: string;
}

export function workerPaths(index: number): WorkerPaths {
  const root = join(WORKERS_DIR, `w${index}`);
  return {
    index,
    root,
    home: join(root, "home"),
    browserDir: join(root, "browser"),
    workspaceRoot: join(root, "workspace"),
    evidenceDir: join(root, "evidence"),
    urlFile: join(root, "web-url.txt"),
    pidFile: join(root, "web.pid"),
    logFile: join(root, "web.log"),
  };
}

function isWorkerDirName(name: string): boolean {
  return /^w\d+$/.test(name);
}

function indexesOnDisk(): number[] {
  if (!existsSync(WORKERS_DIR)) return [];
  return readdirSync(WORKERS_DIR)
    .filter((name) => isWorkerDirName(name) && statSync(join(WORKERS_DIR, name)).isDirectory())
    .map((name) => Number(name.slice(1)))
    .sort((a, b) => a - b);
}

/** Workers that were prepared and started: those with a pid or url file on disk. */
export function listWorkers(): WorkerPaths[] {
  return indexesOnDisk()
    .map(workerPaths)
    .filter((paths) => existsSync(paths.pidFile) || existsSync(paths.urlFile));
}

/** How many worker directories exist on disk, started or not. */
export function workerCount(): number {
  return indexesOnDisk().length;
}
