// Discover and load SkillCase fixtures. Cases live one file per skill under
// playground/cases/; the smoke fixture lives beside the scripts.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { SkillCase } from "../../types";
import { CASES_DIR, SCRIPTS_DIR } from "./env";

export const SMOKE_CASE_FILE = join(SCRIPTS_DIR, "smoke.case.ts");

export function listCaseIds(): string[] {
  if (!existsSync(CASES_DIR)) return [];
  const ids: string[] = [];
  for (const name of readdirSync(CASES_DIR)) {
    if (!name.endsWith(".ts") || name === "index.ts") continue;
    const file = join(CASES_DIR, name);
    const match = readFileSync(file, "utf8").match(/\bid:\s*["']([^"']+)["']/);
    ids.push(match ? match[1] : basename(name, ".ts"));
  }
  return ids;
}

function pickSkillCase(module: Record<string, unknown>, source: string): SkillCase {
  const candidate = module.skillCase ?? module.default ?? module.case;
  if (!candidate || typeof candidate !== "object")
    throw new Error(`${source} does not export a SkillCase`);
  return candidate as SkillCase;
}

export async function loadCase(caseId: string): Promise<SkillCase> {
  const file = join(CASES_DIR, `${caseId}.ts`);
  if (!existsSync(file)) throw new Error(`no case file for "${caseId}" at ${file}`);
  const module = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
  return pickSkillCase(module, file);
}

export async function loadCaseFile(file: string): Promise<SkillCase> {
  const absolute = resolve(file.startsWith("~") ? join(homedir(), file.slice(1)) : file);
  if (!existsSync(absolute)) throw new Error(`case file not found: ${absolute}`);
  const module = (await import(pathToFileURL(absolute).href)) as Record<string, unknown>;
  return pickSkillCase(module, absolute);
}

export async function loadSmokeCase(): Promise<SkillCase> {
  return loadCaseFile(SMOKE_CASE_FILE);
}
