# Nightwork — Lessons learned

Captures behavioral incidents from Claude/agent execution that should not recur. Each entry: date, scope, what went wrong, why it matters, and reinforcement going forward. Not for code patterns (those live in .planning/design/ + CLAUDE.md) — for execution discipline.

---

## 2026-05-15 — Architectural decisions changing route shape require downstream consumer sweep

**Scope:** Stage F1 Wave-E smoke calibration (nwrp147 → nwrp150; commits 1b249b7 + ed075d1 + this commit). Surfaced post-Wave-E ship while bringing the smoke harness to green for the Wave-B prereq #12 gate.

**What happened:** Two pre-existing latent smoke failures (TD-WE-04 /today + TD-WE-05 /settings/workflow) were masked for ~6 weeks by 12 louder logo-invariant failures (TD-WE-01 + TD-WE-02). When the logo invariant was fixed, both surfaced:

- **/today TD-WE-04:** Wave-D commit b4e4dc4 (D-4) authored `primary_ux_selector: "text=Active jobs"` for /today. The /today page (scaffolded earlier in 1.5c-1 commit 8f62295) never rendered that string — the smoke author looked at the wrong place. The selector never matched reality from day one.

- **/settings/workflow TD-WE-05:** Stage 1.5c-IA relocated `/settings/workflow` → `/admin/workflow-customization` via redirect (per D-058 + D-060). The destination is a "Coming F3" placeholder. The original WorkflowSettingsForm.tsx with native `<select>` controls is still in the codebase but no longer reachable at runtime. Smoke harness route table was not updated when the IA relocation shipped — selector `'select'` returned 0 matches because the redirected destination has no form controls.

**Why it matters:** Architectural decisions that change route shape, content, or accessibility require a downstream consumer sweep at plan-author time. The sweep covers: smoke harness route table (`scripts/wave-d-smoke.ts`), dead-code paths (orphan `page.tsx` files whose route is redirected away), documentation references (CLAUDE.md UI rules text, design docs, plan-author briefings), and any other consumer that pins to the changed surface. 1.5c-IA shipped without this sweep, which surfaced 6 weeks later in Wave-E as smoke drift (TD-WE-04) plus undocumented dead code (TD-WE-05). The TD-WE-01 logo invariant failure existed in pre-1.5c-IA Wave-D smoke runs but only at the level of "12 routes red" — the underlying 2 stale selectors were buried in the noise.

**Reinforcement going forward:** Plan-author discipline for Wave-B onward — any plan changing route paths, content sections, or H1 text MUST include a downstream sweep in pre-flight verification. The sweep is mechanical:

1. `grep -r "<old-route>" scripts/wave-d-smoke.ts .planning/ src/middleware.ts next.config.*` — find every pin to the old route surface.
2. For each hit: either update to the new surface OR codify a TD entry documenting the divergence.
3. Plan-review iter-1 BLOCKS without the sweep results attached.

Codify in CLAUDE.md "Workflow posture" as Rule 7 if this pattern repeats. For now, Wave-B Plan B-1 plan-author brief should include explicit `downstream-consumer-sweep` task in pre-flight verification.

Adjacent reinforcement: smoke selector failures are visible signal. Don't tolerate `1/13 PASS` indefinitely on the assumption that "it's all the same logo issue" — the cost of investigating the noise floor is small (live DOM probe = 30 seconds of tool calls), and the payoff is surfacing latent failures before they compound. Wave-E paid 4 weeks of `1/13 PASS` interest on what turned out to be 4 distinct issues.

---

**Scope:** Stage 1.5c Plan 1 execution (gsd-executor agent, commit `114695e`-batch).

**What happened:** During Task 3 (38 redirect rules), the executor spawned a background `npm run dev` server to run curl spot-checks for redirect verification. After completing the curl checks, it terminated the dev server with `taskkill /F /PID …` (forced kill).

**Why it matters:** CLAUDE.md "Nightwork standing rules → Code behavior" explicitly states: **"Never kill running processes. Dev servers, watchers, queue workers, MCP browser sessions, and Vercel preview builds — never `kill -9`, never `taskkill /F`, never close a tab mid-flight to 'reset state.' Wait, signal politely, or open a new instance."** This rule exists because force-killed processes can leave Node module caches in a corrupted state, lose unflushed file system writes (e.g., `.next/` build cache), and create Heisenbugs on the next startup. In Plan 1 the impact was zero (no work was lost), but the precedent is the problem — if normalized, future agents will repeat it on dev servers that DO have unflushed work.

**Reinforcement going forward:** Every gsd-executor brief for the remainder of Stage 1.5c (Plans 2–7) and beyond will include an explicit "Process discipline" clause:

> **Never `kill`, `taskkill /F`, `kill -9`, or otherwise force-terminate a process you started.** If you need to stop a dev server / watcher / curl loop, send SIGINT (Ctrl-C equivalent) once and wait. If a port stays bound after a polite stop, leave it bound and open a new port instead. If a tab/MCP session needs to end, close it from the parent UI, never via process kill. This is non-negotiable — see CLAUDE.md "Nightwork standing rules → Code behavior".

The agent self-documented the violation in its plan SUMMARY which is the right behavior — the rule was not silently broken. But future briefs surface the rule explicitly so it isn't relying on the agent re-reading CLAUDE.md and remembering at the right moment.

---

## 2026-05-15 — Hook precision refactor (nwrp158/159/160/161) successfully prevents false negatives

**Scope:** Wave-B Slice-1 B-1a-bis execute (commit ef0c2cf). Hook fixes landed in commits 3a41ab4 + 5e371d0 + 668c7e2 + 73d69de (5/14–5/15); B-1a-bis consumed B-1a execute (aaa6cff, 2026-05-15 14:23) then B-1a-bis execute (ef0c2cf, 2026-05-15 16:14).

**What happened:** Wave-B execution surfaced hook precision issues (nwrp158–161) in earlier planning cycles:
1. **nwrp158 (iter-3):** Hook-check had false HALT due to missing ENTITY_LABELS Record entry for audit-log action labels (commits 5e371d0 / 668c7e2).
2. **nwrp159:** Hook timeout sensitivity on large migration+refactor payloads (commit 73d69de added defensive env-var guidance).
3. **nwrp160:** Hook fail-closed hardening to prevent partial-apply creep (commit 668c7e2).
4. **nwrp161:** Hook documentation amendments for Wave-B onward (commit 73d69de).

**Outcome:** B-1a-bis commit ef0c2cf passed hook checks cleanly. No false HALTs, no partial applies, no timeouts. Pre-existing violations correctly non-blocking per iter-3 §3.2 amendment. The refactor of 19 consumers + migration 00101 DROP applied cleanly to a live schema.

**Why it matters:** These hook fixes prevent a class of false-negative execution blockers that would compound through Slice-2 / Slice-3 if unaddressed. The precision tuning is now validated against a real post-Wave-A/C/D/E codebase with complex migration + refactor payloads — a good confidence signal for the remaining slice-1 plan and downstream waves.

**Reinforcement going forward:** Hook precision is load-bearing. Any future executor observing a hook halt should:
1. Check if it's a documented pre-existing violation (compare `git diff` against `.claude/hooks/` rules).
2. Check if it's an ENTITY_LABELS gap (extend the Record in `src/lib/audit/action-labels.ts`).
3. Check if it's a timeout (check HOOK_TIMEOUT env or split work into smaller commits).
4. Surface findings to Jake before considering `--no-verify` bypass.

---

## 2026-05-15 — Slice-1 close-out retrospective (Wave-B Slice-1; nwrp152..nwrp166)

**Scope:** Stage F1 Wave-B Slice-1 (B-D080 + B-1a + B-1a-bis shipped 2026-05-14..15; B-1b deferred to fresh session per nwrp164). This retrospective covers patterns surfaced across nwrp152..nwrp166. Companion entry above ("Hook precision refactor") covers the hook-precision narrative; this entry covers the broader discipline patterns.

### Three plan-author quality defects caught at three iter cycles (system worked as designed)

Slice-1 produced 3 plan-author defects that reviewers + executor discipline caught before production:

1. **iter-1 plan-author column-name defect (B-1a-bis):** 14 of 16 consumer-refactor PostgREST embed sketches used `client:clients(name)` instead of `client:clients(full_name)`. The `name` column does not exist; `full_name` is the canonical column added in B-1a's migration 00100. **Caught at:** plan-review iter-1 by ai-logic-tester executing a representative PostgREST query (per Workflow posture Rule 3 codified during Slice-1 itself). Corrected in iter-2 patches across all 14 sites before execute dispatch.

2. **iter-3 sketch enum-value defect (B-1a-bis ITER-2-PATCHES §3.2):** Plan sketch showed `activity_log.action = 'client.created'`, but `'client.created'` is NOT a valid `ActivityAction` enum value in `src/lib/activity-log.ts`. Valid actions are `'created'`/`'updated'`/`'state_changed'`/etc. — the `entity_type` discriminator is separate from `action`. **Caught at:** executor pre-commit review by reading current `ActivityAction` union. Executor corrected to `action: "created"` inline; plan sketch was wrong but executor didn't propagate the wrong value to code.

