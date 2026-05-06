# stage-1.5c-verification-harness — Plan Map

**Phase:** stage-1.5c-verification-harness
**Branch:** `phase/1.5-c-verification-harness` (cut from main HEAD `7607bbf`)
**Total plans:** 12
**Total tasks:** ~30 (mix of code + docs + agents)
**Total waves:** 8 (Wave 0 → Wave 7)
**Critical-path estimate:** 6.5-8 calendar days
**Halt points:** 7 (one per wave boundary except Wave 1's plans-merge halt and Wave 7's pre-merge halt)
**Authority docs:** `.planning/phases/stage-1.5c-verification-harness/01.5-c-verification-harness-CONTEXT.md` (29 LOCKED decisions D-01..D-29) + `.planning/expansions/stage-1.5c-verification-harness-EXPANDED-SCOPE.md` (full spec, 9 sections)

## Wave structure

Concurrency cap: max 3 agents per wave (per nwrp48 standing rules).

| Wave | Plan(s) | Concurrency | Halt after wave? | Critical-path days |
|---|---|---|---|---|
| 0 | Plan 1 (foundation) | 1 | YES | 0.5 |
| 1 | Plan 2 (Layer 1) + Plan 3 (Layer 2) + Plan 4 (Layer 3) | 3 (parallel — zero file overlap) | YES | 0.5-1 |
| 2 | Plan 5 (orchestrator) | 1 | YES | 1-2 |
| 3 | Plan 6 (GitHub Actions) | 1 | YES | 0.5 |
| 4 | Plan 7 (new agents) | 1 | YES | 0.5 |
| 5 | Plan 8a (criteria mandate) + Plan 8b (loop wiring) | 2 (parallel — zero file overlap) | YES | 0.5-1 |
| 6 | Plan 9 (calibration) + Plan 10 (docs) | 2 (parallel — zero file overlap) | YES | 0.5 |
| 7 | Plan 11 (self-test) | 1 | YES (pre-merge) | 0.5 |

Wave 1's three plans run in parallel (Layer 1 / Layer 2 / Layer 3 are file-isolated subtrees of `src/lib/verification/`). Wave 5's 8a and 8b touch different agent + workflow files. Wave 6's 9 and 10 touch different `.planning/` paths.

## Plan map

| Plan | Slug | Wave | Depends-on | Halt | Estimated days | Watchpoints addressed |
|---|---|---|---|---|---|---|
| 1 | foundation | 0 | — | YES | 0.5 | #7 (idempotency contract design) |
| 2 | layer-1-static-checks | 1 | 1 | NO (Wave 1 halt at end) | 0.5 | — |
| 3 | layer-2-standards-framework | 1 | 1 | NO (Wave 1 halt at end) | 0.5 | #1 (forward-extensible schema) |
| 4 | layer-3-vision | 1 | 1 | YES (Wave 1 halt) | 0.5 | #7 (idempotency tested) |
| 5 | orchestrator-and-vercel-discovery | 2 | 1, 2, 3, 4 | YES | 1-2 | #6 (Vercel URL discovery) |
| 6 | github-actions-workflow | 3 | 5 | YES | 0.5 | — |
| 7 | new-agents | 4 | — (independent) | YES | 0.5 | #3 (research agent reusability) |
| 8a | criteria-mandate | 5 | 7 | NO (Wave 5 halt at end) | 0.5 | #5 (criteria mandate not friction tax) |
| 8b | loop-with-executor | 5 | 5, 6, 7 | YES (Wave 5 halt) | 0.5-1 | #2 (loop state machine bounded) |
| 9 | calibration-log | 6 | — (independent) | NO (Wave 6 halt at end) | 0.5 | #4 (calibration log useful not noise) |
| 10 | documentation | 6 | (consumes work from 1-9) | YES (Wave 6 halt) | 0.5 | — |
| 11 | self-test | 7 | (consumes everything) | YES (pre-merge) | 0.5 | All 7 (validates harness against itself) |

**Independent / parallel-friendly work** (per D-24): Plans 7 (agent files), 9 (calibration log), 10 (docs).
**Coupled / architect-first work** (per D-24): Plans 1, 5, 8a/8b, 11 (state machine + integration boundaries).

## Acceptance criteria count

12 plans × ~3-5 AC each = ~50 acceptance criteria total (numbered AC-1.5c-vh-N-M where N is plan number, M is criterion number within plan).

Phase-level acceptance criteria (apply across all plans):

