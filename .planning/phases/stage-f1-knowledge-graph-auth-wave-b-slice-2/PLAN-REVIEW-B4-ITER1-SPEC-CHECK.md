# Plan-review iter-1 - spec-checker - B-4

**Reviewer:** spec-checker
**Date:** 2026-05-22
**Plan:** B-4 - activity-log-verification-write-site-sweep-carry-forward-cleanup
**PLAN source:** B-4-PLAN.md (933 lines)
**Rigor:** lean Tier-2 per nwrp220 s6

---

## 1. Acceptance criteria - falsifiability audit

| # | Criterion | Verdict | Evidence | Falsifiable? |
|---|-----------|---------|----------|--------------|
| AC-B4-01 | ActivityEntityType union = 35 members; npx tsc --noEmit clean | COVERED | src/lib/activity-log.ts:32-82 read live; 35-member union confirmed. tsc check concrete. | YES |
| AC-B4-02 | ENTITY_LABELS Record exhaustiveness via compile | COVERED | src/lib/audit/action-labels.ts:30-89 read live; 35 entries 1:1 with union. TypeScript-enforced - drift = compile error. | YES |
| AC-B4-03 | Write-site sweep: every CREATE/UPDATE/state-change handler has logActivity OR rationale comment; per-route table in SUMMARY | COVERED (executor-awareness caveat F-1) | Proposals routes grepped live: 0 logActivity matches across 4 routes. clients/route.ts GET-only. | YES |
| AC-B4-04 | PATCH /api/jobs UPDATE chain has .eq org_id filter; cross-tenant probe test | COVERED | src/app/api/jobs/route.ts:373-377 read live; missing filter confirmed. | YES |
| AC-B4-05 | TD-B1abis-01: concurrent identical-name find-or-create returns same client_id; no 500 | COVERED | src/app/api/jobs/route.ts:67-78 read live; no 23505 catch. | YES |
| AC-B4-06 | TD-B1abis-02: idx_clients_full_name_trgm exists; EXPLAIN ANALYZE GIN index | COVERED | Migration 00108 absent pre-execute. M-01/M-02/M-03 live-SQL verification. | YES |
| AC-B4-07 | W.1: env-var Production + Preview; Sentry 7-day no-spike | COVERED - split gate | vercel env ls grep concrete. 7-day Sentry deferred criterion. See W-1. | YES |
| AC-B4-08 | F-J NaN guard WI-013; violation code wi-013-allocation-amount-not-finite | COVERED | Target file verified against B-1b QA report. | YES |
| AC-B4-09 | F-K NaN guard WI-001; violation code wi-001-invoice-amount-not-finite | COVERED | Same shape as AC-B4-08. | YES |
| AC-B4-10 | F-D rationale comment WI-013; grep shows INTENTIONAL/diagnostic/cross-tenant | COVERED | Grep mechanism concrete. | YES |
| AC-B4-11 | F-A regex i flag; uppercase/mixed-case unit tests | COVERED | 4-pattern fix + 2 test cases. | YES |
| AC-B4-12 | Smoke harness <=2 failures matching TD-WE-03 set; no new B-4 failures | COVERED | Smoke mechanism defined in PLAN. | YES |

All 12 ACs carry concrete verification mechanisms. No text-only assertions found.

---

## 2. EXPANDED-SCOPE s11 AC coverage

| EXPANDED-SCOPE AC | Line | PLAN AC | Verdict |
|---|---|---|---|
| B-4 entity_type union + ENTITY_LABELS extended; write-site coverage adds logActivity | 419 | AC-B4-01 + AC-B4-02 + AC-B4-03 | COVERED |
| B-4 MEDIUM-1: PATCH /api/jobs has .eq org_id filter | 420 | AC-B4-04 | COVERED |
| B-4 TD-B1abis-01: resolveClientId catches 23505 + re-finds; no 500 | 430 | AC-B4-05 | COVERED |
| B-4 TD-B1abis-02: idx_clients_full_name_trgm + EXPLAIN ANALYZE GIN | 431 | AC-B4-06 | COVERED |
| B-3 or B-4 W.1 unflag: env-var Production + Preview; Sentry 7-day | 432 | AC-B4-07 | COVERED |

All 5 EXPANDED-SCOPE s11 B-4 ACs covered. No gaps.

---

## 3. Tasks 1+2 verification-only disposition

Claim: union and Record complete post-B-3; no source changes needed.

Live repo spot-check:
- src/lib/activity-log.ts:32-82 -- 35 members present including lien_release, proposal, client_portal_access. budget absent (lines 38-43 confirm Wave-A PR A-3 removal).
- src/lib/audit/action-labels.ts:30-89 -- 35 entries 1:1 with union. TypeScript enforces exhaustiveness.

Disposition: CORRECT. Tasks 1+2 verification-only is appropriate.

Recommendation: bundle Tasks 1+2 verification into Task 3 commit body per R-4 mitigation path (b) rather than empty commits.

---

## 4. nwrp220 s26 GATE review - substantive verifiability

| GATE item | Substantively verifiable? | Evidence |
|---|---|---|
| Task 3 write-site coverage is real (logActivity actually wired) | YES | AC-B4-03 requires per-route disposition table with verbatim grep output. Any route missing logActivity without rationale = explicit FAIL. |
| Task 4 org_id filter verified (cross-tenant probe blocks) | YES | AC-B4-04 requires (a) code grep confirming .eq org_id in UPDATE chain AND (b) integration test that org_B PATCH on org_A job returns non-200 or 0 rows. Two independent evidence types. |
| No regressions in smoke baseline | YES | AC-B4-12 explicit gate. |

