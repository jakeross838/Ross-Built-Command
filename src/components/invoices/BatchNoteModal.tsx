"use client";

// BatchNoteModal — the note-required modal for batch Hold and batch Deny.
// Unifies the two verbatim modals from the PM Queue
// (src/app/invoices/queue/page.tsx:1434-1502, HoldNoteModal + DenyNoteModal)
// into one component keyed by `variant`, per the 3.2 extraction plan
// ("can be one BatchNoteModal"). Byte-equivalent copy, placeholders, and the
// warn/danger confirm-button styling are preserved per variant.

import { Textarea } from "@/components/ui/textarea";

export interface BatchNoteModalProps {
  open: boolean;
  variant: "hold" | "deny";
  count: number;
  note: string;
  processing: boolean;
  onNoteChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function BatchNoteModal({
  open,
  variant,
  count,
  note,
  processing,
  onNoteChange,
  onCancel,
  onConfirm,
}: BatchNoteModalProps) {
  if (!open) return null;

  const isHold = variant === "hold";
  const title = isHold ? "Batch Hold" : "Batch Deny";
  const desc = isHold
    ? `Hold ${count} invoice${count !== 1 ? "s" : ""}. Add a note explaining why.`
    : `Deny ${count} invoice${count !== 1 ? "s" : ""}. A reason is required and will apply to each.`;
  const placeholder = isHold ? "Add a note (required)..." : "Reason for denial (required)...";
  const confirmLabel = isHold ? "Hold" : "Deny";
  const confirmCls = isHold
    ? "flex-1 px-4 py-2.5 text-sm font-medium bg-[var(--nw-warn)] text-[color:var(--bg-page)] hover:bg-[rgba(201,138,59,0.85)] transition-colors disabled:opacity-50"
    : "flex-1 px-4 py-2.5 text-sm font-medium bg-[var(--nw-danger)] text-nw-white-sand hover:bg-[var(--nw-danger)]/90 transition-colors disabled:opacity-50";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-nw-slate-deep/60 backdrop-blur-sm px-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-6 w-full max-w-md animate-fade-up">
        <h3 className="font-display text-lg text-[color:var(--text-primary)] mb-1">{title}</h3>
        <p className="text-sm text-[color:var(--text-secondary)] mb-4">{desc}</p>
        <Textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder={placeholder}
          className="resize-none"
          minRows={4}
          autoFocus
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm text-[color:var(--text-secondary)] border border-[var(--border-default)] hover:text-[color:var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
          >
            Cancel
          </button>
          <button onClick={onConfirm} disabled={!note.trim() || processing} className={confirmCls}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
