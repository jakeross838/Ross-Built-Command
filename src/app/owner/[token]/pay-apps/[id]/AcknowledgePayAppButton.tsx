"use client";

// src/app/owner/[token]/pay-apps/[id]/AcknowledgePayAppButton.tsx
//
// F1-Wave-B Slice-2 B-2b — owner-portal acknowledge CTA.
// Per CONTEXT D-26 + D-27 + Latitude #4 (a):
//   - TD-20 boundary exemption: raw <button> with comment mirroring
//     OwnerDrawView.tsx:158-162 precedent. NwButton lg=44px; SYSTEM.md §11
//     mandates 56px touch target for high-stakes (homeowner irreversible
//     attestation of pay-app) per WCAG 2.2 AA + Nightwork's stricter posture.
//   - data-testid="acknowledge-pay-app-button" anchor for smoke-harness probe
//     (AC-B2b-08 — touch-target audit).
//   - Posts to /api/owner-portal/acknowledge-pay-app (PUBLIC_PATHS extended
//     in B-2b Task 5 — BLK-1 fix).
//   - Optimistically disables on submit + flips to "Acknowledged" on 200.
//   - On non-2xx response: re-enables + leaves status as not-acknowledged
//     (homeowner can retry; idempotent dedupe via 00106 unique index +
//     onConflictDoNothing in the helper).

import { useState } from "react";
import { CheckBadgeIcon } from "@heroicons/react/24/outline";

interface Props {
  token: string;
  drawId: string;
  alreadyAcknowledged: boolean;
}

export default function AcknowledgePayAppButton({
  token,
  drawId,
  alreadyAcknowledged,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [acknowledged, setAcknowledged] = useState(alreadyAcknowledged);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleClick() {
    if (busy || acknowledged) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/owner-portal/acknowledge-pay-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, drawId }),
      });
      if (!res.ok) {
        // Generic message; do NOT leak server status reason to UI per T-B2b-05.
        setErrorMsg("Something went wrong. Please try again.");
        setBusy(false);
        return;
      }
      setAcknowledged(true);
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-[var(--space-2)] w-full max-w-[400px]">
      <button
        type="button"
        data-testid="acknowledge-pay-app-button"
        onClick={handleClick}
        disabled={busy || acknowledged}
        className="w-full inline-flex items-center justify-center gap-[var(--space-2)] px-[var(--space-6)] bg-[var(--nw-stone-blue)] text-[color:var(--nw-white-sand)] font-display text-[16px] border border-[var(--nw-stone-blue)] hover:bg-[var(--nw-oceanside)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--nw-stone-blue)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[56px]"
      >
        <CheckBadgeIcon className="w-5 h-5" strokeWidth={1.5} />
        {busy
          ? "Acknowledging..."
          : acknowledged
            ? "Acknowledged"
            : "Acknowledge Pay App"}
      </button>
      {errorMsg && (
        <p
          role="alert"
          className="text-[12px] text-[color:var(--nw-danger)] text-center"
        >
          {errorMsg}
        </p>
      )}
    </div>
  );
}
