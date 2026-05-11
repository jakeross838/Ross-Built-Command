# Deferred items — stage-1.5c-verification-harness

**Created:** 2026-05-06 (per Jake nwrp49 + iter-1 plan-review)
**Purpose:** Capture Wave-1.1+ deferrals from iter-1 plan-review so they're not lost. These are NON-CRITICAL items the harness ships without; future phases address them.

These deferrals are LOGGED (not orphaned). Reviewer findings + rationale + estimated future home below.

## 7 Wave-1.1+ Deferrals (per Jake nwrp49 §5)

| # | Finding | Reviewer | Rationale for deferral | Future home |
|---|---|---|---|---|
| 1 | GH Actions `fetch-depth: 0` will bite at ~10K commits — re-eval by Wave 5 | scalability W-2 | Current commit count (~6K) is safely below the threshold; full clone is necessary for `git rev-parse HEAD` + branch metadata. At ~10K commits, evaluate `fetch-depth: 50` with explicit fetch of merge-base. | Wave 5 (when commit count reaches 10K — track via existing CLI tooling) |
| 2 | No 429 retry on Vercel REST API tier | scalability W-6, enterprise-readiness W6 | Plan 5 has 4-tier discovery hierarchy (CLI → REST → pattern → fail-loudly). REST 429 falls through to pattern + fail-loudly today. Pattern-based fallback is reliable for the SHORT branch names this phase uses. | F1+ (when long branch names + heavy concurrent usage exposes the gap; combined with `vercel inspect --json` recommendation per W6) |
| 3 | Vercel discovery accepts arbitrary `branch` param; future multi-tenant needs project-ID assertion | multi-tenant W3 | Single-project today (nightwork-platform); multi-tenant future may have multiple Vercel projects per org. Project-ID assertion prevents discovery from returning a different tenant's preview URL. | F3 (multi-tenant CI test gate phase) |
| 4 | Plan 9 calibration aggregates `vision_cost_usd` phase-wide, no per-tenant attribution | multi-tenant W4 | Single-tenant today; per-tenant cost tracking requires `org_id` field in calibration log entries + dashboard query refactor. | F3 (multi-tenant CI test gate phase) |
| 5 | GH workflow grants `pull-requests: write` + `statuses: write` — vision reasoning could land in PR comments | multi-tenant W5 | Plan 5 `report-writer.ts` (per iter-1 C5 + D-30) sanitizes the final.md that gets posted to PR comment — page URLs / screenshot paths / raw vision reasoning stripped. PR comment is sanitized BY CONSTRUCTION. The W5 finding flagged the surface; iter-1 C5 closed the actual leak path. Remaining concern (Wave 1.1+): finer-grained per-comment redaction if reasoning text is ever required for PR readability. | Wave 1.1+ (if PR comment readability necessitates more reasoning text — re-evaluate redaction policy then) |
| 6 | Plan 11 manual-verification automation | enterprise-readiness N3 | Plan 11 self-test executes 9 amendment verifications including 5 manual checks (grep-based + eyeball confirmations). Automating these requires writing dedicated test infrastructure. The manual checks are documented + reproducible; automation is value-additive but not blocking. | F3 narrowed-scope CI test gate phase (when test infra is the focus) |
| 7 | Plan 6 actionlint optional-skip → python yaml fallback (or accept skip) | planner O5 | Plan 6 verifies workflow YAML via `actionlint` if installed, else skips with notice. Python yaml lint as fallback adds dep without significantly improving signal (yaml syntax errors caught at GH Actions runtime; actionlint catches semantic errors that yaml lint can't). Acceptable to skip when actionlint absent. | Optional / never (acceptable as-is) |

## How these surface back to planning

**`/np` orchestrator at next-phase scope time:**

When `/np` reads `.planning/calibration-log.md` for prior-phase calibration (per Plan 9 + D-27 dynamic prompting), it ALSO reads any phase's `deferred-items.md` to surface Wave-1.1+ deferrals as candidate scope items. Specifically:

- **F1+ planning:** check items #2 + #5 against the new phase's scope. If the phase touches Vercel discovery in long-branch context OR exposes vision reasoning in PR comments, address.
- **F3 planning** (multi-tenant CI test gate): MUST address items #3, #4, #6 as part of F3 scope. F3 is the canonical home for multi-tenant cost attribution + project-ID assertion + manual-verification automation.
- **Wave 5 planning:** check item #1. If commit count is approaching 10K, plan a focused refactor of GH Actions fetch-depth strategy.

## What's NOT in this list

These are **NOT** in deferred-items.md (they ARE addressed in iter-1 amendments):

- C1-C6 multi-tenant CRITICALs → addressed in commit 2 (Cluster 1)
- ARCH-CRIT-1/2/3 architect CRITICALs → addressed in commits 2 + 3
- SEC-HIGH-1/2 security HIGHs → addressed in commit 2
- W1-W3, W5 enterprise-readiness inline WARNINGs → addressed in commits 2 + 3
- W2 enterprise-readiness Anthropic 429 retry → addressed in commit 2 (Plan 4 — per Jake §5 tweak: moved from Wave-1.1+ deferral to inline-during-execute)
- MEDIUM-2 + MEDIUM-3 security WARNINGs → addressed in commits 2 + 3 (sandbox args, fix-quality gate)
- WARNING-1 through WARNING-5 compliance WARNINGs → addressed in commit 6 (Plan 10 doc-pass)
- W4 + W6 enterprise-readiness WARNINGs → addressed in commit 6 (Plan 10 doc-pass)
- W1 multi-tenant (Plan 11 self-test branch coverage) → covered by Plan 11 amendments in commit 3

## Status

This file is committed AS-IS. It is not a TODO list to be checked off — it is a record of decisions about what NOT to address in this phase, with reasoning. Future phases reference it; iter-2 plan-review verifies completeness.

**Authority:** Jake nwrp49 (verbatim acceptance of triage split + W2 tweak per §5).
**Cross-reference:** README.md § "Iter-1 plan-review amendments" + VERIFICATION-PIPELINE.md § "Iter-1 plan-review amendments anchored here".
