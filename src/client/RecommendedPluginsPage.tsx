/** Related official plugins for the pstack plugin configuration dialog. */

import { useEffect, useState, type ReactElement } from "react";

import {
  IconAlert,
  IconBrowser,
  IconCheck,
  IconCheckCircle,
  IconGitBranch,
  IconMonitor,
  IconPlug,
  IconRefresh,
  IconRepeat,
  IconSearch,
  IconTerminal,
  IconUsers,
  type IconComponent,
} from "./icons.tsx";
import { ensurePstackStyles } from "./styles.ts";
import { Button, IconButton, Spinner, Status, Switch, type StatusTone } from "./ui.tsx";
import type { PstackTranslations, PluginsKey } from "./locales/index.ts";

ensurePstackStyles();

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

type PluginGroupId = "recommended" | "normal" | "conflict";

interface RelatedPlugin {
  readonly name: string;
  readonly titleKey: PluginsKey;
  readonly descriptionKey: PluginsKey;
  readonly icon: IconComponent;
}

interface PluginGroup {
  readonly id: PluginGroupId;
  readonly titleKey: PluginsKey;
  readonly descriptionKey: PluginsKey;
  readonly plugins: readonly RelatedPlugin[];
}

const PLUGIN_GROUPS: readonly PluginGroup[] = [
  {
    id: "recommended",
    titleKey: "groupRecommended",
    descriptionKey: "groupRecommendedDescription",
    plugins: [
      {
        name: "@deepseek-ai/dsh-experimental-forge-bundle",
        titleKey: "recommendedForgeTitle",
        descriptionKey: "recommendedForgeDescription",
        icon: IconGitBranch,
      },
      {
        name: "@deepseek-ai/dsh-experimental-session-search",
        titleKey: "recommendedSessionSearchTitle",
        descriptionKey: "recommendedSessionSearchDescription",
        icon: IconSearch,
      },
    ],
  },
  {
    id: "normal",
    titleKey: "groupNormal",
    descriptionKey: "groupNormalDescription",
    plugins: [
      {
        name: "@deepseek-ai/dsh-browser-use",
        titleKey: "recommendedBrowserTitle",
        descriptionKey: "recommendedBrowserDescription",
        icon: IconBrowser,
      },
      {
        name: "@deepseek-ai/dsh-cua-bundle",
        titleKey: "recommendedCuaTitle",
        descriptionKey: "recommendedCuaDescription",
        icon: IconMonitor,
      },
      {
        name: "@deepseek-ai/dsh-experimental-terminal-bundle",
        titleKey: "recommendedTerminalTitle",
        descriptionKey: "recommendedTerminalDescription",
        icon: IconTerminal,
      },
      {
        name: "@deepseek-ai/dsh-mcp-client",
        titleKey: "recommendedMcpTitle",
        descriptionKey: "recommendedMcpDescription",
        icon: IconPlug,
      },
      {
        name: "@deepseek-ai/dsh-experimental-ralph-bundle",
        titleKey: "recommendedRalphTitle",
        descriptionKey: "recommendedRalphDescription",
        icon: IconRepeat,
      },
    ],
  },
  {
    id: "conflict",
    titleKey: "groupConflict",
    descriptionKey: "groupConflictDescription",
    plugins: [
      {
        name: "@deepseek-ai/dsh-experimental-agent-team-profile",
        titleKey: "recommendedAgentTeamTitle",
        descriptionKey: "recommendedAgentTeamDescription",
        icon: IconUsers,
      },
    ],
  },
];

const ALL = "__all__";

