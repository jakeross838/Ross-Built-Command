# PART 2B — Price Intel verification results (+ nwrp277 additions)

**Date:** 2026-06-12
**Authorization:** nwrp277 (2B stamped as committed, $15 ceiling; three additions folded; $50 wave ceiling).
**Spend:** 2B + additions ~$11-13 of $15; 2D NOT consumed (blocked — see bottom).
**Verdict: 2B PASSES CLEAN (5/5 SQL-side; two walk-halves fold into Jake's outstanding session). Row 127 fully identified. Caller enumeration complete — ONE unprotected enforcement path found (F2B-1, MEDIUM-HIGH) → per the nwrp277 proceed-gate, 2D did NOT execute.**

## Matrix

| # | Test | Result |
|---|---|---|
| 2B-1 | P3 panel reproducible from source rows | **PASS — exact on all four numbers:** items 61; pricing observations (`vendor_item_pricing`) 6; pending verification (`document_extraction_lines` pending, non-overhead) 80; tracked Σ total_cents = 55404 = **$554.04**. Gate-doc correction: the panel's "observations" read `vendor_item_pricing`, NOT `pricing_history` — the two tables were conflated in the gate's DB-says; both stories reconcile (see row 127). |
| 2B-2 | Verification queue count == DB | **SQL-side PASS** (80). Walk-half pending Jake. |
| 2B-3 | Item price history cents-exact | **Data pulled** (all 6 observations; Σ ties the panel). Two data-quality notes for the spot-walk: one observation dated **2027-03-25** (future date — likely parse artifact) and two **$0.00** observations (VOLCANO STONE rows). Neither blocks; both worth an eyeball. |
| 2B-4 | Orphaned surfaces unchanged | **PASS** — price-intel route table identical; suggestions/scope-data/conversions still have zero canonical URLs. |
| 2B-5 | Index posture | **PASS** — `idx_iel_pending`, `idx_vip_{org,item_date,vendor_item_date,canonical_item_date,job}`, `idx_items_{org,type,category,pricing_model}` all present. |

## Addition 1 — pricing_history row 127: IDENTIFIED (proceed-gate satisfied)

Row `b964b72c`, created **2026-06-12 12:47:40** — **Stage 2A's own flow drive**: source_type=invoice, source = Smoke Invoice Beta, source_line = the ZZ-2A line item, description "ZZ-2A-TEST-DELETE-ME line", $500.00, created_by smoke-accounting (the qa_approve actor). The price-intel ingestion pipeline fired when qa_approve crossed the invoice into spent status — a POSITIVE incidental verification (ingestion pillar works on the app path).

Org isolation verified: the row is **fixture-harness-org**; RB-scoped count = **126 exactly** (matches walk P3). Disposition: row STAYS — `pricing_history` is append-only (no deleted_at column), fixture-org rows are invisible to RB surfaces. Filed as a 2A residue-ledger addendum: future fixture-org flow tests will accrete pricing rows by design; the residue audit checklist now includes this table.

## Addition 2 — TD amendment: COMMITTED (this commit)

TD-NW-CO-LINE-ALLOCATION D2 companion now reads: **backfill execution gates on Stage 2D passing** — 2D-1 validates `recompute_budget_line_co_adjustments` (never fired at runtime) against hand-calculated expected adjustments before the 72-CO backfill rides it.

## Addition 3 — getWorkflowSettings caller classification

| Caller | Class | Read-error behavior (legacy fallback to code defaults) | Risk |
|---|---|---|---|
| `api/invoices/[id]/action` :130 | **enforcement** | **PROTECTED** — failClosed:true → 422 (F2A-2, shipped `804f80e`) | closed |
| `api/invoices/batch-action` :66 | **enforcement — UNPROTECTED → F2B-1** | evaluates ALL FIVE gates (batch_approval_enabled :67, duplicate :156, invoice_date :168, require_budget_allocation :174, require_po_linkage :186) on silently-defaulted settings | **MEDIUM-HIGH** |
| `lib/invoices/save.ts` :427 | enforcement-lite (dup FLAGGING at save) | defaults keep detection ON ('moderate') — fail-STRICT direction; an org that disabled detection gets flags re-applied (friction: flagged invoices need dismissal pre-approve; no control bypass) | LOW |
| `api/invoices/import/upload` :44 + `lib/invoices/bulk-import` :254 | enforcement-lite (batch size cap, auto-route threshold) | wrong limits/thresholds on error (e.g. org's cap 10 → default 50) | LOW |
| `api/draws/[id]/export` :204 + `cover-letter` :108/:187 | display (cover-letter template rendering) | cosmetic | none |
| `api/workflow-settings` :46/:115 + `settings/workflow/page` :50 | settings UI read/merge | self-correcting (UI shows defaults; PATCH writes explicit values) | none |

**F2B-1 (MEDIUM-HIGH, filed — NOT fixed, per "do not fix without authorization"):** the batch-action route has FULL gate parity with the single-action route and the exact pre-F2A-2 fail-open: on a settings read error, an org that DISABLED batch approval gets it silently re-enabled, and org-tightened gates evaluate against code defaults — in BULK. Fix shape is identical to F2A-2 (failClosed:true + catch→422, ~8 lines, same test pattern). Awaiting authorization.

## 2D: BLOCKED (the nwrp277 proceed-gate, third condition)

"If … the caller report shows no unprotected enforcement paths → proceed directly into 2D." It shows one (F2B-1). 2D's $30 was not consumed; the 2D gate (`a432390`) stands ready. Recommended unblock path: authorize the F2B-1 fix (same wave-shape as F2A-2, est. $5-7 including closed-loop batch replay) → then 2D as gated.
