---
phase: f6-family
severity: HIGH
plan_version: 2
ceiling_working: 90
ceiling_surface_at: 75
ceiling_pipeline_cap: 200
parallel_execute_ok: false
requires_smoke: true
source_expanded_scope: .planning/expansions/f6-family-EXPANDED-SCOPE.md
authorization: nwrp286 (plan + execute autonomously under HIGH; firewall + answered Qs)
plan_review: iter-1 ran 4 consolidated HIGH reviewers (money on Opus; security/spec+planner+enterprise/custodian+design on Sonnet); ALL findings incorporated below; iter-2 round skipped for ceiling discipline (constructive hardening, no factual disputes — Rule 9 N/A; per-AC machine verification is the net).
---

# PLAN v2 — f6-family (CO allocation gate + backfill rails + draw staleness + N2 labeling)

## Phase goal

Close the change-order allocation hole that leaves Fish's 144 budget lines showing inflated %-complete because $799,510.34 of approved-CO base scope is authored header-only with **zero** budget-line allocations. Make allocation enforceable at approval (org-configurable gate, OFF for RB until Jake's backfill), build idempotent rails to backfill the 72 existing COs (mechanism only), surface draw staleness honestly, and disambiguate base-vs-with-fee CO amounts.

**Not in scope (firewall):** executing the Fish backfill against real data; flipping any allocation gate ON for RB; auth/middleware/owner-portal/listener; lien-create.

## Machine-verified baseline (live SQL 2026-06-17 — the hand-calc reference)

| Fact | Value |
|---|---|
| Fish approved COs | 72 (all `approved`; **0 `executed`**) |
| Σ CO base `amount` (fee-excluded) — **backfill target** | 79,951,034¢ = **$799,510.34** |
| Σ `gc_fee_amount` | 9,763,305¢ = $97,633.05 |
| Σ `total_with_fee` (job/G702 rail — already exact, allocation-invariant) | 89,714,339¢ = **$897,143.39** |
| Fish budget lines | 144 |
| Σ `original_estimate` = Σ `revised_estimate` (today) | 701,676,717¢ = $7,016,767.17 |
| Σ `co_adjustments` (today) | **0** |
| CO lines on Fish today | **0** |
| Post-backfill Σ `co_adjustments` (expected) | 79,951,034¢ |
| Post-backfill Σ `revised_estimate` (expected) | 781,627,751¢ = $7,816,277.51 |
| Fixture org for mutations | `fixture-harness-org` = `00000000-0000-0000-0000-fb1ce0a55e55` |
| RB org (READ-ONLY) | `00000000-0000-0000-0000-000000000001` |

**Confirmed by plan-review against live DB + migration 00042:** `change_order_lines` mutations fire ONLY `trg_change_order_lines_sync` → `recompute_budget_line_co_adjustments` (budget-line rail); they do **NOT** fire `co_cache_trigger` (attached to `change_orders` only). So allocating CO lines moves only `budget_lines.co_adjustments`/`revised_estimate` and leaves `jobs.approved_cos_total`/`current_contract_amount` (89,714,339¢, fee-inclusive) and G702 `net_change_orders` untouched. Backfill target $799,510.34 is correct; $897,143.39 is the already-exact allocation-invariant job rail.

