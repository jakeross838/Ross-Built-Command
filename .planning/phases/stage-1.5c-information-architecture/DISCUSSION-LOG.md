# Phase stage-1.5c-information-architecture — Discussion Log (Assumptions Mode)

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the analysis trail.

**Date:** 2026-05-05
**Phase:** stage-1.5c-information-architecture
**Mode:** assumptions (auto-equivalent — formal assumptions analyzer was NOT spawned)
**Reason for skipping formal assumption analysis:** EXPANDED-SCOPE.md APPROVED 2026-05-05 (with nwrp44 amendments) contains all 15 Targeted Questions Q1-Q15 with Jake's locked decisions + 6 numbered MASTER-PLAN decisions D-051 through D-056. Spawning a fresh `gsd-assumptions-analyzer` agent would re-derive what Jake already locked in. Per the workflow's `--auto` mode philosophy, when "all assumptions are Confident or Likely, proceed to write_context."

## Assumption sources

The 18 phase-local decisions in CONTEXT.md `<decisions>` block (D-01..D-18) are sourced as follows:

| Phase ID | MASTER-PLAN ID | Source | Confidence |
|---|---|---|---|
| D-01..D-06 | D-051..D-056 | EXPANDED-SCOPE.md §"Approved amendments" + Targeted Questions Q1/Q3/Q4/Q5/Q6/Q10 | Confident (Jake locked) |
| D-07 | — | EXPANDED-SCOPE.md §"Amendment 2" (nwrp44) | Confident (Jake locked) |
| D-08 | — | EXPANDED-SCOPE.md Q2=A | Confident (Jake recommendation accepted) |
| D-09 | — | EXPANDED-SCOPE.md §7 item 9 + nwrp43 Part 7 G | Confident (specified verbatim) |
| D-10 | — | EXPANDED-SCOPE.md Q12=A | Confident (Jake recommendation accepted) |
| D-11..D-12 | — | EXPANDED-SCOPE.md §7 items 1+3 + nwrp43 Part 2/4 | Confident (specified verbatim) |
| D-13 | — | EXPANDED-SCOPE.md Q11=C | Confident (Jake recommendation accepted) |
| D-14 | — | EXPANDED-SCOPE.md Q8=A | Confident (Jake recommendation accepted) |
| D-15..D-16 | — | EXPANDED-SCOPE.md §7 item 10 + nwrp43 Part 7 H | Confident (specified verbatim) |
| D-17 | — | EXPANDED-SCOPE.md Q13=A | Confident (Jake recommendation accepted) |
| D-18 | — | EXPANDED-SCOPE.md Q14=A | Confident (Jake recommendation accepted) |

All 18 assumptions are at Confident level. No Unclear or Likely items requiring user correction.

## Corrections Made

**No corrections.** All 18 phase-local decisions match Jake's nwrp44 explicit directives + EXPANDED-SCOPE.md approved recommendations. Nothing required correction.

## Auto-Resolved

None — no Unclear assumptions to auto-resolve.

## External Research

None performed at discuss-phase. Future plan-phase agents (gsd-pattern-mapper for placeholder route mapping, gsd-phase-researcher if research is invoked) may surface external research needs.

## Codebase scout findings

Lightweight scan results captured in CONTEXT.md `<code_context>` block. Key findings:
- 11 prototype routes at `src/app/design-system/prototypes/*` ready for D-03 thin-wrapper extraction
- nav-bar.tsx 4-item ACCESS map at lines 57-63 ready for D-04 8-item expansion
- middleware.ts isPlatformAdmin at lines 34/72/83/101/121 ready for D-09 Platform Admin badge
- next.config.mjs `redirects()` async at line 14 ready for D-01 32-path redirect map
- /api/dashboard endpoint reusable for D-05 Today screen Action Items
- No new dependencies required (verified via SETUP-COMPLETE.md)

## Notes for plan-phase agents

1. **Plan-phase risks concentrate on D-03 thin-wrapper extraction (5 days budget) + D-07 visual verification.** Other items (1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12 of EXPANDED-SCOPE §7) are mechanical / templated.

2. **Wave decomposition recommendation (Claude's Discretion per CONTEXT):**
   - Wave 1: Top nav restructure (D-11) + Today scaffold (D-05) + per-job sub-nav (D-12) + Platform Admin badge (D-09)
   - Wave 2: Thin-wrapper extraction (D-03) + structural TD fixes (D-06: TD-20/25/26) + side-by-side visual verify (D-07) + Bills/Pay Apps rename (D-01)
   - Wave 3: 60-90 placeholder routes (D-13) + Admin section restructure + Sub Portal 3 stubs (D-02) + per-job tab placeholders
   - Wave 4: Documentation atomic update (D-15 + D-16) + 32-path redirects + smoke tests + M3 phone walk gate (D-17)
   - Plan-phase will lock the wave decomposition.

3. **Parallelism guidance per nwrp44 standing rules** (also captured in CONTEXT):
   - Independent work → batches of 6-8 agents per wave (placeholder routes, doc files, isolated extracted components)
   - Coupled work → single architect first, then parallel implementers (extraction architecture, audit-log strategy, redirect map)
   - Architecture decisions → surface to Jake, do NOT auto-decide

4. **Critical halt points (per Jake nwrp44):**
   - HALT 1: Plan-review iter-1 results — Jake reviews before /nx execute
   - Within execute (per D-07): visual divergence in extracted production routes vs prototypes = CRITICAL halt for investigation

5. **Build + typecheck + hooks must remain clean throughout** (incremental green; no "fix later" pattern).
