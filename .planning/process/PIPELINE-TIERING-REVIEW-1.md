# PIPELINE-TIERING-REVIEW-1 (SEED) — friction-tax finding from the first HIGH phase

**Status:** SEED — first input captured per nwrp287(1), NOT the full REVIEW-1 (which fires after 4 tiered phases). This exists so the highest-value finding from F6-family does not live only in an exit report. **The proposed tier-config.json amendment below is a PROPOSAL for Jake's decision at REVIEW-1 — tier-config.json is UNCHANGED (PA-2: rigor parameters change only via reviewable, Jake-authorized commits).**

**Phases under tiering so far:** 1 of 4 — `f6-family` (HIGH), shipped 2026-06-17 (commit `0c19459`).

## Data sources (per tier-config friction_tax contract)
- `mid-execute-halts.jsonl`: **1 row, the synthetic seed only.** Zero real §6.2 halts across F6-family. So the specced halt-rate metric `mid_execute_halt_rate(HIGH)` = 0/1 = **0.0**, far below the 0.2 threshold. **Finding: the jsonl is the wrong instrument for the friction we actually hit.** The live friction was not halt-rate — it was REVIEWER-FAN-OUT COST. Recommend REVIEW-1 add a per-phase line capturing `{phase, tier, plan_review_agents, qa_agents, diff_lines}` so cost friction is measurable, not just halt friction.

## The finding — HIGH reviewer fan-out is cost-prohibitive as specced

tier-config HIGH specifies **base-6 + earned conditionals**. On F6-family the earned set was: DB/migration → rls-auditor + database-reviewer + data-migration-safety (+3); financial → compliance (+1); UI → design-pushback (+1). That is **base-6 + 5 = ~11 agents per gate**, and QA mirrors → **~22 agent-runs per phase**. At ~$2–4/agent that is **$44–88 in review alone — it exhausts a $90 unattended ceiling before a line of code is written.**

What I actually ran, and the result:
- **plan-review: 4 consolidated independent reviewers** (money/ai-logic-tester on Opus; security+migration+RLS, spec+planner+enterprise, custodian+design on Sonnet) — each carrying named folded mandates covering all 11 lanes.
- **QA: 2 consolidated reviewers** (money+security; custodian+spec+design) on the actual code diff.
- **Outcome: FULL mandate coverage at ~⅓ the agent cost.** The set caught, on first contact, 1 BLOCKING + 3 CRITICAL + several WARNINGs (incl. a real D3 dead-fields bug where two diff fields could never flag, and the fail-closed-must-be-local-422 surface). The money reviewer independently CONFIRMED rail-invariance against live DB. Nothing was missed that later QA or execution surfaced.

**Key diagnosis:** the base-6 is the right independent-review FLOOR for a HIGH money-path phase — it earned its keep. The cost explosion is the **additive earned-conditional fan-out (+5, then ×2 for QA)**, plus running 6 independent base agents on a *small* diff (F6 was 191 changed lines). Two separate levers, two separate fixes.

## Proposed tier-config.json amendment (for Jake @ REVIEW-1)

Three changes to the `HIGH` tier, none of which lower the base-6 *contract*:

1. **Fold earned conditionals by default; don't add an agent per axis.**
   ```
   "conditional_adds_policy": {
     "default": "FOLD each earned conditional into a base-reviewer's mandate; name the fold in the dispatch prompt. Do NOT spawn one agent per earned axis.",
     "spawn_separate_agent_when": "Jake-flagged at /np, OR the axis is genuinely uncoverable by a base lens (e.g. a dedicated data-migration-safety pass on a DESTRUCTIVE migration — drops/rewrites, not additive).",
     "hard_cap": "<= 6 plan-review agents AND <= 6 QA agents per phase. The base-6 IS the cap; conditionals fold, never push past 6."
   }
   ```
2. **Sanction small-diff consolidation (the F6 move) as an explicit OPTION, not a new default.**
   ```
   "small_diff_consolidation": {
     "threshold": "diff < ~400 changed lines AND < ~8 files",
     "rule": "base-6 MAY consolidate to 4 independent reviewers, each carrying NAMED folded lenses; document the fold in the report.",
     "note": "an option for small diffs — does NOT lower the default floor for large/complex HIGH phases."
   }
   ```
3. **Permit cheaper model tier for non-money lenses.**
   ```
   "reviewer_model_policy": "the ai-logic-tester / money-math lens runs on the session (Opus-class) model; security/spec/planner/custodian/design lenses MAY run on a cheaper tier (Sonnet) — used on F6 with no observed coverage loss."
   ```

## My recommendation (Jake asked me to flag: new 4+2 default, OR keep 6-base + earned + hard cap)

**Keep 6-base + earned-conditionals as the CONTRACT; cap the fan-out (fold, don't add); sanction small-diff consolidation to 4. Do NOT make 4+2 the blanket default.**

Reasoning:
- The 4+2 worked because F6 was **small (191 lines)** AND I carefully hand-mapped 11 mandates onto 4 prompts. As a *blanket* default, "4 consolidated agents" (a) lowers the independent-review floor for *every* HIGH phase, including a future large/complex one (a multi-table migration + cross-org flow) where 6 genuinely-independent lenses earn their cost, and (b) makes the contract fuzzier ("4 consolidated" depends on orchestrator skill at folding; "these 6 named lenses" is accountable).
- The actual cost driver was the **+5 additive conditional fan-out**, not the base-6. Killing the additive fan-out (fold + hard-cap at 6) removes ~⅔ of the projected cost while keeping the named-lens floor.
- Small-diff consolidation captures the rest of the F6 saving **where it's safe** (small diffs) without making it the rule **where it isn't** (large diffs).

Net: a HIGH phase costs **≤6 + ≤6 = ≤12 agent-runs** (down from ~22), and a *small* HIGH phase costs **≤4 + ≤2 = ≤6** (what F6 actually did) — all without lowering the floor for the phases that need it. This is the design self-correcting from one live data point; confirm or revise after 3 more tiered phases at REVIEW-1.
