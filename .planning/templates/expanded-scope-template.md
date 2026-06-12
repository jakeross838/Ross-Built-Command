---
phase: <phase-name>
status: DRAFT
severity: LOW
# severity: LOW | MEDIUM | HIGH — REQUIRED (tiering per nwrp285 / PLANNING-PIPELINE-TIERING.md).
# /np ABORTS without it. Declared at /nightwork-init-phase via the Flavor A/B/C
# signal question; tier-config.json is the single source of truth for what
# each tier means (reviewer sets, ceilings, pipeline depth).
severity_rationale: |
  <REQUIRED — render the SIGNALS, not just the verdict (nwrp285 PA-1):
  "N <tier> signals: <label> ('<stated-scope quote>'), … → <tier>".
  Auto-populated from fired init_detection_signals; Jake edits before confirm.>
estimated_wall_clock: <Nh>
halt_gate_ceiling: 50   # auto from tier-config (LOW=50, MEDIUM=100, HIGH=200)
per_plan_halt: 50       # auto from tier-config (LOW=50, MEDIUM=75, HIGH=100)
---

# Expanded scope — <phase-name>

**Status:** DRAFT — pending Jake approval
**Generated:** <YYYY-MM-DD>
**Authorization chain:** <nwrpNNN / directive references>

## Stated scope (Jake's words, verbatim)

> <quote>

## 1. Mapped entities and workflows

## 2. Prerequisites

## 3. Dependent-soon surfaces

## 4. Cross-cutting checklist

## 5. Construction-domain checklist

## 6. Targeted questions

## 7. Recommended scope (+ falsifiable acceptance criteria)

## 8. Risks + mitigations

## 9. Hand-off notes
