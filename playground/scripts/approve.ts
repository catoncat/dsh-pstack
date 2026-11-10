// Approve one or more skills against their current upstream SKILL.md. An approval pins
// the exact content hash it accepted plus the run-batch round, so check.ts can flag any
// later drift between disk, the lock, and the approved hash.
//
//   vpx playground/scripts/approve.ts --skill tdd,unslop --round 1

import {
  caseSkills,
  readLock,
  sha256File,
  upstreamSkillFile,
  upstreamSkillNames,
  writeLock,
} from "./lib/lockfile";

interface ApprovalArgs {
  skills: string[];
  round: number;
}

function parseArgs(argv: string[]): ApprovalArgs {
  let skillArg: string | undefined;
  let roundArg: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--skill") skillArg = argv[++index];
    else if (arg === "--round") roundArg = argv[++index];
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (skillArg === undefined) throw new Error("--skill is required (comma-separated skill names)");
  const skills = skillArg
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name !== "");
  if (skills.length === 0) throw new Error("--skill lists no skill names");
  if (roundArg === undefined) throw new Error("--round is required");
  const round = Number(roundArg);
  if (!Number.isInteger(round) || round < 1)
    throw new Error(`--round must be a positive integer, got ${roundArg}`);
  return { skills, round };
}

function main(): void {
  const { skills, round } = parseArgs(process.argv.slice(2));
  const lock = readLock();
  if (lock === null) throw new Error("no playground/cases.lock.json; run playground:lock first");

  const upstream = new Set(upstreamSkillNames());
  const cases = new Set(caseSkills());

  const problems: string[] = [];
  for (const name of skills) {
    if (!upstream.has(name)) problems.push(`${name}: 上游技能不存在`);
    else if (lock.skills[name] === undefined)
      problems.push(`${name}: lock 中无此技能，请先运行 playground:lock`);
    else if (!cases.has(name)) problems.push(`${name}: 用例不存在`);
  }
  if (problems.length > 0) throw new Error(`cannot approve:\n  ${problems.join("\n  ")}`);

  const approvedAt = new Date().toISOString();
  for (const name of skills) {
    const hash = sha256File(upstreamSkillFile(name));
    const entry = lock.skills[name];
    entry.status = "audited";
    entry.approvedAt = approvedAt;
    entry.approvedRound = round;
    entry.approvedHash = hash;
    entry.approvedCompatibilityKey = lock.baseline.compatibilityKey;
    entry.skillHash = hash;
    console.log(`[approve] ${name}: audited (round ${round}, ${hash})`);
  }
  writeLock(lock);
  console.log(`[approve] wrote ${skills.length} approval(s) to cases.lock.json`);
}

main();
