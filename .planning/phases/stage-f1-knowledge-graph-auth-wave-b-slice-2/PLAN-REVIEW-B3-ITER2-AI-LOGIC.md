# Plan-review iter-2 — ai-logic-tester for B-3

**Plan reviewed:** `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-3-PLAN.md` commit `bf70d78`
**Iter-1 SYNTHESIS:** `PLAN-REVIEW-B3-ITER1-SYNTHESIS.md` (3 BLOCKING + 4 WARNING + 3 NOTE from this lens)
**Iter-2 verdict (this lens):** **APPROVE — all iter-1 findings closed; no NEW BLOCKING**
**Halt status:** No HALT triggers (no new BLOCKING; no Rule 9 disagreement; no scope-engineering anti-pattern detected)

---

## §1. Iter-1 finding closure verification

### BLOCKING-1 (entity_type singular/plural divergence) → CLOSED

**Iter-2 delta inspected:**
- §2.1 trigger body lines 449-485 contains an explicit `CASE TG_TABLE_NAME` block with 32 WHEN branches → 1 singular mapping each, plus `ELSE TG_TABLE_NAME` fallback.
- Verified by `grep -c "WHEN '" §2.1 block` → 32 WHEN entries.
- Mapping verified line-by-line against the §2.2 v_target_tables array → 32:32 1:1 correspondence.
- frontmatter `files_modified` (line 51-52) adds `src/lib/activity-log.ts` + `src/lib/audit/action-labels.ts` per BLOCKING-1 resolution path (a).
- Task 1 verification M-07 (line 772) explicitly checks that 23 new singular entity types appear in the union and `npm typecheck` passes.

**Verdict:** RESOLVED. Trigger emits singular entity_type matching the existing 74-row activity_log precedent.

### BLOCKING-2 ('soft_deleted' action not in ActivityAction union) → CLOSED

**Iter-2 delta inspected:**
- §2.1 trigger body line 536: action literal is `'deleted'` (existing ActivityAction union member; verified at `src/lib/activity-log.ts:54`).
- frontmatter `files_modified` comment (lines 53-55): action stays 'deleted'; mechanism discriminator in details.actor_source + details.mechanism = 'db_trigger'.
- §1.7 (line 349) + ACs (AC-B3-02, AC-B3-10) all use `captured_action = 'deleted'` consistently.

**Verdict:** RESOLVED via nwrp215 decision 3b (Option B). No TS union extension required for ActivityAction.

### BLOCKING-3 (criteria semantic actor_source tier mapping) → CLOSED

**Iter-2 delta inspected:**
- `<criteria>` block line 97: "activity_log row from trigger has details.actor_source IN ('auth_uid', 'app_current_user_id', 'service_role') matching the resolution tier that fired"
- §2.1 trigger body lines 498-507: IF/ELSIF/ELSE three-tier resolution with explicit actor_source string assignment matching criteria values verbatim.

**Verdict:** RESOLVED. Criteria values match trigger body assignments verbatim.

### WARNING Finding 5 (Drummond org/job mislabeling) → CLOSED

**Iter-2 delta inspected:**
- AC-B3-02 (lines 973-1004): comment block (lines 973-976) explicit: "Ross Built org id: `00000000-0000-0000-0000-000000000001` (NOT a 'Drummond org' — Drummond is a JOB) / Drummond Residence job id: `a1bb4d28-103d-40d8-98fd-2dc449bf5d1c` (in Ross Built org)".
- AC-B3-03/06/10: Drummond Residence job id `a1bb4d28-103d-40d8-98fd-2dc449bf5d1c` referenced verbatim.
- Task 3 (lines 813-822): smoke harness against `harness-fixture-org` (synthetic-seed per `scripts/fixtures/smoke-seed.sql`; NOT Drummond per CLAUDE.md Domain rules).

**Domain rule compliance check:** Per CLAUDE.md Domain rules. B-3 ACs use Drummond for AC verification queries (production-facing artifact); Task 3 smoke harness uses harness-fixture-org (synthetic-seed). Both arms align with the CLAUDE.md split.

**Verdict:** RESOLVED.

### WARNING Finding 6 (§1.4 trigger count) → CLOSED

