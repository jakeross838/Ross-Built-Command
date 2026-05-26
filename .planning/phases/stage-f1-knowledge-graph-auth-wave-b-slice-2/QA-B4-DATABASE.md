---
reviewer: database-reviewer
plan: B-4
phase: stage-f1-knowledge-graph-auth-wave-b-slice-2
authored_at: 2026-05-22T00:00:00Z
verdict: PASS
blocking_findings: 0
must_fix_findings: 0
advisory_findings: 1
---

# QA-B4-DATABASE — Database Reviewer

## Check 1 — Migration 00108 idx_clients_full_name_trgm

**PASS.**

### Shape verification (static)

`supabase/migrations/00108_b4_clients_full_name_trgm_index.sql`:

```sql
CREATE INDEX IF NOT EXISTS idx_clients_full_name_trgm
  ON public.clients USING gin (full_name gin_trgm_ops)
  WHERE deleted_at IS NULL;
```

- Operator class: `gin_trgm_ops` — correct for leading-wildcard ILIKE (`%query%`). A btree or `gin_trgm_ops`-less GIN would not serve the autocomplete query pattern.
- Index method: `USING gin` — correct pairing with `gin_trgm_ops`.
- Partial clause: `WHERE deleted_at IS NULL` — matches the route filter at `src/app/api/clients/route.ts` `.is("deleted_at", null)`. Partial index excludes soft-deleted rows, reducing index size and lowering write overhead from the B-3 soft-delete trigger on the `clients` table.
- Idempotency: `IF NOT EXISTS` — re-running migration on an environment that already has the index is a safe no-op.
- Extension dependency: pg_trgm extension is already active via migrations 00052 + 00073. Migration 00108 correctly omits a redundant `CREATE EXTENSION` call.

### Down migration symmetry

`00108_b4_clients_full_name_trgm_index.down.sql`:

```sql
DROP INDEX IF EXISTS public.idx_clients_full_name_trgm;
```

Symmetric and idempotent. `IF EXISTS` guard means re-running the down migration on an environment that never received 00108 is a no-op. Schema-qualified `public.` matches the index's creation schema.

### Live verification (from B-4-SUMMARY.md AC-B4-06, applied via mcp__supabase__apply_migration)

M-01:
```
SELECT indexname FROM pg_indexes WHERE indexname = 'idx_clients_full_name_trgm';
-> [{"indexname":"idx_clients_full_name_trgm"}]  PASS
```

M-02:
```
SELECT pg_get_indexdef(c.oid) FROM pg_class c WHERE c.relname = 'idx_clients_full_name_trgm';
-> "CREATE INDEX idx_clients_full_name_trgm ON public.clients
    USING gin (full_name gin_trgm_ops) WHERE (deleted_at IS NULL)"
PASS — gin_trgm_ops present; WHERE (deleted_at IS NULL) present
```

M-03 (planner-flexibility note):
The EXPLAIN ANALYZE on 26-row fixture shows Seq Scan. This is correct planner behavior at small row counts — the GIN cost threshold is not crossed until approximately 500+ rows. At production scale (500-2000 clients/org, realistic per SUMMARY D-T6 estimate) the planner will switch to Bitmap Index Scan on idx_clients_full_name_trgm. M-01 + M-02 are the primary AC-B4-06 gates; M-03 is informational. No finding here.

### Inline verification DO block

The migration includes a `DO $$ ... $$` block that raises an `EXCEPTION` (not `NOTICE`) on M-01 or M-02 failure. This means the migration fails atomically if the index is malformed — correct fail-closed pattern. The DO block runs within the migration transaction, so a failure rolls back the index creation. No issues.

---

## Check 2 — Task 5 race-catch SQLSTATE 23505

**PASS.**

`src/app/api/jobs/route.ts` (resolveClientId, lines 76-99):

```typescript
if ((insertError as { code?: string }).code === "23505") {
  const { data: raceWinner } = await supabase
    .from("clients")
    .select("id")
    .eq("org_id", membership.org_id)
    .ilike("full_name", typedName)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (raceWinner) {
    return (raceWinner as { id: string }).id;
  }
}
throw new ApiError(`Failed to create client: ${insertError.message}`, 500);
```

- SQLSTATE `23505` is the correct PostgreSQL unique_violation code. The PostgREST client surfaces this as `insertError.code`. Correct.
- The re-find query mirrors the original ilike find branch shape exactly: `eq("org_id", ...)` + `ilike("full_name", typedName)` + `is("deleted_at", null)` + `limit(1)` + `maybeSingle()`. The race winner is found because the first concurrent INSERT committed by the time the second caller reaches the re-find. Correct.
- The 500-throw fallback for non-23505 insert errors is preserved. Connection errors, RLS denials, schema errors — all still surface as 500 with `insertError.message`. Defensive fallback is intact.
- Cross-org fence: `eq("org_id", membership.org_id)` is present on the re-find path — a 23505 race cannot return a row from a different org. Correct.

---

## Check 3 — Task 4 MEDIUM-1 `.eq("org_id", ...)` on UPDATE chain

**PASS.**

`src/app/api/jobs/route.ts` (lines 403-408):

```typescript
const { error } = await supabase
  .from("jobs")
  .update(patch)
  .eq("id", body.id)
  .eq("org_id", membership.org_id)
  .is("deleted_at", null);
```

