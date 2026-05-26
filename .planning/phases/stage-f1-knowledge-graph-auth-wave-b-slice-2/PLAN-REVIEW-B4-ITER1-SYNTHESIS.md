# Plan-review iter-1 SYNTHESIS — B-4

**Plan reviewed:** `B-4-PLAN.md` commit `55f0a42` → corrected inline (commit pending)
**Synthesis date:** 2026-05-26
**Threat model:** LOW (lean Tier-2 cleanup per nwrp220)
**Authorization chain:** nwrp220 (B-4 dispatch directive; 4-reviewer lean Tier-2 + focused security-reviewer on Task 4; ONE-iter-cycle target; NO pre-design landmine audit)
**Overall verdict:** **READY FOR JAKE GATE B-4** — 4 reviewers PASS; 1 reviewer NEEDS-WORK with 3 surgical PLAN-text corrections applied inline (matches nwrp220 §7 ONE-iter-cycle target)

---

## 1. Reviewer scope executed (lean Tier-2 per nwrp220 §6)

| # | Reviewer | Iter-1 verdict | Disk artifact |
|---|----------|----------------|---------------|
| 1 | spec-checker | **PASS** (12 ACs falsifiable; EXPANDED-SCOPE coverage complete; 1 NOTE: Task 3 has 4 confirmed proposal-route gaps not 0-3 unknown) | `PLAN-REVIEW-B4-ITER1-SPEC-CHECK.md` |
| 2 | custodian | **PASS** (planning tree + commit chain + Slice-2 ledger clean; TD closure scoping correct) | `PLAN-REVIEW-B4-ITER1-CUSTODIAN.md` |
| 3 | database-reviewer | **PASS** (1 non-blocking MUST-FIX: test file naming `__tests__/api-jobs.test.ts` flat not subdirectory) | `PLAN-REVIEW-B4-ITER1-DATABASE.md` |
| 4 | ai-logic-tester | **NEEDS-WORK** (1 BLOCKING + 2 MUST-FIX on §2.7 diff accuracy; all corrected inline) | `PLAN-REVIEW-B4-ITER1-AI-LOGIC.md` (orchestrator-written from inline content) |
| 5 | security-reviewer (NARROW — Task 4 ONLY per nwrp220 §8) | **PASS** (fix correctness verified; AC adequacy verified; defense-in-depth posture verified) | `PLAN-REVIEW-B4-ITER1-SECURITY-TASK-4.md` |

**DROPPED per nwrp220 §6:** multi-tenant-architect, rls-auditor, design-pushback, data-migration-safety. NO design-pushback needed (no UI surface).

**Disk persistence:** 5 of 5 reviewer reports persisted (ai-logic-tester report orchestrator-written from inline content per Rule 8(d)).

---

## 2. Cross-reviewer alignment (Rule 9 lens — NO disagreements)

| Finding | Reviewers aligned | Verdict |
|---------|-------------------|---------|
| Task 4 MEDIUM-1 fix correctness (uses `membership.org_id` canonical source) | security-reviewer-Task-4 + spec-checker | **ALIGNED** |
| Task 1+2 verification-only disposition appropriate post-B-3 | spec-checker + custodian + ai-logic-tester | **ALIGNED** |
| Migration 00108 trgm index correct shape + sequencing | database-reviewer + spec-checker (AC tracing) | **ALIGNED** |
| Test file naming flat convention `__tests__/api-jobs.test.ts` | database-reviewer surfaced; corrected inline | resolved |

**No Rule 9 cross-reviewer factual disagreement.** Each reviewer's surface is distinct; corrections are surgical PLAN-text edits (no design change).

---

## 3. Iter-1 findings by severity

### 3.1 BLOCKING (1 finding — applied inline; PLAN-text correction)

**ai-logic-tester BLOCKING — Task 10 regex fix would crash at runtime**

PLAN §2.7 original diff stripped `/g` flag (required by `.matchAll()` at validator runtime line 62-64 + 83) + stripped `\b` anchor + cited wrong ALIAS_WILDCARD pattern shape. Applied literally → `TypeError: String.prototype.matchAll called with a non-global RegExp argument` runtime crash.

**Inline correction APPLIED:** PLAN §2.7 Task 10 diff replaced with accurate `/g` → `/gi` (append `i`, preserve `g`); `\b` anchor preserved; ALIAS_WILDCARD shape corrected to actual `/:\s*clients?\s*\(\s*\*\s*\)/g` form. Falsifiability AC unchanged.

### 3.2 MUST-FIX (3 findings — all applied inline)

**ai-logic-tester MUST-FIX #1 — Task 8 F-J line/shape misalignment**

PLAN §2.7 Task 8 F-J cited line 49-54 + used `continue` keyword. Actual code is `.reduce()` aggregation; `continue` keyword doesn't fit. The NaN bug IS real (`NaN ?? 0 === NaN`) but fix shape needs pre-pass NaN filter, not loop iteration.

**Inline correction APPLIED:** PLAN §2.7 Task 8 F-J restated as pre-pass NaN filter pattern that fits the existing `.reduce()` control flow.

