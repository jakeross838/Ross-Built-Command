---
name: nx
description: Nightwork execute wrapper. Runs nightwork-preflight skill (10 checks); on PASS chains /gsd-execute-phase → /nightwork-qa; on FAIL blocks execute and reports remediation. Per D-011 + D-018 — wrappers chain GSD orchestrators with Nightwork-specific gates.
argument-hint: "<phase-name> [--skip-preflight]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - Task
  - Skill
  - SlashCommand
---

<objective>
Execute a Nightwork phase, with preflight verification BEFORE execute and QA review AFTER. Preflight ensures EXPANDED-SCOPE+SETUP+prereqs+env+schema+fixtures+QA-history+working-tree+branch are all green; QA verifies the executed code against the spec and design system.

`/nx <phase-name>` replaces the bare `/gsd-execute-phase <phase-name>` for any Nightwork phase.
</objective>

<arguments>
$1 = phase name. Required.
$2 = optional `--skip-preflight` flag. Use sparingly — bypasses the 10-check gate. Logged in `.planning/expansions/<phase-name>-PREFLIGHT-OVERRIDE.md` and surfaced at next QA.
</arguments>

<algorithm>

## Step 1 — Preflight

Unless `--skip-preflight` was passed, run the `nightwork-preflight` skill:

```
Skill: nightwork-preflight
args: phase=<phase-name>
```

The skill runs 10 checks (EXPANDED-SCOPE approved / SETUP-COMPLETE exists / prereq phases shipped / Vercel env vars / Supabase tables+RLS / third-party accounts / Drummond fixtures / last QA verdict / working tree clean / branch matches phase) and writes either PREFLIGHT-PASS.md or PREFLIGHT-FAIL.md.

### If PASS

Proceed to step 2.

### If FAIL

Abort. Return Jake the failure message:

> "Preflight FAIL — N checks failed. See `.planning/expansions/<phase-name>-PREFLIGHT-FAIL.md` for remediation steps. After fixing, re-run `/nx <phase-name>`. To bypass (use sparingly), `/nx <phase-name> --skip-preflight`."

Do NOT proceed to execute on FAIL.

### If --skip-preflight

Log the override:

```
File: .planning/expansions/<phase-name>-PREFLIGHT-OVERRIDE.md
Content:
  # Preflight override — <phase-name>
  Bypassed: <YYYY-MM-DD-HHMM>
  Branch: <branch>
  HEAD: <git-sha>
  Reason: <Jake's reason if provided, or "not provided">
```

Surface a strong warning:

> "⚠ Preflight bypassed. The 10 checks did not run. Proceeding straight to execute. This will be surfaced at /nightwork-qa as an override. Use only for ops or genuine third-party-outage workarounds."

Proceed to step 2.

## Step 2 — Execute

Run `/gsd-execute-phase <phase-name>`.

The executor processes PLAN.md with atomic commits, deviation handling, checkpoint protocols, and state management. Wave-based parallelization where safe.

If execute halts (deviation requires Jake input, or execution-time validation fails), surface to Jake and don't auto-resume. Jake decides whether to amend PLAN.md and re-run, or escalate.

### Inner harness loop (per stage-1.5c-verification-harness D-05)

After EACH commit during execute (plan-task commits, deviation commits, checkpoint commits), the verification harness runs against the new commit's Vercel preview URL. The loop wraps `scripts/loop-with-harness.ts`:

```bash
npx tsx scripts/loop-with-harness.ts \
  --phase <phase-name> \
  --commit-sha $(git rev-parse HEAD)
```

Visualization:

```
/nx <phase>
  → preflight (10 checks)
  → /gsd-execute-phase <phase>
      → for each commit during execute:
        → npx tsx scripts/loop-with-harness.ts --phase <phase> --commit-sha <sha>
        → on exit 5 (paused-for-fix): spawn gsd-fix-executor (Plan 7) with failure
          context; after fix-executor commits, re-run loop on iter+1
        → on exit 2 (terminal halt): pause for Jake review (HALT artifact)
        → on exit 0 (passed): continue to next plan task
  → /nightwork-qa <phase>  (unchanged final gate)
```

#### Outcome handling (loop exit codes per ITER-1 WARN-3)

- **Exit 0 (passed)** — All 3 layers PASS. Continue to next plan task or QA.
- **Exit 5 (paused-for-fix)** — Read `.planning/verification/runs/<phase>/<sha>/report.md`. Identify the failure (Layer + criterion). Spawn `gsd-fix-executor` (per stage-1.5c-verification-harness Plan 7) with failure context. After the fix-executor commits, re-run the loop on iter+1.
- **Exit 2 (terminal halt — failed-ambiguous)** — Read `.planning/verification/runs/<phase>/<sha>/HALT-AMBIGUOUS-VISION.md` OR `HALT-ITER-3.md` OR `HALT-FIX-QUALITY-FAILURE.md`. Surface to Jake with artifact contents. Pause `/nx` until Jake unblocks (manual fix OR criterion adjustment OR phase scope re-think). HALT artifact also retained at `.planning/verification/reports/<phase>/halts/<sha>-<reason>.md` (git-tracked, SOC2 traceable).
- **Exit 3 (discovery failed)** — Vercel preview URL discovery failed. Pause + check Vercel deploys / `VERCEL_TOKEN`.
- **Exit 4 (runtime error)** — Pause + read stderr; common cause is `ANTHROPIC_API_KEY` missing from env.