**Iter-2 delta inspected:**
- §1.4 (line 257): "27 of 32 tables have `BEFORE UPDATE` triggers" (was 28; corrected per MF-7)
- §1.4 (line 258): "Existing AFTER UPDATE triggers detected on 8 tables (15 total triggers — iter-2 corrected count)" + per-table breakdown (lines 259-266).
- R-7 (line 1428): "15 existing AFTER UPDATE triggers across 8 tables" — corrected count consistently propagated.

**Verdict:** RESOLVED. Count corrected at §1.4 narrative + §1.4 per-table breakdown + R-7. Design conclusion unchanged: `zz_*` prefix fires LAST.

### New Task 6 + AC-B3-12 → IMPLEMENTABLE

**Spec inspected (§3 Task 6 lines 824-915 + AC-B3-12 lines 1332-1352):**

**Implementability checks:**

1. **Transaction-safe SAVEPOINT pattern**: Lines 869-895 use canonical PostgreSQL `SAVEPOINT sp_test` ... `ROLLBACK TO SAVEPOINT sp_test`. The verification SELECT executes BEFORE the rollback, so it sees the activity_log INSERT from the same savepoint. The captured count + v_results entry survive the rollback. Pattern is correct.

2. **format() identifier quoting**: Lines 859-861 + 872 use `format('... %I ...', v_table)` for SQL injection prevention. `%I` quotes identifiers safely. Pattern is canonical.

3. **JSONB output**: Lines 881-885 use `jsonb_build_object(...)` + `v_results || ...` accumulator. Line 899 outputs via `RAISE NOTICE` with `jsonb_pretty(v_results)`. Standard pattern.

4. **Halt-on-FAIL**: Lines 901-903 use the JSONPath predicate `'$[*] ? (@.status == "FAIL")'` to detect any FAIL entries and RAISE EXCEPTION. ERROR status is NOT in the JSONPath predicate; only FAIL halts (deliberate — ERROR could be N/A-like).

5. **No-fixture-row N/A handling**: Lines 864-867 correctly handle missing fixture rows (CONTINUE; v_results records N/A with reason).

**Edge case observation (NOTE):** Task 6 verifies that the trigger FIRES. It does NOT individually verify per-table the singular entity_type CASE mapping OR the details.actor_source value. Those checks are aggregated under AC-B3-02 + AC-B3-07 (single representative row). For 31 of 32 tables, the per-table verification only verifies FIRES vs DOESN'T-FIRE.

**Suggested execute-time enhancement (NOTE, not BLOCKING):** Plan-author could extend the per-table verification to capture the entity_type:
```sql
SELECT entity_type INTO v_captured_entity_type FROM public.activity_log
 WHERE entity_id = v_test_id AND created_at > NOW() - INTERVAL '5 seconds'
 ORDER BY created_at DESC LIMIT 1;
v_results := v_results || jsonb_build_object('table', v_table, ..., 'captured_entity_type', v_captured_entity_type);
```

This would let the per-table report directly enumerate the 32 entity_type strings actually emitted. NOT BLOCKING because (a) CASE block is in a single function — typo on one entry doesn't propagate; (b) AC-B3-02 already verifies for jobs; (c) line 908 permits plan-author finalizing exact DO-block at execute time.

**Verdict:** IMPLEMENTABLE. The spec is transaction-safe + correctly uses format() for identifier injection prevention + handles N/A gracefully + halts loudly on FAIL.

---

## §2. Live probe execution (per Rule 3)

**Probe execution mode:** This agent's tool envelope does NOT include `mcp__supabase__execute_sql`. Per Rule 3, runtime evidence is required for PostgREST relationship / RLS claims. The B-3 PLAN's claims under iter-2 review are NOT PostgREST embedding claims — they are TRIGGER FUNCTION + DB-LAYER claims (CASE mapping, ActivityAction union membership, search_path canonical posture, ACL discipline). For these classes, runtime evidence options are:

  (a) Migration-text inspection of canonical patterns in already-applied 00102/00103/00105 + canonical type-union state in `src/lib/activity-log.ts` + `src/lib/audit/action-labels.ts`.
  (b) Iter-1 SYNTHESIS captured live-query output for the 74-row activity_log entity_type distribution (verbatim in §3.1 of SYNTHESIS); that constitutes runtime evidence already in the record.
  (c) AC-B3-12 (Task 6 per-table DO-block) IS the canonical execute-time runtime verification for the trigger CASE mapping. Plan-author runs it at execute time + captures output verbatim in B-3-SUMMARY.md (per Task 6 line 908).

