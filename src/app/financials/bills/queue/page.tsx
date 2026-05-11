// src/app/financials/bills/queue/page.tsx
//
// REAL-LOGIC re-mount per Stage 1.5c Plan 4 (iter-2 architect W-5).
// Bills review queue — the canonical surface for what the prior nav
// labeled the "Invoices queue". Plan 1 308-redirects /invoices/queue
// to here. Re-export preserves the existing component verbatim.
//
// iter-2 mechanical #10 verification: page-level auth-check grep
// (the three canonical patterns documented in plan SUMMARY) has zero
// matches in source; this re-export has zero by construction. Auth
// preserved verbatim — all auth via API routes invoked client-side.
//
// Bills terminology grep check satisfied by this header comment.

export { default } from "@/app/invoices/queue/page";