3. **B-1a-bis execute design-token + accessibility defects (post-execute QA):** OnboardWizard.tsx:656 introduced hardcoded hex `#3F5B62` (BLOCK NEW per hook touched-lines-only classification); new ClientCombobox.tsx lacked WAI-ARIA combobox role triad + aria-controls (4 FLAGs from ui-reviewer + design-system-reviewer cross-reviewer agreement). **Caught at:** post-execute /nightwork-qa 9-reviewer parallel dispatch. Fixed in single atomic bundle commit `323f0be` per nwrp162 directive.

**Pattern:** all 3 defects were caught at successively-later but-still-pre-production checkpoints (plan-review → executor → QA). The defect-rate-per-slice is higher than Wave-D/Wave-E baselines (those waves had 0-1 defect per slice). Possible cause: B-1a-bis was the architecturally-heaviest plan in the slice (19-file refactor + DROP COLUMN migration + new API endpoint + new UI component) — defect density scales with surface complexity.

**Reinforcement going forward:**
- **Iter-1 plan-review's ai-logic-tester must execute representative PostgREST queries** for any embed-hint claim (codified mid-Slice-1 as Workflow posture Rule 3; this is the rule that caught defect #1).
- **Plan sketches in ITER-PATCHES files are FYI for executor, not authoritative.** Executor MUST verify enum-value/type-shape claims against current code, not propagate sketch text verbatim. This is now a documented executor discipline.
- **9-reviewer parallel QA dispatch caught the touched-lines-only design-token violation that single-reviewer would have missed.** Cross-reviewer agreement on UI/design-system concerns is the gating mechanism for new UI surfaces; don't skip these reviewers on plans introducing new components even when the plan is "schema-heavy."

### Cost-ceiling discipline pattern (Slice-1 underestimated by 50%; Slice-2 forward calibration)

Slice-1 cost ledger:

| Plan | Estimated | Actual | Delta |
|------|-----------|--------|-------|
| B-D080 (FK convention migration) | ~$5 | ~$8 | +$3 / +60% |
| B-1a (clients schema + backfill) | ~$10 | ~$15 | +$5 / +50% |
| B-1a-bis (19-file consumer refactor + DROP) | ~$20 | ~$40 | +$20 / +100% (rework + hook-precision refactor + 9-reviewer QA) |
| Bundle fix + docs + smoke + bootstrap | included | ~$3 | — |
| **3-plan ceiling (nwrp152)** | **$50** | **~$66-68** | **+$16-18 / +32-36%** |

Two ceiling events fired during Slice-1:
- **nwrp157 Path C pause** (mid-B-1a-bis at $45-50 spend): clean checkpoint pause + fresh session resume. Discipline-preserving move; cost continued to climb under the next session.
- **nwrp161 ceiling bump** to $75: enabled completion of B-1a-bis + post-QA fix bundle. Crossed at ~$66-68. **nwrp162 explicit prohibition of third bump** prevented the discipline-erosion failure mode.
- **nwrp164 hard halt** (pre-B-1b): cost projection for B-1b alone ($33-65) would have overrun to $99-133 vs $75 ceiling. Path-(a) clean session reset chosen over (b) third bump or (c) scope-engineering to dodge gate.

**Pattern:** ceiling estimates underestimated by 50% in Slice-1; the bigger plan (B-1a-bis) overran by 100%. Likely cause: rework cycles (iter-2 patches, hook-precision refactor over 4 commits, 9-reviewer QA cycle) aren't accounted for in plan-author's pre-execute estimates. Single-pass execute would have stayed near estimate; multi-iter cycles compound.

**Reinforcement going forward:**
- **Slice-2 forward estimate uses Slice-1 actuals + 20% buffer.** Per-plan range ~$22/plan mean (excluding $40 B-1a-bis outlier with rework). 6-plan Slice-2 estimate: $132-193 with $200 ceiling per nwrp166.
- **Per-plan halt gate added (per nwrp166):** if any individual plan projects >$50 mid-authoring, halt for Jake re-scope. Slice-1's B-1a-bis blew this line without a gate to catch it; Slice-2 won't repeat.
- **Ceiling discipline is non-negotiable.** Bumping a second time within a slice (nwrp161) was a calibrated exception; a third bump (nwrp162 prohibited) would have eroded the gate's function. Future slices: max one bump per slice OR halt-for-fresh-session per nwrp164 precedent.

### QA-report-write-step gap (nwrp163 process-discipline catch)

After B-1a-bis 9-reviewer parallel QA returned verdicts, the synthesized report was produced IN-CONVERSATION but NOT written to `.planning/qa-runs/<timestamp>-qa-report.md`. Step 6 of the nightwork-qa skill explicitly requires the disk write; it was missed during inline synthesis.

The pre-commit hook caught this: when the post-QA fix bundle commit was attempted, the hook flagged "Latest /nightwork-qa report is 114 minutes old (>60). Recent code may not be covered" — because the file-timestamp evidence was 114 min old even though the actual review cycle was minutes old.

**Resolution per nwrp163:** path-(a) chosen — write the missed report from in-context synthesis. Three rejected options:
- (b) re-run /nightwork-qa: would burn $2-4 to re-validate something just validated.
- (c) `--no-verify` bypass: would set wrong precedent (authorize-around-working-discipline-gate); same anti-pattern as plan-author self-resolving HALTs. The hook is doing its job; satisfy the gate honestly.

**Reinforcement going forward:**
- **The hook is doing its job correctly: checking disk evidence timestamp, not conversation context.** Disk evidence is auditable; conversation context isn't.
- **nightwork-qa skill step 6 (write report to disk) is gate-blocking, not optional.** Inline synthesis is fine intermediate state; persistence to `.planning/qa-runs/*.md` is the canonical record. Skill-text already documents this; the gap was orchestrator behavior (inline synthesis without persistence), not skill ambiguity.
- **When a discipline gate fires, satisfy it honestly rather than bypass.** This applies symmetrically to: plan-author HALT gates, hook fail-closed gates, cost-ceiling gates, cross-reviewer factual disagreement gates.

### Path-A halt vs split-plans decisions (nwrp164 / nwrp166)

Two decision points in Slice-1 closing where the disciplined orchestrator option (halt + fresh session, OR distribute carry-forwards) was chosen over the convenient option (bump ceiling, OR bundle into a new plan):

1. **nwrp164 B-1b deferral:** path-(a) clean session reset chosen over (b) third ceiling bump or (c) splitting B-1b into B-1b-A/B-1b-B (scope-engineering to dodge budget gate). Reasoning: B-1b is architecture-shaping work (validator interface contract + Layer 2 standards) inherited by 35+ future WI validators across F2-F5; not work to rush on fumes-budget with depleted attention. GATE 2 HALT review benefits from fresh eyes.

2. **nwrp166 Q11 distribute over bundle:** distribute Slice-1 carry-forwards (TD-B1abis-01/02/03 + W.1 unflag) across existing Slice-2 plans rather than create new B-8 polish bundle. Reasoning: Frankenstein bundling creates iter-1 review difficulty (4 unrelated diffs in one review) + any-item-blocks-bundle risk (one finding holds 3 hostages). Distributing into B-2/B-3/B-4 preserves atomic-commit discipline + reviewable surface per host plan.

**Pattern:** disciplined orchestrator options are usually slower per-step but compound favorably:
- Halt + fresh session pays attention/budget cost upfront, but downstream GATE 2 HALT review benefits from full bandwidth.
- Distribute over bundle adds bookkeeping complexity, but preserves the iter-1 review-per-plan invariant that catches defects.

