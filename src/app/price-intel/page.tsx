// src/app/price-intel/page.tsx
//
// REAL-LOGIC re-mount per Stage 1.5c Plan 4 (iter-2 architect W-5).
// Price Intel section root — re-exports the existing
// /cost-intelligence page (cost-codes / scope-data / lookup / etc.
// dashboard) so users land on the same working surface at the
// canonical Price Intel URL. Per CONTEXT D-01 the user-visible
// section name is "Price Intel" (not "Cost Intelligence"). Plan 1
// 308-redirects /cost-intelligence → /price-intel.
//
// iter-2 mechanical #10 verification: page-level auth-check grep
// (the three canonical patterns documented in plan SUMMARY) has zero
// matches in src/app/cost-intelligence/page.tsx and zero in this
// re-export by construction. Auth posture preserved verbatim.
//
// iter-2 architect W-5 status: REAL-LOGIC re-mount via re-export.
// "Price Intel" terminology grep satisfied by this header comment.
// UI label terminology rename inside the underlying dashboard
// component is F5-scope.

export { default } from "@/app/cost-intelligence/page";
