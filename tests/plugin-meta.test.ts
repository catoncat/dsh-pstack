import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vite-plus/test";

const MODULES = readdirSync("modules", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const MANIFEST = JSON.parse(readFileSync("package.json", "utf8")) as {
  exports: Record<string, string>;
};

function moduleLanguages(module: string): string[] {
  return readdirSync(join("modules", module, "locale"))
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -".json".length));
}

const LANGUAGES = [...new Set(MODULES.flatMap(moduleLanguages))].sort();

function meta(module: string, language: string): Record<string, string> {
  const path = join("modules", module, "locale", `${language}.json`);
  const parsed = JSON.parse(readFileSync(path, "utf8")) as { meta?: Record<string, string> };
  return parsed.meta ?? {};
}

describe("plugin component metadata", () => {
  it("gives every dsh-pstack module a localized title and description", () => {
    for (const module of MODULES) {
      const languages = moduleLanguages(module);
      expect(languages).toEqual(expect.arrayContaining(["en", "zh"]));
      const keys = languages.map((language) => Object.keys(meta(module, language)).sort());
      for (const language of languages) {
        const copy = meta(module, language);
        expect(copy.title).not.toBe("");
        expect(copy.description).not.toBe("");
      }
      for (const keySet of keys) expect(keySet).toEqual(keys[0]);
    }
  });

  it("exports one wildcard locale path for every module and language", () => {
    expect(MANIFEST.exports["./locale/*.json"]).toBe("./locale/*.json");
    for (const language of LANGUAGES) {
      expect(MANIFEST.exports[`./*/locale/${language}.json`]).toBe(
        `./modules/*/locale/${language}.json`,
      );
    }
    expect(MANIFEST.exports["./*"]).toBeUndefined();
  });
});
