"use client";

// BatchActionBar — the floating bottom action bar shown while invoices are
// selected. Lifted verbatim from the PM Queue
// (src/app/invoices/queue/page.tsx:1368-1423) so the queue and the folded-in
// Bills list share one presentation. Driven entirely by `useInvoiceApproval`;
// the caller gates rendering on `batch_approval_enabled && count > 0`.

import { formatCents } from "@/lib/utils/format";
import NwButton from "@/components/nw/Button";

export interface BatchActionBarProps {
  count: number;
  totalCents: number;
  processing: boolean;
  onClearSelection: () => void;
  onHold: () => void;
  onDeny: () => void;
  onApprove: () => void;
}

export default function BatchActionBar({
  count,
  totalCents,
  processing,
  onClearSelection,
  onHold,
  onDeny,
  onApprove,
}: BatchActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[rgba(91,134,153,0.1)] backdrop-blur-sm border-t border-[var(--border-default)] px-4 py-3 animate-fade-up">
      <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        <div className="flex items-baseline justify-between sm:justify-start gap-3">
          <span className="text-sm text-[color:var(--text-primary)] font-medium">
            {count} selected
          </span>
          <span className="text-xs text-[color:var(--text-secondary)]">
            Total:{" "}
            <span className="text-[color:var(--text-primary)] font-mono font-medium tabular-nums">
              {formatCents(totalCents)}
            </span>
          </span>
          <button
            onClick={onClearSelection}
            className="sm:hidden text-xs text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] underline underline-offset-2"
          >
            Clear
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-2">
          <div className="hidden sm:inline-flex">
            <NwButton variant="ghost" size="md" onClick={onClearSelection}>
              Clear Selection
            </NwButton>
          </div>
          <NwButton variant="secondary" size="md" onClick={onHold} disabled={processing}>
            <span className="sm:hidden">Hold</span>
            <span className="hidden sm:inline">Hold All</span>
          </NwButton>
          <NwButton variant="danger" size="md" onClick={onDeny} disabled={processing}>
            <span className="sm:hidden">Deny</span>
            <span className="hidden sm:inline">Deny All</span>
          </NwButton>
          <NwButton
            variant="primary"
            size="md"
            onClick={onApprove}
            disabled={processing}
            loading={processing}
          >
            <span className="sm:hidden">Approve</span>
            <span className="hidden sm:inline">Approve All</span>
          </NwButton>
        </div>
      </div>
    </div>
  );
}
