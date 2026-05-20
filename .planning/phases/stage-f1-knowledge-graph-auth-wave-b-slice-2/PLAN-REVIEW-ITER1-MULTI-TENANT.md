# Multi-tenant architect plan-review iter-1 — B-2

**Reviewer:** nightwork-multi-tenant-architect
**Date:** 2026-05-20
**Verdict:** **REVISE** (3 CRITICAL + 6 WARNING + 4 INFO)

Disk-evidence captured retroactively by orchestrator (agent lacked Write tool; returned inline only). Full findings recorded inline in conversation transcript; consolidated into `PLAN-REVIEW-ITER1-SYNTHESIS.md`.

## Verdict

REVISE — design relies on developer convention to apply `.eq('client_id', ...)` filters uniformly, which violates the "tenant-safe BY CONSTRUCTION" bar.

## 8-pillar audit summary

| Pillar | Verdict |
|---|---|
| Tenant key on every row | PASS |
| Tenant filter on every query | PASS-with-condition (C-1 below) |
| No cross-tenant JOIN | PASS (C-2 below — FK same-org invariant) |
| Per-tenant caches | PASS |
| Per-tenant files | N/A (document downloads deferred) |
| Per-tenant cron | N/A |
| Per-tenant integrations | PASS |
| Org deletion cascade | PARTIAL-CONCERN (W-3) |

## CRITICAL findings

**C-1 — `client_id` scoping enforced by convention, not construction.** PLAN §4.a Layer 3 documents "API contract" of scoping but provides no helper that returns a pre-scoped Supabase wrapper bound to `(org_id, client_id, job_id)`. Recommend: introduce `getScopedOwnerPortalClient(resolvedToken)` in `src/lib/owner-portal/token.ts` that wraps service-role client with automatic `.eq()` injection on every `.from(table)` call. Currently the "wall" is developer discipline — violates BY-CONSTRUCTION bar.

**C-2 — FK `client_portal_access.client_id → clients(id)` lacks same-org invariant.** No CHECK constraint that `clients.org_id = client_portal_access.org_id`. A future hand-picked INSERT/UPDATE with cross-org client_id would not be rejected at FK level. **Recommendation:** composite FK `(org_id, client_id) REFERENCES clients(org_id, id)` — requires composite UNIQUE on `clients(org_id, id)` first. OR defer as TD-B2-02 with interim CHECK trigger.

**C-3 — `acknowledge-pay-app` step 3 SQL not pinned.** PLAN Task 4 step 3 says "Confirm `draw_id` belongs to token's scope" but doesn't specify the SQL. The correct check must be: `EXISTS(SELECT 1 FROM draws d JOIN jobs j ON j.id = d.job_id WHERE d.id = $drawId AND d.org_id = $tokenOrgId AND j.client_id = $tokenClientId)`. If only `.eq('id', drawId).eq('org_id', orgId)` is implemented (org-scoping but NOT client-scoping), intra-org cross-client leak. **CRITICAL: pin the SQL OR provide `assertDrawBelongsToToken(drawId, resolvedToken)` helper.**

## WARNING findings

- W-1: No invariant maintained between `client_portal_access.client_id` and `jobs.client_id` (token drift if jobs.client_id changes)
- W-2: Partial unique index predicate adapted from `deleted_at IS NULL` (EXPANDED-SCOPE) to `revoked_at IS NULL` (correct for 00074 schema) but divergence deserves explicit acknowledgment in PLAN
- W-3: Token rotation flow not designed (atomic swap requirement)
- W-4: `actor_token_id` FK SET NULL semantics on audit trail — recommend snapshotting `details: { portal_access_email, portal_access_client_id }` to preserve WHO context after token hard-delete
- W-5: Anon RLS on activity_log not explicitly verified (00026:97-105 RESTRICTIVE policy)
- W-6: In-process rate-limit Map per-Vercel-function-instance (security duplicate)

## Verdict reasoning

PLAN's overall architecture (token-as-scope, service-role API, no anon RLS) is sound. But three CRITICAL findings require resolution before /nx: C-1 (helper construction), C-2 (composite FK or CHECK trigger), C-3 (pinned SQL for acknowledge scoping). Re-review delta estimated ~$3-5.
