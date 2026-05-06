# stage-1.5c-verification-harness — Plan Map

**Phase:** stage-1.5c-verification-harness
**Branch:** `phase/1.5-c-verification-harness` (cut from main HEAD `7607bbf`)
**Total plans:** 12
**Total tasks:** ~30 (mix of code + docs + agents)
**Total waves:** 8 (Wave 0 → Wave 7)
**Critical-path estimate:** 7-8 calendar days (post iter-1 amendments — Plan 5 1.5d→2d, Plan 11 0.5d→1d)
**Halt points:** 7 (one per wave boundary except Wave 1's plans-merge halt and Wave 7's pre-merge halt)
**Authority docs:** `.planning/phases/stage-1.5c-verification-harness/01.5-c-verification-harness-CONTEXT.md` (30 LOCKED decisions D-01..D-30; D-30 added 2026-05-06 per Jake nwrp49) + `.planning/expansions/stage-1.5c-verification-harness-EXPANDED-SCOPE.md` (full spec, 9 sections)
**Amendment status:** ITER-1 PLAN-REVIEW AMENDMENTS APPLIED (2026-05-06) — see "Iter-1 plan-review amendments" section below.

## Wave structure

Concurrency cap: max 3 agents per wave (per nwrp48 standing rules).

| Wave | Plan(s) | Concurrency | Halt after wave? | Critical-path days |
|---|---|---|---|---|
| 0 | Plan 1 (foundation) | 1 | YES | 0.5 |
| 1 | Plan 2 (Layer 1) + Plan 3 (Layer 2) + Plan 4 (Layer 3) | 3 (parallel — zero file overlap) | YES | 0.5-1 |
| 2 | Plan 5 (orchestrator) | 1 | YES | **2** (was 1-2; iter-1 W1 bump) |
| 3 | Plan 6 (GitHub Actions) | 1 | YES | 0.5 |
| 4 | Plan 7 (new agents) | 1 | YES | 0.5 |
| 5 | Plan 8a (criteria mandate) + Plan 8b (loop wiring) | 2 (parallel — zero file overlap) | YES | 0.5-1 |
| 6 | Plan 9 (calibration) + Plan 10 (docs) | 2 (parallel — zero file overlap) | YES | 0.5 |
| 7 | Plan 11 (self-test) | 1 | YES (pre-merge) | **1** (was 0.5; iter-1 W2 bump) |

Wave 1's three plans run in parallel (Layer 1 / Layer 2 / Layer 3 are file-isolated subtrees of `src/lib/verification/`). Wave 5's 8a and 8b touch different agent + workflow files. Wave 6's 9 and 10 touch different `.planning/` paths.

## Plan map

