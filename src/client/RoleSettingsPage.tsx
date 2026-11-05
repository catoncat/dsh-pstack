/** Role model configuration page for the pstack plugin dialog. */

import { useEffect, useState, type CSSProperties, type ReactElement } from "react";

import type { CatalogueResult, ModelEntry } from "../models.ts";
import type {
  RoleFileSnapshot,
  RoleView,
  RouteView,
  SaveBudgetRequest,
  SaveBudgetResult,
  SaveRoleRequest,
  SaveRoleResult,
} from "../role-wire.ts";
import type { PstackLocaleKey } from "./locales.ts";

export type Translate = (key: PstackLocaleKey, vars?: Record<string, string | number>) => string;

export interface RoleSettingsApi {
  status(): Promise<RoleFileSnapshot>;
  catalogue(): Promise<CatalogueResult>;
  save(request: SaveRoleRequest): Promise<SaveRoleResult>;
  saveBudget(request: SaveBudgetRequest): Promise<SaveBudgetResult>;
}

const text = "var(--dsw-alias-label-primary)";
const secondary = "var(--dsw-alias-label-secondary)";
const border = "var(--dsw-alias-border-l3)";
const surface = "var(--dsw-alias-bg-layer-1)";

export function RoleSettingsView(props: { api: RoleSettingsApi; t: Translate }): ReactElement {
  const { api, t } = props;
  const [snapshot, setSnapshot] = useState<RoleFileSnapshot | undefined>();
  const [catalogue, setCatalogue] = useState<CatalogueResult | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const load = (): void => {
    setLoading(true);
    setError(undefined);
    Promise.all([api.status(), api.catalogue()])
      .then(([nextSnapshot, nextCatalogue]) => {
        setSnapshot(nextSnapshot);
        setCatalogue(nextCatalogue);
      })
      .catch((reason: unknown) => setError(t("rolesLoadFailed", { message: messageOf(reason) })))
      .finally(() => setLoading(false));
  };

  useEffect(load, [api, t]);

  if (loading && snapshot === undefined) {
    return <div style={{ color: secondary }}>{t("rolesLoading")}</div>;
  }
  if (snapshot === undefined) {
    return (
      <div style={{ display: "grid", gap: 10, color: text }}>
        <div style={{ color: "var(--dsw-alias-state-error-primary)" }}>{error}</div>
        <button type="button" style={buttonStyle()} onClick={load}>
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14, color: text }}>
      <header style={{ display: "grid", gap: 4 }}>
        <strong style={{ fontSize: 14 }}>{t("rolesTitle")}</strong>
        <span style={{ color: secondary, fontSize: 12 }}>{t("rolesSubtitle")}</span>
        <span style={{ color: secondary, fontSize: 12 }}>
          {t("file")}: {snapshot.path} · {t("status")}: {statusLabel(snapshot.status, t)}
        </span>
        {snapshot.reason === undefined ? null : (
          <span style={{ color: "var(--dsw-alias-state-error-primary)", fontSize: 12 }}>
            {t("unreadable", { reason: snapshot.reason })}
          </span>
        )}
      </header>
      <BudgetEditor snapshot={snapshot} api={api} t={t} />
      <div style={{ display: "grid", gap: 8 }}>
        {snapshot.roles.map((role) => (
          <RoleCard
            key={role.key}
            role={role}
            catalogue={catalogue}
            api={api}
            t={t}
            disabled={!snapshot.canSave}
          />
        ))}
      </div>
    </div>
  );
}

