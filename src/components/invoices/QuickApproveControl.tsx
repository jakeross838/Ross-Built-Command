"use client";

// QuickApproveControl — the one-click Quick-Approve cell with its inline
// confirm step. Lifted verbatim from the PM Queue: `variant="card"` is the
// mobile-card control (src/app/invoices/queue/page.tsx:1091-1145) and
// `variant="row"` is the desktop-table control (1321-1357). The caller renders
// this ONLY when `isQuickEligible(inv)` (the tested module gates status +
// confidence + blockers); the component itself just renders the confirm UI.
// All state + the mutation live in `useInvoiceApproval`.

import { formatCents } from "@/lib/utils/format";
import NwButton from "@/components/nw/Button";

export interface QuickApproveControlInvoice {
  vendor_name_raw: string | null;
  total_amount: number;
  jobs?: { name: string } | null;
}

export interface QuickApproveControlProps {
  inv: QuickApproveControlInvoice;
  variant: "card" | "row";
  confirming: boolean;
  processing: boolean;
  onStartConfirm: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function QuickApproveControl({
  inv,
  variant,
  confirming,
  processing,
  onStartConfirm,
  onCancel,
  onConfirm,
}: QuickApproveControlProps) {
  // stopPropagation on every handler so a click inside the control never
  // triggers the surrounding clickable row/card's row-nav.
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  const confirmButtons = (
    <>
      <NwButton
        variant="ghost"
        size="sm"
        onClick={stop(onCancel)}
        disabled={processing}
        aria-label="Cancel quick approve"
      >
        &#10007;
      </NwButton>
      <NwButton
        variant="primary"
        size="sm"
        onClick={stop(onConfirm)}
        disabled={processing}
        loading={processing}
        aria-label="Confirm quick approve"
      >
        {processing ? "" : "✓ Yes"}
      </NwButton>
    </>
  );

  if (variant === "card") {
    return (
      <div className="mt-3 pt-3 border-t border-[var(--border-default)]/60">
        {confirming ? (
          <div className="flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs text-[color:var(--text-secondary)] truncate">
              Approve {inv.vendor_name_raw ?? "invoice"} {formatCents(inv.total_amount)}
              {inv.jobs?.name ? ` to ${inv.jobs.name}` : ""}?
            </span>
            <div className="flex gap-2 shrink-0">{confirmButtons}</div>
          </div>
        ) : (
          <NwButton variant="primary" size="md" className="w-full" onClick={stop(onStartConfirm)}>
            Quick Approve
          </NwButton>
        )}
      </div>
    );
  }

  // variant === "row" — desktop table cell (compact, right-aligned).
  return confirming ? (
    <div className="flex gap-1 items-center justify-end">{confirmButtons}</div>
  ) : (
    <NwButton variant="primary" size="sm" className="w-full" onClick={stop(onStartConfirm)}>
      Quick Approve
    </NwButton>
  );
}
