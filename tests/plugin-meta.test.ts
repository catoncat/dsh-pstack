import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vite-plus/test";

const MODULES = ["models", "role-service", "role-catalog", "subagent", "render", "preset"] as const;

function meta(module: string, language: "en" | "zh"): Record<string, string> {
  const path = join("locale", module, `${language}.json`);
  const parsed = JSON.parse(readFileSync(path, "utf8")) as { meta?: Record<string, string> };
  return parsed.meta ?? {};
}

describe("plugin component metadata", () => {
  it("gives every dsh-pstack module a localized title and description", () => {
    for (const module of MODULES) {
      const en = meta(module, "en");
      const zh = meta(module, "zh");
      expect(en.title).not.toBe("");
      expect(en.description).not.toBe("");
      expect(zh.title).not.toBe("");
      expect(zh.description).not.toBe("");
      expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
    }
  });
});
