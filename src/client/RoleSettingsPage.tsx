/** Role model configuration page rendered in the Plugins settings tab. */

import { useEffect, useState, type CSSProperties, type ReactElement } from "react";

import type { CatalogueResult, ModelEntry } from "../models.ts";
import type {
  RoleView,
  RouteView,
  SaveRoleRequest,
  SaveRoleResult,
  RoleFileSnapshot,
} from "../role-wire.ts";
import type { PstackRolesKey } from "./locales.ts";

export type Translate = (key: PstackRolesKey, vars?: Record<string, string | number>) => string;

export interface RoleSettingsApi {
  status(): Promise<RoleFileSnapshot>;
  catalogue(): Promise<CatalogueResult>;
  save(request: SaveRoleRequest): Promise<SaveRoleResult>;
}

const text = "var(--dsw-alias-label-primary)";
const secondary = "var(--dsw-alias-label-secondary)";
const border = "var(--dsw-alias-border-l3)";
const surface = "var(--dsw-alias-bg-layer-1)";

export function RoleSettingsView(props: { api: RoleSettingsApi; t: Translate }): ReactElement {
  const [snapshot, setSnapshot] = useState<RoleFileSnapshot | undefined>();
  const [catalogue, setCatalogue] = useState<CatalogueResult | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const { api, t } = props;

  const load = (): void => {
    setLoading(true);
    setError(undefined);
    Promise.all([api.status(), api.catalogue()])
      .then(([nextSnapshot, nextCatalogue]) => {
        setSnapshot(nextSnapshot);
        setCatalogue(nextCatalogue);
      })
      .catch((reason: unknown) => {
        setError(t("loadFailed", { message: messageOf(reason) }));
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [api, t]);

  if (loading && snapshot === undefined)
    return <div style={{ color: secondary }}>{t("loading")}</div>;
  if (snapshot === undefined) {
    return (
      <div style={{ display: "grid", gap: 12, color: text }}>
        <div style={{ color: "var(--dsw-alias-state-error-primary)" }}>{error}</div>
        <button type="button" style={buttonStyle()} onClick={load}>
          {t("retry")}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12, color: text }}>
      <header style={{ display: "grid", gap: 4 }}>
        <strong style={{ fontSize: 14 }}>{t("title")}</strong>
        <span style={{ color: secondary, fontSize: 12 }}>{t("subtitle")}</span>
        <span style={{ color: secondary, fontSize: 12 }}>
          {t("file")}: {snapshot.path} · {t("status")}: {statusLabel(snapshot.status, t)}
          {snapshot.budget === undefined ? "" : ` · ${t("budget")}: ${snapshot.budget}`}
        </span>
        {snapshot.reason === undefined ? null : (
          <span style={{ color: "var(--dsw-alias-state-error-primary)", fontSize: 12 }}>
            {t("unreadable", { reason: snapshot.reason })}
          </span>
        )}
      </header>
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

  const first = routes[0]!;
  const providerValue = first.kind === "inherit" ? `__inherit__:${first.alias}` : first.provider;
  const providers = catalogue?.providers ?? [];

  const updateFirst = (next: RouteView): void => {
    setRoutes((current) => [next, ...current.slice(1)]);
    setMessage(undefined);
  };

  const save = (): void => {
    setBusy(true);
    setMessage(undefined);
    api
      .save({ key: role.key, routes })
      .then((result) => {
        if (result.ok) {
          setRoutes([
            ...(result.snapshot.roles.find((entry) => entry.key === role.key)?.routes ?? routes),
          ]);
          setMessage(t("saved"));
        } else {
          setMessage(t("saveRejected", { reason: result.reason }));
        }
      })
      .catch((reason: unknown) => setMessage(t("saveRejected", { reason: messageOf(reason) })))
      .finally(() => setBusy(false));
  };

  return (
    <section
      style={{
        display: "grid",
        gap: 8,
        padding: 12,
        border: `1px solid ${border}`,
        borderRadius: 10,
        background: surface,
      }}
    >
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
          {role.configured ? `line ${role.line ?? "?"}` : t("statusMissing")}
          {role.shape === "list" ? ` · ${t("roleIndexHint")}` : ""}
        </span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <select
          aria-label={`${role.key} ${t("provider")}`}
          value={providerValue}
          disabled={disabled || busy}
          style={fieldStyle(220)}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "__inherit__:inherit-parent" || value === "__inherit__:auto") {
              updateFirst({
                kind: "inherit",
                alias: value.endsWith("auto") ? "auto" : "inherit-parent",
              });
              return;
            }
            const models = modelChoices(catalogue, value);
            const model = models[0];
            updateFirst({
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
        {first.kind === "route" ? (
          <>
            <select
              aria-label={`${role.key} ${t("model")}`}
              value={first.model}
              disabled={disabled || busy}
              style={fieldStyle(220)}
              onChange={(event) => {
                const model = modelChoices(catalogue, first.provider).find(
                  (entry) => entry.id === event.target.value,
                );
                updateFirst({
                  kind: "route",
                  provider: first.provider,
                  model: event.target.value,
                  ...(model?.defaultEffort === undefined ? {} : { effort: model.defaultEffort }),
                });
              }}
            >
              {modelChoices(catalogue, first.provider).map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              ))}
            </select>
            <select
              aria-label={`${role.key} ${t("effort")}`}
              value={first.effort ?? ""}
              disabled={disabled || busy}
              style={fieldStyle(160)}
              onChange={(event) => {
                const effort = event.target.value;
                updateFirst({
                  kind: "route",
                  provider: first.provider,
                  model: first.model,
                  ...(effort === "" ? {} : { effort }),
                });
              }}
            >
              <option value="">{t("effortUnset")}</option>
              {effortChoices(catalogue, first.provider, first.model).map((effort) => (
                <option key={effort} value={effort}>
                  {effort}
                </option>
              ))}
            </select>
          </>
        ) : null}
        <button type="button" style={buttonStyle(true)} disabled={disabled || busy} onClick={save}>
          {busy ? t("saving") : t("save")}
        </button>
      </div>
      {message === undefined ? null : (
        <div style={{ color: secondary, fontSize: 12 }}>{message}</div>
      )}
    </section>
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

function buttonStyle(primary = false): CSSProperties {
  return {
    border: `1px solid ${primary ? "transparent" : border}`,
    borderRadius: 8,
    padding: "5px 12px",
    cursor: "pointer",
    font: "inherit",
    background: primary ? "var(--dsw-alias-brand-primary)" : "transparent",
    color: primary ? "var(--dsw-alias-label-primary-foreground)" : text,
  };
}

function fieldStyle(width: number): CSSProperties {
  return {
    width,
    maxWidth: "100%",
    height: 34,
    padding: "5px 8px",
    boxSizing: "border-box",
    border: `1px solid ${border}`,
    borderRadius: 8,
    background: surface,
    color: text,
    font: "inherit",
  };
}

function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}
