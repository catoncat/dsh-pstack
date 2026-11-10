// Prepare one playground environment end to end: a clean DSH home, the mode-specific
// profile, model routes, credentials, pre-registered case workspaces, and a detached
// web instance on the fixed port. Everything a case run needs is ready afterwards.

import { mkdirSync } from "node:fs";

import {
  buildProfile,
  copyCredentials,
  DSH_HOME,
  installPlugins,
  loadProviderPlan,
  registerWorkspaces,
  resetHome,
  startWeb,
  stopWeb,
  writeHomePatch,
} from "./lib/env";
import type { Mode } from "../types";
import { listCaseIds } from "./lib/cases";

function argValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const mode = argValue("--mode") as Mode | undefined;
  if (mode !== "raw" && mode !== "adapted") {
    throw new Error("usage: prepare.ts --mode raw|adapted [--reset] [--main <model-substring>]");
  }
  const mainFilter = argValue("--main");
  const reset = process.argv.includes("--reset");

  if (reset) {
    stopWeb();
    resetHome();
    console.log("[prepare] reset: cleared playground/.dsh");
  } else {
    mkdirSync(DSH_HOME, { recursive: true });
  }

  const plan = loadProviderPlan(mainFilter);
  buildProfile(mode);
  copyCredentials();
  writeHomePatch(plan);
  if (mode === "adapted") {
    console.log("[prepare] installing dsh-pstack into the profile (dsh plugin install)");
    installPlugins();
  }

  const caseIds = listCaseIds();
  const workspace = registerWorkspaces(caseIds);

  const url = await startWeb(plan);
  console.log(
    `[prepare] mode=${mode} main=${plan.main.provider}/${plan.main.model}[${plan.main.effort}] (${plan.main.name})`,
  );
  console.log(
    `[prepare] allowed routes: ${plan.routes.map((route) => `${route.provider}/${route.model}[${route.efforts.join(",")}]`).join(", ")}`,
  );
  console.log(
    `[prepare] workspaces=${workspace.dirs ? Object.keys(workspace.dirs).length : caseIds.length} default=${workspace.defaultTitle}`,
  );
  console.log(`[prepare] apiKeyEnv=${plan.apiKeyEnv}`);
  console.log(`[prepare] web=${url}`);
}

main().catch((error: unknown) => {
  console.error(`[prepare] ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
