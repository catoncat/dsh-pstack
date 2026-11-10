// Data shapes for the browser-only playground. Every script and case imports from here.

export type Mode = "raw" | "adapted";

export interface PlaygroundConfig {
  providers: Record<string, { apiKey: string; models: Record<string, string[]> }>;
}

export interface AllowedRoute {
  provider: string;
  model: string;
  efforts: string[];
  apiKey: string;
}

export interface PreparedEnv {
  mode: Mode;
  home: string;
  browserHome: string;
  port: number;
  url: string;
  workspaceDirs: Record<string, string>;
}

export type ExpectationKind =
  | "turn-completed"
  | "no-tool-error"
  | "no-duplicate-skill-load"
  | "no-retry-after-failure"
  | "skill-loaded"
  | "preset-active"
  | "artifact-contains";

export interface Expectation {
  kind: ExpectationKind;
  detail?: string;
}

export interface SkillCase {
  id: string;
  skill: string;
  kind: "behavior" | "principle-light";
  stages: Mode[];
  prompt: string;
  workspaceFiles: Record<string, string>;
  expect: Expectation[];
  intent: string;
  /** Per-case probe window override, in seconds. Wins over the kind default but not `--probe`. */
  probeSeconds?: number;
  /** Scripted answers for ask_user_question when no human is present. First matching rule wins. */
  answers?: Array<{ match: string; selected?: string[]; custom?: string }>;
}

export interface ToolCallEvidence {
  name: string;
  status: string;
  errorText?: string;
}

export interface SessionEvidence {
  caseId: string;
  mode: Mode;
  worker: number;
  truncated: boolean;
  sessionId: string;
  sessionFile: string;
  workspacePath: string | null;
  agentPreset: string | null;
  route: { provider: string; model: string; effort: string } | null;
  skillLoads: string[];
  toolCalls: ToolCallEvidence[];
  turnEndReason: string | null;
  assistantText: string;
  capturedAt: string;
  /** Set to "infra" when the run failed on infrastructure (no session / unreadable log), not a FAIL. */
  error?: string;
  /** The judged outcome written beside the evidence so a rerun can select failures without re-digesting. */
  verdict?: { passed: boolean; failures: string[] };
  /** Questions the harness answered on the user's behalf, with the answer it gave. */
  autoAnswers?: Array<{ question: string; answer: string }>;
}

export interface CaseVerdict {
  caseId: string;
  mode: Mode;
  passed: boolean;
  failures: string[];
  evidence: SessionEvidence;
}

export interface Finding {
  skill: string;
  mode: Mode;
  sessionId: string;
  observed: string[];
  neededAdapterNotes: string[];
  neededPluginTools: string[];
  verdict: "clean" | "gap" | "blocked";
}
