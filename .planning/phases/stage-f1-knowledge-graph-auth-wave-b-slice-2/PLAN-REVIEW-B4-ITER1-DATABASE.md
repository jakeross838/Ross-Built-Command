---
reviewer: database-reviewer
plan: B-4
phase: stage-f1-knowledge-graph-auth-wave-b-slice-2
review_type: plan-review-iter-1
date: 2026-05-22
verdict: PASS
blocking_findings: 0
must_fix_findings: 1
advisory_findings: 1
---

# Plan-Review B-4 Iter-1 — Database Reviewer

## Verdict: PASS (1 MUST-FIX, 1 ADVISORY — neither blocks execute)

The migration and race-catch pattern are both correct. No blocking findings.
The MUST-FIX is a test infrastructure gap that requires documentation at execute time.

---

## Check 1 — Task 6 Migration 00108 trgm index

### Live verification results

**pg_trgm extension:**
```
extname: pg_trgm  extversion: 1.6
```
ACTIVE. Extension dependency satisfied.

**clients.full_name column:**
```
column_name: full_name   data_type: text   is_nullable: NO
```
Column exists + is `text` + is NOT NULL. Index column type correct.

**clients.deleted_at column:**
```
column_name: deleted_at   data_type: timestamp with time zone   is_nullable: YES
```
Column exists + nullable. WHERE clause `WHERE deleted_at IS NULL` is valid partial
index predicate on a nullable timestamptz column. Correct shape.

**Pre-existing index check:**
```
(0 rows)
```
`idx_clients_full_name_trgm` does NOT yet exist in the live database. Migration
00108 is required and will apply cleanly.

### Migration SQL correctness

```sql
CREATE INDEX IF NOT EXISTS idx_clients_full_name_trgm
  ON public.clients USING gin (full_name gin_trgm_ops)
  WHERE deleted_at IS NULL;
```

- `IF NOT EXISTS` — idempotent on re-apply. CORRECT.
- `USING gin (full_name gin_trgm_ops)` — correct GIN + pg_trgm operator class.
  Matches precedent at migrations 00052 + 00073.
- `WHERE deleted_at IS NULL` — correct partial index predicate. Excludes soft-deleted
  rows from the index, reducing index size and excluding deleted clients from
  trigram-powered ILIKE queries.
- Target column is `full_name` (text, NOT NULL) — GIN trigram indexes on NOT NULL
  text columns have no edge-case NULL-handling concerns.
- No schema qualifier on index name in DROP — the down migration MUST use
  `DROP INDEX IF EXISTS public.idx_clients_full_name_trgm` (schema-qualified) OR
  ensure `search_path = public` in the down migration transaction. Current plan
  §2.5 shows `DROP INDEX IF EXISTS public.idx_clients_full_name_trgm` — CORRECT.

### Inline verifications M-01..M-03 assessment

- **M-01** (`SELECT indexname FROM pg_indexes WHERE indexname = '...'`): correct
  shape; returns 1 row post-apply. CORRECT.
- **M-02** (`SELECT pg_get_indexdef(c.oid) FROM pg_class c WHERE c.relname = '...'`):
  correct — `pg_get_indexdef` returns the full CREATE INDEX statement including
  operator class + WHERE predicate. CORRECT.
- **M-03** (EXPLAIN ANALYZE on representative `/api/clients?search=` query):
  The plan queries `WHERE org_id = '<test_org>' AND full_name ILIKE '%test%' AND
  deleted_at IS NULL`. This is a leading-wildcard ILIKE — exactly the pattern that
  the btree `idx_clients_full_name_lower` cannot serve. Planner should use the
  GIN trgm index. **NOTE:** at very low row counts (dev/fixture data with <100
  clients per org) the planner may still choose a sequential scan because the index
  overhead exceeds the table scan cost. EXPLAIN ANALYZE on fixture data may not
  show GIN usage. The AC says "Bitmap Index Scan on idx_clients_full_name_trgm OR
  Bitmap Heap Scan referencing trgm" — the OR gives appropriate flexibility. At
  production row counts (500+ clients) the planner will use the index. M-03 is
  best-effort on small fixture data; the index existence (M-01 + M-02) is the
  falsifiable gate. This is ACCEPTABLE as designed.

