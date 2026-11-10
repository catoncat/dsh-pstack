// Environment building blocks shared by every playground script: repo paths, the
// provider plan read from the host profile plus config.json, the generated DSH home,
// workspace pre-registration, and the detached web lifecycle. Every runtime-state
// function takes one worker's paths so independent workers never share a home,
// browser profile, workspace root, or evidence dir.

import { spawn, spawnSync } from "node:child_process";
import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dump as yamlDump, load as yamlLoad } from "js-yaml";

import type { AllowedRoute, Mode, PlaygroundConfig } from "../../types";
import type { WorkerPaths } from "./worker";

const HERE = dirname(fileURLToPath(import.meta.url));

export const PLAYGROUND_DIR = resolve(HERE, "../..");
export const REPO_ROOT = resolve(PLAYGROUND_DIR, "..");
export const SCRIPTS_DIR = join(PLAYGROUND_DIR, "scripts");
export const CASES_DIR = join(PLAYGROUND_DIR, "cases");
export const PROFILE_TEMPLATE_DIR = join(PLAYGROUND_DIR, "profile");

export const CONFIG_FILE = join(PLAYGROUND_DIR, "config.json");
export const PROFILE_NAME = "playground";
export const CREDENTIALS_SOURCE = join(homedir(), ".dsh", ".credentials.yaml");

export const REPORT_DIR = join(PLAYGROUND_DIR, "reports");

export const HOST_PATCH_FILE = join(homedir(), ".dsh", "profiles", "web", "cordis.patch.yml");
export const RAW_SKILLS_DIR = join(REPO_ROOT, "upstream", "cursor-plugins", "pstack", "skills");

export const HOST = "127.0.0.1";

const DSH_BIN = process.env.DSH_BIN ?? (process.platform === "win32" ? "dsh.cmd" : "dsh");

/** The DSH home-level files that live inside one worker's home directory. */
function homePatchFile(paths: WorkerPaths): string {
  return join(paths.home, "cordis.patch.yml");
}
function profileDir(paths: WorkerPaths): string {
  return join(paths.home, "profiles", PROFILE_NAME);
}
function workspaceStoreFile(paths: WorkerPaths): string {
  return join(paths.home, "storages", "workspace.json");
}

export function readConfig(): PlaygroundConfig {
  if (!existsSync(CONFIG_FILE)) {
    throw new Error(
      `missing ${CONFIG_FILE}; copy the contents of playground/config.example.json into it and fill the real provider and apiKey`,
    );
  }
  const parsed = JSON.parse(readFileSync(CONFIG_FILE, "utf8")) as PlaygroundConfig;
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    Object.keys(parsed.providers ?? {}).length === 0
  ) {
    throw new Error(`${CONFIG_FILE} must declare at least one provider with an apiKey and models`);
  }
  return parsed;
}

interface HostModel {
  id: string;
  name?: string;
  reasoningEfforts?: Record<string, string | null>;
  [key: string]: unknown;
}

interface HostProvider {
  apiKeyEnv?: string;
  models?: HostModel[];
  [key: string]: unknown;
}

export interface ProviderPlan {
  /** Every configured (provider, model, effort) that the host profile also serves. */
  routes: AllowedRoute[];
  /** Provider configs filtered down to config.json's allowed models, ready for the llm-pi-ai patch. */
  providers: Record<string, HostProvider>;
  apiKeyEnv: string;
  apiKey: string;
  main: { provider: string; model: string; effort: string; name: string };
}

function readHostProviders(): Record<string, HostProvider> {
  if (!existsSync(HOST_PATCH_FILE)) {
    throw new Error(
      `host web profile patch not found at ${HOST_PATCH_FILE}; the playground reads its llm-pi-ai provider from there`,
    );
  }
  const entries = yamlLoad(readFileSync(HOST_PATCH_FILE, "utf8")) as Array<{
    id?: string;
    config?: { providers?: Record<string, HostProvider> };
  }>;
  const llm = entries.find((entry) => entry.id === "llm-pi-ai");
  const providers = llm?.config?.providers;
  if (!providers || Object.keys(providers).length === 0) {
    throw new Error(`no llm-pi-ai providers in ${HOST_PATCH_FILE}`);
  }
  return providers;
}

