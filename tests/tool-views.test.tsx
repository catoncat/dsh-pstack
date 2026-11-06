import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { catalogs } from "../src/client/locales.ts";
import { PstackToolRow } from "../src/client/tool-views.tsx";

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
  it("renders localized tool titles", () => {
    expect(render("pstack_subagent", "en")).toContain("Delegate");
    expect(render("pstack_subagent", "zh")).toContain("委派子代理");
    expect(render("pstack_skill", "zh")).toContain("加载技能");
  });

  it("keeps the tool arguments and result available", () => {
    const html = render("pstack_subagent", "en");
    expect(html).toContain("Research locale behavior");
    expect(html).toContain("Arguments");
    expect(html).toContain("done");
  });
});
