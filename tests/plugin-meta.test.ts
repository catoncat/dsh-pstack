import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vite-plus/test";

const MODULES = ["models", "role-service", "role-catalog", "subagent", "render", "preset"] as const;
const MANIFEST = JSON.parse(readFileSync("package.json", "utf8")) as {
  exports: Record<string, string>;
};

function meta(module: string, language: string): Record<string, string> {
  const path = join("modules", module, "locale", `${language}.json`);
  const parsed = JSON.parse(readFileSync(path, "utf8")) as { meta?: Record<string, string> };
  return parsed.meta ?? {};
}

describe("plugin component metadata", () => {
  it("gives every dsh-pstack module a localized title and description", () => {
    for (const module of MODULES) {
      const languages = readdirSync(join("modules", module, "locale"))
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.slice(0, -".json".length));
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
    expect(MANIFEST.exports["./*"]).toBe("./modules/*");
  });
});
