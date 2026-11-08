/** Nested budget modal for the role settings page: preview a plan and apply it to the role file. */

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";

import type { CatalogueResult } from "../models.ts";
import {
  BUDGET_TIERS,
  BudgetPlanError,
  budgetTierFromLabel,
  budgetValueFor,
  isBudgetRowBlocked,
  planBudget,
  type BudgetApplyRequest,
  type BudgetRolePlan,
  type BudgetTier,
} from "../budget.ts";
import type { BudgetApplyResult, RoleFileSnapshot } from "../role-wire.ts";
import { renderRouteValue, type Route } from "../route.ts";
import { IconClose } from "./icons.tsx";
import { messageOf } from "./message.ts";
import { providerLabel } from "./role-selectors.ts";
import { findRole } from "../role-manifest.ts";
import { Button, IconButton, Spinner, Status, type StatusTone } from "./ui.tsx";
import type { PstackTranslations } from "./locales/index.ts";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export interface BudgetDialogProps {
  readonly snapshot: RoleFileSnapshot;
  readonly catalogue: CatalogueResult;
  readonly translations: PstackTranslations;
  readonly onApply: (request: BudgetApplyRequest) => Promise<BudgetApplyResult>;
  readonly onApplied: (snapshot: RoleFileSnapshot) => void;
  readonly onClose: () => void;
}

