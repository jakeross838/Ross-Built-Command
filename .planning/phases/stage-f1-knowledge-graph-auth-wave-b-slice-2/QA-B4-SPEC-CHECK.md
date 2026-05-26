# Spec check -- B-4: activity-log-verification-write-site-sweep-carry-forward-cleanup

Audited: 2026-05-22 | Commits: 35051cc..d3848e4 (11 commits) | Auditor: claude-sonnet-4-6

---

## Structured criteria block

PLAN.md lines 59-81: well-formed criteria block with 5 categories. No criteria-absent BLOCKING applies.
Harness final report: .planning/verification/reports/ contains only .gitkeep. B-4 has no UI surface; dom/visual criteria both N/A. Criteria verified via direct code/migration inspection.

---

## Acceptance criteria

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| AC-B4-01 | ActivityEntityType union 35-member post-B-3; tsc clean | COVERED | src/lib/activity-log.ts:33-82 -- 35 members confirmed by grep; tsc EXIT 0 |
| AC-B4-02 | ENTITY_LABELS Record 35 entries exhaustive | COVERED | src/lib/audit/action-labels.ts:30-90 -- 35 entries; TS exhaustiveness enforced at tsc run |
| AC-B4-03 | 3 proposal-route fills + D-T3 rationale | COVERED | proposals/commit/route.ts:728 FILLED; extract/route.ts:258 FILLED; reject/route.ts:92 FILLED; convert-to-po/route.ts:17-26 rationale comment present |
| AC-B4-04 | .eq(org_id) added to PATCH chain; 4 static tests PASS + SKIP marker | COVERED | src/app/api/jobs/route.ts:403-408 confirmed; __tests__/api-jobs.test.ts 7 active PASS + 2 SKIP markers at lines 135+157 |
| AC-B4-05 | 23505 race-catch + re-find in resolveClientId | COVERED | src/app/api/jobs/route.ts:85-97; 3 static tests PASS; B-4-T5-RACE-CATCH-PROBE-SKIP at line 157 |
| AC-B4-06 | M-01 idx exists; M-02 gin_trgm_ops+WHERE deleted_at IS NULL; M-03 planner-flex documented | COVERED | supabase/migrations/00108:44-46 CREATE INDEX USING gin gin_trgm_ops WHERE deleted_at IS NULL; DO block 53-78 asserts M-01/M-02; M-03 seqscan acceptable per D-T6 |
| AC-B4-07 | NEXT_PUBLIC_AUTH_STATE_LISTENER=true added production+preview; 7-day Sentry gate ACTIVE | COVERED (in-flight) | Vercel env ls evidence in SUMMARY; gate IS the AC per nwrp222 §6 (2026-05-26 to 2026-06-02) |
| AC-B4-08 | WI-013 NaN/Infinity pre-pass guard; 2 new tests PASS | COVERED | wi-013-multi-job-allocation.ts:49-74; npm test 9 PASS (2 new) |
| AC-B4-09 | WI-001 NaN/Infinity early-return guard; 2 new tests PASS | COVERED | wi-001-inline-budget-context.ts:38-54; npm test 8 PASS (2 new) |
| AC-B4-10 | F-D rationale comment in WI-013 citing INTENTIONAL/diagnostic/cross-tenant | COVERED | wi-013-multi-job-allocation.ts:90-118 -- 29-line block; INTENTIONAL text at line 92 |
| AC-B4-11 | F-A regex gi flag on 4 patterns; 2 new tests PASS | COVERED | client-pii-not-embedded.ts:49-55 -- all 4 patterns /gi; npm test 12 PASS (2 new) |
| AC-B4-12 | npm test baseline preserved: 2 pre-existing failure sets only | COVERED | 3/9 lien-releases/bulk + 1/4 org_members.maybeSingle; matches deferred-items.md; all B-4 new tests PASS |
---

## Structured criteria block cross-reference