**Reinforcement going forward:**
- **"Continuing past ceiling without authorization is OVERRIDE, not preserved discipline"** (Jake's explicit framing correction in nwrp157). Ceilings have to bite when crossing them feels convenient or they stop functioning.
- **Don't scope-engineer to dodge budget gates.** Splitting a plan to "fit" the remaining budget is the same anti-pattern as bumping the ceiling — both circumvent the gate's purpose. If the work doesn't fit, halt for re-scope authorization OR fresh session.
- **Distribute > bundle when carry-forwards have heterogeneous review surfaces.** Bundle is appropriate for genuinely-unified work (e.g., the post-QA fix bundle at commit `323f0be` was 2 surfaces but both were "B-1a-bis QA fix-now items"); not appropriate for assorted small items.

### Inheritance to Slice-2 + downstream waves

These patterns now propagate to Slice-2 EXPANDED-SCOPE and beyond via:
- Workflow posture Rule 3 (ai-logic-tester executes representative queries) — codified mid-Slice-1, now standard.
- Per-plan $50 halt gate (per nwrp166 §17) — new for Slice-2.
- Distribute-not-bundle convention for cross-slice carry-forwards (per nwrp166 §7-13) — Slice-2 follows.
- Hook fail-closed contract validated against real migration+refactor payload (per nwrp158-161 chain) — Wave-B-onward executors inherit.
- "Hook catching missing step is system working as designed" (per nwrp163) — discipline reinforced; no future bypass instinct.

---

## 2026-05-18 — Commit `2cdeea4` `--no-verify` bypass framing clarification (nwrp170 audit follow-up)

**Scope:** Weekend deliverables commit `2cdeea4` (Monday 2026-05-18) used `--no-verify` per nwrp169 explicit Jake authorization. nwrp170 audit identified three weaknesses in the original commit body's framing of that bypass; this entry clarifies the framing on the audit trail without force-pushing to main (Path B per nwrp171 authorization).

**What the original commit body said (literal text from `2cdeea4`):**

> Per nwrp167 weekend authoring protocol; per nwrp169 Jake authorization for --no-verify bypass:
> - 100% documentation changes; zero code touched
> - Hook QA timestamp intent: verify recent code coverage — not relevant for doc-only commits
> - Hook calibration gap surfaced (see TD-NW-HOOK-DOC-ONLY-DETECT — landing in follow-up commit per nwrp169 Step 4)
> - All discipline gates documented in CLAUDE.md Rules 7-9 (codified this commit)

**Three weaknesses identified by nwrp170 audit:**

1. **Rule 8(a) per-incident authorization citation MISSING.** CLAUDE.md Rule 8(a) (codified in `2cdeea4` itself) states: *"Hook halts are not opportunities for `--no-verify` bypass. When a hook blocks a commit, the response is: (1) understand why the hook fired, (2) satisfy the gate honestly. Bypass via `--no-verify` requires explicit per-incident Jake authorization with documented rationale in commit body."* The `2cdeea4` body cited "nwrp169 Jake authorization" but did not handle-cite Rule 8(a) explicitly. The reference is implicit; future auditors reading the commit body alone (without nwrp169 in hand) would not see the Rule 8(a) handle.

2. **One-time framing AMBIGUOUS.** The phrase "Per nwrp169 Jake authorization for --no-verify bypass" is consistent with one-time authorization but does not explicitly state "this is a one-shot authorization for this specific commit, NOT a standing precedent for all doc-only commits." Generic rationale points listed in the body (100% docs, hook intent gap) read as if they could be a template for future doc-only commits — that is NOT the framing Rule 8(a) requires.

3. **TD-NW-HOOK-DOC-ONLY-DETECT termination condition IMPLICIT.** The body names the TD but does not state that the `--no-verify` authorization terminates when the TD ships. Bypass-end-condition was implicit at best; the audit trail should make it explicit.

**Clarification (the framing that should be read alongside `2cdeea4`):**

- **Rule 8(a) per-incident citation:** the `--no-verify` on `2cdeea4` is the per-incident bypass authorized by Rule 8(a). Jake's nwrp169 §57-66 is the documented rationale required by Rule 8(a). No other bypass is authorized by this incident.

- **One-time authorization, NOT standing precedent:** nwrp169's `--no-verify` authorization applies to commit `2cdeea4` ONLY. Future doc-only commits (including this clarification commit + any follow-ups) must satisfy the hook honestly OR obtain fresh per-incident Jake authorization. The "100% docs / hook intent gap" rationale is descriptive of WHY `2cdeea4` qualified for one-shot authorization; it is NOT a self-service template for future bypasses.

- **TD-bound termination condition:** the `--no-verify` authorization pattern terminates when TD-NW-HOOK-DOC-ONLY-DETECT ships. After the TD lands (adding the file-extension filter to `.claude/hooks/nightwork-pre-commit.sh`), doc-only commits will satisfy the hook cleanly without bypass; any future `--no-verify` on a doc-only commit would indicate either (a) the TD fix is broken, OR (b) the bypass intent is not actually doc-only. Either case demands halt + Jake review.

**Why it matters:** Rule 8(a) is load-bearing for the entire hook-discipline contract. Slice-1's nwrp163 lesson established that bypassing a working hook to "make a problem go away" erodes the gate's discipline value over time. The Wave-A iter-1 four `--no-verify` incidents (referenced in CLAUDE.md Dev Rules) are the prior anti-pattern this rule prevents. Original `2cdeea4` framing — while substantively correct (Jake-authorized + documented) — left enough ambiguity that a future executor reading it could mistake the rationale points for a standing precedent. Clarification eliminates that risk.

**Reinforcement going forward:** future `--no-verify` commit bodies MUST contain three explicit elements per Rule 8(a) audit-trail requirement: (1) the Rule citation (e.g., "Per Rule 8(a) per-incident authorization"), (2) the specific Jake authorization message reference (e.g., "Per nwrp###"), (3) the bypass termination condition (e.g., "Bypass ends when TD-XXX ships"). This commit-body discipline closes the ambiguity gap surfaced by nwrp170.

This clarification entry is itself a doc-only commit but does NOT use `--no-verify` (per nwrp171 §23 explicit direction). If the hook fires on stale qa-runs timestamp (likely — last qa-runs file is 2026-05-15 17:30 EDT, ~64hrs stale at Monday commit time), halt + surface per nwrp171 §23. The clarification commit asserting tighter bypass framing must itself not bypass the gate.

---

## 2026-05-18 — B-1b execute compression signal + Rule 1 test-driven bug detection (system working as designed)

**Scope:** Stage F1 Wave-B Slice-1 Plan B-1b execute via fresh session (nwrp171 dispatch; 45-min actual spend vs 22h plan-author estimate).

**What happened:** B-1b executed in 45 minutes. Plan-author estimate was 22h (includes buffer). Cost ceiling for the fresh session was $50; actual spend ~$5–8. KG scaffold + 3 validators + types pipeline + 4 Layer 2 standards + W.1 listener wiring all shipped cleanly in a single block of work.

**Key finding — Plan-author 22h included legitimate buffer, not underestimate.** The estimate was NOT too high. The 22h pre-buffered for unknowns (validator scaffolding complexity, Layer 2 standards infrastructure shape, types-pipeline CLI behavior on the linked project). Actual execute found no unknowns — the pre-planning by gsd-planner + nwrp153 amendments locked the shape cleanly enough that the buffer burned zero. This is a confidence signal, NOT a forecasting miss.

**Rule 1 (test-driven bug detection):** Unit test 7 in client-pii-not-embedded (`"dedupe: aliased wildcard matched by both patterns counted once"`) surfaced a bug in the wildcard dedupe key. Initial code used `${code}:${hit.index}` as the dedup key; both WILDCARD_PATTERN and ALIAS_WILDCARD fire on the same embed (`client:clients(*)`) but at different start positions, so the dedupe set kept both. Test assertion "should have exactly 1 violation" caught the bug before commit. **System worked as designed:** a well-written falsifiable test caught a logic error in early development, before the validator shipped to production. Fix was inline (change key to END offset, where both patterns converge), commit 208c7d6. No post-execute regression; no production blast.

**Why it matters:** Plan-author 22h estimate was conservative-but-not-overestimated. Future sessions observing similar ±50% variance (estimate vs actual) should distinguish: (a) legitimate buffer burning zero because unknowns didn't manifest (good pre-planning, happens more as stage matures), vs (b) actual underestimate (rare when pre-planning is solid). B-1b is case (a). The pattern to reinforce: don't reflexively cut future estimates in half because this one compressed; instead, track whether the compression is "buffer burned" (good) or "underestimate corrected" (concerning).

**Reinforcement going forward:**
- **Quality test suites are load-bearing.** Don't defer unit tests on the assumption that "we'll smoke-test instead." The smoke harness tests end-to-end flows; unit tests test logic boundaries. Both are necessary. B-1b's 23 unit test cases (23/23 PASS) caught a dedupe logic error in ~6 seconds of test execution; that error would have appeared as a bug report within 1 week of production if the test didn't exist.
- **Buffer comprehension:** distinguish "estimate includes unknowns" (good pre-planning) from "estimate is wrong" (concerning). B-1b-authored estimate + high-detail pre-planning = buffer. When buffer compresses to zero because unknowns don't manifest, that's validation that the pre-planning was solid, not a signal to cut estimates for the next similar plan.
- **Track per-plan compression signals.** If B-2 also compresses 45min actual vs 20h estimate, pattern holds. If B-2 takes 18h, that's a different signal (unknown surfaced mid-plan; buffer was justified). Run the comparison before B-3 authoring.

---

## 2026-05-19 — Deferred security cleanup via standalone phase (Wave-A iter-1)

**Scope:** stage-f1-wave-a-iter1-cleanup — a security hygiene cleanup (search_path hardening + REVOKE EXECUTE + extension schema move) originally deferred from Wave-A iter-1 as MED-WA-1 scope drift.

**Pattern:** When plan-review iter-1 surfaces scope drift (e.g., 8 functions identified post-authoring as needing security hardening), the default is to defer to Wave-B/Wave-C as part of larger plans. However, if the drift is (a) pure-database cleanup, (b) atomic + isolated, (c) doesn't block immediate next-phase, AND (d) reduces signal-to-noise for the immediate next-phase's plan-review iter-1, a **standalone deferred-cleanup phase** can ship between slices as a focus-preserving alternative to either bundling-and-bloating or deferring-indefinitely.

**This phase's characteristics:**
- (a) Pure database: 3 migration sections, no code changes, no new entities, no async/webhook/UI surfaces touched
- (b) Atomic: single migration file, 3 internal DO blocks verify each section, all-or-nothing transaction, paired `.down.sql`
- (c) No immediate-next-phase blocker: Wave-B Slice-1 B-1b is code-only, doesn't require search_path / extension schema posture; deferred-cleanup doesn't gate Slice-2 dispatch
- (d) Reduces iter-1 noise: 24 advisor lints (8 search_path + 2 extension + 14 SECURITY DEFINER) cleared before Slice-2 iter-1 plan-review runs (Slice-2 plans will include trigger functions, so inheriting a clean search_path + REVOKE baseline simplifies review)

**Execution posture:** Standalone deferred-cleanup phases work well when orchestrator (Jake) explicitly approves the sequencing (per nwrp165 weekend Option A scope + nwrp167 sequential autonomous execution). The `halt_after: true` contract ensures the phase doesn't auto-proceed to QA; separate QA session per orchestrator discretion. No plan-review iter cycles needed (plan was authored pre-phase with full detail). Self-verifying via inline DO blocks (no external QA reviewer required).

**Extension-move-with-operator-class pattern (mechanical learning):** When moving an extension to a new schema (here: pg_trgm + vector → extensions schema), the post-migration step that ensures operator classes resolve correctly is: (1) CREATE SCHEMA + GRANT, (2) ALTER EXTENSION SET SCHEMA, (3) ALTER DATABASE SET search_path to include new schema. This three-step pattern is load-bearing; missing step 3 breaks existing indexes on operator classes from the moved extension. The pattern was correctly applied in migration 00102; no regressions surfaced. Future extensions moved to dedicated schemas can reuse this pattern verbatim.

**Type-regen alongside extension move:** The pg_trgm extension exposed two RPC-style helper functions (show_limit, show_trgm) that PostgREST auto-exposed in database.types.ts. Once the extension moved schemas, those helpers no longer appeared in the Functions enum. The pre-commit type-regen hook (`npx supabase gen types`) auto-detected the change and regenerated types.ts with the 2-line removal. This was NOT a manual change — it's an artifact of the schema transformation. The hook enforcing regen + the automatic removal of unused-after-move identifiers worked cleanly. **Pattern to note:** when moving extensions, expect type-system changes to be automatic (not user-authored) and commit them inline with the migration per CLAUDE.md schema-changes-regen-types rule.

**Codification:** When surfacing deferred scope drift at plan-review iter-1, distinguish between: (a) bundled-into-next-plan (costs the next plan scope), (b) deferred-to-future-phase (risk of indefinite deferral + signal-to-noise accumulation), and (c) standalone-cleanup-phase (appropriate when isolated + atomic + reduces immediate-next-phase-noise). Add explicit orchestrator question during iter-1 debrief: "Is this worth a standalone cleanup phase, or should it bundle/defer?"

**Reinforcement for Wave-B onward:** Don't silently defer scope drift. Surface it explicitly at plan-review iter-1 with option (c) as a choice when criteria are met. Slice-2 plans will include new trigger functions with SECURITY DEFINER context — inheriting a clean search_path baseline + REVOKE pattern makes the code-authoring more focused. This cleanup phase as a standalone move enabled that clarity without bloating Slice-2's immediate scope.

---

## 2026-05-22 — Slice-2 estimate ~2x low: HIGH-threat plans hitting pre-existing-artifact landmines

**Scope:** Stage F1 Wave-B Slice-2 (B-2a, B-2b, B-3 shipped per nwrp209/213/219; B-4..B-7 sequenced). Filed at GATE B-3 sign per nwrp219 §16-17 retrospective directive.

**What happened:** Slice-2's per-plan estimates assumed each plan landed within its declared estimate band. Actuals diverged systematically by plan-class:

| Plan | Estimate | Actual (projected) | Multiplier | Class |
|------|----------|---------------------|------------|-------|
| B-2a | $30-45 (HIGH threat per nwrp200) | ~$77-98 | ~2-2.5x | HIGH-threat (composite FK + RPC NULL-leak fix + token lifecycle + revocation + helpers + ACL hardening; pre-existing-artifact landmines: 00074 partial token-hash index timing oracle + B-4 NULL leak surfaced at QA) |
| B-2b | $15-22 (medium threat) | ~$24-28 | ~1.5x | lean (read-only UI on proven foundation; minimal pre-existing-artifact intersection) |
| B-3 | $35-50 (HIGH threat per nwrp214) | ~$81-125 | ~2-2.5x | HIGH-threat (32-table trigger + DEF-WC-1 + DEF-WC-3 + 23-entry TS union extension; pre-existing-artifact landmines: pg_default_acl auto-grant + clients/client_portal_access Pattern B taxonomy + RLS-pattern divergence + entity_type singular/plural divergence surfaced at QA iter-1) |
| Slice-2 (cumulative) | $130-193 (sum of estimates) | ~$315-456 (projected) | ~2-2.4x at high end | — |

**Pattern:** HIGH-threat plans systematically ran ~2-2.5x over estimate because the estimates priced the *plan-author's stated scope* but not the *pre-existing-artifact landmines* that plan-review iter-1 + QA surfaced. Lean plans (no/low intersection with pre-existing artifacts) tracked ~at estimate.

**Specific landmines (B-2a + B-3 examples):**
- B-2a's iter-1 SYNTHESIS B-4 NULL-leak finding was in the pre-existing `create_client_portal_invite` RPC (migration 00074); the plan's RPC rewrite scope hadn't anticipated the fix-the-pre-existing-bug requirement. Required iter-2 + execute + post-execute ACL hardening (00105) + considered cost bump (nwrp207 + nwrp208).
- B-2a's `pg_default_acl` discovery at QA — Supabase's default ACL grants `authenticated` EXECUTE on new SECURITY DEFINER functions in `app_private`; required REVOKE-per-function pattern (4 instances filed under TD-NW-APP-PRIVATE-DEFAULT-ACL-HARDEN).
- B-3's pre-design audit (per nwrp214 §7-13 mandatory) caught: 32 target tables NOT 25 estimated + TWO RLS patterns (Pattern A canonical Wave-A vs Pattern B PERMISSIVE-only joins); these were "discovered facts" the original $35-50 estimate hadn't priced.
- B-3's BLOCKING-1 catastrophic catch: entity_type singular/plural divergence (TG_TABLE_NAME emits plural; all 74 existing activity_log rows + TS union are singular). Caught at ai-logic-tester iter-1; required CASE mapping addition + Task 6 per-table verification with nwrp216 Q3 mandate.

**Why it matters:**
1. **Forecast integrity for F2-F5.** The F1 phases were estimated using the same heuristics; if HIGH-threat plans there follow the same 2x pattern, F2-F5 timelines/budgets need adjustment.
2. **Ceiling discipline at the forcing moment.** Slice-2 needed a second per-slice ceiling bump ($300 → $400 per nwrp219 §11; first bump $50→$75 per iter-2 was per-plan, not Slice-cumulative). The discipline held because GATE B-3 was the forcing moment with real numbers, not preemptive bumping.
3. **Estimate-vs-discipline.** This is an estimation lesson, NOT a discipline failure. Discipline contracts held: per-plan halt gate triggered for B-2a + B-3 iter-2; per-plan-halt-vs-ceiling-bump-vs-fresh-session decision tree (Rule 7c/d/e) was followed at each forcing moment.

**Reinforcement going forward:**

- **F2-F5 estimation rule of thumb:** HIGH-threat plans ~2-2.5x base estimate; lean plans ~at estimate. Buffer Slice estimates by ~75% if Slice contains HIGH-threat plans; ~20% for lean-majority Slices.
- **Pre-design audit (per nwrp214 §7-13) is load-bearing.** Surfacing pre-existing-artifact landmines BEFORE design landed catches them at plan-author time, not at QA time. B-3's pre-design audit caught 32 vs 25 + Pattern A/B + auth.uid() refinement BEFORE design ran. The B-2a lesson — that pre-existing artifacts hide landmines — drove this discipline; carry it forward to F2-F5.
- **Cost ceiling bumps at forcing moments, not preemptively.** nwrp216 Q2 (defer ceiling decision to B-3 actual ship spend) was the right discipline. Pre-bumping $300→$350 at B-3 plan-time would have been "blank check at a moment we didn't have real numbers." nwrp219 bumped $300→$400 with real B-3 actuals + B-4..B-7 projection.
- **Per-plan halt gate stays even with ceiling bumps.** Slice ceiling went up; per-plan $50 halt gate did NOT. That's the right shape: the gate catches in-flight overruns; the ceiling decision happens at forcing moments. Don't conflate them.
- **B-4/B-6/B-7 get tightened Tier-2 rigor** (lean reviewers, single iter) since they're lean-class; B-5 gets fuller HIGH rigor (external webhook surface). This is the estimation-aware reviewer-scope discipline going forward.

**Codification:** Estimation lesson for F2-F5. Add explicit "estimate base × HIGH-threat multiplier" note to F2-F5 plan-author dispatch language. Track per-plan multiplier post-ship to refine the heuristic (B-2a 2.0-2.5x, B-3 2.0-2.5x → if F2-F5 HIGH plans land near 2x, heuristic is good; if they land at 1.5x or 3x, refine).

**Cross-references:**
- nwrp207 + nwrp208 (B-2a considered bumps for QA + ACL fix)
- nwrp215 (B-3 iter-2 $50→$75 bump scoped to iter-2 only)
- nwrp219 §11-17 (Slice-2 ceiling $300→$400; this retrospective directive)
- TD-B3-FIXTURE-COVERAGE-32-TABLE (pre-real-data requirement landed via the same landmine class — 27 of 32 not empirically tested at execute time)
- TD-NW-APP-PRIVATE-DEFAULT-ACL-HARDEN (4-instance lineage; same pre-existing-artifact-pattern across 4 plans)
- TD-NW-HOOK-EXECUTE-PHASE-DETECT (process gap surfaced at scale — calibration debt accumulating; same pattern as TD-NW-HOOK-DOC-ONLY-DETECT predecessor)

---

## 2026-05-27 — Phase 1 "internal-launch-hide" SHIPPED: LOW-severity tiering prototype validation

**Scope:** Internal Ross Built Launch Phase 1 (HIDE → UI-FINALIZE → BUILD → fix → TEST/dogfood). Authorization chain nwrp225 (scope-locked) → nwrp227 (Phase 1 authorized) → nwrp238 (addendum approved; ship). Execute commits `265a752..0cff0a0` (6 task commits). Reduced reviewer set per LOW-severity tiering: security + planner only (skipped nightwork-spec-checker, custodian, ai-logic-tester, ui-reviewer, design-system-reviewer, rls-auditor, database-reviewer per decision TD-PLANNING-PIPELINE-SEVERITY-TIERING). This is the first live use of the tiering gate.

**What went right:**

1. **LOW-severity tiering prototype validated:** $50 halt-gate ceiling held; 1 bump used (nwrp231 → nwrp232 extends to cover revision cycle); no scope-engineering; no `--no-verify` bypass; all Execute-Phase footers present; Drummond gate not triggered. The tiering discipline gate worked as designed. Reduced reviewer set (security + planner only) caught all relevant findings and did NOT miss critical defects (zero BLOCKING/CRITICAL/WARNING findings post-execute).

2. **Anon + authed verification split discovered:** The phase's runtime AC required TWO complementary methods: anonymous Playwright smoke (caught Owner Portal dual gate firing before route handler per nwrp232 W-1) and authed visual walk (Jake walked 6-section nav on Vercel preview; all 6 checklist items clean). This split is now a prototype for future tiered-pipeline phases. Anon-only smoke had masked the auth-gate-fires-first behavior that the actual UX sees.

3. **PerJobTabs PO clarification landed clean:** nwrp232 OQ Option (a) — added `/jobs/[id]/purchase-orders` literal entry to moreBaseItems. Route exists as 15KB real-DB UI; section overview shows 4 primary + 3 More tabs per visual walk.

4. **PLAN/CONTEXT imprecision documented for future tiering:** PLAN.md + CONTEXT.md framed the new 404 gates as "auth-agnostic," which is true at gate-logic level but misleading at middleware-flow level (auth gate at line 155 fires BEFORE the new gates for non-PUBLIC paths). Documented in QA addendum (nwrp237) so future tiered phases don't inherit the imprecise framing.

5. **Authed smoke infrastructure → required tiering-design deliverable:** The smoke script currently treats HTTP 307 as failure on hidden-route assertions. The QA addendum (nwrp238 approval) mandated that authed-smoke SmokeAuthHelper primitive is a REQUIRED output of the tiering design, not optional. Phase 2 dispatch is blocked pending tiering design including this primitive.

**What didn't go right / adjustments needed:**

1. **Dangling placeholder reference (non-blocking):** `/company/cash-flow/page.tsx:17` references `/company/overview` as if live, but Overview is now `live: false`. Page is 404'd in flag-OFF state so no user impact. Eligible for Wave 1.1-Lite cleanup (planner NOTE-2). Didn't block Phase 1 ship per nwrp238 approval.

2. **Smoke numbering cosmetic divergence:** PLAN AC refers to "smoke #3" for Owner Portal admin POST; implementation numbers it as test #4 (test #3 is anon GET). Numbering divergence is cosmetic; the W-1 path correction itself is correctly applied (planner NOTE-1). Not blocking.

3. **Security-reviewer NOTE-1 verified false:** Claimed "T1 commit `265a752` does not carry Execute-Phase footer." Orchestrator verified via source: footer `Execute-Phase: internal-launch-hide-task-1` IS present at commit body bottom. Per Workflow Posture Rule 9 (cross-reviewer factual disagreement halt), orchestrator resolved against source. Hook discipline intact; finding rejected.

**Lessons for next phases:**

1. **Anon vs authed smoke is a tiering-design choice, not a local concern.** Future LOW-severity phases cannot assume anon smoke covers the same paths as authed smoke due to middleware auth gate. Tiering design MUST ship SmokeAuthHelper primitive + guidance on when anon-tolerant vs authed-primitive applies.

2. **PLAN/CONTEXT framing audits on future tiering phases.** Check for "auth-agnostic" patterns that mask middleware-flow order. If gates claim logic-level auth-agnosticism, document the middleware flow explicitly so future readers understand when the gate actually fires.

3. **LOW-severity rigor holds at 2+ reviewers minimum.** This phase used security + planner (2 reviewers). Both reached PASS independently. The skipped reviewers (ui/design/db/spec/custodian) would have caught planner NOTE-1 + NOTE-2 (cosmetic + cleanup items), but neither blocked ship. If future LOW phases plan to skip even one category, surface explicitly at dispatch.

4. **Cost discipline at tier level, not just per-plan.** This phase was one-phase-long, so per-plan halt gate wasn't reached. Multi-phase LOW slices will hit the per-plan gate; ensure slice-level coordination is documented (e.g., can a LOW slice's per-plan overrun bump the slice ceiling, or does that require MEDIUM escalation?).

