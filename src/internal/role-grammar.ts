import { findRoleSpec, normalizeRoleName, type RoleSpec } from "./role-manifest.ts";

export type RoleLine =
  | { readonly kind: "blank"; readonly line: number }
  | { readonly kind: "comment"; readonly line: number; readonly budget?: string }
  | { readonly kind: "malformed"; readonly line: number; readonly rawLine: string }
  | { readonly kind: "unknown-role"; readonly line: number; readonly rawKey: string }
  | {
      readonly kind: "role";
      readonly line: number;
      readonly rawKey: string;
      readonly key: string;
      readonly rawValue: string;
      readonly spec: RoleSpec;
      readonly valueStart: number;
      readonly valueEnd: number;
    };

export interface RoleDocument {
  readonly lines: readonly RoleLine[];
}

function frontmatterBodyStart(lines: readonly string[]): number {
  if (lines[0]?.trim() !== "---") return 0;
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index]?.trim() === "---") return index + 1;
  }
  return 0;
}

/** One line grammar for role parsing and byte-preserving updates. */
export function scanRoleDocument(text: string): RoleDocument {
  const lines = text.split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  const bodyStart = frontmatterBodyStart(lines);
  const scanned: RoleLine[] = [];
  let offset = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] as string;
    const line = index + 1 - bodyStart;
    const contentEnd = offset + rawLine.length - (rawLine.endsWith("\r") ? 1 : 0);
    if (index < bodyStart) {
      scanned.push({ kind: "blank", line });
      offset += rawLine.length + 1;
      continue;
    }
    const trimmed = rawLine.trim();
    if (trimmed === "") scanned.push({ kind: "blank", line });
    else if (trimmed.startsWith("#")) {
      const match = /^#\s*budget:\s*(.+)$/i.exec(trimmed);
      scanned.push({
        kind: "comment",
        line,
        ...(match === null ? {} : { budget: (match[1] as string).trim() }),
      });
    } else {
      const separator = trimmed.indexOf(":");
      if (separator === -1) scanned.push({ kind: "malformed", line, rawLine: trimmed });
      else {
        const rawKey = trimmed.slice(0, separator).trim();
        const key = normalizeRoleName(rawKey);
        const spec = findRoleSpec(key);
        if (key === "") scanned.push({ kind: "malformed", line, rawLine: "" });
        else if (spec === undefined) scanned.push({ kind: "unknown-role", line, rawKey });
        else {
          const valueText = rawLine.slice(0, contentEnd - offset);
          const sourceSeparator = valueText.indexOf(":");
          const afterSeparator = valueText.slice(sourceSeparator + 1);
          const rawValue = afterSeparator.trim();
          const valueLeading =
            rawValue === "" ? 0 : afterSeparator.length - afterSeparator.trimStart().length;
          const valueTrailing =
            rawValue === "" ? 0 : afterSeparator.length - afterSeparator.trimEnd().length;
          const valueStart = offset + sourceSeparator + 1 + valueLeading;
          const valueEnd = contentEnd - valueTrailing;
          scanned.push({
            kind: "role",
            line,
            rawKey,
            key,
            rawValue,
            spec,
            valueStart,
            valueEnd,
          });
        }
      }
    }
    offset += rawLine.length + 1;
  }
  return { lines: scanned };
}

/** Replace only the winning role's value, retaining every other source byte. */
export function updateRoleDocument(text: string, spec: RoleSpec, value: string): string {
  const winning = scanRoleDocument(text).lines.findLast(
    (line) => line.kind === "role" && line.key === spec.key,
  );
  if (winning?.kind === "role") {
    return `${text.slice(0, winning.valueStart)}${value}${text.slice(winning.valueEnd)}`;
  }
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const separator = text === "" || text.endsWith("\n") ? "" : eol;
  return `${text}${separator}${spec.key}: ${value}${eol}`;
}
