/**
 * `pstack-readonly`: seed the read-only sandbox policy into readonly-preset children.
 *
 * Preset compositions are shared by every Agent that selects the preset, so the
 * listener checks the durable Session header instead of assuming its context is
 * already one child.
 */

import type { Context } from "@deepseek-ai/cordis";
import { setSandboxMode } from "@deepseek-ai/dsh-sandbox-policy";

/** Cordis row name. */
export const name = "pstack-readonly";

/** Register the policy seed. */
export function apply(ctx: Context): void {
  ctx.effect(() =>
    ctx.on("agent/created", ({ agent }) => {
      if (agent.session.header.agentPreset === "readonly") {
        setSandboxMode(agent.session, "read-only");
      }
    }),
  );
}
