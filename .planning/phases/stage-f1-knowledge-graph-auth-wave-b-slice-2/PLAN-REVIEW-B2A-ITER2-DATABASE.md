# PLAN-REVIEW-B2A-ITER2-DATABASE
Reviewer: database
Plan: B-2a-PLAN.md (commit 4780007, 2559 lines)
Date: 2026-05-21

---

## Verdict: PASS

All 2 iter-1 BLOCKERs are CLOSED. All 3 iter-1 WARNINGs are CLOSED. All additional database mechanics checks PASS. No new regressions found.

---

## Per-Finding Verification Table

| Finding | Claimed Fix Location | Verified? | Notes |
|---|---|---|---|
| BLOCKING-DB-01: §4 B-9 resolution table wrong predicate | Line 302 | CLOSED | §4 table row B-9 states "Option A predicate: `WHERE client_id IS NOT NULL` + `revoked_seq` in tuple (matches actual migration body at §5:1089-1091)". Migration body at line 1207-1209 reads `CREATE UNIQUE INDEX client_portal_access_org_client_job_seq_unique ON public.client_portal_access (org_id, client_id, job_id, revoked_seq) WHERE client_id IS NOT NULL;` — exact match to §4 predicate description. |
| BLOCKING-DB-02: Rule 2 PostgREST FK citations inferred not verified | Lines 2078-2088 (AC-B2a-02) | CLOSED | §9 AC-B2a-02 block contains a `pg_constraint` query (`SELECT conname, conrelid::regclass, confrelid::regclass, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid IN ('public.client_portal_access'::regclass, 'public.draws'::regclass) AND contype = 'f'`) with explicit expected constraint names: `client_portal_access_client_id_fkey`, `client_portal_access_job_id_fkey`, `client_portal_access_org_id_client_id_fkey`, `draws_job_id_fkey`. A second targeted query at lines 2091-2096 confirms the composite and single-col FK names specifically. Rule 2 satisfied. |
| WARNING BLK-5: AC-B2a-08 re-invitation semantics | Line 2029 | CLOSED | AC-B2a-08 contains explicit paragraph: "Re-invitation semantics under Option A: admin must revoke expired tokens before re-inviting (because `(org_id, client_id, job_id, revoked_seq)` partial unique excludes only `client_id IS NOT NULL` rows, NOT expired-but-not-revoked ones — re-invitation against an expired-not-revoked row will collide unless admin revokes first, bumping `revoked_seq` and clearing the slot). Per BLK-5 iter-1 SYNTHESIS clarification." Semantics explicitly captured. |
| WARNING BLK-3: down-migration DROP+recreate restoring 00074:307 partial form | Lines 1685-1689 | CLOSED | Down-migration reverse block at lines 1685-1689 reads: `DROP INDEX IF EXISTS public.idx_client_portal_access_token_hash; CREATE UNIQUE INDEX idx_client_portal_access_token_hash ON public.client_portal_access (access_token_hash) WHERE revoked_at IS NULL;` — restores the partial form from 00074:188-190 exactly. Parity confirmed. |
| WARNING N-3: `draws.job_id` prose imprecision | Lines 214, 304, 1088, 1093-1097 | CLOSED | Line 214 summary item: "no unfiltered single-column index on `draws.job_id` exists (the two existing partial composites — `idx_draws_job_number`, `idx_draws_job_status` — are partial-on-`deleted_at` and cannot serve B-2a helper queries that don't filter `deleted_at IS NULL`)". Line 304 §4 table row B-11 same. Lines 1088 and 1093-1097 migration DDL + comment repeat the acknowledgment verbatim. Prose correctly acknowledges existing partial composites throughout. |

---

## Additional Database Mechanics Checks

### BLK-3 timing-oracle: non-partial index DDL correctness

Lines 1221-1223:
```sql
DROP INDEX IF EXISTS public.idx_client_portal_access_token_hash;
CREATE UNIQUE INDEX idx_client_portal_access_token_hash
  ON public.client_portal_access (access_token_hash);
```
No `WHERE` clause present. DDL is mechanically correct for a non-partial unique index. PASS.

### BLK-4 REVOKE/GRANT signature matching

Three function pairs checked:

1. `create_client_portal_invite` — CREATE OR REPLACE at lines 1236-1238 declares `(p_org_id UUID, p_job_id UUID, p_email TEXT, p_name TEXT, p_visibility_config JSONB, p_expires_at TIMESTAMPTZ)`. REVOKE/GRANT at lines 1292-1293 cite `(UUID, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ)`. 6-argument type list matches positionally. PASS.

2. `submit_client_portal_message` — CREATE OR REPLACE at lines 1299-1301 declares `(p_token TEXT, p_message TEXT)`. REVOKE/GRANT at lines 1350-1351 cite `(TEXT, TEXT)`. Match. PASS.

3. `mark_client_portal_message_read` — CREATE OR REPLACE at line 1358-1360 declares `(p_token TEXT, p_message_id UUID)`. REVOKE/GRANT at lines 1406-1407 cite `(TEXT, UUID)`. Match. PASS.

All three REVOKE/GRANT argument lists match the corresponding CREATE OR REPLACE signatures exactly. Postgres function identity disambiguation is satisfied.

### AC-B2a-14 verification query correctness

AC-B2a-14 (line 2043) states: "`indexdef` does NOT contain a `WHERE` clause; EXPLAIN ANALYZE confirms index scan on token-resolution query without `revoked_at IS NULL` predicate." The AC verifies against `pg_indexes.indexdef` for the presence/absence of a WHERE clause — correct approach for confirming non-partial status. The EXPLAIN ANALYZE sub-check verifies the index is actually used on the hot-path query shape (`resolveOwnerToken` queries by `access_token_hash` only). Both prongs of the AC are mechanically sound. PASS.

The verification query form to confirm post-migration state would be:
```sql
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'client_portal_access'
  AND indexname = 'idx_client_portal_access_token_hash';
```
Expected: `indexdef` contains no `WHERE` clause. This is the correct check and is consistent with how AC-B2a-12 uses `pg_indexes` for the `draws.job_id` verification. PASS.

### Composite UNIQUE on `clients(org_id, id)` — iter-1 PASS unchanged

Not re-litigated; iter-1 confirmed this is a prerequisite for the composite FK. Still referenced correctly in §4 B-2 row and §5 Task 1 sub-step a/b. PASS.

---

## Newly Surfaced Findings

None. No new database mechanic regressions identified during iter-2 review.

---

## Summary

All five iter-1 findings (2 BLOCKING, 3 WARNING) are fully resolved in the plan text. BLOCKING-DB-01 is closed: the §4 B-9 resolution row now precisely matches the Option A predicate (`WHERE client_id IS NOT NULL` + `revoked_seq` in tuple) that the migration body implements at lines 1207-1209. BLOCKING-DB-02 is closed: §9 AC-B2a-02 contains a live `pg_constraint` query with explicit expected FK constraint names satisfying Workflow Rule 2. The three WARNINGs are closed: AC-B2a-08 carries the re-invitation semantics paragraph (BLK-5), the down-migration restores the 00074 partial form verbatim (BLK-3), and N-3 prose imprecision is corrected at all four cited locations. All additional mechanics checks — non-partial index DDL correctness, all three REVOKE/GRANT signature matches, and AC-B2a-14 verification query soundness — are mechanically correct. Verdict: PASS.
