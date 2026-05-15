# Plan-review iter-1 - data-migration-safety review

**Reviewer:** nightwork-data-migration-safety
**Date:** 2026-05-15
**Scope:** Wave-B-Slice-1 - migrations 00099 (B-D080), 00100 (B-1a), 00101 (B-1a-bis)
**B-1b:** out of scope (source-only; no migration files)
**Verdict overall:** PASS with WARNINGS (no BLOCKING findings)

---

## Migration 00099 - B-D080 (user-identity FK convention)

Operation: ADD 11 FK CONSTRAINTS (10 to auth.users; 1 to profiles); ON DELETE NO ACTION on every constraint; pre-flight orphan-probe DO-block inside transaction; NOTIFY pgrst.

### 8-step audit

| Step | Verdict | Notes |
|---|---|---|
| 1. Backwards compatibility | PASS | Pure DDL add-constraint. No column add, no type change. Existing INSERTs succeed iff the UUID resolves in target table. Orphan probe plan-author-time returned 0 across all 11 columns. |
| 2. Dry-run plan | PASS | Forward orphan probe documented at PLAN.md and executed at plan-author time. Identical DO-block runs INSIDE the migration transaction; ROLLBACK on RAISE EXCEPTION. ADD CONSTRAINT takes SHARE ROW EXCLUSIVE + validates rows; at current scale sub-millisecond. |
| 3. Rollback plan | PASS | 00099.down.sql ships 11 DROP CONSTRAINT IF EXISTS + NOTIFY pgrst. Reversible structurally; data is never touched. |
| 4. Data preservation | PASS | No UPDATE, DELETE, DROP COLUMN, or TRUNCATE. Pure constraint add. |
| 5. RLS posture | N/A | No new tables. Existing RLS on 10 covered tables unchanged. |
| 6. Trigger / cache integrity | N/A | No triggers added/affected. jobs.approved_cos_total cache unaffected. |
| 7. Drummond fixture impact | PASS | Drummond + fixture-harness-org probe results: 0 orphans. Pre-flight DO-block inside transaction re-verifies at execute time. |
| 8. Audit log coverage | PASS | NO ACTION posture on all 11 FKs explicitly preserves audit-trail durability (CC7.2). Hard-delete of an auth.users row will raise FK violation instead of silently orphaning. |

### Findings 00099
- WARNING-1: Down migration uses DROP CONSTRAINT IF EXISTS (correct posture, mirrors 00098.down). Acceptable; flag for awareness.
- INFO: jobs.pm_id to profiles_fkey carries a Wave 1.1-Lite refactor opportunity; documented but NOT executed - correct per Q6.

Verdict 00099: PASS.

---

## Migration 00100 - B-1a (clients schema foundation + backfill, NO DROP)

Operation: CREATE TABLE clients (V.1 envelope + status_history JSONB); ENABLE RLS + 3 policies (R.23 shape); 2 indexes (partial on deleted_at IS NULL); BEFORE UPDATE trigger; ADD COLUMN jobs.client_id (nullable, FK ON DELETE SET NULL); BACKFILL jobs.client_id from embedded jobs.client_name via DISTINCT clients-row creation; forward orphan probe DO-block inside transaction; seed 1 fixture client row; NOTIFY pgrst.

### 8-step audit

| Step | Verdict | Notes |
|---|---|---|
| 1. Backwards compatibility | PASS | jobs.client_id is nullable with ON DELETE SET NULL. Old code that reads jobs.client_name continues to work - embedded columns LEFT IN PLACE (Path A). Old INSERTs to jobs that do not supply client_id succeed (column nullable). Dual-source state during B-1a to B-1a-bis window is the explicit transitional design. |
| 2. Dry-run plan | PASS | Pre-flight probes (a-d) documented in PLAN; executor runs at execute time via mcp__supabase__execute_sql BEFORE migration apply. Probe (c) HALT path documented. Forward probe inside transaction RAISEs on backfill incompleteness; ROLLBACK on failure. Single atomic BEGIN..COMMIT. |
| 3. Rollback plan | PASS | 00100.down.sql is simple post-Path-A: DROP COLUMN jobs.client_id + DROP TABLE clients CASCADE + NOTIFY pgrst. Backfilled clients rows ARE LOST on down but source-of-truth data lives on in embedded jobs.client_* (up migration did not touch them). Header documents correctly. |
| 4. Data preservation | PASS | No DELETE / TRUNCATE / DROP COLUMN in 00100. Backfill is INSERT INTO clients + UPDATE jobs.client_id only. Embedded jobs.client_* columns explicitly preserved per Path A. |
| 5. RLS posture | PASS | ENABLE ROW LEVEL SECURITY + 3 policies day-1 per Q10b ORG-scoped direct-filter rule. R.23 3-policy shape mirrors 00065_proposals.sql verbatim. Platform-admin OR-clause on SELECT. Role-gated INSERT/UPDATE (owner/admin/pm/accounting). No DELETE policy means hard-delete is RLS-blocked. |
| 6. Trigger / cache integrity | PASS | trg_clients_updated_at reuses existing update_updated_at() function (defined in 00001 in default public schema; sketch qualifier resolves correctly). No computed caches added. jobs.approved_cos_total unaffected. |
| 7. Drummond fixture impact | PASS | Pre-flight DO-block asserts fixture-harness-org has exactly 10 jobs (Wave-E baseline) before any DDL fires. Backfill creates 10 clients rows from the 10 fixture Smoke-Client-A..J names. Fixture client seed uses obviously-synthetic name Harness Fixture Client Alpha at UUID 00000000-0000-0000-0003-000000000001 (Q7 nwrp153). UUID-namespace collision check passes. |
| 8. Audit log coverage | PARTIAL | status_history JSONB NOT NULL DEFAULT [] present per Q12. activity_log.entity_type does NOT yet include client (deferred to Slice-2 B-4). Acceptable in slice - no UI mutation paths ship. |

