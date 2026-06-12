---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in-progress
last_updated: "2026-05-27T15:52:00.000Z"
progress:
  total_phases: 13
  completed_phases: 6
  total_plans: 50
  completed_plans: 33
  percent: 66
---

# Nightwork — State

**Updated:** 2026-06-12 (GTV CLOSED per nwrp281 + Per-Job Wiring SHIPPED per nwrp282. Canonical state lives in `.planning/ground-truth/NIGHTWORK-STATE-AND-LAUNCH-PATH.md` — this file is the quick pointer.)

## Active phase

- **Branch:** `main` — HEAD `10bba5f`; production `dpl_GUonZ7AGGTw3CHp6s4XRBscErYGu`.
- **Just shipped:** **Per-Job Wiring (W-1..7)** — budget/bills/pay-apps/activity tabs wired to real data; F2D-2 affordance; W-6 metric de-dupe; both inherited test debts cleared — **full test suite green, first time on record**. Evidence: `.planning/ground-truth/PART-WIRING.md`.
- **Before that:** GROUND-TRUTH-VERIFICATION complete end-to-end (Stages 1→2A-E→3→4, ~$285-325, every stage under its gate) + nwrp281 close-out wave (fee resolved 11%-contract/variable-per-CO; F2E-3 void-release fix migration 00110; F2B-1/F2A-1/F2A-2 gate fixes; ingestion warn-rule). GTV-CLOSED marking in the canonical doc.
- **Stamped sequence (nwrp281/282):** wiring ✔ → **interaction-bug phase** (entry proposal surfaced at `.planning/ground-truth/INTERACTION-BUG-PHASE-ENTRY.md`, awaiting authorization) → tiering-implementation (nwrp233 gate intact, closes on original conditions) → 3-series.
- **Dogfood gate (human-side, canonical doc §c):** Jake's combined walk (10-stop list in the canonical addendum) + item-8 adjudication with Diane (brief ready) + backfills (72-CO / 13-invoice / 6 uncoded rows) + `require_budget_allocation` flip (AFTER backfill) + 14-job fee collection + $126,927.25 reconciliation. Wiring no longer blocks any of it.

## Recently shipped to main

- **stage-1.5c-verification-harness** SHIPPED 2026-05-11 at merge commit `128d92a` (95 commits, 5 days). 3-layer verification harness (Layer 1 mechanical/DOM, Layer 2 industry-standards, Layer 3 Claude vision) + runLoop state machine + criteria mandate (D-075) + calibration log + GitHub Actions workflow + Vercel preview discovery + auth chain. Final harness baseline PASS=68/FAIL=1/SKIP=1; /nightwork-qa verdict WARNING (non-blocking carry-forward). Vision spend ~$0.573/$5.00.

## 1.5c-IA outcomes shipped (on this branch)

### Plan 6 (2026-05-11) — GATE A halt-after

- 13 admin routes at /admin/* (3 REAL-LOGIC: Users/Billing/Cost Codes + 10 placeholders + 1 overview Card grid)
- /admin/page.tsx overview Card grid resolves Plan-1-introduced redirect loop (Rule 1 fix)
- /admin/profile stubbed Custom Builder / Remodeler / Commercial GC selector (disabled per Q12=A)
- /platform-admin/* full migration: 12 sub-route page.tsx + 1 layout + 1 index placeholder = 14 surfaces (iter-2 D-20 / D-058 Decision B-modified)
- middleware.ts:130 regex extended to gate /platform-admin/* with same isPlatformAdmin posture (iter-2 must-fix CRITICAL #4 Option A LOCKED); redirect param now uses actual pathname
- Shared component dual-awareness: platform-sidebar matches both /platform-admin/* and /admin/platform/* prefixes; audit-row + end-impersonation-button updated to new canonical paths
- iter-2 mechanical #10 verified: 14 of 15 routes ZERO DIFF (1 documented divergence in users/[id] — URL-path rewriting only)
- SEC-9 compliance: /platform-admin/audit preserves createServerClient() verbatim (anon + session cookie + RLS via platform_admin_audit_staff_read policy); NOT service-role
- 5 auto-fixes documented in SUMMARY (1 bug, 1 blocking-source-missing for /admin/integrations, 2 token-discipline, 1 plan-scope-mismatch for /platform-admin/items)
- Build green (25 /admin routes + 12 /platform-admin routes); typecheck clean; 0 hardcoded hex across migrated trees
- Commits: a9f7eb9 (Task 1 — 13 admin routes), 3a9d816 (Task 2 — /platform-admin migration + middleware)

### Plans 4 + 5 (2026-05-09)

- Plan 4: Pipeline + Financials + People + Reports + Sub Portal sections (50 routes shipped)
- Plan 5: PerJobTabs sub-nav + /jobs/[id]/layout.tsx mount + 19 per-job tab placeholder routes

### Plan 3a-now (2026-05-08)

- 10 portfolio prototype routes rewritten as thin wrappers

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
