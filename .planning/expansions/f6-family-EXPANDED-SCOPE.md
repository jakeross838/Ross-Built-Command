---
phase: f6-family
status: APPROVED
severity: HIGH
severity_rationale: |
  Flavor B (mixed signals), dominant HIGH — fired signals with quotes
  (PA-1 rendering):
  4 HIGH-side: financial logic ('CO allocation gate at approval', 'G703
  scheduled-value math', '72-CO backfill rails' — cents math on
  change_orders/budget_lines), schema ('migration 00111 adds
  require_co_budget_allocation to org_workflow_settings' — production
  ALTER TABLE), trigger path (the validated recompute_budget_line_
  co_adjustments rail rides on approval), financial display semantics
  ('base vs with-fee labeling' on bank-facing surfaces). ≥16h wall-clock.
  2 LOW-MEDIUM-side: UI/config ('staleness affordance', 'labeling').
  → HIGH (financial + schema dominance per the signal table).
estimated_wall_clock: 16-20h
halt_gate_ceiling: 200
per_plan_halt: 100
working_ceiling_nwrp286: 90
working_ceiling_surface_at: 75
---

# Expanded scope — f6-family

**Status:** APPROVED — authorized to plan AND execute autonomously under HIGH per nwrp286.
**Generated:** 2026-06-12 (first EXPANDED-SCOPE under the tiered mechanism). **Corrected to machine-verified ground truth:** 2026-06-17 (nwrp286 investigation + live-DB confirmation).
**Authorization chain:** nwrp284 §(4) F6-first → nwrp285 F6-FAMILY-FIRST STAMPED → nwrp286 AUTHORIZED-TO-EXECUTE (3 plan-time questions answered; verification firewall set; $90 working ceiling).

## GROUND-TRUTH CORRECTIONS (machine-verified 2026-06-17 — supersede the DRAFT premises)

The DRAFT assumed three things the investigation + live SQL disproved. The corrections **reduce** scope and risk (no scope-guard trip — the guard is for growth):

1. **CO allocation authoring ALREADY EXISTS** — full API + UI. Create: `src/app/api/jobs/[id]/change-orders/route.ts:142-158` (accepts `lines[]`). Edit: `src/app/api/change-orders/[id]/route.ts:236-257`. Authoring UI: `src/app/jobs/[id]/change-orders/new/page.tsx:333-405` ("Budget Line Allocations" editor). Read: `src/app/change-orders/[id]/page.tsx:218-257`. On approval the route already auto-creates budget lines for cost-coded lines and calls `recalcBudgetLine` (`route.ts:259-326`). **The work is NOT authoring — it is the GATE that makes allocation MANDATORY before approval**, mirroring the invoice-side `require_budget_allocation`. This is exactly what nwrp286 Q1 ("allocate-then-approve") + Q2 ("build the gate, OFF existing / ON new") describe.

2. **The backfill exact-sum target is $799,510.34, NOT $897,143.39.** Live SQL on Fish (72 approved COs): Σ base `amount` = **79,951,034¢ = $799,510.34**; Σ `gc_fee_amount` = 9,763,305¢; Σ `total_with_fee` = **89,714,339¢ = $897,143.39**. The budget-line rail (`change_order_lines.amount` → `co_adjustments`/`revised_estimate`) is **fee-EXCLUDED**; the job/G702 rail (`total_with_fee` → `jobs.current_contract_amount`/`net_change_orders`) is **fee-INCLUDED** and is **already cent-exact** (header-driven). Allocating CO lines moves the per-line G703 scheduled values; it does **NOT** change the job contract total or G702 Line 2. The $897,143.39 figure in the DRAFT conflated the two rails.

3. **The draw page already recomputes on read** (`_data.ts:16-19,177-209` — stored `draws.*` summary columns discarded; `computeDrawLines`+`rollupDrawTotals` recompute). Staleness is therefore a **net-new stored-vs-recomputed diff** computed in `_data.ts`, surfaced as a **display-only** badge on draft draws (nwrp286 Q3). No recompute-on-read helper for the *diff* exists today.

