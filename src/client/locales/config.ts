/** Copy for the pstack plugin configuration dialog. */

const en = {
  configureAction: "Configure",
  dialogTitle: "Configure Pstack",
  tabsLabel: "Configuration sections",
  tabPlugins: "Recommended plugins",
  tabRoles: "Role models",
  toolPreparing: "Delegating…",
  toolRunning: "Running",
  toolDone: "Started",
  toolFailed: "Failed",
  toolStopped: "Stopped",
} as const;

const zh = {
  configureAction: "配置",
  dialogTitle: "配置 Pstack",
  tabsLabel: "配置分区",
  tabPlugins: "推荐插件",
  tabRoles: "角色模型",
  toolPreparing: "正在委派…",
  toolRunning: "运行中",
  toolDone: "已开始",
  toolFailed: "失败",
  toolStopped: "已停止",
} as const satisfies Record<keyof typeof en, string>;

export type ConfigKey = keyof typeof en;

export const config = { en, zh } as const;
