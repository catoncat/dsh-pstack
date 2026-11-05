/** Browser half of dsh-pstack: the role model configuration settings tab. */

import { createElement } from "react";
import type { Context } from "@deepseek-ai/cordis";
import type {} from "@deepseek-ai/dsh-api-gateway/client";
import type {} from "@deepseek-ai/dsh-client-locale/client";
import type {} from "@deepseek-ai/dsh-client-ui-renderer/client";
import type {} from "@deepseek-ai/dsh-client-ui-settings/client";
import type {} from "@deepseek-ai/dsh-client-ui-slots";

import type { CatalogueResult } from "../models.ts";
import { pstackRolesRemote } from "../role-remote.ts";
import type { RoleFileSnapshot, SaveRoleRequest, SaveRoleResult } from "../role-wire.ts";
import { RoleSettingsView, type RoleSettingsApi } from "./RoleSettingsPage.tsx";
import { NS, catalogs } from "./locales.ts";

/** Browser services this plugin needs. */
export const inject = ["remote", "slots", "locale"];

/** Mount the Remote contribution and register the settings tab. */
export async function apply(ctx: Context): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(pstackRolesRemote);
  ctx.effect(() => ctx.locale.register(NS, { ...catalogs }), "pstack-roles.locale");

  ctx.inject(["remote.pstackRoles"], (scope: Context) => {
    const namespace = (
      scope.remote as unknown as {
        pstackRoles: {
          status(): Promise<{ ok: true; value: RoleFileSnapshot } | { ok: false; error: Error }>;
          catalogue(
            signal?: AbortSignal,
          ): Promise<{ ok: true; value: CatalogueResult } | { ok: false; error: Error }>;
          save(
            request: SaveRoleRequest,
            signal?: AbortSignal,
          ): Promise<{ ok: true; value: SaveRoleResult } | { ok: false; error: Error }>;
        };
      }
    ).pstackRoles;
    const api: RoleSettingsApi = {
      status: async () => unwrap(await namespace.status()),
      catalogue: async () => unwrap(await namespace.catalogue()),
      save: async (request) => {
        const result = await namespace.save(request);
        return result.ok ? result.value : { ok: false, reason: result.error.message };
      },
    };
    const t = ctx.locale.bind(NS);
    scope.slots.inject("settings.plugins.tab", () =>
      scope.slots.register(
        {
          name: "settings.plugins.tab",
          id: "pstack",
          order: 20,
          label: "pstack",
        },
        () => createElement(RoleSettingsView, { api, t }),
      ),
    );
  });

  return disposeRemote;
}

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: Error }): T {
  if (!result.ok) throw result.error;
  return result.value;
}
