/** Role model configuration page for the pstack plugin dialog. */

import { useEffect, useState, type ReactElement } from "react";

import type { CatalogueResult, ModelEntry } from "../models.ts";
import type {
  RoleFileSnapshot,
  RoleView,
  RouteView,
  SaveRoleRequest,
  SaveRoleResult,
} from "../role-wire.ts";
import {
  IconAlert,
  IconCheck,
  IconInfo,
  IconPlus,
  IconRefresh,
  IconRoute,
  IconSave,
  IconTrash,
  IconUndo,
} from "./icons.tsx";
import { ROLE_COPY } from "./role-copy.ts";
import { ensurePstackStyles } from "./styles.ts";
import { Button, IconButton, Spinner, Status, type StatusTone } from "./ui.tsx";
import type { PstackTranslations } from "./locales/index.ts";

ensurePstackStyles();

export interface RoleSettingsApi {
  status(): Promise<RoleFileSnapshot>;
  catalogue(): Promise<CatalogueResult>;
  save(request: SaveRoleRequest): Promise<SaveRoleResult>;
}

interface RoleDraft {
  readonly routes: RouteView[];
  readonly baseline: readonly RouteView[];
  readonly busy: boolean;
  readonly message?: { readonly tone: "success" | "error"; readonly text: string };
}

type DraftMap = Readonly<Record<string, RoleDraft>>;

interface BulkMessage {
  readonly tone: "success" | "error";
  readonly text: string;
}

