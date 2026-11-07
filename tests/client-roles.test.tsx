// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import type { Context } from "@deepseek-ai/cordis";

import { apply } from "../src/client/index.ts";
import { createPstackConfigAction, PstackConfigDialog } from "../src/client/PstackConfigDialog.tsx";
import type { RoleSettingsApi } from "../src/client/RoleSettingsPage.tsx";
import { catalogs, type PstackTranslations } from "../src/client/locales/index.ts";
import type { CatalogueResult } from "../src/models.ts";
import type { RoleFileSnapshot, RoleView, SaveRoleRequest } from "../src/role-wire.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function translator(dict: Record<string, string>) {
  return (key: string, vars?: Record<string, string | number>): string => {
    let text = dict[key] ?? key;
    if (vars !== undefined) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  };
}

function translations(): PstackTranslations {
  return {
    common: translator(catalogs.common.en),
    config: translator(catalogs.config.en),
    plugins: translator(catalogs.plugins.en),
    roles: translator(catalogs.roles.en),
  };
}

const catalogue: CatalogueResult = {
  truncated: false,
  providers: [
    {
      provider: "cpa",
      name: "CPA",
      models: [{ route: "cpa/model-a", id: "model-a", name: "Model A", efforts: ["low", "high"] }],
    },
  ],
};

function bugFixRole(configured = true): RoleView {
  return {
    key: "bug-fix",
    shape: "single",
    configured,
    ...(configured ? { line: 2 } : {}),
    routes: configured
      ? [{ kind: "route", provider: "cpa", model: "model-a", effort: "high" }]
      : [],
    issues: [],
  };
}

function snapshotFor(configured = true): RoleFileSnapshot {
  return {
    path: "/home/user/.dsh/pstack-models.mdc",
    status: "loaded",
    roles: [bugFixRole(configured)],
    issues: [],
    canSave: true,
  };
}

function snapshotAfter(request: SaveRoleRequest): RoleFileSnapshot {
  const configured = request.routes.length > 0;
  return {
    path: "/home/user/.dsh/pstack-models.mdc",
    status: "loaded",
    roles: [
      {
        key: request.key,
        shape: "single",
        configured,
        ...(configured ? { line: 2 } : {}),
        routes: request.routes.map((route) => ({ ...route })),
        issues: [],
      },
    ],
    issues: [],
    canSave: true,
  };
}

interface RoleApiController {
  api: RoleSettingsApi;
  statusCalls: () => number;
  saves: SaveRoleRequest[];
}

function makeRoleApi(): RoleApiController {
  let statusCalls = 0;
  let current = snapshotFor();
  const saves: SaveRoleRequest[] = [];
  return {
    api: {
      status: async () => {
        statusCalls += 1;
        return current;
      },
      catalogue: async () => catalogue,
      save: async (request) => {
        saves.push(request);
        current = snapshotAfter(request);
        return { ok: true, snapshot: current };
      },
    },
    statusCalls: () => statusCalls,
    saves,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  document.body.innerHTML = "";
});

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function click(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.click();
  });
  await flush();
}

function buttonByText(scope: ParentNode, text: string): HTMLButtonElement {
  return Array.from(scope.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.trim() === text,
  )!;
}

function tab(name: string): HTMLButtonElement {
  return Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find(
    (button) => button.textContent?.trim() === name,
  )!;
}

async function openRoles(api: RoleSettingsApi): Promise<void> {
  await act(async () => {
    root.render(
      createElement(PstackConfigDialog, {
        roleApi: api,
        pluginApi: undefined,
        translations: translations(),
        onClose: () => {},
      }),
    );
  });
  await flush();
  await click(tab("Role models"));
}

