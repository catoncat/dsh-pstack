// Land the persistent browser profile in the prepared workspace: open the tokenized
// URL, dismiss the preview notice, and prove the page shows the workspace and model
// chip instead of a login or 401 wall.

import { join } from "node:path";

import { BROWSER_DIR, readHomePlan, readWebUrl, readWorkspaceStore } from "./lib/env";
import { createBrowserSession } from "./lib/browser";

const CONTINUE_LABEL = "继续";
const PREVIEW_NOTICE = "预览版说明";

async function main(): Promise<void> {
  const url = readWebUrl();
  const plan = readHomePlan();
  const { defaultTitle } = readWorkspaceStore();

  const session = createBrowserSession({ session: "playground" });
  const failures: string[] = [];
  try {
    session.open(url);
    session.wait(7000);

    let body = session.eval<string>("document.body.innerText");
    for (let attempt = 0; attempt < 3 && body.includes(PREVIEW_NOTICE); attempt++) {
      const clicked = session.eval<boolean>(
        `(() => {
          const button = [...document.querySelectorAll("button")].find((element) => element.innerText.trim() === ${JSON.stringify(CONTINUE_LABEL)});
          if (!button) return false;
          button.click();
          return true;
        })()`,
      );
      if (!clicked) break;
      session.wait(2000);
      body = session.eval<string>("document.body.innerText");
    }

    if (body.includes(PREVIEW_NOTICE))
      failures.push(
        `preview notice "${PREVIEW_NOTICE}" still present after clicking "${CONTINUE_LABEL}"`,
      );
    if (!body.includes(defaultTitle))
      failures.push(`page does not show workspace "${defaultTitle}"`);
    const nameShown =
      body.toLowerCase().includes(plan.name.toLowerCase()) || body.includes(plan.model);
    if (!nameShown) failures.push(`page does not show model chip "${plan.name}"`);
    const effortShown =
      body.toLowerCase().includes(plan.effort.toLowerCase()) || body.includes("低");
    if (!effortShown) failures.push(`page does not show reasoning effort "${plan.effort}"`);
    if (/登录|401|authentication required|sign in|unauthorized|认证失败/i.test(body))
      failures.push("page shows a login / 401 / authentication wall");

    session.screenshot(join(BROWSER_DIR, "ready.png"));

    if (failures.length > 0) {
      console.error("[bootstrap] validation failed:");
      for (const failure of failures) console.error(`  - ${failure}`);
      console.error(`\n[bootstrap] body text:\n${body.slice(0, 2000)}`);
      process.exitCode = 1;
      return;
    }
    console.log(
      `[bootstrap] ready: workspace="${defaultTitle}" model="${plan.name}" effort="${plan.effort}"`,
    );
    console.log(`[bootstrap] screenshot=${join(BROWSER_DIR, "ready.png")}`);
  } finally {
    session.close();
  }
}

main().catch((error: unknown) => {
  console.error(`[bootstrap] ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
