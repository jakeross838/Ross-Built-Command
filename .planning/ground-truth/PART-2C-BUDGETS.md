# PART 2C — Budgets verification results (FINAL per nwrp273)

**Date:** 2026-06-11 (finalized same day per nwrp273)
**Authorization:** nwrp272 (2C as scoped, $25 ceiling, amended 2C-2) + nwrp273 (walk results, D1-D3 dispositions, Q2 import-comparison $15 cap, N1-N3 filing).
**Spend:** 2C execution ~$15-18 against $25; Q2 comparison + N3 check + finalization ~$16-18 against $20.
**Verdict: ALL 9 matrix rows now PASS (walk rows a-g all-pass per nwrp273). Zero BLOCKING findings; the immediate-halt clause never fired. D1-D3 ACCEPTED as routed (amendments below). Q2 RESOLVED — importer silently drops uncoded G703 rows; $479,900.00 enumerated to the cent; the −$224,906.77 hypothesis CONFIRMED in substance.**

## Matrix results

| # | Test | Result |
|---|---|---|
| 2C-1 | Budget-line integrity sweep | **PASS** — 0 duplicate (job, cost_code) pairs, 0 orphaned cost-code FKs, 0 negative estimates, org-wide. 1 soft-deleted line exists (hygiene-normal). 0 non-zero `co_adjustments` (consistent with 2C-4). |
| 2C-2 | Trigger-cache mutation test (amended per nwrp272) | **PASS — exact at every gate.** Detail below. |
| 2C-3 | Contract identity (all active org jobs) | **PASS** — 0 jobs violate `original + approved_cos_total == current_contract_amount`. |
| 2C-4 | CO→budget-line propagation disposition | **ANSWERED — data-gap, not broken code.** Detail below → D1. |
| 2C-5 | Budget-health panel math | **PASS — exact reproduction** of walk P4 (144 lines / 1 over budget / 85 under-committed) from source rows. Plus a NEW allocation-coverage finding → D2. |
| 2C-6 | Aggregation indexes + plans | **PASS** — index coverage on every hot path (`idx_budget_lines_job/_job_cost/_org_id`, `idx_invoices_job_status/_draw_id/org_*`, `idx_draws_job_status/org_status`, `idx_activity_log_entity/org_created`, `idx_invoice_line_items_budget_line`). EXPLAIN ANALYZE on the overview budget query: seq scan at 288 total rows — planner-correct at this scale (0.18ms); indexes exist for growth. |
| 2C-7 | G703 chain identities | **SQL-side PASS — upgraded to cent-exact per nwrp274 confirm:** under draw-calc's exact rules (ALL draw invoices regardless of status; cost-coded line splits preferred, invoice-level fallback), derived this_period = $104,494.91 splits + $63,401.56 fallback = **$167,896.47**, and $4,279,571.58 baselines + $871,701.50 CO-completed + $167,896.47 = **$5,319,169.55 = the recomputed total_completed_to_date to the cent**. (The first replication attempt mismatched by $46,421.77 — it wrongly applied a status filter and keyed splits by budget_line_id; Rule 10 premise-check against draw-calc.ts:127-165 corrected both.) Adjacent finding: **$11,300.23** of draw-invoice value (no cost_code_id, no coded splits) is absent from per-line G703 attribution — same silent-drop family as Q2/D2; folds into D2's allocation-authoring scope; whether it reaches G702 via the non-budget-line component is a 2A/F6 question. Render-side: walked PASS (checks e/f below). |
| 2C-8 | Drummond empty-state | **SQL-side confirmed** — 0 budget_lines. **Walk PENDING.** |
| 2C-9 | Stored-vs-recomputed divergence | **DOCUMENTED** → D3. Fish stored `current_payment_due` = **−$224,906.77** (the F8 walk observation, confirmed at source). Dewberry stored $71,119.11 vs Σ draw invoices $71,180.22 (−$61.11). Both draws are `draft` with stored G702 columns frozen at creation-time math; the F10 detail/print recompute on read, so Jake's walk WILL show different (fresher) numbers than the list — expected, not a regression. |