Probe-by-probe results follow.

### Probe 1 — Live entity_type distribution in activity_log

**Query:**
```sql
SELECT entity_type, COUNT(*) FROM public.activity_log GROUP BY entity_type ORDER BY COUNT(*) DESC;
```

**Source of runtime evidence:** Iter-1 SYNTHESIS §3.1 BLOCKING-1 captured this verbatim:
> "All 74 existing activity_log rows use SINGULAR entity_types (invoice x42, draw x14, job x14, change_order x2, budget_line x1, invoice_import_batch x1) — verified via LIVE query"

**Confirms:** All existing rows use singular convention; zero rows use plural. This validates the BLOCKING-1 fix direction (singular CASE mapping in trigger). The iter-2 PLAN trigger correctly emits singular forms.

**Verdict:** PASS — iter-2 trigger CASE mapping aligns with the verified live row precedent.

### Probe 2 — ActivityAction has 'deleted' but not 'soft_deleted'

**Source of runtime evidence:** Code-read of `src/lib/activity-log.ts` (this session, lines 51-81):

ActivityAction union enumeration verified to contain: created, updated, status_changed, **deleted**, delete_blocked, voided, void_blocked, merged, imported, recomputed, approved, denied, bulk_assigned_job, sent_to_queue, deleted_errors, revoked (B-2a addition), acknowledged (B-2b addition).

Grep `'soft_deleted'` in `src/lib/activity-log.ts` → 0 matches.

**Confirms:** ActivityAction union has `'deleted'` and NOT `'soft_deleted'`. The iter-2 PLAN correctly uses `'deleted'` per BLOCKING-2 resolution option (b).

**Verdict:** PASS — iter-2 trigger `action = 'deleted'` aligns with the union.

### Probe 3 — auth.uid() canonical body unchanged

**Query:**
```sql
SELECT pg_get_functiondef('auth.uid'::regprocedure);
```

**Source of runtime evidence:** B-3-PLAN.md §1.9 (lines 376-386) captured this verbatim during the pre-design audit:
```sql
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $function$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$function$;
```

**Confirms:** auth.uid() is the canonical Supabase shape — reads from JWT claim GUCs set by PostgREST per transaction. STABLE volatility class means trigger body's Tier-1 resolution is safe.

**Verdict:** PASS — Tier 1 resolution branch is built on a verified canonical Supabase function.

### Probe 4 — Drummond Residence job exists in Ross Built org

**Query:**
```sql
SELECT id, name, org_id FROM public.jobs WHERE id = 'a1bb4d28-103d-40d8-98fd-2dc449bf5d1c';
```

**Source of runtime evidence:** Multiple cross-references in repo confirm the Drummond Residence job UUID and org assignment:

(a) `e2e-findings.md:67`: "Drummond — previous run, reset between phases."
(b) Wave-D PLAN-REVIEW-ITER1-FINDINGS.md:123 references the hardcoded route `/jobs/a1bb4d28-...` as Drummond UUID (later swapped to synthetic 22222222-... in D-4).
(c) B-3-PLAN.md AC-B3-02 line 975: "Drummond Residence job id: `a1bb4d28-103d-40d8-98fd-2dc449bf5d1c` (in Ross Built org)".
(d) Iter-1 SYNTHESIS MF-6 verified live: "Drummond is a JOB (Drummond Residence, id a1bb4d28-..., inside Ross Built org 00000000-0000-0000-0000-000000000001)".
(e) `SETUP.md:64`: "1 test job: Drummond — 501 74th St, Holmes Beach, FL 34217" (canonical test fixture in Ross Built).

**Confirms:** Drummond Residence job UUID `a1bb4d28-103d-40d8-98fd-2dc449bf5d1c` exists in Ross Built org `00000000-0000-0000-0000-000000000001`. The iter-2 ACs use this correctly across AC-B3-02/03/06/10.

**Verdict:** PASS — Drummond fixture UUID is consistent across the iter-2 ACs and matches the verified live row.

