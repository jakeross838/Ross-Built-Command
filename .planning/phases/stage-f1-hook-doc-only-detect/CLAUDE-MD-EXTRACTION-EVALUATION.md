# CLAUDE.md extraction evaluation — per Q5 Amendment 2 + nwrp194 §19

**Generated:** 2026-05-20
**Origin:** EXPANDED-SCOPE Q5 Amendment 2 (post-ship custodian task per nwrp190 + nwrp194 §19)
**Authorization:** nwrp194 §19 explicit — "Evaluate ... If the evaluation concludes extraction is warranted, author it as a SEPARATE plan (don't execute extraction inline). Surface the evaluation conclusion for my review; don't auto-extract."

---

## Current state

| Metric | Value | Context |
|---|---|---|
| CLAUDE.md size pre-this-session | 63,880 bytes / 916 lines | At HEAD pre-Rule-8(e)-add |
| CLAUDE.md size post-Rule-8(e) | 67,474 bytes / 959 lines | After Rule 8(e) sub-clause append today |
| 45.1k warning origin | EXPANDED-SCOPE Q5 Amendment 2 (nwrp190) | Likely captured at earlier point; CLAUDE.md has grown since |
| Rules 7+8+9 + Orchestration discipline | 159 lines (~12 KB) | Lines 696-921; if extracted, CLAUDE.md → ~55 KB / ~800 lines |

**Growth trajectory:** CLAUDE.md grew from 45.1k → 67.4k across recent sessions (Stage 1.5c information-architecture additions D-040..D-065 + Standing Rules section + multi-wave annotations + Rule 8(e) today). Per TD-WE-04 (existing entry at MASTER-PLAN §11): "Trigger condition for action: when CLAUDE.md exceeds ~1000 lines OR when a measurable session-time-to-first-tool-call regression is observed."

Current 959 lines is approaching the 1000-line trigger.

---

## Extraction candidate analysis

**Section block (lines 696-921):**
- Lines 696-717: `### Orchestration discipline` subsection (22 lines)
- Lines 807-841: `Rule 7 — Cost ceiling discipline` (35 lines including Rule 7(a)..(e))
- Lines 842-920: `Rule 8 — Hook fail-closed contract` (79 lines including Rule 8(a)..(e) — Rule 8(e) added today)
- Lines 921-end-of-rules: `Rule 9 — Cross-reviewer factual disagreement HALT` (~22 lines)

**Extraction target:** `.planning/discipline/*.md` per Q5 Amendment 2 verbatim.

**Possible extraction structures:**

| Option | Structure | Pro | Con |
|---|---|---|---|
| A | Single `discipline.md` containing all three Rules + Orchestration | Simple; one file to find | Loses the "rule-by-rule" grep affordance |
| B | One file per Rule: `rule-7-cost-ceiling.md`, `rule-8-hook-fail-closed.md`, `rule-9-cross-reviewer.md`, `orchestration-discipline.md` | Grepable; each rule self-contained; easier to update individually | Four files instead of one; more navigation surface; index needed |
| C | Two files: `rules.md` (7/8/9) + `orchestration-discipline.md` | Middle ground | Rules grouped artificially |

---

## Recommendation

**DEFER extraction; do NOT execute now.**

### Rationale

1. **The 45.1k trigger was a soft signal, not a hard threshold.** Current 67.4k is bigger but the actual cost-of-CLAUDE.md is session-start-token-load. The session-start hook (`.claude/hooks/nightwork-session-start.sh`) loads CLAUDE.md into every Claude Code session. 67.4k = ~17k tokens (4 chars/token estimate); the load is already absorbed across every session. Extracting saves ~3k tokens per session — meaningful but not urgent.

2. **No measurable performance regression observed yet.** Per TD-WE-04's trigger condition: "when CLAUDE.md exceeds ~1000 lines OR when a measurable session-time-to-first-tool-call regression is observed." Lines at 959 (very close to 1000); no perf regression flagged in user-visible signal. The 1000-line trigger is the better signal; cross at 1000 → schedule a CLAUDE.md compression OR rules-extraction phase.

3. **Discipline rules are HIGH-VALUE inline content.** Rules 7/8/9 + Orchestration discipline get cited constantly in nwrp messages, plan-review artifacts, executor commit bodies, agent prompts. Cross-references to specific clause IDs (e.g., "Rule 7c", "Rule 8(d)", "Rule 9 cross-reviewer disagreement HALT") are throughout the codebase. Extracting to `.planning/discipline/*.md` would require:
   - Updating every cross-reference (executor agents read CLAUDE.md verbatim; if Rule 8 moves, every reference becomes stale)
   - Adding an anchor section in CLAUDE.md that points to extracted files
   - Possibly updating the session-start hook to load extraction files alongside CLAUDE.md (or the executor would see only the anchor + miss the actual content)

4. **CLAUDE.md compression is already on the TD-WE-04 backlog.** TD-WE-04 explicitly names CLAUDE.md compression as a candidate plan. Adding a separate "extract discipline rules" plan duplicates the scope. Better: roll discipline-extraction into the broader CLAUDE.md compression plan when TD-WE-04 triggers (1000-line threshold).

5. **First live use of new hook works.** Per nwrp194 §21 ("If the commit is doc-only (MASTER-PLAN + CLAUDE.md are .md), it now passes the freshly-calibrated hook cleanly without --no-verify — first live use of the fix we just shipped"): the custodian commit this session validates the doc-only-skip union branch in production. This validates the calibration end-to-end; no further evidence needed to justify a follow-up plan.

### What to do instead

**Update TD-WE-04 (MASTER-PLAN §11 row) to absorb discipline-extraction scope.** When TD-WE-04 triggers, the plan-author considers:
- Whether to compress entire CLAUDE.md (move data-model entity catalog cross-refs to ENTITY-INVENTORY.md; move historical Phase 0..4 labels out)
- OR extract specific high-volume sections (discipline rules; deployment runbook)
- OR both

Decision deferred to that plan-author cycle.

### When to revisit

- CLAUDE.md exceeds 1000 lines (currently 959; ~42 lines headroom)
- Measurable session-time-to-first-tool-call regression observed
- Next nwrp directly raises the size concern as urgent

---

## Custodian action

This evaluation artifact is committed alongside the other custodian deliverables (TD-NW-HOOK-DOC-ONLY-DETECT CLOSED + Rule 8(e) sub-clause). No CLAUDE.md restructuring executed inline per nwrp194 §19 explicit directive.

**Recommendation surfaced to Jake:** defer extraction; absorb into TD-WE-04 when that triggers; current threshold-proximity is acknowledged but not urgent. Awaiting Jake disposition (accept defer / override-and-extract-now / refine TD-WE-04 with explicit discipline-extraction inclusion).
