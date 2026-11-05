/** Wire shapes shared by the role settings Host service and Client page. */

import type { RoleShape } from "./role-manifest.ts";

export type InheritAlias = "inherit-parent" | "auto";

export type RouteView =
  | { readonly kind: "inherit"; readonly alias: InheritAlias }
  | {
      readonly kind: "route";
      readonly provider: string;
      readonly model: string;
      readonly effort?: string;
    };

export interface RoleView {
  readonly key: string;
  readonly shape: RoleShape;
  readonly configured: boolean;
  readonly line?: number;
  readonly routes: readonly RouteView[];
  readonly issues: readonly string[];
}

export interface RoleFileIssueView {
  readonly line?: number;
  readonly message: string;
}

export interface RoleFileSnapshot {
  readonly path: string;
  readonly status: "missing" | "loaded" | "unreadable";
  readonly reason?: string;
  readonly budget?: string;
  readonly roles: readonly RoleView[];
  readonly issues: readonly RoleFileIssueView[];
  readonly canSave: boolean;
}

export interface SaveRoleRequest {
  readonly key: string;
  readonly routes: readonly RouteView[];
}

export type SaveRoleResult =
  | { readonly ok: true; readonly snapshot: RoleFileSnapshot }
  | { readonly ok: false; readonly reason: string };

export interface SaveBudgetRequest {
  readonly budget: string;
}

export type SaveBudgetResult =
  | { readonly ok: true; readonly snapshot: RoleFileSnapshot }
  | { readonly ok: false; readonly reason: string };