| Category | Criterion | Verdict | Evidence |
|----------|-----------|---------|----------|
| mechanical | 00108 migration exists + applies | COVERED | file present; SUMMARY M-01/M-02 LIVE |
| mechanical | 00108.down.sql exists | COVERED | SUMMARY key-files |
| mechanical | database.types.ts regenerated; tsc passes | COVERED | D-T6 CLI regen; hook block resolved honestly; tsc EXIT 0 |
| mechanical | npm run build succeeds | COVERED | SUMMARY: npm run build EXIT=0 |
| mechanical | npm test no new regressions | COVERED | AC-B4-12 |
| mechanical | All 11 commits use Execute-Phase footer | COVERED | git log 35051cc..d3848e4: 11 commits stage-f1-wave-b-slice-2 scope; 0 --no-verify |
| dom | N/A | SKIP | B-4 has no UI surface |
| visual | N/A | SKIP | B-4 has no UI surface |
| behavioral | Task 4 cross-tenant probe | PARTIAL | Static analysis PASS; live probe deferred per D-T4/R-3 (within authority; iter-1 ratified) |
| behavioral | Task 5 concurrent race probe | PARTIAL | Static analysis PASS; deferred per R-3 |
| behavioral | Task 6 trgm EXPLAIN ANALYZE | PARTIAL | M-01+M-02 PASS; M-03 seqscan at 26-row scale expected per D-T6 |
| behavioral | Task 7 Sentry no-spike | IN-FLIGHT | 7-day window active; closeable 2026-06-02 |
| behavioral | Tasks 8-10 validator unit tests | COVERED | 9+8+12=29 tests PASS |
| semantic | Task 1+2 union + Record no drift | COVERED | AC-B4-01/AC-B4-02 |
| semantic | Task 3 logActivity coverage table | COVERED | AC-B4-03; table in SUMMARY matches code |
| semantic | Task 9 F-D rationale comment | COVERED | AC-B4-10 |
---

## Spec deliverables

- [x] Migration 00108 idx_clients_full_name_trgm -- COVERED (supabase/migrations/00108_b4_clients_full_name_trgm_index.sql:44-46)
- [x] Migration 00108 down file -- COVERED (SUMMARY key-files)
- [x] database.types.ts regen -- COVERED (D-T6)
- [x] __tests__/api-jobs.test.ts created -- COVERED (9 cases PASS)
- [x] logActivity in 3 proposal routes -- COVERED (commit/route.ts:728, extract/route.ts:258, reject/route.ts:92)
- [x] D-T3 rationale comment on convert-to-po -- COVERED (convert-to-po/route.ts:17-26)
- [x] PATCH /api/jobs .eq(org_id) filter -- COVERED (jobs/route.ts:407)
- [x] resolveClientId 23505 race-catch -- COVERED (jobs/route.ts:85-97)
- [x] WI-013 NaN pre-pass guard -- COVERED (wi-013-multi-job-allocation.ts:49-74)
- [x] WI-001 NaN early-return guard -- COVERED (wi-001-inline-budget-context.ts:38-54)
- [x] F-D rationale comment WI-013 -- COVERED (wi-013-multi-job-allocation.ts:90-118)
- [x] F-A regex gi flag on 4 patterns -- COVERED (client-pii-not-embedded.ts:49-55)
- [x] 6 new unit tests (WI-013 x2 + WI-001 x2 + client-pii x2) -- COVERED
- [x] NEXT_PUBLIC_AUTH_STATE_LISTENER env-add production+preview -- COVERED (Vercel evidence in SUMMARY)
- [x] MASTER-PLAN §12+§11 TD closure updates -- COVERED (Task 11 commit d3848e4)
---

## Domain rules spot-check

