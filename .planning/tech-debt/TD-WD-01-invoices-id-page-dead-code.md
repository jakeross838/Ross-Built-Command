# TD-WD-01 — /invoices/[id]/page.tsx dead code

**Origin:** Wave-D iter-1 plan-review finding (blast-radius reviewer)
**Captured:** 2026-05-13 nwrp122 decision 2
**Scheduled:** Wave 1.1-Lite

## Evidence (verified 2026-05-13 — see ITER-2-PATCHES.md §0.2)

- File: `src/app/invoices/[id]/page.tsx`, ~2,000+ lines
- Contains TWO inner `<AppShell>` wraps (intra-file double-shell)
- Routed by Next.js App Router to `/invoices/[id]`
- next.config.mjs:97 308-redirects `/invoices/:id` → `/financials/bills/:id`
- Live route at `/financials/bills/[id]` uses `InvoiceReviewView` component via different thin-wrapper, NOT this file
- Zero source-file imports of the page module (grep verified)

## Status

**Unreachable at any live URL.** Module compiles into bundle (build cost + size cost) but never renders.

## Recommended action (Wave 1.1-Lite)

1. Confirm no late-arriving feature plans reference the file
2. Delete the file
3. Add tombstone comment near the redirect (next.config.mjs:97) noting the dead-code removal
4. Investigate why the file persisted past stage-1.5c-IA D-01 redirect (was it migrated incompletely?)

## Estimated impact

- ~2,000 LOC deleted
- Bundle size reduction (~50-100KB minified)
- Removes confusion source for future plan-authors who grep for invoice review UI