export function RoleSettingsView(props: {
  api: RoleSettingsApi;
  translations: PstackTranslations;
}): ReactElement {
  const { api, translations } = props;
  const t = translations.roles;
  const common = translations.common;
  const [snapshot, setSnapshot] = useState<RoleFileSnapshot | undefined>();
  const [catalogue, setCatalogue] = useState<CatalogueResult | undefined>();
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [bulkBusy, setBulkBusy] = useState<"save" | undefined>();
  const [bulkMessage, setBulkMessage] = useState<BulkMessage | undefined>();

  const applySnapshot = (next: RoleFileSnapshot): void => {
    setSnapshot(next);
    setDrafts(Object.fromEntries(next.roles.map((role) => [role.key, draftOf(role)])));
  };

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(undefined);
    setBulkMessage(undefined);
    try {
      const [nextSnapshot, nextCatalogue] = await Promise.all([api.status(), api.catalogue()]);
      applySnapshot(nextSnapshot);
      setCatalogue(nextCatalogue);
    } catch (reason) {
      setError(t("rolesLoadFailed", { message: messageOf(reason) }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [api, t]);

  if (loading && snapshot === undefined) {
    return (
      <div className="pstack-loading">
        <Spinner />
        <span>{t("rolesLoading")}</span>
      </div>
    );
  }
  if (snapshot === undefined) {
    return (
      <div className="pstack-notice" data-tone="error">
        <IconAlert size={14} />
        <span>{error}</span>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          {common("retry")}
        </Button>
      </div>
    );
  }

  const draftFor = (role: RoleView): RoleDraft => drafts[role.key] ?? draftOf(role);
  const dirtyKeys = snapshot.roles
    .filter((role) => isDirty(draftFor(role)))
    .map((role) => role.key);
  const dirtyCount = dirtyKeys.length;
  const anyBusy = Object.values(drafts).some((draft) => draft.busy);
  const anyIncomplete = Object.values(drafts).some((draft) =>
    draft.routes.some(
      (route) =>
        route.kind === "route" && (route.provider.trim() === "" || route.model.trim() === ""),
    ),
  );
  const fileStatus = statusPresentation(snapshot, t);

  const updateRoutes = (key: string, routes: RouteView[]): void => {
    setBulkMessage(undefined);
    setDrafts((current) => {
      const draft = current[key];
      if (draft === undefined) return current;
      return { ...current, [key]: { ...draft, routes, message: undefined } };
    });
  };

  const resetRole = (key: string): void => {
    setBulkMessage(undefined);
    setDrafts((current) => {
      const draft = current[key];
      if (draft === undefined) return current;
      return {
        ...current,
        [key]: {
          ...draft,
          routes: draft.baseline.map((route) => ({ ...route })),
          message: undefined,
          busy: false,
        },
      };
    });
  };

  const resetAll = (): void => {
    setDrafts((current) =>
      Object.fromEntries(
        snapshot.roles.map((role) => {
          const draft = current[role.key] ?? draftOf(role);
          return [
            role.key,
            {
              ...draft,
              routes: draft.baseline.map((route) => ({ ...route })),
              message: undefined,
              busy: false,
            },
          ];
        }),
      ),
    );
    setBulkMessage(undefined);
  };

  const saveRole = async (key: string): Promise<boolean> => {
    const draft = drafts[key];
    if (draft === undefined) return true;
    setDrafts((current) => {
      const currentDraft = current[key];
      if (currentDraft === undefined) return current;
      return {
        ...current,
        [key]: { ...currentDraft, busy: true, message: undefined },
      };
    });
    try {
      const result = await api.save({ key, routes: draft.routes });
      if (result.ok) {
        const savedRole = result.snapshot.roles.find((entry) => entry.key === key);
        setSnapshot(result.snapshot);
        setDrafts((current) => {
          const currentDraft = current[key];
          if (currentDraft === undefined) return current;
          const routes = savedRole === undefined ? draft.routes : routesOf(savedRole);
          return {
            ...current,
            [key]: {
              ...currentDraft,
              routes,
              baseline: routes,
              busy: false,
              message: { tone: "success", text: common("saved") },
            },
          };
        });
        return true;
      }
      setDrafts((current) => {
        const currentDraft = current[key];
        if (currentDraft === undefined) return current;
        return {
          ...current,
          [key]: {
            ...currentDraft,
            busy: false,
            message: { tone: "error", text: t("saveRejected", { reason: result.reason }) },
          },
        };
      });
      return false;
    } catch (reason) {
      setDrafts((current) => {
        const currentDraft = current[key];
        if (currentDraft === undefined) return current;
        return {
          ...current,
          [key]: {
            ...currentDraft,
            busy: false,
            message: { tone: "error", text: t("saveRejected", { reason: messageOf(reason) }) },
          },
        };
      });
      return false;
    }
  };

  const saveAll = async (): Promise<void> => {
    if (dirtyCount === 0 || bulkBusy !== undefined || anyBusy || anyIncomplete) return;
    setBulkBusy("save");
    setBulkMessage(undefined);
    let saved = 0;
    let failed = 0;
    for (const key of dirtyKeys) {
      if (await saveRole(key)) saved += 1;
      else failed += 1;
    }
    setBulkBusy(undefined);
    setBulkMessage(
      failed === 0
        ? { tone: "success", text: t("saveAllDone", { count: saved }) }
        : { tone: "error", text: t("saveAllPartial", { count: saved, failed }) },
    );
  };

  return (
    <section>
      <header className="pstack-section-head">
        <div>
          <p className="pstack-section-desc">{t("rolesSubtitle")}</p>
          <div className="pstack-file-meta">
            <Status tone={fileStatus.tone} label={fileStatus.label} />
            <span>{t("file")}</span>
            <code className="pstack-file-path" title={snapshot.path}>
              {t("filePath")}
            </code>
          </div>
        </div>
        <div className="pstack-section-actions">
          {dirtyCount === 0 ? null : (
            <Status tone="warn" label={t("unsavedCount", { count: dirtyCount })} />
          )}
          <Button
            variant="outline"
            size="sm"
            icon={<IconUndo size={13} />}
            disabled={dirtyCount === 0 || bulkBusy !== undefined || anyBusy || loading}
            onClick={resetAll}
          >
            {t("resetAll")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={bulkBusy === "save" ? <Spinner size={13} /> : <IconSave size={13} />}
            disabled={
              dirtyCount === 0 ||
              bulkBusy !== undefined ||
              anyBusy ||
              anyIncomplete ||
              loading ||
              !snapshot.canSave
            }
            onClick={() => void saveAll()}
          >
            {bulkBusy === "save"
              ? t("savingAll")
              : dirtyCount > 0
                ? t("saveAllCount", { count: dirtyCount })
                : t("saveAll")}
          </Button>
          <IconButton
            label={common("refresh")}
            disabled={loading || bulkBusy !== undefined || anyBusy}
            onClick={() => void load()}
          >
            {loading ? <Spinner size={14} /> : <IconRefresh size={14} />}
          </IconButton>
        </div>
      </header>
      {snapshot.reason === undefined ? null : (
        <div className="pstack-notice" data-tone="error">
          <IconAlert size={14} />
          <span>{t("unreadable", { reason: snapshot.reason })}</span>
        </div>
      )}
      {snapshot.status === "missing" ? (
        <div className="pstack-notice">
          <IconInfo size={14} />
          <span>{t("fileMissingHint")}</span>
        </div>
      ) : null}
      {snapshot.issues.length === 0 ? null : (
        <div className="pstack-notice" data-tone="error">
          <IconAlert size={14} />
          <ul className="pstack-notice-list">
            {snapshot.issues.map((issue, index) => (
              <li key={`${issue.line ?? "x"}-${index}`}>
                {issue.line === undefined
                  ? issue.message
                  : t("issueAtLine", { line: issue.line, message: issue.message })}
              </li>
            ))}
          </ul>
        </div>
      )}
      {bulkMessage === undefined ? null : (
        <span className="pstack-inline-message" data-tone={bulkMessage.tone}>
          {bulkMessage.tone === "success" ? <IconCheck size={12} /> : <IconAlert size={12} />}
          {bulkMessage.text}
        </span>
      )}
      <div className="pstack-role-list">
        {snapshot.roles.map((role) => (
          <RoleCard
            key={role.key}
            role={role}
            draft={draftFor(role)}
            catalogue={catalogue}
            translations={translations}
            disabled={!snapshot.canSave || bulkBusy !== undefined || anyBusy}
            onRoutesChange={(routes) => updateRoutes(role.key, routes)}
            onSave={() => void saveRole(role.key)}
            onReset={() => resetRole(role.key)}
          />
        ))}
      </div>
    </section>
  );
}

function RoleCard(props: {
  role: RoleView;
  draft: RoleDraft;
  catalogue: CatalogueResult | undefined;
  translations: PstackTranslations;
  disabled: boolean;
  onRoutesChange: (routes: RouteView[]) => void;
  onSave: () => void;
  onReset: () => void;
}): ReactElement {
  const { role, draft, catalogue, translations, disabled, onRoutesChange, onSave, onReset } = props;
  const t = translations.roles;
  const common = translations.common;
  const copy = ROLE_COPY[role.key];
  const name = copy === undefined ? role.key : t(copy.nameKey);
  const description = copy === undefined ? "" : t(copy.descriptionKey);
  const dirty = isDirty(draft);
  const controlsDisabled = disabled || draft.busy;
  const incomplete = draft.routes.some(
    (route) =>
      route.kind === "route" && (route.provider.trim() === "" || route.model.trim() === ""),
  );
  const status =
    role.issues.length > 0
      ? { tone: "error" as StatusTone, label: t("roleInvalid") }
      : role.configured
        ? { tone: "success" as StatusTone, label: t("roleConfigured") }
        : { tone: "neutral" as StatusTone, label: t("roleMissing") };
  return (
    <section className="pstack-role-card" data-dirty={dirty ? "true" : undefined}>
      <header className="pstack-role-head">
        <span className="pstack-role-glyph">
          <IconRoute size={16} />
        </span>
        <div className="pstack-role-title">
          <div className="pstack-role-name-row">
            <h4 className="pstack-role-name">{name}</h4>
            <code className="pstack-code-chip">{role.key}</code>
            <span
              className="pstack-tag"
              title={role.shape === "single" ? t("singleRouteHint") : undefined}
            >
              {role.shape === "single" ? t("singleRoute") : t("listRoute")}
            </span>
          </div>
          {description === "" ? null : <p className="pstack-role-desc">{description}</p>}
        </div>
        <div className="pstack-role-status">
          <Status tone={status.tone} label={status.label} />
          {role.line === undefined ? null : (
            <span className="pstack-role-line">{t("roleLine", { line: role.line })}</span>
          )}
        </div>
      </header>
      {role.issues.length === 0 ? null : (
        <div className="pstack-notice" data-tone="error" style={{ margin: 0 }}>
          <IconAlert size={14} />
          <ul className="pstack-notice-list">
            {role.issues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="pstack-route-list">
        {draft.routes.map((route, index) => {
          const baseline = draft.baseline[index];
          const resetRoute =
            role.shape !== "list"
              ? undefined
              : (): void => {
                  if (baseline === undefined) {
                    onRoutesChange(draft.routes.filter((_item, position) => position !== index));
                    return;
                  }
                  onRoutesChange(
                    draft.routes.map((item, position) =>
                      position === index ? { ...baseline } : item,
                    ),
                  );
                };
          return (
            <RouteRow
              key={`${role.key}-${index}`}
              roleName={name}
              route={route}
              catalogue={catalogue}
              disabled={controlsDisabled}
              canRemove={role.shape === "list" && draft.routes.length > 1}
              canReset={baseline === undefined || signature([route]) !== signature([baseline])}
              onReset={resetRoute}
              onChange={(next) =>
                onRoutesChange(
                  draft.routes.map((item, position) => (position === index ? next : item)),
                )
              }
              onRemove={() =>
                onRoutesChange(draft.routes.filter((_item, position) => position !== index))
              }
              translations={translations}
            />
          );
        })}
      </div>
      <footer className="pstack-role-foot">
        <div className="pstack-role-foot-actions">
          {role.shape === "list" ? (
            <Button
              variant="outline"
              size="sm"
              icon={<IconPlus size={13} />}
              disabled={controlsDisabled}
              onClick={() =>
                onRoutesChange([...draft.routes, { kind: "inherit", alias: "inherit-parent" }])
              }
            >
              {t("addRoute")}
            </Button>
          ) : null}
        </div>
        <div className="pstack-role-save">
          {draft.message === undefined ? (
            dirty ? (
              <Status tone="warn" label={t("unsavedChanges")} />
            ) : null
          ) : (
            <span className="pstack-inline-message" data-tone={draft.message.tone}>
              {draft.message.tone === "success" ? <IconCheck size={12} /> : <IconAlert size={12} />}
              {draft.message.text}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            icon={<IconUndo size={13} />}
            disabled={controlsDisabled || !dirty}
            onClick={onReset}
          >
            {t("resetRole")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={draft.busy ? <Spinner size={13} /> : <IconSave size={13} />}
            disabled={controlsDisabled || !dirty || incomplete}
            onClick={onSave}
          >
            {draft.busy ? common("saving") : common("save")}
          </Button>
        </div>
      </footer>
    </section>
  );
}

function RouteRow(props: {
  roleName: string;
  route: RouteView;
  catalogue: CatalogueResult | undefined;
  disabled: boolean;
  canRemove: boolean;
  canReset: boolean;
  onReset?: () => void;
  onChange: (route: RouteView) => void;
  onRemove: () => void;
  translations: PstackTranslations;
}): ReactElement {
  const {
    roleName,
    route,
    catalogue,
    disabled,
    canRemove,
    canReset,
    onReset,
    onChange,
    onRemove,
    translations,
  } = props;
  const t = translations.roles;
  const providerValue = route.kind === "inherit" ? `__inherit__:${route.alias}` : route.provider;
  const providers = catalogue?.providers ?? [];
  const models = route.kind === "route" ? modelChoices(catalogue, route.provider) : [];
  const efforts =
    route.kind === "route" ? effortChoices(catalogue, route.provider, route.model) : [];
  const effortOptions =
    route.kind === "route" && route.effort !== undefined && !efforts.includes(route.effort)
      ? [route.effort, ...efforts]
      : efforts;
  const actionCount = (onReset === undefined ? 0 : 1) + (canRemove ? 1 : 0);
  const actionWidth = actionCount === 0 ? 0 : actionCount * 32 + (actionCount - 1) * 6;
  const fields =
    route.kind === "route"
      ? "minmax(0, 1.25fr) minmax(0, 1.25fr) minmax(0, 0.7fr)"
      : "minmax(0, 1fr)";
  const columns = actionWidth === 0 ? fields : `${fields} ${actionWidth}px`;
  return (
    <div className="pstack-route-row" style={{ gridTemplateColumns: columns }}>
      <label className="pstack-field">
        <span className="pstack-field-label">{t("provider")}</span>
        <select
          className="pstack-select"
          aria-label={`${roleName} ${t("provider")}`}
          value={providerValue}
          disabled={disabled}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "__inherit__:inherit-parent" || value === "__inherit__:auto") {
              onChange({
                kind: "inherit",
                alias: value.endsWith("auto") ? "auto" : "inherit-parent",
              });
              return;
            }
            const model = modelChoices(catalogue, value)[0];
            onChange({
              kind: "route",
              provider: value,
              model: model?.id ?? "",
              ...(model?.defaultEffort === undefined ? {} : { effort: model.defaultEffort }),
            });
          }}
        >
          <option value="__inherit__:inherit-parent">{t("inheritParent")}</option>
          <option value="__inherit__:auto">{t("auto")}</option>
          {route.kind === "route" &&
          route.provider !== "" &&
          providers.every((provider) => provider.provider !== route.provider) ? (
            <option value={route.provider}>{route.provider}</option>
          ) : null}
          {providers.map((provider) => (
            <option key={provider.provider} value={provider.provider}>
              {providerLabel(providers, provider.provider)}
            </option>
          ))}
        </select>
      </label>
      {route.kind === "route" ? (
        <>
          <label className="pstack-field">
            <span className="pstack-field-label">{t("model")}</span>
            <select
              className="pstack-select"
              aria-label={`${roleName} ${t("model")}`}
              value={route.model}
              disabled={disabled}
              onChange={(event) => {
                const model = models.find((entry) => entry.id === event.target.value);
                onChange({
                  kind: "route",
                  provider: route.provider,
                  model: event.target.value,
                  ...(model?.defaultEffort === undefined ? {} : { effort: model.defaultEffort }),
                });
              }}
            >
              {models.length === 0 ? (
                <option value="" disabled>
                  {t("noModels")}
                </option>
              ) : null}
              {route.kind === "route" &&
              route.model !== "" &&
              models.every((model) => model.id !== route.model) ? (
                <option value={route.model}>{route.model}</option>
              ) : null}
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              ))}
            </select>
          </label>
          <label className="pstack-field">
            <span className="pstack-field-label">{t("effort")}</span>
            <select
              className="pstack-select"
              aria-label={`${roleName} ${t("effort")}`}
              value={route.effort ?? ""}
              disabled={disabled}
              onChange={(event) => {
                const effort = event.target.value;
                onChange({
                  kind: "route",
                  provider: route.provider,
                  model: route.model,
                  ...(effort === "" ? {} : { effort }),
                });
              }}
            >
              <option value="">{t("effortUnset")}</option>
              {effortOptions.map((effort) => (
                <option key={effort} value={effort}>
                  {effort}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
      {actionCount === 0 ? null : (
        <div className="pstack-route-actions">
          {onReset === undefined ? null : (
            <IconButton label={t("resetRoute")} disabled={disabled || !canReset} onClick={onReset}>
              <IconUndo size={14} />
            </IconButton>
          )}
          {canRemove ? (
            <IconButton
              danger
              label={`${t("removeRoute")} ${roleName}`}
              disabled={disabled}
              onClick={onRemove}
            >
              <IconTrash size={14} />
            </IconButton>
          ) : null}
        </div>
      )}
    </div>
  );
}

function draftOf(role: RoleView): RoleDraft {
  const routes = routesOf(role);
  return { routes, baseline: routes.map((route) => ({ ...route })), busy: false };
}

function routesOf(role: RoleView): RouteView[] {
  return role.routes.length === 0
    ? [{ kind: "inherit", alias: "inherit-parent" }]
    : role.routes.map((route) => ({ ...route }));
}

function isDirty(draft: RoleDraft): boolean {
  return signature(draft.routes) !== signature(draft.baseline);
}

function signature(routes: readonly RouteView[]): string {
  return JSON.stringify(routes);
}

function statusPresentation(
  snapshot: RoleFileSnapshot,
  t: PstackTranslations["roles"],
): { label: string; tone: StatusTone } {
  if (snapshot.status === "unreadable") {
    return { label: t("statusUnreadable"), tone: "error" };
  }
  if (snapshot.status === "missing") return { label: t("statusMissing"), tone: "warn" };
  return { label: t("statusLoaded"), tone: "success" };
}

function modelChoices(
  catalogue: CatalogueResult | undefined,
  provider: string,
): readonly ModelEntry[] {
  return catalogue?.providers.find((entry) => entry.provider === provider)?.models ?? [];
}

function providerLabel(providers: CatalogueResult["providers"], providerId: string): string {
  const provider = providers.find((entry) => entry.provider === providerId);
  if (provider === undefined) return providerId;
  const duplicated = providers.some(
    (entry) => entry.provider !== providerId && entry.name === provider.name,
  );
  return duplicated ? `${provider.name} (${provider.provider})` : provider.name;
}

function effortChoices(
  catalogue: CatalogueResult | undefined,
  provider: string,
  model: string,
): readonly string[] {
  return modelChoices(catalogue, provider).find((entry) => entry.id === model)?.efforts ?? [];
}

function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}