/**
 * Merge config.json (which provider keys and models the operator allows) with the
 * host profile (how those providers are actually deployed) into one plan. Throws
 * when config.json asks for a route the host does not serve, so prepare fails loudly
 * instead of booting a web app that cannot answer.
 */
export function loadProviderPlan(mainFilter?: string): ProviderPlan {
  const config = readConfig();
  const hostProviders = readHostProviders();

  const routes: AllowedRoute[] = [];
  const providers: Record<string, HostProvider> = {};

  for (const [provider, entry] of Object.entries(config.providers)) {
    const host = hostProviders[provider];
    if (!host)
      throw new Error(
        `config.json allows provider "${provider}" but the host web profile has no such llm-pi-ai provider`,
      );
    if (!host.apiKeyEnv)
      throw new Error(
        `host provider "${provider}" has no apiKeyEnv; cannot inject the key into the web process`,
      );

    const requestedModels = Object.keys(entry.models ?? {});
    const hostById = new Map((host.models ?? []).map((model) => [model.id, model]));
    const filteredModels: HostModel[] = [];

    for (const modelId of requestedModels) {
      const hostModel = hostById.get(modelId);
      if (!hostModel)
        throw new Error(
          `config.json allows ${provider}/${modelId} but the host profile does not deploy it`,
        );
      const supported = hostModel.reasoningEfforts ?? {};
      const efforts = (entry.models[modelId] ?? []).filter((effort) => effort in supported);
      if (efforts.length === 0)
        throw new Error(`config.json allows no effort that ${provider}/${modelId} deploys`);
      routes.push({ provider, model: modelId, efforts, apiKey: entry.apiKey });
      filteredModels.push(hostModel);
    }

    providers[provider] = { ...host, models: filteredModels };
  }

  const lowRoutes = routes.filter((route) => route.efforts.includes("low"));
  const mainRoute =
    lowRoutes.find((route) => new RegExp(mainFilter ?? "minimax", "i").test(route.model)) ??
    (mainFilter === undefined ? lowRoutes[0] : undefined);
  if (!mainRoute)
    throw new Error(
      mainFilter
        ? `no allowed low route matches --main ${mainFilter}`
        : "no allowed route exposes a low reasoning effort; the default probe needs one",
    );
  const mainModel = (providers[mainRoute.provider].models ?? []).find(
    (model) => model.id === mainRoute.model,
  );
  const apiKey = mainRoute.apiKey;

  return {
    routes,
    providers,
    apiKeyEnv: providers[mainRoute.provider].apiKeyEnv as string,
    apiKey,
    main: {
      provider: mainRoute.provider,
      model: mainRoute.model,
      effort: "low",
      name: mainModel?.name ?? mainRoute.model,
    },
  };
}

/** Write the machine-local home patch: default probe route plus the filtered llm-pi-ai provider. */
export function writeHomePatch(paths: WorkerPaths, plan: ProviderPlan): void {
  mkdirSync(paths.home, { recursive: true });
  const patch = [
    {
      id: "agent-default-model",
      name: "@deepseek-ai/dsh-agent-default-model",
      config: {
        provider: plan.main.provider,
        model: plan.main.model,
        reasoningEffort: plan.main.effort,
      },
    },
    {
      id: "llm-pi-ai",
      name: "@deepseek-ai/dsh-llm-pi-ai",
      config: { providers: plan.providers },
    },
    {
      // Unattended cases have no answerer behind the approval seam; a pending
      // request would hang the turn forever. "never" rejects gated actions
      // deterministically so the model sees the rejection and moves on.
      id: "approval",
      name: "@deepseek-ai/dsh-user-approval",
      config: { policy: "never" },
    },
    {
      // The permission preset table composes a sandbox mode with an approval policy and
      // refuses to start when the effective pair matches no declared preset. The base
      // bundle only pairs "never" with danger-full-access, so declare the pair this
      // playground actually runs (confined sandbox + no approvals) and make it default.
      id: "permission",
      name: "@deepseek-ai/dsh-permission-presets",
      config: {
        presets: { unattended: { sandbox: "workspace-write", approval: "never" } },
        defaultPreset: "unattended",
      },
    },
  ];
  writeFileSync(homePatchFile(paths), yamlDump(patch, { lineWidth: 120 }));
}

