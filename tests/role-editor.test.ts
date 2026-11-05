import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { parseRoleConfiguration } from "../src/role-config.ts";
import {
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
});
