# STATUS — invoices+draws big fix (durable session handoff)

**Updated:** 2026-07-10 · **HEAD (origin/main):** `036b53a` · branch `flat-ia-rework` → pushes to `origin/main` (ship-to-prod). Tree clean.

Chat transfer is unreliable — this file is the durable handoff. Read alongside `RESUME.md` (full scope + rulings) and `invoices-draws-deep-dive/HANDOFF.md` (TOP-20).

## Shipped (recent → older)
- **HANDOFF #2 credit fix** (`036b53a`) — a linked negative invoice (credit memo) with no cost code no longer contributes $0. `uncaptured = Σ(linked totals) − Σ(captured by cost code)` flows into current_payment_due + surfaces in Adjustments & Credits. All 7 rollup call sites thread it; permanent **linkage-invariant** test (7/7). Verified live: draw #1 due $23,623.20 → **$22,983.20** (−$640 CM-0007), credit itemized. Also first real exercise of the pt2a Adjustments & Credits render.
- **BLOCK B pt2a — money DISPLAY** (`58921dd`) — deposit line (1a + deduction) + Adjustments & Credits across all 5 views (screen + print).
- **Stage 2.1 cross-org sweep** (`ee1765d`) — org-scoped every client picker/queue/dropdown; `useOrgId` + `/api/me` org_id.
- Earlier: 1.1d template divorce (`696b992`), BLOCK B pt1 engine (`2e335fc`), 1.1/1.1c/1.4/1.5/1.7.

## NEXT (in order)
1. **BLOCK B pt2b — the WIZARD** (finishes Block B). `draws/new/page.tsx` (= `/financials/pay-apps/new`) + `update-draft`/approve APIs:
   - deposit-apply **$ input** + running **ledger (total · applied-to-date · remaining)**; pool = `draws.deposit_amount`, applied-to-date = `depositAppliedToDateForJob` (exists). Writes `deposit_applied_cents`.
   - **approved-adjustments pending pool** ("N approved credits not yet applied — apply?" — visible ≠ counted; only `applied_to_draw` counts, `resolved` terminal).
   - **cap ≤ remaining pool** enforced in UI at SAVE **and** APPROVE.
   - **Jake's click-path (Chrome-verify):** apply partial deposit → ledger → G702 deduction line → split remainder to a 2nd draft → cap blocks over-application → void returns pool → and the credit memo now visibly moving the total (item #2, already verified on draw #1). Cent-exact.
   - After: adversarial verification workflow (double-allocation across 2 drafts, void-returns-pool, cap-at-approve, resolved-terminal, cross-renderer cent-exact). Rule 12 applies to the deposit-apply writes.
2. **2.2 attribution** (#17) · **2.3 determinism** (#20) · **2.4 new-job honesty** (#18) · **2.5 parse errors + manual-entry** (#16) · **2.6** gate `/people/vendors` (static Caldwell fixtures) → 404 per strip posture (no vendors build).

## Flags / open
- **DrawPrintView hardcodes "RETAINAGE (0% per Ross Built standard) $0.00"** but jobs can withhold 10% (current_payment_due reflects it) → the printed PDF understates retainage. Pre-existing print-fidelity bug; consider folding into a Stage-2 pass.
- **`/people/vendors`** renders static Caldwell fixtures (→ 2.6).

## Ops
`tsc --noEmit` for green while `next dev` runs (NOT `next build`). Code commits need a fresh `.planning/qa-runs/*-qa-report.md`. Ceiling $150 / surface $120; halt-on-money-surprise; Rule 12 on live financial writes. End every session by updating this file + committing doc-only.
