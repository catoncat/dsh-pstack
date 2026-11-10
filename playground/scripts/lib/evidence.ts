// Turn a persisted DSH session (session.v4.jsonl.zstd) into the evidence shape the
// playground judges against, and evaluate a case's expect list from it.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type {
  CaseVerdict,
  Expectation,
  Mode,
  SessionEvidence,
  ToolCallEvidence,
} from "../../types";

interface SessionEvent {
  type: string;
  cwd?: string;
  data?: Record<string, unknown>;
}

export interface SessionDigest {
  sessionId: string;
  workspacePath: string | null;
  route: { provider: string; model: string; effort: string } | null;
  skillLoads: string[];
  toolCalls: ToolCallEvidence[];
  turnEndReason: string | null;
  assistantText: string;
  userText: string;
}

/** zstdcat the session file. A partial or missing file yields [] so a poller can retry. */
export function readSessionEvents(file: string): SessionEvent[] {
  if (!existsSync(file)) return [];
  const result = spawnSync("zstdcat", [file], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) return [];
  const events: SessionEvent[] = [];
  for (const line of (result.stdout ?? "").split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    try {
      events.push(JSON.parse(trimmed) as SessionEvent);
    } catch {
      // a flushed tail can end mid-line; the next poll sees the whole record
    }
  }
  return events;
}

function textOfContent(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (part && typeof part === "object" && (part as { type?: string }).type === "text") {
        return (part as { text?: string }).text ?? "";
      }
      return "";
    })
    .filter((text) => text !== "")
    .join("");
}

const SKILL_TOOLS = new Set(["skill", "pstack_skill", "pstack-skill"]);

export function digestSession(file: string, sessionId: string): SessionDigest {
  const events = readSessionEvents(file);
  if (events.length === 0) throw new Error(`session file has no readable events: ${file}`);

  const toolCalls: ToolCallEvidence[] = [];
  const callsById = new Map<string, ToolCallEvidence>();
  const skillLoads: string[] = [];
  let workspacePath: string | null = null;
  let route: SessionDigest["route"] = null;
  let turnEndReason: string | null = null;
  const assistantParts: string[] = [];
  let userText = "";

  for (const event of events) {
    const data = event.data ?? {};
    switch (event.type) {
      case "session": {
        if (typeof event.cwd === "string") workspacePath = event.cwd;
        break;
      }
      case "request/header": {
        if (route) break;
        const config = (
          data.header as
            | { config?: { provider?: string; model?: string; reasoningEffort?: string } }
            | undefined
        )?.config;
        if (config?.provider && config.model) {
          route = {
            provider: config.provider,
            model: config.model,
            effort: config.reasoningEffort ?? "",
          };
        }
        break;
      }
      case "tool/call": {
        const name = typeof data.name === "string" ? data.name : "";
        const callId = typeof data.callId === "string" ? data.callId : "";
        const call: ToolCallEvidence = { name, status: "pending" };
        toolCalls.push(call);
        if (callId) callsById.set(callId, call);
        if (SKILL_TOOLS.has(name)) {
          const args = parseArguments(data.arguments);
          const skillName = typeof args.name === "string" ? args.name : "";
          const resource = typeof args.resource === "string" ? args.resource : "";
          if (skillName) skillLoads.push(resource ? `${skillName}#${resource}` : skillName);
        }
        break;
      }
      case "tool/result": {
        const message = data.message as
          | { isError?: boolean; content?: unknown; toolCallId?: string }
          | undefined;
        if (!message) break;
        const rawCallId = data.toolCallId ?? message.toolCallId;
        const callId = typeof rawCallId === "string" ? rawCallId : "";
        const call = callsById.get(callId);
        if (!call) break;
        if (message.isError === true) {
          call.status = "error";
          call.errorText = textOfContent(message.content).slice(0, 2000);
        } else {
          call.status = "ok";
        }
        break;
      }
      case "assistant/message": {
        const content = (data.message as { content?: unknown } | undefined)?.content;
        const text = textOfContent(content);
        if (text !== "") assistantParts.push(text);
        break;
      }
      case "user/message": {
        const source = data.source as { kind?: string } | undefined;
        const text = textOfContent(data.content);
        if (userText === "" && source?.kind === "user" && text !== "") userText = text;
        break;
      }
      case "turn/end": {
        const reason = data.reason as { kind?: string } | undefined;
        turnEndReason = reason?.kind ?? null;
        break;
      }
      default:
        break;
    }
  }

  return {
    sessionId,
    workspacePath,
    route,
    skillLoads,
    toolCalls,
    turnEndReason,
    assistantText: assistantParts.join("\n"),
    userText,
  };
}

