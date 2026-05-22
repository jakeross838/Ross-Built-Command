// src/app/owner/not-found.tsx
//
// F1-Wave-B Slice-2 B-2b — owner-portal not-found boundary.
// Per CONTEXT D-04 + T-B2b-05:
//   - Next.js convention: notFound() from a Server Component routes to the
//     nearest not-found.tsx in the route segment hierarchy. error.tsx catches
//     THROWN errors (e.g., rate-limit Error), not notFound() calls.
//   - This file complements src/app/owner/error.tsx — both render the same
//     "link no longer valid" UX so the timing-uniform null contract from B-2a's
//     resolveOwnerToken extends to the rendered surface (no information
//     disclosure on which failure mode triggered the not-found).
//   - data-error="owner-portal-invalid-token" anchor mirrors error.tsx for
//     smoke-harness identification.

export default function OwnerNotFound() {
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