export function RecommendedPluginsView(props: {
  api: PluginManagerApi | undefined;
  translations: PstackTranslations;
}): ReactElement {
  const [bundles, setBundles] = useState<readonly BundleView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState<string | undefined>();
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [allMessage, setAllMessage] = useState<
    { tone: "success" | "error"; text: string } | undefined
  >();
  const { api, translations } = props;
  const t = translations.plugins;
  const common = translations.common;

  const load = async (): Promise<void> => {
    if (api === undefined) {
      setLoading(false);
      setError(t("loadFailed", { message: "plugin manager unavailable" }));
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      setBundles(await api.listBundles());
    } catch (reason) {
      setError(t("loadFailed", { message: messageOf(reason) }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [api, t]);

  const byName = new Map(bundles.map((bundle) => [bundle.name, bundle]));
  const available = (bundle: BundleView | undefined): boolean =>
    bundle !== undefined &&
    bundle.availability !== "missing" &&
    bundle.error === undefined &&
    bundle.readOnlyReason === undefined;
  const switchable = (bundle: BundleView | undefined, group: PluginGroupId): boolean =>
    available(bundle) && (group !== "conflict" || bundle?.enabled === true);
  const recommended = PLUGIN_GROUPS.find((group) => group.id === "recommended")!;
  const recommendedEnabled = recommended.plugins.filter(
    (plugin) => byName.get(plugin.name)?.enabled === true,
  ).length;
  const enableable = recommended.plugins.filter((plugin) => {
    const bundle = byName.get(plugin.name);
    return switchable(bundle, "recommended") && bundle?.enabled !== true;
  }).length;

  const toggle = async (bundle: BundleView): Promise<void> => {
    if (api === undefined) return;
    setBusy(bundle.name);
    setAllMessage(undefined);
    setMessages((current) => ({ ...current, [bundle.name]: "" }));
    try {
      await api.setBundleEnabled(bundle.name, !bundle.enabled);
      await load();
    } catch (reason) {
      setMessages((current) => ({
        ...current,
        [bundle.name]: t("pluginChangeFailed", { name: bundle.name, reason: messageOf(reason) }),
      }));
    } finally {
      setBusy(undefined);
    }
  };

  const enableAll = async (): Promise<void> => {
    if (api === undefined) return;
    const targets = recommended.plugins
      .map((plugin) => byName.get(plugin.name))
      .filter(
        (bundle): bundle is BundleView =>
          bundle !== undefined && switchable(bundle, "recommended") && !bundle.enabled,
      );
    if (targets.length === 0) return;
    setBusy(ALL);
    setAllMessage(undefined);
    let failed = 0;
    for (const bundle of targets) {
      try {
        await api.setBundleEnabled(bundle.name, true);
      } catch {
        failed += 1;
      }
    }
    await load();
    setBusy(undefined);
    setAllMessage({
      tone: failed === 0 ? "success" : "error",
      text:
        failed === 0
          ? t("enableAllDone", { count: targets.length })
          : t("enableAllFailed", { count: failed }),
    });
  };

  return (
    <section>
      <header className="pstack-section-head">
        <div>
          <p className="pstack-section-desc">{t("pluginsSubtitle")}</p>
        </div>
        <div className="pstack-section-actions">
          <Status
            tone={
              recommendedEnabled === recommended.plugins.length
                ? "success"
                : recommendedEnabled === 0
                  ? "neutral"
                  : "brand"
            }
            label={t("pluginsSummary", {
              enabled: recommendedEnabled,
              total: recommended.plugins.length,
            })}
          />
          <Button
            variant="outline"
            size="sm"
            icon={busy === ALL ? <Spinner size={13} /> : <IconCheckCircle size={13} />}
            disabled={loading || busy !== undefined || enableable === 0}
            onClick={() => void enableAll()}
          >
            {busy === ALL
              ? t("enableAllBusy")
              : enableable > 0
                ? t("enableAllCount", { count: enableable })
                : recommendedEnabled === recommended.plugins.length
                  ? t("enableAllComplete")
                  : t("enableAll")}
          </Button>
          <IconButton
            label={common("refresh")}
            disabled={loading || busy !== undefined}
            onClick={() => void load()}
          >
            {loading ? <Spinner size={14} /> : <IconRefresh size={14} />}
          </IconButton>
        </div>
      </header>
      {error === undefined ? null : (
        <div className="pstack-notice" data-tone="error">
          <IconAlert size={14} />
          <span>{error}</span>
        </div>
      )}
      {allMessage === undefined ? null : (
        <span
          className="pstack-inline-message"
          data-tone={allMessage.tone}
          style={{ marginBottom: 10 }}
        >
          {allMessage.tone === "success" ? <IconCheck size={12} /> : <IconAlert size={12} />}
          {allMessage.text}
        </span>
      )}
      <div className="pstack-plugin-groups">
        {PLUGIN_GROUPS.map((group) => {
          const enabledInGroup = group.plugins.filter(
            (plugin) => byName.get(plugin.name)?.enabled === true,
          ).length;
          return (
            <section className="pstack-plugin-group" key={group.id}>
              <header className="pstack-plugin-group-head">
                <div>
                  <h4 className="pstack-plugin-group-title">{t(group.titleKey)}</h4>
                  <p className="pstack-plugin-group-desc">{t(group.descriptionKey)}</p>
                </div>
                <Status
                  tone={
                    group.id === "conflict" ? "error" : enabledInGroup > 0 ? "success" : "neutral"
                  }
                  label={`${enabledInGroup}/${group.plugins.length}`}
                />
              </header>
              <ul className="pstack-plugin-list">
                {group.plugins.map((plugin) => {
                  const bundle = byName.get(plugin.name);
                  const status = bundleStatus(bundle, group.id, t);
                  const canSwitch = switchable(bundle, group.id);
                  const title = t(plugin.titleKey);
                  const action = bundle?.enabled === true ? t("disablePlugin") : t("enablePlugin");
                  const PluginIcon = plugin.icon;
                  return (
                    <li key={plugin.name}>
                      <article
                        className="pstack-plugin-card"
                        data-conflict={group.id === "conflict" ? "true" : undefined}
                      >
                        <span className="pstack-plugin-icon">
                          <PluginIcon size={18} />
                        </span>
                        <div className="pstack-plugin-main">
                          <div className="pstack-plugin-title-row">
                            <span className="pstack-plugin-name">{title}</span>
                            <Status
                              tone={status.tone}
                              label={status.label}
                              title={bundle?.error?.diagnostic ?? bundle?.readOnlyReason}
                            />
                          </div>
                          <p className="pstack-plugin-desc">{t(plugin.descriptionKey)}</p>
                          <code className="pstack-plugin-id">{plugin.name}</code>
                          {messages[plugin.name] ? (
                            <span className="pstack-inline-message" data-tone="error">
                              <IconAlert size={12} />
                              {messages[plugin.name]}
                            </span>
                          ) : null}
                        </div>
                        <div className="pstack-plugin-end">
                          <Switch
                            checked={bundle?.enabled === true}
                            disabled={!canSwitch || busy !== undefined}
                            label={`${action} ${title}`}
                            onChange={() =>
                              bundle === undefined ? undefined : void toggle(bundle)
                            }
                          />
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function bundleStatus(
  bundle: BundleView | undefined,
  group: PluginGroupId,
  t: PstackTranslations["plugins"],
): { label: string; tone: StatusTone } {
  if (bundle === undefined || bundle.availability === "missing") {
    return { label: t("pluginMissing"), tone: "warn" };
  }
  if (bundle.error !== undefined) return { label: t("pluginUnavailable"), tone: "error" };
  if (bundle.readOnlyReason !== undefined) {
    return { label: t("pluginReadOnly"), tone: "neutral" };
  }
  if (group === "conflict") return { label: t("pluginConflict"), tone: "error" };
  return bundle.enabled
    ? { label: t("pluginEnabled"), tone: "success" }
    : { label: t("pluginDisabled"), tone: "neutral" };
}

function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}