describe("role drafts across tabs", () => {
  it("mounts roles lazily and keeps the edited draft when switching tabs", async () => {
    const controller = makeRoleApi();
    await act(async () => {
      root.render(
        createElement(PstackConfigDialog, {
          roleApi: controller.api,
          pluginApi: undefined,
          translations: translations(),
          onClose: () => {},
        }),
      );
    });
    await flush();

    // The roles tab is unvisited: no panel and no status call.
    expect(controller.statusCalls()).toBe(0);
    expect(document.querySelectorAll('[role="tabpanel"]')).toHaveLength(1);

    await click(tab("Role models"));
    expect(controller.statusCalls()).toBe(1);
    expect(document.querySelectorAll('[role="tabpanel"]')).toHaveLength(2);

    const effort = document.querySelector<HTMLSelectElement>(
      'select[aria-label="Bug fix Reasoning effort"]',
    )!;
    await act(async () => {
      effort.value = "low";
      effort.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flush();
    expect(effort.value).toBe("low");

    await click(tab("Recommended plugins"));
    await click(tab("Role models"));

    const restored = document.querySelector<HTMLSelectElement>(
      'select[aria-label="Bug fix Reasoning effort"]',
    )!;
    expect(restored.value).toBe("low");
    expect(controller.statusCalls()).toBe(1);
  });

  it("gives the visible panel the accessible name of its tab", async () => {
    await openRoles(makeRoleApi().api);
    const rolesTab = tab("Role models");
    const visible = Array.from(document.querySelectorAll<HTMLElement>('[role="tabpanel"]')).filter(
      (panel) => !panel.hasAttribute("hidden"),
    );
    expect(visible).toHaveLength(1);
    expect(visible[0]!.getAttribute("aria-labelledby")).toBe(rolesTab.id);
    expect(rolesTab.getAttribute("aria-controls")).toBe(visible[0]!.id);
  });
});

describe("clear as deletion", () => {
  it("shows a removal hint, offers Add route on an empty single role, and saves routes: []", async () => {
    const controller = makeRoleApi();
    await openRoles(controller.api);

    const card = document.querySelector<HTMLElement>(".pstack-role-card")!;
    expect(buttonByText(card, "Add route")).toBeUndefined();

    await click(buttonByText(card, "Clear"));

    expect(card.textContent).toContain("Saving removes this role's line.");
    expect(
      card.querySelector<HTMLSelectElement>('select[aria-label="Bug fix Provider"]')?.value,
    ).toBe("__inherit__:inherit-parent");
    expect(buttonByText(card, "Clear").disabled).toBe(true);
    expect(buttonByText(card, "Add route")).toBeInstanceOf(HTMLButtonElement);

    await click(buttonByText(card, "Save"));

    expect(controller.saves).toEqual([{ key: "bug-fix", routes: [] }]);
    const saved = document.querySelector<HTMLElement>(".pstack-role-card")!;
    expect(saved.textContent).toContain("Not configured");
    expect(
      saved.querySelector<HTMLSelectElement>('select[aria-label="Bug fix Provider"]')?.value,
    ).toBe("__inherit__:inherit-parent");
    expect(saved.textContent).not.toContain("Saving removes this role's line.");
    expect(buttonByText(saved, "Clear").disabled).toBe(true);
    expect(buttonByText(saved, "Add route")).toBeInstanceOf(HTMLButtonElement);
  });

  it("restores the baseline on reset instead of clearing", async () => {
    const controller = makeRoleApi();
    await openRoles(controller.api);
    const card = document.querySelector<HTMLElement>(".pstack-role-card")!;
    await click(buttonByText(card, "Clear"));
    await click(buttonByText(card, "Reset"));
    const effort = document.querySelector<HTMLSelectElement>(
      'select[aria-label="Bug fix Reasoning effort"]',
    );
    expect(effort?.value).toBe("high");
  });
});

describe("unsaved-close confirmation", () => {
  it("keeps the dialog open when discard is declined and closes when accepted", async () => {
    const controller = makeRoleApi();
    const closes: number[] = [];
    await act(async () => {
      root.render(
        createElement(PstackConfigDialog, {
          roleApi: controller.api,
          pluginApi: undefined,
          translations: translations(),
          onClose: () => closes.push(1),
        }),
      );
    });
    await flush();
    await click(tab("Role models"));

    const effort = document.querySelector<HTMLSelectElement>(
      'select[aria-label="Bug fix Reasoning effort"]',
    )!;
    await act(async () => {
      effort.value = "low";
      effort.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flush();

    const original = window.confirm;
    try {
      window.confirm = () => false;
      await act(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      });
      await flush();
      expect(closes).toHaveLength(0);
      expect(document.querySelector('[role="dialog"]')).not.toBeNull();

      window.confirm = () => true;
      await act(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      });
      await flush();
      expect(closes).toHaveLength(1);
    } finally {
      window.confirm = original;
    }
  });
});

describe("dialog focus management", () => {
  it("traps Tab inside the panel and wraps in both directions", async () => {
    await openRoles(makeRoleApi().api);
    const panel = document.querySelector<HTMLElement>(".pstack-panel")!;
    const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => element.closest("[hidden]") === null,
    );
    expect(focusables.length).toBeGreaterThan(1);
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;

    last.focus();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    });
    expect(document.activeElement).toBe(first);

    first.focus();
    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }),
      );
    });
    expect(document.activeElement).toBe(last);
  });

  it("restores focus to the Configure trigger on close", async () => {
    const Action = createPstackConfigAction(makeRoleApi().api, undefined, translations());
    await act(async () => {
      root.render(
        createElement(Action as never, {
          subject: { kind: "bundle", pkg: { name: "dsh-pstack" } },
        }),
      );
    });
    await flush();

    const configure = buttonByText(container, "Configure");
    await click(configure);
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();

    const closeButton = document.querySelector<HTMLButtonElement>(
      '[role="dialog"] button[aria-label="Close"]',
    )!;
    await click(closeButton);
    await flush();

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(configure);
  });
});

