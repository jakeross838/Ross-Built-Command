# Expanded scope — tiering-implementation

**Status:** DRAFT — awaiting Jake review per nwrp242 directive. Do NOT dispatch `/np tiering-implementation` until Jake explicitly approves this scope.
**Generated:** 2026-05-27 (post tiering-design APPROVED per nwrp242)
**Severity (tier):** MEDIUM (bootstrap)
**Halt-gate ceiling:** $100 (MEDIUM tier per APPROVED PLANNING-PIPELINE-TIERING.md §2.2)
**Per-plan halt:** $75 (MEDIUM tier per Rule 7d)
**Max bumps per slice:** 1 per Rule 7c

**Authorization chain:** nwrp242 → APPROVED Rev 3 of PLANNING-PIPELINE-TIERING.md (commit `462e2a3` on origin/main) → this draft EXPANDED-SCOPE for the Step 1 implementation phase per §12.

---

## Stated scope (verbatim from PLANNING-PIPELINE-TIERING.md §7 + §12 Step 1 + nwrp242 directive)

> **Step 1 — Tiering Implementation phase (probably MEDIUM tier itself per nwrp239 framing — modifies pipeline + adds SmokeAuthHelper crosses design-pushback threshold + touches multiple skill/command files):**
> - `/nightwork-init-phase tiering-implementation` authors EXPANDED-SCOPE.md with `severity: MEDIUM`.
> - Scope includes 9 implementation touch points from §7: `np.md`, `nightwork-init-phase.md`, `nightwork-plan-review.md`, `nightwork-qa.md`, `nx.md`, `scripts/lib/smoke-auth.mjs` (NEW), `.planning/templates/expanded-scope-template.md`, this design doc promotion DRAFT→APPROVED, CLAUDE.md Rule 10 addition.
> - Dispatches `/np tiering-implementation` → `/nx tiering-implementation`.
> - Ships under existing reviewer set (since the new tiering doesn't apply yet — bootstrap).

**Per nwrp242 watch-item:** "the bootstrap exception (implementation runs under EXISTING reviewer set, not the new tiered one) needs to be explicit and time-limited. After implementation ships, the EXISTING pipeline is retired for ALL phases — there's no 'fall back to old pipeline' path. Make that a closed seam, not an indefinite parallel."

---

## 1. Mapped entities and workflows

This phase modifies the gsd-sdk planning pipeline itself + adds a new test-infrastructure primitive (SmokeAuthHelper). NO new schema. NO new tables. NO new RLS. NO new mutations. NO financial logic. NO cross-tenant concerns.

| Concern | Surface | Current state | Notes |
|---------|---------|---------------|-------|
| `/np` orchestrator | `.claude/commands/np.md` (104 lines) — chains discuss → plan → plan-review with EXPANDED-SCOPE as input | Reads EXPANDED-SCOPE existence + APPROVED status; no `severity:` awareness | Add: read `severity:` field; abort with helpful message if missing; pass tier to downstream commands |
| `/nightwork-init-phase` orchestrator | `.claude/commands/nightwork-init-phase.md` | Authors EXPANDED-SCOPE.md after Jake-confirmed scope; no tier selection | Add: AskUserQuestion with Flavor A/B/C (per design §4); write `severity:` field + `severity_rationale`; auto-set `halt_gate_ceiling` + `per_plan_halt` per tier |
| `/nightwork-plan-review` orchestrator | `.claude/commands/nightwork-plan-review.md` (300 lines) — fixed 8-reviewer set with conditional adds | Currently spawns architect + planner + enterprise-readiness + multi-tenant + security + conditional adds via single dispatch logic | Refactor: read `severity:` from EXPANDED-SCOPE; pick reviewer set per tier-config (LOW=2; MEDIUM=4; HIGH=base 6 + conditionals); architect-vs-enterprise-readiness mechanical signal table for HIGH |
| `/nightwork-qa` orchestrator | `.claude/commands/nightwork-qa.md` (150 lines) — always 4 + conditional adds | Same fixed-set-with-conditional-adds pattern | Same refactor: tier-aware reviewer set selection |
| `/nx` wrapper | `.claude/commands/nx.md` | Runs preflight then chains execute → QA | Add: confirm tier alignment in preflight (EXPANDED-SCOPE `severity:` matches PLAN.md frontmatter `severity:`); halt on mismatch |
| `scripts/lib/smoke-auth.mjs` | NEW FILE | Doesn't exist | Author per design §3 — SmokeAuthHelper primitive with login() + withAuthedContext() + getAuthCookies() + statusAuthed() |
| `.planning/templates/expanded-scope-template.md` | Verify existence; create if missing | Unknown — check existence | Add `severity:` field with default LOW + tier-rationale prompt + `halt_gate_ceiling` / `per_plan_halt` placeholders |
| `CLAUDE.md` | Workflow Posture section currently has Rules 1-9 | Add Rule 10 (severity tiering) summarizing the contract: tier locked at /nightwork-init-phase time, tier drives reviewer set + ceiling, §6.2 halt-and-re-tier triggers fire mechanically |

**Removed from scope per nwrp242 review:** Touch point #8 from design §7 ("this design doc promotion DRAFT→APPROVED") is already COMPLETE per commit `462e2a3` on 2026-05-27. Implementation phase scope is therefore **8 touch points, not 9**.

---

## 2. The bootstrap exception (closed seam, time-limited)

This phase ships the new tiered pipeline. Until it ships, the EXISTING pipeline must continue to run (otherwise no pipeline runs and nothing dispatches). The bootstrap exception governs this transition.

**The exception:**

- The tiering-implementation phase ITSELF runs under the EXISTING reviewer set (current `/nightwork-plan-review` 8-reviewer logic; current `/nightwork-qa` 4-reviewer-plus-conditional logic; no `severity:` field consulted on this phase).
- The phase commits modify the pipeline files in-place: `np.md`, `nightwork-plan-review.md`, `nightwork-qa.md`, `nightwork-init-phase.md`, `nx.md` all get tier-aware refactors.
- The FINAL commit of the phase activates the new pipeline for ALL subsequent phases.

**The closed seam (after this phase ships):**

- There is NO `--use-existing-pipeline` flag, NO `--legacy` mode, NO env-var override that falls back to the old pipeline.
- The old reviewer-set logic in `nightwork-plan-review.md` + `nightwork-qa.md` is DELETED (not commented out, not wrapped in a conditional, not preserved as a legacy code path).
- Every phase from THIS PHASE forward consults `severity:` in EXPANDED-SCOPE.md frontmatter; missing field = `/np` aborts with the helpful error message from design §4.

**Why closed-seam not parallel:**

- Indefinite parallel = two pipelines competing for the same orchestration concerns = drift inevitably; eventually one is the canonical and the other is dead code that periodically resurrects to confuse future Claude sessions.
- Closed seam = old pipeline retired in the same commit set that ships the new one; no fallback path; tier-discipline mandatory from this phase forward.
- If the new pipeline has a bug (some phase dispatches incorrectly), the response is a hotfix to the tiered pipeline OR a Rev 4 of the design doc + re-do implementation — NOT "fall back to old pipeline."

**Time-limit on the bootstrap exception:**

- The exception applies to THIS PHASE ONLY (tiering-implementation).
- The exception expires when tiering-implementation SHIPS (`Custodian sweep marks SHIPPED in MASTER-PLAN.md §9` per design §12 condition (i)).
- After SHIP, the next /nightwork-init-phase invocation (phase-2-pdf-preview-spike per nwrp242 step 3) MUST set `severity:` per the new mechanism.

**Implementation contract — final commit:**

The last commit of the phase must be a single commit that:
1. Replaces the old reviewer-set logic in `nightwork-plan-review.md` with the new tier-aware logic
2. Replaces the old reviewer-set logic in `nightwork-qa.md` with the new tier-aware logic
3. Updates `np.md` to consult `severity:`
4. Updates `nightwork-init-phase.md` to write `severity:`
5. Updates `nx.md` preflight to verify `severity:` alignment
6. Adds CLAUDE.md Rule 10
7. Adds `.planning/templates/expanded-scope-template.md` `severity:` field
8. Ships `scripts/lib/smoke-auth.mjs`

If split across multiple commits, the LAST commit must complete the cutover (no half-tiered state). The plan-author + executor are responsible for sequencing so the cutover is atomic OR the intermediate commits are explicitly marked as "infrastructure-ready, cutover-pending."

---

## 3. Falsifiable acceptance criteria

| AC ID | Criterion | Verification |
|-------|-----------|--------------|
| AC-1 | `np.md` reads `severity:` field from EXPANDED-SCOPE.md; aborts with helpful error if missing | grep `severity:` in `np.md` body; test dispatch on a phase with no `severity:` field returns the abort message |
| AC-2 | `nightwork-init-phase.md` writes `severity:` field + `severity_rationale` after AskUserQuestion | grep `severity:` in `nightwork-init-phase.md` body; test new init outputs an EXPANDED-SCOPE.md with the field present |
| AC-3 | `nightwork-init-phase.md` displays Flavor A / B / C AskUserQuestion per signal posture | code path inspection for all 3 flavors |
| AC-4 | `nightwork-plan-review.md` reviewer set is tier-aware per design §2.x specs | grep reviewer-pick logic; verify LOW=2, MEDIUM=4, HIGH=base-6-plus-conditional |
| AC-5 | `nightwork-plan-review.md` architect-vs-enterprise-readiness pick is mechanical per design §2.3 signal table | grep architect/enterprise-readiness signal-matching logic; verify "both = 2 slots" path |
| AC-6 | `nightwork-qa.md` reviewer set is tier-aware (mirrors plan-review) | grep reviewer-pick logic; verify symmetry with plan-review per design §2.x |
| AC-7 | `nx.md` preflight verifies tier alignment between EXPANDED-SCOPE + PLAN.md frontmatter | grep preflight logic for alignment check |
| AC-8 | `scripts/lib/smoke-auth.mjs` exists + exports login / withAuthedContext / getAuthCookies / statusAuthed per design §3 | grep exports + verify each function signature matches design §3 |
| AC-9 | `scripts/lib/smoke-auth.mjs` reads `SMOKE_EMAIL` + `SMOKE_PASSWORD` from env; SKIPS gracefully if missing | code inspection + test with missing creds |
| AC-10 | `.planning/templates/expanded-scope-template.md` includes `severity:` field with default LOW + tier-rationale prompt | grep `severity:` in template |
| AC-11 | `CLAUDE.md` adds Rule 10 (severity tiering) | grep Rule 10 in CLAUDE.md; verify summarizes contract |
| AC-12 | §6.2 mechanical halt-and-re-tier triggers implemented in plan-review + QA reviewer scripts | code inspection of trigger detection in reviewer prompts/scripts |
| AC-13 | `mid_execute_halt_rate` metric tracking infrastructure in place (even if no data yet) | grep / code inspection of metric capture in `nightwork-plan-review.md` + `nightwork-qa.md` + design for PIPELINE-TIERING-REVIEW-N.md template |
| AC-14 | Old reviewer-set logic DELETED from plan-review + QA (not commented, not flagged, gone) | git diff verifies old logic removed in the cutover commit |
| AC-15 | Bootstrap exception time-limited — no `--legacy` flag, no env-var override, no fallback code path | grep entire pipeline for fallback patterns; verify zero matches |

---

## 4. Implementation touch points (8 — not 9; #8 already complete)

Numbered per design §7 (with #8 marked done):

1. **`.claude/commands/np.md`** — read `severity:` from EXPANDED-SCOPE.md; abort if missing; pass tier downstream
2. **`.claude/commands/nightwork-init-phase.md`** — Flavor A/B/C AskUserQuestion; write `severity:` field
3. **`.claude/commands/nightwork-plan-review.md`** — tier-aware reviewer set selection (LOW=2, MEDIUM=4, HIGH=base 6 + conditionals); architect-vs-enterprise-readiness mechanical signal table
4. **`.claude/commands/nightwork-qa.md`** — same tier-aware refactor; mirror plan-review reviewer choice
5. **`.claude/commands/nx.md`** — confirm tier alignment in preflight
6. **`scripts/lib/smoke-auth.mjs`** (NEW) — SmokeAuthHelper primitive per design §3
7. **`.planning/templates/expanded-scope-template.md`** — include `severity:` field with default LOW + tier-rationale prompt (verify template exists; create if not)
8. **`.planning/process/PLANNING-PIPELINE-TIERING.md`** — ~~promote from DRAFT to APPROVED~~ **DONE per commit `462e2a3`**
9. **`CLAUDE.md` Workflow Posture section** — add Rule 10 (severity tiering)

Net: 8 active touch points (1-7 + 9).

---

## 5. Plan-author resolution items (surfaced for plan-time)

These need plan-author or Jake decision at /np time:

- **PA-1: Severity-rationale auto-population from signal-table matches.** When Flavor A/B fires, should the rationale auto-populate with "Signals X, Y, Z fired → tier T" OR require Jake to type a rationale? **Recommend: auto-populate from signal matches + offer Jake an edit-before-confirm.** Cheap; surfaces the reasoning in the EXPANDED-SCOPE audit trail.
- **PA-2: Tier-config file vs inline tier specs.** Should LOW/MEDIUM/HIGH reviewer sets + ceilings live in a separate `.planning/process/tier-config.json` OR be embedded inline in `np.md` / `nightwork-init-phase.md`? **Recommend: separate `tier-config.json`** — one source of truth, importable from multiple commands, easier to revise without editing 4 markdown files.
- **PA-3: Friction-tax metric capture mechanism.** How does `mid_execute_halt_rate` get logged? Append to a `.planning/process/mid-execute-halts.jsonl` per halt event? Compute from QA-report files at review time? **Recommend: append-to-jsonl on halt event** — separates capture from computation; easy to grep for next-review-time.
- **PA-4: SmokeAuthHelper smoke-runner user seeding.** Should the implementation phase seed `smoke-runner@nightwork.local` PM user, OR leave that to Jake to seed manually before first auth-required smoke run? **Recommend: implementation phase seeds via a SQL migration** under `supabase/migrations/00103_smoke_runner_seed.sql` (with the password as a placeholder + `.env.local` documentation).

**WARNING — PA-4 surfaces a §6.2 trigger:** seeding a user via SQL migration = schema change = §6.2 mechanical trigger fires (LOW + schema → HIGH; MEDIUM + schema → HIGH). The implementation phase is MEDIUM tier; if PA-4 is approved as "seed via migration," this phase RE-TIERS to HIGH per §6.2 right at plan-time. Two paths to resolve:
- **(a) Seed via migration → re-tier to HIGH.** Honest application of design discipline; tier expands to base 6 + conditional adds; ceiling goes to $200; reviewer set expands. Costs the phase ~$50-100 more but follows the discipline this design just shipped.
- **(b) Seed manually outside the phase scope (Jake runs SQL via `supabase` MCP before first auth-required smoke run).** Implementation phase stays MEDIUM; no migration; smoke-runner-user creation is a Jake-action documented in `.planning/runbooks/smoke-runner-setup.md` (or similar).

**Recommend (b)** — defers the schema-touch until a phase that actually needs an additional smoke-runner-user persona, AND validates the discipline (the design's first real application doesn't bypass its own §6.2 trigger).

---

## 6. Risks + mitigations

| Risk | Mitigation |
|------|------------|
| Refactoring 4 skill files atomically is hard; mid-refactor state could break /np dispatches for other concurrent phases | Time-bound the phase tightly — sequence commits so each commit is buildable; FINAL commit completes cutover (per §2 closed-seam contract). If mid-phase, only this phase's branch sees half-tiered state. |
| New `tier-config.json` introduces a config file that all skills depend on; if it's missing or malformed, all dispatch breaks | Add a sanity-check in `np.md` + `nightwork-init-phase.md`: if `tier-config.json` missing OR malformed, abort with explicit error pointing at `.planning/process/PLANNING-PIPELINE-TIERING.md`. |
| SmokeAuthHelper has subtle bugs (cookie management, session expiry, MFA paths) that aren't caught until Phase 2 dispatches | Implementation phase ACs include a sanity smoke run against the harness-fixture-org (synthetic seeded UUIDs per scripts/fixtures/smoke-seed.sql) to validate login + getAuthCookies + statusAuthed work. |
| Old reviewer-set logic deletion (AC-14) breaks something we don't know about | git diff inspection + grep for any remaining references to the old reviewer-set arrays before final commit; if anything references them, refactor that too OR delete the dead reference. |
| `mid_execute_halt_rate` metric capture (AC-13) gets implemented as "TODO: implement later" stub | Plan-author cannot ship stub-only capture; capture must be live + tested via at least one synthetic halt event in the implementation phase test pass. |
| MEDIUM tier ceiling ($100) too tight for an 8-touch-point pipeline refactor | Plan-author monitors at halfway through; if projecting >$100, surface for Jake bump-or-re-scope per Rule 7a. Honest application of the cost discipline this design ships. |

---

## 7. Plan-time clarifications expected

- **Skill-file format consistency.** The 4 skill files (np.md, nightwork-plan-review.md, nightwork-qa.md, nightwork-init-phase.md) use markdown with embedded code blocks + `<objective>` / `<arguments>` / `<execution>` XML-style tags. The refactor must preserve this format. The planner should surface any tag changes (e.g., adding `<tier-config>` tags) in PLAN.md for plan-review.
- **`scripts/lib/smoke-auth.mjs` naming convention.** Confirm `.mjs` (ES module) vs `.ts` (TypeScript with `npm run build` step). Recommend `.mjs` for consistency with existing `scripts/smoke-internal-launch-hide.mjs`. Plan-author confirms at /gsd-plan-phase time.
- **CLAUDE.md Rule 10 placement.** New rule goes at the end of the Workflow Posture section (after Rule 9). Confirm at plan-author time.

---

## 8. Reviewer-set posture for THIS PHASE (bootstrap exception)

**This phase runs under the EXISTING (untiered) reviewer set:**

- `/nightwork-plan-review` runs the current 8-reviewer-plus-conditional logic (architect + planner + enterprise-readiness + multi-tenant-architect + security-reviewer + scalability/compliance/design-pushback if applicable).
- `/nightwork-qa` runs the current always-4-plus-conditional logic (spec-checker + custodian + security + ai-logic-tester + ui/db/migration adds if applicable).

**Why the existing untiered set for THIS phase:** the new tiered pipeline doesn't exist yet (this phase implements it). The bootstrap exception is to ship the implementation under whatever pipeline currently exists. After SHIP, no future phase uses the untiered set (closed seam per §2).

**Surface for review:** existing skill files reference the untiered set as the default. The FINAL commit of this phase removes that default and replaces with tier-aware logic. The bootstrap exception lives only in the live-state of `main` between this phase's first commit and last commit.

---

## 9. Smoke + verification

This phase doesn't add UI surfaces (skill files + CLAUDE.md + 1 new JS lib). No `.tsx` / `.css` changes. No Vercel preview walk needed.

**Smoke requirements:**

- Sanity smoke of SmokeAuthHelper against harness-fixture-org (synthetic UUIDs per smoke-seed.sql) — validates login() + getAuthCookies() + statusAuthed() at minimum
- Test dispatch of `/np` against a synthetic-EXPANDED-SCOPE.md with `severity: LOW` confirms abort-on-missing → success-on-present
- Test dispatch of `/nightwork-plan-review` reads tier from a sample PLAN.md and picks the right reviewer set (mock or dry-run; the actual reviewer dispatch may not be feasible in a smoke harness)

**Acceptance gate:** Jake review of the FINAL commit + Jake-confirmed dispatch of next phase (phase-2-pdf-preview-spike) under the new pipeline successfully picks LOW tier + 2 reviewers per design.

---

## 10. Cost projection

This is a MEDIUM tier phase (8 touch points; cross-cutting refactor of 4 skill files + 1 NEW lib + CLAUDE.md addition). Ceiling: **$100 per slice** (per MEDIUM tier; Rule 7d per-plan $75).

**Estimated breakdown (rough):**

| Stage | Cost estimate |
|-------|---------------|
| gsd-assumptions-analyzer (MEDIUM runs full pass) | ~$10-15 |
| gsd-planner iter-1 | ~$15-20 |
| gsd-plan-checker iter-1 (PASS expected for mechanical refactor with clear design contract) | ~$15-20 |
| nightwork-plan-review iter-1 (EXISTING reviewer set, ~8 reviewers — bootstrap exception) | ~$30-40 |
| gsd-execute-phase (subagent dispatch OK; 8 touch points, mostly skill-file edits) | ~$15-25 |
| nightwork-qa (EXISTING reviewer set, ~4 reviewers + UI conditional doesn't apply, DB conditional only if PA-4 path-a; assume path-b → no migration) | ~$15-20 |
| Custodian sweep | ~$3-5 |
| **Estimated total** | **~$103-145** |

**Cost-discipline note:** the estimate is AT or slightly OVER the $100 MEDIUM ceiling. Per Rule 7a, plan-author cannot self-resolve cost overrun. If actual cost projects >$100 mid-plan, halt for Jake bump (one allowed bump to $150 per Rule 7c) OR re-scope. The bootstrap exception's use of the EXISTING (8-reviewer) plan-review set is the cost-driver; the new tier this phase IMPLEMENTS would use 4 reviewers for MEDIUM = ~$15-20 less, but tiering doesn't apply to its own implementation.

If overrun risk is concerning, alternative scopes:
- **(α) Sequence the 8 touch points into 2 plans** (Plan A: skill-file refactor + tier-config; Plan B: SmokeAuthHelper + CLAUDE.md). Each plan stays under $75 per-plan halt. Risk: 2 plans means 2 plan-reviews = doubles the plan-review cost. Probably not a win.
- **(β) Defer SmokeAuthHelper to its own phase.** Implementation phase ships ONLY the tier-aware pipeline refactor; SmokeAuthHelper ships separately. Risk: Phase 2 (UI-FINALIZE) needs SmokeAuthHelper for authed smoke. Probably can't defer.
- **(γ) Approve a single ceiling bump preemptively** ($100 → $150 once per Rule 7c) if Jake judges the bootstrap-exception cost worth absorbing.

**Recommend (γ) — preemptive single bump to $150** for THIS PHASE ONLY (bootstrap exception cost). Jake authorizes at this EXPANDED-SCOPE review.

---

## 11. What this phase does NOT do (explicit non-goals)

- Does NOT change Phase 1's shipped feature-flag pattern (env vars, middleware gates, section-overview filters all stay).
- Does NOT touch the existing `/nightwork-init-phase` scope-author flow except to add `severity:` AskUserQuestion.
- Does NOT modify the gsd-execute-phase skill (executor behavior untouched; tier-awareness lives in /np + plan-review + QA).
- Does NOT modify any source code in `src/` outside of `scripts/lib/smoke-auth.mjs` (which is the only NEW source file).
- Does NOT validate the tiered pipeline empirically — that's Phase 2's job (per design §12 condition (ii)).
- Does NOT close TD-PLANNING-PIPELINE-SEVERITY-TIERING — that requires all 3 conditions met (implementation SHIPPED + Phase 2 completed + Review-1 authored).

---

## 12. Open questions for Jake (decisions needed BEFORE /np)

1. **PA-1 to PA-4 dispositions (above §5):** Confirm or override the 4 plan-author resolution recommendations.
2. **§6 cost-projection (PA-4 path-b + γ preemptive bump):** Authorize $100 → $150 once per Rule 7c for this bootstrap phase OR direct alternative scoping (α / β).
3. **§7 plan-time clarifications:** Confirm `.mjs` for SmokeAuthHelper; confirm CLAUDE.md Rule 10 placement at end of Workflow Posture.
4. **§2 closed-seam contract acceptable?** No `--legacy` flag, no fallback path, atomic-or-marked cutover in FINAL commit, untiered logic DELETED not preserved. Affirm.
5. **§8 bootstrap reviewer-set posture acceptable?** This phase runs under EXISTING 8-reviewer set; no future phase does. Affirm.

---

## 13. Next step (post Jake approval of this EXPANDED-SCOPE)

After Jake's review + approval (potentially with PA dispositions + ceiling bump authorization):

1. Set `Status: APPROVED 2026-05-27` at top of this file.
2. Run `/np tiering-implementation` (chains discuss → plan → plan-review with EXISTING reviewer set per bootstrap exception).
3. HALT at plan-review verdict for Jake sign-off before /nx fires.
4. /nx execute under EXISTING reviewer set.
5. Custodian sweep marks SHIPPED — bootstrap exception expires.
6. From this moment forward, ALL phases consult `severity:` in EXPANDED-SCOPE.md frontmatter.

---

**END OF DRAFT — awaiting Jake review.**

Per nwrp242: "Surface the EXPANDED-SCOPE for that phase for my review before /np fires."

This document is that surface. Do NOT dispatch `/np tiering-implementation` until Jake's review either: (a) approves as-is with PA-1..PA-4 dispositions + ceiling-bump call, (b) revises specific items, or (c) rejects.
