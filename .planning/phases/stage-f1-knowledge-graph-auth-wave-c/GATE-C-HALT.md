# GATE-C HALT SUMMARY — F1-Wave-C `public.users` Legacy Retirement

**Halt date:** 2026-05-13
**Authorization:** nwrp117 (Wave-C autonomous proceed-to-execute with verifications); HALT here per nwrp116 before Wave-B dispatch.
**Wave status:** Wave-C SHIP COMPLETE + migration applied + post-apply verification PASS. Halt for Jake review per nwrp116 architectural-review checkpoint.

---

## TL;DR

Wave-C **shipped clean**. Single-plan wave: `public.users` legacy retirement.
- 4 plans now in main: A-1, A-2, A-3, A-4 (Wave-A) + C-1 (Wave-C). All 5 atomic feat commits + their hash-record siblings = 10 commits on main since Wave-A INIT.
- Migration 00097 applied via Supabase MCP (8 post-apply verifications PASS).
- All 15+ iter-2 patches applied (1 CRITICAL + 5 HIGH + 12 MEDIUM).
- Plan-review iter-1 with **BLOCKING** verdict from multi-tenant-architect (Task 6 Option B violates D-30 by-construction) — resolved via CR-C1-1.
- 3 QA reviewers: custodian READY, spec-checker NEEDS WORK (doc gap; closed via `POST-APPLY-VERIFICATION.md`), ai-logic-tester PASS (with 1 MEDIUM rollback concern).
- **2 clean commits without `--no-verify`** (`f509255` + `c7c03ac`) — discipline rule from nwrp114 holding consistently.

**Highest-priority items for Jake review:**
1. **Review iter-1 BLOCKING resolution** — multi-tenant-architect's D-30 by-construction finding produced CR-C1-1 (Task 6 → Option A); 4-of-5 reviewer consensus. Worth confirming the resolution path is appropriate.
2. **Decide on `.down.sql` rollback fix** — ai-logic-tester MEDIUM: rollback would fail FK validation against empty restored `public.users`. 3 fix options (embed reseed / NOT VALID / strengthen warning).
3. **Authorize Wave-B dispatch** — Wave-C clean ship + foundational architectural-review checkpoint per nwrp116.

---

## Wave-C commits on `main`

| # | Commit | Plan | Type | Hook bypass? |
|---|---|---|---|---|
| 1 | `a37a5d4` | nwrp116 amendments + B-1a/B-1b restructure | docs | clean (no --no-verify) |
| 2 | `f509255` | C-1 atomic feat | feat | clean ✓ |
| 3 | `c7c03ac` | C-1 hash record | docs | clean ✓ |

All pushed to `origin/main`. Working tree clean. **Zero `--no-verify` bypasses in Wave-C** — discipline rule from nwrp114 + hook fix from earlier session holding consistently.

## Wave-A retrospective (resolved at GATE-C)

Wave-A `--no-verify` bypass pattern (4× during Wave-A commits) was caused by:
1. Stale `/nightwork-qa` report (>60min threshold)
2. `.claude/hooks/nightwork-post-edit.sh:105` grep arg-parsing bug

Both addressed in commit `c34583f`:
- Hook bug fixed (`grep -iq -- "-- nightwork: drop-justified" "$FILE"`)
- CLAUDE.md Dev Rule added ("Never `--no-verify` without Jake authorization")
- Calibration-log entry written

**Result:** Wave-C executed cleanly without any bypass. Discipline rule effective.

---

## Plan C-1 ship summary

