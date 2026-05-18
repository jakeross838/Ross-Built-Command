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
