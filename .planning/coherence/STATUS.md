# STATUS — invoices+draws big fix (durable session handoff)

**Updated:** 2026-07-10 · **HEAD (origin/main):** `58921dd` · branch `flat-ia-rework` → pushes to `origin/main` (ship-to-prod). Tree clean.

Chat transfer is unreliable — this file is the durable handoff. Read alongside `RESUME.md` (full scope + rulings) and `invoices-draws-deep-dive/HANDOFF.md` (TOP-20).

## Shipped this session
- **Stage 2.1 cross-org sweep** (`ee1765d`) — org-scoped every client-side picker/queue/dropdown; `useOrgId` hook + `/api/me` returns `org_id`. Verified as platform_admin: zero fixture-org rows on PM queue / QA queue / wizard dropdown / picker. (Dead `vendors/page.tsx` reverted; live `/people/vendors` is a static-fixture placeholder — flagged below.)
- **BLOCK B pt2a — money DISPLAY** (`58921dd`) — "Deposit on file (1a)" + "Less deposit credit applied" deduction + "Adjustments & Credits" section across all 5 views (screen + print, both renderers; owner gets deposit line, its adjustments deferred to Wave 1.1-Lite per nwrp200). Verified: line 1a renders on screen + AIA PDF; tsc clean.

## NEXT (in order)
1. **BLOCK B pt2b — the WIZARD** (finishes Block B). In `draws/new/page.tsx` (= `/financials/pay-apps/new`) + `update-draft`/approve APIs:
   - deposit-apply **$ input** with running **ledger (total · applied-to-date · remaining)**; pool = `draws.deposit_amount`, applied-to-date = Σ `deposit_applied_cents` across non-void draws (helper `depositAppliedToDateForJob` exists in draw-calc).
   - **approved-adjustments pending pool** ("N approved credits not yet applied — apply?" — visible ≠ counted; only `applied_to_draw` counts, `resolved` terminal).
   - **cap ≤ remaining pool** enforced in UI at SAVE **and** APPROVE.
   - **Jake's click-path (Chrome-verify):** apply partial deposit → ledger → G702 line → split remainder to a 2nd draft → cap blocks over-application → void returns pool. Cent-exact vs the invariant. This also finally exercises the pt2a deduction line + adjustments section (0 in data today; Rule 12 blocks a manual `draws` write to force-test).
   - After: adversarial verification workflow (double-allocation across 2 drafts, void-returns-pool, cap-at-approve, resolved-terminal, cross-renderer cent-exact).
2. **2.2 attribution** (HANDOFF #17) · **2.3 determinism** (#20) · **2.4 new-job honesty** (#18) · **2.5 parse errors + manual-entry fallback** (#16) · **2.6** gate `/people/vendors` (static Caldwell fixtures) behind the existing flag machinery → 404, per strip posture (vendor data/API stay; do NOT build a vendors page).

## Flags / open
- **`/people/vendors`** renders static Caldwell fixtures, not real vendors (→ 2.6 gate it).
- **HANDOFF #2** (credit-as-negative-invoice, e.g. CM-0007 −$640) shows "in this draw" but no cost code → absent from total. Separate from pt1's `draw_adjustments` mechanism; not yet addressed.

## Ops
`tsc --noEmit` for green while `next dev` runs (NOT `next build`). Code commits need a fresh `.planning/qa-runs/*-qa-report.md`. Ceiling $150 / surface $120; halt-on-money-surprise; Rule 12 on live financial writes. End every session by updating this file + committing doc-only.