### Findings 00100
- WARNING-2: Down migration header correctly documents that if B-1a-bis has shipped, B-1a-bis down MUST be applied first. Coordination concern, not a defect. ACCEPT.
- WARNING-3: activity_log.entity_type enum extension for client deferred to Slice-2 B-4. If any /api/clients mutation lands before B-4, audit will silently no-op.
- WARNING-4 (mechanical, low severity): Backfill uses FIRST_VALUE() OVER w window with PARTITION BY (org_id, name_key, email_key) ORDER BY created_at + DISTINCT on top. Confirmed Postgres-valid pattern; flag for executor review during apply.
- INFO: clients.created_by FK to auth.users with ON DELETE NO ACTION inherits D-080 convention from creation - correct sequencing per Path A.
- INFO: V.2 export schema sketched in migration comment per EXPANDED-SCOPE cross-cutting requirement.

Verdict 00100: PASS.

---

## Migration 00101 - B-1a-bis (DROP jobs.client_name/email/phone + consumer refactor)

Operation: Reverse-probe DO-block (no jobs with client_id NULL + any client_* non-NULL); DROP COLUMN jobs.client_name / client_email / client_phone (3 DROPs); NOTIFY pgrst. Single atomic BEGIN..COMMIT.

### 8-step audit

| Step | Verdict | Notes |
|---|---|---|
| 1. Backwards compatibility | PASS | DROP COLUMN is BREAKING - old code that reads jobs.client_* fails. B-1a-bis explicitly refactors 19 consumer files (16 src + 3 scripts) BEFORE the DROP migration applies. Refactor lands as code commits FIRST; smoke gate verifies 11/13 PASS; THEN DROP migration applies. Sequence honors the code-first deprecation rule. Forward grep returns 0 hits in active code paths. |
| 2. Dry-run plan | PASS | Forward grep verification documented in migration comment header verbatim. Reverse DB probe inside transaction RAISEs on asymmetric data; ROLLBACK on failure. Single atomic transaction. |
| 3. Rollback plan | PARTIAL (WARNING-5) | 00101.down.sql re-adds 3 columns as nullable TEXT. Data is NOT restored - explicit data-loss-on-rollback contract documented in header. clients.full_name can be reverse-backfilled to client_name via JOIN (commented-out UPDATE in down migration; operator decision); email/phone are NOT recoverable for jobs created during refactor window. ACCEPTABLE under data destruction with explicit acknowledgment rule. |
| 4. Data preservation | PASS-with-mitigation | DROP COLUMN destroys jobs.client_name/email/phone values, BUT: (a) reverse probe guarantees no asymmetric data; (b) clients.full_name equals jobs.client_name (1:1 backfilled); (c) email/phone preserved in clients.email/clients.phone where backfill found them; (d) PII fence grep gate prevents accidental embed leak. Data-destruction-without-backup hard-rule is satisfied because data IS preserved in clients table (backfilled in 00100). DROP is destruction-of-redundancy, not destruction-of-only-copy. |
| 5. RLS posture | PASS | No table modifications affect RLS. jobs RLS unchanged. Refactored PostgREST embeds (client:clients(id, name)) cross RLS boundary correctly - clients RLS (from 00100) filters by org_id; jobs RLS filters by org_id; both must pass for embed to resolve. |
| 6. Trigger / cache integrity | PASS | No triggers affected. jobs.approved_cos_total cache unaffected (not derived from client_*). |
| 7. Drummond fixture impact | PASS | smoke-seed.sql refactored: inserts 10 fixture clients rows FIRST, then INSERTs 10 fixture jobs with client_id (no client_name). Reverse probe inside transaction returns 0 for fixture-harness-org. Smoke gate 11/13 PASS minimum (TD-WE-03 baseline) verifies post-refactor + post-DROP rendering integrity. AC-B1a-bis-10 enforces. |
| 8. Audit log coverage | PASS | No new audit-relevant entity. Activity log writes already routed through logActivity for existing entities; refactor preserves call sites. PII fence prevents email/phone leakage to activity_log details. |

