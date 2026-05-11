"use client";

import { useState } from "react";

export default function EndImpersonationButton() {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/platform/impersonate/end", {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as {
        redirect?: string;
      };
      // Hard navigation so middleware picks up the cleared cookie.
      // Per Stage 1.5c Plan 6 Task 2 (iter-2 D-20 full migration):
      // default fallback target is now /platform-admin (the migrated
      // canonical location).
      window.location.href = body.redirect ?? "/platform-admin";
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="text-xs px-3 py-1 border whitespace-nowrap"
      style={{
        borderColor: "rgba(255,255,255,0.7)",
        color: "var(--nw-white-sand)",
        background: "rgba(0,0,0,0.15)",
      }}
    >
      {busy ? "Ending…" : "End impersonation"}
    </button>
  );
}