**Filed finding (NOT fixed here — out of F6 scope, no live impact):** the DB trigger `recompute_budget_line_co_adjustments` counts `co.status IN ('approved','executed')` but TS `recalcBudgetLine` (`src/lib/recalc.ts:40,110`) counts `['approved']` only. They diverge iff a CO is `executed`. All 72 Fish COs are `approved` (zero `executed`), so they agree today; the app status enum (draft→pending→approved→denied→void) never writes `executed`. Logged to the human-walk/TD queue.

## Stated scope (membership PINNED per nwrp285 rider 1 / nwrp286 — verbatim)

> "CO allocation authoring [→ gate] + 72-CO backfill rails, draw staleness affordance, N2 base/with-fee labeling. Lien-create (TD-NW-LIEN-CREATE) is NOT in unless the init explicitly argues it in."

**Lien-create is NOT argued in.** Different shape (upload+gate wiring), its own first-bank-package deadline.

## 1. Mapped entities and workflows (machine-verified)

- `change_order_lines` (table + RLS + authoring code/UI all exist; **Fish has 72 approved COs with 0 lines — pure header-only, cent-confirmed**) ← gate target + backfill target.
- `recompute_budget_line_co_adjustments(uuid)` (live body == migration 00028:421-446, confirmed via `pg_get_functiondef`) ← propagation rail: `co_adjustments = Σ(approved/executed CO line amounts)`, `revised_estimate = original_estimate + that Σ`. Fired by `trg_change_orders_status_sync` (AFTER UPDATE on change_orders, on status change) and `trg_change_order_lines_sync` (AFTER INS/UPD/DEL on change_order_lines).
- `org_workflow_settings` ← gate config home (the `require_budget_allocation`/00109 playbook to mirror).
- `src/app/api/change-orders/[id]/route.ts` PATCH (status→approved at `:214-217`, write at `:223-229`) ← gate injection seam (between role check `:158` and status write `:177`, scoped to `body.status==='approved'`).
- Draw detail render: `src/app/financials/pay-apps/[id]/_data.ts` + `src/components/prototypes/DrawApprovalView.tsx` ← staleness badge + N2 pay-app label.
- `src/app/jobs/[id]/change-orders/page.tsx` ← N2 CO-list label ("Amount" → "Base Amount").

## 2. Prerequisites (met)

Tiering SHIPPED (`06c23d6`) ✔. 2D-1 trigger validation ✔. Live-DB function bodies confirmed ✔. Fish cent-exact baseline captured ✔. Fixture org `fixture-harness-org` (`00000000-0000-0000-0000-fb1ce0a55e55`) located for mutation tests ✔.

## 3. Dependent-soon surfaces

72-CO BACKFILL EXECUTION (operational, Jake/Andrew data) rides D2's rails AFTER ship — backfilled rows go through the real authoring path, NOT raw SQL. **The live run waits for Jake + item-8 (firewall).** This run builds + fixture-tests the rails and DRAFTS the runbook only.

## 4. Cross-cutting checklist

Org-scoped + RLS-respecting writes (`change_order_lines` RLS: org-isolation RESTRICTIVE + accounting/admin/owner write per 00043); Q12 audit appends on the gate path (route already logs); recalc-not-increment (trigger + recalc.ts already recompute absolutely); RB READ-ONLY — all mutation tests fixture-org-scoped with ZZ naming + exact-return + immediate-halt-on-cleanup-failure.

## 5. Construction-domain checklist

Allocation supports partial/multi-line splits (authoring API already takes `lines[]`); the gate's invariant: ≥1 non-deleted CO line, every line has `budget_line_id`, **Σ line.amount == co.amount** (the base amount fully distributes to cost codes — fee is separate). When the gate is ON, contract-only (zero-line) COs cannot be approved — that is the gate's intended semantics (mirrors invoice side); RB keeps the gate OFF so contract-only COs still work for RB.

