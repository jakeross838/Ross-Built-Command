// src/app/financials/payments/page.tsx
//
// REAL-LOGIC re-mount per Stage 1.5c Plan 4 (iter-2 architect W-5).
// Payment tracking — re-export of the existing /invoices/payments
// page. Path moves into the Financials section overview; logic
// unchanged. Plan 1 308-redirects /invoices/payments → here.
//
// iter-2 mechanical #10 verification: page-level auth-check grep
// returns zero matches in source and zero in this re-export by
// construction. Auth preserved verbatim — all auth lives in the
// API routes invoked client-side.

export { default } from "@/app/invoices/payments/page";
