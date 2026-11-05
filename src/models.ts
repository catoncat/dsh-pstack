/**
 * `pstack_models`: a read-only directory of the routes this deployment serves.
 *
 * Every entry comes from the live LLM adapter registry. The tool never invents
 * a provider, model, or reasoning-effort token from a Cursor slug, and one
 * provider whose discovery fails does not hide the others.
 */

import type { Context } from "@deepseek-ai/cordis";
import type { LlmModelInfo, LlmResolvedModelInfo, LlmRuntime } from "@deepseek-ai/dsh-llm";
import type { JsonSchemaNode, ToolDefinition, ToolRunContext } from "@deepseek-ai/dsh-tools";

/** Cordis row name. */
export const name = "pstack-models";

/** The services this row requires. */
export const inject = ["llm", "tools"];

/** Model-facing tool name. */
export const TOOL_NAME = "pstack_models";

const MAX_PROVIDERS = 64;
const MAX_MODELS = 200;

/** The slice of `ctx.llm` used by the directory. */
export type ModelsLlm = Pick<LlmRuntime, "listProviders" | "listModels" | "resolveModelInfo">;

export interface ModelEntry {
  readonly route: string;
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly contextWindow?: number;
  readonly maxTokens?: number;
  readonly efforts: readonly string[];
  readonly defaultEffort?: string;
  readonly error?: string;
}

export interface ProviderEntry {
  readonly provider: string;
  readonly name: string;
  readonly models: readonly ModelEntry[];
  readonly error?: string;
}

export interface CatalogueResult {
  readonly providers: readonly ProviderEntry[];
  readonly truncated: boolean;
  readonly providerFilter?: string;
}

/** Collect the live catalogue with bounded provider/model counts. */
export async function collectCatalogue(
  llm: ModelsLlm,
  providerFilter: string | undefined,
  signal: AbortSignal,
): Promise<CatalogueResult> {
  const registered = llm.listProviders();
  const providers =
    providerFilter === undefined
      ? registered
      : registered.filter(
          (provider) => provider.id === providerFilter || provider.name === providerFilter,
        );
  const selected = providers.slice(0, MAX_PROVIDERS);
  const output: ProviderEntry[] = [];
  let truncated = providers.length > selected.length;

  for (const provider of selected) {
    let models: readonly LlmModelInfo[];
    try {
      models = await llm.listModels(provider.id);
    } catch (error) {
      output.push({
        provider: provider.id,
        name: provider.name,
        models: [],
        error: describeError(error),
      });
      continue;
    }
    if (models.length > MAX_MODELS) truncated = true;
    const entries: ModelEntry[] = [];
    for (const model of models.slice(0, MAX_MODELS)) {
      signal.throwIfAborted();
      try {
        const info: LlmResolvedModelInfo = await llm.resolveModelInfo(
          provider.id,
          model.id,
          signal,
        );
        entries.push(entryFor(provider.id, info));
      } catch (error) {
        entries.push({
          route: `${provider.id}/${model.id}`,
          id: model.id,
          name: model.name,
          ...(model.description === undefined ? {} : { description: model.description }),
          efforts: [],
          error: describeError(error),
        });
      }
    }
    output.push({ provider: provider.id, name: provider.name, models: entries });
  }

  return {
    providers: output,
    truncated,
    ...(providerFilter === undefined ? {} : { providerFilter }),
  };
}

