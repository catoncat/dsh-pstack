/** Chat card for one `pstack_subagent` call. */

import type { ToolCallOwnerProps } from "@deepseek-ai/dsh-client-ui-tool/client";
import type { PropsLocale } from "@deepseek-ai/dsh-client-ui-slots";
import type { ReactElement } from "react";

import { NS } from "./locales/index.ts";

export type SubagentRowProps = ToolCallOwnerProps & PropsLocale<typeof NS.config>;

interface DelegationArgs {
  readonly description?: string;
  readonly agent?: string;
  readonly role?: string;
  readonly reasoningEffort?: string;
}

interface TextArgumentReader {
  readonly text: (key: string) => string | undefined;
}

interface TextContent {
  readonly type: string;
  readonly text?: string;
}

interface ChildLine {
  readonly id: string;
  readonly agent: string;
  readonly role: string;
  readonly route: string;
}

/** Read the displayed delegation fields through the host's lazy argument view. */
export function readDelegationArgs(args: TextArgumentReader): DelegationArgs {
  const description = args.text("description");
  const agent = args.text("agent");
  const role = args.text("role");
  const reasoningEffort = args.text("reasoningEffort");
  return {
    ...(description === undefined ? {} : { description }),
    ...(agent === undefined ? {} : { agent }),
    ...(role === undefined ? {} : { role }),
    ...(reasoningEffort === undefined ? {} : { reasoningEffort }),
  };
}

export function delegationState(
  phase: ToolCallOwnerProps["phase"],
  result?: {
    readonly isError: boolean;
    readonly error?: { readonly code: string };
    readonly meta?: unknown;
  },
): "preparing" | "running" | "stopped" | "error" | "ok" {
  if (phase === "preparing") return "preparing";
  if (phase === "start") return "running";
  if (result?.error?.code === "interrupted") return "stopped";
  const stopped =
    typeof result?.meta === "object" &&
    result.meta !== null &&
    !Array.isArray(result.meta) &&
    "stopped" in result.meta &&
    result.meta.stopped === true;
  if (result?.isError === true || stopped) return "error";
  return "ok";
}

export function parseChildLines(content: readonly TextContent[]): readonly ChildLine[] {
  const text = content
    .filter((item) => item.type === "text" && item.text !== undefined)
    .map((item) => item.text ?? "")
    .join("\n");
  const lines: ChildLine[] = [];
  for (const line of text.split("\n")) {
    const match =
      /^- (\S+) \((.*?)\) agent=(\S+) role=(.*?) route=(\S+)(?: effort=(\S+))?(?: maxDepth=(\d+))?$/.exec(
        line,
      );
    if (match === null) continue;
    const [, id, , agent, role, route] = match;
    if (id === undefined || agent === undefined || role === undefined || route === undefined)
      continue;
    lines.push({ id, agent, role, route });
  }
  return lines;
}

/** Render one delegation as a head row plus one row per child. */
export function SubagentRow(props: SubagentRowProps): ReactElement {
  const { phase, t } = props;
  const { expanded: open, toggle } = props.useDisclosure();
  if (phase === "preparing") {
    return (
      <div className="pstack-tool-card" data-tool="pstack_subagent" data-state="preparing">
        <div className="pstack-tool-head">
          <span className="pstack-tool-title">{t("toolPreparing")}</span>
        </div>
      </div>
    );
  }

  const args = readDelegationArgs(props.block.args);
  const state = delegationState(phase, phase === "result" ? props.block : undefined);
  const children = phase === "result" ? parseChildLines(props.block.content) : [];
  const status = {
    preparing: t("toolPreparing"),
    running: t("toolRunning"),
    ok: t("toolDone"),
    error: t("toolFailed"),
    stopped: t("toolStopped"),
  }[state];

  return (
    <div className="pstack-tool-card" data-tool="pstack_subagent" data-state={state}>
      <button type="button" className="pstack-tool-head" aria-expanded={open} onClick={toggle}>
        <span className="pstack-tool-title">{args.description ?? "pstack_subagent"}</span>
        <span className="pstack-tool-status">{status}</span>
      </button>
      <div className="pstack-tool-chips">
        {args.agent === undefined ? null : <span className="pstack-tool-chip">{args.agent}</span>}
        {args.role === undefined ? null : <span className="pstack-tool-chip">{args.role}</span>}
        {args.reasoningEffort === undefined ? null : (
          <span className="pstack-tool-chip">{args.reasoningEffort}</span>
        )}
      </div>
      {open && children.length > 0 ? (
        <ul className="pstack-tool-children">
          {children.map((child) => (
            <li key={child.id} className="pstack-tool-child">
              <span className="pstack-tool-child-id">{child.id.slice(0, 8)}</span>
              <span className="pstack-tool-route">{child.route}</span>
              <span className="pstack-tool-child-role">{child.role}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