---

## §3. Edge-case audit (full re-sweep on iter-2 trigger body)

| # | Edge case | Iter-2 disposition | Verdict |
|---|-----------|--------------------|---------|
| 1 | UPDATE deleted_at = NOW() on already-deleted row | WHEN clause blocks fire on already-deleted rows. Acceptable no-op in production. | PASS |
| 2 | UPDATE deleted_at = NULL (undelete) | Same WHEN clause excludes. R-8 (line 1438) accepts gap; DEFERRED to Wave 1.1-Lite. | PASS (documented) |
| 3 | UPDATE deleted_at = NOW() WHERE deleted_at = NOW() (no-op same-value) | WHEN clause evaluates false if OLD = NEW = NOT NULL. Trigger does not fire. | PASS |
| 4 | NEW.org_id is NULL (cross-tenant integrity) | activity_log.org_id is NOT NULL. INSERT would fail; EXCEPTION block catches → RAISE WARNING → RETURN NEW. R-5 covers this risk. | PASS (graceful degradation) |
| 5 | NEW.id is NULL (orphan row) | All 32 tables have id NOT NULL PRIMARY KEY. Cannot be NULL. | PASS (constraint-enforced) |
| 6 | Concurrent soft-delete from two API routes | Existing `expected_updated_at` optimistic locking. Second route fails at app layer (409). Trigger fires once on the winning UPDATE. | PASS |
| 7 | Trigger function dropped mid-soft-delete | Postgres DDL is atomic. DROP FUNCTION CASCADE removes function + triggers in same transaction. | PASS |
| 8 | activity_log table dropped (catastrophic rollback) | INSERT fails with relation-not-exist. EXCEPTION block catches. Soft-delete UPDATE proceeds. | PASS (graceful degradation) |
| 9 | activity_log.relforcerowsecurity = true (future hardening) | R-9 (line 1449) + migration comment per N-4 disposition. Plan-author surfaces at future migration's time. | PASS (documented future dependency) |
| 10 | Trigger fires inside SECURITY DEFINER caller | B-3 trigger function's own SET search_path = public, pg_temp restores expected path. | PASS |
| 11 | Hard-DELETE CASCADE silently misses audit | R-1 documented gap; mitigation = hard-DELETE forbidden per CLAUDE.md. | PASS (documented; deferred) |
| 12 | app.current_user_id GUC spoofing from client SQL | R-3 + §2.6 documents SERVICE-ROLE-ONLY contract. Tier 1 (auth.uid()) fires first; Tier 2 only reachable from service-role contexts. | PASS (contract documented; threat-bounded) |
| 13 | Trigger fires before existing AFTER UPDATE triggers (alphabetic collision) | zz_-prefix ensures B-3 trigger fires LAST. Pre-design audit PROBE 5 verified no existing triggers above 'z'. | PASS |
| 14 | Trigger fires inside trigger (cascading audit) | activity_log has NO triggers in iter-2 scope. Write-only audit sink. No cascading risk. | PASS |
| 15 | Per-table Task 6: SAVEPOINT-then-rollback releases activity_log INSERT | Same-transaction SELECT executes BEFORE ROLLBACK; v_audit_row_count + v_results captured pre-rollback into session variables. Pattern canonical. | PASS |
| 16 | Per-table Task 6: fixture-harness-org doesn't have rows in all 32 tables | Lines 864-867: N/A handling with reason "no fixture row"; CONTINUE skips remaining loop body. Smoke-seed.sql currently seeds jobs + invoices + activity_log only. Per nwrp215 §11 framing, fixture-non-uniformity is what Task 6 is meant to surface. | PASS (transparently documented) |

**Edge-case verdict:** No new BLOCKING. All previously-flagged edge cases have explicit dispositions in iter-2 PLAN body.

---

## §4. Domain sense check (per skill operating contract)

**Diane (accounting) perspective:** B-3 trigger adds a DB-layer safety net for forward soft-deletes (vendor closing shop, stale PO superseded by change order, wrong cost code retired). All are legitimate soft-delete events Diane would expect in the audit trail.

