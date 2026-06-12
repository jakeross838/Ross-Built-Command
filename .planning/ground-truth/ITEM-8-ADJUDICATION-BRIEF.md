# Item-8 Adjudication Brief — CO #66-72 + App-21 boundary (for Jake's sitting with Diane)

**One page, per nwrp282 ($5 task). Parked from NIGHTWORK-STATE-AND-LAUNCH-PATH checklist item 8.**

## (a) The two questions, verbatim

1. **"Did you remove COs 66-72 deliberately?"**
2. **"What did the bank fund for App #21?"**

## (b) Evidence table

| Evidence | Says |
|---|---|
| DB change_orders #66-72 (approved) | 7 rows, Σ with-fee **$25,441.87 exactly**: temp circuit $2,008.37 · countertop delivery $3,129.75 · shoe molding $6,279.00 · banquette $8,816.80 · walnut wainscot $2,858.50 · fireplace shelves $2,990.00 · plaster credit **−$640.55** |
| In-repo `Fish_Pay_App_21_March_26.xlsx` (the import source) | G703 PCCO rows: "PCCO from Previous Applications" $871,701.50 + **"PCCO for this Application" $25,441.87** — the file itself carries #66-72's sum as CURRENT-period CO billing |
| Diane's `…Adjusted_.xlsx` | PCCO log **ends at #65**, total $871,701.50; requisition column zeroed |
| DB ≤#65 sum vs Diane's log | $871,701.52 vs $871,701.50 — ties within 2¢ (per-CO fee rounding) |

**Reading:** the unadjusted App-21 export knew about #66-72 as this-application COs; the Adjusted copy looks trimmed to what the bank was asked to fund. Most likely story: 66-72 are real, deliberately pulled FROM APP 21's funding request — i.e., "STALE file" for CO existence, but the Adjusted copy is truth for what was BILLED.

## (c) Resolution branches — exact DB operations

**Branch STALE (66-72 real, file reflects billing-only trim):**
- CO rows: **no action** (they're real and approved).
- `jobs.previous_certificates_total` += the App-21 bank-funded amount (from question 2 — Diane's number).
- `jobs.starting_application_number` 21 → **22**.
- Working-draw renumber: the existing wizard draw (`b0277ee7`, draft) then renders as Pay App #22 automatically (application number = starting + draw_number − 1); set its `period_*`/`application_date` to the real App-22 window at the same time.

**Branch REMOVED (Diane voided them):**
- Surface a **7-row CO-void plan** (the standard void path fires the cache trigger; expect `approved_cos_total` −$25,441.87 → $871,701.52 and contract identity to follow) — **surface only, not executed** without Jake's order.
- Same baseline + numbering fix as branch STALE (the App-21 boundary question is independent of the CO question).

**Either branch:** the four uncoded scope rows ($479,900 / $319,571.01 prev) ride the same sitting — they're CO-shaped scope needing coded homes (TD-NW-CO-LINE-ALLOCATION backfill).

## (d) What breaks if unresolved at dogfood

The first real draw Diane creates renders as **Pay App #21 — an application number the bank has already funded** — and its PCCO continuation either includes COs the bank never saw (branch-STALE world) or omits real approved scope (branch-REMOVED world). Both are wrong **on a bank-facing document**, and the G702 "less previous certificates" line inherits the $126,927.25 billed-ahead ambiguity (checklist item 6) until the baseline is set from the funded amount.
