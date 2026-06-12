---
name: np
description: Nightwork plan wrapper. Confirms EXPANDED-SCOPE.md exists for the phase, then chains /gsd-discuss-phase → /gsd-plan-phase → /nightwork-plan-review with the EXPANDED-SCOPE.md fed as input context. Per D-011 + D-018 — wrappers chain GSD orchestrators with Nightwork-specific gates. If EXPANDED-SCOPE.md is missing, blocks and tells Jake to run /nightwork-init-phase first.
argument-hint: "<phase-name>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
  - Task
  - SlashCommand
---

<objective>
Plan a Nightwork phase, with the requirements-expansion artifact (EXPANDED-SCOPE.md) feeding into discussion and planning so the plan reflects the full surfaced scope, not just Jake's initial stated scope.

`/np <phase-name>` replaces the bare `/gsd-plan-phase <phase-name>` for any Nightwork phase.
</objective>

<arguments>
$1 = phase name. Required.
</arguments>

<algorithm>

## Pre-step — Verify EXPANDED-SCOPE.md exists + severity declared (tiering per nwrp285)

Read `.planning/expansions/<phase-name>-EXPANDED-SCOPE.md`.

- **If file missing:** abort with message:
  > "EXPANDED-SCOPE.md missing for phase `<phase-name>`. Run `/nightwork-init-phase <phase-name>` first to capture stated scope, run requirements expansion, and complete auto-setup."
- **If file exists with status DRAFT:** abort with message:
  > "EXPANDED-SCOPE.md is DRAFT — not approved yet. Re-run `/nightwork-init-phase <phase-name>` to walk through approval, or edit the Status line manually if you've already reviewed."
- **If `severity:` field missing from frontmatter OR not in {LOW, MEDIUM, HIGH}:** abort with message:
  > "EXPANDED-SCOPE.md missing severity: field. Re-run /nightwork-init-phase to declare tier."
- **Load `.planning/process/tier-config.json`.** If missing OR malformed JSON: abort with message:
  > "tier-config.json missing/malformed at .planning/process/ — see .planning/process/PLANNING-PIPELINE-TIERING.md. Restore the committed config before dispatching."
- **If file exists with status APPROVED + valid severity + config loads:** proceed. The tier drives every downstream stage:
  - **LOW:** SKIP gsd-assumptions-analyzer (EXPANDED-SCOPE is the analysis); planner 1 iter; plan-checker 1 iter (cap 2 cycles on findings).
  - **MEDIUM:** analyzer one pass auto; planner/checker 1 iter default, 2 on findings.
  - **HIGH:** analyzer full pass; iter-2 ONLY on iter-1 findings (no forced re-author).
  Pass `severity` to /nightwork-plan-review (it resolves the reviewer set from tier-config). Cite the tier in every commit + report this dispatch produces.
- **§6.2 re-tier watch (mechanical, per tier-config `retier_triggers`):** if the drafted PLAN.md surfaces a trigger condition for the declared tier (schema change on LOW/MEDIUM, cross-tenant on LOW/MEDIUM, financial logic on LOW, external integration on any), HALT — do NOT auto-re-tier. Surface trigger + current tier + recommended tier to Jake, and append the event to `.planning/process/mid-execute-halts.jsonl` (append-only, committed): `{"when":"<ISO>","phase":"<name>","tier_at_dispatch":"<tier>","trigger":"<which>","recommended_tier":"<tier>","disposition":"pending","synthetic":false}`.

## Step 1 — Discuss

Run `/gsd-discuss-phase <phase-name>` with EXPANDED-SCOPE.md as additional context.

How: pass `--context-file .planning/expansions/<phase-name>-EXPANDED-SCOPE.md` if `/gsd-discuss-phase` supports it; otherwise pre-pend the EXPANDED-SCOPE content to the discuss-phase input.

The discussion converts EXPANDED-SCOPE.md's open questions and recommended scope into a SPEC.md / DISCUSSION.md (per GSD convention) with falsifiable acceptance criteria.

If `/gsd-discuss-phase --auto` is more appropriate (Jake wants to skip interactive Q&A because EXPANDED-SCOPE already addressed everything), allow that flag through.

## Step 2 — Plan

Run `/gsd-plan-phase <phase-name>`.

The planner produces PLAN.md with task breakdown, dependency graph, acceptance criteria, and goal-backward verification. The acceptance criteria target from EXPANDED-SCOPE.md §7 carries forward.

## Step 3 — Plan-review

Run `/nightwork-plan-review <phase-name>`.

Spawns the TIER-RESOLVED reviewer set (from `.planning/process/tier-config.json` — LOW: 2; MEDIUM: 4 with one conditional; HIGH: base 6 + conditional adds, architect-vs-enterprise-readiness picked by the mechanical signal table, both-fire = both) in fresh contexts via Task tool. Critical findings block execute (per D-007 enterprise readiness gate).

## Step 4 — Report

Return a single message ≤250 words:

```
✓ Phase <phase-name> planned

EXPANDED-SCOPE.md      Status: APPROVED · Severity: <LOW|MEDIUM|HIGH> (ceiling $<N> per tier-config)
DISCUSSION.md          Sections: <N>; ambiguities resolved: <N>
SPEC.md                Acceptance criteria: <N falsifiable items>
PLAN.md                Tasks: <N>; estimated waves: <N>; parallelizable: <N>
PLAN-REVIEW.md         Verdict: <PASS | NEEDS WORK | BLOCKING>
                       Tier reviewer set (<N> reviewers per tier-config):
                         <reviewer>: <PASS | findings>
                         … (one line per tier-resolved reviewer; conditionals labeled)

Next:
  /nx <phase-name>      — preflight + execute + qa
                          (preflight will validate setup is fresh; execute runs the plan; qa gates ship)

If plan-review verdict is BLOCKING:
  Address the BLOCKING findings, then re-run /np <phase-name> (it'll re-plan with the corrections).
```
</algorithm>

<error-handling>
- **EXPANDED-SCOPE.md missing**: abort, tell Jake to run `/nightwork-init-phase`.
- **EXPANDED-SCOPE.md is DRAFT**: abort, tell Jake to approve or re-run init.
- **`severity:` missing/invalid**: abort — "Re-run /nightwork-init-phase to declare tier." (No default tier. No legacy untiered path — closed seam per tiering-implementation.)
- **tier-config.json missing/malformed**: abort with pointer to PLANNING-PIPELINE-TIERING.md.
- **§6.2 trigger fires mid-plan**: HALT + surface + jsonl append. Never auto-re-tier (Rule 7a symmetry).
- **/gsd-discuss-phase fails**: surface the failure; don't auto-retry.
- **/gsd-plan-phase fails**: same.
- **Plan-review BLOCKING**: don't auto-fix. Surface findings to Jake. He decides whether to revise plan, revise EXPANDED-SCOPE, or override.
</error-handling>

<rules>
- **Never run /gsd-execute-phase from this wrapper.** That's `/nx`'s job.
- **Never skip plan-review.** D-007 mandates plan-level review before execute.
- **Don't modify EXPANDED-SCOPE.md.** If the plan-review surfaces a scope gap, surface it to Jake; he updates EXPANDED-SCOPE explicitly and re-runs init.
- **Pass through GSD args.** `--auto`, `--all`, `--chain`, etc. are valid; preserve them.
</rules>
