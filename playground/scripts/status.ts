// Print a human-readable summary of the current batch's progress.json (done/total,
// running, failures, per-worker). Run it in a second terminal while run-batch runs.

import { readProgress, progressFilePath } from "./lib/progress";

function main(): void {
  const file = progressFilePath();
  const state = readProgress(file);
  if (!state) {
    console.log(`[status] no progress file at ${file}`);
    console.log("[status] run playground:prepare then playground:run-batch first");
    return;
  }

  console.log(
    `[status] ${state.done}/${state.total} done (passed ${state.passed}, failed ${state.failed}, error ${state.error})`,
  );
  console.log(`[status] started ${state.startedAt}  updated ${state.updatedAt}`);
  console.log(
    `[status] capacity: workers=${state.workers} cores=${state.cores} availableGB=${state.availableGB.toFixed(1)}`,
  );

  if (state.running.length === 0) console.log("[status] running: none");
  else
    console.log(
      `[status] running: ${state.running.map((entry) => `w${entry.worker}:${entry.case}`).join(", ")}`,
    );

  const workers = Object.keys(state.perWorker).sort();
  if (workers.length === 0) console.log("[status] perWorker: none");
  else {
    console.log("[status] perWorker:");
    for (const worker of workers) {
      const entry = state.perWorker[worker];
      console.log(`  ${worker}  ${entry.done}/${entry.total}`);
    }
  }

  if (state.failures.length === 0) console.log("[status] failures: none");
  else {
    console.log(`[status] failures (${state.failures.length}):`);
    for (const failure of state.failures)
      console.log(`  - ${failure.case} (w${failure.worker}): ${failure.reason}`);
  }
}

main();