- Drummond fixtures used: N/A -- B-4 has no seeded data; migration 00108 is a structural index only.
- Recalculate-not-increment honored: YES -- wi-001-inline-budget-context.ts:90-130 aggregates prior invoice totals from source rows on every call; no stored aggregate consumed.
- Multi-tenant RLS posture: PASS -- jobs/route.ts:407 adds .eq(org_id, membership.org_id). All proposal-route fills operate within already-getCurrentMembership-scoped handlers. resolveClientId race-catch re-find uses .eq(org_id, membership.org_id) at jobs/route.ts:89.
- Design tokens (no hardcoded colors): N/A -- B-4 touches no UI/CSS files.
- Audit log writes on every state change: PARTIAL -- 3 of 4 proposal state-change routes covered. convert-to-po 501 stub mutates no state; D-T3 correctly defers (phantom log entry = false evidence per CLAUDE.md audit-integrity principle).

---

## Deviations verification

| Deviation | Claim | Within authority? | Verdict |
|-----------|-------|-------------------|---------|
| D-T3-CONVERT-TO-PO-SKIP | 501 stub; no state mutation; phantom log corrupts audit trail | YES -- PLAN §2.2 line 270 explicit executor judgment authority; stub confirmed 501 zero DB mutation | ACCEPTED |
| D-T4-CROSS-TENANT-PROBE-SKIP | Live probe deferred per PLAN §5 R-3; ratified at iter-1 | YES -- R-3 in PLAN §5; SKIP marker at __tests__/api-jobs.test.ts:135 | ACCEPTED |
| D-T6-TYPES-REGEN-DISCIPLINE | MCP vs CLI regen shape difference; hook blocked MCP; CLI used | YES -- Rule 8(a) hook fail-closed; no --no-verify | ACCEPTED |
| D-T7-SENTRY-PROBE-DEFERRED-7-DAYS | 7-day window is the AC design not a deferral | YES -- nwrp222 §6 defines AC-B4-07 as observation-window AC | ACCEPTED |
| D-T8-PRE-PASS-NAN-FILTER | continue vs pre-pass corrected at iter-1 | YES -- iter-1 MUST-FIX; verified at wi-013-multi-job-allocation.ts:49-74 | ACCEPTED |
| D-T10-REGEX-APPEND-I | gi vs replace-g-with-i corrected at iter-1 | YES -- iter-1 BLOCKING; verified at client-pii-not-embedded.ts:49-55 | ACCEPTED |
---

## Findings

### BLOCKING
(none)

### WARNING
1. AC-B4-07 Sentry observation gate in-flight: 7-day window (2026-05-26 to 2026-06-02) not yet closed at audit time. Jake must verify the 3 Sentry detectors (burst >5/min; sustained >1%/5min; chronic >0/day for 3 consecutive days) were not breached. If any fires, rollback via: vercel env rm NEXT_PUBLIC_AUTH_STATE_LISTENER (per SUMMARY §Task-7 protocol). No action needed at GATE-B-4.
2. Behavioral criteria live probes deferred: Task 4 cross-tenant probe, Task 5 concurrent race, Task 6 M-03 planner path -- all satisfy via static analysis + SKIP markers only. All within authority per R-3; carry-forward to Wave 1.1-Lite. Track in deferred-items.md.

### NOTE
1. SUMMARY reports 4 PASS + 1 SKIP for Task 4 and 3 PASS + 1 SKIP for Task 5. Actual runner shows 9 of 9 PASS -- SKIP-marked tests use console.warn not throw. Count discrepancy is presentation-only; no test failure.
2. __tests__/api-jobs.test.ts flat naming is consistent with sibling api-*.test.ts files per database-reviewer iter-1 MUST-FIX rationale. No action needed.

---

## Verdict

PASS

All 12 ACs satisfied: 10 COVERED outright; AC-B4-07 in-flight per designed observation window (IS the AC not a deferral per nwrp222 §6); AC-B4-03 COVERED with correctly-within-authority D-T3 deviation. No blocking findings. 2 warnings are carry-open items already tracked. npm test baseline holds at pre-existing 2 failure sets only. tsc clean. Hook discipline: 0 --no-verify across 11 execute commits; 1 hook block resolved honestly per Rule 8(a).
