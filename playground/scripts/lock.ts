// Regenerate playground/cases.lock.json from the upstream skill tree and the cases
// directory. Existing statuses are preserved; a skill seen for the first time defaults
// to pending (or excluded when it appears in the exclusion table). Safe to rerun.

import { buildLock, readLock, writeLock, LOCK_FILE, type LockFile } from "./lib/lockfile";
import { progressFilePath, readProgress } from "./lib/progress";
import { WORKERS_DIR } from "./lib/worker";
import { join } from "node:path";

function countByStatus(lock: LockFile): Record<string, number> {
  const counts: Record<string, number> = { audited: 0, excluded: 0, pending: 0 };
  for (const entry of Object.values(lock.skills)) counts[entry.status] += 1;
  return counts;
}

function cursorOnlySkills(lock: LockFile): string[] {
  return Object.entries(lock.skills)
    .filter(([, entry]) => entry.cursorOnly)
    .map(([name]) => name)
    .sort();
}

function main(): void {
  const lock = buildLock(readLock());
  const progress = readProgress(progressFilePath() ?? join(WORKERS_DIR, "progress.json"));
  lock.round = progress?.round ?? lock.round ?? 0;
  lock.status = lock.status ?? "pending-approval";
  writeLock(lock);
  const counts = countByStatus(lock);
  const total = Object.keys(lock.skills).length;
  console.log(`[lock] wrote ${LOCK_FILE}`);
  console.log(
    `[lock] ${total} skills: ${counts.audited} audited, ${counts.excluded} excluded, ${counts.pending} pending`,
  );
  console.log(
    `[lock] baseline dsh ${lock.baseline.dshVersion}, pstack ${lock.baseline.pstackCommit}`,
  );
  console.log(`[lock] compatibilityKey ${lock.baseline.compatibilityKey}`);
  const cursorOnly = cursorOnlySkills(lock);
  console.log(
    `[lock] cursorOnly ${cursorOnly.length}: ${cursorOnly.length === 0 ? "none" : cursorOnly.join(", ")}`,
  );
  for (const exclusion of lock.exclusions)
    console.log(`[lock] excluded ${exclusion.skill}: ${exclusion.reason}`);
}

main();