5. **TD-PLANNING-PIPELINE-SEVERITY-TIERING is NOT done.** Phase 1 validated the LOW-tier approach (2 reviewers, no-spec-checker, no-db-reviewer, no-ui-designer). The formal tiering design (BLOCKING on F2-F5 dispatch) must document:
   - Reviewer-set profiles per severity (LOW=2 min, MEDIUM=4-6, HIGH=6+?)
   - Per-plan cost ceiling per severity
   - Authed-smoke SmokeAuthHelper primitive (required per nwrp238)
   - Guidance on when anon-tolerant vs authed applies
   - Escalation rules (LOW overrun → MEDIUM? or to ceiling bump?)

**Cost discipline (Phase 1 specific):**
- Ceiling: $50 per nwrp227+231; 1 bump used (nwrp231 → nwrp232 extends to cover revision)
- Execute INLINE mode (no subagent dispatch) — burned inline tool-use cost only + 2 reduced QA reviewers
- No ceiling bump requested during execute or QA
- Hook bypass count: unchanged (4 historical; no new bypasses added by Phase 1)

**Codification:**
- Archive Phase 1 artifacts to `.planning/phases-archive/internal-launch-hide/` ✓
- Add calibration-log entry for Phase 1 per .planning/calibration-log-schema.md (not in this lesson entry scope — separate custodian step)
- Update MASTER-PLAN.md §9 CURRENT POSITION + §12 NEXT PLANNED WORK + §11 TD-PLANNING-PIPELINE-SEVERITY-TIERING status note (pending)