function parseArguments(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (raw as Record<string, unknown>) ?? {};
}

export function toSessionEvidence(
  digest: SessionDigest,
  caseId: string,
  mode: Mode,
  sessionFile: string,
  capturedAt: string,
): SessionEvidence {
  return {
    caseId,
    mode,
    sessionId: digest.sessionId,
    sessionFile,
    workspacePath: digest.workspacePath,
    route: digest.route,
    skillLoads: digest.skillLoads,
    toolCalls: digest.toolCalls,
    turnEndReason: digest.turnEndReason,
    assistantText: digest.assistantText,
    capturedAt,
  };
}

/** Top-level skill loads only exist without a resource suffix; a resource read is not a reload. */
function duplicateSkillLoads(skillLoads: string[]): string[] {
  const counts = new Map<string, number>();
  for (const entry of skillLoads) {
    if (entry.includes("#")) continue;
    counts.set(entry, (counts.get(entry) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name);
}

function retryAfterFailure(toolCalls: ToolCallEvidence[]): string[] {
  const failures = new Set<string>();
  for (let i = 0; i < toolCalls.length; i++) {
    if (toolCalls[i].status !== "error") continue;
    const name = toolCalls[i].name;
    if (toolCalls.slice(i + 1).some((later) => later.name === name)) failures.add(name);
  }
  return [...failures];
}

/** Judge every expectation against the digest and the case workspace. Returns human-readable failures. */
export function judgeExpectations(
  expectations: Expectation[],
  evidence: SessionEvidence,
  workspaceDir: string,
): string[] {
  const failures: string[] = [];
  for (const expectation of expectations) {
    switch (expectation.kind) {
      case "turn-completed": {
        if (evidence.turnEndReason !== "completed") {
          failures.push(
            `turn-completed: turn ended with ${evidence.turnEndReason ?? "no turn/end"}`,
          );
        }
        break;
      }
      case "no-tool-error": {
        const errors = evidence.toolCalls.filter((call) => call.status === "error");
        if (errors.length > 0)
          failures.push(`no-tool-error: ${errors.map((call) => call.name).join(", ")}`);
        break;
      }
      case "no-duplicate-skill-load": {
        const duplicates = duplicateSkillLoads(evidence.skillLoads);
        if (duplicates.length > 0)
          failures.push(`no-duplicate-skill-load: ${duplicates.join(", ")}`);
        break;
      }
      case "no-retry-after-failure": {
        const retried = retryAfterFailure(evidence.toolCalls);
        if (retried.length > 0) failures.push(`no-retry-after-failure: ${retried.join(", ")}`);
        break;
      }
      case "skill-loaded": {
        const wanted = expectation.detail ?? "";
        const loaded = evidence.skillLoads.some(
          (entry) => entry.split("#")[0] === wanted || entry.split("#")[0].endsWith(`:${wanted}`),
        );
        if (!loaded) failures.push(`skill-loaded: ${wanted} was never loaded`);
        break;
      }
      case "artifact-contains": {
        const detail = expectation.detail ?? "";
        const marker = detail.indexOf("::");
        const relativePath = marker >= 0 ? detail.slice(0, marker) : detail;
        const needle = marker >= 0 ? detail.slice(marker + 2) : "";
        const target = join(workspaceDir, relativePath);
        if (!existsSync(target)) {
          failures.push(`artifact-contains: missing ${relativePath}`);
        } else if (needle !== "" && !readFileSync(target, "utf8").includes(needle)) {
          failures.push(`artifact-contains: ${relativePath} lacks "${needle}"`);
        }
        break;
      }
      default: {
        const unknown = expectation.kind as string;
        failures.push(`unknown expectation kind: ${unknown}`);
      }
    }
  }
  return failures;
}

export function buildVerdict(
  expectations: Expectation[],
  evidence: SessionEvidence,
  workspaceDir: string,
): CaseVerdict {
  const failures = judgeExpectations(expectations, evidence, workspaceDir);
  if (evidence.workspacePath !== null && evidence.workspacePath !== workspaceDir) {
    failures.unshift(
      `workspace: session ran in ${evidence.workspacePath}, expected ${workspaceDir}`,
    );
  }
  return {
    caseId: evidence.caseId,
    mode: evidence.mode,
    passed: failures.length === 0,
    failures,
    evidence,
  };
}
