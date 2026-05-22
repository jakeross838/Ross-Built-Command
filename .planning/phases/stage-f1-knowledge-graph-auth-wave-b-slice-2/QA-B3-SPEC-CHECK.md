# Spec check — Phase F1-Wave-B-Slice-2 Plan B-3: soft-delete-trigger-def-wc-1-def-wc-3-rls-hardening

**Reviewer:** nightwork-spec-checker
**Date:** 2026-05-22
**Commits in scope:** 49bb664..8ed0e38 (5 commits; B-3 execute dispatched per nwrp217)
**PLAN:** .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-3-PLAN.md §4 (12 ACs) + structured criteria block
**SUMMARY:** .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-3-SUMMARY.md
**Migration:** supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.sql + .down.sql

---

## Acceptance criteria

### Structured criteria block (B-3-PLAN.md lines 77-101)

B-3 has no UI surface; dom/visual categories are N/A throughout.

| # | Category | Criterion | Verdict | Evidence |
|---|----------|-----------|---------|----------|
| C-M-1 | mechanical | migration 00107 up-file exists + applies cleanly | COVERED | File exists; M-01..M-05 inline verification PASS per SUMMARY §3 |
| C-M-2 | mechanical | down-file exists + symmetric to up | COVERED | .down.sql exists; reverse order: drop policies -> drop 32 triggers -> drop function (down.sql lines 14-45) |
| C-M-3 | mechanical | database.types.ts regenerated; npm typecheck passes | COVERED | SUMMARY §3 M-06: npx tsc --noEmit passes with zero errors |
| C-M-4 | mechanical | Production build (npm run build) succeeds | PARTIAL | SUMMARY M-06 records only npx tsc --noEmit pass; no verbatim npm run build output. B-3 has zero JSX changes. See WARNING-1. |
| C-M-5 | mechanical | Existing test suite (npm test) passes without regression | PARTIAL | No explicit npm test output quoted in SUMMARY. Task 3 scope included this. See WARNING-2. |
| C-D-1 | dom | N/A | N/A | B-3 has no UI surface |
| C-V-1 | visual | N/A | N/A | B-3 has no UI surface |
| C-B-1 | behavioral | Trigger fires on soft-delete UPDATE: entity_type=job (singular), action=deleted, actor_source in range, mechanism=db_trigger | COVERED | SUMMARY §4 AC-B3-02 PASS: new_audit_rows=1, entity_type=job, action=deleted, mechanism=db_trigger; migration 00107 lines 86-123 CASE mapping |
| C-B-2 | behavioral | Cross-org leak blocked: authenticated org_A user reading org_B org_members returns 0 rows | COVERED | SUMMARY §5 verbatim probe: step4_leak_rows_org_a=0 under SET LOCAL ROLE authenticated + JWT claims; own-org=10 preserved; platform_admin cross-org=9 |
| C-B-3 | behavioral | Trigger does NOT fire on non-soft-delete UPDATE: 0 new activity_log rows | COVERED | SUMMARY §4 AC-B3-03 PASS: new_audit_rows=0 (updated_at-only UPDATE on Drummond Residence) |
| C-B-4 | behavioral | Hard DELETE on test fixture row: trigger does not fire (documented limitation R-1) | COVERED | SUMMARY §11 R-1 documented; migration 00107 AFTER UPDATE only (lines 226-236) |
| C-B-5 | behavioral | Task 6 DO-block loops 32 tables; each trigger fires correctly OR correctly N/A | COVERED | SUMMARY §7: 5 PASS + 27 N/A + 0 FAIL + 0 ERROR; verbatim 32-entry JSONB with expected_entity_type per table |
| C-S-1 | semantic | entity_type matches singular CASE mapping (NOT plural TG_TABLE_NAME) | COVERED | migration 00107 lines 86-123; Task 6 5 fixture-covered tables all emit singular form |
| C-S-2 | semantic | activity_log row org_id = soft-deleted row org_id | COVERED | SUMMARY §4 AC-B3-07: audit_org_id = source_org_id = 00000000-0000-0000-0000-000000000001 |
| C-S-3 | semantic | details.actor_source IN (auth_uid, app_current_user_id, service_role) | PARTIAL | Tier 3 (service_role) verified via Task 6. Tier 1+2 deferred to ai-logic-tester per AC-B3-06 PARTIAL. See NOTE-1. |
| C-S-4 | semantic | details.mechanism = db_trigger | COVERED | SUMMARY §4 AC-B3-02: mechanism=db_trigger; migration 00107 line 159 |
| C-S-5 | semantic | DEF-WC-1 org_members_org_isolation uses canonical direct-call form (NOT SELECT-wrapped) | COVERED | migration 00107 lines 255-259: (org_id = app_private.user_org_id()) OR app_private.is_platform_admin(); no (SELECT...) wrap; nwrp215 decision 2 Option A |
| C-S-6 | semantic | DEF-WC-3 ARCHITECTURE.md covers 32 + 4 extension entities = 36 data rows | COVERED | ARCHITECTURE.md line 218 section confirmed; table has 32 + 4 = 36 rows |

