"use client";

// BatchApproveConfirmModal — the batch-approve confirmation with the
// eligible-vs-excluded split. Lifted verbatim from the PM Queue
// (src/app/invoices/queue/page.tsx:1504-1583) so the queue and the folded-in
// Bills list share one presentation. The eligible/excluded partition is
// computed by `useInvoiceApproval` (delegating to the tested eligibility
// module) and passed in — this component only renders it.

import { formatCents } from "@/lib/utils/format";

/** The minimal invoice shape the modal renders. */
export interface ApproveModalInvoice {
  id: string;
  vendor_name_raw: string | null;
  total_amount: number;
  jobs?: { name: string } | null;
}

export interface BatchApproveConfirmModalProps<T extends ApproveModalInvoice> {
  open: boolean;
  eligible: T[];
  excluded: Array<{ invoice: T; reasons: string[] }>;
  processing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function BatchApproveConfirmModal<T extends ApproveModalInvoice>({
  open,
  eligible,
  excluded,
  processing,
  onCancel,
  onConfirm,
}: BatchApproveConfirmModalProps<T>) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-nw-slate-deep/60 backdrop-blur-sm px-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-6 w-full max-w-xl animate-fade-up">
        <h3 className="font-display text-lg text-[color:var(--text-primary)] mb-1">
          {excluded.length === 0
            ? `Approve ${eligible.length} invoice${eligible.length !== 1 ? "s" : ""}?`
            : `${eligible.length} of ${eligible.length + excluded.length} invoices can be batch approved`}
        </h3>
        <p className="text-sm text-[color:var(--text-secondary)] mb-4">
          {eligible.length > 0 && (
            <>
              Total:{" "}
              <span className="text-[color:var(--text-primary)] font-mono font-medium tabular-nums">
                {formatCents(eligible.reduce((s, i) => s + i.total_amount, 0))}
              </span>
            </>
          )}
        </p>

        {eligible.length > 0 && (
          <div className="mb-4">
            <div className="text-[11px] tracking-[0.08em] uppercase text-[color:var(--text-secondary)] mb-2">
              Will be approved
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {eligible.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm"
                >
                  <div className="min-w-0 truncate">
                    <span className="text-[color:var(--text-primary)]">{inv.vendor_name_raw ?? "Unknown"}</span>
                    {inv.jobs?.name && (
                      <span className="ml-2 text-[color:var(--text-secondary)] text-xs">{inv.jobs.name}</span>
                    )}
                  </div>
                  <span className="text-[color:var(--text-primary)] font-mono tabular-nums ml-2 shrink-0">
                    {formatCents(inv.total_amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {excluded.length > 0 && (
          <div className="mb-4">
            <div className="text-[11px] tracking-[0.08em] uppercase text-[color:var(--nw-danger)] mb-2">
              Excluded from batch ({excluded.length})
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {excluded.map(({ invoice, reasons }) => (
                <div
                  key={invoice.id}
                  className="px-3 py-2 bg-[rgba(176,85,78,0.12)] border border-[rgba(176,85,78,0.35)] text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[color:var(--text-primary)] truncate">
                      {invoice.vendor_name_raw ?? "Unknown"}
                    </span>
                    <span className="text-[color:var(--text-secondary)] font-mono tabular-nums text-xs shrink-0">
                      {formatCents(invoice.total_amount)}
                    </span>
                  </div>
                  <div className="text-xs text-[color:var(--nw-danger)] mt-1">{reasons.join(" · ")}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-[color:var(--text-secondary)] mt-2">
              Open these invoices individually to fix the issues, then try again.
            </p>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm text-[color:var(--text-secondary)] border border-[var(--border-default)] hover:text-[color:var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={eligible.length === 0 || processing}
            className="flex-1 px-4 py-2.5 text-sm font-medium bg-[var(--nw-success)] text-nw-white-sand hover:bg-[var(--nw-success)]/90 transition-colors disabled:opacity-50"
          >
            {processing
              ? "Processing..."
              : eligible.length > 0
                ? `Approve ${eligible.length} invoice${eligible.length !== 1 ? "s" : ""}`
                : "Nothing to approve"}
          </button>
        </div>
      </div>
    </div>
  );
}