---

## 2026-05-28 — Phase-1 × W.1-listener production interaction debug (nwrp247-254): three lessons on verification, env-flips as deploy events, and diagnostic discipline

**Scope:** Post-Phase-1 ship (internal-launch-hide SHIPPED 2026-05-27 per commit `7766d00`). Authed walk on production `https://nightwork-platform.vercel.app` was broken on the morning of 2026-05-28 — no top nav, no role badge, no PLATFORM badge, "ALL 0 JOBS" sidebar, page stuck "Loading...", zero Supabase requests fired from the browser. Initial diagnosis routed to "Phase 1 caused it" via Jake's binary test (pre-Phase-1 deploy `isuinxe7t` worked; post-Phase-1 prod `cl0ds1ths` broken).

**What actually happened:** Read-only investigation across nwrp247-254 surfaced a **two-variable interaction bug, not a single-variable regression**. Truth table after the full debug:

| Source | Listener env (`NEXT_PUBLIC_AUTH_STATE_LISTENER`) | Deploy | Outcome |
|---|---|---|---|
| pre-Phase-1 (`9b041b9`) | `true` (inlined) | `isuinxe7t` (May 26 16:14) | works |
| pre-Phase-1 (`9b041b9`) | undefined | `r02hbraom` (May 28 09:04, D1) | works |
| post-Phase-1 (`acbfa06`) | `true` (inlined) | `cl0ds1ths` (May 27 17:54) | **broken** |
| post-Phase-1 (`acbfa06`) | undefined | `ljdtfrt5b` (May 28 08:41) | works |

Both halves were required to trigger the deadlock. Listener-alone (isuinxe7t) works; Phase-1-alone (ljdtfrt5b) works; both together (cl0ds1ths) deadlocks. Mitigation: listener-off on Production (`vercel env rm NEXT_PUBLIC_AUTH_STATE_LISTENER production`). Mechanism not yet identified — deferred to `TD-WB-LISTENER-PHASE1-INTERACTION.md` for D2 bisect + D3 bundle diff + real fix.

**Why it matters:** Three independent process gaps surfaced during this debug, each requiring its own reinforcement.

### Lesson 1 — Preview ≠ Production when env vars drive code paths

