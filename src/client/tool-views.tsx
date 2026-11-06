/** Localized tool cards for the five tools dsh-pstack registers. */

import type { CSSProperties, ReactElement } from "react";
import type { PropsLocale } from "@deepseek-ai/dsh-client-ui-slots";
import type { ToolCallViewProps } from "@deepseek-ai/dsh-client-ui-tool/client";

import type { PstackLocaleKey } from "./locales.ts";

/** Wire names of the tools this view covers. */
export const PSTACK_TOOL_NAMES = [
  "pstack_subagent",
  "pstack_skill",
  "pstack_models",
  "pstack_roles",
  "pstack_render",
] as const;

type PstackToolName = (typeof PSTACK_TOOL_NAMES)[number];

const TOOL_TITLES: Record<PstackToolName, PstackLocaleKey> = {
  pstack_subagent: "toolSubagent",
  pstack_skill: "toolSkill",
  pstack_models: "toolModels",
  pstack_roles: "toolRoles",
  pstack_render: "toolRender",
};

const ARGUMENT_KEYS: Record<string, readonly string[]> = {
  pstack_subagent: ["description", "prompt"],
  pstack_skill: ["name", "resource"],
  pstack_models: ["provider"],
  pstack_render: ["input", "output"],
};

type PstackToolRowProps = ToolCallViewProps & PropsLocale<"pstack">;

/** Render one pstack tool call with a localized title. */
export function PstackToolRow(props: PstackToolRowProps): ReactElement {
  const state = stateOf(props);
  const raw = rawArgsOf(props);
  const output = props.phase === "result" ? contentText(props.block.content) : undefined;
  const summary = argumentSummary(props.toolName, raw);
  const titleKey = TOOL_TITLES[props.toolName as PstackToolName] ?? "toolGeneric";
  return (
    <div data-tool={props.toolName} data-state={state} style={cardStyle}>
      <div style={rowStyle}>
        <span aria-hidden="true" style={dotStyle(state)} />
        <span style={titleStyle}>{props.t(titleKey)}</span>
        {summary === "" ? null : <span style={summaryStyle}>{summary}</span>}
      </div>
      {raw === "" ? null : (
        <details style={detailsStyle}>
          <summary style={summaryLinkStyle}>{props.t("toolArguments")}</summary>
          <pre style={preStyle}>{raw}</pre>
        </details>
      )}
      {output === undefined || output === "" ? null : (
        <details style={detailsStyle} open={state === "error"}>
          <summary style={summaryLinkStyle}>{props.t("toolResult")}</summary>
          <pre style={preStyle}>{output}</pre>
        </details>
      )}
    </div>
  );
}

type PstackToolState = "preparing" | "running" | "ok" | "error";

function stateOf(props: PstackToolRowProps): PstackToolState {
  if (props.phase === "preparing") return "preparing";
  if (props.phase === "start") return "running";
  return props.block.isError ? "error" : "ok";
}

function rawArgsOf(props: PstackToolRowProps): string {
  if (props.phase === "start") return props.block.argsRaw;
  if (props.phase === "result") return props.block.call?.argsRaw ?? "";
  return "";
}

function argumentSummary(toolName: string, raw: string): string {
  if (raw === "") return "";
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return "";
    const record = parsed as Record<string, unknown>;
    for (const key of ARGUMENT_KEYS[toolName] ?? []) {
      const value = record[key];
      if (typeof value === "string" && value.trim() !== "") return truncate(value.trim());
    }
  } catch {
    return "";
  }
  return "";
}

function contentText(content: readonly unknown[]): string {
  return content
    .map((block) => {
      if (typeof block !== "object" || block === null) return String(block);
      const typed = block as { type?: unknown; text?: unknown };
      if (typed.type === "text" && typeof typed.text === "string") return typed.text;
      return JSON.stringify(block, null, 2);
    })
    .join("\n");
}

function truncate(value: string): string {
  return value.length <= 88 ? value : `${value.slice(0, 87)}…`;
}

const cardStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  padding: "8px 10px",
  border: "1px solid var(--dsw-alias-border-l3)",
  borderRadius: 8,
  background: "var(--dsw-alias-bg-layer-1)",
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
};

function dotStyle(state: PstackToolState): CSSProperties {
  const color =
    state === "error"
      ? "var(--dsw-alias-state-error-primary)"
      : state === "ok"
        ? "var(--dsw-alias-label-secondary)"
        : "var(--dsw-alias-brand-primary)";
  return { width: 6, height: 6, borderRadius: 3, background: color, flex: "none" };
}

const titleStyle: CSSProperties = {
  color: "var(--dsw-alias-label-primary)",
  fontSize: 13,
  fontWeight: 600,
  flex: "none",
};

const summaryStyle: CSSProperties = {
  color: "var(--dsw-alias-label-secondary)",
  fontSize: 12,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  minWidth: 0,
};

const detailsStyle: CSSProperties = {
  color: "var(--dsw-alias-label-secondary)",
  fontSize: 12,
};

const summaryLinkStyle: CSSProperties = {
  cursor: "pointer",
  userSelect: "none",
};

const preStyle: CSSProperties = {
  margin: "4px 0 0",
  padding: 8,
  overflow: "auto",
  maxHeight: 220,
  borderRadius: 6,
  background: "var(--dsw-alias-bg-layer-2)",
  color: "var(--dsw-alias-label-secondary)",
  fontSize: 11,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};