export interface HomePlan {
  provider: string;
  model: string;
  effort: string;
  name: string;
}

/** Read back what prepare actually applied, so bootstrap/run-case verify the real config not a recomputation. */
export function readHomePlan(paths: WorkerPaths): HomePlan {
  const file = homePatchFile(paths);
  if (!existsSync(file)) throw new Error(`missing ${file}; run playground:prepare first`);
  const entries = yamlLoad(readFileSync(file, "utf8")) as Array<{
    id?: string;
    config?: Record<string, unknown>;
  }>;
  const defaultModel = entries.find((entry) => entry.id === "agent-default-model")?.config as
    | { provider?: string; model?: string; reasoningEffort?: string }
    | undefined;
  if (!defaultModel?.provider || !defaultModel.model)
    throw new Error(`home patch has no agent-default-model route`);
  const providers = entries.find((entry) => entry.id === "llm-pi-ai")?.config?.providers as
    | Record<string, HostProvider>
    | undefined;
  const model = providers?.[defaultModel.provider]?.models?.find(
    (entry) => entry.id === defaultModel.model,
  );
  return {
    provider: defaultModel.provider,
    model: defaultModel.model,
    effort: defaultModel.reasoningEffort ?? "low",
    name: model?.name ?? defaultModel.model,
  };
}

export function copyCredentials(paths: WorkerPaths): void {
  mkdirSync(paths.home, { recursive: true });
  if (existsSync(CREDENTIALS_SOURCE)) {
    copyFileSync(CREDENTIALS_SOURCE, join(paths.home, ".credentials.yaml"));
    return;
  }
  console.warn(
    `[prepare] no ${CREDENTIALS_SOURCE}; skipping credentials copy (fine if no model login is needed)`,
  );
}

export function resetHome(paths: WorkerPaths): void {
  rmSync(paths.home, { recursive: true, force: true });
  mkdirSync(paths.home, { recursive: true });
}

function profileManifest(mode: Mode): Record<string, unknown> {
  const bundles = ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app"];
  if (mode === "adapted") bundles.push("dsh-pstack");
  return {
    name: `dsh-playground-${mode}`,
    private: true,
    dependencies: mode === "adapted" ? { "dsh-pstack": `link:${REPO_ROOT}` } : {},
    dsh: { profile: { bundles } },
  };
}

function rawSkillPatch(): { insert: unknown[] } {
  return {
    insert: [
      {
        id: "pstack-raw-skills",
        name: "@deepseek-ai/dsh-skill-filesystem",
        config: {
          providerName: "pstack-raw",
          includeDefaultRoots: false,
          watch: false,
          bundledSkillDir: RAW_SKILLS_DIR,
        },
      },
    ],
  };
}