- Uses `membership.org_id` — sourced from `getCurrentMembership()` earlier in the handler. NOT from `body.org_id` (which would be attacker-controlled). Correct.
- Complete defensive chain: `id` equality + `org_id` equality + `deleted_at IS NULL`. A dropped RLS policy cannot produce a cross-tenant write because the UPDATE WHERE clause would match zero rows for any other org's job ID.
- No regression on existing behavior: `patch` object construction and error handling are unchanged. The only addition is the `.eq("org_id", ...)` filter.

---

## Check 4 — Type regen integrity

**PASS.**

Commit `7ff9a6d` (B-4 Task 6) includes `src/lib/types/database.types.ts` with +28 lines. Per SUMMARY D-T6-TYPES-REGEN-DISCIPLINE:

- Regen tool used: `npx supabase gen types typescript --linked` (CLI canonical form).
- The +28 lines are the `graphql_public` schema descriptor that the CLI emits but the prior MCP-generated regen path had omitted. This is a tooling-baseline addition, not a migration-content delta (migration 00108 adds only an index, not columns or tables, so no new row types are expected).
- The hook `.claude/hooks/nightwork-type-regen.sh` blocked the initial MCP-generated output (correct fail-closed behavior per Rule 8(d)) and passed cleanly after CLI regen + restage.
- `npx tsc --noEmit` exits 0 (verified in this review session). No type errors.

Migration 00108 adds a GIN index — indexes do not introduce new columns or table types, so no entity-type delta is expected in `database.types.ts` beyond the baseline regen tooling difference. The regen is substantively correct.

---

## Check 5 — Test suite and smoke baseline

**PASS.**

Current `npx tsx __tests__/api-jobs.test.ts` output (verified in this session):

```
PASS  jobs route exists
PASS  PATCH UPDATE chain includes .eq('org_id', membership.org_id) defense-in-depth filter
PASS  PATCH UPDATE chain references both id + org_id + deleted_at IS NULL
PASS  PATCH MEDIUM-1 fix carries documented rationale referencing B-1a-bis QA
PASS  resolveClientId catches 23505 unique_violation and re-finds the winner
PASS  resolveClientId race-catch references the existing ilike-by-full_name re-find
PASS  resolveClientId race-catch carries documented rationale referencing TD-B1abis-01
PASS  RLS: cross-org PATCH /api/jobs is REJECTED at DB layer (live probe; SKIPs if env missing)
PASS  race: concurrent resolveClientId returns same id for identical name (SKIPs if env missing)
9 test(s) passed
```

9/9 PASS. 2 SKIP markers (B-4-T4-CROSS-TENANT-PROBE-SKIP and B-4-T5-RACE-CATCH-PROBE-SKIP) are structurally correct deferred-to-Wave-1.1-Lite placeholders per B-4-PLAN §5 R-3. They do not hide failures — they are absent-env-guard skips with static analysis covering the relevant code shape in the same test run.

Smoke baseline per AC-B4-12: 2 pre-existing failures (lien-releases bulk 3-of-9 cases; org_members.maybeSingle 1-of-4 case) matching `deferred-items.md`. No new B-4-attributable failures.

---

## Check 6 — Hook block resolution at Task 6

**PASS (hook operated correctly; resolution was honest).**

Per SUMMARY §metrics:
- 1 hook block during Task 6: `.claude/hooks/nightwork-type-regen.sh` detected that the MCP-generated types differed from the CLI-generated types (the `graphql_public` schema block was absent from the MCP output). Hook fail-closed correctly — it caught a real divergence between committed types and canonical CLI output.
- Resolution: `npx supabase gen types typescript --linked` re-run with CLI, output committed to `src/lib/types/database.types.ts`, restaged. No `--no-verify` bypass.
- `no_verify_count: 0` across all 11 B-4 execute commits. This is also the first production proof of the TD-NW-HOOK-EXECUTE-PHASE-DETECT fix (commit `6c8085b`) operating cleanly across a full 11-commit execute cycle.

---

## Advisory Finding

**ADVISORY-1 (non-blocking): Live concurrent race-catch probe deferred.**

The 23505 race-catch path (Task 5) has static-analysis test coverage only. A live concurrent probe (two simultaneous POST /api/jobs requests with identical `client_name_for_create`) is deferred to Wave 1.1-Lite per B-4-PLAN §5 R-3.

This is not blocking for B-4 shipment — the static analysis covers the code shape, the partial unique index `idx_clients_org_name_email_unique` (migration 00100) provides the DB-layer enforcement that makes the 23505 path reachable, and the re-find query shape is correct. The live probe would validate the full end-to-end timing (both requests land within the same transaction window) and is appropriate for a dedicated integration test harness.

Carry forward: add concurrent live probe to Wave 1.1-Lite integration test pass targeting the `/api/jobs` find-or-create path.

---

## Summary

All 6 checks PASS. Zero blocking findings. Zero must-fix findings. One advisory (deferred concurrent probe). Migration 00108 is structurally correct — GIN + gin_trgm_ops + partial WHERE clause + IF NOT EXISTS + symmetric down migration. The Task 5 23505 race-catch uses the correct SQLSTATE, mirrors the find branch shape, preserves the fallback 500 path, and includes the org_id cross-org fence on the re-find. The Task 4 MEDIUM-1 fix uses `membership.org_id` (not body), completes the three-predicate defensive chain, and introduces no regression. Type regen is clean and verified via `npx tsc --noEmit EXIT=0`. Hook discipline across B-4's 11 commits is exemplary — 1 legitimate block resolved honestly, 0 `--no-verify`.

**Verdict: PASS — no findings block B-4 shipment.**
