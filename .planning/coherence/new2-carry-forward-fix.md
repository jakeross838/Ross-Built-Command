# NEW-2 — carry-forward stale-column fix + class sweep

**Date:** 2026-07-14 · **Scope:** money-discipline, draw math only · **Ceiling:** $100
**Root cause (from HANDOFF-V2 NEW-2):** G702 line 7 ("less previous certificates") summed the prior draws' **stored** `draws.current_payment_due` column, which `draw_submit_rpc` never refreshes — so it drifts from the recompute/snapshot the detail + print actually render (by the uncaptured-credit / deposit / adjustment terms). A carry-forward draw would inherit a credit-/deposit-dropped line 7.

## The fix — option (i), CANONICALIZE

`lessPreviousCertificatesForJob` (src/lib/draw-calc.ts) now sources each prior non-void draw's current-payment-due from its **canonical** value, never the stored column:
- **approved / locked / paid WITH a snapshot** → `snapshot.draw.current_payment_due` (the byte-exact certified value the issued pay app legally certified — the same value the detail early-returns from the snapshot);
- **everything else** (submitted, or issued-without-snapshot) → **recompute on read** via the SAME `rollupDrawTotals` chain the detail/print use, so line 7 ties out cent-exact with that prior draw's own bottom line.

The stored `draws.current_payment_due` column **stops feeding any money math** — it remains a display cache only. Recursion (a submitted prior recomputes its own line 7) terminates: every prior draw has a strictly lower `draw_number`.

**Verified:**
- **Live (read-only):** the real `lessPreviousCertificatesForJob("Sample Client B", drawNumber=2)` returns **2298320 ($22,983.20)** — canonical, credit applied — NOT the stale stored **2362320 ($23,623.20)**. (One-off `tsx` script, read-only SELECT, deleted after.)
- **Permanent test:** pure carry-forward invariant added to `__tests__/draw-block-b-invariant.test.ts` — line 7 ≡ Σ canonical prior current-payment-due; sourcing the stale value would be off by exactly the credit. **8/8 green** (linkage + block-B + carry-forward invariants all pass).
- `tsc --noEmit` → exit 0.

## Class sweep — readers of the stored draw rollup columns (`current_payment_due` + siblings)

### Math readers (feed calculations) — 1 found, REPOINTED
| Reader | Was | Now |
|--------|-----|-----|
| `lessPreviousCertificatesForJob` (draw-calc.ts) | stored `current_payment_due` of prior draws | **canonical** (snapshot / recompute) ✅ |

**Inherited by both canonical detail loaders** (they call the fixed function): `src/app/financials/pay-apps/[id]/_data.ts` and `src/app/api/draws/[id]/route.ts` — both **recompute** every total via `rollupDrawTotals` (they read stored `original_contract_sum` / `net_change_orders` only as pass-through inputs — intentional per `draw-staleness.ts`; those never feed `current_payment_due`). Canonical-already; line-7 fix flows through automatically.

### Document generators reading the STALE stored column — 3 found, **FLAGGED (not repointed this session)**
Each reads `draw.current_payment_due` (+ `contract_sum_to_date` / `total_completed_to_date` / `less_previous_payments` / `total_retainage`) straight from the stored row, so they render the stale figure (draw B: **$23,623.20** instead of canonical **$22,983.20**):
1. `src/app/api/draws/[id]/export/route.ts` — Excel G702 lines 1–7 (ln 397–406) + cover-letter ctx (ln 227–234) + a simpler non-canonical G703 (ln 158–190).
2. `src/app/api/draws/[id]/cover-letter/route.ts` — cover-letter ctx (ln 85).
3. `src/app/owner/[token]/pay-apps/[id]/page.tsx` — owner-portal pay-app view (ln 81).

**Why flagged, not repointed here:** each changes an **owner-facing certified document produced today**. Per Workflow-posture **Rule 1** (schema/construction verification ≠ runtime), a document-money change must be **runtime-verified** (generate the Excel, render the cover letter, open the owner portal) before shipping — a pass beyond this session's scope + $100 ceiling. **Recommended repoint (one dedicated, runtime-verified pass):** the export + cover-letter routes (both membership-auth) call `loadPayAppViewData(drawId)` and read `.draw.current_payment_due` + `.lineItems` (canonical). The owner-portal page is **token-auth**, so `loadPayAppViewData` (membership-gated) does not apply — it needs a small token-scoped canonical loader. `src/lib/cover-letter.ts` itself is a pure template renderer (no DB) — canonical once its callers pass canonical values.

### Display-only (cache display; not math, not documents) — left as-is
- List/summary chips: `src/app/draws/page.tsx`, `jobs/[id]/draws/page.tsx`, `jobs/[id]/pay-apps/page.tsx`, `jobs/[id]/page.tsx`.
- Prototypes (`DrawPrintView`, `OwnerDrawView`, `DrawApprovalView`, `AdjustmentsCreditsCard`) — receive values as props from `_data.ts` (canonical) or the snapshot; no DB read.
- **Hygiene applied:** `storedSummaryStale` (the display-only "cache is stale" badge) is now computed for **submitted** draws too (was draft-only) — so the pay-app detail badges the stale cache wherever it still displays. Issued (approved/locked/paid) draws render from the frozen snapshot and stay non-stale by construction.

### Writers (compute + store the cache; not readers) — untouched
`/api/draws/new`, `update-draft`, `revise`, `refresh-totals`, `adjustments/apply`, `recalcDraftDrawsForJob` — they WRITE the cache via `rollupDrawTotals`; the column stays a display cache per the ruling.

## Follow-up for Jake
Repoint the **3 flagged document generators** to canonical in one dedicated pass **with Rule-1 runtime verification** (generate draw B's Excel + cover letter + owner-portal view → confirm line 6/8 = $22,983.20, not $23,623.20). Owner-portal needs a token-scoped canonical loader (small refactor). This is money-on-owner-documents — verify each rendered artifact, don't ship by construction.