#### Iteration budget (per D-06)

The harness loop max-iter (3) is ADDITIVE within the current execute iteration. It does NOT consume the halt-after iteration budget. A halt-after gate halts when its iteration count is hit; the harness inner loop is bounded independently and runs up to 3 attempts at fixing whatever the last commit broke.

The CostCap (default $1/run) is constructed ONCE per `runLoop` invocation. iter-N does NOT get a fresh budget — total Layer 3 vision spend across all iterations is bounded by the single cap (ITER-1 C4).

#### Sequencing relative to /nightwork-qa

Per D-05: harness loop runs INSIDE `/gsd-execute-phase` BEFORE `/nightwork-qa`. `/nightwork-qa` continues unchanged as the final post-execute gate. The harness catches per-commit issues; `/nightwork-qa` catches phase-level integrity issues.

#### When to skip the harness loop

For phases with no production-route impact (pure docs phases, agent-only phases), the loop can be skipped via `--skip` flag on `scripts/loop-with-harness.ts` (deferred to Wave 1.1; not implemented this phase).

See `scripts/loop-with-harness.ts` and `src/lib/verification/loop-orchestrator.ts` for implementation. See `.planning/architecture/VERIFICATION-PIPELINE.md` (Plan 10 of stage-1.5c-verification-harness, forthcoming Wave 7) for the canonical doc.

## Step 3 — QA

Run `/nightwork-qa <phase-name>`.

`/nightwork-qa` orchestrates code-level review: spec-checker, custodian, security-reviewer, ai-logic-tester (always); plus UI/DB/API/financial reviewers depending on what changed. Each in fresh Task context. Critical findings block ship (per D-007 + D-018 + D-024 — invoice flow must pass QA before propagating to other entities).

If QA verdict is BLOCKING:

> "/nightwork-qa returned BLOCKING — N critical findings. See `.planning/qa-runs/<timestamp>-qa-report.md`. Address the findings (typically via `/gsd-code-review-fix` or hand-fixes), then re-run `/nx <phase-name>` (it will preflight + re-execute the corrections + re-qa)."

If QA verdict is WARNING or PASS, proceed.

## Step 4 — Report

Return a single message ≤300 words:

```
<PASS-icon | FAIL-icon> Phase <phase-name>

PREFLIGHT          <PASS | OVERRIDDEN | FAIL>
                   <if fail: link to PREFLIGHT-FAIL.md>
                   <if override: link to PREFLIGHT-OVERRIDE.md>

EXECUTE            Tasks: <N completed / N total>
                   Commits: <git-sha-short>..HEAD (<N> commits)
                   Files touched: <N>
                   Deviations: <N> handled, <N> escalated

QA                 Verdict: <PASS | WARNING | BLOCKING>
                   Findings: <0 BLOCKING | N CRITICAL | N HIGH | N MEDIUM | N LOW | N NOTE>
                   Reviewers run: <list>
                   Report: .planning/qa-runs/<timestamp>-qa-report.md

Next:
  If QA = PASS: /gsd-ship <phase-name> (PR creation + final review)
  If QA = WARNING: review the deferred findings; if comfortable, /gsd-ship; otherwise address first
  If QA = BLOCKING: address findings; re-run /nx <phase-name>

Open MEDIUM/LOW/NOTE findings: deferred to MASTER-PLAN.md §11 (tech debt registry).
```
</algorithm>

<error-handling>
- **Preflight skill errors out** (not a check fail, but a tool/runtime error): surface verbatim. Don't bypass to execute.
- **Execute halts mid-flight**: don't auto-retry. Jake decides. The phase state file (`STATE.md`) is preserved.
- **QA returns BLOCKING**: don't auto-fix. Surface findings. Jake chooses next step.
- **Override usage repeated >2 times for same phase**: surface a strong warning; possibly something deeper is wrong with the phase.
</error-handling>

<rules>
- **Never run /np from this wrapper.** Plan must already exist; if not, the preflight Check 2 (SETUP-COMPLETE.md) won't apply (set up was for plan, not yet plan output) — actually this is moot, preflight passes when plan exists per /np. Just don't try to plan from /nx.
- **Never run /gsd-ship from this wrapper.** Ship is its own gate: human review + /nightwork-end-to-end-test. Run separately.
- **Never auto-pass preflight on third-party-service flake.** If a service is down, log the override; don't silently retry-and-continue.
- **Always run QA after execute** — even if execute completes cleanly. The QA step exists to catch what executor's own gates miss (custodian drift, AI-logic correctness, etc.).
</rules>
