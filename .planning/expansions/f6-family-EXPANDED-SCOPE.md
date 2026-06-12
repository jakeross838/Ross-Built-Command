---
phase: f6-family
status: DRAFT
severity: HIGH
severity_rationale: |
  Flavor B (mixed signals), dominant HIGH — fired signals with quotes
  (PA-1 rendering, first real use of the mechanism):
  4 HIGH-side: financial logic ('CO allocation authoring', 'G703
  scheduled-value math', '72-CO backfill rails' — cents math on
  change_orders/budget_lines), trigger work ('recompute_budget_line_
  co_adjustments' — validated 2D-1, first production ride), financial
  display semantics ('base vs with-fee labeling' on bank-facing
  surfaces), wall-clock ≥16h estimate.
  2 LOW-MEDIUM-side: UI/config ('staleness affordance', 'labeling').
  No schema signals fired in stated scope (existing tables only); if a
  plan-time migration appears (e.g., upload metadata), the §6.2
  MEDIUM/HIGH+schema trigger fires per tier-config and halts for
  re-confirmation — at HIGH that is confirmation, not re-tier.
  → HIGH (financial dominance per the signal table).
estimated_wall_clock: 16-20h
halt_gate_ceiling: 200
per_plan_halt: 100
---

# Expanded scope — f6-family

**Status:** DRAFT — pending Jake approval (surfaced per nwrp285 sequence; NOT auto-dispatched)
**Generated:** 2026-06-12 (first EXPANDED-SCOPE authored under the tiered mechanism)
**Authorization chain:** nwrp284 §(4) F6-first proposal → nwrp285 F6-FAMILY-FIRST STAMPED with riders → this init surface.

## Stated scope (membership PINNED per nwrp285 rider 1 — verbatim from the stamp)

> "CO allocation authoring + 72-CO backfill rails, draw staleness affordance, N2 base/with-fee labeling. Lien-create (TD-NW-LIEN-CREATE) is NOT in unless the init explicitly argues it in."

**This init does NOT argue lien-create in.** Its deadline is first-bank-submitted-package (post-dogfood-start), its scope is upload+gate-wiring (a different shape), and the first tiered phase carries zero membership ambiguity per the rider. It dispatches separately when its deadline approaches.

## 1. Mapped entities and workflows

- `change_order_lines` (exists, EMPTY system-wide) ← the authoring target; `recompute_budget_line_co_adjustments` trigger chain (VALIDATED 2D-1, hand-calc exact both directions) ← the propagation rail.
- `change_orders` ↔ `budget_lines` (co_adjustments, revised_estimate) ↔ the G703 scheduled-value column (PART-2D/2C evidence: Fish lines at 206.9% complete because $897K of COs live header-only).
- Draw stored-G702 columns (D3: stored==recomputed today; staleness becomes ACTIVE after any post-creation edit) ← affordance target.
- CO amount rendering surfaces (CO list page: base `amount`; pay-app CO panel: `total_with_fee`) ← N2 labeling target.

## 2. Prerequisites

Tiering-implementation SHIPPED (`06c23d6`) + mechanics dry-run ALL PASS ✔. 2D-1 trigger validation ✔ (TD-NW-CO-LINE-ALLOCATION Rule 10 flag cleared). PART-2D stamped (nwrp279) ✔.

## 3. Dependent-soon surfaces

The 72-CO BACKFILL EXECUTION (operational, Jake/Andrew data) rides THIS phase's authoring rails immediately after ship — backfilled rows go through the real authoring path, not raw SQL (FIRST-DRAW gate 2). The 4+2 uncoded scope rows' disposition (louvers/pergola/planters + Urns/Generator) lands in the same backfill sitting.

## 4. Cross-cutting checklist

Org-scoped + RLS-respecting writes (change_order_lines RLS = admin/owner/accounting per the existing policy); Q12 audit appends on allocation mutations; recalc-not-increment (the trigger already recomputes); GTV verification standards inherited (cents-exact SQL cross-checks, chrome-once, L8 DB-side enumeration in any audit step).

## 5. Construction-domain checklist

Allocation must support partial/multi-line splits (a CO can touch several cost codes); the G703 CO column semantics follow AIA continuation conventions; with-fee vs base labeling must be UNAMBIGUOUS on bank-facing surfaces (N2's whole point); voided COs release allocations (the 00110 void pattern extends naturally — verify, don't assume).

## 6. Targeted questions

1. Allocation UI seat: on the CO detail page (admin/owner editors per F2D-1's role model) — or a dedicated allocation step in the approve flow? (Recommend: approve-flow step — the gate semantics of `require_budget_allocation` for COs mirror the invoice pattern.)
2. Unallocated-CO posture post-ship: hard-require allocation on NEW approvals, with the backfill covering the historical 72? (Recommend: yes — mirrors the invoice-side D2 companion ordering.)
3. Staleness affordance shape: banner-on-detail when stored ≠ recomputed, or recompute-the-list? (Recommend: banner — the smallest honest fix per D3's routing.)

## 7. Recommended scope (+ falsifiable acceptance criteria)

W-shaped deliverables: (a) allocation authoring (UI + API, role-gated, audit-appending, trigger-riding); (b) backfill rails (a guided entry surface or idempotent import script for the 72 + 6 rows, exact-sum verification against $897,143.39); (c) staleness banner; (d) N2 labels ("Base" / "With fee" rendered wherever CO amounts show). ACs at plan time per template; every cents value SQL-cross-checked to the cent (2C-5 standard).

## 8. Risks + mitigations

First production ride of the allocation trigger at volume (72 COs) — mitigate: backfill runs through the rails in batches with cache-exactness checks per batch (2C-2 pattern). §6.2 watch: any migration surfacing at plan time fires the mechanical trigger (HIGH+schema = confirmation halt).

## 9. Hand-off notes

First phase under the tiered pipeline — closure condition (ii) of TD-PLANNING-PIPELINE-SEVERITY-TIERING completes when this ships under HIGH discipline. Reviewer set at plan-review will resolve per tier-config (HIGH base 6; architect-vs-enterprise signal table expected to fire architect on trigger/structure work — possibly both if audit-surface work lands).