## 6. Targeted questions — ANSWERED by nwrp286 (do not re-ask)

1. **Allocation UI seat** → at CO-approval time (allocate-then-approve); deferred-allocation fallback only if the clean impl needs it, as secondary.
2. **Hard-require posture** → build the gate, DEFAULT OFF for existing orgs, ON for new orgs. Do NOT flip Ross Built ON (sequenced after Jake's 13-invoice backfill).
3. **Staleness affordance** → recompute-on-read badge on DRAFT draws: "recomputed; stored value stale" when stored ≠ recomputed. Display-only, no auto-write.

## 7. Recommended scope + falsifiable acceptance criteria (4 deliverables, sequential)

- **D1 — CO allocation gate** (money path): migration 00111 adds `require_co_budget_allocation BOOLEAN NOT NULL DEFAULT true` to `org_workflow_settings` + `UPDATE ... SET false` for existing rows (new-ON/existing-OFF, the 00109 playbook); regen `database.types.ts`; add the key to `workflow-settings.ts` (type + DEFAULT + COLUMNS); enforce in the CO PATCH route (fail-closed read; 422). **AC:** fixture CO, gate ON, no/partial allocation → approve **422**; fully allocated (Σ==amount) → approve **200** and budget-line `co_adjustments` == Σ lines cent-exact; gate OFF → contract-only CO approves **200** (no regression); settings-unreadable → **422** (fail closed); build green + types regenerated.
- **D2 — 72-CO backfill rails** (mechanism only): idempotent script taking a `{co_id → [{budget_line_id, amount}]}` mapping, validating Σ per CO == co.amount, dry-run default, exact-sum verification post-insert. **AC:** runs on fixture scratch CO → lines created, `co_adjustments` exact, re-run idempotent (no dupes), dry-run mutates nothing; Fish target documented as **$799,510.34** (NOT $897,143.39); **NOT executed against RB.**
- **D3 — draw staleness badge** (display-only): compute `stale` (stored `draws.*` summary vs recomputed `totals`) for draft draws in `_data.ts`; render badge near status in `DrawApprovalView` when `stale && status==='draft'`. **AC:** diff logic cents-exact unit-tested; badge only on draft+divergence; never writes DB; visual placement → QUEUE for walk.
- **D4 — N2 labeling** (display-only): `jobs/[id]/change-orders/page.tsx` header "Amount" → "Base Amount"; pay-app panel adds "With fee" by `total_with_fee`. **AC:** PCCO #11 ("plan revision #3 7.14") & #65 ("Ext. Column Wraps") descriptions render unbroken (truncation logic `DrawApprovalView.tsx:297-299` unchanged — grep-verified); chrome-once intact (AppShell mount count unchanged — grep-verified); build green; visual label clarity → QUEUE for walk.

## 8. Risks + mitigations

Money-path gate — mitigate: fail-closed read, fixture-org-only mutation tests with exact-return, mirror the proven invoice gate. Production migration while Jake away — mitigate: additive column, existing rows set to the SAFE (OFF) state = zero behavior change for RB; data-migration-safety reviewer reviews; deploy under force-cache-bust + anon-curl + domain-ID discipline. Walk-surface non-regression (stops 1/8/10) — mitigate: D4 is display-only + grep-verified non-regression; visual sign-off queued, not self-certified. §6.2 watch: the migration is the expected HIGH+schema signal — at HIGH that is confirmation, not re-tier (no halt unless a SECOND, unanticipated schema/integration surfaces).

## 9. Hand-off notes

First phase under the tiered pipeline — TD-PLANNING-PIPELINE-SEVERITY-TIERING closure condition (ii) completes when this ships under HIGH discipline. HIGH base-6 plan-review is the tier's first live exercise (nwrp286). Backfill RUNBOOK drafted (not executed) for Jake's review.
