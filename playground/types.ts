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
}

export interface ToolCallEvidence {
  name: string;
  status: string;
  errorText?: string;
}

export interface SessionEvidence {
  caseId: string;
  mode: Mode;
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
