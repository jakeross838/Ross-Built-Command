# PART 2D — Purchase Orders + Change Orders verification results

**Date:** 2026-06-12
**Authorization:** nwrp278 (2D unblocked on F2B-1 closed-loop pass; executed as gated `a432390`, $30 ceiling, nwrp277 conditions standing).
**Spend:** ~$20-24 of $30 (wave total with the F2B-1 fix ~$28-32 of $40).
**Verdict: ALL 8 matrix rows PASS (2D-4 bounded). 2D-1 — the never-fired trigger — matched the hand calculation EXACTLY in both directions: the D2/72-CO backfill's blocking dependency is CLEARED. Role gates on CO/PO routes are PRESENT (the F2A-1 hole does not repeat here), with two layering findings. Cleanup exact-return verified everywhere; the halt clause never fired. RB rows untouched.**

## 2D-1 — first-ever runtime fire of `recompute_budget_line_co_adjustments`: HAND-CALC EXACT

Contract (from the live function def, captured pre-run): `co_adjustments = Σ change_order_lines.amount` over approved/executed non-deleted COs; `revised_estimate = original + that Σ`.

Hand calculation committed BEFORE the run: ZZ-2D budget line 100,000c original; ZZ-2D CO 40,000c fully allocated via one `change_order_lines` row.

| Step | co_adjustments | revised_estimate | job approved_cos_total | job current_contract | Result |
|---|---|---|---|---|---|
| Pre | 0 | 100,000 | 0 | 350,000,000 | captured |
| draft→approved | **40,000** | **140,000** | **40,000** | **350,040,000** | **= hand-calc, EXACT** |
| approved→void | **0** | **100,000** | **0** | **350,000,000** | **exact return** |

Both chains validated (line-adjustment + job-cache) in one transition each way. **TD-NW-CO-LINE-ALLOCATION's Rule 10 gate is satisfied; the D2 backfill may proceed once Jake stamps this doc** (per the nwrp277 TD amendment: backfill gates on 2D passing).

## Matrix

| # | Test | Result |
|---|---|---|
| 2D-1 | Trigger validation vs hand-calc | **PASS — exact both directions** (above) |
| 2D-2 | CO app-path lifecycle | **PASS** — create (owner) → approve → void via routes; `status_history` 2 entries + `activity_log` 2 rows; job cache **+23,000 exactly** (total_with_fee — fee-INCLUSIVE per the 00066 contract) and exact return on void; approved-CO edit lock fires: 422 "Approved change orders cannot be edited — void first" |
| 2D-3 | F2A-1-class role probes | **GATES PRESENT** — PM `status:approved` → **403** "Only owners/admins can approve or deny change orders"; accounting edit → **403** "Only admins/PMs/owners can edit COs"; PM PO-edit → **403**. The invoice-route hole does NOT repeat on CO/PO routes. Two findings below (F2D-1/F2D-2). |
| 2D-4 | PO lifecycle (bounded) | **PASS** — create via app (auto-numbered **PO-001**) → issued → closed; PM edit 403; soft-delete cleanup. Consumption math (partially_invoiced/fully_invoiced against linked invoices) NOT exercised — RB has zero POs and no PO-invoice linkage fixtures; flagged for the F2-era PO work, LOW risk now. |
| 2D-5 | Fee math | **PASS exact** — create with amount 20,000c × rate 0.15 → `gc_fee_amount` **3,000** / `total_with_fee` **23,000** (server-computed, clamped 0..1). |
| 2D-6 | PCCO numbering, app path | **PASS** — app create assigned **pcco #2**, correctly continuing the per-job sequence after the SQL-seeded #1 (per-job non-deleted max+1, confirmed end-to-end). |
| 2D-7 | N2 labeling surfaces | Enumerated (carry-forward restated): CO list renders base `amount`; pay-app CO panel renders `total_with_fee`; neither labeled. Routed with F6 CO work per nwrp273. |
| 2D-8 | CO-reference hard block | **PASS** — invoice line with `is_change_order=true` and no `co_reference` → approve 422 "CO Reference required on 1 change-order line item(s)" with the offending line enumerated. |

## Findings

- **F2D-1 (MEDIUM-LOW, layering inversion):** the CO route's edit gate allows admins/PMs/owners and blocks accounting, while the RLS write policy allows admin/owner/accounting and blocks PMs. Net-safe (a mutation must pass BOTH layers), but the layers disagree about who edits: accounting gets a clean 403 from the route; **PM mutations pass the route and die at RLS as a raw 500** ("new row violates row-level security policy"). Pick one role model and align both layers; until then PMs see 500s where they should see 403s.
- **F2D-2 (LOW, UX/affordance):** the per-job CO page renders "+ New Change Order" for PM viewers while BOTH enforcement layers deny PM creation (CLAUDE.md's role table backs the policy — PM scope is invoice approval/budget views/draw review, not CO authoring). The button leads PMs into F2D-1's 500. Hide-by-role or route to a request-flow.
- **Tooling lesson (session):** Git-bash MSYS path conversion mangles leading-slash arguments/env-values into Windows paths (`/api/...` → `C:/.../api/...`) — this masqueraded as per-process DNS failure (ENOTFOUND on a hostname+mangled-path concatenation). Standing fix: `MSYS_NO_PATHCONV=1` on any command passing URL paths; the flow driver gained a generic `ZZ_PATH`/`ZZ_METHOD` override (SmokeAuthHelper increment #3) with this baked into its usage docs.

## Mutation residue (documented; append-only audit stays)

Smoke Job Beta org: both ZZ-2D COs (void + soft-deleted), allocation line, budget line, two cost codes, PO-001 — all soft-deleted; Beta invoice restored to exact pre-state; job caches 0 / 350,000,000 exact. Permanent audit residue: CO status_history/activity rows + invoice status_history growth (by design, 2C-2 precedent).

## Carry-forwards to 2E

Lien test-debt adjudication (pre-loaded finding #1 in the 2E gate), draw lifecycle + wizard math, D3 staleness activation, export-vs-print diff. **2E gate (`a432390`) stands surfaced; awaiting Jake's PART-2D review + 2E go per the standing pattern. Stopped here per nwrp278.**