### Findings 00101
- WARNING-5: Down migration data-loss path is explicit and acknowledged. Hard-rule data-destroying migration without backup is NOT triggered because data IS preserved in clients table (backfilled before DROP). ACCEPTABLE.
- WARNING-6: TD-B1abis-01 removes mailto link in job-sidebar.tsx (loss of client-email surface). Deferred to F3 magic-link work. Documented as tech debt with restoration plan. ACCEPT.
- INFO: Reverse-probe relocation from B-1a to B-1a-bis (per Q2 nwrp153 amendment + nwrp154 Path A) is correctly executed - probe fires where DROP actually fires.
- INFO: Atomic-transaction discipline confirmed - reverse probe + 3 DROP COLUMN + NOTIFY pgrst wrapped in single BEGIN..COMMIT. Forward grep (code-level) runs OUTSIDE the transaction as a pre-migration executor step (documented in migration header verbatim).

Verdict 00101: PASS.

---

## Cross-plan concerns

### CP-1: Migration sequencing is correct
- 00099 (B-D080) then 00100 (B-1a) then 00101 (B-1a-bis). Strict sequential execute per nwrp154 Path A.
- B-1b (source-only, no migration) executes AFTER 00101 so supabase gen types typescript --linked produces clean post-DROP schema.

### CP-2: Files-modified intersection at migration-file level is EMPTY
- 00099: 00099_*.sql/down.sql only
- 00100: 00100_*.sql/down.sql only
- 00101: 00101_*.sql/down.sql + 19 src/script files (none shared with 00099/00100)

### CP-3: Three-stage commit + apply discipline holds
- 00099 commit then apply then verify (0 orphans inside transaction; 11 FKs in pg_constraint)
- 00100 commit then apply then verify (10 columns on clients; 3 policies; backfill complete)
- 00101 source refactor commit then smoke gate (11/13 PASS) then 00101 migration commit then apply then verify

### CP-4: Down-migration chain awareness
- Rolling back ONLY 00100 while 00101 has shipped equals catastrophic. B-1a rollback procedure documents correct order: roll back 00101 first, then 00100.
- Rolling back ONLY 00099 while 00100 + 00101 have shipped equals problematic (clients.created_by FK violation). 00099.down header should add a cross-reference noting this; currently absent. MINOR-FINDING-CP4: down migration cross-references between 00099 / 00100 / 00101 are not symmetric.

### CP-5: Drummond fixture impact verified across all three migrations
- Drummond is reference-job-data ONLY (per CLAUDE.md). Drummond row in jobs becomes a clients row post-00100 and DROPs cleanly post-00101.
- Smoke harness uses fixture-harness-org (UUID 00000000-0000-0000-0000-fb1ce0a55e55), NOT Drummond.

---

## Top-3 must-address (by priority)

1. WARNING-2 / WARNING-5 (data-loss-on-rollback for 00101): The destruction-of-redundancy framing is correct, but rollback contract IS partial. Suggest: 00101.down.sql operator-runnable reverse-backfill UPDATE (already commented-out in down). Require executor to explicitly opt-in via uncomment + explain in rollback runbook entry. Currently the runbook entry does not exist. Severity: MEDIUM. Recommendation: enhance, do not block.

2. MINOR-FINDING-CP4 (down-migration cross-reference symmetry): 00099.down does not reference 00100/00101 ordering concerns. Severity: LOW. Recommendation: header amendment at execute time; do not block.

3. WARNING-3 (activity_log.entity_type client deferred to Slice-2): If any /api/clients mutation surface lands before B-4 ships, audit will silently no-op. Severity: LOW (no mutation surface in Slice-1). Recommendation: ensure Slice-2 B-2 (Owner Portal Path A) explicitly waits for B-4 audit extension OR scaffolds its own audit pattern.

---

## Final verdict

PASS with WARNINGS. No BLOCKING findings. The three-migration sequence (00099, 00100, 00101) is well-designed: 00099 is pure constraint-add (zero risk); 00100 is schema-add + backfill with embedded columns preserved (zero data-loss path during slice); 00101 is the controlled destructive step with pre-migration code refactor + pre-DROP reverse probe + post-DROP smoke gate. Path A correctly splits the original B-1a combined-DROP risk into a safer two-migration pattern.

All hard rules satisfied:
- No hard delete on tenant table (only DROP COLUMN of redundant cache; data preserved in clients table)
- No NOT NULL column added without default on populated table (jobs.client_id is nullable)
- DROP COLUMN preceded by code-first deprecation (19 consumers refactored before 00101)
- Reverse SQL ships for all three migrations
- New clients table has RLS + 3 policies day-1 (R.23 shape)
- Data-destruction explicitly acknowledged with rollback contract documented

Recommended dispositions for plan-author iter-2 (non-blocking, polish-tier):
- Enhance 00099.down header with cross-reference to 00100/00101 rollback ordering
- Document operator-runbook entry for 00101.down reverse-backfill opt-in
- Confirm activity_log entity_type client extension is gated to B-4 ship (no orphan mutation paths land before)