| Plan | Slug | Wave | Depends-on | Halt | Estimated days | Watchpoints addressed |
|---|---|---|---|---|---|---|
| 1 | foundation | 0 | — | YES | 0.5 | #7 (idempotency contract design) + ARCH-CRIT-3 (Layer1/2/3Context types into types.ts) + C4 (org_id in canonicalCriterionHash) + ARCH-CRIT-2 (criteria-loader smoke test scaffold) |
| 2 | layer-1-static-checks | 1 | 1 | NO (Wave 1 halt at end) | 0.5 | — |
| 3 | layer-2-standards-framework | 1 | 1 | NO (Wave 1 halt at end) | 0.5 | #1 (forward-extensible schema) + C3 (introspection guard rail in README) |
| 4 | layer-3-vision | 1 | 1 | YES (Wave 1 halt) | 0.5 | #7 (idempotency tested) + C2/C4/SEC-HIGH-2 (screenshot org_id scoping, prompt sanitization, vision schema strictness, 429 retry, sandbox args, cache-write atomicity, API key redaction) |
| 5 | orchestrator-and-vercel-discovery | 2 | 1, 2, 3, 4 | YES | **2** | #6 (Vercel URL discovery), C1+C5+SEC-HIGH-2 (auth + report sanitization + prompt sanitization) |
| 6 | github-actions-workflow | 3 | 5 | YES | 0.5 | SEC-HIGH-1 (env-var indirection — no direct `${{ }}` in shell) + C2 (artifact retention 30→7d, raw bytes excluded) |
| 7 | new-agents | 4 | **[01]** (was independent — iter-1 W3 honesty fix) | YES | 0.5 | #3 (research agent reusability) + C6 (tenant-context fence on fix-executor) |
| 8a | criteria-mandate | 5 | 7 | NO (Wave 5 halt at end) | 0.5 | #5 (criteria mandate not friction tax) |
| 8b | loop-with-executor | 5 | 5, 6, 7 | YES (Wave 5 halt) | 0.5-1 | #2 (loop state machine bounded) + ARCH-CRIT-1 (state machine extracted to runLoop only — runHarness is layer composition only) + C4 (CostCap hoisted) + WARN-3 (paused-for-fix sentinel) + MEDIUM-3 (fix-quality gate) |
| 9 | calibration-log | 6 | — (independent) | NO (Wave 6 halt at end) | 0.5 | #4 (calibration log useful not noise) |
| 10 | documentation | 6 | (consumes work from 1-9) | YES (Wave 6 halt) | 0.5 | C5 (report sanitization rules) + 7 doc-pass WARNINGs (DPA disclosure, retention table, SOC2 control numbers, API key redaction, multi-tenant scoping, final-vs-versioned report, vercel inspect future) |
| 11 | self-test | 7 | (consumes everything) | YES (pre-merge) | **1** | All 7 + ARCH-CRIT-1/2 verification (iter-3 hard-halt test, criteria-loader smoke test, synthetic always-PASS L2 rule, non-N/A L3 criterion) |

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

## Iter-1 plan-review amendments (2026-05-06)

Per Jake nwrp49 + iter-1 plan-review verdict (REVISE-PLAN — 11 CRITICAL/HIGH findings; APPROVE-WITH-NOTES from 4 reviewers; CONDITIONAL PASS — BLOCK from security; REVISE from multi-tenant). Amendments applied across Plans 1, 3, 4, 5, 6, 7, 8b, 10, 11 + CONTEXT.md (D-30 added) + PHILOSOPHY.md cross-ref.

**Cluster 1 — Tenant boundary by construction (6 CRITICAL, 1 HIGH compliance overlap):**
- D-30 added to CONTEXT.md verbatim per Jake nwrp49 §2
- C1 (Plans 5, 11): harness fixture-org-scoped session (`harness-fixture@nightwork.local` membership in `FIXTURE_ORG_ID`); RLS unchanged but session's `org_id` claim resolves only to fixture data; phase-prep migration (Plan 1) seeds the user. NOT deferred-to-F1 placeholder.
- C2 (Plans 4, 6): screenshot path includes `org_id`; artifact retention 30→7d; raw bytes excluded from git-tracked artifacts.
- C3 (Plan 3): explicit guard rail in README: any future `/api/_introspect/*` route MUST authenticate via `getCurrentMembership()` + return ONLY rows where `org_id = membership.org_id`.
- C4 (Plans 1, 4, 8b): `canonicalCriterionHash` includes `org_id` (constant `FIXTURE_ORG` today); `CostCap` hoisted from `runLayer3` to `runLoop` so iter-N cost is bounded.
- C5 (Plans 5, 10): `report-writer.ts` strips page URLs, screenshot paths, raw vision reasoning from git-tracked `final.md`; tracked reports show only criterion ID + verdict + confidence.
- C6 (Plan 7): tenant-context fence on `gsd-fix-executor`: MUST NOT edit any file under `_fixtures/`, RLS migrations, `getCurrentMembership` callsites, or tenant-table migrations. Halt-for-Jake on touch.

