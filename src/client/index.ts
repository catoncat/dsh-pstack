/** Browser entry for dsh-pstack: the plugin-detail configuration action. */

import type { Context } from "@deepseek-ai/cordis";
import type {} from "@deepseek-ai/dsh-api-gateway/client";
import type {} from "@deepseek-ai/dsh-client-locale/client";
import type {} from "@deepseek-ai/dsh-client-ui-renderer/client";
import type {} from "@deepseek-ai/dsh-client-ui-settings/client";
import type {} from "@deepseek-ai/dsh-client-ui-slots";
import type {} from "@deepseek-ai/dsh-client-ui-plugin-manager/client";

import type { CatalogueResult } from "../models.ts";
import { pstackRolesRemote } from "../role-remote.ts";
import type { RoleFileSnapshot, SaveRoleRequest, SaveRoleResult } from "../role-wire.ts";
import { createPstackConfigAction } from "./PstackConfigDialog.tsx";
import { NS, catalogs } from "./locales/index.ts";
import type { BundleChange, BundleView, PluginManagerApi } from "./RecommendedPluginsPage.tsx";
import type { RoleSettingsApi } from "./RoleSettingsPage.tsx";

/** Browser services this plugin needs. `remote.pluginManager` stays optional, so roles load without it. */
export const inject = ["remote", "slots", "locale"];

interface Result<T> {
  readonly ok: boolean;
  readonly value?: T;
  readonly error?: Error;
}

interface PstackRolesNamespace {
  status(): Promise<Result<RoleFileSnapshot>>;
  catalogue(signal?: AbortSignal): Promise<Result<CatalogueResult>>;
  save(request: SaveRoleRequest, signal?: AbortSignal): Promise<Result<SaveRoleResult>>;
}

interface PluginManagerNamespace {
  listBundles(): Promise<Result<readonly BundleView[]>>;
  setBundleEnabled(name: string, enabled: boolean): Promise<Result<unknown>>;
}

export async function apply(ctx: Context): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(pstackRolesRemote);
  ctx.effect(() => ctx.locale.register(NS.common, catalogs.common), "pstack-config.locale.common");
  ctx.effect(() => ctx.locale.register(NS.config, catalogs.config), "pstack-config.locale.config");
  ctx.effect(
    () => ctx.locale.register(NS.plugins, catalogs.plugins),
    "pstack-config.locale.plugins",
  );
  ctx.effect(() => ctx.locale.register(NS.roles, catalogs.roles), "pstack-config.locale.roles");

  // `$mount` above installs the namespace, so its dependency is declared only now.
  // Injecting before the await would resolve against a namespace that does not exist yet.
  ctx.inject(["remote.pstackRoles"], (scope: Context) => {
    const remote = scope.remote as unknown as {
      pstackRoles?: PstackRolesNamespace;
    };
    const pstack = remote.pstackRoles;
    if (pstack === undefined) return;

    const roleApi: RoleSettingsApi = {
      status: async () => unwrap(await pstack.status()),
      catalogue: async () => unwrap(await pstack.catalogue()),
      save: async (request) => unwrap(await pstack.save(request)),
    };
    const pluginManager = (ctx.remote as unknown as { pluginManager?: PluginManagerNamespace })
      .pluginManager;
    const pluginApi: PluginManagerApi | undefined =
      pluginManager === undefined
        ? undefined
        : {
            listBundles: async () => unwrap(await pluginManager.listBundles()),
            setBundleEnabled: async (name, enabled) =>
              toBundleChange(unwrap(await pluginManager.setBundleEnabled(name, enabled))),
          };
    const translations = {
      common: ctx.locale.bind(NS.common),
      config: ctx.locale.bind(NS.config),
      plugins: ctx.locale.bind(NS.plugins),
      roles: ctx.locale.bind(NS.roles),
    };
    scope.slots.inject("plugins.detail.actions", () =>
      scope.slots.register(
        {
          name: "plugins.detail.actions",
          id: "pstack",
          order: 20,
          label: translations.config("configureAction"),
        },
        createPstackConfigAction(roleApi, pluginApi, translations),
      ),
    );
  });

  return disposeRemote;
}

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw result.error ?? new Error("remote call failed");
  if (result.value === undefined) throw new Error("remote call returned no value");
  return result.value;
}

const CHANGE_APPLICATIONS = new Set<string>([
  "applied",
  "restart-required",
  "overridden",
  "failed",
  "cancelled",
]);

/** Project the Host's ChangeResult onto the small page-facing value. Unknown outcomes report failure. */
function toBundleChange(value: unknown): BundleChange {
  const record =
    typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const application = record["application"];
  if (typeof application !== "string" || !CHANGE_APPLICATIONS.has(application)) {
    return {
      application: "failed",
      error: {
        diagnostic:
          typeof application === "string"
            ? `unknown application ${application}`
            : "the change returned no application",
      },
    };
  }
  const restartReason = record["restartReason"];
  const rawError = record["error"];
  const errorRecord =
    typeof rawError === "object" && rawError !== null
      ? (rawError as Record<string, unknown>)
      : undefined;
  const code = errorRecord?.["code"];
  const diagnostic = errorRecord?.["diagnostic"];
  return {
    application: application as BundleChange["application"],
    ...(typeof restartReason === "string" ? { restartReason } : {}),
    ...(errorRecord === undefined
      ? {}
      : {
          error: {
            ...(typeof code === "string" ? { code } : {}),
            ...(typeof diagnostic === "string" ? { diagnostic } : {}),
          },
        }),
  };
}
