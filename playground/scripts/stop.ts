// Stop the playground cleanly: kill the detached web process group, then close any
// browser session the persistent profile left behind.

import { createBrowserSession } from "./lib/browser";
import { stopWeb } from "./lib/env";

function main(): void {
  const { stopped, pid } = stopWeb();
  if (stopped) console.log(`[stop] stopped web (pid ${pid})`);
  else console.log("[stop] no web pid file; nothing to stop");

  try {
    const session = createBrowserSession({ session: "playground" });
    session.raw(["close", "--all"]);
    console.log("[stop] closed browser sessions");
  } catch {
    console.log("[stop] no browser session to close");
  }
}

main();
