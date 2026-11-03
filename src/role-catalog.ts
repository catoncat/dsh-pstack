/**
 * `pstack_roles`: a read-only capability lookup for the pstack role manifest.
 *
 * `pstack_subagent` requires every argument explicitly, and `roleIndex` is only
 * meaningful for a list role that is not an automatic panel. This tool turns that
 * manifest fact into a queryable answer, so a caller checks a role's shape before a
 * delegation instead of reading the source or guessing. It reads no file and holds no
 * policy: the manifest is the only source.
 */

import type { JsonSchemaNode, ToolDefinition, ToolsHost } from "./internal/host-contract.ts";
import { ROLE_MANIFEST, type RoleSpec, type RoleValueShape } from "./internal/role-manifest.ts";

/** Cordis row name, used by Loader diagnostics. */
export const name = "pstack-role-catalog";

/** The row only needs the tool registry. */
export const inject = ["tools"];

/** Model-facing tool name. */
export const TOOL_NAME = "pstack_roles";

/** Whether `roleIndex` may be passed for a role. */
export type RoleIndexApplicability = "not-applicable" | "optional";

export interface RoleCapability {
  /** The exact key to pass as `role`. */
  readonly role: string;
  /** One route, or a comma-separated list of routes. */
  readonly shape: RoleValueShape;
  /** A list role that starts one child per entry automatically. */
  readonly autoPanel: boolean;
  /** `optional` only for a list role that is not an automatic panel. */
  readonly roleIndex: RoleIndexApplicability;
  /** How this role expands into children. */
  readonly usage: string;
}

/** Derive one role's capability from its manifest entry. */
export function roleCapability(spec: RoleSpec): RoleCapability {
  if (spec.autoPanel) {
    return {
      role: spec.key,
      shape: spec.shape,
      autoPanel: true,
      roleIndex: "not-applicable",
      usage: "one child per configured entry",
    };
  }
  if (spec.shape === "list") {
    return {
      role: spec.key,
      shape: spec.shape,
      autoPanel: false,
      roleIndex: "optional",
      usage: "one child, choosing one configured entry",
    };
  }
  return {
    role: spec.key,
    shape: spec.shape,
    autoPanel: false,
    roleIndex: "not-applicable",
    usage: "one child on the role's single route",
  };
}

/** Every role's capability, in manifest order. */
export function roleCapabilities(): readonly RoleCapability[] {
  return ROLE_MANIFEST.map(roleCapability);
}

/** Render the capability list for the model. */
export function renderRoleCapabilities(roles: readonly RoleCapability[]): string {
  const lines = [
    "pstack roles. Pass the exact `role` key. `roleIndex` is null unless the role is a list that is not an automatic panel.",
    "",
    ...roles.map(
      (role) =>
        `- ${role.role} — shape=${role.shape}${role.autoPanel ? ", autoPanel=true" : ""}; roleIndex=${role.roleIndex}; ${role.usage}`,
    ),
  ];
  return lines.join("\n");
}

const OUTPUT_SCHEMA: JsonSchemaNode = {
  type: "object",
  additionalProperties: false,
  properties: {
    roles: {
      type: "array",
      description: "One capability record per role, in manifest order.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          role: { type: "string", description: "The exact key to pass as `role`." },
          shape: {
            type: "string",
            enum: ["single", "list"],
            description: "One route, or a comma-separated list of routes.",
          },
          autoPanel: {
            type: "boolean",
            description: "A list role that starts one child per configured entry.",
          },
          roleIndex: {
            type: "string",
            enum: ["not-applicable", "optional"],
            description:
              "`optional` only for a list role that is not an automatic panel; otherwise pass null.",
          },
          usage: { type: "string", description: "How this role expands into children." },
        },
        required: ["role", "shape", "autoPanel", "roleIndex", "usage"],
      },
    },
  },
  required: ["roles"],
};

const TOOL_DESCRIPTION = [
  "List every pstack role with its `shape` and `autoPanel`, so a `pstack_subagent` call passes the right `role` and `roleIndex` before it starts.",
  "",
  "Read-only. It reports the role manifest, not the routes in `$DSH_HOME/pstack-models.mdc`; use `pstack_models` for the routes this deployment actually serves.",
  "",
  "`roleIndex` applies only to a list role that is not an automatic panel: `arena cross-judge pool` and `swarm workers`. Pass `null` for every single role and for an automatic panel (`arena runners`, `architect runners`, `interrogate reviewers`), which starts one child per configured entry.",
].join("\n");

export function createPstackRoleCatalogTool(): ToolDefinition {
  return {
    name: TOOL_NAME,
    description: TOOL_DESCRIPTION,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [
        {
          type: "text",
          text: renderRoleCapabilities(
            (value as unknown as { roles: readonly RoleCapability[] }).roles,
          ),
        },
      ],
    },
    isConcurrencySafe: () => true,
    async execute() {
      return { roles: roleCapabilities() };
    },
  };
}

/** The slice of the Cordis context this row uses. */
export interface PstackRoleCatalogHost {
  readonly tools: ToolsHost;
}

/** Register `pstack_roles`. */
export function apply(ctx: PstackRoleCatalogHost): void {
  ctx.tools.register(createPstackRoleCatalogTool());
}
