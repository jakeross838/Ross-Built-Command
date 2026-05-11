# Calibration log entry schema

**Spec for:** `.planning/calibration-log.md` entries.
**Mandate:** D-14 in `.planning/phases/stage-1.5c-verification-harness/01.5-c-verification-harness-CONTEXT.md`.
**Watchpoint #4:** entries must produce useful lessons not noise. Schema below is the machine-readable contract.

## Entry shape

Each entry has TWO parts:

1. **JSON front-matter** — machine-readable, parsed by `/np` orchestrator at next-phase scope time per D-27.
2. **Markdown body** — human-readable lessons / what worked / what didn't / adjustment for next phase.

### JSON front-matter required fields

```yaml
---
phase: stage-<sub-stage>-<name>          # e.g. stage-1.5c-verification-harness
shipped_at: <ISO date>                    # e.g. 2026-05-XX
wave_count: <integer>                     # number of waves the phase used
parallelism_used: <integer>               # max plans concurrent in any wave
plan_count: <integer>
plan_iter_counts:                         # per-plan iteration count (1 = clean run; 2-3 = revise rounds)
  <plan_id>: <integer>
harness_runs: <integer>                   # total harness invocations across phase
harness_pass_rate: <0.0-1.0>              # passed / total
harness_iter_counts:                      # distribution of harness iter-N counts
  iter_1_resolved: <integer>              # how many failures resolved on iter 1 (no fix-executor needed)
  iter_2_resolved: <integer>
  iter_3_resolved: <integer>
  iter_3_halt_for_jake: <integer>         # how many hit the iter-3 halt
ambiguous_vision_halts: <integer>         # how many confidence < 0.7 halts
vision_cost_usd: <number>                 # total Layer 3 cost across phase
vision_cache_hit_rate: <0.0-1.0>          # cached / total Layer 3 calls
prompt_density_signal: <1-5>              # subjective: 1=way too verbose; 5=way too terse; 3=right
drift_cases: <integer>                    # how many post-edit hook fires / hook violations
process_discipline_violations: <integer>  # how many "killed running process" or similar incidents
---
```

### Markdown body sections

After the JSON front-matter:

```markdown
## What worked
- <bullet 1>
- <bullet 2>

## What didn't
- <bullet 1>
- <bullet 2>

## Adjustment for next phase
- <recommendation 1>
- <recommendation 2>

## Cost notes
- <vision cost analysis if relevant>

## Process notes
- <discipline / parallelism / pacing observations>
```

## Required vs optional

All JSON front-matter fields above are **required**. If a field is N/A for a phase (e.g., `vision_cost_usd: 0` for a phase with no Layer 3 criteria), use the appropriate zero/empty value — do not omit.

Markdown body sections are **required** (each is a heading; content can be a single bullet "(none)" if truly nothing to report).

## Custodian writer rules

`nightwork-custodian` (per D-13) writes entries at post-ship sweep. Custodian reads:

1. `.planning/phases/<phase>/PLAN-*.md` (plan_iter_counts via SUMMARY.md "iterations" field)
2. `.planning/qa-runs/<phase>-*` (harness_pass_rate, ambiguous_vision_halts, vision_cost_usd from final QA report)
3. `.planning/verification/reports/<phase>/final.md` (harness-specific metrics)
4. `.planning/lessons.md` (process_discipline_violations — count entries by phase)

Custodian DOES NOT speculate beyond extractable data. The "What worked / What didn't / Adjustment" body sections are filled from QA report verdict text + lessons.md entries; if the data is thin, sections list "(no data this phase — extractable signal: …)" with the extractable signal as guidance for next phase.

## Reader rules (for /np orchestrator)

When scoping a new phase via /np, the orchestrator reads the most recent 3-5 calibration entries and adjusts:

- **Parallelism** — if recent phases used parallelism 3 successfully without drift, scale next phase to 3+; if drift_cases > 5 in a phase with parallelism 3, scale next phase down to 2.
- **Prompt density** — if prompt_density_signal averages < 2.5 (verbose), reduce; if > 3.5 (terse), increase.
- **Iter-3 budget** — if harness_iter_counts.iter_3_halt_for_jake > 1 in a recent phase, reduce phase scope or increase Jake check-in cadence.
- **Vision cost** — if vision_cost_usd > $2 per phase consistently, raise cost cap default from $1 to $2.

These are heuristics, not hard rules. Jake can override at /np review.

## Plan-review watchpoint #4 anchor

The schema above produces useful lessons (machine-extractable signals + human-readable analysis), not noise (random observations without categorization). If the calibration log starts feeling like noise:

- Schema fields are too granular → simplify
- Schema fields are not actionable → cut them
- Body sections are filled with "(no data)" repeatedly → adjust extraction rules

Surface as plan-review iter-1 feedback in any future phase that finds the calibration mechanism unhelpful.
