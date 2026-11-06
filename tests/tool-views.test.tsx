import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { catalogs } from "../src/client/locales.ts";
import { PSTACK_TOOL_NAMES, PstackToolRow } from "../src/client/tool-views.tsx";

function translate(language: "en" | "zh"): (key: string) => string {
  return (key) => catalogs[language][key as keyof typeof catalogs.en] ?? key;
}

function render(toolName: string, language: "en" | "zh"): string {
  return renderToStaticMarkup(
    createElement(PstackToolRow as never, {
      toolName,
      phase: "result",
      block: {
        kind: "tool-result",
        seq: 1,
        time: 0,
        callId: "call-1",
        name: toolName,
        args: {},
        call: {
          name: toolName,
          argsRaw: JSON.stringify({ description: "Research locale behavior" }),
        },
        callTime: 0,
        content: [{ type: "text", text: "done" }],
        isError: false,
        subCalls: [],
      },
      t: translate(language),
    }),
  );
}

describe("PstackToolRow", () => {
  it("renders localized titles, wire names, and descriptions", () => {
    const english = render("pstack_subagent", "en");
    expect(english).toContain("pstack delegation");
    expect(english).toContain("pstack_subagent");
    expect(english).toContain("Delegate work to one or more fresh child agents");

    const chinese = render("pstack_subagent", "zh");
    expect(chinese).toContain("pstack 子代理委派");
    expect(chinese).toContain("pstack_subagent");
    expect(chinese).toContain("把任务按 pstack 角色路由");
    expect(render("pstack_skill", "zh")).toContain("pstack 技能加载");
    expect(render("pstack_roles", "zh")).toContain("展示 pstack 角色 shape");
  });

  it("shows the wire name on every pstack tool card", () => {
    for (const toolName of PSTACK_TOOL_NAMES) {
      const html = render(toolName, "zh");
      expect(html).toContain(`data-tool="${toolName}"`);
      expect(html).toContain(`>${toolName}</code>`);
    }
  });

  it("keeps the tool arguments and result available", () => {
    const html = render("pstack_subagent", "en");
    expect(html).toContain("Research locale behavior");
    expect(html).toContain("Arguments");
    expect(html).toContain("done");
  });
});
