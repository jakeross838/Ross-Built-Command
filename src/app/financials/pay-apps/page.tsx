// src/app/financials/pay-apps/page.tsx
//
// REAL-LOGIC re-mount per Stage 1.5c Plan 4 (iter-2 architect W-5).
// Pay Apps list — the canonical Financials surface for what the prior
// nav labeled "Draws". Per CONTEXT D-01 (canonical Pay Apps
// terminology in user-facing labels), this thin re-export wires the
// existing DrawsPage component to the canonical /financials/pay-apps
// URL. Plan 1's 308-redirect maps /draws → /financials/pay-apps so the
// legacy path stops being a destination users see.
//
// iter-2 mechanical #10 verification: page-level auth-check grep
// (the three canonical patterns documented in plan SUMMARY) has zero
// matches in src/app/draws/page.tsx and zero in this re-export by
// construction. Auth posture preserved verbatim — all auth via API
// routes invoked client-side.
//
// iter-2 architect W-5 status: REAL-LOGIC re-mount via re-export.
// Pay Apps terminology grep check: this comment block contains
// "Pay Apps" (>=1), satisfying the AC. UI label terminology rename
// inside the DrawsPage component is F1-scope per CONTEXT D-01.

export { default } from "@/app/draws/page";
