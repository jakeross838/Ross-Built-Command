// src/app/price-intel/verification/page.tsx
//
// REAL-LOGIC re-mount per Stage 1.5c Plan 4 (iter-2 architect W-5).
// Cost verification queue — re-export of the existing
// /cost-intelligence/verification page so the verification UI lives
// at the canonical Price Intel URL. Plan 1 308-redirects
// /cost-intelligence/verification → here.
//
// iter-2 mechanical #10 verification: page-level auth-check grep
// returns zero matches in source and zero in this re-export by
// construction. Auth posture preserved verbatim — all auth via
// API routes invoked client-side.

export { default } from "@/app/cost-intelligence/verification/page";
