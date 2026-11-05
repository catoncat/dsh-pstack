/** Locale dictionaries for the pstack role configuration page. */

export const NS = "pstackRoles";

const en = {
  title: "Role model configuration",
  subtitle: "Edit $DSH_HOME/pstack-models.mdc. Saving one role changes only that role.",
  file: "File",
  status: "Status",
  statusMissing: "missing",
  statusLoaded: "loaded",
  statusUnreadable: "unreadable",
  budget: "Budget",
  loading: "Loading role configuration…",
  retry: "Retry",
  save: "Save",
  saving: "Saving…",
  saved: "Saved",
  inheritParent: "inherit-parent",
  auto: "auto",
  provider: "Provider",
  model: "Model",
  effort: "Effort",
  effortUnset: "not set",
  roleIndexHint: "A list role keeps its other entries; this form edits the first route.",
  loadFailed: "Could not read the role configuration: {message}",
  saveRejected: "Save rejected: {reason}",
  unreadable: "This file cannot be edited until it becomes readable: {reason}",
  noCatalogue: "The live model directory is unavailable; provider and model lists are empty.",
} as const;

export type PstackRolesKey = keyof typeof en;

declare module "@deepseek-ai/dsh-client-ui-slots" {
  interface LocaleNamespaceMap {
    pstackRoles: PstackRolesKey;
  }
}

export const catalogs = {
  en,
  zh: {
    title: "角色模型配置",
    subtitle: "编辑 $DSH_HOME/pstack-models.mdc。保存一个角色只改动该角色。",
    file: "文件",
    status: "状态",
    statusMissing: "缺失",
    statusLoaded: "已加载",
    statusUnreadable: "不可读",
    budget: "预算",
    loading: "正在读取角色配置…",
    retry: "重试",
    save: "保存",
    saving: "保存中…",
    saved: "已保存",
    inheritParent: "继承父级",
    auto: "自动",
    provider: "提供方",
    model: "模型",
    effort: "推理强度",
    effortUnset: "未指定",
    roleIndexHint: "列表角色会保留其他条目；此表单只编辑第一条路由。",
    loadFailed: "无法读取角色配置：{message}",
    saveRejected: "保存被拒绝：{reason}",
    unreadable: "文件可读之前无法编辑：{reason}",
    noCatalogue: "实时模型目录不可用，提供方与模型列表为空。",
  },
} as const;