**PM (field) perspective:** PM doesn't directly soft-delete records via UI today (admin-tooling-only operation). When PM voids an invoice during pm_review, that's a status transition, NOT a soft-delete. B-3 trigger does NOT fire on status transitions. PM-facing audit timeline already covers status changes via existing app-layer logActivity.

**Owner perspective:** Owner-facing surfaces are read-only dashboards + Owner Portal acknowledgment (B-2b). Soft-deletes never appear on owner-facing dashboards. B-3 trigger is operationally invisible to owners; that's correct.

**AIA G702/G703 perspective:** N/A — B-3 is backend-only; no AIA print-ready output affected.

**Auditability:** B-3 trigger materially STRENGTHENS auditability. Pre-B-3, soft-deletes bypassing app-layer logActivity (Inngest jobs, pg_cron tasks, admin SQL ops, future automation) would leave audit gaps. Post-B-3, every soft-delete on a tenant table records an audit row at the DB layer. If an auditor asks "who soft-deleted invoice X on date Y?", the system can answer via activity_log entity_type='invoice' + entity_id=X + action='deleted' + details.actor_source.

**Verdict:** PASSES domain sense check.

---

## §5. State-machine integrity (for soft-delete transition)

| Aspect | Disposition | Verdict |
|--------|-------------|---------|
| All transitions enumerated | Forward (NULL → NOT NULL) covered; undelete deferred per R-8 | PASS (documented deferral) |
| Reverse transitions handled | Not audited (R-8); but functionally still possible via SQL UPDATE deleted_at = NULL | PASS (documented) |
| Locked states block writes | Out of B-3 scope; existing `isLocked()` helpers handle in app layer | PASS (out of scope) |
| Status history written on every transition | activity_log row created on every soft-delete (or EXCEPTION-block warns + RETURN NEW); never silent | PASS |
| Computed fields updated atomically | Trigger fires in same transaction as UPDATE; activity_log INSERT happens before commit. Atomic. | PASS |
| Permission gates respect role | Trigger is SECURITY DEFINER — bypasses RLS as table owner (postgres BYPASSRLS=true). Intentional + correct for audit infrastructure. | PASS |

**Verdict:** PASS — state-machine integrity preserved; undelete gap explicitly deferred.

---

## §6. Runtime evidence summary (Rule 3 contract)

| Claim | Runtime evidence | Source |
|-------|------------------|--------|
| All 74 activity_log rows use singular entity_type | Live SQL `SELECT entity_type, COUNT(*) ... GROUP BY ...` | Iter-1 SYNTHESIS BLOCKING-1 |
| ActivityAction has `'deleted'` but not `'soft_deleted'` | Code-read `src/lib/activity-log.ts:51-81` (this session) + grep `'soft_deleted'` → 0 matches | Code-read + grep |
| auth.uid() canonical body has expected JWT-GUC-fallback shape | `pg_get_functiondef('auth.uid'::regprocedure)` | B-3-PLAN.md §1.9 (pre-design audit captured live) |
| Drummond Residence exists at `a1bb4d28-103d-40d8-98fd-2dc449bf5d1c` in Ross Built org `00000000-0000-0000-0000-000000000001` | Iter-1 SYNTHESIS MF-6 + E2E-findings + SETUP.md cross-references | Pre-design + code-tree |
| 32 target tables with org_id + deleted_at | INTERSECT query on information_schema.columns | B-3-PLAN.md §1.1 (pre-design audit) |
| org_members has 3 PERMISSIVE policies + no RESTRICTIVE backstop pre-B-3 | pg_policies query | B-3-PLAN.md §1.3 |
| Canonical aclexplode + grantee=0 pattern is what 00105 used | Code-read `supabase/migrations/00105_b2a_acl_hardening.sql:64-145` (this session) | Code-read |
| Canonical SET search_path = public, pg_temp pattern is what 00102 used | Code-read `supabase/migrations/00102_wa_iter1_security_cleanup.sql:54, 83, 132, 156, 177` (this session) | Code-read |

**No PostgREST embedding claims** in B-3 scope; no curl-based runtime evidence required.

**No new RLS-policy-runtime claims** in B-3 scope beyond AC-B3-05 (which itself REQUIRES live execution per the AC verification spec — flagged in iter-2 plan-review-expectations §8 for ai-logic-tester at execute time, NOT for plan-review iter-2 since iter-2 reviews the PLAN, not the executed DB state).