## 2C-2 detail — scratch-CO mutation test (Dewberry, per nwrp272 amendment)

Scratch CO `d27b8531-ab9d-4024-a722-5c84c1b5208c`, pcco #18, title `ZZ-2C-TEST-DELETE-ME`, $100.00, `co_type='owner_requested'` (the post-00066 contract-raising default; the cache filter is `co_type <> 'internal'`, updated from `'owner'` in migration 00066).

| Step | approved_cos_total | current_contract_amount | Expected | Result |
|---|---|---|---|---|
| Pre-state | 390226 | 535507121 | — | recorded |
| INSERT draft | 390226 | 535507121 | unchanged (draft excluded) | **EXACT** |
| → approved | 400226 | 535517121 | +10000 both | **EXACT** |
| → void | 390226 | 535507121 | exact return | **EXACT — halt clause not triggered** |
| soft-delete | 390226 | 535507121 | still exact | **EXACT** |

The trigger (migration 00042 `app_private.refresh_approved_cos_total`) maintains BOTH columns — full recompute from source rows on every mutation, per recalculate-don't-increment.

Residue (documented, untouched): the scratch CO row (void + soft-deleted, unmistakable title) + 1 append-only `activity_log` row. **Boundary observation:** `status_history` stayed empty through two status transitions — it is APP-layer-written (Q12 posture), so direct-SQL mutations exercise only the DB-trigger layer. Expected architecture, not a defect; 2A's API-path tests will exercise the app-layer audit trail.

## Dispositions for Jake (D1-D3)

### D1 — CO→budget-line propagation: mechanism EXISTS, allocation data is EMPTY (entry-gate Q1)

The chain is fully built: `change_orders` status change → `trg_change_orders_status_sync` → `recompute_budget_line_co_adjustments(budget_line_id)` per linked `change_order_lines` row → `budget_lines.co_adjustments`. But **`change_order_lines` has 0 rows system-wide** — all 73 approved COs (Fish 72, Dewberry 1) were created/imported contract-level-only, with no line allocations. So `revised == original` on all 287 budget lines is the propagation mechanism correctly doing nothing with no inputs — **data-gap, not code-gap**. Consequences while it persists: G703 CO columns show zero per-line CO adjustment (G702 net_change_orders is correct at contract level), and budget-line over/under analysis ignores CO scope. **Recommendation:** require line allocation (or an explicit "unallocated" flag) in the CO approval workflow when that surface wires (F6 / TD-NW-PER-JOB-TAB-WIRING family); backfilling 72 Fish COs is operational data work, Jake/Andrew's call on timing.

### D2 — Invoice allocation coverage: $95,066.64 of approved Fish invoice value invisible to budget rollups (NEW)

`budget_lines.invoiced` is **exactly consistent with its own rule** (0/144 mismatches vs `recompute_budget_line_invoiced`: Σ `invoice_line_items.amount_cents` by `budget_line_id`, spent statuses). But **13 of the 45 spent-status Fish invoices have NO `invoice_line_items` allocations** — their dollars never reach any budget line. Σ spent invoices $177,571.34 vs Σ stored invoiced $82,504.70. Effects: budget-health `over_budget` likely understated; per-line G703 `this_period` attribution incomplete (draw-calc falls back to invoice-level cost_code_id where splits are missing, so the DRAW math degrades gracefully — the budget-line cache does not). Same family as D1: caches exact, allocations missing. **Recommendation:** 2A (invoice flow verification) adds an explicit check — does the approval path AUTHOR allocations? — and the 13 unallocated invoices get the same backfill-or-flag disposition as D1.

### D3 — Stored-vs-recomputed draw totals (entry-gate Q3 / F8 follow-on)

