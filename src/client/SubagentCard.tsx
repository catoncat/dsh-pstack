/** Chat card for one `pstack_subagent` call. */

import { useState, type ReactElement } from "react";

import type { PstackTranslations } from "./locales/index.ts";

/** The subset of the tool-call block this view reads. */
interface ToolBlock {
  readonly argsRaw?: string;
  readonly callId?: string;
  readonly call?: { readonly argsRaw?: string };
  readonly content?: readonly { readonly type: string; readonly text?: string }[];
  readonly isError?: boolean;
  readonly error?: { readonly code?: string };
}

export interface SubagentRowProps {
  readonly phase: "preparing" | "start" | "result";
  readonly block: ToolBlock;
  readonly translations: PstackTranslations;
}

interface DelegationArgs {
  readonly description?: string;
  readonly agent?: string;
  readonly role?: string | null;
  readonly reasoningEffort?: string | null;
}

interface ChildLine {
  readonly id: string;
  readonly agent: string;
  readonly role: string;
  readonly route: string;
}

const ARGS = /"([a-zA-Z]+)"\s*:\s*("([^"\\]|\\.)*"|null)/g;

/** Read the delegated roles even while the call is still streaming. */
function parseArgs(raw: string | undefined): DelegationArgs {
  if (raw === undefined || raw.trim() === "") return {};
  const result: Record<string, string | null> = {};
  for (const match of raw.matchAll(ARGS)) {
    const key = match[1];
    const literal = match[2];
    if (key === undefined || literal === undefined) continue;
    if (literal === "null") result[key] = null;
    else {
      try {
        result[key] = JSON.parse(literal) as string;
      } catch {
        result[key] = literal.slice(1, -1);
      }
    }
  }
  return {
    ...(typeof result["description"] === "string" ? { description: result["description"] } : {}),
    ...(typeof result["agent"] === "string" ? { agent: result["agent"] } : {}),
    ...(result["role"] === null || typeof result["role"] === "string"
      ? { role: result["role"] as string | null }
      : {}),
    ...(result["reasoningEffort"] === null || typeof result["reasoningEffort"] === "string"
      ? { reasoningEffort: result["reasoningEffort"] as string | null }
      : {}),
  };
}

/** Pull one line per started child out of the tool's rendered result. */
function parseChildren(block: ToolBlock): readonly ChildLine[] {
  const text = (block.content ?? [])
    .filter((item) => item.type === "text" && item.text !== undefined)
    .map((item) => item.text ?? "")
    .join("\n");
  const lines: ChildLine[] = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith("- ")) continue;
    const id = /^- (\S+) \(/.exec(line)?.[1];
    if (id === undefined) continue;
    lines.push({
      id,
      agent: /agent=([^\s]+)/.exec(line)?.[1] ?? "?",
      role: /role=(.+?) route=/.exec(line)?.[1]?.trim() ?? "?",
      route: /route=(.+?)(?: effort=| maxDepth=|$)/.exec(line)?.[1]?.trim() ?? "?",
    });
  }
  return lines;
}

function stateOf(block: ToolBlock): "running" | "stopped" | "error" | "ok" {
  if (block.content === undefined) return "running";
  if (block.error?.code === "interrupted") return "stopped";
  if (block.isError === true) return "error";
  return "ok";
}

/** Render one delegation as a head row plus one row per child. */
export function SubagentRow(props: SubagentRowProps): ReactElement {
  const { phase, block, translations } = props;
  const t = translations.config;
  const [open, setOpen] = useState(true);
  if (phase === "preparing") {
    return (
      <div className="pstack-tool-card" data-tool="pstack_subagent" data-state="preparing">
        <div className="pstack-tool-head">
          <span className="pstack-tool-title">{t("toolPreparing")}</span>
        </div>
      </div>
    );
  }

  const args = parseArgs(block.call?.argsRaw ?? block.argsRaw);
  const children = parseChildren(block);
  const state = stateOf(block);
  const status = {
    running: t("toolRunning"),
    ok: t("toolDone"),
    error: t("toolFailed"),
    stopped: t("toolStopped"),
  }[state];

  return (
    <div className="pstack-tool-card" data-tool="pstack_subagent" data-state={state}>
      <button
        type="button"
        className="pstack-tool-head"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="pstack-tool-title">{args.description ?? "pstack_subagent"}</span>
        <span className="pstack-tool-status">{status}</span>
      </button>
      <div className="pstack-tool-chips">
        {args.agent === undefined ? null : <span className="pstack-tool-chip">{args.agent}</span>}
        {args.role === null || args.role === undefined ? null : (
          <span className="pstack-tool-chip">{args.role}</span>
        )}
        {args.reasoningEffort === null || args.reasoningEffort === undefined ? null : (
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
