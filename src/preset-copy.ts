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
    name: "pstack poteto-mode",
    description:
      "Root pstack preset. Keeps the full poteto-mode skill in the system prompt with the standard tools and pstack_subagent as the only direct spawn path.",
  },
  "poteto-mode-creator": {
    name: "pstack poteto-mode creator",
    description:
      "Root pstack preset based on Creator mode. Keeps the full poteto-mode skill in the system prompt with tool-cordis, agent-preset skills, and pstack_subagent as the only direct spawn path.",
  },
  "poteto-agent": {
    name: "pstack poteto-agent",
    description:
      "pstack implementation delegate. Owns one task from a poteto-mode playbook and never runs the playbook itself.",
  },
  "comment-sicko": {
    name: "pstack comment-sicko",
    description:
      "Comment reviewer. Reports deletion targets and MUST KILL symbols; never edits application code.",
  },
  readonly: {
    name: "pstack readonly",
    description:
      "Read-only research delegate. Reads, searches, and runs read-only commands; never edits files.",
  },
};

const ZH: Record<string, PresetCopy> = {
  "poteto-mode": {
    name: "pstack Poteto 模式",
    description:
      "pstack 根预设。把完整的 poteto-mode 技能常驻系统提示，使用标准工具，并以 pstack_subagent 作为唯一直接派发入口。",
  },
  "poteto-mode-creator": {
    name: "pstack Poteto 创造模式",
    description:
      "基于创造模式的 pstack 根预设。把完整的 poteto-mode 技能常驻系统提示，使用 tool-cordis、agent-preset 技能，并以 pstack_subagent 作为唯一直接派发入口。",
  },
  "poteto-agent": {
    name: "pstack Poteto 实现代理",
    description:
      "pstack 实现型委派代理。负责 poteto-mode playbook 中的一个任务，不运行 playbook 本身。",
  },
  "comment-sicko": {
    name: "pstack 评论审查代理",
    description: "评论审查代理。报告删除目标和 MUST KILL 符号，绝不修改应用代码。",
  },
  readonly: {
    name: "pstack 只读研究代理",
    description: "只读研究委派代理。读取、搜索并运行只读命令，绝不修改文件。",
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
