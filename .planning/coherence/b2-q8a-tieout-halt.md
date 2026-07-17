# B2 · Q8a TIE-OUT GATE — FIRED → RULED. (2026-07-17)

**Status: RESOLVED — Jake ruled Option A (proceed with the allocations switch).**
The per-invoice delta table below stands as the closing proof of why the switch was
mandatory: the old source had NO maintenance path from allocations at all — the
divergence is evidence of brokenness, not ambiguity to preserve.

**RIDER (Jake, 2026-07-17):** `budget_lines.invoiced` is demoted to
display-cache-or-dead — it feeds ZERO math after this. Executor's call
maintenance-vs-kill by whichever is smaller (report which). **Never let a stored
rollup with no writer feed a gate again.**
**Executor's call: KILL.** All readers re-point to a new SQL view
(`invoice_budget_consumption`) implementing the draw engine's exact 3-tier
attribution; the 00027 invoiced triggers + recompute function are dropped; the
column keeps zero writers and zero readers (kept in place, commented dead — drop
deferred). Smaller than maintenance because honest maintenance needed a brand-new
allocation trigger set + per-surface staleness badges; the view is one definition
serving gate + displays + export + integrity alike.

**PARTIAL-APPROVE × SPLIT (Jake, 2026-07-17): BLOCK-ON-SPLIT.** Proportional
auto-apportionment is the system silently deciding how much each JOB pays —
forbidden. Block message names the equivalent existing path: "Adjust the
allocations to the amount you're approving, then approve in full — or remove the
split." Recorded as deliberate policy alongside Q9 (credits don't split);
explicit-per-portion is a future upgrade only if real use demands it.

**PROOF (2026-07-17, post-switch — all green, fixtures fully reverted):** the view
reproduces the tie-out table cent-exact (9 rows, $59,420.75, tier-1). On the announced
two-job walk fixture ($6,000→A/05101 + $4,000→B/13101, budget line A/05101 $9,000):
strip predicted 05101 $5,910 over → the rebuilt gate fired at exactly +$5,910.00 (65.7%)
server-side; the REAL draw engine pulled 05101=600000 (job A) and 13101=400000 (job B) —
cent-identical to the view (draws ≡ budgets); pricing_history + the spine attributed
per-portion (job-correct) with job_item_activity following the re-attribution exactly;
partial-approve on the split 422'd with the ruled message; the new total-guard raised on
a desync attempt; the wizard showed Sample B costs-to-date $30,248.00 including the
foreign-headered portion. Revert byte-identical (residue 0; view back to baseline).
Full evidence: `.planning/qa-runs/2026-07-17-massive-run-b2-budget-unification-qa-report.md`.

Original halt surface follows (evidence record).

---

**Status at halt: no switch built, zero writes performed.** Session: B2 (budget-source
unification). HEAD = origin/main = `7345a94`, tree otherwise clean.

Per the B2 dispatch: *"If they DISAGREE anywhere → HALT and surface the per-invoice
deltas — a silent budget shift is forbidden; I rule on divergences before any switch."*
They disagree everywhere. This file is the durable halt surface.

## The two readers compared

- **OLD (current) budget consumption** — `SUM(invoice_line_items.amount_cents)` keyed by
  the STORED `invoice_line_items.budget_line_id`, invoices in counting statuses
  {pm_approved, qa_review, qa_approved, pushed_to_qb, in_draw, paid}. Implemented in
  `src/lib/recalc.ts:88-99` (TS) + `recompute_budget_line_invoiced` (SQL, migration
  00027:108-126, triggers on line-item DML + invoice status flips). Cached on
  `budget_lines.invoiced`.
- **NEW (proposed, Q8a=option-a)** — the draw engine's exact 3-tier per-invoice
  attribution (`src/lib/draw-calc.ts:97-167 sumThisPeriodByCostCode`), keyed (job_id,
  cost_code_id): tier-1 live `invoice_allocations` (job-scoped, canonical); tier-2
  coded line items for allocation-less invoices (header job, keyed by cost CODE);
  tier-3 invoice-level cost_code × total_amount (header job).

## TIE-OUT TABLE (all orgs, all counting-status live invoices, 2026-07-17)

