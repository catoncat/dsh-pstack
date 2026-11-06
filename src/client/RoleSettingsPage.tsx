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

export function RoleSettingsView(props: {
  api: RoleSettingsApi;
  translations: PstackTranslations;
}): ReactElement {
  const { api, translations } = props;
  const t = translations.roles;
  const common = translations.common;
  const [snapshot, setSnapshot] = useState<RoleFileSnapshot | undefined>();
  const [catalogue, setCatalogue] = useState<CatalogueResult | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(undefined);
    try {
      const [nextSnapshot, nextCatalogue] = await Promise.all([api.status(), api.catalogue()]);
      setSnapshot(nextSnapshot);
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

  const fileStatus = statusPresentation(snapshot, t);
  return (
    <section>
      <header className="pstack-section-head">
        <div>
          <h3 className="pstack-section-title">{t("rolesTitle")}</h3>
          <p className="pstack-section-desc">{t("rolesSubtitle")}</p>
          <div className="pstack-file-meta">
            <Status tone={fileStatus.tone} label={fileStatus.label} />
            <span>{t("file")}</span>
            <code className="pstack-file-path" title={snapshot.path}>
              {fileName(snapshot.path)}
            </code>
          </div>
        </div>
        <div className="pstack-section-actions">
          <IconButton label={common("refresh")} disabled={loading} onClick={() => void load()}>
            {loading ? <Spinner size={14} /> : <IconRefresh size={15} />}
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
      <div className="pstack-role-list">
        {snapshot.roles.map((role) => (
          <RoleCard
            key={role.key}
            role={role}
            catalogue={catalogue}
            api={api}
            translations={translations}
            disabled={!snapshot.canSave}
            onSaved={setSnapshot}
          />
        ))}
      </div>
    </section>
  );
}

function RoleCard(props: {
  role: RoleView;
  catalogue: CatalogueResult | undefined;
  api: RoleSettingsApi;
  translations: PstackTranslations;
  disabled: boolean;
  onSaved: (snapshot: RoleFileSnapshot) => void;
}): ReactElement {
  const { role, catalogue, api, translations, disabled, onSaved } = props;
  const t = translations.roles;
  const common = translations.common;
  const copy = ROLE_COPY[role.key];
  const name = copy === undefined ? role.key : t(copy.nameKey);
  const description = copy === undefined ? "" : t(copy.descriptionKey);
  const [routes, setRoutes] = useState<RouteView[]>(() => routesOf(role));
  const [saved, setSaved] = useState<string>(() => signature(routesOf(role)));
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const next = routesOf(role);
    setRoutes(next);
    setSaved(signature(next));
  }, [role]);

  const dirty = signature(routes) !== saved;
  const incomplete = routes.some(
    (route) =>
      route.kind === "route" && (route.provider.trim() === "" || route.model.trim() === ""),
  );
  const update = (index: number, route: RouteView): void => {
    setRoutes((current) => current.map((item, position) => (position === index ? route : item)));
    setMessage(undefined);
  };
  const status =
    role.issues.length > 0
      ? { tone: "error" as StatusTone, label: t("roleInvalid") }
      : role.configured
        ? { tone: "success" as StatusTone, label: t("roleConfigured") }
        : { tone: "neutral" as StatusTone, label: t("roleMissing") };
  return (
    <section className="pstack-role-card">
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
        {routes.map((route, index) => (
          <RouteRow
            key={`${role.key}-${index}`}
            roleName={name}
            route={route}
            catalogue={catalogue}
            disabled={disabled || busy}
            canRemove={role.shape === "list" && routes.length > 1}
            onChange={(next) => update(index, next)}
            onRemove={() =>
              setRoutes((current) => current.filter((_item, position) => position !== index))
            }
            translations={translations}
          />
        ))}
      </div>
      <footer className="pstack-role-foot">
        <div className="pstack-role-foot-actions">
          {role.shape === "list" ? (
            <Button
              variant="outline"
              size="sm"
              icon={<IconPlus size={13} />}
              disabled={disabled || busy}
              onClick={() =>
                setRoutes((current) => [...current, { kind: "inherit", alias: "inherit-parent" }])
              }
            >
              {t("addRoute")}
            </Button>
          ) : null}
        </div>
        <div className="pstack-role-save">
          {message === undefined ? (
            dirty ? (
              <Status tone="warn" label={t("unsavedChanges")} />
            ) : null
          ) : (
            <span className="pstack-inline-message" data-tone={message.tone}>
              {message.tone === "success" ? <IconCheck size={12} /> : <IconAlert size={12} />}
              {message.text}
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            icon={busy ? <Spinner size={13} /> : <IconSave size={13} />}
            disabled={disabled || busy || !dirty || incomplete}
            onClick={() => {
              setBusy(true);
              setMessage(undefined);
              void api
                .save({ key: role.key, routes })
                .then((result) => {
                  if (result.ok) {
                    onSaved(result.snapshot);
                    setMessage({ tone: "success", text: common("saved") });
                  } else {
                    setMessage({
                      tone: "error",
                      text: t("saveRejected", { reason: result.reason }),
                    });
                  }
                })
                .catch((reason: unknown) =>
                  setMessage({
                    tone: "error",
                    text: t("saveRejected", { reason: messageOf(reason) }),
                  }),
                )
                .finally(() => setBusy(false));
            }}
          >
            {busy ? common("saving") : common("save")}
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
  onChange: (route: RouteView) => void;
  onRemove: () => void;
  translations: PstackTranslations;
}): ReactElement {
  const { roleName, route, catalogue, disabled, canRemove, onChange, onRemove, translations } =
    props;
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
  const columns =
    route.kind === "route"
      ? canRemove
        ? "minmax(0, 1.25fr) minmax(0, 1.25fr) minmax(0, 0.7fr) 28px"
        : "minmax(0, 1.25fr) minmax(0, 1.25fr) minmax(0, 0.7fr)"
      : canRemove
        ? "minmax(0, 1fr) 28px"
        : "minmax(0, 1fr)";
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
  );
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

function routesOf(role: RoleView): RouteView[] {
  return role.routes.length === 0
    ? [{ kind: "inherit", alias: "inherit-parent" }]
    : role.routes.map((route) => ({ ...route }));
}

function signature(routes: readonly RouteView[]): string {
  return JSON.stringify(routes);
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

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}