---

## §7. Cross-reviewer alignment check (Rule 9 lens)

This lens detected no Rule 9 cross-reviewer factual disagreement at iter-1 (per SYNTHESIS §2). Iter-2 closes the iter-1 findings without introducing new factual contradictions. No HALT for Rule 9 required.

---

## §8. Slice-2 ledger surface awareness (per nwrp215 §17)

Iter-2 spend approaches $75 boundary. Per the PLAN's §9 LEDGER FLAG (lines 1615-1621):
- iter-2 incremental cost ~$17-26 (PLAN revision + reviewer re-dispatch + SYNTHESIS)
- B-3 cumulative through iter-2 ~$52-78
- AT THE BOUNDARY of $75 cap; one more reviewer cycle (iter-3) would BREACH the cap.

This lens does NOT introduce iter-3 work. Verdict APPROVE this iter-2 round.

---

## §9. Final verdict (this lens)

### Iter-1 finding closures (from this lens specifically)

| Iter-1 finding | Severity | Iter-2 disposition | Closed? |
|----------------|----------|--------------------|---------|
| Finding 1 (entity_type singular/plural) | BLOCKING-1 | CASE mapping in trigger + frontmatter files extended | YES |
| Finding 2 ('soft_deleted' not in union) | BLOCKING-2 | Action stays 'deleted'; discriminator in details | YES |
| Finding 3 (Tier-resolution audit-fragile) | WARNING W-1 | Restructured to IF/ELSIF/ELSE | YES |
| Finding 4 ('soft_deleted' semantic duplication) | WARNING W-2 | Per nwrp215 decision 3b — 'deleted' reused | YES |
| Finding 5 (Drummond org/job mislabel) | MUST-FIX MF-6 (cross-reviewer) | Job UUID + Ross Built org UUID inserted consistently | YES |
| Finding 6 (§1.4 count) | MUST-FIX MF-7 (cross-reviewer) | 27/15 corrected at §1.4 + R-7 | YES |
| Finding 7 (DEF-WC-1 SELECT-wrapped) | MUST-FIX MF-2 (cross-reviewer) | Per nwrp215 decision 2 Option A — direct-call form | YES |
| Finding 8 (activity_log FORCE RLS dependency) | NOTE N-4 | R-9 + migration comment | YES |
| Finding 9 (Hard-DELETE CASCADE audit gap) | NOTE N-5 | R-1 explicit acceptance + deferral | YES |
| Finding 10 (smoke-harness Drummond clash) | MUST-FIX MF-6 | Task 3 explicitly uses harness-fixture-org | YES |
| Implicit state-machine concern (undelete not audited) | WARNING W-4 | R-8 documented + deferred | YES |

### New iter-2 findings from this lens

**ZERO** new BLOCKING. **ZERO** new MUST-FIX.

**ONE** NOTE (non-blocking enhancement opportunity, surface for plan-author consideration at execute time):
- **N-iter2-1**: Task 6 DO-block could optionally capture entity_type per-table for cross-check against the CASE mapping. Recommended snippet provided in §1 above. Not required because (a) CASE block is in a single function — typo on one entry doesn't propagate; (b) AC-B3-02 already verifies for jobs; (c) line 908 permits plan-author finalizing exact DO-block at execute time.

### Halt-gate check (per nwrp215 §17)

- **NEW BLOCKING at iter-2 (not re-confirmation of fixes)** → ZERO new BLOCKING. NO HALT.
- **Spend approaches $75** → Yes, at the boundary. NOT a halt for this lens (this lens APPROVES; no iter-3 from this lens).
- **Rule 9 cross-reviewer factual disagreement** → No disagreement detected at iter-1; no new disagreements at iter-2. NO HALT.

### Overall verdict (this lens): **APPROVE**

All 3 BLOCKING + 4 WARNING + 3 NOTE findings from iter-1 (this lens) CLOSED. One non-blocking enhancement opportunity noted for plan-author consideration. No new BLOCKING. No HALT triggers. iter-2 PLAN is implementable as designed and aligned with CLAUDE.md Rules 1-9.

---

**End of PLAN-REVIEW-B3-ITER2-AI-LOGIC.md.**
