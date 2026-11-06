/** Host role configuration service for the pstack settings page. */

import { Service } from "@deepseek-ai/cordis";
import type { Context } from "@deepseek-ai/cordis";
import type {} from "@deepseek-ai/dsh-llm";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";

import { collectCatalogue, type ModelsLlm } from "./models.ts";
import { modelsFilePath, readRoleConfiguration, resolveDshHome } from "./role-config.ts";
import {
  saveBudgetConfiguration,
  saveRoleConfiguration,
  snapshotFromConfiguration,
} from "./role-editor.ts";
import { pstackRolesRemote, REMOTE_PACKAGE, ROLES_SERVICE } from "./role-remote.ts";
import type {
  RoleFileSnapshot,
  SaveBudgetRequest,
  SaveBudgetResult,
  SaveRoleRequest,
  SaveRoleResult,
} from "./role-wire.ts";

interface TypertHost {
  register(contribution: {
    readonly package: string;
    readonly face: "host";
    readonly schemas: readonly unknown[];
    readonly model: {
      readonly services: readonly unknown[];
      readonly events: readonly unknown[];
      readonly objects: readonly unknown[];
    };
    readonly invocations: unknown;
  }): unknown;
}

/** Read and write `$DSH_HOME/pstack-models.mdc` for the Web settings page. */
export class PstackRolesService extends TypertRemoteService {
  static inject = ["llm", "typert"];

  constructor(ctx: Context) {
    super(ctx, ROLES_SERVICE);
  }

  protected [Service.init](): void {
    const typert = (this.ctx as unknown as { typert?: TypertHost }).typert;
    if (typert === undefined) throw new Error("pstack-roles requires the Typert registry service");
    typert.register({
      package: REMOTE_PACKAGE,
      face: "host",
      schemas: [],
      model: { services: [], events: [], objects: [] },
      invocations: pstackRolesRemote.descriptors,
    });
  }

  /** Current path, status, values, and per-line issues. */
  status(): RoleFileSnapshot {
    return snapshotFromConfiguration(readRoleConfiguration(roleFilePath()));
  }

  /** The live model directory used by the page's selectors. */
  async catalogue(signal: AbortSignal): Promise<unknown> {
    return collectCatalogue(this.llm, undefined, signal);
  }

  /** Validate and save one role, then return the reloaded snapshot. */
  async save(request: SaveRoleRequest, signal: AbortSignal): Promise<SaveRoleResult> {
    signal.throwIfAborted();
    return saveRoleConfiguration(roleFilePath(), request, this.llm, signal);
  }

  /** Save the budget line and return the reloaded snapshot. */
  saveBudget(request: SaveBudgetRequest): SaveBudgetResult {
    return saveBudgetConfiguration(roleFilePath(), request);
  }

  private get llm(): ModelsLlm {
    return this.ctx.llm;
  }
}

function roleFilePath(): string {
  return modelsFilePath(resolveDshHome());
}

export default PstackRolesService;
