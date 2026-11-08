/** Plugin-detail action and configuration dialog for dsh-pstack. */

import { useCallback, useEffect, useId, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import type { PropsRuntime } from "@deepseek-ai/dsh-client-ui-slots";
import type {} from "@deepseek-ai/dsh-client-ui-plugin-manager/client";

import { IconClose, IconSettings } from "./icons.tsx";
import { RecommendedPluginsView, type PluginManagerApi } from "./RecommendedPluginsPage.tsx";
import { RoleSettingsView, type RoleSettingsApi } from "./RoleSettingsPage.tsx";
import { ensurePstackStyles } from "./styles.ts";
import { Button, IconButton, SegmentedTabs, confirmDiscard } from "./ui.tsx";
import type { PstackTranslations } from "./locales/index.ts";

ensurePstackStyles();

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export interface PstackConfigDialogProps {
  readonly roleApi: RoleSettingsApi;
  readonly pluginApi: PluginManagerApi | undefined;
  readonly translations: PstackTranslations;
  readonly onClose: () => void;
}

type ConfigTab = "plugins" | "roles";

export function PstackConfigDialog(props: PstackConfigDialogProps): ReactElement | null {
  const [tab, setTab] = useState<ConfigTab>("plugins");
  const [visited, setVisited] = useState<ReadonlySet<ConfigTab>>(
    () => new Set<ConfigTab>(["plugins"]),
  );
  const [rolesDirty, setRolesDirty] = useState(false);
  const titleId = useId();
  const tabsId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const { roleApi, pluginApi, translations, onClose } = props;

  const dirtyRef = useRef(false);
  useEffect(() => {
    dirtyRef.current = rolesDirty;
  }, [rolesDirty]);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const requestClose = useCallback(() => {
    if (dirtyRef.current && !confirmDiscard(translations.roles("confirmDiscardChanges"))) {
      return;
    }
    onCloseRef.current();
  }, [translations]);

  const selectTab = (next: ConfigTab): void => {
    setTab(next);
    setVisited((current) => (current.has(next) ? current : new Set([...current, next])));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (panel === null) return;
      // Skip the inactive panel: its subtree carries `hidden`, so its controls are not tabbable.
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => element.closest("[hidden]") === null,
      );
      if (focusables.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;
      const outside = active === null || !panel.contains(active);
      if (event.shiftKey) {
        if (active === first || outside) {
          event.preventDefault();
          last.focus();
        }
        return;
      }
      if (active === last || outside) {
        event.preventDefault();
        first.focus();
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [requestClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="pstack-overlay" role="presentation">
      <div className="pstack-mask" aria-hidden="true" onClick={requestClose} />
      <div
        className="pstack-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panelRef}
      >
        <header className="pstack-header">
          <div>
            <h2 className="pstack-title" id={titleId}>
              {translations.config("dialogTitle")}
            </h2>
          </div>
          <IconButton
            label={translations.common("close")}
            className="pstack-icon-btn-plain"
            onClick={requestClose}
            autoFocus
          >
            <IconClose size={14} />
          </IconButton>
        </header>
        <div className="pstack-tabs-row">
          <SegmentedTabs
            label={translations.config("tabsLabel")}
            value={tab}
            onChange={selectTab}
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
                panelId: visited.has("roles") ? `${tabsId}-roles-panel` : undefined,
              },
            ]}
          />
        </div>
        <main className="pstack-body">
          {visited.has("plugins") ? (
            <div
              hidden={tab !== "plugins"}
              id={`${tabsId}-plugins-panel`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-plugins`}
            >
              <RecommendedPluginsView api={pluginApi} translations={translations} />
            </div>
          ) : null}
          {visited.has("roles") ? (
            <div
              hidden={tab !== "roles"}
              id={`${tabsId}-roles-panel`}
              role="tabpanel"
              aria-labelledby={`${tabsId}-roles`}
            >
              <RoleSettingsView
                api={roleApi}
                translations={translations}
                onDirtyChange={setRolesDirty}
              />
            </div>
          ) : null}
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
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const wasOpen = useRef(false);

    useEffect(() => {
      if (open) return;
      if (!wasOpen.current) return;
      wasOpen.current = false;
      // Return focus where it started so keyboard users are not dropped at document top.
      triggerRef.current?.focus();
    }, [open]);

    if (props.subject.kind !== "bundle" || props.subject.pkg.name !== "dsh-pstack") return null;
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          icon={<IconSettings size={13} />}
          onClick={(event) => {
            triggerRef.current = event.currentTarget;
            wasOpen.current = true;
            setOpen(true);
          }}
        >
          {translations.config("configureAction")}
        </Button>
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
