import { readFileSync } from "node:fs";

import type { Context } from "@deepseek-ai/cordis";
import type { PresetDefinition } from "@deepseek-ai/dsh-agent-preset-registry";
import { describe, expect, it } from "vite-plus/test";

import { PRESET_COPY, presetCopyFor, presetLanguage } from "../src/preset-copy.ts";
import { localizePresetConfig, readWebUiLocale } from "../src/preset.ts";

const PATCH = readFileSync("cordis.patch.yml", "utf8");

const PRESET_IDS = [
  "poteto-mode",
  "poteto-mode-creator",
  "poteto-agent",
  "comment-sicko",
  "readonly",
] as const;

function presetBlock(id: string): string[] {
  const lines = PATCH.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `    - id: preset-${id}`);
  if (start < 0) throw new Error(`preset ${id} not found`);
  const end = lines.findIndex((line, index) => index > start && line.startsWith("    - id: "));
  return lines.slice(start, end < 0 ? undefined : end);
}

function configField(block: readonly string[], field: string): string | undefined {
  const config = block.findIndex((line) => line === "      config:");
  if (config < 0) return undefined;
  const line = block
    .slice(config + 1)
    .find((candidate) => candidate.startsWith(`        ${field}:`));
  return line?.replace(/^.*?:\s*/, "").trim();
}

function contextWithLocale(preference?: string): Context {
  return {
    get(name: string) {
      if (name !== "settings") return undefined;
      return {
        describe: () => [
          {
            ns: "locale",
            value: preference === undefined ? {} : { preference },
          },
        ],
      };
    },
  } as unknown as Context;
}

function preset(id: string): PresetDefinition {
  return {
    id,
    name: `source ${id}`,
    description: `source description for ${id}`,
    plugins: [],
  };
}

describe("presetLanguage", () => {
  it("maps Chinese and everything else to the two shipped languages", () => {
    expect(presetLanguage("zh")).toBe("zh");
    expect(presetLanguage("zh-CN")).toBe("zh");
    expect(presetLanguage("en-US")).toBe("en");
    expect(presetLanguage("ja")).toBe("en");
    expect(presetLanguage(undefined)).toBe("en");
  });
});

describe("preset copy", () => {
  it("ships English and Chinese copy for every preset", () => {
    for (const id of PRESET_IDS) {
      expect(PRESET_COPY.en[id]?.name).not.toBe("");
      expect(PRESET_COPY.en[id]?.description).not.toBe("");
      expect(PRESET_COPY.zh[id]?.name).not.toBe("");
      expect(PRESET_COPY.zh[id]?.description).not.toBe("");
      expect(presetCopyFor(id, "zh")?.name).toBe(PRESET_COPY.zh[id]?.name);
    }
  });

  it("keeps the English copy in sync with the preset declarations", () => {
    for (const id of PRESET_IDS) {
      const block = presetBlock(id);
      expect(PRESET_COPY.en[id]?.name).toBe(configField(block, "name"));
      expect(PRESET_COPY.en[id]?.description).toBe(configField(block, "description"));
    }
  });

  it("routes every preset row through the localized wrapper", () => {
    expect(PATCH.match(/name: "dsh-pstack\/preset"/g)).toHaveLength(PRESET_IDS.length);
  });
});

describe("localizePresetConfig", () => {
  it("reads locale.preference from the Web UI settings", () => {
    expect(readWebUiLocale(contextWithLocale("zh-CN"))).toBe("zh-CN");
    expect(readWebUiLocale(contextWithLocale())).toBeUndefined();
    expect(readWebUiLocale({ get: () => undefined } as unknown as Context)).toBeUndefined();
  });

  it("replaces the preset copy when the preference is Chinese", () => {
    const localized = localizePresetConfig(contextWithLocale("zh"), preset("poteto-mode"));
    expect(localized.name).toBe(PRESET_COPY.zh["poteto-mode"]?.name);
    expect(localized.description).toBe(PRESET_COPY.zh["poteto-mode"]?.description);
  });

  it("uses English copy when the preference is absent or English", () => {
    const expected = {
      ...preset("poteto-mode"),
      name: PRESET_COPY.en["poteto-mode"]?.name,
      description: PRESET_COPY.en["poteto-mode"]?.description,
    };
    expect(localizePresetConfig(contextWithLocale(), preset("poteto-mode"))).toEqual(expected);
    expect(localizePresetConfig(contextWithLocale("en-US"), preset("poteto-mode"))).toEqual(
      expected,
    );
  });

  it("leaves unknown preset ids untouched", () => {
    expect(localizePresetConfig(contextWithLocale("zh"), preset("custom"))).toEqual(
      preset("custom"),
    );
  });
});
