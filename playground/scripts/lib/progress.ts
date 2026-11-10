// One progress file per batch, rewritten whole on every change so a human (or
// status.ts) can watch done/total, running, and failures mid-run. run-batch owns the
// only writer: its worker queues run in one Node process, and every update below is a
// synchronous read-mutate-write, so concurrent queues cannot interleave a write.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { WORKERS_DIR } from "./worker";

export interface ProgressRunning {
  worker: number;
  case: string;
}

export interface ProgressFailure {
  case: string;
  worker: number;
  reason: string;
}

export interface ProgressState {
  total: number;
  done: number;
  passed: number;
  failed: number;
  error: number;
  running: ProgressRunning[];
  startedAt: string;
  updatedAt: string;
  /** worker key ("w0", "w1", ...) -> its own done/total. */
  perWorker: Record<string, { done: number; total: number }>;
  failures: ProgressFailure[];
  workers: number;
  cores: number;
  availableGB: number;
}

export function progressFilePath(): string {
  return join(WORKERS_DIR, "progress.json");
}

export function readProgress(file: string): ProgressState | null {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8")) as ProgressState;
}

/** Write the whole file atomically: a sibling `.tmp` first, then a rename into place. */
export function writeProgress(file: string, state: ProgressState): void {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`);
  renameSync(tmp, file);
}

/** Read, mutate, stamp updatedAt, and atomically replace. The mutate callback edits in place. */
export function updateProgress(
  file: string,
  mutate: (state: ProgressState) => void,
): ProgressState {
  const state = readProgress(file);
  if (!state) throw new Error(`no progress file at ${file}; run playground:run-batch first`);
  mutate(state);
  state.updatedAt = new Date().toISOString();
  writeProgress(file, state);
  return state;
}