All three GATE items substantively verifiable.

---

## 5. nwrp220 s10-20 sub-task order vs PLAN task order

EXPANDED-SCOPE s7 plan #3 lists 10 sub-tasks. PLAN s3 tasks 1-10 match 1:1 in same order. Task 11 (SUMMARY) correctly last.

Order match: CONFIRMED.

---

## 6. Pre-execute state validation

| Survey claim | PLAN citation | Live verification | Result |
|---|---|---|---|
| Union has 35 members post-B-3 | s1.1 | activity-log.ts:32-82 read | CONFIRMED |
| ENTITY_LABELS has 35 entries 1:1 | s1.2 | action-labels.ts:30-89 read | CONFIRMED |
| MEDIUM-1 missing .eq org_id at route.ts:373 | s1.4 + D-04 | jobs/route.ts:373-377 read; filter absent | CONFIRMED |
| resolveClientId lacks 23505 catch at route.ts:67-78 | s1.5 + D-05 | jobs/route.ts:67-78 read; bare throw confirmed | CONFIRMED |
| Migration 00108 not yet present | s1.6 | glob supabase/migrations/00108*.sql -- no results | CONFIRMED |
| proposals routes have no logActivity | s1.3 + D-12 | grep proposals/** -- 0 matches across all 4 routes | CONFIRMED (gap real) |
| clients/route.ts GET-only (no write gap) | D-12 implicit | clients/route.ts:40+ read -- only GET handler | CONFIRMED |

---

## 7. Findings

### MUST-FIX (executor awareness - not plan-blocking)

**F-1: Task 3 gap count is 4 proposal routes, not 0-3 estimated**

PLAN s2.2 R-1 estimates 0-3 gaps. Live grep confirms all 4 proposal routes lack logActivity:

- src/app/api/proposals/commit/route.ts -- creates proposal + proposal_line_items (write path, 0 logActivity)
- src/app/api/proposals/extract/route.ts -- creates document_extraction (write path, 0 logActivity)
- src/app/api/proposals/extract/[extraction_id]/reject/route.ts -- state change (0 logActivity)
- src/app/api/proposals/[proposal_id]/convert-to-po/route.ts -- state change (0 logActivity)

AC-B4-03 falsifiability is intact -- the per-route table handles this. At 4 confirmed proposal route gaps, Task 3 will require more inline fills than the plan estimated. If adding logActivity to all 4 routes pushes past the per-plan halt gate mid-execute, halt and surface per Rule 7d.

No PLAN text change required. Executor awareness at dispatch.

### WARNING

**W-1: AC-B4-07 Sentry deferred gate lacks spike threshold definition**

AC text says no auth-state-change error rate spike without defining spike. Recommend executor anchors SUMMARY entry with: (a) unflag commit timestamp, (b) Sentry baseline auth-state-change rate from prior 7-day window, (c) explicit threshold for PASS (e.g. less than 2x baseline).

**W-2: AC-B4-04 integration test may use BYPASSRLS service-role path**

PLAN R-3 acknowledges cross-tenant probe may fall back to code-review evidence if test infrastructure bypasses RLS. Security-reviewer (narrow Task 4 scope) should verify whether the integration test exercises an RLS-bound user session. Code-review evidence for .eq org_id addition is accepted as fallback per lean Tier-2 posture.

### NOTE

**N-1: __tests__/api/jobs.test.ts missing from frontmatter files_modified**

Frontmatter lines 37-48 omit __tests__/api/jobs.test.ts, which PLAN s3 Tasks 4+5 reference as requiring updates (1 test case each). Minor inconsistency. Custodian should flag.

---

## 8. Domain rules spot-check

- Drummond fixtures: N/A (no UI surface or seed data)
- Recalculate-not-increment: N/A (no running totals added)
- Multi-tenant RLS: Task 4 adds application-layer defense-in-depth filter alongside existing RLS. WI-013 diagnostic rationale (Task 9) intentionally omits org_id filter; Task 9 rationale comment makes this explicit. PASS.
- Design tokens: N/A (no UI surface)
- Audit log writes on state changes: AC-B4-03 covers. Proposal route gaps confirmed (F-1). Correctly in Task 3 scope.

---

## 9. Structured criteria block audit (per D-19)

PLAN criteria block present at lines 59-81.

| Category | Items | N/A entries | Harness layer | Verdict |
|---|---|---|---|---|
| mechanical | 5 | 0 | Layer 1 | All concrete |
| dom | 1 | 1 (N/A) | Layer 1 | Correctly N/A |
| visual | 1 | 1 (N/A) | Layer 3 | Correctly N/A |
| behavioral | 5 | 0 | Layer 2 | All concrete |
| semantic | 3 | 0 | Layer 3 | All concrete |

Block well-formed. Maps correctly to 12 ACs. No harness report yet (pre-execute, expected).

---

## Verdict

**PASS - cleared for dispatch**

All 12 ACs falsifiable with concrete verification mechanisms. All 5 EXPANDED-SCOPE s11 B-4 ACs covered. Tasks 1+2 verification-only disposition correct per live repo. Jake GATE items (Task 3 real coverage, Task 4 org_id probe, no regressions) substantively verifiable. No cross-reviewer factual disagreements (Rule 9 clean).

F-1 is executor-awareness only, not plan-blocking. The AC-B4-03 mechanism (per-route table + verbatim grep) correctly handles the larger-than-estimated gap count. Rule 7d per-plan halt gate is the live guardrail if Task 3 expands beyond estimate mid-execute.
