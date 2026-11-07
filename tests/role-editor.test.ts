import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { parseRoleConfiguration } from "../src/role-config.ts";
import {
  removeRoleText,
  saveRoleConfiguration,
  snapshotFromConfiguration,
  updateRoleText,
  validateSaveRequest,
} from "../src/role-editor.ts";
import type { CatalogueResult, ModelsLlm } from "../src/models.ts";

const directories: string[] = [];

function tempHome(text: string): string {
  const directory = mkdtempSync(join(tmpdir(), "pstack-editor-"));
  directories.push(directory);
  writeFileSync(join(directory, "pstack-models.mdc"), text);
  return directory;
}

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

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

const llm = {
  listProviders: () =>
    catalogue.providers.map((entry) => ({ id: entry.provider, name: entry.name })),
  listModels: async () => [{ provider: "cpa", id: "model-a", name: "Model A" }],
  resolveModelInfo: async (provider: string, model: string) => ({
    provider,
    id: model,
    name: model,
    reasoning: { efforts: [{ id: "low" }, { id: "high" }], defaultEffort: "high" },
  }),
};

describe("role editor", () => {
  it("reports every manifest role in a missing snapshot", () => {
    const path = join(tempHome(""), "missing.mdc");
    const snapshot = snapshotFromConfiguration({ status: "missing", path });
    expect(snapshot.status).toBe("missing");
    expect(snapshot.roles.length).toBe(17);
    expect(snapshot.canSave).toBe(true);
  });

  it("replaces one role line and preserves comments", () => {
    const text = "# keep me\n# budget: large (xhigh)\nbug-fix: cpa/model-a [low]\n";
    expect(updateRoleText(text, "bug-fix", "cpa/model-a [high]")).toBe(
      "# keep me\n# budget: large (xhigh)\nbug-fix: cpa/model-a [high]\n",
    );
  });

  it("validates provider, model, and effort against the catalogue", () => {
    expect(
      validateSaveRequest(
        {
          key: "bug-fix",
          routes: [{ kind: "route", provider: "cpa", model: "model-a", effort: "high" }],
        },
        catalogue,
      ).ok,
    ).toBe(true);
    expect(
      validateSaveRequest(
        {
          key: "bug-fix",
          routes: [{ kind: "route", provider: "cpa", model: "model-a", effort: "max" }],
        },
        catalogue,
      ),
    ).toMatchObject({ ok: false });
  });

  it("accepts deletion and rejects malformed routes without throwing", () => {
    expect(validateSaveRequest({ key: "bug-fix", routes: [] }, catalogue)).toEqual({
      ok: true,
      key: "bug-fix",
      routes: [],
    });
    expect(
      validateSaveRequest(
        { key: "bug-fix", routes: [{ kind: "route", provider: "cpa" }] } as never,
        catalogue,
      ).ok,
    ).toBe(false);
  });

  it("removes every matching role line by its normalized key", () => {
    const text = "Feature,refactoring: cpa/a\nbug-fix: cpa/b\nfeature, refactoring: cpa/c\n";
    expect(removeRoleText(text, "feature, refactoring")).toBe("bug-fix: cpa/b\n");
    expect(removeRoleText("bug-fix: cpa/b", "bug-fix")).toBe("");
  });

  it("saves one role and leaves the rest of the file intact", async () => {
    const home = tempHome("# header\nbug-fix: cpa/model-a [low]\n");
    const path = join(home, "pstack-models.mdc");
    const result = await saveRoleConfiguration(
      path,
      {
        key: "feature, refactoring",
        routes: [{ kind: "route", provider: "cpa", model: "model-a", effort: "high" }],
      },
      llm as unknown as ModelsLlm,
      new AbortController().signal,
    );
    expect(result.ok).toBe(true);
    const text = readFileSync(path, "utf8");
    expect(text).toContain("# header");
    expect(text).toContain("bug-fix: cpa/model-a [low]");
    expect(text).toContain("feature, refactoring: cpa/model-a [high]");
    expect(parseRoleConfiguration(text, path).status).toBe("loaded");
  });

  it("re-reads the role file after an asynchronous catalogue lookup", async () => {
    const home = tempHome("# header\nbug-fix: cpa/model-a [low]\n");
    const path = join(home, "pstack-models.mdc");
    const concurrentLlm = {
      ...llm,
      listModels: async () => {
        writeFileSync(path, `${readFileSync(path, "utf8")}perf-issue: cpa/model-a [high]\n`);
        return [{ provider: "cpa", id: "model-a", name: "Model A" }];
      },
    } as unknown as ModelsLlm;
    const result = await saveRoleConfiguration(
      path,
      {
        key: "feature, refactoring",
        routes: [{ kind: "route", provider: "cpa", model: "model-a", effort: "high" }],
      },
      concurrentLlm,
      new AbortController().signal,
    );
    expect(result.ok).toBe(true);
    expect(readFileSync(path, "utf8")).toContain("perf-issue: cpa/model-a [high]");
  });

  it("clears a role without model discovery and makes repeat clears a no-op", async () => {
    const home = tempHome("# header\nbug-fix: cpa/model-a [low]\n");
    const path = join(home, "pstack-models.mdc");
    const unavailable = {
      listProviders() {
        throw new Error("catalogue unavailable");
      },
    } as unknown as ModelsLlm;
    const first = await saveRoleConfiguration(
      path,
      { key: "bug-fix", routes: [] },
      unavailable,
      new AbortController().signal,
    );
    if (!first.ok) throw new Error(first.reason);
    expect(readFileSync(path, "utf8")).toBe("# header\n");
    expect(first.snapshot.roles.find((role) => role.key === "bug-fix")?.configured).toBe(false);

    const second = await saveRoleConfiguration(
      path,
      { key: "bug-fix", routes: [] },
      unavailable,
      new AbortController().signal,
    );
    expect(second.ok).toBe(true);
    expect(readFileSync(path, "utf8")).toBe("# header\n");
  });

  it("does not create a file when an absent role is cleared", async () => {
    const path = join(tempHome(""), "missing.mdc");
    const result = await saveRoleConfiguration(
      path,
      { key: "bug-fix", routes: [] },
      llm as unknown as ModelsLlm,
      new AbortController().signal,
    );
    if (!result.ok) throw new Error(result.reason);
    expect(result.snapshot.status).toBe("missing");
    expect(existsSync(path)).toBe(false);
  });

  it("rejects an aborted clear without changing the file", async () => {
    const home = tempHome("bug-fix: cpa/model-a [low]\n");
    const path = join(home, "pstack-models.mdc");
    const controller = new AbortController();
    controller.abort();
    await expect(
      saveRoleConfiguration(
        path,
        { key: "bug-fix", routes: [] },
        llm as unknown as ModelsLlm,
        controller.signal,
      ),
    ).rejects.toThrow();
    expect(readFileSync(path, "utf8")).toBe("bug-fix: cpa/model-a [low]\n");
  });

  it("returns a refused save for provider and model discovery failures", async () => {
    const home = tempHome("# header\n");
    const path = join(home, "pstack-models.mdc");
    const failures = [
      {
        listProviders() {
          throw new Error("provider failed");
        },
      },
      { ...llm, listModels: async () => Promise.reject(new Error("models failed")) },
      { ...llm, resolveModelInfo: async () => Promise.reject(new Error("info failed")) },
    ] as ModelsLlm[];
    for (const failing of failures) {
      const result = await saveRoleConfiguration(
        path,
        {
          key: "bug-fix",
          routes: [{ kind: "route", provider: "cpa", model: "model-a", effort: "high" }],
        },
        failing,
        new AbortController().signal,
      );
      expect(result).toMatchObject({ ok: false, reason: expect.any(String) });
      expect(readFileSync(path, "utf8")).toBe("# header\n");
    }
  });

  it("rejects malformed input before reading the model catalogue", async () => {
    const home = tempHome("");
    const result = await saveRoleConfiguration(
      join(home, "pstack-models.mdc"),
      { key: 42, routes: [] } as never,
      {
        listProviders() {
          throw new Error("must not be called");
        },
      } as unknown as ModelsLlm,
      new AbortController().signal,
    );
    expect(result).toMatchObject({ ok: false, reason: expect.stringContaining("request.key") });
  });
});