Stored G702 columns on both draft draws are creation-time snapshots; the canonical API and the F10 detail/print recompute on read. Fish's stored −$224,906.77 `current_payment_due` is the F8 number; the recomputed value Jake sees on the F10 detail will differ. **Recommendation:** the pay-apps LIST should either recompute (heavier) or render a "computed at draw creation — open for current math" affordance; smallest honest fix is a staleness marker on draft draws. Routes naturally with F6 pay-app engine scope.

## Q2 (entry-gate) — the contract under-coverage gap, investigated cold

Fish: Σ budget-line original $7,016,767.17 vs contract $7,496,667.17 → gap **$479,900.00**. Dewberry gap **$58,000.00**. Probed cold: the gap is not deposit-shaped (10% = $749,666.67) and not GC-fee-shaped (20% of lines = $1.4M). Composition is not derivable from the DB alone — likely fee/land/contingency held outside cost-coded lines, or an import artifact. **Open for Ross Built operational knowledge (Jake/Andrew) or import-source comparison; named, not blocking.**

## Carry-forwards to 2A

1. Smoke-login probe gate (nwrp266 §13) — 9 accounts confirmed-never-signed-in; one scripted login per role before 2A dispatch.
2. D2's allocation-authoring check folded into 2A's invoice-flow matrix.
3. App-layer audit-trail verification (status_history + activity_log on API-path status transitions) — the layer 2C-2 could not exercise via SQL.

## Walk results (Jake, nwrp273 — ALL PASS; closes the walk-pending rows)

- a. /jobs/{fish}/budget → placeholder, single chrome ✓
- b. /price-intel → single chrome ✓
- c. /financials/pay-apps/new → single chrome, sidebar absent ✓
- d. /owner-portal → 404 ✓
- e. Fish draw detail → REAL data, labeled Pay App #21, chrome once ✓ (2C-7 render PASS)
- f. Print → G702/G703 renders, chrome once ✓ (2C-7 render PASS)
- g. Drummond overview → graceful 0-line empty state ✓ (2C-8 render PASS)

**AppShell saga + F10 CLOSED per nwrp273.**

**2C-9 amendment (per nwrp273):** stored MATCHES recomputed — the list and the F10 detail both show **−$224,906.77**. No current divergence; the divergence class is LATENT (stored snapshots can go stale after retainage/contract edits), so the staleness affordance still routes to F6. The negative value itself is explained by Q2 below.

## Dispositions — ACCEPTED per nwrp273

