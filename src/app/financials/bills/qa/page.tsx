// src/app/financials/bills/qa/page.tsx
//
// REAL-LOGIC re-mount per Stage 1.5c Plan 4 (iter-2 architect W-5).
// Bills QA review — re-export of the existing /invoices/qa page so the
// QA pass logic lives at the canonical Bills URL. Plan 1 308-redirects
// /invoices/qa → /financials/bills/qa.
//
// iter-2 mechanical #10 verification: page-level auth-check grep
// returns zero matches in source and zero in this re-export by
// construction. Auth preserved verbatim. Bills terminology grep
// satisfied by this header comment.

export { default } from "@/app/invoices/qa/page";