### Prose ACs from PLAN §4 (12 ACs)

| # | AC | Verdict | Evidence |
|---|----|---------|----------|
| AC-B3-01 | 32 triggers applied (trigger_count = 32) | COVERED | SUMMARY §3 M-03: [{trigger_count:32}]; migration 00107 lines 213-237 DO-block over 32-element array |
| AC-B3-02 | Trigger fires correctly on soft-delete UPDATE (Drummond Residence) | COVERED | SUMMARY §4: new_audit_rows=1, entity_type=job, action=deleted, mechanism=db_trigger, actor_source=service_role; undelete + cleanup confirmed |
| AC-B3-03 | Trigger does NOT fire on non-soft-delete UPDATE | COVERED | SUMMARY §4: new_audit_rows=0 (updated_at-only UPDATE) |
| AC-B3-04 | DEF-WC-1 2 RESTRICTIVE policies on org_members | COVERED | SUMMARY §3 M-04: org_members_delete_strict (RESTRICTIVE DELETE) + org_members_org_isolation (RESTRICTIVE ALL); migration 00107 lines 255-270 |
| AC-B3-05 | LIVE cross-tenant probe PASSED (3 falsifiable conditions) | COVERED | SUMMARY §5 verbatim: STEP 4 leak_rows=0, STEP 5 own_org_rows=10, STEP 6 is_platform_admin=true cross_org_rows=9; SET LOCAL ROLE authenticated + JWT claims (not service-role bypass) |
| AC-B3-06 | Three-tier user-id resolution correct | PARTIAL | Tier 3 verified via Task 6 (5 PASS rows all actor_source=service_role). Tier 1 (auth.uid) + Tier 2 (app.current_user_id) deferred to ai-logic-tester. See NOTE-1. |
| AC-B3-07 | activity_log cross-tenant integrity (audit_org_id = source_org_id) | COVERED | SUMMARY §4: audit_org_id = source_org_id = 00000000-0000-0000-0000-000000000001; trigger reads NEW.org_id (migration 00107 line 172) |
| AC-B3-08 | SECURITY DEFINER + search_path + no PUBLIC/anon/authenticated EXECUTE grant | COVERED | SUMMARY §3 M-02: security_definer=true, config_settings=search_path=public pg_temp; M-05: all grant flags false, all_grantees=[postgres]; migration 00107 lines 202-203 |
| AC-B3-09 | DEF-WC-3 ARCHITECTURE.md §9 - 36 data rows + Pattern A/B taxonomy + 4 extension entities | COVERED | ARCHITECTURE.md line 218 section present; SUMMARY §4 row count=36 via corrected awk. NOTE: PLAN awk command has documented syntax bug (SUMMARY §8 deviation #2). See WARNING-3. |
| AC-B3-10 | Trigger does NOT block soft-delete on missing user_id (graceful degradation) | COVERED | SUMMARY §4: all 5 Task 6 PASS rows under service-role (v_user_id=NULL); soft-delete never blocked; migration 00107 lines 168-183 EXCEPTION handler |
| AC-B3-11 | Smoke harness <=2 failures matching TD-WE-03 set | PARTIAL | SUMMARY §6: baseline (2026-05-18) 11 PASS / 2 FAIL matching TD-WE-03. Post-execute re-run deferred to /nightwork-qa Step 3. B-3 made zero UI changes. See WARNING-4. |
| AC-B3-12 | Task 6 32-table DO-block: 5 PASS + 27 N/A + 0 FAIL + 0 ERROR (nwrp216 Q3 MANDATE) | COVERED | SUMMARY §7 verbatim 32-entry JSONB; singular mapping verified for 5 fixture-covered tables; 27 N/A include expected_entity_type per table |

---

## Spec deliverables

- [x] supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.sql -- COVERED (commit 49bb664)
- [x] supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.down.sql -- COVERED (commit 49bb664; symmetric reverse)
- [x] src/lib/activity-log.ts ActivityEntityType union +23 entries -- COVERED (activity-log.ts lines 49-82)
- [x] src/lib/audit/action-labels.ts ENTITY_LABELS Record +23 entries -- COVERED (action-labels.ts lines 67-89; TypeScript compile enforces exhaustiveness)
- [x] src/lib/types/database.types.ts regenerated -- COVERED (SUMMARY §3 M-06; commit 49bb664)
- [x] .planning/architecture/ARCHITECTURE.md §9 RLS posture summary table (36 data rows) -- COVERED (commit e22a488; ARCHITECTURE.md line 218)
- [x] MASTER-PLAN.md §9 shows 2 of 7 + B-3 PENDING GATE (NOT 3 of 7 shipped) -- COVERED (MASTER-PLAN.md lines 336+339)
- [x] MASTER-PLAN.md §11 TD-NW-HOOK-EXECUTE-PHASE-DETECT filed -- COVERED (MASTER-PLAN.md line 316; 3-instance lineage; MEDIUM; pre-B-5 schedule)
- [x] MASTER-PLAN.md §11 TD-NW-APP-PRIVATE-DEFAULT-ACL-HARDEN filed -- COVERED (MASTER-PLAN.md line 322; 4-instance lineage; MEDIUM; Wave 1.1-Lite)
- [x] B-3-SUMMARY.md status AUTHORED - PENDING POST-EXECUTE GATE B-3 REVIEW -- COVERED (SUMMARY frontmatter line 8)
- [x] Task 5 REMOVED per nwrp215 decision 4 -- COVERED (SUMMARY frontmatter tasks_completed; PLAN §3 Task 5 section)
- [x] DEF-WC-1 direct-call form (NOT SELECT-wrapped) per nwrp215 decision 2 -- COVERED (migration 00107 lines 255-259)
- [x] Pre-design audit PLAN §1 preserved verbatim -- COVERED (no silent edits detected; §1.1-§1.10 intact)

---

## Domain rules spot-check

- Drummond fixtures used: yes -- AC-B3-02/03/07 use Drummond Residence (a1bb4d28-103d-40d8-98fd-2dc449bf5d1c) in Ross Built org; Task 6 uses harness-fixture-org per Domain rules
- Recalculate-not-increment honored: yes -- trigger writes append-only activity_log rows; no aggregation columns modified
- Multi-tenant RLS posture: pass -- AC-B3-05 live probe confirmed cross-org blocked; trigger writes NEW.org_id (source row not session); DEF-WC-1 RESTRICTIVE adds defense-in-depth; ARCHITECTURE.md §9 documents 36-entity posture
- Design tokens (no hardcoded colors): pass -- B-3 has no UI surface; hook checks not applicable
- Audit log writes added on every state change: pass -- B-3 IS the audit safety net; trigger fires on every soft-delete transition; EXCEPTION handler ensures graceful degradation (AC-B3-10)
- SECURITY DEFINER + search_path: pass -- migration 00107 lines 73-74; M-02 verified live; matches CLAUDE.md canonical pattern
- REVOKE EXECUTE FROM PUBLIC + authenticated: pass -- migration 00107 lines 202-203; auto-fix deviation filed as TD-NW-APP-PRIVATE-DEFAULT-ACL-HARDEN

---

## Findings

### BLOCKING

None.

### WARNING

1. **WARNING-1 (C-M-4):** Explicit `npm run build` output not quoted verbatim in SUMMARY. SUMMARY M-06 records only `npx tsc --noEmit passes`. PLAN Task 3 scope included this as an explicit verification item. B-3 makes zero JSX/layout changes so regression is low-probability, but the artifact is absent. ai-logic-tester should confirm explicitly.

2. **WARNING-2 (C-M-5):** Explicit `npm test` output not quoted in SUMMARY. PLAN Task 3 listed it as a verification item; SUMMARY §6 records only smoke-route analysis. ai-logic-tester should confirm test suite passes without regression.

3. **WARNING-3 (AC-B3-09 awk syntax bug):** PLAN §4 AC-B3-09 verbatim awk command has a documented syntax bug (SUMMARY §8 deviation #2: awk range opens and closes on the section header line, returning 0 instead of 36). The underlying ARCHITECTURE.md content is correct at 36 rows; the corrected awk is in SUMMARY §8. Any QA reviewer running the PLAN verbatim command gets a false 0. Custodian should note the corrected command in the GATE B-3 artifact.

4. **WARNING-4 (AC-B3-11 smoke re-run pending):** Post-execute smoke run has not yet completed. SUMMARY §6 verdict: BASELINE PRESERVED PENDING POST-EXECUTE SMOKE RE-RUN. This is the expected /nightwork-qa Step 3 workflow. Must complete and be recorded before this AC is fully COVERED.

### NOTE

1. **NOTE-1 (AC-B3-06 PARTIAL - by design):** Tier 1 (auth.uid) + Tier 2 (app.current_user_id) resolution deferred to ai-logic-tester. PLAN AC-B3-06 explicitly designates these as Rule 3 ai-logic-tester scope requiring live authenticated API request paths not exercisable via mcp__supabase__execute_sql service-role context. Code path is correct (migration 00107 lines 139-148 IF/ELSIF/ELSE); only runtime exercise is deferred.

2. **NOTE-2 (27 N/A in Task 6):** 27 of 32 tables have no fixture row in harness-fixture-org. CASE mapping for all 27 is specified in migration 00107 lines 86-123 (all 32 tables explicitly mapped; no ELSE-fallback risk for unlisted tables). Live-trigger-fire verification absent for 27; future fixture seed extension could close the gap.

3. **NOTE-3 (5 --no-verify bypasses on B-3 execute):** Each authorized per nwrp217 Rule 8(a) per-incident; cited verbatim in commit bodies. TD-NW-HOOK-EXECUTE-PHASE-DETECT filed at MASTER-PLAN.md line 316 to address calibration debt pre-B-5. Within authorized scope.

4. **NOTE-4 (Slice-2 budget at ceiling boundary):** SUMMARY §13 surfaces B-3 high-end cumulative (~$326) may have crossed the $300 Slice-2 ceiling. Flagged for Jake at GATE B-3 per PLAN §0 discipline contract. Cost-ceiling disposition is orchestrator scope.

5. **NOTE-5 (over-build check - database.types.ts graphql_public removal):** database.types.ts regen removed graphql_public schema declarations (SUMMARY §3 M-06 -- Supabase project setting change). Tooling-driven, not author-introduced scope creep. Type-surface reduction; no action required.

---

## Verdict

NEEDS WORK

No BLOCKING findings. No cross-reviewer factual disagreements detected. No domain rule violations. All 12 prose ACs and all structured criteria entries are COVERED or PARTIAL with documented remediation paths. Three items must close before verdict moves to PASS:

1. ai-logic-tester: exercise AC-B3-06 Tier 1 (auth.uid path) + Tier 2 (app.current_user_id path) live -- close C-S-3 and AC-B3-06 PARTIAL
2. QA smoke step: run fresh harness against Vercel preview post-B-3 commits and record result -- close AC-B3-11
3. QA confirm: explicit npm run build + npm test pass artifacts -- close C-M-4 and C-M-5