**Cluster 2 — State machine + criteria loader correctness (3 CRITICAL):**
- ARCH-CRIT-1 (Plans 5, 8b): state-machine driving REMOVED from `runHarness` (Plan 5 = layer composition + reporting only); SM lives ONLY in `runLoop` (Plan 8b). `HarnessReport.loop_state` field deleted. Plan 11 adds iter-3 hard-halt test case (fails on current code, passes on amended).
- ARCH-CRIT-2 (Plans 1, 11): criteria-loader smoke test added. Plan 1 ships `criteria-loader.test.md`; Plan 11 self-test asserts ≥40 non-N/A criteria from this phase's 12 PLAN files. Trade-off documented: `js-yaml` (~50KB dep) vs hand-rolled regex (current); Jake decides at iter-2.
- ARCH-CRIT-3 (Plan 1): `Layer1Context`, `Layer2Context`, `Layer3Context` interfaces moved into `src/lib/verification/types.ts` (Plan 1 foundation contract). Plans 2/3/4 import from there.

**Cluster 3 — Injection hardening (2 HIGH security):**
- SEC-HIGH-1 (Plan 6): GH Actions workflow injection — env-var indirection (`echo "$BRANCH"` with `env: BRANCH: ${{ github.ref_name }}`), NOT direct interpolation. ALL `${{ github.* }}` and `${{ inputs.* }}` flow through `env:` block.
- SEC-HIGH-2 (Plans 4, 5): vision API prompt injection — Plan 5 `criteria-loader.ts` blocklist (200-char cap, regex blocking `"ignore prior"`, `"system:"`, `"override"`, JSON-shaped braces/backticks, nested newlines); Plan 4 `vision-client.ts` defender system prompt + strict JSON schema validation; ANY response failing schema → halt-for-Jake (do NOT trust); high-confidence PASS on criterion containing literal "PASS" → flag suspicious + halt.

