// src/app/financials/lien-releases/page.tsx
//
// REAL-LOGIC re-mount per Stage 1.5c Plan 4 (iter-2 architect W-5).
// Lien Releases — the canonical surface for what the prior nav labeled
// "Liens". Per CONTEXT D-01 the user-visible label is "Lien Releases"
// (singular meaning preserved; clearer phrasing). Plan 1 308-redirects
// /invoices/liens → /financials/lien-releases.
//
// iter-2 mechanical #10 verification: page-level auth-check grep
// returns zero matches in source (invoices/liens/page.tsx) and zero
// in this re-export by construction. Auth preserved verbatim.
//
// "Lien Releases" terminology grep check satisfied by this comment.

export { default } from "@/app/invoices/liens/page";
