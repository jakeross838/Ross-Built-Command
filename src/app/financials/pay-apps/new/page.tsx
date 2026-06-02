// src/app/financials/pay-apps/new/page.tsx
//
// Canonical draw-creation URL post-Stage-1.5c IA rename. Per
// `next.config.mjs:99-101`, the `/draws/*` → `/financials/pay-apps/*`
// terminology rename was 308-redirected at the routing layer, but the
// `/new` destination page was never created — `/draws/new` redirected
// to `/financials/pay-apps/new` and Next.js 404'd.
//
// F5 fix per GTV Stage 1.5 walk (nwrp264-266, 2026-06-02). The
// draw-creation wizard lives at `src/app/draws/new/page.tsx` and is
// fully implemented; this thin re-export wrapper makes it reachable at
// the canonical /financials/pay-apps/new URL without duplicating logic.
// Both the org-wide `/financials/pay-apps` Create New Draw button and
// the per-job `/jobs/[id]/draws` New Draw button updated in the same
// commit to point here directly (avoids the 308-redirect hop).
//
// The underlying wizard at `src/app/draws/new/page.tsx` carries
// `"use client"` + `useSearchParams` for `?jobId=` query param —
// re-export preserves that behavior.

export { default } from "@/app/draws/new/page";
