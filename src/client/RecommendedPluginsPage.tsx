/** Recommended official plugins for the pstack plugin configuration dialog. */

import { useEffect, useState, type CSSProperties, type ReactElement } from "react";

import type { PstackLocaleKey } from "./locales.ts";

export type Translate = (key: PstackLocaleKey, vars?: Record<string, string | number>) => string;

export interface BundleView {
  readonly name: string;
  readonly description?: string;
  readonly enabled: boolean;
  readonly installed: boolean;
  readonly availability: string;
  readonly error?: { readonly code?: string; readonly diagnostic?: string };
  readonly readOnlyReason?: string;
}

export interface PluginManagerApi {
  listBundles(): Promise<readonly BundleView[]>;
  setBundleEnabled(name: string, enabled: boolean): Promise<void>;
}

const RECOMMENDED_PLUGINS = [
  {
    name: "@deepseek-ai/dsh-experimental-forge-bundle",
    title: "Change requests & worktrees",
    titleZh: "变更请求与工作树",
    description: "Track GitHub PRs, checks, reviews, and local worktrees beside the conversation.",
    descriptionZh: "在会话侧边栏跟踪 GitHub PR、检查、评审和本地工作树。",
  },
  {
    name: "@deepseek-ai/dsh-experimental-session-search",
    title: "Session search",
    titleZh: "会话搜索",
    description: "Search earlier sessions and inspect their events.",
    descriptionZh: "搜索历史会话并检查其中的事件。",
  },
  {
    name: "@deepseek-ai/dsh-experimental-terminal-bundle",
    title: "Persistent terminals",
    titleZh: "持久终端",
    description: "Keep PTY terminals alive for CLI and TUI verification.",
    descriptionZh: "保留 PTY 终端，用于 CLI 和 TUI 验证。",
  },
  {
    name: "@deepseek-ai/dsh-experimental-ralph-bundle",
    title: "Ralph loop",
    titleZh: "Ralph 循环",
    description: "Run a foreground fresh-agent loop with structured handoff.",
    descriptionZh: "运行带结构化交接的前台 fresh-agent 循环。",
  },
] as const;

export function RecommendedPluginsView(props: {
  api: PluginManagerApi | undefined;
  t: Translate;
}): ReactElement {
  const [bundles, setBundles] = useState<readonly BundleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState<string | undefined>();
  const [messages, setMessages] = useState<Record<string, string>>({});
  const { api, t } = props;

  const load = (): void => {
    if (api === undefined) {
      setLoading(false);
      setError(t("loadFailed", { message: "plugin manager unavailable" }));
      return;
    }
    setLoading(true);
    setError(undefined);
    api
      .listBundles()
      .then(setBundles)
      .catch((reason: unknown) => setError(t("loadFailed", { message: messageOf(reason) })))
      .finally(() => setLoading(false));
  };

  useEffect(load, [api, t]);

  const toggle = (bundle: BundleView): void => {
    if (api === undefined) return;
    setBusy(bundle.name);
    setMessages((current) => ({ ...current, [bundle.name]: "" }));
    api
      .setBundleEnabled(bundle.name, !bundle.enabled)
      .then(() => load())
      .catch((reason: unknown) =>
        setMessages((current) => ({
          ...current,
          [bundle.name]: t("pluginChangeFailed", { name: bundle.name, reason: messageOf(reason) }),
        })),
      )
      .finally(() => setBusy(undefined));
  };

  const byName = new Map(bundles.map((bundle) => [bundle.name, bundle]));

  return (
    <section style={{ display: "grid", gap: 12, color: text }}>
      <header style={{ display: "grid", gap: 4 }}>
        <strong style={{ fontSize: 14 }}>{t("pluginsTitle")}</strong>
        <span style={{ color: secondary, fontSize: 12 }}>{t("pluginsSubtitle")}</span>
      </header>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          style={buttonStyle()}
          onClick={load}
          disabled={loading || busy !== undefined}
        >
          {t("refresh")}
        </button>
        {loading ? <span style={{ color: secondary, fontSize: 12 }}>{t("loading")}</span> : null}
      </div>
      {error === undefined ? null : (
        <div style={{ color: "var(--dsw-alias-state-error-primary)", fontSize: 12 }}>{error}</div>
      )}
      <div style={{ display: "grid", gap: 8 }}>
        {RECOMMENDED_PLUGINS.map((recommended) => {
          const bundle = byName.get(recommended.name);
          const status = bundleStatus(bundle, t);
          const switchable =
            bundle !== undefined &&
            bundle.installed &&
            bundle.error === undefined &&
            bundle.readOnlyReason === undefined;
          return (
            <article
              key={recommended.name}
              style={{
                display: "grid",
                gap: 6,
                padding: 12,
                border: `1px solid ${border}`,
                borderRadius: 10,
                background: surface,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong style={{ fontSize: 13 }}>
                  {recommended.title} · {recommended.titleZh}
                </strong>
                <span style={{ color: secondary, fontSize: 12 }}>{status}</span>
              </div>
              <div style={{ color: secondary, fontSize: 12 }}>
                {recommended.description}
                <br />
                {recommended.descriptionZh}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <code style={{ color: secondary, fontSize: 11 }}>{recommended.name}</code>
                <button
                  type="button"
                  style={buttonStyle(bundle?.enabled !== true)}
                  disabled={!switchable || busy === bundle.name}
                  onClick={() => (bundle === undefined ? undefined : toggle(bundle))}
                >
                  {busy !== undefined && busy === bundle?.name
                    ? t("saving")
                    : bundle?.enabled === true
                      ? t("disablePlugin")
                      : t("enablePlugin")}
                </button>
              </div>
              {messages[recommended.name] ? (
                <div style={{ color: "var(--dsw-alias-state-error-primary)", fontSize: 12 }}>
                  {messages[recommended.name]}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function bundleStatus(bundle: BundleView | undefined, t: Translate): string {
  if (bundle === undefined) return t("pluginMissing");
  if (bundle.error !== undefined || !bundle.installed || bundle.availability === "missing") {
    return t("pluginUnavailable");
  }
  return bundle.enabled ? t("pluginEnabled") : t("pluginDisabled");
}

const text = "var(--dsw-alias-label-primary)";
const secondary = "var(--dsw-alias-label-secondary)";
const border = "var(--dsw-alias-border-l3)";
const surface = "var(--dsw-alias-bg-layer-1)";

function buttonStyle(primary = false): CSSProperties {
  return {
    height: 28,
    padding: "0 10px",
    border: `1px solid ${primary ? "transparent" : border}`,
    borderRadius: 8,
    background: primary ? "var(--dsw-alias-brand-primary)" : "transparent",
    color: primary ? "var(--dsw-alias-label-primary-foreground)" : text,
    cursor: "pointer",
    font: "inherit",
  };
}

function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}
