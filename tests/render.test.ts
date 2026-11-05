import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { createPstackRenderTool, TOOL_NAME } from "../src/render.ts";

const directories: string[] = [];

function home(): string {
  const directory = mkdtempSync(join(tmpdir(), "pstack-render-"));
  directories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

const exec = { signal: new AbortController().signal } as never;

describe("pstack_render", () => {
  it("reports missing Pele without installing anything", async () => {
    const tool = createPstackRenderTool(home());
    expect(tool.name).toBe(TOOL_NAME);
    const result = (await tool.execute(
      { kind: "pele", input: "/missing.mmd", output: "/tmp/out.svg" },
      exec,
    )) as { status: string; missing: string[] };
    expect(result.status).toBe("missing");
    expect(result.missing.join("\n")).toMatch(/does not exist/);
  });

  it("reports missing video dependencies", async () => {
    const tool = createPstackRenderTool(home());
    const result = (await tool.execute(
      { kind: "video", input: "/missing-slides", output: "/tmp/out.mp4" },
      exec,
    )) as { status: string; missing: string[] };
    expect(result.status).toBe("missing");
    expect(result.missing.length).toBeGreaterThan(0);
  });
});