/** Render the catalogue as compact model-facing text. */
export function renderCatalogue(result: CatalogueResult): string {
  if (result.providers.length === 0) {
    return result.providerFilter === undefined
      ? "No provider is registered with the live adapter registry."
      : `No provider matches "${result.providerFilter}".`;
  }
  const lines: string[] = [];
  for (const provider of result.providers) {
    lines.push(`${provider.provider} (${provider.name})`);
    if (provider.error !== undefined) {
      lines.push(`  model discovery failed: ${provider.error}`);
      continue;
    }
    if (provider.models.length === 0) {
      lines.push("  no models advertised");
      continue;
    }
    for (const model of provider.models) {
      const efforts =
        model.efforts.length === 0
          ? "no reasoning efforts"
          : `efforts: ${model.efforts.join(", ")}`;
      const fallback = model.defaultEffort === undefined ? "" : `; default: ${model.defaultEffort}`;
      const error = model.error === undefined ? "" : `; error: ${model.error}`;
      lines.push(`  ${model.route} — ${efforts}${fallback}${error}`);
    }
  }
  if (result.truncated) lines.push("", "Truncated at the provider/model page limits.");
  return lines.join("\n");
}

function entryFor(provider: string, info: LlmResolvedModelInfo): ModelEntry {
  return {
    route: `${provider}/${info.id}`,
    id: info.id,
    name: info.name,
    ...(info.description === undefined ? {} : { description: info.description }),
    ...(info.context?.contextWindow === undefined
      ? {}
      : { contextWindow: info.context.contextWindow }),
    ...(info.defaultMaxTokens === undefined ? {} : { maxTokens: info.defaultMaxTokens }),
    efforts: info.reasoning?.efforts.map((effort) => effort.id) ?? [],
    ...(info.reasoning?.defaultEffort === undefined
      ? {}
      : { defaultEffort: info.reasoning.defaultEffort }),
  };
}

const OUTPUT_SCHEMA: JsonSchemaNode = {
  type: "object",
  additionalProperties: false,
  properties: {
    providers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          provider: { type: "string" },
          name: { type: "string" },
          error: { type: "string" },
          models: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                route: { type: "string" },
                id: { type: "string" },
                name: { type: "string" },
                description: { type: "string" },
                contextWindow: { type: "integer" },
                maxTokens: { type: "integer" },
                efforts: { type: "array", items: { type: "string" } },
                defaultEffort: { type: "string" },
                error: { type: "string" },
              },
              required: ["route", "id", "name", "efforts"],
            },
          },
        },
        required: ["provider", "name", "models"],
      },
    },
    truncated: { type: "boolean" },
    providerFilter: { type: "string" },
  },
  required: ["providers", "truncated"],
};

const TOOL_DESCRIPTION = [
  "List the exact model routes this deployment serves, with each route's advertised reasoning-effort tokens.",
  "",
  "Read-only. Use it before writing `$DSH_HOME/pstack-models.mdc`: it reports what the live adapters actually serve, so a role line names a route that exists instead of a slug guessed from a Cursor name.",
  "",
  "`provider` limits discovery to one registered provider id or display name; omit it to list every provider.",
  "",
  "A route is written `<provider>/<model>`, and a role line may add `[effort]` using a token from that route's `efforts`.",
].join("\n");

/** Build `pstack_models` for one LLM service. */
export function createPstackModelsTool(llm: ModelsLlm): ToolDefinition {
  return {
    name: TOOL_NAME,
    description: TOOL_DESCRIPTION,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        provider: {
          type: "string",
          description: "A registered provider id or display name; omit for every provider.",
        },
      },
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [
        { type: "text", text: renderCatalogue(value as unknown as CatalogueResult) },
      ],
    },
    isConcurrencySafe: () => true,
    async execute(rawArgs, exec: ToolRunContext) {
      if (typeof rawArgs !== "object" || rawArgs === null || Array.isArray(rawArgs)) {
        throw new Error("pstack_models takes an object argument");
      }
      const provider = (rawArgs as Record<string, unknown>)["provider"];
      if (provider !== undefined && typeof provider !== "string") {
        throw new Error("provider must be a string when present");
      }
      return collectCatalogue(llm, provider as string | undefined, exec.signal);
    },
  };
}

/** Register the directory on one row. */
export function apply(ctx: Context): void {
  ctx.tools.register(createPstackModelsTool(ctx.llm));
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
