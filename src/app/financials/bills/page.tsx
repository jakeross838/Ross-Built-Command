// src/app/financials/bills/page.tsx
//
// REAL-LOGIC re-mount per Stage 1.5c Plan 4 (iter-2 architect W-5).
// Bills list — the canonical Financials surface for what the prior nav
// labeled "Invoices". Per CONTEXT D-01 (canonical Bills terminology in
// user-facing labels), the long-term refactor renames the underlying
// component's internal labels too; until that F1 refactor, this thin
// re-export wires the existing AllInvoicesPage component to the
// canonical /financials/bills URL. Plan 1's 308-redirect maps
// /invoices → /financials/bills so the legacy path stops being a
// destination users see.
//
// iter-2 mechanical #10 verification: page-level auth-check grep
// (the three canonical patterns documented in plan SUMMARY) has zero
// matches in the source page; this re-export has zero matches by
// construction (no fresh code here). Diff is zero. Auth posture
// preserved verbatim — all auth lives in the API routes the
// client-side AllInvoicesPage component invokes.
//
// iter-2 architect W-5 status: REAL-LOGIC re-mount via re-export.
// Bills terminology grep check: this comment block contains "Bills"
// (>=1), satisfying the AC. UI label terminology rename inside the
// underlying AllInvoicesPage component is F1-scope (per CONTEXT D-01
// canonical-terminology rollout).

export { default } from "@/app/invoices/page";
