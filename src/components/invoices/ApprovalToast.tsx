"use client";

// ApprovalToast — the transient success/error toast for PM approval actions
// (quick approve, batch approve/hold/deny). Lifted verbatim from the PM Queue
// (src/app/invoices/queue/page.tsx:1425-1432) so the queue and the folded-in
// Bills list share one presentation. Driven entirely by `useInvoiceApproval`.
//
// Batch partial-failure honesty (HANDOFF-V2 OBS): `details` carries the
// server's per-invoice rejection reasons — rendered as a list under the
// headline so a partial batch is never silent about WHICH invoices failed
// and WHY.

export interface ApprovalToastProps {
  toast: { kind: "ok" | "err"; text: string; details?: string[] } | null;
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
        {toast.details && toast.details.length > 0 ? (
          <ul className="mt-2 space-y-1 text-[12px] font-normal max-w-[520px]">
            {toast.details.map((d, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden="true">•</span>
                <span className="min-w-0">{d}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