**Inline WARNINGs (~10 — applied during execute now since they affect plan tasks):**
- W1 (planner) ✓ — Plan 5 day bump 1.5d→2d
- W2 (planner + architect) ✓ — Plan 11 day bump 0.5d→1d + synthetic always-PASS Layer 2 rule + non-N/A Layer 3 criterion
- W3 (planner) ✓ — Plan 7 frontmatter `depends_on: [01]`
- WARN-3 (architect) ✓ — Plan 8b `LoopOutcome.final_state` adds `"paused-for-fix"` value
- WARN-4 (architect) ✓ — Plan 7 README flags fix-executor "cannot fully verify Layer 1 DOM/route fixes locally" limitation
- W1 (enterprise-readiness) ✓ — Plan 4 + Plan 5 try/catch wraps with `Sentry.captureException`
- W2 (enterprise-readiness, per Jake §5 tweak) ✓ — Plan 4 (Layer 3 vision) Anthropic 429 retry: exponential backoff (1s/2s/4s) + Retry-After header before SKIP. (Note: Jake's directive said "Plan 3, Layer 3 vision" — typo correction per orchestrator clarification: Layer 3 is Plan 4. Amendment landed in Plan 4.)
- W3 (enterprise-readiness) ✓ — Plan 8b HALT artifact retention: `reports/<phase>/halts/<commit>.md` (git-tracked; SOC2 traceability)
- W5 (enterprise-readiness) ✓ — Plan 4 cache-write-after-cost crash window: `.tmp` cache file BEFORE recording cost, atomic rename AFTER
- MEDIUM-2 (security) ✓ — Plans 2 + 4 Playwright `chromium.launch()` sandbox args (`--disable-dev-shm-usage`, `--no-sandbox` for CI)
- MEDIUM-3 (security) ✓ — Plan 8b loop-with-executor fix-quality gate: Layer 1 (build + typecheck) check on fix commit before iter+1

**Plan 10 doc-pass WARNINGs (~7 — Plan 10 absorbs):**
- W4 (enterprise-readiness): Final report overwrite-on-rerun versioning — `final-<run-iso-date>.md` symlinked/aliased to `final.md`
- W6 (enterprise-readiness): Vercel ls stdout grep fragility — recommend `vercel inspect <branch> --json` as future addition
- WARNING-1 (compliance): API key redaction — post-processing regex stripping `sk-ant-` and `Bearer` patterns (Plan 4 + Plan 5 inline; Plan 10 documents)
- WARNING-2 (compliance): Anthropic-as-data-processor disclosure — Plan 10 VERIFICATION-PIPELINE.md adds DPA section
- WARNING-3 (compliance, multi-tenant C5 overlap): Multi-tenant report scoping — Plan 10 documents (covered by D-30)
- WARNING-4 (compliance): Data retention table — Plan 10 documents
- WARNING-5 (compliance): SOC2 control numbers — CC6.1, CC6.7, CC7.2, PI1.1 cited in Plan 10 VERIFICATION-PIPELINE.md

**Wave-1.1+ deferred WARNINGs (~7 — captured in deferred-items.md):**
- W-2 (scalability): GH Actions `fetch-depth: 0` re-eval at Wave 5 (10K+ commits)
- W-6 (scalability): Vercel REST 429 retry deferred
- W3 (multi-tenant): Vercel discovery project-ID assertion for multi-tenant futures
- W4 (multi-tenant): Plan 9 calibration per-tenant cost attribution
- W5 (multi-tenant): GH workflow PR-comment vision-reasoning leakage
- N3 (enterprise-readiness): Plan 11 manual-verification automation
- O5 (planner): Plan 6 actionlint optional-skip → python yaml fallback (or accept skip)

## Open questions / scope ambiguities — RESOLUTIONS (post iter-1 plan-review)

Per Jake nwrp49 + iter-1 plan-review:

1. **OQ-PR-1 (Plan 5):** Vercel discovery hierarchy — RESOLVED. Plan 5 4-tier hierarchy: explicit → `vercel ls` CLI primary → Vercel REST API + `VERCEL_TOKEN` fallback → deterministic pattern → fail-loudly. AUTO-LOG empirical evidence supports CLI/REST primary. Multi-tenant W3 deferral noted (per-project-ID assertion for multi-tenant futures).
2. **OQ-PR-2 (Plan 4):** Layer 3 idempotency cache file location — RESOLVED. `.planning/verification/runs/<phase>/<commit>/idempotency.json` (gitignored). C4 amendment adds `org_id` to `canonicalCriterionHash` (constant `FIXTURE_ORG` today; tenant-aware when Wave 1.1+ adds tenant-X preview capability).
3. **OQ-PR-3 (Plan 8b):** Halt-for-Jake artifact format — RESOLVED. `HALT-AMBIGUOUS-VISION.md` and `HALT-ITER-3.md` artifacts at `.planning/verification/runs/<phase>/<commit>/`. W3 enterprise-readiness amendment adds permanent copy at `reports/<phase>/halts/<commit>.md` (git-tracked; SOC2 traceability).
4. **OQ-PR-4 (Plan 7):** `gsd-fix-executor` frontmatter-branched scope — RESOLVED. Same tools list, same color, narrowed description per OQ-PR-4 recommendation; full agent file written (not mechanical inheritance). C6 amendment adds tenant-context fence (allowed paths whitelist).
5. **OQ-PR-5 (Plan 9):** Calibration entry JSON-front-matter schema — RESOLVED. Schema defined in Plan 9; 13+ fields per architect WARN-4 review.
6. **OQ-PR-6 (Plan 5):** `--mode local` semantics — RESOLVED. Same harness binary with `--base-url http://localhost:3000` skipping Vercel discovery; documented but discouraged per CLAUDE.md Q2=C deprecation-path.
7. **OQ-PR-7 (Plan 11):** Self-test "passes against itself" criterion — RESOLVED. Harness runs end-to-end against this branch's Vercel preview URL with NO failures across 3 viewports for production routes on main HEAD `7607bbf`. W2 amendment adds synthetic always-PASS Layer 2 rule + non-N/A Layer 3 criterion to exercise watchpoint #7 non-vacuously (Plan 11 day bump 0.5d→1d).

## Sequencing post-this-phase (informational, not in scope)

Per Jake nwrp47 Part 7 + D-12 + Q6=B:

1. This phase ships to main (post Plan 11 self-test PASS)
2. 1.5c IA branch rebases/merges main (~1 hour)
3. 1.5c IA criteria retrofit on its own branch (~1 hour follow-up; per Q6=B)
4. Plan 3a-now spawns through the harness (first real production use)
5. Wave 3 (Plans 4+5) ships through the harness
6. 1.5c IA ships