- [ ] PHASE-AC-1: Build clean (`npm run build` 0 warnings, 0 errors) at every wave boundary
- [ ] PHASE-AC-2: Typecheck clean (`npx tsc --noEmit` 0 errors in `src/`) at every wave boundary
- [ ] PHASE-AC-3: All hooks silent (T10a-T10d sample-data isolation + Forbidden + tenant-blind primitives + post-edit drift) on every commit
- [ ] PHASE-AC-4: Privacy gate (32-token denylist) clean across all new files
- [ ] PHASE-AC-5: No Drummond identifier leaks (system `.githooks/pre-commit` Drummond grep gate silent)
- [ ] PHASE-AC-6: No modification of `_fixtures/drummond/`, `scripts/sanitize-drummond.ts`, design-system playground, or 1.5c IA Plans 1/2/2-amend/3 commits (per D-29)
- [ ] PHASE-AC-7: Anthropic API key referenced via `secrets.ANTHROPIC_API_KEY` only; never present in committed code
- [ ] PHASE-AC-8: All 7 plan-review watchpoints individually verified (see plan-by-plan mapping above)
- [ ] PHASE-AC-9: Self-test (Plan 11) passes all three layers against this branch's Vercel preview before merge to main
- [ ] PHASE-AC-10: Plans 8a/8b together produce a `criteria:` section template that does not exceed +5min/plan friction (Plan-review watchpoint #5)

## Plan-review watchpoint coverage

Per nwrp48, plan-review iter-1 reviewers cite these 7 watchpoints when surfacing concerns:

| # | Watchpoint | Owning plans |
|---|---|---|
| 1 | Standards library schema designed for forward extensibility | Plan 1 (registry contract), Plan 3 (schema + first rule) |
| 2 | Loop-with-executor state machine cleanly bounded | Plan 1 (state machine spec), Plan 8b (implementation) |
| 3 | gsd-research-standards agent reusable across phases | Plan 7 (caching, TTL, search authority hierarchy) |
| 4 | Calibration-log integration with custodian produces useful lessons not noise | Plan 9 (entry schema + custodian writer) |
| 5 | gsd-planner mandate update enforces criteria sections without becoming a friction tax | Plan 8a (template + planner prompt + plan-review enforcement + spec-checker consumer) |
| 6 | Vercel preview URL discovery robust (REST API or CLI primary, deterministic pattern fallback) | Plan 5 (discovery hierarchy + retry + fail-loudly) |
| 7 | Idempotency contract precise (commit SHA + criterion hash key tested) | Plan 1 (contract spec), Plan 4 (cache implementation), Plan 11 (rerun-on-same-commit test) |

## Open questions / scope ambiguities surfaced during planning

These go to plan-review iter-1 for resolution before Jake's review halt:

1. **OQ-PR-1 (Plan 5):** Vercel REST API requires a `team_id`/`project_id` to filter deployments by branch. We have `VERCEL_TOKEN` but the discovery code needs to query `https://api.vercel.com/v6/deployments?projectId=...&meta-githubCommitRef=phase/...`. Is `vercel ls` CLI sufficient for discovery (already authed locally + in GH Action) versus a hand-rolled REST API call? Recommendation: prefer `vercel ls --json` or `vercel inspect` from `vercel` CLI as primary path; REST API as fallback. Plan 5 documents the hierarchy.

2. **OQ-PR-2 (Plan 4):** Layer 3 idempotency cache file location. EXPANDED-SCOPE §4 says "use commit SHA + criteria hash as idempotency key." Per D-15/D-16, intermediate per-commit reports are gitignored under `.planning/verification/runs/[phase]/[commit]/`. The cache lives at `.planning/verification/runs/[phase]/[commit]/idempotency.json` (gitignored). On rerun, Layer 3 reads this file and skips API calls for criteria already-PASSed at this commit. Across commits, no shared cache (every commit is a new key).

3. **OQ-PR-3 (Plan 8b):** "Halt-for-Jake on confidence < 0.7 EVEN ON PASS verdict" (D-07). What surface signals halt? Recommendation: Plan 8b emits a `HALT-AMBIGUOUS-VISION.md` artifact under `.planning/verification/runs/[phase]/[commit]/` that names the criterion + screenshot path + vision response + confidence; the orchestrator detects this artifact and pauses the loop with an explicit prompt to Jake. Same mechanism as iter-3-reached.

4. **OQ-PR-4 (Plan 7):** `gsd-fix-executor` as frontmatter-branched `gsd-executor` — what frontmatter differs? Recommendation: same `tools` list, same `color`, but `description` narrowed to "Fixes a single failure surfaced by verify-phase.ts in scope of one harness loop iteration. Reads failure context, makes one focused commit, returns control. Never invokes the harness itself." Plus a slimmer system prompt (skip the workflow rules and re-run-discovery sections; focus on the fix-and-commit loop).

5. **OQ-PR-5 (Plan 9):** Calibration entry JSON-front-matter schema. Recommendation: `phase`, `wave_count`, `parallelism_used` (max plans/wave), `iter_counts` (per plan), `harness_runs`, `harness_pass_rate`, `vision_cost_usd`, `prompt_density_signal` (1-5 scale), `drift_cases` (count), `lessons` (free-text). Plan 9 locks this; nightwork-plan-review iter-1 confirms it's machine-readable enough.

6. **OQ-PR-6 (Plan 5):** `--mode local` per D-04 — what does "emergency localhost run" mean exactly? Recommendation: same harness binary, with `--mode local --base-url http://localhost:3000` to skip Vercel discovery entirely and walk localhost. Documented but discouraged in CLAUDE.md (per Q2=C). Layer 3 vision still calls Anthropic API (cost applies) — the mode just changes the target URL.

7. **OQ-PR-7 (Plan 11):** Self-test — what counts as "passes against itself"? Recommendation: the harness MUST run end-to-end against the current branch's Vercel preview URL with NO failures across 3 viewports for whatever production routes exist on main HEAD `7607bbf` (likely <12 routes). The "12 production routes 1.5c IA mounts" target only applies once IA merges through the harness post-this-phase.

Plan-review iter-1 reviewers should resolve these as part of plan-review verdict.

## Sequencing post-this-phase (informational, not in scope)

Per Jake nwrp47 Part 7 + D-12 + Q6=B:

1. This phase ships to main (post Plan 11 self-test PASS)
2. 1.5c IA branch rebases/merges main (~1 hour)
3. 1.5c IA criteria retrofit on its own branch (~1 hour follow-up; per Q6=B)
4. Plan 3a-now spawns through the harness (first real production use)
5. Wave 3 (Plans 4+5) ships through the harness
6. 1.5c IA ships
