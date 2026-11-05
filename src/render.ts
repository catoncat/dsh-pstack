/**
 * `pstack_render`: optional local rendering for Pele diagrams and slide videos.
 *
 * The tool reports missing dependencies instead of installing anything. Install
 * commands are surfaced to the caller, which asks the user before running them.
 */

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import type { Context } from "@deepseek-ai/cordis";
import type { JsonSchemaNode, ToolDefinition } from "@deepseek-ai/dsh-tools";

import { resolveDshHome } from "./role-config.ts";

/** Cordis row name. */
export const name = "pstack-render";

/** The service this row requires. */
export const inject = ["tools"];

/** Model-facing tool name. */
export const TOOL_NAME = "pstack_render";

export interface RenderResult {
  readonly status: "rendered" | "missing";
  readonly kind: "pele" | "video";
  readonly output?: string;
  readonly missing?: readonly string[];
  readonly message: string;
}

const OUTPUT_SCHEMA: JsonSchemaNode = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["rendered", "missing"] },
    kind: { type: "string", enum: ["pele", "video"] },
    output: { type: "string" },
    missing: { type: "array", items: { type: "string" } },
    message: { type: "string" },
  },
  required: ["status", "kind", "message"],
};

const TOOL_DESCRIPTION = [
  "Render an optional pstack artefact through a locally installed renderer.",
  "",
  '`kind: "pele"` renders a `.mmd` file to SVG with `pele@1.9.0`. `kind: "video"` renders PNG slides from a directory into a silent mp4 with ffmpeg and ImageMagick/convert.',
  "",
  "This tool never installs dependencies. When one is missing it returns `status: missing` with the missing command and an install hint; ask the user before installing anything.",
].join("\n");

/** Build the tool definition. Exported for tests. */
export function createPstackRenderTool(dshHome = resolveDshHome()): ToolDefinition {
  return {
    name: TOOL_NAME,
    description: TOOL_DESCRIPTION,
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        kind: { type: "string", enum: ["pele", "video"] },
        input: { type: "string", description: "A `.mmd` file or a directory of PNG slides." },
        output: { type: "string", description: "Destination SVG or mp4 path." },
        subtitle: { type: "string", description: "Optional subtitle file for video rendering." },
        secondsPerSlide: { type: "number", description: "Video hold per slide, default 3." },
      },
      required: ["kind", "input", "output"],
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [
        { type: "text", text: (value as unknown as RenderResult).message },
      ],
    },
    isConcurrencySafe: () => false,
    async execute(rawArgs) {
      if (typeof rawArgs !== "object" || rawArgs === null || Array.isArray(rawArgs)) {
        throw new Error("pstack_render takes an object argument");
      }
      const args = rawArgs as Record<string, unknown>;
      const kind = args["kind"];
      const input = args["input"];
      const output = args["output"];
      if (kind !== "pele" && kind !== "video") throw new Error("kind must be pele or video");
      if (typeof input !== "string" || input.trim() === "")
        throw new Error("input must be a non-empty path");
      if (typeof output !== "string" || output.trim() === "")
        throw new Error("output must be a non-empty path");
      if (kind === "pele") return renderPele(input, output, dshHome);
      const subtitle = typeof args["subtitle"] === "string" ? args["subtitle"] : undefined;
      const seconds = typeof args["secondsPerSlide"] === "number" ? args["secondsPerSlide"] : 3;
      return renderVideo(input, output, subtitle, seconds);
    },
  };
}

async function renderPele(input: string, output: string, dshHome: string): Promise<RenderResult> {
  if (!existsSync(input)) return missing("pele", [`input ${input} does not exist`]);
  const resolved = resolvePele(dshHome);
  if (resolved === undefined) {
    return missing("pele", [
      "pele@1.9.0 is not installed",
      `install it into the cache with: npm install --prefix ${join(dshHome, "cache/pele")} pele@1.9.0`,
    ]);
  }
  try {
    const module = (await import(pathToFileURL(resolved).href)) as {
      render?: (source: string, options: Record<string, unknown>) => { svg: string };
      default?: { render?: (source: string, options: Record<string, unknown>) => { svg: string } };
    };
    const render = module.render ?? module.default?.render;
    if (typeof render !== "function") {
      return missing("pele", ["the installed pele package does not export render()"]);
    }
    const result = render(readFileSync(input, "utf8"), {
      limit: 1_000_000,
      outputLimit: 8_000_000,
      maxEdges: 10_000,
    });
    writeFileSync(output, result.svg, "utf8");
    return { status: "rendered", kind: "pele", output, message: `rendered ${input} to ${output}` };
  } catch (error) {
    return missing("pele", [`pele failed: ${describeError(error)}`]);
  }
}

function renderVideo(
  input: string,
  output: string,
  subtitle: string | undefined,
  secondsPerSlide: number,
): RenderResult {
  const missingCommands = ["ffmpeg", "magick"].filter((command) => !hasCommand(command));
  if (missingCommands.length > 0) {
    return missing("video", [
      ...missingCommands.map((command) => `${command} is not installed`),
      "install ffmpeg and ImageMagick after user approval, then rerun",
    ]);
  }
  if (!existsSync(input)) return missing("video", [`input ${input} does not exist`]);
  const slides = readdirSync(input)
    .filter((name) => /\.(png|jpe?g)$/i.test(name))
    .sort((a, b) => a.localeCompare(b));
  if (slides.length === 0) return missing("video", [`no PNG or JPEG slides found in ${input}`]);
  const filters = [`fps=30`, `format=yuv420p`];
  if (subtitle !== undefined) filters.unshift(`subtitles=${escapeFilter(subtitle)}`);
  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-framerate",
      `1/${Math.max(1, secondsPerSlide)}`,
      "-pattern_type",
      "glob",
      "-i",
      join(input, "*"),
      "-vf",
      filters.join(","),
      "-c:v",
      "libx264",
      "-r",
      "30",
      output,
    ],
    { encoding: "utf8", timeout: 120_000 },
  );
  if (result.status !== 0) {
    return missing("video", [
      `ffmpeg failed: ${result.stderr?.trim() || result.error?.message || "unknown error"}`,
    ]);
  }
  return {
    status: "rendered",
    kind: "video",
    output,
    message: `rendered ${slides.length} slides to ${output}`,
  };
}

function resolvePele(dshHome: string): string | undefined {
  const origins = [
    () => createRequire(import.meta.url).resolve("pele"),
    () => createRequire(join(dshHome, "cache/pele/package.json")).resolve("pele"),
  ];
  for (const resolve of origins) {
    try {
      return resolve();
    } catch {
      // Try the next location.
    }
  }
  return undefined;
}

function hasCommand(command: string): boolean {
  const result = spawnSync(process.platform === "win32" ? "where" : "which", [command], {
    stdio: "ignore",
  });
  return result.status === 0;
}

function escapeFilter(path: string): string {
  return path.replaceAll("\\", "\\\\").replaceAll(":", "\\:").replaceAll("'", "\\'");
}

function missing(kind: "pele" | "video", reasons: readonly string[]): RenderResult {
  return { status: "missing", kind, missing: reasons, message: reasons.join("; ") };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Register the tool on one row. */
export function apply(ctx: Context): void {
  ctx.tools.register(createPstackRenderTool());
}