### Sequencing

Migration 00107 is the last Slice-2 migration on disk. 00108 is the correct next
number. Convention matches: `00108_b4_clients_full_name_trgm_index.sql` and
`00108_b4_clients_full_name_trgm_index.down.sql`. No sequencing issue.

**Result: PASS — migration shape is correct + idempotent + extension dependency met +
column types confirmed live.**

---

## Check 2 — Task 5 Race-Catch Pattern Correctness

### SQLSTATE code

`insertError.code === '23505'` — CORRECT.

Live verification: PostgREST surfaces Postgres SQLSTATE directly in the `error.code`
field. This is confirmed by 6 existing uses in the codebase:
- `src/app/api/cost-codes/route.ts:48`
- `src/app/api/cost-intelligence/codes/route.ts:101`
- `src/app/api/internal-billing-types/route.ts:85`
- `src/app/api/internal-billing-types/[id]/route.ts:75`
- `src/app/api/organizations/members/invite/route.ts:67`
- `src/lib/activity-log.ts:198`

The `activity-log.ts:194` comment explicitly states: "PostgREST error.code for
unique_violation is '23505' (matches PostgreSQL standard SQLSTATE)." CONFIRMED.

### SQLSTATE check mechanism

The plan's §2.4 diff operates on the Supabase JS client's returned `insertError`
object (the `error` field from `{ data, error }` destructuring), NOT on a thrown
exception. The CONTEXT D-18 describes this as a "try/catch idiom" — that is a
conceptual mismatch in the CONTEXT doc, but the actual diff in §2.4 uses the
correct `if (insertError) { if (insertError.code === '23505') ... }` form, which
is identical to every other 23505 pattern in the codebase. The CONTEXT description
is imprecise; the plan diff is correct. No defect.

### Re-find query shape

Plan §2.4 race re-find:
```typescript
const { data: raceWinner } = await supabase
  .from("clients")
  .select("id")
  .eq("org_id", membership.org_id)
  .ilike("full_name", typedName)
  .is("deleted_at", null)
  .limit(1)
  .maybeSingle();
```

Original find branch (route.ts lines 54-61):
```typescript
const { data: existingClient } = await supabase
  .from("clients")
  .select("id")
  .eq("org_id", membership.org_id)
  .ilike("full_name", typedName)
  .is("deleted_at", null)
  .limit(1)
  .maybeSingle();
```

Shapes match exactly: same table, same `.select("id")`, same `org_id` scoping, same
`ilike` + `typedName` variable, same `deleted_at IS NULL` guard, same `limit(1)` +
`maybeSingle()`. The race re-find is a correct duplicate of the original find branch.

`typedName` is defined at route.ts line 51 as `body.client_name_for_create?.trim()`,
so both the find branch and the re-find branch operate on the same trimmed string.
CORRECT.

### Return type

`if (raceWinner) return raceWinner.id as string;`

The original find branch returns `existingClient.id as string` (line 63).
The create path returns `newClient.id as string` (line 97).
The race re-find returns `raceWinner.id as string` — same return type. CORRECT.

### Defensive fallback

`throw new ApiError(...)` after the 23505 branch handles the case where:
1. insertError.code IS 23505 but re-find returns null (index predicate mismatch,
   deleted record edge case, or concurrent delete-then-insert race).
2. insertError.code is anything other than 23505 (other DB errors).

Both cases correctly fall through to the existing throw. The defensive posture is
sound. CORRECT.

**Result: PASS — 23505 SQLSTATE is correct, re-find query shape matches original
find branch, return type is consistent, defensive fallback is correct.**

---

## Check 3 — Slice-2 Cumulative Migration Sequencing

Slice-2 migrations on disk:
```
00104_b2a_token_issuance_security_model.sql
00105_b2a_acl_hardening.sql
00106_b2b_activity_log_ack_dedupe.sql
00107_b3_soft_delete_audit_trigger_def_wc_1.sql
(00108 does not yet exist)
```