**ai-logic-tester MUST-FIX #2 — Task 8 F-K same misalignment**

Same shape problem on WI-001 at line 101-105 (priorTotal reducer + proposedTotalToDate). Pre-existing fix shape doesn't fit.

**Inline correction APPLIED:** PLAN §2.7 Task 8 F-K restated as early-return-at-validator-top + filtered-reduce pattern.

**database-reviewer MUST-FIX — Test file naming convention**

PLAN cited `__tests__/api/jobs.test.ts` (subdirectory); actual test infrastructure uses `__tests__/api-*.test.ts` (flat) per database-reviewer live check (`__tests__/api/` doesn't exist).

**Inline correction APPLIED:** PLAN §3 Tasks 4 + 5 file references updated to `__tests__/api-jobs.test.ts` (flat); §6 frontmatter mirror also updated via replace_all.

### 3.3 NOTE (3 — informational; no action required)

- **spec-checker NOTE-1:** Task 3 has 4 confirmed proposal-route gaps via live grep (not 0-3 unknown as PLAN estimated). Executor awareness; inline note added to PLAN §2.2 finalizing the count expectation. AC mechanism unchanged.
- **spec-checker W-1:** Sentry spike threshold for AC-B4-07 (W.1 listener observation) undefined; recommend anchoring numeric threshold in SUMMARY at execute time.
- **security-reviewer Task-4 NOTE:** Pre-existing SELECT pre-read pattern at jobs/route.ts:278-283 fetches by `body.id` without `.eq("org_id")` — pre-existing (NOT a B-4 finding); RLS makes safe. Could file as future TD if application-layer read-filter consistency desired. Out of B-4 scope.

### 3.4 nwrp220 §7 ONE-iter-cycle target compliance

Per nwrp220: "Target ONE iter cycle. B-4 is independent small fixes, not an interdependent security design — shouldn't need iter-2 unless something real surfaces."

The ai-logic-tester findings ARE real (would crash at runtime if not caught), BUT the corrections are surgical PLAN-text accuracy edits (no design change). Applying inline at SYNTHESIS time matches the ONE-iter-cycle target — does NOT require iter-2 reviewer re-dispatch.

This is consistent with B-3's iter-2 finalization fixes pattern (3 trivial fixes applied at SYNTHESIS time without iter-3).

---

## 4. Slice-2 ledger surface (per nwrp219 §11 ceiling $400)

### Pre-GATE-B-4 spend
| Plan | Spend | Status |
|------|-------|--------|
| B-2 iter-1 (superseded) | ~$15-20 | NEEDS-WORK; led to B-2a + B-2b split |
| **B-2a** | ~$77-98 | SHIPPED |
| **B-2b** | ~$24-28 | SHIPPED |
| **B-3** | ~$91-140 | SHIPPED |
| **Hook chore** | ~$5-7 | SHIPPED |
| **B-4 plan-author + iter-1 + finalization** | ~$10-15 | This cycle |
| **Slice-2 cumulative pre-GATE-B-4** | **~$222-308** | of $400 ceiling |
| **Remaining** | **~$92-178** | For B-4 /nx + B-5 + B-6 + B-7 |

B-4 still well within lean Tier-2 estimate band ($15-25). Plan-author iter-1 came in at ~$8-12; finalization corrections ~$2-3; total iter-1 cycle ~$10-15.

### Forward projection (post-GATE-B-4 ship)
- B-4 /nx execute (10 sub-tasks): ~$10-15
- B-4 /nightwork-qa (lean Tier-2 rerun): ~$5-8
- B-4 ship (status flip + MASTER-PLAN closure): ~$2-3
- **B-4 cumulative through ship:** ~$27-41
- **Slice-2 post-B-4-ship:** ~$249-349 of $400 ceiling
- **Remaining for B-5..B-7:** ~$51-151

B-5 fuller HIGH rigor (external webhook surface; security-reviewer load-bearing); B-6 + B-7 lean. Estimated $40-90 for the remaining 3 plans. Slice-2 likely closes ~$290-440 — at high end could push the $400 ceiling but lean Tier-2 discipline on B-6 + B-7 (per nwrp219 §11) keeps it in range.

---

## 5. Verification of B-4 deliverable readiness for GATE

### 5.1 Per nwrp220 §26 — Jake's GATE B-4 review items

| GATE B-4 item | Status | Evidence |
|---------------|--------|----------|
| Task 3 write-site coverage is REAL (logActivity actually wired, not just typed) | READY at execute | AC-B4-03 grep + per-route table in SUMMARY; spec-checker confirmed mechanism is evidence-based |
| Task 4 org_id filter verified | READY at execute | AC-B4-04 code grep + cross-tenant probe stub; security-reviewer-Task-4 confirmed fix correctness |
| No regressions in smoke baseline | READY at execute | AC-B4-12 smoke harness ≤2 failures matching TD-WE-03 set |

All 3 items have falsifiable verification mechanisms in PLAN ACs. GATE B-4 substantive review depends on execute-time evidence; PLAN provides the scaffolding.

### 5.2 Lean Tier-2 reviewer expansion if Task 4 surfaces complexity

Per nwrp220 §6: "(If any sub-task turns out to touch those [RLS/tenancy/auth], executor flags + we add the reviewer for that task only.)" — security-reviewer-Task-4 PASSED with no additional scope expansion warranted. Task 4 is structurally a single-line filter add; no RLS / tenancy / auth surface expansion.

---

## 6. Decisions for Jake at GATE B-4

### 6.1 (PRIMARY) Sign GATE B-4 / approve /nx dispatch

Per nwrp220 §26 + halt_after: true:

- **Option A — Sign GATE B-4 + authorize `/nx`:** PLAN is reviewer-verified + iter-1 corrections applied inline; 4-reviewer lean Tier-2 PASSED with surgical PLAN-text fixes; security-reviewer-Task-4 confirmed defense-in-depth posture. Ready for /nx execute under calibrated hook (Execute-Phase footer; no `--no-verify`).
- **Option B — Route back for additional revision:** Specific iter-2 changes if Jake disagrees with any inline correction or wants additional scope.
- **Option C — Halt for re-scope:** Cost trajectory or scope concern (unlikely; on-budget).

**Recommended (executor's read):** **Option A — Sign GATE B-4 + authorize `/nx`.** All reviewer findings addressed; PLAN structurally complete; Execute-Phase footer pattern live; lean Tier-2 discipline preserved.

### 6.2 (SECONDARY) W.1 listener unflag observation window status

Per CONTEXT D-22 + PLAN §1.7: 8 days post-B-1b ship (2026-05-18 → 2026-05-26); past 1-week minimum per EXPANDED-SCOPE §11 line 432. B-2a/B-2b/B-3 ship chain had no auth-state-change incidents. Smoke baseline preserved.

**Recommendation:** Task 7 ships W.1 unflag in B-4 per nwrp220 §17 directive. If Jake wants to defer to a longer observation window, Task 7 becomes a Wave 1.1-Lite item + TD-WB-LISTENER-UNFLAG stays open.

### 6.3 (TERTIARY) Spec-checker W-1: Sentry threshold for AC-B4-07

Sentry "no spike" threshold currently undefined in AC-B4-07. Recommend anchoring at execute time in B-4-SUMMARY.md (e.g., "Sentry auth-state-change error count < 5 events/day during 7-day post-unflag observation; spike threshold = 3× baseline").

---

## 7. Artifacts surfaced for GATE B-4 review

### 7.1 Primary
- **`B-4-PLAN.md`** (commit `55f0a42` + iter-1 finalization corrections pending commit) — 12 ACs; 10 sub-tasks; lean Tier-2

### 7.2 Iter-1 audit trail (disk-persisted)
- This SYNTHESIS — `PLAN-REVIEW-B4-ITER1-SYNTHESIS.md`
- `PLAN-REVIEW-B4-ITER1-SPEC-CHECK.md` (spec-checker — PASS)
- `PLAN-REVIEW-B4-ITER1-CUSTODIAN.md` (custodian — PASS)
- `PLAN-REVIEW-B4-ITER1-DATABASE.md` (database — PASS + 1 MUST-FIX applied)
- `PLAN-REVIEW-B4-ITER1-AI-LOGIC.md` (ai-logic-tester — NEEDS-WORK + 3 corrections applied; orchestrator-written from inline content)
- `PLAN-REVIEW-B4-ITER1-SECURITY-TASK-4.md` (security-reviewer narrow scope — PASS)

### 7.3 Iter-1 corrections applied inline (committed alongside SYNTHESIS)
1. PLAN §2.7 Task 8 F-J restated as pre-pass NaN filter (no `continue` keyword on `.reduce()`)
2. PLAN §2.7 Task 8 F-K restated as early-return-at-top + filtered-reduce
3. PLAN §2.7 Task 10 regex corrected to preserve `/g` flag + `\b` anchor + ALIAS_WILDCARD shape (NOT crash at runtime)
4. PLAN §3 + §6 test file naming corrected to flat `__tests__/api-jobs.test.ts`
5. PLAN §2.2 Task 3 gap count clarified to 4 confirmed proposal-route gaps per spec-checker live grep
6. PLAN frontmatter status: AUTHORED → PLAN-REVIEW ITER-1 COMPLETE — PENDING JAKE GATE B-4 REVIEW

---

## 8. halt_after: true contract per nwrp220 §26

**HALTING per contract.** Surface to Jake. Do NOT auto-proceed to /nx.

Jake's GATE B-4 review questions:
1. Sign GATE B-4 + authorize `/nx`? (executor recommends YES)
2. W.1 listener unflag observation window OK to ship in B-4 (8 days; past 1-week minimum)?
3. AC-B4-07 Sentry threshold — anchor at execute time, OR specify now?

Quicker GATE per nwrp220 §26 ("lighter than B-2a/B-3 — it's not a security GATE").

**Do NOT auto-proceed.** Tier-2 halt per nwrp220 §28.

---

**End of PLAN-REVIEW-B4-ITER1-SYNTHESIS.md.**