describe("remote adapter unwrap", () => {
  interface Harness {
    component: (props: unknown) => unknown;
    statusCalls: () => number;
  }

  async function mountThroughApply(
    status: () => Promise<{ ok: true; value: RoleFileSnapshot } | { ok: false; error: Error }>,
  ): Promise<Harness> {
    const dictionaries = new Map<string, Record<string, string>>();
    const registered: { name: string; component: unknown }[] = [];
    const slotHost = {
      inject: (_name: string, register: () => void) => register(),
      register: (options: { name: string }, component: unknown) => {
        registered.push({ name: options.name, component });
        return () => {};
      },
    };
    let statusCalls = 0;
    const pstackRoles = {
      status: async () => {
        statusCalls += 1;
        return status();
      },
      catalogue: async () => ({ ok: true as const, value: catalogue }),
      save: async () => ({ ok: true as const, value: { ok: false as const, reason: "no" } }),
    };
    const ctx = {
      remote: { $mount: async () => async () => {} },
      slots: slotHost,
      locale: {
        register: (namespace: string, value: Record<string, string>) => {
          dictionaries.set(namespace, value);
          return () => {};
        },
        bind: (namespace: string) => {
          const value = dictionaries.get(namespace);
          const flat =
            value !== undefined && typeof value === "object" && "en" in value
              ? (value as unknown as { en: Record<string, string> }).en
              : (value ?? {});
          return translator(flat);
        },
      },
      effect: (callback: () => unknown) => callback(),
      inject: (_deps: string[], callback: (scope: unknown) => void) => {
        callback({ remote: { pstackRoles }, slots: slotHost });
        return () => {};
      },
    } as unknown as Context;
    await apply(ctx);
    const action = registered.find((entry) => entry.name === "plugins.detail.actions");
    return {
      component: action!.component as (props: unknown) => unknown,
      statusCalls: () => statusCalls,
    };
  }

  it("returns the decoded value instead of discarding it", async () => {
    const harness = await mountThroughApply(async () => ({ ok: true, value: snapshotFor() }));
    const Component = harness.component;
    await act(async () => {
      root.render(
        createElement(Component as never, {
          subject: { kind: "bundle", pkg: { name: "dsh-pstack" } },
        }),
      );
    });
    await flush();
    await click(buttonByText(container, "Configure"));
    await click(tab("Role models"));

    expect(harness.statusCalls()).toBe(1);
    expect(document.body.textContent).toContain("Bug fix");
  });

  it("surfaces the carrier error when the envelope is not ok", async () => {
    const harness = await mountThroughApply(async () => ({
      ok: false,
      error: new Error("remote exploded"),
    }));
    const Component = harness.component;
    await act(async () => {
      root.render(
        createElement(Component as never, {
          subject: { kind: "bundle", pkg: { name: "dsh-pstack" } },
        }),
      );
    });
    await flush();
    await click(buttonByText(container, "Configure"));
    await click(tab("Role models"));

    expect(document.body.textContent).toContain("remote exploded");
  });
});
