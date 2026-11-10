// Environment building blocks shared by every playground script: fixed paths,
// the provider plan read from the host profile plus config.json, the generated
// DSH home, workspace pre-registration, and the detached web lifecycle.

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
import { createServer } from "node:net";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dump as yamlDump, load as yamlLoad } from "js-yaml";

import type { AllowedRoute, Mode, PlaygroundConfig } from "../../types";

const HERE = dirname(fileURLToPath(import.meta.url));

export const PLAYGROUND_DIR = resolve(HERE, "../..");
export const REPO_ROOT = resolve(PLAYGROUND_DIR, "..");
export const SCRIPTS_DIR = join(PLAYGROUND_DIR, "scripts");
export const CASES_DIR = join(PLAYGROUND_DIR, "cases");
export const PROFILE_TEMPLATE_DIR = join(PLAYGROUND_DIR, "profile");

export const CONFIG_FILE = join(PLAYGROUND_DIR, "config.json");
export const DSH_HOME = join(PLAYGROUND_DIR, ".dsh");
export const PROFILE_NAME = "playground";
export const PROFILE_DIR = join(DSH_HOME, "profiles", PROFILE_NAME);
export const HOME_PATCH_FILE = join(DSH_HOME, "cordis.patch.yml");
export const CREDENTIALS_SOURCE = join(homedir(), ".dsh", ".credentials.yaml");

export const WORKSPACE_ROOT = join(PLAYGROUND_DIR, ".workspace");
export const WORKSPACE_STORE = join(DSH_HOME, "storages", "workspace.json");

export const EVIDENCE_DIR = join(DSH_HOME, "evidence");
export const REPORT_DIR = join(PLAYGROUND_DIR, "reports");

export const BROWSER_DIR = join(PLAYGROUND_DIR, ".browser");
export const BROWSER_HOME = join(BROWSER_DIR, "home");
export const BROWSER_RUNTIME = join(BROWSER_DIR, "run");

export const HOST_PATCH_FILE = join(homedir(), ".dsh", "profiles", "web", "cordis.patch.yml");
export const RAW_SKILLS_DIR = join(REPO_ROOT, "upstream", "cursor-plugins", "pstack", "skills");

export const PORT = 17353;
export const HOST = "127.0.0.1";
export const WEB_URL_FILE = join(DSH_HOME, "web-url.txt");
export const WEB_PID_FILE = join(DSH_HOME, "web.pid");
export const WEB_LOG_FILE = join(DSH_HOME, "web.log");

const DSH_BIN = process.env.DSH_BIN ?? (process.platform === "win32" ? "dsh.cmd" : "dsh");

