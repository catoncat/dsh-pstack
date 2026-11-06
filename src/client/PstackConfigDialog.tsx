/** Plugin-detail action and configuration dialog for dsh-pstack. */

import { useState, type CSSProperties, type ReactElement } from "react";
import { createPortal } from "react-dom";
import type { PropsRuntime } from "@deepseek-ai/dsh-client-ui-slots";
import type {} from "@deepseek-ai/dsh-client-ui-plugin-manager/client";

import { RecommendedPluginsView, type PluginManagerApi } from "./RecommendedPluginsPage.tsx";
import { RoleSettingsView, type RoleSettingsApi } from "./RoleSettingsPage.tsx";
import type { PstackTranslations } from "./locales/index.ts";

export interface PstackConfigDialogProps {
  readonly roleApi: RoleSettingsApi;
  readonly pluginApi: PluginManagerApi | undefined;
  readonly translations: PstackTranslations;
  readonly onClose: () => void;
}

export function PstackConfigDialog(props: PstackConfigDialogProps): ReactElement {
  const [tab, setTab] = useState<"plugins" | "roles">("plugins");
  const { roleApi, pluginApi, translations, onClose } = props;
  return (
    <div
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-label={translations.config("dialogTitle")}
    >
      <button
        type="button"
        aria-label={translations.common("close")}
        style={maskStyle}
        onClick={onClose}
      />
      <div style={panelStyle}>
        <header style={headerStyle}>
          <strong>{translations.config("dialogTitle")}</strong>
          <button type="button" style={closeStyle} onClick={onClose}>
            {translations.common("close")}
          </button>
        </header>
        <nav style={navStyle}>
          <TabButton
            active={tab === "plugins"}
            onClick={() => setTab("plugins")}
            label={translations.config("tabPlugins")}
          />
          <TabButton
            active={tab === "roles"}
            onClick={() => setTab("roles")}
            label={translations.config("tabRoles")}
          />
        </nav>
        <main style={bodyStyle}>
          {tab === "plugins" ? (
            <RecommendedPluginsView api={pluginApi} translations={translations} />
          ) : (
            <RoleSettingsView api={roleApi} translations={translations} />
          )}
        </main>
      </div>
    </div>
  );
}

/** Create the action component registered into `plugins.detail.actions`. */
export function createPstackConfigAction(
  roleApi: RoleSettingsApi,
  pluginApi: PluginManagerApi | undefined,
  translations: PstackTranslations,
): (props: PropsRuntime<"plugins.detail.actions">) => ReactElement | null {
  return function PstackConfigAction(
    props: PropsRuntime<"plugins.detail.actions">,
  ): ReactElement | null {
    const [open, setOpen] = useState(false);
    if (props.subject.kind !== "bundle" || props.subject.pkg.name !== "dsh-pstack") return null;
    return (
      <>
        <button type="button" style={actionStyle} onClick={() => setOpen(true)}>
          {translations.config("configureAction")}
        </button>
        {open && typeof document !== "undefined"
          ? createPortal(
              <PstackConfigDialog
                roleApi={roleApi}
                pluginApi={pluginApi}
                translations={translations}
                onClose={() => setOpen(false)}
              />,
              document.body,
            )
          : null}
      </>
    );
  };
}

function TabButton(props: { active: boolean; onClick: () => void; label: string }): ReactElement {
  return (
    <button type="button" style={tabStyle(props.active)} onClick={props.onClick}>
      {props.label}
    </button>
  );
}

const text = "var(--dsw-alias-label-primary)";
const secondary = "var(--dsw-alias-label-secondary)";
const border = "var(--dsw-alias-border-l3)";

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const maskStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  border: 0,
  background: "var(--dsw-alias-bg-mask-1)",
  cursor: "default",
};
const panelStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "grid",
  gridTemplateRows: "auto auto minmax(0, 1fr)",
  width: 920,
  height: "min(820px, calc(100vh - 48px))",
  maxWidth: "calc(100vw - 48px)",
  borderRadius: "var(--dsw-radius-panel)",
  overflow: "hidden",
  background: "var(--dsw-alias-bg-layer-2)",
  color: text,
  boxShadow: "var(--dsw-elevation-prominent)",
};
const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 18px",
  borderBottom: `1px solid ${border}`,
};
const navStyle: CSSProperties = { display: "flex", gap: 4, padding: "8px 14px 0" };
const bodyStyle: CSSProperties = { minHeight: 0, overflow: "auto", padding: 18 };
const closeStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  color: secondary,
  cursor: "pointer",
  font: "inherit",
};
const actionStyle: CSSProperties = {
  height: 28,
  padding: "0 12px",
  border: `1px solid ${border}`,
  borderRadius: 8,
  background: "transparent",
  color: text,
  cursor: "pointer",
  font: "inherit",
};

function tabStyle(active: boolean): CSSProperties {
  return {
    padding: "8px 12px",
    border: "none",
    borderBottom: active ? "2px solid var(--dsw-alias-brand-primary)" : "2px solid transparent",
    background: "transparent",
    color: active ? text : secondary,
    cursor: "pointer",
    font: "inherit",
  };
}
