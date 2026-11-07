/** Temporary, top-level feedback shared by Client pages. */

import { useEffect, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";

import { IconAlert, IconCheck } from "./icons.tsx";
import { ensurePstackStyles } from "./styles.ts";

export interface ToastMessage {
  readonly tone: "success" | "error";
  readonly text: string;
}

ensurePstackStyles();

/** Portal-based feedback that expires without occupying space in the calling page. */
export function Toast({
  message,
  duration = 3000,
}: {
  readonly message: ToastMessage | undefined;
  readonly duration?: number;
}): ReactElement | null {
  const [dismissed, setDismissed] = useState<ToastMessage>();
  const current = message === dismissed ? undefined : message;
  useEffect(() => {
    if (message === undefined || message === dismissed) return;
    const timer = setTimeout(() => setDismissed(message), duration);
    return () => clearTimeout(timer);
  }, [message, dismissed, duration]);

  if (current === undefined || typeof document === "undefined") return null;
  return createPortal(
    <div
      className="pstack-toast"
      data-tone={current.tone}
      role={current.tone === "error" ? "alert" : "status"}
    >
      {current.tone === "success" ? <IconCheck size={12} /> : <IconAlert size={12} />}
      {current.text}
    </div>,
    document.body,
  );
}
