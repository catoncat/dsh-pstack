/** Copy for the recommended plugins page. */

const en = {
  pluginsTitle: "Recommended plugins",
  pluginsSubtitle:
    "Official DSH plugins that complement pstack. Toggle them here; a missing optional package must be installed first.",
  loadFailed: "Could not read plugin status: {message}",
  pluginEnabled: "Enabled",
  pluginDisabled: "Disabled",
  pluginMissing: "Not installed",
  pluginUnavailable: "Unavailable",
  enablePlugin: "Enable",
  disablePlugin: "Disable",
  pluginChangeFailed: "Could not change {name}: {reason}",
  recommendedForgeTitle: "Change requests & worktrees",
  recommendedForgeDescription:
    "Track GitHub PRs, checks, reviews, and local worktrees beside the conversation.",
  recommendedSessionSearchTitle: "Session search",
  recommendedSessionSearchDescription: "Search earlier sessions and inspect their events.",
  recommendedTerminalTitle: "Persistent terminals",
  recommendedTerminalDescription: "Keep PTY terminals alive for CLI and TUI verification.",
  recommendedRalphTitle: "Ralph loop",
  recommendedRalphDescription: "Run a foreground fresh-agent loop with structured handoff.",
} as const;

const zh = {
  pluginsTitle: "推荐插件",
  pluginsSubtitle: "与 pstack 配合的 DSH 官方插件。可在这里启用或停用；缺失的可选包需要先安装。",
  loadFailed: "无法读取插件状态：{message}",
  pluginEnabled: "已启用",
  pluginDisabled: "未启用",
  pluginMissing: "未安装",
  pluginUnavailable: "不可用",
  enablePlugin: "启用",
  disablePlugin: "停用",
  pluginChangeFailed: "无法修改 {name}：{reason}",
  recommendedForgeTitle: "变更请求与工作树",
  recommendedForgeDescription: "在会话侧边栏跟踪 GitHub PR、检查、评审和本地工作树。",
  recommendedSessionSearchTitle: "会话搜索",
  recommendedSessionSearchDescription: "搜索历史会话并检查其中的事件。",
  recommendedTerminalTitle: "持久终端",
  recommendedTerminalDescription: "保留 PTY 终端，用于 CLI 和 TUI 验证。",
  recommendedRalphTitle: "Ralph 循环",
  recommendedRalphDescription: "运行带结构化交接的前台 fresh-agent 循环。",
} as const;

export type PluginsKey = keyof typeof en;

export const plugins = { en, zh } as const;