/** Rebuild the runtime profile from the template: the mode picks the bundles and the raw skill mount. */
export function buildProfile(paths: WorkerPaths, mode: Mode): void {
  const dir = profileDir(paths);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  copyFileSync(join(PROFILE_TEMPLATE_DIR, "pnpm-workspace.yaml"), join(dir, "pnpm-workspace.yaml"));
  const templatePatch = join(PROFILE_TEMPLATE_DIR, "cordis.patch.yml");
  if (mode === "raw") {
    const entries = (yamlLoad(readFileSync(templatePatch, "utf8")) as unknown[]) ?? [];
    entries.push(rawSkillPatch());
    writeFileSync(join(dir, "cordis.patch.yml"), yamlDump(entries, { lineWidth: 120 }));
  } else {
    copyFileSync(templatePatch, join(dir, "cordis.patch.yml"));
  }
  writeFileSync(join(dir, "package.json"), `${JSON.stringify(profileManifest(mode), null, 2)}\n`);
}

/** Path to one worker's installed profile dir, so adapted mode can clone it to the rest. */
export function profileDirFor(paths: WorkerPaths): string {
  return profileDir(paths);
}

export function installPlugins(paths: WorkerPaths): void {
  const result = spawnSync(DSH_BIN, ["plugin", "--profile", PROFILE_NAME, "install"], {
    cwd: REPO_ROOT,
    env: { ...process.env, DSH_HOME: paths.home },
    stdio: "inherit",
  });
  if (result.error)
    throw new Error(`failed to run dsh plugin install: ${result.error.message}; is dsh on PATH?`);
  if (result.status !== 0) throw new Error(`dsh plugin install exited ${result.status}`);
}

export interface WorkspaceRegistration {
  dirs: Record<string, string>;
  defaultId: string;
  defaultTitle: string;
}

export function registerWorkspaces(paths: WorkerPaths, caseIds: string[]): WorkspaceRegistration {
  const ids = [...new Set(caseIds)].sort();
  if (ids.length === 0) ids.push("playground");
  mkdirSync(paths.workspaceRoot, { recursive: true });
  const storeFile = workspaceStoreFile(paths);
  mkdirSync(dirname(storeFile), { recursive: true });

  const now = new Date().toISOString();
  const dirs: Record<string, string> = {};
  const tables: Record<string, unknown> = {};
  const workspaceIds: string[] = [];

  for (const caseId of ids) {
    const workspaceId = randomId();
    const path = join(paths.workspaceRoot, caseId);
    mkdirSync(path, { recursive: true });
    dirs[caseId] = path;
    workspaceIds.push(workspaceId);
    tables[workspaceId] = { path, title: caseId, sessionIds: [], createdAt: now, updatedAt: now };
  }

  const defaultId = workspaceIds[0];
  const store = {
    unit: { name: "workspace", version: 2 },
    global: {
      initialized: true,
      workspaceIds,
      archivedSessionIds: [],
      pinnedSessionIds: [],
      defaultWorkspaceId: defaultId,
    },
    tables: { workspaces: tables },
  };
  writeFileSync(storeFile, `${JSON.stringify(store, null, 2)}\n`);
  return { dirs, defaultId, defaultTitle: ids[0] };
}

export interface StoredWorkspace {
  path: string;
  title: string;
}

export function readWorkspaceStore(paths: WorkerPaths): {
  defaultTitle: string;
  workspaces: StoredWorkspace[];
} {
  const file = workspaceStoreFile(paths);
  if (!existsSync(file)) throw new Error(`missing ${file}; run playground:prepare first`);
  const store = JSON.parse(readFileSync(file, "utf8")) as {
    global: { workspaceIds: string[]; defaultWorkspaceId: string };
    tables: { workspaces: Record<string, StoredWorkspace> };
  };
  const workspaces = store.global.workspaceIds.map((id) => store.tables.workspaces[id]);
  const defaultWorkspace = store.tables.workspaces[store.global.defaultWorkspaceId];
  return { defaultTitle: defaultWorkspace.title, workspaces };
}

function randomId(): string {
  return crypto.randomUUID();
}

const syncSleep = (ms: number): void => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

const asyncSleep = (ms: number): Promise<void> =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

export interface StartedWeb {
  url: string;
  port: number;
}

