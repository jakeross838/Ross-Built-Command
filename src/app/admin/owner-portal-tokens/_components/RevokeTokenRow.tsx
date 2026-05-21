"use client";

// src/app/admin/owner-portal-tokens/_components/RevokeTokenRow.tsx
//
// F1-Wave-B Slice-2 B-2a per CONTEXT D-09 — client component for the
// "Revoke" action affordance on the owner-portal tokens admin page.
//
// Pattern (per plan §5 Task 8):
// - If revoked: render disabled state (no button).
// - Else: render "Revoke" button → click → confirm modal → POST to
//   /api/owner-portal/admin/revoke-token with { token_id,
//   expected_updated_at } → on success, router.refresh() to revalidate
//   the page → on failure, surface error inline.
// - Touch target ≥44px per SYSTEM.md (admin desktop OK; mobile
//   preserved via existing button heights).
//
// Layout consumes design tokens only — no hardcoded hex; bracket-value
// utilities + nw-* CSS vars.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  tokenId: string;
  expectedUpdatedAt: string;
  status: "active" | "revoked" | "expired";
  clientName: string | null;
  jobName: string;
}

export default function RevokeTokenRow({
  tokenId,
  expectedUpdatedAt,
  status,
  clientName,
  jobName,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (status === "revoked") {
    return (
      <span className="text-[12px] text-[color:var(--text-tertiary)] italic">
        Revoked
      </span>
    );
  }

  async function handleConfirm() {
    setErrorMsg(null);
    const response = await fetch(
      "/api/owner-portal/admin/revoke-token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token_id: tokenId,
          expected_updated_at: expectedUpdatedAt,
        }),
        credentials: "same-origin",
      },
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setErrorMsg(body.error ?? `Request failed (${response.status})`);
      return;
    }
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className="inline-flex items-center justify-center h-[36px] px-3 border border-[color:var(--border-default)] bg-[var(--bg-card)] text-[12px] text-[color:var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
        style={{ fontFamily: "var(--font-inter)" }}
        data-testid="revoke-token-button"
      >
        Revoke
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-dialog-title"
          data-testid="revoke-confirmation-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
        >
          <div
            className="max-w-md w-full p-6 border border-[color:var(--border-default)] bg-[var(--bg-card)]"
            style={{ borderRadius: "var(--radius-card)" }}
          >
            <h2
              id="revoke-dialog-title"
              className="text-[18px] tracking-[-0.01em] text-[color:var(--text-primary)]"
              style={{ fontFamily: "var(--font-space-grotesk)" }}
            >
              Revoke owner-portal token?
            </h2>
            <p className="mt-3 text-[13px] text-[color:var(--text-secondary)]">
              This will immediately end{" "}
              <strong className="text-[color:var(--text-primary)]">
                {clientName ?? "the homeowner"}
              </strong>
              &apos;s access to{" "}
              <strong className="text-[color:var(--text-primary)]">
                {jobName}
              </strong>
              . They will see a 404 on their next request. Re-invite to
              issue a new token.
            </p>
            <dl className="mt-4 text-[12px]">
              <dt
                className="text-[color:var(--text-tertiary)] uppercase tracking-[0.08em]"
                style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "10px" }}
              >
                Token ID
              </dt>
              <dd
                className="mt-1 text-[color:var(--text-primary)]"
                style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "11px" }}
              >
                {tokenId}
              </dd>
            </dl>
            {errorMsg && (
              <p
                className="mt-4 text-[12px]"
                style={{ color: "var(--nw-danger)" }}
                role="alert"
              >
                {errorMsg}
              </p>
            )}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setErrorMsg(null);
                }}
                disabled={pending}
                className="inline-flex items-center justify-center h-[44px] px-4 border border-[color:var(--border-default)] bg-[var(--bg-card)] text-[13px] text-[color:var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-50"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirm()}
                disabled={pending}
                className="inline-flex items-center justify-center h-[44px] px-4 border text-[13px] transition-opacity disabled:opacity-50"
                style={{
                  fontFamily: "var(--font-inter)",
                  backgroundColor: "var(--nw-danger)",
                  borderColor: "var(--nw-danger)",
                  color: "var(--nw-white-sand)",
                }}
                data-testid="revoke-confirm-button"
              >
                {pending ? "Revoking…" : "Confirm revoke"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
