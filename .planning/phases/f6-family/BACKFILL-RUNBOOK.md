# 72-CO Backfill Runbook (Fish Residence) — DRAFT for Jake

**Status:** DRAFT — rails SHIPPED (`scripts/backfill/co-line-allocation.mjs`, commit `0c19459`); the LIVE run is Jake's, gated on item-8 + his/Andrew's mapping. nwrp286 firewall: this run did NOT execute the backfill against RB.

## What it does / does not do

Allocates the 72 approved, header-only Fish change orders to budget lines by authoring their missing `change_order_lines`. This moves `budget_lines.co_adjustments` / `revised_estimate` (G703 scheduled values) so Fish's lines stop showing inflated %-complete. It does **NOT** change `jobs.current_contract_amount` or G702 `net_change_orders` — those are fee-inclusive, header-driven, and already cent-exact.

**Cent-exact target (live SQL 2026-06-17):** Σ allocated `change_order_lines.amount` must equal **$799,510.34** (79,951,034¢ — the sum of the 72 COs' base `amount`, fee-EXCLUDED). NOT $897,143.39 (that's `total_with_fee`, the job rail).

## Prerequisites
1. Item-8 resolution applied (per FIRST-DRAW gate).
2. A mapping file: `{ "<co_id>": [ { "budget_line_id": "<uuid>", "amount": <cents int>, "description"?: "..." }, ... ], ... }`. For each CO, the allocation amounts must sum to that CO's base `amount` (the script aborts otherwise). A CO may split across several budget lines.
3. Env: `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (service role — the script bypasses RLS by design).
4. Decide the cost-code → budget-line mapping for the 4+2 uncoded scope rows (louvers/pergola/planters + Urns/Generator) — these need budget lines to land in.

## Steps

```bash
# 1. DRY-RUN (default — mutates NOTHING). Verify the plan + per-CO sums.
MSYS_NO_PATHCONV=1 node scripts/backfill/co-line-allocation.mjs \
  --job 92a38296-9ad0-4fce-9a84-ca19e2bcf3fb \
  --mapping ./fish-co-mapping.json

# 2. Review output: every CO shows action=insert + Σ matching its amount,
#    and NO validation errors. If ANY CO's allocations don't sum, the run
#    aborts with a cents diff and writes nothing (validate-all-then-insert).

# 3. APPLY (the firewall override flag is REQUIRED because Fish is on RB,
#    the production org — the script refuses RB without it):
MSYS_NO_PATHCONV=1 node scripts/backfill/co-line-allocation.mjs \
  --job 92a38296-9ad0-4fce-9a84-ca19e2bcf3fb \
  --mapping ./fish-co-mapping.json \
  --apply --i-understand-this-is-production
```

`--reallocate` (optional): if a CO already has non-deleted lines, the script SKIPS it by default; pass `--reallocate` to soft-delete prior lines first. (Fish's 72 COs have 0 lines today, so skip won't trigger on the first run.)

## Verification (cent-exact, after --apply)

The script prints a reconciliation table. Then confirm independently:
```sql
-- Σ co_adjustments over Fish budget lines should equal $799,510.34 = 79,951,034¢
SELECT coalesce(sum(co_adjustments),0) AS sum_co_adj,
       coalesce(sum(revised_estimate),0) AS sum_revised,
       coalesce(sum(original_estimate),0) AS sum_original
FROM budget_lines
WHERE job_id='92a38296-9ad0-4fce-9a84-ca19e2bcf3fb' AND deleted_at IS NULL;
-- Expect: sum_co_adj = 79,951,034 ; sum_revised = sum_original (701,676,717) + 79,951,034 = 781,627,751.

-- Job contract MUST be UNCHANGED (allocation-invariant):
SELECT approved_cos_total, current_contract_amount FROM jobs
WHERE id='92a38296-9ad0-4fce-9a84-ca19e2bcf3fb';
-- approved_cos_total stays 89,714,339 ($897,143.39).
```

## Notes / cautions
- **Pricing-history side effect:** inserting CO lines fires `trg_change_order_lines_pricing_history` → price-intel learns from the CO lines. This is benign/desirable, but expect new pricing-history rows.
- **The gate flip is SEPARATE and SEQUENCED AFTER this backfill.** Do NOT flip `require_co_budget_allocation` ON for RB until the backfill is done (else live CO approvals 422 mid-stream). When you DO flip it (via `/api/workflow-settings` PATCH or SQL `UPDATE org_workflow_settings SET require_co_budget_allocation=true WHERE org_id='...0001'`): the in-process settings cache has a 5-min TTL and is per-serverless-instance, so allow ~5 min (or redeploy) for all instances to pick up the flip before announcing it live. (Inherited behavior — same as the invoice-side gate.)
- **Trigger filter caveat (TD-F6-TRIGGER-RECALC-DIVERGE):** the rails + triggers count `status IN ('approved')` consistently for the 72 (all approved). If any CO is ever set `executed`, see the TD before trusting the numbers.
- RB is production. The `--i-understand-this-is-production` flag is the only thing that lets the script write to it; the guard fires on the resolved `job.org_id`, not the `--org` arg.