export function BudgetDialog(props: BudgetDialogProps): ReactElement | null {
  const { snapshot, catalogue, translations, onApply, onApplied, onClose } = props;
  const t = translations.roles;
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const providers = catalogue.providers.filter(
    (provider) =>
      provider.error === undefined && provider.models.some((model) => model.error === undefined),
  );
  const initialProvider = providers[0];
  const [scope, setScope] = useState<"concrete" | "unconfigured">("concrete");
  const [tier, setTier] = useState<BudgetTier>(
    () => budgetTierFromLabel(snapshot.budget) ?? "large",
  );
  const [providerId, setProviderId] = useState(initialProvider?.provider ?? "");
  const activeProvider =
    providers.find((provider) => provider.provider === providerId) ?? initialProvider;
  const models = activeProvider?.models.filter((model) => model.error === undefined) ?? [];
  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  const activeModel = models.find((model) => model.id === modelId) ?? models[0];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const requestClose = useCallback((): void => {
    if (!busy) onClose();
  }, [busy, onClose]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        requestClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (panel === null) return;
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
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
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [requestClose]);

  const request: BudgetApplyRequest = {
    tier,
    scope,
    ...(scope === "unconfigured" && activeProvider !== undefined && activeModel !== undefined
      ? { defaultModel: { provider: activeProvider.provider, model: activeModel.id } }
      : {}),
  };

  const plan = useMemo(() => {
    try {
      return {
        plan: planBudget(
          snapshot.roles.map((role) => ({
            key: role.key,
            shape: role.shape,
            autoPanel: findRole(role.key)?.autoPanel ?? false,
            configured: role.configured,
            routes: role.routes,
          })),
          catalogue,
          request,
        ),
        error: undefined,
      };
    } catch (reason) {
      return { plan: undefined, error: budgetPlanErrorText(reason, t) };
    }
  }, [
    snapshot.roles,
    catalogue,
    request.tier,
    request.scope,
    request.defaultModel?.provider,
    request.defaultModel?.model,
  ]);

  const visibleRows = plan.plan?.rows.filter((row) => row.status !== "skipped") ?? [];
  const blocked = plan.plan?.rows.some(isBudgetRowBlocked) ?? false;
  const routeChanged =
    plan.plan?.rows.some(
      (row) =>
        row.status !== "skipped" && renderRouteValue(row.routes) !== renderRouteValue(row.previous),
    ) ?? false;
  const budgetChanged =
    plan.plan !== undefined && snapshot.budget !== budgetValueFor(plan.plan.tier);
  const canApply = plan.error === undefined && !blocked && (routeChanged || budgetChanged) && !busy;

  const apply = async (): Promise<void> => {
    setBusy(true);
    setError(undefined);
    try {
      const result = await onApply(request);
      if (result.ok) onApplied(result.snapshot);
      else setError(t("budgetFailed", { reason: result.reason }));
    } catch (reason) {
      setError(t("budgetFailed", { reason: messageOf(reason) }));
    } finally {
      setBusy(false);
    }
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="pstack-overlay pstack-budget-overlay" role="presentation">
      <div className="pstack-mask" aria-hidden="true" onClick={requestClose} />
      <div
        className="pstack-panel pstack-budget-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panelRef}
      >
        <header className="pstack-header">
          <div>
            <h2 className="pstack-title" id={titleId}>
              {t("budgetTitle")}
            </h2>
            <p className="pstack-section-desc">
              {t("budgetCurrent", { budget: budgetLabel(snapshot.budget, t) })}
            </p>
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
        <div className="pstack-body pstack-budget-body">
          <div className="pstack-budget-form">
            <label className="pstack-field">
              <span className="pstack-field-label">{t("budgetScope")}</span>
              <select
                className="pstack-select"
                value={scope}
                disabled={busy}
                onChange={(event) => setScope(event.target.value as "concrete" | "unconfigured")}
              >
                <option value="concrete">{t("budgetScopeConcrete")}</option>
                <option value="unconfigured">{t("budgetScopeUnconfigured")}</option>
              </select>
            </label>
            <label className="pstack-field">
              <span className="pstack-field-label">{t("budgetTier")}</span>
              <select
                className="pstack-select"
                value={tier}
                disabled={busy}
                onChange={(event) => setTier(event.target.value as BudgetTier)}
              >
                {BUDGET_TIERS.map((value) => (
                  <option key={value} value={value}>
                    {t(`budgetTier${value[0]!.toUpperCase()}${value.slice(1)}` as never)}
                  </option>
                ))}
              </select>
            </label>
            {scope === "unconfigured" ? (
              <>
                <label className="pstack-field">
                  <span className="pstack-field-label">{t("budgetProvider")}</span>
                  <select
                    className="pstack-select"
                    value={activeProvider?.provider ?? ""}
                    disabled={busy || providers.length === 0}
                    onChange={(event) => {
                      const next = providers.find(
                        (provider) => provider.provider === event.target.value,
                      );
                      setProviderId(next?.provider ?? "");
                      setModelId(next?.models.find((model) => model.error === undefined)?.id ?? "");
                    }}
                  >
                    {providers.map((provider) => (
                      <option key={provider.provider} value={provider.provider}>
                        {providerLabel(providers, provider.provider)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="pstack-field">
                  <span className="pstack-field-label">{t("budgetModel")}</span>
                  <select
                    className="pstack-select"
                    value={activeModel?.id ?? ""}
                    disabled={busy || models.length === 0}
                    onChange={(event) => setModelId(event.target.value)}
                  >
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.id}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
          </div>
          {plan.error === undefined ? null : (
            <div className="pstack-notice" data-tone="error">
              {plan.error}
            </div>
          )}
          {plan.plan !== undefined && plan.plan.warnings.length > 0 ? (
            <div className="pstack-notice">
              <strong>{t("budgetWarnings")}</strong>
              <ul className="pstack-notice-list">
                {plan.plan.warnings.map((warning) => (
                  <li key={`${warning.kind}:${warning.role}`}>
                    {t("budgetWarningAutoPanel", { role: warning.role })}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {visibleRows.length === 0 ? null : (
            <div className="pstack-budget-preview">
              <h5 className="pstack-budget-preview-title">{t("budgetPreview")}</h5>
              <div className="pstack-budget-list">
                {visibleRows.map((row) => (
                  <article className="pstack-budget-card" data-status={row.status} key={row.key}>
                    <header className="pstack-budget-card-head">
                      <span className="pstack-budget-role">{row.key}</span>
                      <Status tone={statusTone(row.status)} label={statusText(row, t)} />
                    </header>
                    <div className="pstack-budget-route-grid">
                      <div className="pstack-budget-route-block">
                        <span className="pstack-budget-route-label">{t("budgetCurrentRoute")}</span>
                        <div className="pstack-budget-route-chips">
                          {routeTokens(row.previous, t)}
                        </div>
                      </div>
                      <div className="pstack-budget-route-block">
                        <span className="pstack-budget-route-label">{t("budgetTargetRoute")}</span>
                        <div className="pstack-budget-route-chips">
                          {routeTokens(row.routes, t)}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
          {error === undefined ? null : (
            <div className="pstack-notice" data-tone="error">
              {error}
            </div>
          )}
        </div>
        <footer className="pstack-budget-footer">
          <div />
          <div className="pstack-role-save">
            <Button variant="outline" size="sm" onClick={requestClose} disabled={busy}>
              {translations.common("close")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={busy ? <Spinner size={13} /> : undefined}
              disabled={!canApply}
              onClick={() => void apply()}
            >
              {busy ? t("budgetApplying") : t("budgetApply")}
            </Button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

export function budgetLabel(raw: string | undefined, t: PstackTranslations["roles"]): string {
  const tier = budgetTierFromLabel(raw);
  if (tier === undefined) return raw ?? t("budgetUnset");
  switch (tier) {
    case "unlimited":
      return t("budgetTierUnlimited");
    case "large":
      return t("budgetTierLarge");
    case "medium":
      return t("budgetTierMedium");
    case "small":
      return t("budgetTierSmall");
  }
}

function budgetPlanErrorText(reason: unknown, t: PstackTranslations["roles"]): string {
  if (reason instanceof BudgetPlanError) {
    switch (reason.code) {
      case "no-default-model":
        return t("budgetNoModel");
      case "provider-not-found":
      case "provider-discovery":
        return t("budgetErrorProvider", { provider: reason.detail ?? "" });
      case "model-not-found":
      case "model-discovery":
        return t("budgetErrorModel", { model: reason.detail ?? "" });
    }
  }
  return messageOf(reason);
}

function routeTokens(routes: readonly Route[], t: PstackTranslations["roles"]): ReactElement[] {
  const list = routes.length === 0 ? [{ kind: "inherit" as const }] : routes;
  return list.map((route, index) => (
    <code className="pstack-budget-route-chip" key={`${index}-${renderRouteValue([route])}`}>
      {route.kind === "inherit"
        ? route.alias === "auto"
          ? t("auto")
          : t("inheritParent")
        : renderRouteValue([route])}
    </code>
  ));
}

function statusTone(status: BudgetRolePlan["status"]): StatusTone {
  switch (status) {
    case "changed":
      return "brand";
    case "unchanged":
      return "success";
    case "fallback":
    case "unsupported":
      return "warn";
    case "needs-choice":
    case "custom":
      return "error";
    case "skipped":
      return "neutral";
  }
}

function statusText(row: BudgetRolePlan, t: PstackTranslations["roles"]): string {
  switch (row.status) {
    case "changed":
      return t("budgetStatusChanged");
    case "unchanged":
      return t("budgetStatusUnchanged");
    case "fallback":
      return t("budgetStatusFallback", {
        effort: row.detail?.kind === "fallback" ? row.detail.effort : "",
      });
    case "needs-choice":
      return t("budgetStatusNeedsChoice");
    case "custom":
      return row.detail?.kind === "missing-model"
        ? t("budgetStatusMissingModel", {
            model: `${row.detail.provider}/${row.detail.model}`,
          })
        : t("budgetStatusCustom");
    case "unsupported":
      return t("budgetStatusUnsupported");
    case "skipped":
      return t("budgetStatusSkipped");
  }
}
