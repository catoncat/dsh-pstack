/** Copy for the pstack plugin configuration dialog. */

const en = {
  configureAction: "pstack settings",
  dialogTitle: "pstack configuration",
  tabPlugins: "Recommended plugins",
  tabRoles: "Role models",
} as const;

const zh = {
  configureAction: "pstack 设置",
  dialogTitle: "pstack 配置",
  tabPlugins: "推荐插件",
  tabRoles: "角色模型",
} as const;

export type ConfigKey = keyof typeof en;

export const config = { en, zh } as const;