**Filed divergence (file-don't-fix):** `.planning/tech-debt/TD-F6-TRIGGER-RECALC-DIVERGE.md` — trigger counts `{approved,executed}`, `recalcBudgetLine` counts `{approved}`. Zero live impact (no executed COs; app never writes `executed`).

---

## D1 — CO allocation gate (money path) — execute FIRST

**Tasks**
1. **Migration `00111_co_budget_allocation_gate.sql`** (+ `.down.sql`). Use the **no-atomicity-window** structure (per security review, cleaner than ADD-true-then-UPDATE):
   ```sql
   ALTER TABLE public.org_workflow_settings
     ADD COLUMN IF NOT EXISTS require_co_budget_allocation BOOLEAN NOT NULL DEFAULT false;  -- existing rows (incl RB) → false (ungated, safe) immediately, no UPDATE needed
   ALTER TABLE public.org_workflow_settings
     ALTER COLUMN require_co_budget_allocation SET DEFAULT true;  -- new orgs (self-heal upsert) → gated
   ```
   Comments: cite nwrp286 Q2; "structurally identical to 00109's default flip — existing rows never see committed true; new orgs inherit true"; "column inherits existing RLS from 00032/00049 — no new policy needed". Down: `ALTER TABLE ... DROP COLUMN IF EXISTS require_co_budget_allocation;` with comment "data-destructive for the flag; acceptable — additive column, rollback returns to no-gate behavior".
2. **Regenerate** `src/lib/types/database.types.ts` (`supabase gen types typescript --linked`) — same commit as the migration (type-regen hook).
3. **`src/lib/workflow-settings.ts`**: add `require_co_budget_allocation: boolean` to `WorkflowSettings` (after `co_approval_required`); to `DEFAULT_WORKFLOW_SETTINGS` = `true` **with a comment**: "code-default = new-org/fallback default (gated). Existing rows are set false by migration 00111; this `true` is only hit on a genuinely-missing row (self-heal) or the fail-closed `fallback()` path — NOT 'always on'. Mirrors require_budget_allocation."; add `require_co_budget_allocation` to the `COLUMNS` string.
4. **`src/app/api/workflow-settings/route.ts`**: add `"require_co_budget_allocation"` to the `BOOL_COLUMNS` allowlist so the gate is toggleable via API (Jake flips RB ON later).
5. **`src/app/api/change-orders/[id]/route.ts`** — inject the gate **inside a new `if (body.status === "approved") { ... }` block placed AFTER the void-guard block (after ~:174) and BEFORE `patch.status = body.status` (~:177)** — NOT inside the `["approved","denied"]` role check (must not fire on `denied`). Logic, wrapped in a **local try/catch** mirroring invoice action `:190-203`:
   ```
   if (body.status === "approved") {
     try {
       const settings = await getWorkflowSettings(membership.org_id, { failClosed: true });
       if (settings.require_co_budget_allocation) {
         // EFFECTIVE post-write state (handle combined-body PATCH):
         const effectiveAmount = body.amount !== undefined ? Math.round(body.amount) : co.amount;
         // lines that WILL exist post-write: if body.lines provided use the filtered set
         // (amount !== 0 || description, mirroring the insert filter ~:243); else DB lines:
         const lines = body.lines ? <filtered body.lines> :
           (await supabase.from("change_order_lines")
              .select("budget_line_id, amount")
              .eq("co_id", params.id).eq("org_id", membership.org_id).is("deleted_at", null)).data ?? [];
         const allAllocated = lines.length > 0 && lines.every(l => !!l.budget_line_id);
         const sumLines = lines.reduce((s,l)=> s + (l.amount ?? 0), 0);
         if (!allAllocated) return NextResponse.json({ error: "Every change-order line must be allocated to a budget line before approval" }, { status: 422 });
         if (sumLines !== effectiveAmount) return NextResponse.json({ error: "Change-order line allocations must sum to the CO amount before approval" }, { status: 422 });
       }
     } catch (err) {
       console.error(`[CO action workflow] settings unavailable — failing closed: ${err}`);
       return NextResponse.json({ error: "Workflow settings unavailable — cannot evaluate allocation gate. Retry shortly." }, { status: 422 });
     }
   }
   ```
   Notes: org-scope the lines query with `membership.org_id` (do NOT add org_id to the CO fetch); the gate evaluates the EFFECTIVE post-write lines/amount so a combined `{status:approved, lines, amount}` PATCH is handled correctly (two-step allocate-then-approve remains the primary flow per Q1; combined-body is handled defensively). `≥1 line` stays an independent clause (a $0 CO with zero lines → 422 when gated; that's intended — gate ON forbids unallocated approvals).

**Acceptance criteria (machine-verified on fixture-org)**
- AC-D1-1: gate ON, CO with zero lines → approve **422**.
- AC-D1-2: gate ON, lines present but one missing `budget_line_id` → **422**.
- AC-D1-3: gate ON, Σ line.amount ≠ co.amount → **422**.
- AC-D1-4: gate ON, ≥1 line, all allocated, Σ==amount (lines pre-committed in DB) → **200**; then `budget_lines.co_adjustments` for the touched line == Σ allocated cent-exact, `revised_estimate == original + Σ` (SQL cross-check). **Gate evaluates DB-committed lines (two-step flow).**
- AC-D1-4b: combined-body PATCH `{status:'approved', amount:A, lines:L}` with Σ L ≠ A → **422**; with Σ L == A and all allocated → **200**.
- AC-D1-5: gate **OFF** → contract-only (zero-line) CO approves **200** (RB-posture, no regression).
- AC-D1-6: settings read forced to throw → **422** (fail closed, explicit message — NOT 500).
- AC-D1-7: `database.types.ts` contains `require_co_budget_allocation`; `BOOL_COLUMNS` includes it; `npm run build` green; full suite green.
- AC-D1-8: `__tests__/workflow-settings-failclosed.test.ts` gains a pin `DEFAULT_WORKFLOW_SETTINGS.require_co_budget_allocation === true`.

---

## D2 — 72-CO backfill rails (mechanism only; NOT run on RB)

**Tasks**
1. **`scripts/backfill/co-line-allocation.mjs`**: input mapping `{ co_id: [{ budget_line_id, amount, description? }] }` (+ `--job`, `--org`, `--apply`, `--reallocate` flags; **dry-run default**). **Production guard fires on the RESOLVED org_id** (per security review): fetch the job row, and if `job.org_id === '00000000-0000-0000-0000-000000000001'` (RB) abort unless `--i-understand-this-is-production` is passed (this run never passes it). Guard runs before any read of CO data and before any insert. Per CO: validate Σ amounts == `co.amount` (abort with cents diff, **no partial insert** — validate ALL then insert); idempotency = abort if the CO already has non-deleted lines unless `--reallocate` (soft-deletes prior lines first). Insert via the authoring column shape (`co_id, budget_line_id, cost_code, description, amount, sort_order, org_id`). Post-insert: re-query and assert `Σ change_order_lines.amount` == expected and each touched `budget_lines.co_adjustments` moved exactly; print a cents-exact reconciliation table. MSYS_NO_PATHCONV note in header.
2. **Self-test** `tmp/zz-backfill-rails-test.mjs` (fixture-org, ZZ-named scratch CO + budget line) — **LOCAL ONLY, never committed** (run, verify, delete before any `git add`; excluded from files_modified): dry-run mutates nothing; `--apply` creates lines; re-run idempotent; exact-sum verified; cleanup soft-deletes ZZ rows + asserts zero ZZ residue (**immediate HALT if cleanup fails**).

**Acceptance criteria**
- AC-D2-1: dry-run mutates **nothing** (row counts unchanged).
- AC-D2-2: `--apply` creates lines; touched `co_adjustments` == Σ allocated cent-exact; `revised_estimate == original + Σ`.
- AC-D2-3: re-run idempotent (no dupes; sums unchanged).
- AC-D2-4: Σ-mismatch mapping aborts with cents diff, **no partial insert**.
- AC-D2-5: ZZ scratch cleaned to zero residue (HALT on failure).
- AC-D2-6: production guard fires on **resolved `job.org_id`** (not just `--org`); script NOT executed against RB; Fish target documented = **$799,510.34**.
- AC-D2-7: pricing-history side effect (`trg_change_order_lines_pricing_history` fires on insert) documented in the runbook (benign — price-intel learns from CO lines).

---

## D3 — draw staleness badge (display-only)

**Premise (plan-review CRITICAL):** `rollupDrawTotals` (`draw-calc.ts:270-327`) PASSES THROUGH `original_contract_sum` and `net_change_orders` from its args (which `_data.ts` feeds from the STORED draw columns) — comparing stored-vs-recomputed on those two is `x == x`, always false (dead fields). The diff must cover only fields rollup genuinely DERIVES, plus we recompute `net_change_orders` from source (the phase-relevant staleness signal — a CO approved after the draw was drafted).

**Tasks**
1. **`src/app/financials/pay-apps/[id]/_data.ts`**: compute `stored_summary_stale: boolean`. At implement time, read `rollupDrawTotals` and split derived-from-source vs pass-through. Diff set = the **source-derived** G702 fields: `total_completed_to_date`, `current_payment_due`, `balance_to_finish`, `deposit_amount`, `contract_sum_to_date` — PLUS recompute `net_change_orders` via `netChangeOrdersForJob(job_id)` and diff against stored `draws.net_change_orders` (the meaningful CO-staleness signal). **Exclude `original_contract_sum`** (pure pass-through, no independent source). Integer-cents `!==` compare only — never route through `/100` dollar conversion. **No DB write.**
2. **`src/components/prototypes/DrawApprovalView.tsx`**: add `stored_summary_stale?: boolean` to `DrawApprovalViewProps` (a **separate prop** — do NOT augment the locked `CaldwellDraw` fixture type); thread it from `page.tsx` (add to `PayAppViewData`, pass at the call site). When `draw.status === 'draft' && stored_summary_stale`, render `<Badge variant="warning" size="sm">Recomputed — stored value stale</Badge>` (from `src/components/nw/Badge`) adjacent to the existing status Badge (~:479) inside its `flex items-center gap-2` summary row. No inline hex/style.

**Acceptance criteria**
- AC-D3-1: unit test (`__tests__/draw-staleness-diff.test.ts`) — diff returns false when stored==recomputed; true when ANY **included** field diverges. Each included field has a fixture proving it can flip the result true (no dead fields).
- AC-D3-2: badge renders only when `draft && stale`; non-draft or non-stale → absent (prop threaded end-to-end — verified by the unit/render path, not just in isolation).
- AC-D3-3: no DB mutation on render (grep: no new `.update(`/`.insert(` in `_data.ts`).
- AC-D3-4: visual placement/wording (incl. visible-without-expanding-the-timeline) → **QUEUE for Jake's walk**.

---

## D4 — N2 labeling (display-only, two surfaces)

**Tasks**
1. **`src/app/jobs/[id]/change-orders/page.tsx:240`**: header `Amount` → `Base Amount` (column renders `co.amount`, fee-excluded; mirror CO-detail wording).
2. **`src/components/prototypes/DrawApprovalView.tsx:266-307`**: add a "With fee" eyebrow label adjacent to the `total_with_fee` `<Money>` (~:302). Typography MUST mirror the PCCO eyebrow at `:279-285`: `fontFamily: 'var(--font-jetbrains-mono)'`, `textTransform: 'uppercase'`, `color: 'var(--text-tertiary)'`. Do NOT alter the `co.description.length > 160` truncation block. Keep the `<li>` flex layout neutral (do not add a wrapper that changes the description's `min-w-0 flex-1` constraint).

**Acceptance criteria**
- AC-D4-1: the `co.description.length > 160` truncation block is **byte-unchanged** (content-anchored grep, not line-number); AND a **Chrome DevTools render of the Fish pay-app PCCO panel** confirms PCCO #11 ("plan revision #3 7.14") + #65 ("Ext. Column Wraps") render unbroken with the new "With fee" label present and no visual reflow (machine/visual non-regression — the aesthetic sign-off is still queued for Jake, but breakage is caught here per the always-test-with-DevTools rule).
- AC-D4-2: chrome-once — grep the financials subtree for `<AppShell`; expect **exactly 1** match (`financials/layout.tsx:14`); any increase is BLOCKING. Confirm the same in the DevTools render (one nav).
- AC-D4-3: `npm run build` green.
- AC-D4-4: visual label clarity → **QUEUE for Jake's walk**.

---

## files_modified

```
supabase/migrations/00111_co_budget_allocation_gate.sql            (new)
supabase/migrations/00111_co_budget_allocation_gate.down.sql       (new)
src/lib/types/database.types.ts                                    (regen)
src/lib/workflow-settings.ts
src/app/api/workflow-settings/route.ts                             (BOOL_COLUMNS)
src/app/api/change-orders/[id]/route.ts
scripts/backfill/co-line-allocation.mjs                            (new)
src/app/financials/pay-apps/[id]/_data.ts
src/components/prototypes/DrawApprovalView.tsx
src/app/jobs/[id]/change-orders/page.tsx
__tests__/co-allocation-gate.test.ts                               (new)
__tests__/draw-staleness-diff.test.ts                              (new)
__tests__/workflow-settings-failclosed.test.ts                     (add new-key pin)
```
Explicitly NOT modified: `@/app/design-system/_fixtures/drummond/types` (CaldwellDraw) — staleness travels as a separate prop. NOT committed: `tmp/zz-backfill-rails-test.mjs` (local scratch, deleted before `git add`).
Sequential execution. `DrawApprovalView.tsx` touched by D3+D4 in the same sequential pass — no intersection risk.

## Verification protocol (nwrp286 core — machine-only)

Every correctness claim: cents-exact SQL cross-check, fixture-org mutation with exact-return, trigger first-fire vs hand-calc, full `npm run build` + suite green. DevTools render is used for D4/D3 NON-REGRESSION (does #11/#65 still render, one chrome) — the aesthetic judgment is QUEUED for Jake, never self-certified. RB mutations: NONE. Fixture mutations: ZZ-named, exact-return-verified, cleaned to zero residue, HALT on cleanup failure.

## Ship discipline

Migration applied to linked Supabase project; types regenerated same commit; build green; commit per deliverable citing `Severity: HIGH` (Rule 11). Deploy only with force-cache-bust + anon-curl sweep + domain-ID check. Surface at $75 projected; HALT at $90 (no bump while Jake away).