The W.1 listener was unflagged on 2026-05-26 via commit `aa3a5a4` (env-var operation, no source change). The unflag added `NEXT_PUBLIC_AUTH_STATE_LISTENER=true` to BOTH Production and Preview Vercel environments, but the only smoke/QA verification that ran against the change was the harness running on Preview, which uses the `src/lib/verification/_browser.ts` `setSession()` bridge to bypass the normal cookie-load path. Real-user behavior in Preview also reads through that same `client.ts` block (the outer if-gate `process.env.NEXT_PUBLIC_VERCEL_ENV !== "production"` is true on Preview), and even though the inner block is a no-op for real users (the harness global isn't set), the structural divergence means Preview's verification surface NEVER exercises Production's exact code path.

Phase 1's QA report (`.planning/qa-runs/2026-05-27-1536-internal-launch-hide-qa-report.md`) walked Vercel Preview deploys — which inherit listener-on AND the harness-bridge gate that no real-user Production build has. The bug surfaced only in the Production build's code path; Preview verification could not have caught it.

**Reinforcement:** Per `.planning/process/PLANNING-PIPELINE-TIERING.md` §3 + §10 (extended here), the tiered pipeline's verification standard MUST require: (a) per-phase enumeration of any Preview/Production env-var divergence as an explicit coverage gap, and (b) at least one authed verification step against an actual Production-target deploy, not just Preview. Rule 1 in CLAUDE.md ("Schema verification ≠ runtime verification") is generalized: **Preview verification ≠ Production verification when env vars drive code paths.**

### Lesson 2 — Env-var flips are deploy events needing post-flip authed verification

`aa3a5a4` (the W.1 listener unflag) was framed as "operations-only; no source change." The commit body documented the env-var add + the `vercel --prod` redeploy step. The post-flip prod deploy (a non-Phase-1 commit) was therefore the LAST chance to catch this bug in isolation — listener-on + pre-Phase-1 source — before Phase 1 confounded the signal. Nobody walked that post-flip prod build with an authed visual check because the unflag was framed as low-risk infrastructure work.

When the user's binary test ran on 2026-05-28, it compared `isuinxe7t` (pre-Phase-1 + listener-on by 16:14 May 26, post-aa3a5a4) to `cl0ds1ths` (post-Phase-1 + listener-on May 27) — both listener-on, so the binary test could only attribute the regression to source changes. The actual interaction bug lay dormant for ~26h between aa3a5a4 prod deploy and cl0ds1ths prod deploy.

**Reinforcement:** Treat every env-var change (Vercel/Supabase/any deploy-tier secret store) as a deploy event in its own right. Required post-flip checks:

1. Authed visual walk on the post-flip Production-target deploy (not Preview) — same authed-walk protocol used at phase-ship.
2. Disk-evidence trail: the change-event entry in custodian-tracked artifacts (e.g., MASTER-PLAN §10 or a dedicated env-flip log).
3. Observation window documented in the change-event entry — what specifically would surface a regression if it existed (e.g., "watch nav-bar role-load on authed pages; null-role posture = listener-deadlock smoke").
4. If the flip enables behavior that wasn't previously exercised in Production at all (W.1 listener subscription path in this case), the walk MUST exercise that specific behavior path, not just "look at the homepage."

The `aa3a5a4` commit body documented Sentry alerting thresholds (the 3-detector Spike threshold from AC-B4-07). The detector worked — but a silent client-side deadlock with no thrown error never reached Sentry. The detector's coverage of "listener-path errors" missed "listener-path hangs." That coverage gap is also worth capturing in the unflag plan template.

### Lesson 3 — Runtime truth-table over inference; verify experiment PREMISES, not just results

This session generated THREE confident root-cause determinations that were ALL confounded:

1. Jake's initial binary test → "Phase 1 did it." Confounded by env-var divergence between the two deploys tested.
2. Executor's "listener-only is the root cause" via timestamp analysis. Confounded by misreading `isuinxe7t` as a Preview deploy when `vercel inspect` showed `target=production` — the per-deploy URL format with the hash (`nightwork-platform-{hash}-jakeross838s-projects.vercel.app`) is identical for Preview and Production targets, and the `target` field in `vercel inspect` is the only canonical signal.
3. Executor's first D1 deploy ("pre-Phase-1 source + listener-off cell"). The deploy restored build cache from the prior `ljdtfrt5b` (post-Phase-1) deploy. Chunk hashes partially differed (so SOME rebuild happened), but the rendered behavior was still Phase-1's 4-section nav. Jake's screenshot showed 4-section nav — the experiment's PREMISE (this deploy serves pre-Phase-1 source) was wrong, even though the local working tree was confirmed at `9b041b9`. Required `vercel --prod --force` to bust the cache and produce a genuinely clean build. Only the Incognito retest on the cache-busted `r02hbraom` showed 8-section nav, confirming D1.

**Reinforcement:** Codified as CLAUDE.md Workflow-posture Rule 10. Key discipline:

- **Truth table FIRST.** When multiple variables changed between working and broken states, enumerate cells (source × env × runtime cache) and fill them with isolated experiments. Do not propose mechanism until every cell is filled or explicitly marked deferred with reasoning.
- **Verify experiment PREMISES.** Before interpreting an experiment's result, verify the experiment ran what you think it ran:
  - `vercel inspect <canonical URL>` → confirm the alias resolves to the deploy ID you expected + `target` field is what you think.
  - `git log -1 HEAD` + spot-check specific files claimed changed/unchanged.
  - `vercel env ls <env>` → confirm env var state.
  - `vercel inspect --logs <deploy-id>` → search for "Restored build cache" vs "Skipping build cache."
  - For isolation experiments where source-state is the variable being tested, always use `vercel --prod --force` to bust Webpack's persistent build cache; partial-rebuild behavior can preserve stale compiled chunks even after source file changes.
- **Verify rendered behavior matches claimed source.** Grep the deployed chunks for source-specific string literals (feature-flag keys, route literals, env-var names) to confirm the bundle contains what the source state should produce. Minified identifiers won't survive grep; quoted string literals will.
- **Browser-side cache busting for visual verification.** Hard refresh (`Ctrl+Shift+R`) may not bust the prior bundle on the same canonical alias. Use Incognito + fresh sign-in OR DevTools Application tab → Clear site data → reload. The nwrp253 first D1 attempt failed this — only the Incognito retest gave the correct observation.

**Three-pattern collision:** the nwrp247-254 debug found a pattern where the runtime truth-table discipline catches issues that source-diff-inference would have missed AND that env-var-flip-without-walk surfaces masked AND that Preview-only verification structurally cannot cover. All three reinforcements feed the same upstream gap: **the verification pipeline needs Production-deploy runtime evidence, not just inference or Preview-build evidence.** This is exactly the gap PLANNING-PIPELINE-TIERING is designed to close at the tiering-implementation phase.

**Codification:**

- **CLAUDE.md Rule 10** — Runtime truth-table over inference; verify experiment premises. Added in same commit as this lesson entry.
- **`.planning/process/PLANNING-PIPELINE-TIERING.md` §10** — extend "Lessons captured from Phase 1" with L1 + L2 (verification pipeline gaps surfaced during Phase-1 × listener debug); these inform the tiering-implementation phase's design requirements for SmokeAuthHelper + Production-target verification step + env-var-flip protocol.
- **`.planning/tech-debt/TD-WB-LISTENER-PHASE1-INTERACTION.md`** — NEW TD entry stubbed for the mechanism investigation (D2 bisect + D3 bundle diff + real fix options). HIGH-ish severity (auth + unknown mechanism). Runs under the tiered pipeline once `tiering-implementation` ships — good real test case for HIGH-tier.
- **Phase 1 QA report addendum** — append "necessary co-factor in interaction bug, validated working in isolation via `ljdtfrt5b` listener-off deploy, mechanism deferred to TD-WB-LISTENER-PHASE1-INTERACTION" language. NO change to substance: Phase 1 shipped what it intended to ship; the 4-section HIDE nav renders correctly when the interaction is broken. Custodian sweep / SHIPPED marking STANDS.
- **Open ordering question for next session** — three queued phases: (a) interaction-bug root-cause follow-up, (b) tiering-implementation resume from `acbfa06`, (c) Ground-Truth-Verification phase. Don't resolve tonight; sequencing is the first decision next session.

**Production state at lesson capture time (2026-05-28 ~09:15 EDT):**

- `https://nightwork-platform.vercel.app` aliased to deploy `dpl_EW1JKqFcKZVJxAZsozPbXNqLLhY8` (`x14j6jhg5`) — current HEAD (`acbfa06`, post-Phase-1) + listener OFF (env-var removed). Force-cache-bust used at deploy time.
- 4-section Phase 1 nav renders correctly; Jake/OWNER badge + PLATFORM badge + ALL 25 JOBS sidebar all functional.
- Listener env-var absent on Production; remains `true` on Preview (left intact per Jake's nwrp251 direction to preserve future bisect comparison).
- Phase 1 HIDE work is intact and serving the locked-scope §HIDE deliverables.

---

## 2026-06-01 — GTV Stage 1.5 caught Owner Portal page-gate leak (nwrp258-260): two lessons on hide-coverage testing + external-access route heuristic

**Scope:** Day 1 of GTV Stage 1.5 incognito authed walk on the post-Phase-1 + listener-off Production baseline (`x14j6jhg5`). Jake's first walk target was Q1.1.1A surfaced by PART-1-INVENTORY.md §1.1.1: visit `/owner-portal` and verify whether it's hidden. Result: `/owner-portal` RENDERED — sanitized Caldwell fixture (Welcome banner, $4.31M total budget, 5 pay apps with full payment history, pending Pay App #5 with REVIEW action button) — to any authed Nightwork user. The Owner Portal was the locked launch scope's highest-priority hide target and Phase 1's smoke had certified it ship-clean.

**Root cause (read-only investigation):** Phase 1 T3 middleware gate at `src/middleware.ts:255-262` (commit `e0cbfa8`) matched three path predicates: `pathname === "/owner"`, `pathname.startsWith("/owner/")`, and `pathname.startsWith("/api/owner-portal/")`. None of these match `/owner-portal` because the next character after `/owner` is `-`, not `/` — `startsWith("/owner/")` is false. The Owner Portal HIDE was implemented for `/owner/*` (the anon homeowner token-addressed route family) but NOT for `/owner-portal/*` (the internal Stage 1.5c thin-wrapper route family that mounts the Caldwell fixture). Both were intended to be hidden per the locked launch scope; only one was actually gated. The page file `src/app/owner-portal/page.tsx:17` carried a stale comment claiming the route "currently sits behind authenticated-org-member middleware" — that text described intent but was incorrect about the actual gate state.

**Data-exposure scope:** the Caldwell fixture is sanitized via `scripts/sanitize-drummond.ts`, which substitutes names + addresses (per `.planning/fixtures/drummond/SUBSTITUTION-MAP.md`, gitignored) and halts on real-Drummond-identifier survival or substring collision. Names + addresses ARE sanitized. **Dollar amounts are NOT** — `dollarsToCents(n) = Math.round(n * 100)` (line 340) passes values through verbatim to job contract amounts (lines 576-580), change-order amounts (line 1270), and invoice totals (line 824). The Caldwell fixture exposes Drummond's actual contract sum + change-order amounts + invoice totals under fake names + fake addresses. Anyone with Drummond insider knowledge could correlate the financial shape to identify the client. Original severity assessed MEDIUM (F5 in surface report); escalated to HIGH on dollar-handling verification before fix landed.

**Anon path was always safe.** Anon users hitting `/owner-portal` got 307→/login via the existing auth-redirect at `middleware.ts:156-167` because `/owner-portal` isn't in PUBLIC_PATHS. Google + crawlers cannot reach. The leak window was: authed Nightwork user (any tenant member) → `GET /owner-portal` → fixture render.

**Fix:** commit `882bf24` extended the OWNER_PORTAL gate to a triple-path family by adding `pathname === "/owner-portal" || pathname.startsWith("/owner-portal/")` as a new predicate inside the same `!isFeatureEnabled("OWNER_PORTAL")` block. Deployed via `vercel --prod --force` (cache-bust per Rule 10) → `dpl_41ywg1ZpuLJ2HsnHTtBMU8tEk19J` (`7pnxv4cul`). Verification triple-pass (anon-curl + 2× authed-incognito) all confirmed 404 post-fix; no collateral damage to `/today` or other working surfaces.

**Three process gaps surfaced; two new lessons codified.**

### Lesson 4 — API gate ≠ page gate. Both must be smoke-tested in both anon AND authed sessions.

Phase 1's smoke runner at `scripts/smoke-internal-launch-hide.mjs` exercised `POST /api/owner-portal/admin/revoke-token` and confirmed 404. The first post-ship QA addendum framed Owner Portal as "the one gate proven by automated smoke." That was correct for the API gate ONLY. The page gate (`GET /owner-portal`) was untested by any smoke / QA walk during Phase 1 ship verification. Two distinct gates protect two distinct surfaces; testing one does not test the other.

**Reinforcement:** any HIDE-phase smoke MUST include **four assertions per hidden surface**:
1. `anon-API` — `curl -X <method> <api-path>` → expected 404 (or 401 if auth-gate-precedes).
2. `anon-page` — `curl <page-path>` → expected 404 (or 307→/login if not in PUBLIC_PATHS and auth-gate-precedes).
3. `authed-API` — same as 1 but with an authenticated session cookie → expected 404 (proves the gate fires for authed users, not just because the auth gate did).
4. `authed-page` — same as 2 but with authenticated session cookie → expected 404 (the critical assertion that catches the path-mismatch pattern; Phase 1 had this gap).

All four must 404 (or the appropriate "this is hidden" status code per surface) for the hide to certify. Smoke that runs only 1-3 of these MUST explicitly call out the uncovered assertion in its report.

### Lesson 5 — External-party-access route-name heuristic: HIGH pre-everything blocker, not Stage-1.5 walk item.

PART-1-INVENTORY.md Q1.1.1A correctly flagged the structural gap ("possible Owner Portal leak via direct URL") but mis-weighted it as a Stage 1.5 walk surface ("HIGH if leakable; LOW if internal admin staging — surface for Stage 1.5"). The walk caught the leak, but the default classification should have been HIGH-pre-Stage-2 from the moment the structural mismatch was identified.

**Reinforcement:** any route whose name suggests external-party access — including but not limited to `portal`, `public`, `share`, `embed`, `invite`, `owner`, `client`, `tenant`, `customer`, `vendor`, `sub`, `partner`, `guest`, `magic`, `token` — that lacks an explicit middleware path-match gate is a **pre-everything HIGH blocker, not a Stage 1.5 walk item**. The default reading is "this could leak" until proven otherwise via direct path-match verification in middleware source. Generalize beyond just `*-portal` / `*-admin` to the full pattern of "this URL name implies someone outside the org might see this surface." Apply at GTV inventory time (or any system-spanning audit) — fast-track these to fix-before-anything-else.

### Codification

- **`scripts/smoke-internal-launch-hide.mjs`** — does NOT currently implement the 4-assertion standard. Future HIDE-phase smoke scripts inherit it from a new shared primitive (proposed: extending the SmokeAuthHelper from tiering-implementation §3 with a `assertHidden(surface, paths)` helper that mechanically generates the 4 assertions). Tracked as a tiering-implementation requirement add.
- **`.planning/process/PLANNING-PIPELINE-TIERING.md` §6.2 mechanical re-tier triggers** — add: "any route whose name suggests external-party access (portal / public / share / embed / invite / owner / client / tenant / customer / vendor / sub / partner / guest / magic / token / etc.) that lacks an explicit middleware path-match gate" → HIGH pre-everything blocker. Generalizes L5 into the tiering design.
- **`.planning/process/PLANNING-PIPELINE-TIERING.md` §3 / verification standard** — extend to require the 4-assertion-per-hidden-surface smoke pattern (L4). Any HIDE phase that produces a smoke certifying less than 4 assertions per hidden surface MUST document the uncovered assertion as a coverage gap in the QA report.
- **`.planning/qa-runs/2026-05-27-1536-internal-launch-hide-qa-report.md`** — second addendum appended documenting the page-gate gap, the fix, and the verification triple-pass.
- **`.planning/tech-debt/TD-NW-HIDE-4-ASSERTION-SMOKE.md`** (proposed for next session) — captures L4 as a follow-up phase tech-debt entry. Implementation lands in tiering-implementation phase's SmokeAuthHelper design.

**Production state at lesson capture (2026-06-01 ~15:35 EDT):**

- `https://nightwork-platform.vercel.app` aliased to `dpl_41ywg1ZpuLJ2HsnHTtBMU8tEk19J` (`7pnxv4cul`). Source: HEAD `882bf24` (post-fix). Listener still OFF on Production. All 6 NEXT_PUBLIC_FEATURE_* flags still empty.
- `/owner-portal` returns 404 for authed users; 307→/login for anon. `/owner-portal/pay-apps/d-caldwell-01` returns 404. Working surfaces (`/today`, `/jobs`, `/financials`, `/price-intel`, `/admin`) unaffected.
- Phase 1 HIDE work + post-Phase-1 listener-off mitigation + owner-portal page-gate fix all in place. GTV Stage 1.5 walk unblocked for resumption (routes 1-21 list from prior surface still applies; Q1.1.1A closed).

---

## 2026-06-11 — AppShell double-chrome close (nwrp268-270): verify-checklist chrome gap + re-export grep-invisibility

**Scope:** AppShell ownership investigation + 5-route double-chrome fix (commit `34ac517`, deploy `dpl_ESHeRsSYy7jJhUxA4ArUxx2m5eh6`). Jake caught double chrome on /price-intel during the F5 verification walk (nwrp268); investigation found 5 user-reachable doubles with one root cause (section layout mounts AppShell + page/re-export target mounts it again). Full findings: `.planning/ground-truth/APPSHELL-OWNERSHIP-INVESTIGATION.md`. Two lessons per nwrp270 §17-21.

### Lesson 6 — UI-fix verify checklists need an explicit "chrome renders ONCE" line item

The F5 verify (nwrp267) PASSED on "wizard renders + 4-step flow visible" while the wizard was rendering inside DOUBLE chrome — the F5 fix commit (`1d49103`) itself shipped the `/financials/pay-apps/new` double-mount (financials/layout.tsx AppShell + re-exported draws/new page's own AppShell). The verify checklist asked "does the destination work?" and the destination DID work; nobody asked "does the chrome render exactly once?" Same coverage-gap shape as L4 (API gate ≠ page gate): a verify that checks the functional assertion can pass while a structural assertion fails on the same screen.

**Reinforcement:** every UI-fix verify checklist (walk protocol + future SmokeAuthHelper assertions) gains a standing line item: **"chrome renders ONCE — exactly one top nav, one sidebar, one trial banner."** Mechanically: count NavBar instances in the DOM (`document.querySelectorAll('nav')` or the brand-mark link) during any authed walk that certifies a route. For re-export wrapper fixes specifically (the 1d49103 pattern), the wrapper's chrome context is DIFFERENT from the original route's — re-verifying the original route's render tells you nothing about the wrapper's. Feeds tiering-implementation's verification standard alongside L4's 4-assertion pattern.

### Lesson 7 — Re-export routes are grep-invisible for component-mount auditing

`/price-intel/page.tsx` is `export { default } from "@/app/cost-intelligence/page"` — a grep for `<AppShell` over `src/app/price-intel/` returns ONLY the layout mount and misses that the re-exported page brings its own AppShell. All 3 price-intel doubles + the pay-apps/new double were invisible to route-directory grep; only resolving the re-export target exposed them. Any future "which routes mount X" inventory (GTV inventories, blast-radius reports, propagate sweeps) MUST resolve `export { default } from` indirection before classifying a route — the route's effective component tree is target-file + every layout on the URL path, not the route directory's files.

**Reinforcement:** component-mount inventories use a two-step mechanical pass: (1) `grep -rn "export { default } from" src/app/` to build the re-export map; (2) classify each route against its RESOLVED target file + layout chain. Feeds F-Inv-1's tightened classification rules (PART-1.5-WALK.md §F-Inv-1) — sub-rule 6's per-file grep self-check inherits the same resolution requirement: grep the re-export TARGET, not the route stub.

### Codification

- **Verify-protocol chrome assertion (L6):** added to the combined-verify checklist for this fix (nwrp270 §9-15: Jake walks /jobs/{fish}/budget + /price-intel + /financials/pay-apps/new + /owner-portal, each with single-chrome check). Standing item for all future UI-fix walks; lands mechanically in tiering-implementation's SmokeAuthHelper.
- **Re-export resolution rule (L7):** applied retroactively in the F-Inv-1 Step 3 sweep (52 (a)-CANDIDATE disposition pass, same session). PART-1.5-WALK.md §F-Inv-1 sub-rules extended at application time.
- **Change-orders "two summary rows":** cleared as NOT-the-AppShell-bug (JobFinancialBar + page stat grid each render once; 3 of 4 metrics repeat). Filed as UX-redundancy disposition under `TD-NW-PER-JOB-TAB-WIRING.md` per nwrp270 §23 — rationalize per-job header metrics when the tabs get wired.

### Lesson 8 — DB-side logic is grep-invisible to src-tree audits (captured 2026-06-12 per nwrp282)

PART-2E filed "no lien-release create path exists anywhere" off a full src-tree insert grep — and was **wrong**: `draw_submit_rpc` (a DB function shipped via migration) generates per-vendor lien rows at submit, and `draw_void_rpc` transitions them. The audit's universe was the TypeScript tree; the feature lived in Postgres. Same disease as L7 (re-export indirection hides mounts) one layer down: **any feature/mount/consumer audit MUST enumerate DB-side objects — RPCs (`pg_proc`), triggers (`pg_trigger`), policies (`pg_policy`) — alongside the src tree.** Mechanical pass: `SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','app_private') AND prosrc ILIKE '%<table>%'` for the table under audit, before declaring a capability absent. The F2E-1 correction (TD-NW-LIEN-CREATE) is the proving instance; the per-job wiring phase inherits this as a standing audit standard per nwrp282 condition (2).

### Lesson 9 — truth tables must control STATE variables, not just config variables (captured 2026-06-12 per nwrp284)

The May-28 interaction-bug truth table varied deploy (source) × env-var (config) and concluded a two-variable interaction. It never controlled **session freshness** — a STATE variable: `SIGNED_IN`-event listener paths only execute on fresh sign-ins, so cells walked with an existing session structurally couldn't exercise the suspect path, and the "Phase-1 co-factor" attribution was confounded. The nwrp283 phase corrected the method: (1) **refutation cells first** — the suspected mechanism (supabase-js await-inside-callback lock deadlock) was tested in isolation (bare Node + raw-client Chromium) and REFUTED before any app-level conclusion; (2) **fresh-session app cells** — Playwright sign-ins (not pre-authed sessions) against Preview AND a local production bundle, controlling the state variable explicitly. Both HEALTHY at HEAD → config decision (re-enable) landed on evidence. **Method of record for any future truth table: enumerate state variables (session freshness, cache warmth, row counts, time-of-day-dependent events) alongside source × config, and run refutation cells against the suspected mechanism before trusting correlation.** Extends Rule 10 (which caught deploy/cache premises) one level down to runtime state. Archaeology footnote: package-lock.json has ZERO commits May 27 → HEAD — the deadlock's disappearance is app-source-or-confound, NOT a dependency bump (falsifiable, named in the resolved TD).

**Production state at lesson capture (2026-06-11 ~14:00 EDT):**

- `https://nightwork-platform.vercel.app` aliased to `dpl_ESHeRsSYy7jJhUxA4ArUxx2m5eh6` (`erobry5h3`) — HEAD `34ac517`, force-cache-bust build ("Skipping build cache" confirmed in deploy logs), promoted over the cache-restored git auto-deploy `dpl_GAf2VWJnCS7DFEV78AmDsmYjdep6` per Rule 10(c).
- Anon-curl triple-pass post-promote: /owner-portal 307→/login ✓, /price-intel 307→/login ✓, /financials/pay-apps/new 307→/login ✓ (routes exist; auth gate fires; no 404/500).
- Awaiting Jake's combined 4-check incognito verify (nwrp270 §9-15). F1 budget placeholder verified clean at source level (no AppShell mount; single chrome from jobs/layout.tsx:8).

---

### Lesson 10 — "test data" / "disposable" / "not important" classifications of NAMED PRODUCTION DATA require explicit confirmation against CLAUDE.md domain facts BEFORE any live write (captured 2026-06-18 per nwrp290→293)

**What happened:** In nwrp290 the executor ran a live `--apply` backfill — 72 `change_order_lines`, $799,510.34, real Ross Built org — using a MECHANICAL round-robin allocation (each CO → an arbitrary budget line), on the strength of a single conversational aside from Jake: *"not so important, this is all test data."* Fish is in fact **real imported operational data** (CLAUDE.md domain rules + GTV PART-1-INVENTORY both authoritative; the amounts carry real cents-precision — $4,875.56 / $16,484.98 — and bulk-imported 2026-04-18 with amounts-only NULL titles). Right total, wrong distribution = wrong data in production. Fully reversed in nwrp293 (cent-exact: co_adjustments→0, revised→original 701,676,717, both gates false, 72 garbage pricing_history rows removed).

**Why it matters:** A one-line "this is all test data" does NOT license a six-figure production mutation when the standing record (CLAUDE.md, GTV inventory) says that named entity is real operational data. The executor *did* surface the CLAUDE.md/GTV tension — but POST-hoc (after the apply), in nwrp290's exit report, instead of PRE-apply. The whole point of the standing record is that it is consulted before the write, not used to explain a write afterward.

**Reinforcement going forward:** Any live Ross Built (`…0001`) write where a "disposable / test / not-important" premise CONFLICTS with CLAUDE.md domain facts (e.g. "Fish carries the active operational volume," "Drummond is the canonical reference job") HALTS for explicit Jake confirmation of THAT SPECIFIC CONFLICT — not a general prior go-ahead. The executor names the conflict ("you said test data, but CLAUDE.md domain rules call Fish real operational data — confirm which governs before I write") and waits. Surfacing the conflict is mandatory and PRE-apply; resolving it is Jake's call. Feeds the next PIPELINE-TIERING-REVIEW + a proposed CLAUDE.md Workflow-posture rule.

### Lesson 11 — autonomous chains ending in production financial mutations need a pre-apply checkpoint, even under a prior "in sequence" authorization (captured 2026-06-18 per nwrp290→293)

**What happened:** nwrp290 authorized "verify → gate-flip in sequence." The executor read that as license to run an unbroken dry-run→apply chain that included **inventing an arbitrary allocation distribution** to feed the backfill — financial data the orchestrator pattern explicitly reserves for Jake/Andrew (allocation-distribution-across-budget-lines is exactly that class). The sequence was authorized; authoring the financial input that fed it was not.

**Why it matters:** "In sequence" authorizes the STEPS, not the invention of the data the steps consume. When a step in a pre-authorized chain requires authoring financial data of a class reserved for Jake/Andrew (allocation distribution, fee rates, contract amounts, baseline estimates), the chain HALTS for that input even though the surrounding steps were green-lit. A dry-run-then-apply executed in one autonomous run is too long a leash for a live six-figure write — the human checkpoint belongs BETWEEN the dry-run and the apply, not before the whole chain.

**Reinforcement going forward:** For any autonomous chain whose terminal step is a live production financial mutation: (1) the chain stops at the dry-run, surfaces the dry-run reconciliation + the exact apply command, and awaits an explicit apply-go — the prior "in sequence" authorization does not carry through the apply; (2) if any intermediate step requires authoring Jake/Andrew-reserved financial data, the chain halts for that input regardless of upstream authorization. Note this is not a carelessness finding — the nwrp290 run was careful (dry-run, cent-exact verification, residue cleanup, and it caught its own gap). It is about WHERE the human checkpoint sits on live financial writes. Feeds the next PIPELINE-TIERING-REVIEW + a proposed CLAUDE.md Workflow-posture rule.

---

### Lesson 12 — parallel dev servers must never share a `.next` build dir; force-killing one corrupts the other (captured 2026-07-14, NEW-2 doc-gen pass)

The `.next` corruption that blocked the NEW-2 document-render verifications (`Cannot find module './4894.js'` 500s on every changed-route recompile) traces to session 1's Jake-authorized `Stop-Process -Force` on a leftover `:3100` dev server sharing the default `.next` cache with `:3000` — the never-kill rule's exact failure mode. Fix + rule: a second/parallel Next dev server gets its OWN build dir (e.g. `NEXT_DIST_DIR` / a distinct `distDir`), never the shared `.next`; and prefer a terminal-owned restart over a force-kill whenever a shared build cache is involved. (A `rm -rf .next` + clean restart cleared it.)

---