/**
 * Spawn the web app detached with `--port 0` (the OS assigns a free port), then poll
 * its log for the tokenized URL line and persist the url/pid/log to the worker's own
 * files. The wait loop is async so prepare can start several workers concurrently.
 */
export async function startWeb(paths: WorkerPaths, plan: ProviderPlan): Promise<StartedWeb> {
  mkdirSync(paths.home, { recursive: true });
  const logFd = openSync(paths.logFile, "w");
  const args = ["--profile", PROFILE_NAME, "--port", "0", "--host", HOST, "--no-open"];
  const child = spawn(DSH_BIN, args, {
    cwd: REPO_ROOT,
    env: { ...process.env, DSH_HOME: paths.home, [plan.apiKeyEnv]: plan.apiKey },
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  closeSync(logFd);
  writeFileSync(paths.pidFile, `${child.pid ?? ""}\n`);
  child.unref();

  let exited: number | null = null;
  child.once("exit", (code) => {
    exited = code ?? -1;
  });

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const found = readWebUrlFromLog(paths.logFile);
    if (found) {
      const port = Number(new URL(found).port);
      writeFileSync(paths.urlFile, `${found}\n`);
      return { url: found, port };
    }
    if (exited !== null)
      throw new Error(
        `worker ${paths.index} web exited (code ${String(exited)}) before printing a URL. Log tail:\n${logTail(paths.logFile)}`,
      );
    await asyncSleep(500);
  }
  throw new Error(
    `worker ${paths.index} web did not print a URL within 120s. Log tail:\n${logTail(paths.logFile)}`,
  );
}

function readWebUrlFromLog(logFile: string): string | null {
  if (!existsSync(logFile)) return null;
  const match = readFileSync(logFile, "utf8").match(/^dsh web:\s*(http:\/\/\S+)$/m);
  return match ? match[1] : null;
}

function logTail(logFile: string): string {
  if (!existsSync(logFile)) return "(no log)";
  return readFileSync(logFile, "utf8").trim().split("\n").slice(-20).join("\n");
}

export function readWebUrl(paths: WorkerPaths): string {
  if (!existsSync(paths.urlFile))
    throw new Error(`missing ${paths.urlFile}; run playground:prepare first`);
  return readFileSync(paths.urlFile, "utf8").trim();
}

export function readWebPid(paths: WorkerPaths): number | null {
  if (!existsSync(paths.pidFile)) return null;
  const pid = Number(readFileSync(paths.pidFile, "utf8").trim());
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * True only when `pid` is a live DSH web process for this profile. A stale pid file can
 * point at a PID that the OS has since reused (notably across sandbox PID namespaces);
 * signalling that would kill an unrelated process, so we verify the command line first.
 */
function isDshWeb(pid: number): boolean {
  if (!isAlive(pid)) return false;
  try {
    const cmdline = readFileSync(`/proc/${pid}/cmdline`, "utf8");
    return cmdline.includes("dsh") && cmdline.includes(PROFILE_NAME);
  } catch {
    // No /proc (non-Linux): fall back to liveness alone.
    return true;
  }
}

export function stopWeb(paths: WorkerPaths): { stopped: boolean; pid: number | null } {
  const pid = readWebPid(paths);
  if (pid === null) {
    rmSync(paths.pidFile, { force: true });
    rmSync(paths.urlFile, { force: true });
    return { stopped: false, pid: null };
  }
  if (!isDshWeb(pid)) {
    rmSync(paths.pidFile, { force: true });
    rmSync(paths.urlFile, { force: true });
    return { stopped: false, pid };
  }
  signalGroup(pid, "SIGTERM");
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline && isAlive(pid)) syncSleep(200);
  if (isAlive(pid)) signalGroup(pid, "SIGKILL");
  rmSync(paths.pidFile, { force: true });
  rmSync(paths.urlFile, { force: true });
  return { stopped: true, pid };
}

function signalGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      // already gone
    }
  }
}