function BudgetEditor(props: {
  snapshot: RoleFileSnapshot;
  api: RoleSettingsApi;
  t: Translate;
}): ReactElement {
  const { snapshot, api, t } = props;
  const [budget, setBudget] = useState(snapshot.budget ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  return (
    <section style={panelStyle()}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <strong style={{ fontSize: 13 }}>{t("budget")}</strong>
        <input
          aria-label={t("budget")}
          value={budget}
          placeholder={t("budgetPlaceholder")}
          disabled={!snapshot.canSave || busy}
          style={fieldStyle(240)}
          onChange={(event) => {
            setBudget(event.target.value);
            setMessage(undefined);
          }}
        />
        <button
          type="button"
          style={buttonStyle(true)}
          disabled={!snapshot.canSave || busy}
          onClick={() => {
            setBusy(true);
            setMessage(undefined);
            api
              .saveBudget({ budget })
              .then((result) =>
                setMessage(
                  result.ok ? t("budgetSaved") : t("budgetRejected", { reason: result.reason }),
                ),
              )
              .catch((reason: unknown) =>
                setMessage(t("budgetRejected", { reason: messageOf(reason) })),
              )
              .finally(() => setBusy(false));
          }}
        >
          {busy ? t("saving") : t("saveBudget")}
        </button>
        {message === undefined ? null : (
          <span style={{ color: secondary, fontSize: 12 }}>{message}</span>
        )}
      </div>
    </section>
  );
}

function RoleCard(props: {
  role: RoleView;
  catalogue: CatalogueResult | undefined;
  api: RoleSettingsApi;
  t: Translate;
  disabled: boolean;
}): ReactElement {
  const { role, catalogue, api, t, disabled } = props;
  const [routes, setRoutes] = useState<RouteView[]>(
    role.routes.length === 0
      ? [{ kind: "inherit", alias: "inherit-parent" }]
      : role.routes.map((route) => ({ ...route })),
  );
  const [message, setMessage] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const update = (index: number, route: RouteView): void => {
    setRoutes((current) => current.map((item, position) => (position === index ? route : item)));
    setMessage(undefined);
  };

  return (
    <section style={panelStyle()}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "baseline",
        }}
      >
        <strong style={{ fontSize: 13 }}>{role.key}</strong>
        <span style={{ color: secondary, fontSize: 12 }}>
          {role.configured ? t("roleLine", { line: role.line ?? "?" }) : t("roleMissing")}
          {role.shape === "single" ? ` · ${t("singleRouteHint")}` : ""}
        </span>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {routes.map((route, index) => (
          <RouteRow
            key={`${role.key}-${index}`}
            role={role}
            route={route}
            catalogue={catalogue}
            disabled={disabled || busy}
            canRemove={role.shape === "list" && routes.length > 1}
            onChange={(next) => update(index, next)}
            onRemove={() =>
              setRoutes((current) => current.filter((_item, position) => position !== index))
            }
            t={t}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        {role.shape === "list" ? (
          <button
            type="button"
            style={buttonStyle()}
            disabled={disabled || busy}
            onClick={() =>
              setRoutes((current) => [...current, { kind: "inherit", alias: "inherit-parent" }])
            }
          >
            {t("addRoute")}
          </button>
        ) : null}
        <button
          type="button"
          style={buttonStyle(true)}
          disabled={disabled || busy}
          onClick={() => {
            setBusy(true);
            setMessage(undefined);
            api
              .save({ key: role.key, routes })
              .then((result) => {
                if (result.ok) {
                  setRoutes(
                    result.snapshot.roles
                      .find((entry) => entry.key === role.key)
                      ?.routes.map((route) => ({ ...route })) ?? routes,
                  );
                  setMessage(t("saved"));
                } else {
                  setMessage(t("saveRejected", { reason: result.reason }));
                }
              })
              .catch((reason: unknown) =>
                setMessage(t("saveRejected", { reason: messageOf(reason) })),
              )
              .finally(() => setBusy(false));
          }}
        >
          {busy ? t("saving") : t("save")}
        </button>
        {message === undefined ? null : (
          <span style={{ color: secondary, fontSize: 12 }}>{message}</span>
        )}
      </div>
    </section>
  );
}

function RouteRow(props: {
  role: RoleView;
  route: RouteView;
  catalogue: CatalogueResult | undefined;
  disabled: boolean;
  canRemove: boolean;
  onChange: (route: RouteView) => void;
  onRemove: () => void;
  t: Translate;
}): ReactElement {
  const { role, route, catalogue, disabled, canRemove, onChange, onRemove, t } = props;
  const providerValue = route.kind === "inherit" ? `__inherit__:${route.alias}` : route.provider;
  const providers = catalogue?.providers ?? [];
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <select
        aria-label={`${role.key} ${t("provider")}`}
        value={providerValue}
        disabled={disabled}
        style={fieldStyle(220)}
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
        {providers.map((provider) => (
          <option key={provider.provider} value={provider.provider}>
            {provider.name === provider.provider
              ? provider.provider
              : `${provider.name} (${provider.provider})`}
          </option>
        ))}
      </select>
      {route.kind === "route" ? (
        <>
          <select
            aria-label={`${role.key} ${t("model")}`}
            value={route.model}
            disabled={disabled}
            style={fieldStyle(220)}
            onChange={(event) => {
              const model = modelChoices(catalogue, route.provider).find(
                (entry) => entry.id === event.target.value,
              );
              onChange({
                kind: "route",
                provider: route.provider,
                model: event.target.value,
                ...(model?.defaultEffort === undefined ? {} : { effort: model.defaultEffort }),
              });
            }}
          >
            {modelChoices(catalogue, route.provider).map((model) => (
              <option key={model.id} value={model.id}>
                {model.id}
              </option>
            ))}
          </select>
          <select
            aria-label={`${role.key} ${t("effort")}`}
            value={route.effort ?? ""}
            disabled={disabled}
            style={fieldStyle(160)}
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
            {effortChoices(catalogue, route.provider, route.model).map((effort) => (
              <option key={effort} value={effort}>
                {effort}
              </option>
            ))}
          </select>
        </>
      ) : null}
      {canRemove ? (
        <button type="button" style={dangerButtonStyle()} disabled={disabled} onClick={onRemove}>
          {t("removeRoute")}
        </button>
      ) : null}
    </div>
  );
}

function statusLabel(status: RoleFileSnapshot["status"], t: Translate): string {
  if (status === "loaded") return t("statusLoaded");
  if (status === "unreadable") return t("statusUnreadable");
  return t("statusMissing");
}

function modelChoices(
  catalogue: CatalogueResult | undefined,
  provider: string,
): readonly ModelEntry[] {
  return catalogue?.providers.find((entry) => entry.provider === provider)?.models ?? [];
}

function effortChoices(
  catalogue: CatalogueResult | undefined,
  provider: string,
  model: string,
): readonly string[] {
  return modelChoices(catalogue, provider).find((entry) => entry.id === model)?.efforts ?? [];
}

function panelStyle(): CSSProperties {
  return {
    display: "grid",
    gap: 8,
    padding: 12,
    border: `1px solid ${border}`,
    borderRadius: 10,
    background: surface,
  };
}

function fieldStyle(width: number): CSSProperties {
  return {
    width,
    maxWidth: "100%",
    height: 32,
    padding: "4px 8px",
    boxSizing: "border-box",
    border: `1px solid ${border}`,
    borderRadius: 8,
    background: surface,
    color: text,
    font: "inherit",
  };
}

function buttonStyle(primary = false): CSSProperties {
  return {
    height: 30,
    padding: "0 12px",
    border: `1px solid ${primary ? "transparent" : border}`,
    borderRadius: 8,
    background: primary ? "var(--dsw-alias-brand-primary)" : "transparent",
    color: primary ? "var(--dsw-alias-label-primary-foreground)" : text,
    cursor: "pointer",
    font: "inherit",
  };
}

function dangerButtonStyle(): CSSProperties {
  return {
    height: 30,
    padding: "0 10px",
    border: "1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 55%, transparent)",
    borderRadius: 8,
    background: "color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent)",
    color: "var(--dsw-alias-state-error-primary)",
    cursor: "pointer",
    font: "inherit",
  };
}

function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}