| Job | Code | Vendor | Status | OLD consumed | NEW consumed | Δ |
|---|---|---|---|---:|---:|---:|
| Patrick Gavin – 717 North Shore | 13103 | EloDesigns of Sarasota | qa_approved | $0.00 | $5,702.35 | +$5,702.35 |
| Sample Client A | 03114 | Mock Concrete Supply | qa_review | $0.00 | $950.00 | +$950.00 |
| Sample Client A | 05101 | Mock Concrete Supply | qa_review | $0.00 | $8,910.00 | +$8,910.00 |
| Sample Client A | 10101 | Test Plumbing Co | qa_approved | $0.00 | $10,710.70 | +$10,710.70 |
| Sample Client A | 12102 | Test Plumbing Co | qa_approved | $0.00 | $2,739.20 | +$2,739.20 |
| Sample Client A | 13101 | Demo Electric LLC | qa_approved | $0.00 | $4,160.50 | +$4,160.50 |
| Sample Client B | 10101 | Sample Framing & Carpentry | in_draw | $0.00 | $14,750.00 | +$14,750.00 |
| Sample Client B | 15102 | Placeholder Drywall Inc | in_draw | $0.00 | $1,814.96 | +$1,814.96 |
| Sample Client B | 19101 | Placeholder Drywall Inc | in_draw | $0.00 | $9,683.04 | +$9,683.04 |
| **TOTAL** | | | | **$0.00** | **$59,420.75** | **+$59,420.75** |

Agreement rows (0 = 0, excluded above): the Placeholder Drywall **credit memo −$640.00**
(in_draw; no allocations, uncoded line items, no header code — contributes zero to BOTH
sources; it is the known uncaptured-credit handled by G702 line 8) and all 5
Verification-Harness-org invoices (no allocations / line items / codes at all).

## Mechanism — why OLD reads $0.00 everywhere (SQL-verified)

1. **Zero live `budget_lines` exist in the entire database.** Only 3 soft-deleted rows
   remain (old Gavin 13103 deleted 2026-07-09 in the coherence wipe; 2 smoke-fixture
   lines deleted in June).
2. **All 28 live `invoice_line_items` have `budget_line_id = NULL`** (24 carry cost
   codes). `budget_line_id` is resolved ONLY at line-items PUT save time
   (`line-items/route.ts:90-138`) — with no budget lines existing at save time, nothing
   ever resolved, and nothing ever re-resolves later.
3. Therefore every consumer of the old source — `budget_lines.invoiced` cache, WI-L-4
   over-budget gate (`action/route.ts:226-313`), balance-impact budget baselines
   (`balance-impact/route.ts:89-123`) — currently reads **zero budget consumption for
   the whole company**, while the draw engine reports these same dollars on G703s.

**Structural consequence (the real finding):** under the old source, any budget line
created AFTER its invoices (the normal flow now — budgets will be imported/created onto
jobs with existing approved invoices) reads `invoiced = $0` FOREVER, because stored
`budget_line_id` resolution never re-runs. The old source doesn't just disagree today —
it can never converge without a backfill mechanism it doesn't have.

## Divergence classes (for the ruling, beyond today's zeros)

- **Class 1 — resolution absence (all 9 rows above):** old = $0 because no budget line
  existed at line-item save time. New reads the allocation dollars immediately.
- **Class 2 — tax/fee fold (2 invoices, latent):** allocations are balanced to the FULL
  invoice total (tax/fee folded pro-rata — same dollars the G703 bills); line items sum
  to the pre-tax detail. EloDesigns: allocations $5,702.35 vs coded lines $5,344.82
  (+$357.53). Test Plumbing: $13,449.90 vs $12,570.00 (+$879.90). Even in a world where
  old-source resolution worked, OLD would under-count consumption by the tax/fee share
  relative to what the draw actually bills. The over-budget gate would fire at the full
  billed amount under NEW (matches draws), at pre-tax under OLD.
- **Class 3 — PO-override keying (0 rows today, semantic):** old tier keyed a line to a
  PO's budget line even when the line's cost code differed (`line-items/route.ts:108-123`);
  NEW tier-2 keys by cost code (mirrors the draw engine exactly). No live data exercises
  this.

## Options for the ruling

- **A (recommended): proceed with the switch as specced** — unified 3-tier
  allocations-first reader everywhere (SQL `recompute_budget_line_invoiced` + triggers,
  TS `recalcBudgetLine`, WI-L-4 gate, require_budget_allocation gate re-anchored to
  allocation coverage, balance-impact budget baselines, drilldowns/exports/guards).
  Today's rendered UI changes nothing (no budget lines exist → no budget rows render
  anywhere); the switch determines what FUTURE budget lines read the moment they're
  created — $59,420.75 of honest existing consumption instead of $0, cent-identical to
  what draws already report. Gate thresholds: identical on clean data (allocations =
  line items); on Class-2 invoices the gate sees the full billed total (correct).
