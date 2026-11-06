import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
import type { Context } from "@deepseek-ai/cordis";

import { apply, inject } from "../src/client/index.ts";
import type { PstackRolesNamespace } from "../src/role-remote.ts";
import type { BundleView } from "../src/client/RecommendedPluginsPage.tsx";
import { RecommendedPluginsView } from "../src/client/RecommendedPluginsPage.tsx";
import { catalogs } from "../src/client/locales.ts";

type Dictionaries = Record<string, Record<string, string>>;

function translateFrom(dictionaries: Dictionaries, language = "en"): (key: string) => string {
  return (key) => dictionaries[language]?.[key] ?? dictionaries["en"]?.[key] ?? key;
}

function roleApi() {
  return {
    status: async () => ({
      path: "/tmp/pstack-models.mdc",
      status: "missing" as const,
      roles: [],
      issues: [],
      canSave: true,
    }),
    catalogue: async () => ({ providers: [], truncated: false }),
    save: async () => ({ ok: false as const, reason: "not used" }),
    saveBudget: async () => ({ ok: false as const, reason: "not used" }),
  };
}

describe("pstack client", () => {
  it("mounts the role Remote and registers the plugin-detail action", async () => {
    const mounts: unknown[] = [];
    const slots: {
      name: string;
      id?: string;
      key?: string;
      locale?: string;
      component: unknown;
    }[] = [];
    const dictionaries = new Map<string, Dictionaries>();
    const pstackRoles = roleApi() as unknown as PstackRolesNamespace["pstackRoles"];
    const pluginManager = {
      listBundles: async () => ({ ok: true as const, value: [] as BundleView[] }),
      setBundleEnabled: async () => ({ ok: true as const, value: undefined }),
    };
    const slotHost = {
      inject: (_name: string, register: () => void) => register(),
      register: (
        options: { name: string; id?: string; key?: string; locale?: string },
        component: unknown,
      ) => {
        slots.push({ ...options, component });
        return () => {};
      },
    };

    const ctx = {
      remote: {
        $mount: async (contribution: unknown) => {
          mounts.push(contribution);
          return async () => {};
        },
      },
      slots: slotHost,
      locale: {
        register: (namespace: string, value: Dictionaries) => {
          dictionaries.set(namespace, value);
          return () => {};
        },
        bind: (namespace: string) => translateFrom(dictionaries.get(namespace) ?? {}),
      },
      effect: (callback: () => unknown) => callback(),
      inject: (_deps: string[], callback: (scope: unknown) => void) => {
        callback({
          remote: { pstackRoles, pluginManager },
          slots: slotHost,
        });
        return () => {};
      },
    } as unknown as Context;

    await apply(ctx);
    expect(inject).toEqual(["remote", "slots", "locale", "remote.pluginManager"]);
    expect(mounts).toHaveLength(1);
    expect(slots.filter((slot) => slot.name === "tool.call.toolview")).toHaveLength(5);
    expect(slots.filter((slot) => slot.name === "plugins.detail.actions")).toHaveLength(1);
    const action = slots.find((slot) => slot.name === "plugins.detail.actions");
    expect(action?.id).toBe("pstack");

    const Component = action?.component as (props: unknown) => unknown;
    const html = renderToStaticMarkup(
      createElement(Component as never, {
        subject: { kind: "bundle", pkg: { name: "dsh-pstack" } },
      }),
    );
    expect(html).toContain("pstack settings");
    expect(
      renderToStaticMarkup(
        createElement(Component as never, {
          subject: { kind: "bundle", pkg: { name: "other" } },
        }),
      ),
    ).toBe("");
  });

  it("renders recommended plugin copy in one language only", () => {
    const t = translateFrom(catalogs as Dictionaries, "zh");
    const html = renderToStaticMarkup(createElement(RecommendedPluginsView, { api: undefined, t }));
    expect(html).toContain(catalogs.zh.recommendedForgeTitle);
    expect(html).toContain(catalogs.zh.recommendedForgeDescription);
    expect(html).not.toContain(catalogs.en.recommendedForgeTitle);
    expect(html).not.toContain(catalogs.en.recommendedForgeDescription);
  });
});
