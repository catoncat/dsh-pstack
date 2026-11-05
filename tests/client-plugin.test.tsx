import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";
import type { Context } from "@deepseek-ai/cordis";

import { apply, inject } from "../src/client/index.ts";
import type { PstackRolesNamespace } from "../src/role-remote.ts";
import type { BundleView } from "../src/client/RecommendedPluginsPage.tsx";

type Dictionaries = Record<string, Record<string, string>>;

function translateFrom(dictionaries: Dictionaries): (key: string) => string {
  return (key) => dictionaries["en"]?.[key] ?? key;
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
    const slots: { name: string; id: string; component: unknown }[] = [];
    const dictionaries = new Map<string, Dictionaries>();
    const pstackRoles = roleApi() as unknown as PstackRolesNamespace["pstackRoles"];
    const pluginManager = {
      listBundles: async () => ({ ok: true as const, value: [] as BundleView[] }),
      setBundleEnabled: async () => ({ ok: true as const, value: undefined }),
    };

    const ctx = {
      remote: {
        $mount: async (contribution: unknown) => {
          mounts.push(contribution);
          return async () => {};
        },
      },
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
          slots: {
            inject: (_name: string, register: () => void) => register(),
            register: (options: { name: string; id: string }, component: unknown) => {
              slots.push({ ...options, component });
              return () => {};
            },
          },
        });
        return () => {};
      },
    } as unknown as Context;

    await apply(ctx);
    expect(inject).toEqual(["remote", "slots", "locale", "remote.pluginManager"]);
    expect(mounts).toHaveLength(1);
    expect(slots).toHaveLength(1);
    expect(slots[0]?.name).toBe("plugins.detail.actions");
    expect(slots[0]?.id).toBe("pstack");

    const Component = slots[0]?.component as (props: unknown) => unknown;
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
});