00108 is the correct next sequence number. Filename convention
`00108_b4_clients_full_name_trgm_index.sql` + `.down.sql` matches the
`NNNNN_<plan-prefix>_<description>.sql` pattern used throughout Slice-2. CORRECT.

**Result: PASS — migration sequencing and filename convention are correct.**

---

## Check 4 — Task 5 Integration Test Infrastructure (MUST-FIX)

### Finding: no `__tests__/api/` subdirectory

The test suite layout is FLAT — all API integration tests live directly under
`__tests__/` with filename prefix (`api-cost-codes.test.ts`, `api-proposals-commit.test.ts`,
etc.). There is no `__tests__/api/` subdirectory.

The plan's Task 4 and Task 5 declare `__tests__/api/jobs.test.ts` as the target file.
This path does NOT exist, and no existing jobs-specific API test file was found.

Verified:
```
__tests__/api-cost-code-suggestions.test.ts  (exists — flat naming)
__tests__/api-proposals-commit.test.ts       (exists — flat naming)
__tests__/api/jobs.test.ts                   (DOES NOT EXIST)
```

### Impact

AC-B4-04 (cross-tenant PATCH probe) and AC-B4-05 (race-catch concurrency test) both
reference `__tests__/api/jobs.test.ts`. If the executor creates `__tests__/api/jobs.test.ts`
in a new subdirectory, the test runner may or may not discover it depending on Jest
config glob patterns.

### MUST-FIX action required at execute time

Executor MUST do ONE of:
1. Create `__tests__/api-jobs.test.ts` (flat naming, matches existing convention).
2. Create `__tests__/api/jobs.test.ts` AND verify Jest config (`jest.config.*`) glob
   pattern covers `__tests__/api/**` before committing.
3. Defer the integration test stub to Wave 1.1-Lite test infrastructure pass — but if
   deferring, the SUMMARY must explicitly document the deferral with rationale per
   AC-B4-04/AC-B4-05 falsifiability requirements, and the code-review evidence for
   the `.eq("org_id")` addition is still valid as the AC basis.

**This is a MUST-FIX at execute time, not a plan blocker.** The plan's code changes
are correct; the test path is a naming convention issue to resolve before committing.

---

## Check 5 — Tasks 8+10 Unit Test Infrastructure

Validator test files confirmed:
```
__tests__/validators/wi-001.test.ts             (EXISTS)
__tests__/validators/wi-013.test.ts             (EXISTS)
__tests__/validators/client-pii-not-embedded.test.ts  (EXISTS)
```

All three files exist per the B-1b QA report's assertion. Tasks 8 and 10 extend
these files with additional test cases. No infrastructure gap.

**Result: PASS — validator test infrastructure is present.**

---

## Advisory Finding

**ADVISORY-1 — CONTEXT D-18 describes race-catch as try/catch idiom; plan §2.4 diff
correctly uses returned-error pattern.**

The CONTEXT.md D-18 says: "wrap the existing INSERT-then-throw block with
`try { insert } catch (e: any) { if (e.code === '23505') ... }`." The Supabase JS
client does NOT throw on error — it returns `{ data, error }`. The plan's §2.4 diff
correctly uses `if (insertError) { if (insertError.code === '23505') ... }` which is
the right approach. The CONTEXT wording is an imprecise conceptual description.

No fix needed in the plan — the plan diff is authoritative and correct. The CONTEXT
is not executed, only referenced. Flag as informational only so the executor does
not get confused by the D-18 wording and introduce an incorrect try/catch wrapper.

---

## Summary

| Check | Result |
|-------|--------|
| 1 — Migration 00108 trgm index | PASS |
| 2 — Task 5 race-catch SQLSTATE + query shape | PASS |
| 3 — Slice-2 migration sequencing | PASS |
| 4 — Task 5 integration test infrastructure | MUST-FIX at execute (non-blocking) |
| 5 — Tasks 8+10 unit test infrastructure | PASS |

**Overall: PASS with 1 MUST-FIX + 1 ADVISORY. No blocking findings. Execute can proceed
after iter-1 synthesis.**