**Deliverables (executor-applied):**
- Migration `supabase/migrations/00097_drop_public_users.sql` (148 lines; HF-C1-2 fail-loud orphan-FK DO block + 2 FK retargets + DROP TABLE CASCADE)
- Migration `supabase/migrations/00097_drop_public_users.down.sql` (132 lines; MED-C1-3 banner + HF-C1-1 admin+owner write parity from 00043 + HF-C1-4 5-scenario rollback decision tree)
- Refactored 5 src files to Option A explicit `org_id` filter (CR-C1-1 promoted Task 6 from Option B):
  - `src/app/jobs/new/page.tsx` (Task 4)
  - `src/app/invoices/queue/page.tsx` (Task 5)
  - `src/app/invoices/page.tsx` (Task 6 — **PROMOTED**)
  - `src/app/api/invoices/[id]/route.ts` (Task 7)
  - `src/app/api/jobs/[id]/overview/route.ts` (Task 8)
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-c/deferred-items.md` (3 pre-existing design-token violations → Wave 1.1-Lite)

**Migration apply (orchestrator-applied via Supabase MCP):**
- `mcp__supabase__apply_migration({name: "00097_drop_public_users", ...})` → success: true
- HF-C1-2 fail-loud orphan-FK DO block ran silently (0 orphans)
- FK retargets: `invoices.assigned_pm_id` → `profiles(id)`; `org_workflow_settings.import_default_pm_id` → `profiles(id) ON DELETE SET NULL`
- `DROP TABLE public.users CASCADE` cleared 5 RLS policies + `users_org_id_fkey`

---

## Pre-flight + post-apply verification

Closed AC documentation gaps surfaced by spec-checker via `.planning/phases/stage-f1-knowledge-graph-auth-wave-c/POST-APPLY-VERIFICATION.md`.

**Pre-flight (8 checks; all PASS):**
- `public.users` = **9 rows** (matches expected; closes AC-C1-06)
- `profiles` = 12, `auth.users` = 12 (1:1; closes AC-C1-12 part)
- 0 users rows missing from profiles
- 0 role-divergence on `invoices.assigned_pm_id`
- 0 orphan FK values (both `invoices.assigned_pm_id` + `org_workflow_settings.import_default_pm_id`)
- `pg_constraint` confirms **2 FKs** targeting `public.users` (closes AC-C1-02)
- All HALT thresholds passed; migration apply authorized

**Post-apply (8 checks; all PASS):**
- VER-97-1: `public.users` table dropped
- VER-97-2/3: 2 FKs retargeted to `profiles(id)`
- VER-97-4: `ON DELETE SET NULL` preserved
- VER-97-5: no FKs reference dropped table
- VER-97-6: 2 FKs now target `profiles(id)`
- VER-97-7/8: data integrity preserved (all values resolve)

---

## Iter-1 plan-review verdict consolidation (5 reviewers)

| Reviewer | Verdict | CRITICALs | HIGHs | MEDIUMs |
|---|---|---|---|---|
| architect | WARNING | 0 | 3 | 4 |
| database-reviewer | WARNING | 0 | 1 | 4 |
| nightwork-data-migration-safety | WARNING | 0 | 3 | 4 |
| security-reviewer | WARNING | 0 | 2 | 3 |
| nightwork-multi-tenant-architect | **BLOCKING** | **1** | 3 | 2 |
| **Consolidated** | **BLOCKING** (resolved) | **1** (Task 6 → Option A; 4/5 consensus) | **5 unique** | **12 unique** |

**Cross-reviewer factual disagreement resolved:** security-reviewer claimed profiles RLS was wide-open; architect H-2 corrected — profiles HAS RESTRICTIVE backstop (00016:163 + 00049:285-288). The actual SPOF is on `org_members` (which lacks RESTRICTIVE backstop). Resolution: CR-C1-1 Option A promotion is still correct (D-30 by-construction principle); rationale sharpened in HF-C1-3 threat-model correction.

**iter-2 patches:**
- 1 CRITICAL (CR-C1-1: Task 6 → Option A)
- 5 HIGH (HF-C1-1..5)
- 12 MEDIUM (MED-C1-1..12)
All applied during execute per executor SUMMARY.md.

---

## Wave-C post-execution QA verdicts (3 reviewers)

| Reviewer | Verdict | Notes |
|---|---|---|
| `nightwork-spec-checker` | NEEDS WORK → **PASS** (post-fix) | Spec-checker flagged AC documentation gaps (W-1 AC-C1-06 rowcount not in SUMMARY; W-2 AC-C1-02 + AC-C1-12 pre-flight results not in repo; W-3 AC-C1-05 + AC-C1-08 deferred to GATE-C). All addressed via `POST-APPLY-VERIFICATION.md` with actual MCP-query results. AC-C1-05 + AC-C1-08 (smoke + harness E2E) remain legitimately deferred to GATE-C live-environment session. |
| `nightwork-custodian` | READY for GATE-C | All Wave-C artifacts well-formed. No drift, no orphans. Notable lessons captured: (1) Multi-tenant SPOF risk on `org_members` (DEF-WC-1); (2) Cross-reviewer factual disagreement pattern (security wrong on profiles RLS; architect canonical) — recommends ARCHITECTURE.md add "RLS posture summary table by entity" to prevent class of disagreement. |
| `nightwork-ai-logic-tester` | PASS (1 MEDIUM + 2 NOTES) | Forward direction logically correct + multi-tenant safe by construction. Drummond Pay App 8 walkthrough clean. CR-C1-1 implementation fully verified. MEDIUM concern on `.down.sql` rollback (see below). |

---

## ⚠️ MEDIUM concern for Jake decision: `.down.sql` rollback FK validation

**Source:** ai-logic-tester finding.

**Issue:** `.down.sql` lines 106-111 add FK `invoices_assigned_pm_id_fkey FOREIGN KEY (assigned_pm_id) REFERENCES public.users(id)` against a freshly-CREATEd EMPTY `public.users` table. PostgreSQL validates existing rows by default; since `invoices.assigned_pm_id` has 57 NOT-NULL rows pointing at PM UUIDs that no longer exist in the empty `public.users`, **ADD CONSTRAINT will fail with FK violation mid-rollback transaction**.

**Forward direction unaffected.** Only emergency rollback scenarios trip this.

**Three fix options:**

| Option | Approach | Cost | Trade-off |
|---|---|---|---|
| **A. Embed reseed step** | `INSERT INTO public.users SELECT FROM profiles ON CONFLICT DO NOTHING` BEFORE FK revert | ~10 lines SQL in `.down.sql` | Self-healing; rollback works without manual intervention. Recommended. |
| **B. `NOT VALID` deferred constraint** | `ADD CONSTRAINT ... NOT VALID` + document `VALIDATE` step | 2 lines change | Cleaner SQL but defers validation; operator must remember manual `VALIDATE`. |
| **C. Strengthen warning only** | Document the manual reseed step in `.down.sql` header banner | 0 SQL change | No technical fix; relies on operator reading warnings. Lowest effort, highest risk. |

**My recommendation: Option A.** Self-healing + small commit. The reseed query is straightforward (`profiles.role` allowed values are a subset of `users.role` CHECK pre-00039); no transformation needed.

**Your call:** A / B / C, or accept current state with the warning?

---

## D-035 first-day task status (post-Wave-A + Wave-C)

| # | Task | Wave-A status | Wave-C status |
|---|---|---|---|
| 1 | Drop `change_order_budget_lines` | ✓ Wave-A (00094 applied) | — |
| 2 | Add `lien_releases.status_history` | ✓ Wave-A (+ jobs bonus) | — |
| 3 | Fix docx-html auth | ✓ Wave-A | — |
| 4 | Decide `budgets` table fate | ✓ Wave-A drop (00095 applied) | — |
| 5 | Reference-job cost-code wipe-and-reseed (D-020) | ⏸ Wave-B Plan B-6 | ⏸ Wave-B Plan B-6 |

**D-035 status unchanged.** Wave-C doesn't address D-035; it addresses audit GAP item 20 (public.users retirement).

---

## Deferred follow-ups (DEF-WC-1..3 — surfaced per nwrp117)

### DEF-WC-1 — `org_members` lacks RESTRICTIVE `"org isolation"` policy

**Severity:** Real architectural SPOF risk. Drove CR-C1-1 motivation.

**Route:** Wave-B Plan B-3 (deletion safety net work; natural pairing with RLS hardening) OR dedicated F1+ hardening micro-plan.

**Implementation preview:** 1 migration adding RESTRICTIVE `org isolation` policy mirroring 00049 canonical pattern with HF-A4-1 `(SELECT ...)` wrapping. ~0.5 day work.

**Impact:** Post-DEF-WC-1, Option A application-layer filtering becomes redundant defense-in-depth (rather than required compensating control). Still recommended per D-30, but no longer required by single-point-of-failure analysis.

### DEF-WC-2 — `invoices.assigned_pm_id` compound-FK consideration

**Severity:** Pre-existing risk (pre and post-Wave-C semantically equivalent). Cross-tenant PM assignment is theoretically possible at DB FK level since FK references only `profiles(id)` not `(profiles(id), org_id)`.

**Route:** Future Wave-B or F1+ hardening. Not Wave-C scope. Compound-FK pattern would make cross-tenant assignment DB-impossible.

### DEF-WC-3 — Plan threat-model accuracy discipline (calibration-log entry)

**Severity:** Process discipline.

**Observation:** Plan-author's T-C-1-03 + T-C-1-04 threat model entries had factual errors about RLS state. Security-reviewer made the SAME error on profiles independently. Reviewer convergence on facts (via reading migration files) caught both errors.

**Route:** Calibration-log entry post-Wave-C ship. Custodian also recommended ARCHITECTURE.md add explicit "RLS posture summary table by entity" to prevent the class of disagreement.

---

## 3 deferred items (pre-existing, NOT Wave-C-caused)

Per `.planning/phases/stage-f1-knowledge-graph-auth-wave-c/deferred-items.md`:
- 2× design-token violations in `jobs/new/page.tsx` lines 320 + 332-333
- 1× design-token violation in `invoices/page.tsx` line 822

All pre-existing per `git diff` verification. Routed to Wave 1.1-Lite per D-049 cosmetic-cleanup phase.

---

## Cost tracking

- Plan-review iter-1: 5 reviewer agents (~600K tokens)
- iter-2 patches: doc-only (~0 vision)
- Plan C-1 execute: gsd-executor (~250K tokens)
- Migration apply: orchestrator (~5K tokens; MCP queries)
- Wave-C QA: 3 reviewer agents (~250K tokens)
- **Cumulative vision spend: ~$2 / $5 ceiling (40%)** — Wave-C all text-based work; vision untouched

---

## Items surfaced for Jake at this halt

| # | Item | Severity | Decision needed |
|---|---|---|---|
| **1** | **Authorize `.down.sql` rollback fix** | MEDIUM | Option A (embed reseed) / B (NOT VALID) / C (warning only) / accept current |
| 2 | DEF-WC-1 `org_members` RESTRICTIVE backstop → Wave-B Plan B-3 or F1+ micro-plan | MEDIUM | Confirm routing |
| 3 | DEF-WC-2 `invoices.assigned_pm_id` compound-FK → future Wave | LOW | Confirm deferral |
| 4 | DEF-WC-3 calibration-log entry post-Wave-C ship | LOW | Confirm + add ARCHITECTURE.md RLS table per custodian recommendation? |
| **5** | **Authorize Wave-B dispatch** | **HIGH** | Wave-C clean ship; Jake reviews umbrella EXPANDED-SCOPE.md if not already done; Wave-B 9 plans + Wave-B0 fallback per nwrp115/116 restructure |
| 6 | AC-C1-05 + AC-C1-08 (smoke + harness E2E) deferred to GATE-C live-environment session | INFO | Optional: run smoke tests now, or defer to Wave-B start |
| 7 | Sentry observability for 24h post-deploy window on 5 refactored UI surfaces (MED-C1-11) | INFO | Acknowledgment |

---

## Recommendation

**Wave-C is execute-complete + migration-applied + QA-clean.** Recommend Jake:

1. **Review this GATE-C halt summary** (~10 min)
2. **Decide on `.down.sql` rollback fix** (Option A recommended; small follow-up commit ~10 lines SQL)
3. **Confirm DEF-WC-1..3 routings**
4. **Authorize Wave-B dispatch** (9 plans + Wave-B0 fallback; 2-3 weeks foundational F1 architecture)

If decision on `.down.sql` rollback comes back as Option A: I'll apply the fix in a single small commit before Wave-B dispatch. If Option C: I'll proceed to Wave-B with documented warning in place.

Wave-C halts here per nwrp117 stop-after-ship protocol. Awaiting Jake's authorization for next steps.

---

**Status:** HALT — GATE-C complete; Jake review pending.
