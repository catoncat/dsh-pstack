/** Plugin-detail action and configuration dialog for dsh-pstack. */

import { useEffect, useId, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import type { PropsRuntime } from "@deepseek-ai/dsh-client-ui-slots";
import type {} from "@deepseek-ai/dsh-client-ui-plugin-manager/client";

import { IconClose, IconSettings } from "./icons.tsx";
import { RecommendedPluginsView, type PluginManagerApi } from "./RecommendedPluginsPage.tsx";
import { RoleSettingsView, type RoleSettingsApi } from "./RoleSettingsPage.tsx";
import { ensurePstackStyles } from "./styles.ts";
import { IconButton, SegmentedTabs } from "./ui.tsx";
import type { PstackTranslations } from "./locales/index.ts";

ensurePstackStyles();

export interface PstackConfigDialogProps {
  readonly roleApi: RoleSettingsApi;
  readonly pluginApi: PluginManagerApi | undefined;
  readonly translations: PstackTranslations;
  readonly onClose: () => void;
}

type ConfigTab = "plugins" | "roles";

export function PstackConfigDialog(props: PstackConfigDialogProps): ReactElement | null {
  const [tab, setTab] = useState<ConfigTab>("plugins");
  const titleId = useId();
  const tabsId = useId();
  const { roleApi, pluginApi, translations, onClose } = props;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="pstack-overlay" role="presentation">
      <div className="pstack-mask" aria-hidden="true" onClick={onClose} />
      <div
        className="pstack-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="pstack-header">
          <div>
            <h2 className="pstack-title" id={titleId}>
              {translations.config("dialogTitle")}
            </h2>
          </div>
          <IconButton label={translations.common("close")} onClick={onClose} autoFocus>
            <IconClose size={14} />
          </IconButton>
        </header>
        <div className="pstack-tabs-row">
          <SegmentedTabs
            label={translations.config("tabsLabel")}
            value={tab}
            onChange={setTab}
            items={[
              {
                value: "plugins",
                label: translations.config("tabPlugins"),
                id: `${tabsId}-plugins`,
                panelId: `${tabsId}-plugins-panel`,
              },
              {
                value: "roles",
                label: translations.config("tabRoles"),
                id: `${tabsId}-roles`,
                panelId: `${tabsId}-roles-panel`,
              },
            ]}
          />
        </div>
        <main
          className="pstack-body"
          role="tabpanel"
          id={`${tabsId}-${tab}-panel`}
          aria-labelledby={`${tabsId}-${tab}`}
        >
          {tab === "plugins" ? (
            <RecommendedPluginsView api={pluginApi} translations={translations} />
          ) : (
            <RoleSettingsView api={roleApi} translations={translations} />
          )}
        </main>
      </div>
    </div>,
    document.body,
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
        <button
          type="button"
          className="pstack-btn pstack-btn-outline"
          onClick={() => setOpen(true)}
        >
          <IconSettings size={14} />
          <span>{translations.config("configureAction")}</span>
        </button>
        {open ? (
          <PstackConfigDialog
            roleApi={roleApi}
            pluginApi={pluginApi}
            translations={translations}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </>
    );
  };
}
