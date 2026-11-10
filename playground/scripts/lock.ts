// Regenerate playground/cases.lock.json from the upstream skill tree and the cases
// directory. Existing statuses are preserved; a skill seen for the first time defaults
// to pending (or excluded when it appears in the exclusion table). Safe to rerun.

import { buildLock, readLock, writeLock, LOCK_FILE, type LockFile } from "./lib/lockfile";

function countByStatus(lock: LockFile): Record<string, number> {
  const counts: Record<string, number> = { audited: 0, excluded: 0, pending: 0 };
  for (const entry of Object.values(lock.skills)) counts[entry.status] += 1;
  return counts;
}

function main(): void {
  const lock = buildLock(readLock());
  writeLock(lock);
  const counts = countByStatus(lock);
  const total = Object.keys(lock.skills).length;
  console.log(`[lock] wrote ${LOCK_FILE}`);
  console.log(
    `[lock] ${total} skills: ${counts.audited} audited, ${counts.excluded} excluded, ${counts.pending} pending`,
  );
  console.log(`[lock] upstream ${lock.upstream.repo}@${lock.upstream.commit}`);
  for (const exclusion of lock.exclusions)
    console.log(`[lock] excluded ${exclusion.skill}: ${exclusion.reason}`);
}

main();
