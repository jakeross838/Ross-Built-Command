---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in-progress
last_updated: "2026-05-11T16:30:00Z"
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 18
  completed_plans: 14
  percent: 78
---

# Nightwork — State

**Updated:** 2026-05-11 (1.5c-IA branch merged main → harness infrastructure integrated; Plans 1/2/2-amend/3 already shipped pre-harness; criteria retrofit + harness validation in flight per Block N+1 / nwrp76).

## Active phase

- **Branch:** `phase/1.5-c-information-architecture`
- **Phase:** Stage 1.5c — Information Architecture (8-section nav, Today scaffold, redirects, thin-wrapper extraction, placeholders, canonical docs).
- **Plan position:** Plans 1, 2, 2-amend, 3 shipped (pre-harness). Plans 4-7 remain.
- **In-flight:** Block N+1 catch-up — retrofit criteria checklists onto already-shipped Plans 1/2/2-amend/3 per harness D-075 (criteria mandate); run harness against current state; triage findings.
- **Next plan (after catch-up):** Plan 4 (jobs-list-detail) OR Plan 3a (portfolio-rewrites — orchestrator-recommended; 10 mechanical portfolio-route rewrites) per Jake decision at halt-review.

## Recently shipped to main

- **stage-1.5c-verification-harness** SHIPPED 2026-05-11 at merge commit `128d92a` (95 commits, 5 days). 3-layer verification harness (Layer 1 mechanical/DOM, Layer 2 industry-standards, Layer 3 Claude vision) + runLoop state machine + criteria mandate (D-075) + calibration log + GitHub Actions workflow + Vercel preview discovery + auth chain. Final harness baseline PASS=68/FAIL=1/SKIP=1; /nightwork-qa verdict WARNING (non-blocking carry-forward). Vision spend ~$0.573/$5.00.

## 1.5c-IA outcomes shipped (pre-harness, on this branch)

### Plan 3 (2026-05-06)
- 10 NEW props-only View components at `src/components/prototypes/`.
- 12 production routes mounted as thin wrappers with `<div data-direction="C" data-palette="B" className="design-system-scope">`.
- 8 inline JobTabs removed from /jobs/[id]/* pages.
- SEC-10 defensive grep clean across all 12 production routes.
- Visual D-07 verification at 3 viewports deferred to Jake's halt-review walk.
- 88/88 static pages build clean.

### Plan 2 + Amendment (2026-05-05/06)
- InvoiceReviewView (442 LOC post-amendment) — Document Review pattern exemplar with collapsed-by-default Parse Confidence + Status Timeline panels (WI-015 + WI-016).
- BudgetView (615 LOC post-amendment) — multi-fixture aggregation pattern with Committed column (WI-017 CO portion) + Available column.
- WORKFLOW-INTELLIGENCE.md (722 LOC, 39 patterns).
- MASTER-PLAN D-066..D-072.
- AUDIT-LOG-STRATEGY.md + action-labels.ts helper.

### Plan 1 (2026-05-05)
- 8-section top nav LIVE.
- /today personal-home scaffold replaces /dashboard.
- 38 legacy-path 308-redirects + middleware billing escape fix.
- NwPlaceholderCard primitive hoisted; design-system.css imported from root layout.

## Branches

- `main` — Stage 1.5c-vh merged at `128d92a` (harness shipped 2026-05-11).
- `phase/1.5-c-information-architecture` — current; Plans 1/2/2a/3 shipped; merged main (harness infra integrated); criteria retrofit in flight.

## Outstanding tech debt + known issues

Canonical §12 is authoritative. Selected highlights:

- **Embedding-on-create wiring gap** — cost intelligence pillar 2 requires this; named as a blocker.
- **Dashboard 503s on aggregations** — historical pain point; new architecture rules require index plans + caching plans on every aggregation.
- **`src/middleware.ts:179` NODE_ENV → VERCEL_ENV one-liner** — security WARNING from harness ship QA; 4-layer defense holds; one-line follow-up.
- **Phase 3.4 dropdown optgroup labels** — relabel `[New]` / `[Legacy]` / `[Pending]` to PM-facing terms.
- **PR #26 follow-up** — extracted_data cache + UI alignment to invoice review.

## Test fixtures

Drummond is the canonical reference job. Real-data fixtures live at `__tests__/fixtures/classifier/.local/` (gitignored). Synthetic fixtures (R.21) used everywhere else.

## Pre-launch state

Ross Built is Tenant 1, pre-launch — test data only. No migration risk during foundation work.