- **B:** switch tier-1 to allocations but keep tier-2 keyed by stored `budget_line_id`
  (preserves PO-override binding, diverges from the draw engine's code-keyed tier-2 —
  a dual-source remnant). Not recommended.
- **C:** no switch until budget lines are re-established and a backfill re-resolution
  is designed for the old source. Blocks B2.

## ALSO HALTED — item 2, partial-approve × split (accounting-policy call)

**Current semantics** (`partial-approve/route.ts`): PM picks LINE ITEMS → approved lines
move to a new CHILD invoice (total = moved lines' sum, straight to qa_review, header
job/code inherited); parent keeps held lines, total_amount rewritten to heldTotal,
status pm_held. **Allocations are never touched** — and `trg_split_fully_allocated`
(00122:142-146) fires only on allocation DML, not on `invoices.total_amount` updates, so
partially approving a SPLIT parent today silently leaves live allocations summing to the
ORIGINAL total ≠ new held total — the exact state the trigger exists to prevent, and one
the draw RPCs' lien math assumes impossible.

**One-paragraph proposal:** line items carry no job identity, so there is no mechanical
mapping from "the line items the PM approved" to "which JOB's portion was approved" —
neither *proportional* (smears job B's coding onto a child that may be entirely job A's
work) nor *explicit-per-portion* (requires a new job-aware picker UI that duplicates the
allocation grid) derives honestly from the existing line-item-picker semantics.
**Recommendation: BLOCK partial-approve on split invoices** (422: "Split invoices can't
be partially approved — adjust the split in the allocation grid, or approve/hold the
whole invoice"), consistent with Q6's whole-invoice-status ruling; AND fix the mono-job
defect that exists regardless: on partial approval, regenerate BOTH sides' allocations
from their post-split line items (child: grouped coded lines ≡ child total by
construction; parent: grouped held lines, any remainder vs heldTotal left visibly
unallocated — parent is pm_held and must pass PM review again anyway), plus a guard that
re-validates the balanced invariant whenever total_amount changes on an invoice with
live allocations. Alternative if you want split-portion approval granularity: proportional
per-allocation scaling (largest-remainder, cent-exact) — mechanically clean, but it
invents an accounting statement (job×code amounts nobody reviewed), which is why it is
not the recommendation.

## Not blocked (awaiting go): items 3 + 4

Price-intel per-portion attribution and the wizard job-context card are independent of
both rulings; not started, per halt-on-surprise. The B1 fixture re-walk PROOF runs after
all four land.

## Session state at halt

- Consumer sweep: 5-agent workflow `wf_bcec0f6c-a14` — **COMPLETE (5/5)**. Full
  structured results (99 findings, file:line) copied to session scratchpad
  `b2-consumer-sweep-results.json`; distilled must-change counts: invoiced-readers
  20 · line-item consumers 18 (overlapping) · price-intel 6 · partial-approve 11 ·
  wizard 3.
- **Notable sweep findings beyond the tie-out (for the build, once ruled):**
  - **NO trigger on `invoice_allocations` maintains `budget_lines.invoiced` today** —
    allocation edits never touch the cache (a live staleness gap that exists even
    before the switch; 00078/00096/00122 added no cache maintenance).
  - **PO consumption stays line-item-sourced** — allocations carry no `po_id`;
    explicit scope split: budget scope → allocations, PO scope → line items
    (`recalcPO` / `recompute_po_invoiced` untouched).
  - `jobs/health` + `dashboard` APIs read the cache directly — no code change if the
    cache is re-pointed; their values change from $0 to honest numbers.
  - `jobs/[id]/overview` billed_to_date reads invoice HEADER totals — over-attributes
    split invoices to the header job; switch to allocation sums in the sweep.
  - Price-intel targets confirmed: `commit-line-to-spine.ts:298-339` + trigger
    00077:79-138 (`pricing_history.job_id` NOT NULL, header-sourced) +
    `extract-invoice.ts:266-285`.
- No code written, no DB writes (tie-out was read-only SQL), no commits.
- Spend at halt: well under surface ($120 ceiling intact).