- **D1 ACCEPTED** + sequencing constraint: allocation authoring (F6/CO-workflow) AND Fish 72-CO backfill both complete **before the first real dogfood draw**. Walk evidence (Fish G703 lines at 206.9%/207.8% complete, negative balances, C-suffix codes at $0 scheduled — continuation doesn't tie to cover; bank-facing) captured in the new TD entry: `.planning/tech-debt/TD-NW-CO-LINE-ALLOCATION.md`, including the Rule 10 flag — `recompute_budget_line_co_adjustments` has never fired; first F6 test must be a runtime trigger check.
- **D2 ACCEPTED**, folded into 2A sharpened: test whether invoice approval CAN complete with zero cost-code allocation. The 13 unallocated invoice IDs are enumerated below for operational backfill (before-dogfood class).
- **D3 ACCEPTED** as routed (staleness affordance, F6 family), amended: no active divergence today.

## D2 — the 13 unallocated spent invoices on Fish (operational backfill list)

Σ fully-unallocated = $76,970.00; partial-allocation shortfall on other invoices = $18,096.64; total invisible to budget rollups = $95,066.64.

| Invoice ID | Vendor (raw) | Inv # | Amount | Status |
|---|---|---|---|---|
| da480554-94cb-4f8b-a572-eeb0e86c94ca | Triple H Painting, LLC | 2 | $38,000.00 | qa_review |
| 8c5c20f2-4c83-4751-a37b-f5af0a81c502 | Climatic Conditioning | 11746-5J | $14,000.00 | qa_approved |
| 3ee04579-afc1-444f-a8e5-2d33bee28650 | M&J Florida Enterprise LLC | MJ-26-070 | $10,217.00 | qa_approved |
| de728105-e7d5-4216-b306-f24f5d3aea2b | METRO ELECTRIC, LLC | 60431 | $5,550.36 | qa_approved |
| 6d9d7b9a-e152-4709-b58b-42020c018528 | Sight to see construction llc | 1195 | $5,200.00 | qa_approved |
| 9a7ca3f0-e25b-4e11-bc01-d485d6bf9d20 | Triple H Architectural Products | 18019 | $1,278.65 | qa_approved |
| 94d41a2b-e4d2-4772-91f2-003c8bee03f1 | Metro Electric, LLC | 60432 | $989.56 | qa_approved |
| 299b653c-d244-4ecf-ac7e-a79e8f97f9f8 | ISLAND LUMBER AND HARDWARE, INC. | 532993 | $892.49 | qa_approved |
| 0655fef2-b08b-4f88-98b0-34876b190328 | Spectrum Business | 013539802726 | $432.20 | qa_approved |
| 26098d79-5ef0-4e9d-b1a3-17270bbb5da6 | Home Depot | — | $219.00 | qa_approved |
| 84afd60e-90ea-4ea4-84f5-38e1975f6b1a | Island Lumber and Hardware, Inc. | 532330 | $156.52 | qa_approved |
| 50c59f0f-663f-458b-ac7b-9355d9d58295 | ISLAND LUMBER AND HARDWARE,INC. | 532826 | $23.52 | qa_approved |
| 3712855c-f9eb-4646-95f3-f98aad22b865 | Island Lumber and Hardware, Inc. | 532452 | $10.70 | qa_approved |

## PCCO numbering (nwrp273 flag — one-line answer)

Rule: per-job `max(pcco_number)` over **non-deleted** rows + 1 (`src/app/api/jobs/[id]/change-orders/route.ts:95-103`); the scratch CO drew #18 because Dewberry's single active CO carries real-world PCCO **#17** from the mid-project import — numbering correctly continues the imported client-facing sequence, soft-deleted rows excluded.

## Q2 — RESOLVED: importer silently drops value-bearing UNCODED G703 rows ($479,900.00 to the cent)

**Source recovered (no halt needed):** `test-invoices/Fish_Pay_App_21_March_26.xlsx` — the exact workbook the importer read (all 144 DB lines created 2026-04-18; per-line baselines match the workbook exactly). Replayed through the repo's own `parsePayApp` via `tmp/q2-import-diff.ts` + raw-dumped via `tmp/q2-raw-dump.ts` (both committed for reproducibility).

**The four dropped rows** (G703 sheet rows 217-220, page 5 — ITEM column EMPTY):

| Row | Description | Scheduled | Previous applications |
|---|---|---|---|
| 217 | Open louver doors | $66,000.00 | $0.00 |
| 218 | Louver overhangs | $288,900.00 | $285,213.33 |
| 219 | Pergola | $25,000.00 | $21,382.68 |
| 220 | Planters waterproofing and drainage | $100,000.00 | $12,975.00 |
| | **Σ** | **$479,900.00 — exactly the Q2 gap** | **$319,571.01** |

The sheet's own TOTALS row (224) reads original $7,496,667.17 — Jake's BT number; coded lines sum $7,016,767.17; the four uncoded rows are the difference to the cent. The G703's PCCO rows (221-222) were correctly captured separately (`previousCoCompletedAmount` $871,701.50).

**Hypothesis #3 — CONFIRMED in substance, refined in number.** The dropped rows carried **$319,571.01** of previous billings (not ≈$224,906.77). Full decomposition of the negative payment due:

```
Nightwork line-derived completed   = baselines $5,151,273.08 + Nightwork-period $167,896.47 = $5,319,169.55
Imported prior certificates (G702) = $5,544,076.32
Negative payment due               = 5,319,169.55 − 5,544,076.32 = −$224,906.77   ✓ exact
Gap decomposition: $392,803.24 missing from line-derived prior work
  = $319,571.01 (dropped uncoded rows' previous billings)
  + $73,232.23  (BT-internal basis drift: the workbook's OWN G702 less-previous-payments
                 $5,544,076.32 ≠ its OWN G703 previous-applications total $5,470,844.09 —
                 a prior-app artifact inside the BT export, not an importer issue)
```

So the −$224,906.77 is an **artifact of missing line attribution, not real over-billing** — Jake's read confirmed. The cover-level numbers (contract, net COs, prior certificates) imported correctly; the line-level base was short $479,900 scheduled / $319,571.01 previous.

**WHY (the bug, more important than the backfill):** `src/lib/pay-app-parser.ts:306-307` — `const code = normaliseCostCode(colA); if (!code) return;` — a **silent** skip of any G703 row without a normalizable cost code, regardless of dollar value. The duplicate-code case immediately below (line 311) DOES emit a warning; the no-code case emits nothing (`warnings: []` on this parse — the import looked clean). Every future job import repeats this on uncoded scope rows. **Fix options (not executed — surface for authorization):** (i) minimum: warn when a skipped row carries non-zero scheduled/previous/this-period value (parser-only, ~10 lines, makes the drop visible at import time); (ii) fuller: import uncoded value-bearing rows under a synthetic "UNCODED" bucket requiring operator resolution before the import commits. Recommend (i) now, (ii) as an F6-family decision. Note the four dropped rows are CO-shaped scope (louvers/pergola/planters) — backfill disposition folds into TD-NW-CO-LINE-ALLOCATION (coded lines vs C-suffix CO lines, Jake/Andrew's mapping call).

## New findings N1-N3 (from Jake's G703 detail read, nwrp273 — filed with root causes)

- **N1 — CO description truncation at first "."**: `src/components/prototypes/DrawApprovalView.tsx:293` — `{co.description.split(".")[0]}` truncates at the first period ("plan revision #3 7.14" → "plan revision #3 7"; "Ext. Column Wraps" → "Ext"). `DrawPrintView.tsx` contains NO split call (grep-clean) — the truncation is the detail view's CO panel at code level. Bank-facing copy; the fix is removing the split (or splitting on sentence-end only). Small fix, pending authorization.
- **N2 — CO amount display inconsistency**: `/jobs/[id]/change-orders` table renders base `amount` while the pay-app detail CO panel renders `total_with_fee` (1.15× on fee-bearing COs) — the same CO reads $300 one place, $345 another, neither labeled. UX-labeling fix routed with F6 CO work per nwrp273.
- **N3 — Fee/deposit display scale (display bug + latent hazard, mixed column conventions)**: `src/app/jobs/[id]/page.tsx:390-391` renders the stored **fraction-scale** `deposit_percentage`/`gc_fee_percentage` (0.10 / 0.20 per CLAUDE.md schema + live data) with a bare `%` suffix and no ×100 → displays "0.1%" / "0.2%" instead of "10% / 20%". The CO math itself is CORRECT (gc_fee_rate 0.15 → 1.15× multiplier; fraction scale consistent in draw-calc). **Latent hazard:** the same page's edit form (`page.tsx:460-465`) collects these fields on a **0-100 scale** ("Deposit % (0–100)", defaults 10/20) — saving would write 10/20 into fraction-scale columns and corrupt draw math; currently INERT because the jobs PATCH route does not accept those fields (grep-clean). **Mixed conventions across columns:** `retainage_percent` is 0-100 (draw-calc.ts:19 "All percentages are 0–100") while deposit/gc_fee are fractions — a convention-unification candidate. Display fix is one line (×100); the form-scale + convention question routes with it.

## Status

PART-2C FINAL. Awaiting Jake's review → then 2A entry gate (smoke-login probes per nwrp266 §13 + the D2 allocation-authoring check + app-layer audit-trail carry-forwards).
