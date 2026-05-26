# Phase stage-f1-knowledge-graph-auth-wave-b-slice-2 — B-4 CONTEXT

**Gathered:** 2026-05-26 (lean direct authoring per Slice-2 efficiency pattern + nwrp220 lean Tier-2 dispatch directive)
**Status:** Ready for planning
**Plan ID:** B-4 (activity-log union/Record verification + write-site sweep + 5 Slice-1 carry-forwards + 4 B-1b QA bundle carry-forwards — LOW threat, lean Tier-2 cleanup)
**Depends on:** B-2a SHIPPED (added client_portal_access entity_type), B-2b SHIPPED (added acknowledged action), B-3 SHIPPED (added 23 new singular entity_types for 32-table trigger coverage)

<domain>
## Phase Boundary

**B-4 delivers activity-log union/Record VERIFICATION (the extension work is already done by B-2a/B-2b/B-3) + write-site sweep + carry-forward cleanup.** It is intentionally a LOW-threat, lean Tier-2 plan — NO new security surface, NO RLS changes, NO tenancy changes (with ONE narrow exception: Task 4 MEDIUM-1 PATCH /api/jobs tenancy fix gets focused security-reviewer attention).

Specifically (10 sub-tasks per EXPANDED-SCOPE §7 plan #3):
1. **ActivityEntityType union completeness verification** (post-B-3 status check; NO additions expected per survey — union already has all 32 trigger-target singular entity_types + invoice_import_batch + client + client_portal_access; `'budget'` already removed in Wave-A PR A-3)
2. **ENTITY_LABELS Record exhaustiveness verification** (post-B-3 status check; NO additions expected per survey — Record matches union 1:1)
3. **Write-site coverage sweep** — verify all CREATE/UPDATE/state-change API routes for new F1 entities call `logActivity` (lien_releases ✓ partially confirmed per survey; proposals + client_portal_access need verification)
4. **MEDIUM-1 PATCH /api/jobs tenancy fix** — add `.eq("org_id", membership.org_id)` filter to the UPDATE branch (~373; single-line fix). **Focused security-reviewer attention on THIS task per nwrp220 §8**
5. **TD-B1abis-01: resolveClientId race-catch** — catch unique-violation code `23505` from INSERT call + re-run find branch
6. **TD-B1abis-02: idx_clients_full_name_trgm migration 00108** — GIN trigram index on `clients.full_name` for autocomplete perf
7. **W.1 listener unflag** — env-var addition `NEXT_PUBLIC_AUTH_STATE_LISTENER=true` in Vercel Production + Preview (observation window status: B-1b shipped 2026-05-18; today 2026-05-26 = 8 days = past 1-week minimum; B-2a/B-2b/B-3 all shipped without auth-state-change incidents)
8. **F-J + F-K NaN guards** — `Number.isFinite()` defensive guards in WI-013 + WI-001 validators
9. **F-D WI-013 jobs lookup rationale comment** — inline header comment explaining intentional direct-filter omission for diagnostic clarity
10. **F-A client-pii-not-embedded regex case-insensitivity fix** — add `i` flag to 4 patterns (WILDCARD_PATTERN, ALIAS_WILDCARD, EMAIL_PATTERN, PHONE_PATTERN)

**Out of scope (deferred):**
- No new entity_type union members beyond what B-3 already added (survey confirmed)
- No RLS changes (DEF-WC-1 + DEF-WC-3 shipped in B-3)
- No new trigger functions or audit-log mechanism changes (B-3 trigger is the canonical safety net)
- No PostgREST FK citation changes (no embedded selects in B-4 deliverables)
- B-4 does NOT extend ActivityAction union (no new actions required; `'created'`/`'updated'`/`'status_changed'`/`'deleted'`/`'revoked'`/`'acknowledged'` cover all write-site needs)
- B-4 does NOT touch the 32-table soft-delete trigger (B-3 canonical)
- Owner Portal UI / B-5 webhook / B-6 cost-code reseed / B-7 RB seed — all out of scope for B-4

**This is the payoff of the tiering (per nwrp220 §5).** Lean PROCESS per task; not fewer tasks. 10 sub-tasks remain in scope; 4-reviewer plan-review iter-1 instead of 7; ONE iter cycle target; NO pre-design landmine audit (B-4 is additive cleanup, not security).
</domain>

<decisions>
## Implementation Decisions

### Pre-flight survey findings (per nwrp220 §9 "confirm against current state")

- **D-01:** ActivityEntityType union at `src/lib/activity-log.ts:33-82` ALREADY contains all 32 trigger-target singular entity_types post-B-3 (plus invoice_import_batch + client + client_portal_access). Survey verified line-by-line. **No additions needed for Task 1.** The EXPANDED-SCOPE §7 plan #3 first bullet ("add `lien_releases`, `proposals`, `client_portal_access`; remove `budget`") is OBSOLETE — those additions happened in B-2a (client_portal_access) + B-3 (singular `lien_release`, `proposal`) + Wave-A PR A-3 (budget removed). **Task 1 becomes verification-only.**

- **D-02:** ENTITY_LABELS Record at `src/lib/audit/action-labels.ts:30-89` ALREADY contains 1:1 entries matching ActivityEntityType union (Record exhaustiveness preserved post-B-3). Survey verified line-by-line. **No additions needed for Task 2.** Same situation as D-01.

- **D-03:** ACTION_LABELS Record post-B-2a/B-2b includes `'revoked'` (B-2a) + `'acknowledged'` (B-2b). No new actions needed for B-4 deliverables.

- **D-04:** MEDIUM-1 PATCH /api/jobs surface VERIFIED at `src/app/api/jobs/route.ts` lines ~373 (UPDATE statement: `.from("jobs").update(patch).eq("id", body.id).is("deleted_at", null)` — missing `.eq("org_id", membership.org_id)`). Single-line fix.

- **D-05:** resolveClientId race-catch surface VERIFIED at `src/app/api/jobs/route.ts` lines ~67-78 (INSERT with `insertError` check that throws 500). Race-catch adds `error.code === '23505'` branch that re-runs the find with same name parameters and returns the resolved id.

- **D-06:** No existing `idx_clients_full_name_trgm` migration found. Survey confirmed `pg_trgm` extension active (per migrations 00052 + 00073 using `gin_trgm_ops`). Migration 00108 ships the index.

- **D-07:** W.1 listener wiring at `src/hooks/use-current-role.ts` confirmed — env-flag gating present (early return if `NEXT_PUBLIC_AUTH_STATE_LISTENER !== 'true'`). Observation window status: 8 days post-B-1b ship (2026-05-18 → 2026-05-26); past 1-week minimum; B-2a/B-2b/B-3 chain shipped through this window with smoke baseline preserved (11/13).

- **D-08:** B-1b QA F-* finding locations VERIFIED:
  - F-J: `src/lib/knowledge-graph/validators/wi-013-multi-job-allocation.ts:49-54` (NaN guard on `allocation.amount`)
  - F-K: `src/lib/knowledge-graph/validators/wi-001-inline-budget-context.ts:101-105` (NaN guard on `invoice.total_amount`)
  - F-D: `src/lib/knowledge-graph/validators/wi-013-multi-job-allocation.ts:68-72` (jobs lookup; rationale comment needed)
  - F-A: `src/lib/knowledge-graph/validators/client-pii-not-embedded.ts:40-46` (4 patterns; case-sensitivity fix)

### Task 1 + Task 2 disposition (no-op via prior plans)

- **D-09:** Task 1 (ActivityEntityType union extension) deliverable: **verification commit-body language** documenting the survey findings — "Union completeness verified post-B-3; no source changes needed." Counted as work because it requires deliberate confirmation that no entity-type drift has emerged between B-3 ship and B-4 dispatch.

- **D-10:** Task 2 (ENTITY_LABELS Record exhaustiveness) deliverable: same verification approach as D-09. The TypeScript compile would have flagged any drift; verifying `npx tsc --noEmit` clean is the falsifiable check.

- **D-11:** B-4-SUMMARY.md §-Task-1+Task-2 status reads: "VERIFIED — no source changes required" with explicit code-reading evidence cited.

### Task 3 — Write-site coverage sweep methodology

- **D-12:** Sweep targets every CREATE/UPDATE/state-change API route for "new F1 entities" — defined per EXPANDED-SCOPE §1 + survey as: `clients` (✓ Slice-1 verified at jobs/route.ts:84-95), `lien_releases` (partial confirmation per survey at lien-releases/bulk/route.ts:119 + [id]/route.ts:117 + [id]/upload/route.ts:136), `proposals` (NEEDS VERIFICATION at execute), `client_portal_access` (NEEDS VERIFICATION — B-2a admin revocation route should call logActivity).

- **D-13:** Falsifiability per nwrp220 §24: Task 3 AC = "grep `logActivity` against `src/app/api/{lien-releases,proposals,owner-portal,clients}/**/route.ts`; every CREATE/UPDATE/state-change handler matches OR has an explicit rationale comment for skipping." Evidence: grep output verbatim in SUMMARY.

- **D-14:** If sweep finds a gap (route does CREATE/UPDATE but doesn't call logActivity), executor adds the logActivity call inline as part of Task 3 (NOT a separate task). Estimate: 0-3 gaps per survey; ~2 lines per gap.

### Task 4 — MEDIUM-1 fix + focused security-reviewer

- **D-15:** Single-line fix: add `.eq("org_id", membership.org_id)` to the UPDATE chain at jobs/route.ts:~373. **Falsifiability:** Task 4 AC = "PATCH /api/jobs UPDATE branch includes `.eq('org_id', membership.org_id)`; integration test confirms cross-org PATCH attempt fails with non-200 OR returns 0 rows updated."

- **D-16:** Focused security-reviewer dispatch per nwrp220 §8 — `security-reviewer` agent reviews ONLY Task 4 (this single-route fix), NOT the full plan. Verdict is "is this fix correct + sufficient for the cross-tenant defense-in-depth concern" — narrow scope, fast review.

- **D-17:** Cross-tenant probe (similar shape to AC-B3-05 B-2a Q3 precedent but narrower): post-fix, attempt PATCH /api/jobs from authenticated org_B session with org_A job_id payload. Expected: rejected (404 OR 0 rows updated) due to org_id filter blocking the row from being found.

### Task 5 — TD-B1abis-01 race-catch

- **D-18:** Implementation: wrap the existing INSERT-then-throw block at jobs/route.ts:67-78 with `try { insert } catch (e: any) { if (e.code === '23505') { return resolveByFind(); } throw e; }` pattern. Re-run the find branch returns the resolved client_id.

- **D-19:** Integration test (1-2 cases): two concurrent identical-name find-or-create requests; second hits 23505 and re-finds; both return the SAME client_id; UX surface returns 200, not 500.

### Task 6 — TD-B1abis-02 trgm index migration

- **D-20:** Migration 00108: `CREATE INDEX IF NOT EXISTS idx_clients_full_name_trgm ON public.clients USING gin (full_name gin_trgm_ops) WHERE deleted_at IS NULL;` + .down.sql `DROP INDEX IF EXISTS idx_clients_full_name_trgm;`. Idempotent via IF NOT EXISTS / IF EXISTS.

- **D-21:** Verification: `EXPLAIN ANALYZE SELECT id, full_name FROM public.clients WHERE org_id = '<test_org>' AND full_name ILIKE '%test%' AND deleted_at IS NULL LIMIT 10` — confirm index used (`Bitmap Index Scan on idx_clients_full_name_trgm` or `Bitmap Heap Scan` referencing trgm).

### Task 7 — W.1 listener unflag (conditional)

- **D-22:** Observation window status confirmed: 8 days post-B-1b ship; past 1-week minimum per EXPANDED-SCOPE §11 line 432. B-2a/B-2b/B-3 chain shipped through the window with smoke baseline preserved (11/13). No auth-state-change incidents flagged in QA reviews. **Recommendation: unflag in B-4** per nwrp220 §17 directive ("conditional, observation-window dependent — confirm window status") — window status confirms unflag-eligible.

- **D-23:** Deliverable: `vercel env add NEXT_PUBLIC_AUTH_STATE_LISTENER=true production` + `vercel env add NEXT_PUBLIC_AUTH_STATE_LISTENER=true preview`. NOT a code change. Verification gate: Sentry shows no auth-state-change error rate spike during 7 days post-unflag.

- **D-24:** Rollback path (if regression surfaces): `vercel env rm NEXT_PUBLIC_AUTH_STATE_LISTENER production && preview` + redeploy. No code change to revert.

### Tasks 8-10 — B-1b QA carry-forwards

- **D-25:** Task 8 (F-J + F-K NaN guards): add `if (!Number.isFinite(<val>)) { violations.push({ code: 'wi-XXX-amount-not-finite', ... }); continue; }` guards at the verified line numbers. 2 unit test cases per validator (1 NaN input case + 1 Infinity input case). ~4 lines per fix.

- **D-26:** Task 9 (F-D rationale comment): pure docs change at wi-013-multi-job-allocation.ts:68-72. Inline comment block explaining the validator's intentional direct-filter omission for diagnostic clarity (validator must SEE cross-tenant rows to emit `wi-013-allocation-cross-tenant` rather than `job-not-found`). ~6 lines of comment.

- **D-27:** Task 10 (F-A regex case-sensitivity): add `i` flag to 4 regex patterns at client-pii-not-embedded.ts:40-46. 4-char fix (per pattern: append `i` to closing `/`). 2 unit test cases (uppercase `CLIENTS(...)` pattern + mixed-case `Clients(email)` pattern; both should match post-fix).

### Reviewer scope (per nwrp220 §6)

- **D-28:** **Plan-review iter-1 = 4 reviewers (lean Tier-2):**
  - **spec-checker** — falsifiable AC tracing; verify Task 3 write-site sweep AC is real evidence-based (grep/test), not assertion
  - **custodian** — planning tree + commit chain + Slice-2 ledger surface
  - **database-reviewer** — migration 00108 trgm index + Task 5 race-catch pattern correctness
  - **ai-logic-tester** — entity_type exhaustiveness verification (Task 1+2) + Tasks 8-10 validator correctness (entity_type-related domain)
  - **PLUS focused security-reviewer dispatch on Task 4 ONLY** (narrow scope; not whole plan)
  - **DROP** multi-tenant-architect + rls-auditor (B-4 doesn't touch RLS / tenancy beyond the narrow Task 4 — covered by focused security-reviewer)

- **D-29:** Target ONE iter cycle per nwrp220 §7. B-4 is independent small fixes, not interdependent security design; shouldn't need iter-2 unless something real surfaces.

### Cost discipline (per nwrp220 §22)

- **D-30:** Per-plan halt gate **$50** (Rule 7d). B-4 estimate $15-25 lean. If projects past $50 mid-author or mid-execute → halt + surface (unlikely for cleanup work, but the gate stays).

- **D-31:** Slice-2 ledger surface: pre-B-4 ~$207-285 of $400; B-4 est $15-25; post-B-4 projection ~$222-310. Comfortable margin for B-5-B-7.

### halt_after + GATE B-4 (per nwrp220 §26)

- **D-32:** halt_after: true. **GATE B-4 lighter than B-2a/B-3** (not security GATE). Jake reviews:
  - Task 3 write-site coverage is REAL (logActivity actually wired, not just typed)
  - Task 4 org_id filter verified (post-fix cross-tenant probe blocks)
  - No regressions in smoke baseline (≤2 failures matching TD-WE-03 set)
  - Test suite passes (existing failures not newly introduced)

- **D-33:** Quicker GATE per nwrp220 §26. Surface PLAN + iter-1 findings for review; lean expected fast. Do NOT auto-/nx per halt_after: true.

### Execute-phase commit posture (per nwrp220 §1 + hook chore live)

- **D-34:** All B-4 execute-time commits use the new `Execute-Phase: B-4-Task-N` footer (per hook edit `6c8085b`). NO `--no-verify` bypass needed (the hook recognizes the marker + skips qa-freshness for execute-phase commits while preserving fail-closed for ship commits).

- **D-35:** Commit body template for execute commits:
  ```
  <type>(stage-f1-wave-b-slice-2): B-4 Task <N> — <description>
  
  <body>
  
  Execute-Phase: B-4-Task-<N>
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

### Frontmatter (mandated fields per nwrp152 + nwrp216 §3 REFRAME)

- **D-36:** PLAN frontmatter sets:
  - `plan: B-4`
  - `plan-name: activity-log-verification-write-site-sweep-carry-forward-cleanup`
  - `threat_model_severity: low`
  - `halt_after: true`
  - `requires_smoke: true`
  - `autonomous: true`
  - `status: AUTHORED — PENDING PLAN-REVIEW ITER-1`
  - `depends_on: [B-2a, B-2b, B-3]` (all shipped)
  - `sequence.before: B-5` (independent; lean Tier-2 vs B-5's full HIGH webhook surface)
  - `sequence.parallel_execute_ok: false` (sequential; though B-4+B-6 could in theory parallel if needed later — Rule 5 intersection check would dispatch separately)
  - `acceptance-criteria-target: ~12 falsifiable ACs (10 sub-tasks × ~1 AC each + 2 verification-tasks)`
  - `qa_reviewers: [spec-checker, custodian, database-reviewer, ai-logic-tester, security-reviewer-task-4-only]`
  - `source_decisions: [EXPANDED-SCOPE §7 plan #3 + §11 ACs + nwrp220 lean Tier-2 + nwrp200/202/166/172 carry-forward distribution]`

### Files modified (preliminary; plan-author finalizes at iter-1)

- **D-37:** `src/app/api/jobs/route.ts` (UPDATE — Task 4 `.eq("org_id", ...)` filter + Task 5 race-catch around line 67-78)

- **D-38:** `src/lib/knowledge-graph/validators/wi-013-multi-job-allocation.ts` (UPDATE — Task 8 F-J NaN guard + Task 9 F-D rationale comment)

- **D-39:** `src/lib/knowledge-graph/validators/wi-001-inline-budget-context.ts` (UPDATE — Task 8 F-K NaN guard)

- **D-40:** `src/lib/knowledge-graph/validators/client-pii-not-embedded.ts` (UPDATE — Task 10 F-A regex `i` flag × 4 patterns)

- **D-41:** `supabase/migrations/00108_b4_clients_full_name_trgm_index.sql` + `.down.sql` (NEW — Task 6 trgm index)

- **D-42:** `src/lib/types/database.types.ts` (REGEN — migration 00108 adds index metadata; might or might not surface in types)

- **D-43:** Test files (new + updated):
  - `__tests__/validators/wi-013.test.ts` (UPDATE — add 2 F-J cases)
  - `__tests__/validators/wi-001.test.ts` (UPDATE — add 2 F-K cases)
  - `__tests__/validators/client-pii-not-embedded.test.ts` (UPDATE — add 2 F-A cases)
  - `__tests__/api/jobs.test.ts` (UPDATE or NEW — add Task 4 + Task 5 integration tests if test infrastructure permits)

- **D-44:** Vercel env vars (Task 7 conditional ship): `NEXT_PUBLIC_AUTH_STATE_LISTENER=true` in Production + Preview environments

- **D-45:** Documentation:
  - `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-4-SUMMARY.md` (NEW)
  - `.planning/MASTER-PLAN.md` §12 (UPDATE — Slice-2 progress 3 of 7 → 4 of 7) + §11 (UPDATE — mark TD-B1abis-01, TD-B1abis-02 as CLOSED via B-4 ship + W.1 listener unflag observation completed; TD-WB-LISTENER-UNFLAG closure)

</decisions>

<canonical_refs>
## Canonical References

- **EXPANDED-SCOPE.md** at `.planning/expansions/stage-f1-knowledge-graph-auth-wave-b-slice-2-EXPANDED-SCOPE.md` (RE-APPROVED 2026-05-21):
  - §7 plan #3 (lines 335-346) — full B-4 canonical scope with 10 sub-tasks
  - §11 line 419-420 (B-4 entity_type + MEDIUM-1 ACs)
  - §11 line 430-432 (B-4 TD-B1abis-01 + TD-B1abis-02 + W.1 ACs)
- **MASTER-PLAN.md** §12 Slice-2 progress (3 of 7 post-B-3 ship); §11 carry-forward TDs (TD-B1abis-01, TD-B1abis-02, TD-WB-LISTENER-UNFLAG, MEDIUM-1)
- **B-1b QA report** at `.planning/qa-runs/2026-05-18-1230-wave-b-b1b-qa-report.md` — F-J/F-K/F-D/F-A finding locations
- **B-3-PLAN.md** + B-3-SUMMARY.md — entity_type singular CASE mapping context (Tasks 1+2 verification)
- **CLAUDE.md** Workflow posture Rules 1-9 — Rule 7d per-plan halt gate; Rule 8(a) hook fail-closed posture (now relaxed for execute-phase commits via TD-NW-HOOK-EXECUTE-PHASE-DETECT closure)
- **nwrp220** — B-4 dispatch directive with lean Tier-2 reviewer scope + focused security-reviewer on Task 4

</canonical_refs>

<code_context>
## Code Context

### Current state (verified via survey)

- **ActivityEntityType union** at `src/lib/activity-log.ts:33-82`: 32+ entries; all 32 trigger-target singular forms + 3 extras (invoice_import_batch, client, client_portal_access). VERIFIED COMPLETE.
- **ENTITY_LABELS Record** at `src/lib/audit/action-labels.ts:30-89`: 1:1 with union (Record exhaustiveness preserved). VERIFIED COMPLETE.
- **ACTION_LABELS Record**: includes revoked + acknowledged (B-2a + B-2b additions). No B-4 changes needed.
- **MEDIUM-1 surface** at `src/app/api/jobs/route.ts:~373`: UPDATE statement missing `.eq("org_id", membership.org_id)`. Single-line fix.
- **resolveClientId race surface** at `src/app/api/jobs/route.ts:~67-78`: INSERT-then-throw pattern lacks 23505 catch.
- **No existing `idx_clients_full_name_trgm`**: Migration 00108 ships it.
- **W.1 env-flag** at `src/hooks/use-current-role.ts`: early-return gate present. Observation window 8 days; eligible for unflag.
- **Validator file paths**: `src/lib/knowledge-graph/validators/{wi-001-inline-budget-context,wi-013-multi-job-allocation,client-pii-not-embedded}.ts`. F-J/F-K/F-D/F-A line numbers verified per B-1b QA report.
- **Existing test infrastructure**: `__tests__/validators/{wi-001,wi-013,client-pii-not-embedded}.test.ts` (6+7+10 cases respectively). Task 8+10 unit tests extend these files.

### Files B-4 modifies (preliminary; plan-author finalizes at iter-1)

See D-37..D-45 above.

### Verification helpers

- **Task 1+2 verification**: `npx tsc --noEmit` clean (Record exhaustiveness enforced by compile)
- **Task 3 write-site sweep**: grep across `src/app/api/{lien-releases,proposals,owner-portal,clients}/**/route.ts` for `logActivity` calls; per-route coverage table in SUMMARY
- **Task 4 cross-tenant probe**: integration test pattern (similar shape to AC-B3-05 but for jobs UPDATE only)
- **Task 5 race-catch**: integration test with 2 concurrent identical-name find-or-create
- **Task 6 trgm index**: EXPLAIN ANALYZE on representative `/api/clients?search=` query
- **Task 7 W.1 unflag**: Sentry status (7-day observation post-unflag)
- **Tasks 8-10**: unit tests added to existing validator test files
</code_context>

<specifics>
## Specifics

### Tier-2 reviewer scope (per nwrp220 §6)

| Reviewer | Scope | Rationale |
|----------|-------|-----------|
| spec-checker | All 12 ACs (10 sub-tasks + 2 verification) | Falsifiable AC tracing; flag any text-only ACs that need evidence-based verification |
| custodian | Planning tree + commit chain + Slice-2 ledger | Standard hygiene gate |
| database-reviewer | Migration 00108 (Task 6 trgm index) + Task 5 race-catch SQL pattern | Postgres correctness; EXPLAIN ANALYZE verification |
| ai-logic-tester | Tasks 1+2 (entity_type union/Record exhaustiveness verification) + Tasks 8-10 (validator domain — NaN guards + regex + rationale comment) | entity_type singular CASE mapping is ai-logic's domain post-B-3; validator F-* fixes are ai-logic's surface |
| security-reviewer (NARROW — Task 4 only) | Single-task review: MEDIUM-1 PATCH /api/jobs `.eq("org_id", ...)` fix correctness + cross-tenant probe AC | Narrow security touch; doesn't warrant full multi-tenant + rls-auditor scope |
| **DROPPED**: multi-tenant-architect, rls-auditor | — | B-4 doesn't touch RLS, tenancy beyond Task 4, or auth surfaces |
| **DROPPED**: design-pushback | — | No UI surface |
| **DROPPED**: data-migration-safety | — | Migration 00108 is index-only, backfill-free, IF NOT EXISTS idempotent — database-reviewer covers |

### Threat model

**LOW** per EXPANDED-SCOPE §7 plan #3 line 346: "additive type extension + write-site sweep + one application-layer defense-in-depth fix + one bounded-retry catch + one trigram index migration + one env-var addition + 2 trivial NaN guards + 1 header comment + 4-character regex flag."

Single tenancy-adjacent fix (Task 4 MEDIUM-1) gets focused security-reviewer attention. The rest is LOW-threat cleanup.

### Cost trajectory expected

- iter-1 plan-author + 4-reviewer dispatch: ~$8-12
- iter-2 (if needed; unlikely per nwrp220 §7): ~$5-8 reserve
- /nx execute (10 sub-tasks): ~$10-15
- /nightwork-qa (lean Tier-2; 4-reviewer rerun + 1 focused security-reviewer on Task 4): ~$5-8
- B-4 total: ~$23-43 (compared to $15-25 estimate band; lean cleanup but 10 tasks adds incremental cost vs 4-task lean plans)

Slice-2 ledger post-B-4 projection: ~$230-328 of $400 ceiling. Comfortable margin.

</specifics>
