/** Display copy for dsh-pstack presets, chosen once from the Web UI language. */

/** Languages dsh-pstack ships copy for. Every other locale falls back to English. */
export type PstackLanguage = "en" | "zh";

/** One preset's display name and description. */
export interface PresetCopy {
  readonly name: string;
  readonly description: string;
}

const EN: Record<string, PresetCopy> = {
  "poteto-mode": {
    name: "Poteto mode",
    description:
      "Keep the full poteto-mode workflow in the system prompt for sustained, disciplined work.",
  },
  "poteto-mode-creator": {
    name: "Poteto Creator mode",
    description: "Keep the poteto-mode workflow in Creator mode while extending DSH.",
  },
  "poteto-agent": {
    name: "Implementation agent",
    description: "Implementation delegate that follows poteto-mode discipline for one task.",
  },
  "comment-sicko": {
    name: "Comment review",
    description: "Review comments and report deletion targets and symbols that need refactoring.",
  },
  readonly: {
    name: "Read-only research",
    description: "Read-only research delegate that gathers evidence without editing files.",
  },
};

const ZH: Record<string, PresetCopy> = {
  "poteto-mode": {
    name: "Poteto 模式",
    description: "把完整的 poteto-mode 工作流常驻系统提示，适合需要持续遵循同一套纪律的任务。",
  },
  "poteto-mode-creator": {
    name: "Poteto 创造模式",
    description: "在创造模式中常驻 poteto-mode 工作流，适合需要同时扩展 DSH 的任务。",
  },
  "poteto-agent": {
    name: "实现代理",
    description: "实现型子代理，按 poteto-mode 的纪律完成单个任务。",
  },
  "comment-sicko": {
    name: "评论审查",
    description: "审查评论，报告删除目标和需要重构的符号。",
  },
  readonly: {
    name: "只读研究",
    description: "只读研究代理，收集证据但不修改文件。",
  },
};

/** Preset copy keyed by language, then preset id. */
export const PRESET_COPY: Record<PstackLanguage, Record<string, PresetCopy>> = {
  en: EN,
  zh: ZH,
};

/** Map one BCP 47 locale to the supported display language. */
export function presetLanguage(locale: string | undefined): PstackLanguage {
  const primary = locale?.trim().toLowerCase().split("-")[0];
  return primary === "zh" ? "zh" : "en";
}

/** Read one preset's copy, or undefined when the id is not shipped by this package. */
export function presetCopyFor(id: string, language: PstackLanguage): PresetCopy | undefined {
  return PRESET_COPY[language][id];
}
