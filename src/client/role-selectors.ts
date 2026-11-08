/** Catalogue selectors used by the role route editor. */

import type { CatalogueResult, ModelEntry } from "../models.ts";
import type { RouteView } from "../role-wire.ts";

export function modelChoices(
  catalogue: CatalogueResult | undefined,
  provider: string,
): readonly ModelEntry[] {
  return catalogue?.providers.find((entry) => entry.provider === provider)?.models ?? [];
}

export function providerLabel(providers: CatalogueResult["providers"], providerId: string): string {
  const provider = providers.find((entry) => entry.provider === providerId);
  if (provider === undefined) return providerId;
  const duplicated = providers.some(
    (entry) => entry.provider !== providerId && entry.name === provider.name,
  );
  return duplicated ? `${provider.name} (${provider.provider})` : provider.name;
}

export function effortChoices(
  catalogue: CatalogueResult | undefined,
  provider: string,
  model: string,
): readonly string[] {
  return modelChoices(catalogue, provider).find((entry) => entry.id === model)?.efforts ?? [];
}

export function routeIsInvalid(route: RouteView, catalogue: CatalogueResult | undefined): boolean {
  if (route.kind !== "route") return false;
  const provider = catalogue?.providers.find((entry) => entry.provider === route.provider);
  if (provider === undefined || provider.error !== undefined) return true;
  const model = provider.models.find((entry) => entry.id === route.model);
  if (model === undefined || model.error !== undefined) return true;
  return route.effort !== undefined && !model.efforts.includes(route.effort);
}