export function readConfig(): PlaygroundConfig {
  if (!existsSync(CONFIG_FILE)) {
    throw new Error(
      `missing ${CONFIG_FILE}; copy config.example.json to config.json and fill the provider key`,
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
export function loadProviderPlan(): ProviderPlan {
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
  const mainRoute = lowRoutes.find((route) => /minimax/i.test(route.model)) ?? lowRoutes[0];
  if (!mainRoute)
    throw new Error("no allowed route exposes a low reasoning effort; the default probe needs one");
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
export function writeHomePatch(plan: ProviderPlan): void {
  mkdirSync(DSH_HOME, { recursive: true });
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
  ];
  writeFileSync(HOME_PATCH_FILE, yamlDump(patch, { lineWidth: 120 }));
}

export interface HomePlan {
  provider: string;
  model: string;
  effort: string;
  name: string;
}

/** Read back what prepare actually applied, so bootstrap/run-case verify the real config not a recomputation. */
export function readHomePlan(): HomePlan {
  if (!existsSync(HOME_PATCH_FILE))
    throw new Error(`missing ${HOME_PATCH_FILE}; run playground:prepare first`);
  const entries = yamlLoad(readFileSync(HOME_PATCH_FILE, "utf8")) as Array<{
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

export function copyCredentials(): void {
  mkdirSync(DSH_HOME, { recursive: true });
  if (existsSync(CREDENTIALS_SOURCE)) {
    copyFileSync(CREDENTIALS_SOURCE, join(DSH_HOME, ".credentials.yaml"));
    return;
  }
  console.warn(
    `[prepare] no ${CREDENTIALS_SOURCE}; skipping credentials copy (fine if no model login is needed)`,
  );
}

export function resetHome(): void {
  rmSync(DSH_HOME, { recursive: true, force: true });
  mkdirSync(DSH_HOME, { recursive: true });
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
export function buildProfile(mode: Mode): void {
  rmSync(PROFILE_DIR, { recursive: true, force: true });
  mkdirSync(PROFILE_DIR, { recursive: true });

  copyFileSync(
    join(PROFILE_TEMPLATE_DIR, "pnpm-workspace.yaml"),
    join(PROFILE_DIR, "pnpm-workspace.yaml"),
  );
  const templatePatch = join(PROFILE_TEMPLATE_DIR, "cordis.patch.yml");
  if (mode === "raw") {
    const entries = (yamlLoad(readFileSync(templatePatch, "utf8")) as unknown[]) ?? [];
    entries.push(rawSkillPatch());
    writeFileSync(join(PROFILE_DIR, "cordis.patch.yml"), yamlDump(entries, { lineWidth: 120 }));
  } else {
    copyFileSync(templatePatch, join(PROFILE_DIR, "cordis.patch.yml"));
  }
  writeFileSync(
    join(PROFILE_DIR, "package.json"),
    `${JSON.stringify(profileManifest(mode), null, 2)}\n`,
  );
}

export function installPlugins(): void {
  const result = spawnSync(DSH_BIN, ["plugin", "--profile", PROFILE_NAME, "install"], {
    cwd: REPO_ROOT,
    env: { ...process.env, DSH_HOME },
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

export function registerWorkspaces(caseIds: string[]): WorkspaceRegistration {
  const ids = [...new Set(caseIds)].sort();
  if (ids.length === 0) ids.push("playground");
  mkdirSync(WORKSPACE_ROOT, { recursive: true });
  mkdirSync(dirname(WORKSPACE_STORE), { recursive: true });

  const now = new Date().toISOString();
  const dirs: Record<string, string> = {};
  const tables: Record<string, unknown> = {};
  const workspaceIds: string[] = [];

  for (const caseId of ids) {
    const workspaceId = randomId();
    const path = join(WORKSPACE_ROOT, caseId);
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
  writeFileSync(WORKSPACE_STORE, `${JSON.stringify(store, null, 2)}\n`);
  return { dirs, defaultId, defaultTitle: ids[0] };
}

export interface StoredWorkspace {
  path: string;
  title: string;
}

export function readWorkspaceStore(): { defaultTitle: string; workspaces: StoredWorkspace[] } {
  if (!existsSync(WORKSPACE_STORE))
    throw new Error(`missing ${WORKSPACE_STORE}; run playground:prepare first`);
  const store = JSON.parse(readFileSync(WORKSPACE_STORE, "utf8")) as {
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

export async function assertPortFree(): Promise<void> {
  const state = await new Promise<string>((resolvePromise) => {
    const server = createServer();
    server.once("error", (error: NodeJS.ErrnoException) =>
      resolvePromise(error.code === "EADDRINUSE" ? "busy" : `error:${error.code}`),
    );
    server.once("listening", () => server.close(() => resolvePromise("free")));
    server.listen(PORT, HOST);
  });
  if (state === "busy")
    throw new Error(
      `port ${HOST}:${PORT} is already in use; stop the other instance. The playground never falls back to another port`,
    );
  if (state !== "free") throw new Error(`cannot bind ${HOST}:${PORT} (${state})`);
}

const sleep = (ms: number): void => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

/** Spawn the web app detached, then wait for its tokenized URL line on stdout. */
export async function startWeb(plan: ProviderPlan): Promise<string> {
  await assertPortFree();
  mkdirSync(DSH_HOME, { recursive: true });
  const logFd = openSync(WEB_LOG_FILE, "w");
  const args = ["--profile", PROFILE_NAME, "--port", String(PORT), "--host", HOST, "--no-open"];
  const child = spawn(DSH_BIN, args, {
    cwd: REPO_ROOT,
    env: { ...process.env, DSH_HOME, [plan.apiKeyEnv]: plan.apiKey },
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  closeSync(logFd);
  writeFileSync(WEB_PID_FILE, `${child.pid ?? ""}\n`);
  child.unref();

  let exited: number | null = null;
  child.once("exit", (code) => {
    exited = code ?? -1;
  });

  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const found = readWebUrlFromLog();
    if (found) {
      writeFileSync(WEB_URL_FILE, `${found}\n`);
      return found;
    }
    if (exited !== null)
      throw new Error(
        `web exited (code ${String(exited)}) before printing a URL. Log tail:\n${logTail()}`,
      );
    sleep(500);
  }
  throw new Error(`web did not print a URL within 120s. Log tail:\n${logTail()}`);
}

function readWebUrlFromLog(): string | null {
  if (!existsSync(WEB_LOG_FILE)) return null;
  const match = readFileSync(WEB_LOG_FILE, "utf8").match(/^dsh web:\s*(http:\/\/\S+)$/m);
  return match ? match[1] : null;
}

function logTail(): string {
  if (!existsSync(WEB_LOG_FILE)) return "(no log)";
  return readFileSync(WEB_LOG_FILE, "utf8").trim().split("\n").slice(-20).join("\n");
}

export function readWebUrl(): string {
  if (!existsSync(WEB_URL_FILE))
    throw new Error(`missing ${WEB_URL_FILE}; run playground:prepare first`);
  return readFileSync(WEB_URL_FILE, "utf8").trim();
}

export function readWebPid(): number | null {
  if (!existsSync(WEB_PID_FILE)) return null;
  const pid = Number(readFileSync(WEB_PID_FILE, "utf8").trim());
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

export function stopWeb(): { stopped: boolean; pid: number | null } {
  const pid = readWebPid();
  if (pid === null) return { stopped: false, pid: null };
  if (isAlive(pid)) {
    signalGroup(pid, "SIGTERM");
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline && isAlive(pid)) sleep(200);
    if (isAlive(pid)) signalGroup(pid, "SIGKILL");
  }
  rmSync(WEB_PID_FILE, { force: true });
  rmSync(WEB_URL_FILE, { force: true });
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
