// Stop every prepared worker cleanly: kill each detached web process group, then
// close the browser session its persistent profile left behind.

import { createBrowserSession } from "./lib/browser";
import { stopWeb } from "./lib/env";
import { listWorkers } from "./lib/worker";

function main(): void {
  const workers = listWorkers();
  if (workers.length === 0) {
    console.log("[stop] no workers with pid/url files; nothing to stop");
    return;
  }
  for (const paths of workers) {
    const { stopped, pid } = stopWeb(paths);
    if (stopped) console.log(`[stop] worker ${paths.index}: stopped web (pid ${pid})`);
    else console.log(`[stop] worker ${paths.index}: no live web pid`);
    try {
      const session = createBrowserSession({
        session: `w${paths.index}`,
        browserDir: paths.browserDir,
      });
      session.raw(["close", "--all"]);
      console.log(`[stop] worker ${paths.index}: closed browser sessions`);
    } catch {
      console.log(`[stop] worker ${paths.index}: no browser session to close`);
    }
  }
}

main();
