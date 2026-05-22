"use client";

// src/app/owner/error.tsx
//
// F1-Wave-B Slice-2 B-2b — owner-portal error boundary.
// Per CONTEXT D-04 + T-B2b-05:
//   - Renders generic "link no longer valid" UX for ALL failure modes
//     (revoked / expired / not-found / NULL client_id / rate-limit).
//   - NO information disclosure on which failure mode triggered (matches
//     resolveOwnerToken's timing-uniform null contract from B-2a).
//   - NO data leakage: error.message NOT rendered verbatim; only category.
//   - NOTE-1 fix: font-display utility (Space Grotesk per tailwind.config.ts:64)
//     replaces inline `style={{ fontFamily: 'var(--font-space-grotesk)' }}`.

import { useEffect } from "react";

export default function OwnerError({ error }: { error: Error }) {
  useEffect(() => {
    // Optional: Sentry breadcrumb here; do NOT log the token or error.message
    // verbatim (may contain user-supplied data). Just category + timestamp.
    // The error.message may include "rate-limit" or "token not found" or
    // "expired" — none of those flow to the UI; only the user-facing text
    // below is rendered.
  }, [error]);

  return (
    <main
      data-error="owner-portal-invalid-token"
      className="mx-auto max-w-[480px] py-[var(--space-12)] text-center px-[var(--space-4)] pb-[env(safe-area-inset-bottom)]"
    >
      <h1 className="font-display text-[24px] tracking-[0.02em] text-[color:var(--text-primary)] mb-[var(--space-3)]">
        This link is no longer valid
      </h1>
      <p className="text-[14px] text-[color:var(--text-secondary)] mb-[var(--space-6)]">
        Your project portal link may have expired or been revoked. Please
        contact your project manager for a new link.
      </p>
    </main>
  );
}
