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
import type {
  RoleFileSnapshot,
  SaveBudgetRequest,
  SaveBudgetResult,
  SaveRoleRequest,
  SaveRoleResult,
} from "../role-wire.ts";
import { createPstackConfigAction } from "./PstackConfigDialog.tsx";
import { NS, catalogs } from "./locales.ts";
import type { BundleView, PluginManagerApi } from "./RecommendedPluginsPage.tsx";
import type { RoleSettingsApi } from "./RoleSettingsPage.tsx";

/** Browser services this plugin needs. */
export const inject = ["remote", "slots", "locale", "remote.pluginManager"];

interface Result<T> {
  readonly ok: boolean;
  readonly value?: T;
  readonly error?: Error;
}

interface PstackRolesNamespace {
  status(): Promise<Result<RoleFileSnapshot>>;
  catalogue(signal?: AbortSignal): Promise<Result<CatalogueResult>>;
  save(request: SaveRoleRequest, signal?: AbortSignal): Promise<Result<SaveRoleResult>>;
  saveBudget(request: SaveBudgetRequest): Promise<Result<SaveBudgetResult>>;
}

interface PluginManagerNamespace {
  listBundles(): Promise<Result<readonly BundleView[]>>;
  setBundleEnabled(name: string, enabled: boolean): Promise<Result<unknown>>;
}

export async function apply(ctx: Context): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(pstackRolesRemote);
  ctx.effect(() => ctx.locale.register(NS, { ...catalogs }), "pstack-config.locale");

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
      saveBudget: async (request) => unwrap(await pstack.saveBudget(request)),
    };
    const pluginManager = (ctx.remote as unknown as { pluginManager?: PluginManagerNamespace })
      .pluginManager;
    const pluginApi: PluginManagerApi | undefined =
      pluginManager === undefined
        ? undefined
        : {
            listBundles: async () => unwrap(await pluginManager.listBundles()),
            setBundleEnabled: async (name, enabled) => {
              unwrap(await pluginManager.setBundleEnabled(name, enabled));
            },
          };
    const t = ctx.locale.bind(NS);
    scope.slots.inject("plugins.detail.actions", () =>
      scope.slots.register(
        {
          name: "plugins.detail.actions",
          id: "pstack",
          order: 20,
          label: t("configureAction"),
        },
        createPstackConfigAction(roleApi, pluginApi, t),
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
