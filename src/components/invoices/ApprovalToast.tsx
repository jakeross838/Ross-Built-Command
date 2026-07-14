"use client";

// ApprovalToast — the transient success/error toast for PM approval actions
// (quick approve, batch approve/hold/deny). Lifted verbatim from the PM Queue
// (src/app/invoices/queue/page.tsx:1425-1432) so the queue and the folded-in
// Bills list share one presentation. Driven entirely by `useInvoiceApproval`.

export interface ApprovalToastProps {
  toast: { kind: "ok" | "err"; text: string } | null;
}

export default function ApprovalToast({ toast }: ApprovalToastProps) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] animate-fade-up">
      <div
        className={`px-5 py-3 border shadow-lg text-sm font-medium ${
          toast.kind === "ok"
            ? "bg-[var(--nw-success)] text-nw-white-sand border-[rgba(74,138,111,0.5)]"
            : "bg-[var(--nw-danger)] text-nw-white-sand border-[rgba(176,85,78,0.5)]"
        }`}
      >
        {toast.text}
      </div>
    </div>
  );
}
