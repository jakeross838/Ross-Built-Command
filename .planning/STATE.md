---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-05-06T13:50:00.000Z"
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 13
  completed_plans: 7
  percent: 53
---

# Nightwork — State

**Updated:** 2026-05-06.

## Active phase

- **Branch:** `phase/1.5-c-information-architecture`
- **Phase:** Stage 1.5c — Information Architecture (8-section nav, Today scaffold, redirects, thin-wrapper extraction, placeholders, canonical docs).
- **Plan position:** Plan 2 (`01.5c-2-thin-wrapper-architect`) **COMPLETE + AMENDMENT LANDED** (original 2026-05-05; amendment 2026-05-06 per Jake nwrp48). Halt-pending Jake re-walk per `halt_after: true`.
- **Last completed plan:** 01.5c-2-thin-wrapper-architect-AMENDMENT (commits 0cb99db, cb9aab9, ade04b4, 6dafc10, f9316bf, 1769e24, e8e67ba). Original Plan 2 commits: b5eeaeb, 4b6e628, e8e27e6. SUMMARY at `.planning/phases/stage-1.5c-information-architecture/01.5c-2-thin-wrapper-architect-SUMMARY.md` (with AMENDMENT section appended).
- **Prior completed plan:** 01.5c-1-nav-today-redirects (commits d115447, 88be994, 8f62295, 8436844).
- **Next plan (after re-walk):** Plan 3 (extraction-production-routes — 4-6 parallel implementers extract 9 remaining prototypes by COPYING the 2 exemplars from Plan 2 + amendment). Spawn after Jake walks 2 prototype pages at 3 viewports + reads WORKFLOW-INTELLIGENCE.md end-to-end + approves D-066..D-072 + approves architectural decisions (Strategy 1-prime locked, T10c Option A unchanged, exemplar shapes incl. amendment changes, currentDraw 7th prop, TanStack sort-trigger TD-20 exemption, fixture-gap path 1, ARCHITECTURE.md cross-ref deferral to Plan 7).

## Plan 2 outcomes (2026-05-05) + AMENDMENT (2026-05-06 per nwrp48)

- **InvoiceReviewView** at `src/components/prototypes/InvoiceReviewView.tsx` (442 LOC post-amendment) — Document Review pattern exemplar. Props-only View accepting `{ invoice, vendor, job, costCode, breadcrumbRoot? }`. AMENDMENT — Parse Confidence + Status Timeline panels collapsed by default via native `<details>`/`<summary>` with chevron + eyebrow + inline status badge. Plan 3's 6 of 9 remaining extractions (DocumentReviewView, DrawApprovalView, ReconciliationView, MobileApprovalView, OwnerDashboardView, OwnerDrawView) COPY this verbatim incl. collapsible panel pattern.
- **BudgetView** at `src/components/prototypes/BudgetView.tsx` (615 LOC post-amendment) — multi-fixture aggregation pattern exemplar (iter-2 architect W-2). Props-only View accepting 6 fixture-type props + currentDraw + breadcrumbRoot. R.2 recalculate-don't-increment computed fields. AMENDMENT — Committed column added between Revised and Previous; Available column replaces Balance; KPI strip's Remaining card relabeled Available with optional committed sub-line; footer dev info removed. Prop shape UNCHANGED — committed + available derived from existing inputs. Plan 3's 3 of 9 remaining extractions (ScheduleView, VendorListView, VendorDetailView) COPY this verbatim incl. committed-column contract.
- **WORKFLOW-INTELLIGENCE.md** at `.planning/architecture/WORKFLOW-INTELLIGENCE.md` (722 LOC, 39 patterns; AMENDMENT) — canonical 39-pattern catalog of cross-entity validation rules + workflow intelligence patterns. Section A (16 invoice patterns) + Section B (11 budget patterns) + Section C (12 cross-cutting "no other tool has this" patterns). Shipped at creation: WI-015, WI-016, WI-017 (CO portion), WI-027. Backed by MASTER-PLAN D-066..D-072. ARCHITECTURE.md cross-ref deferred to Plan 7 atomic creation alongside ENTITY-INVENTORY.md, ROLES-CATALOG.md, INGESTION-ARCHITECTURE.md.
- **MASTER-PLAN D-066..D-072** (AMENDMENT) — 7 architectural decisions: D-066 cross-entity validation as first-class concern; D-067 daily-log/time-entry/photo correlation as F5 capability; D-068 punchlist-blocks-release as F6 capability; D-069 multi-modal punchlist (WI-038) as Wave 3; D-070 auto-generated daily plans (WI-039) as Wave 3; D-071 all 39 WI patterns tracked in canonical doc; D-072 1.5c scope discipline (only WI-015/016/017/027 land).
- **AUDIT-LOG-STRATEGY.md** rewritten with schema-correct framing (entity_type + action separate TEXT NOT NULL columns per migration 00026 + 50+ live write sites). **Strategy 1-prime LOCKED** for 1.5c (preserve entity_type literal values; UI maps via action-labels.ts; zero DB migration risk). Strategy 2 (enum migration) deferred to F1. Strategy 3 rejected.
- **src/lib/audit/action-labels.ts** (84 LOC) — `auditLabel(entity_type, action): AuditLabel` helper module shipped as committed contract per iter-2 must-fix CRITICAL #5. Maps `entity_type='invoice'` → 'Bill', `'draw'` → 'Pay App'. All 11 ActivityEntityType + 15 ActivityAction values covered.
- **T10c hook posture verified Option A** — no hook adjustment needed. 3 control tests confirmed: design-system file importing `@/lib/supabase/server` BLOCKS; production-route fixture imports SILENT; design-system fixture imports SILENT. Component path `src/components/prototypes/` never matches T10c regex.
- 2 prototype pages refactored as thin wrappers: invoices/[id]/page.tsx (452 → 53 LOC, 88% reduction) + jobs/[id]/budget/page.tsx (564 → 73 LOC, 87% reduction).
- **Plan 2 deviations: 3 auto-fixed** — (1) comment-text-tripping verify regex (cosmetic comment fix); (2) currentDraw 7th prop added to BudgetView contract beyond the 6-fixture must_have spec (clean wrapper-resolves-once pattern); (3) TanStack column-header sort-trigger TD-20 exemption with rationale + NwButton import path documented in comments.
- Build clean: ✓ Compiled successfully + 81/81 static pages generated; no new warnings. All 3 task commits passed pre-commit hooks.

## Plan 1 outcomes (2026-05-05)

- 8-section top nav LIVE (Today | Pipeline | Jobs | Financials | Price Intel | People | Company | Reports + Admin ▾ + Platform Admin badge + bell + theme toggle + user menu).
- /today personal-home scaffold replaces /dashboard (Cash Flow + Getting Started moved to /company/overview per Q6=C).
- 38 legacy-path 308-redirects + middleware billing escape fix; D-20 wildcard /admin/platform/:path* covers 13 sub-routes.
- NwPlaceholderCard primitive HOISTED to Plan 1 (per iter-2 mechanical #1) — Plans 4/5/6 import without race condition.
- iter-3 D-23: design-system.css imported from root layout — Plan 3's `.design-system-scope` wrap activates Site Office C rules on production.
- Plan 1 token gap decision: Option B for PlatformAdminBadge (existing --nw-white-sand + --border-default; PROPAGATION run for --text-on-dark deferred to Wave 1.1-Lite).
- Plan 1 deviations: 3 auto-fixed (Tailwind template-literal hover bug fixed; pre-existing text-white in marketing landing fixed inline; taskkill /F violation logged for behavioral correction).

## Recent work shipped (per git log + canonical plan)

- **Stage 1.5c Plan 2 (2026-05-05)**: 2 thin-wrapper exemplars (InvoiceReviewView + BudgetView) + AUDIT-LOG-STRATEGY rewrite + action-labels.ts helper + T10c posture verified.
- **Stage 1.5c Plan 1 (2026-05-05)**: 8-section nav + /today + /company/overview + 38 redirects + middleware billing fix + NwPlaceholderCard hoist + design-system.css root import.
- **Stage 1.5b ship (2026-05-04)**: Prototype gallery + sanitized Caldwell fixtures + 11 prototype routes locked at CP2.
- **Stage 1.5a ship (~2026-04-30)**: Site Office direction C + Set B palette locked; SYSTEM.md + COMPONENTS.md + PATTERNS.md + PROPAGATION-RULES.md authoritative.
- **PR #31 (2026-04-29)**: Plan consolidation — `docs/nightwork-plan-canonical-v1.md` becomes the single source of truth.
- **PR #26 (~2026-04-28)**: Phase 3.4 proposals review form aligned with invoice patterns; print-view added; phase pre-merge cleanups.

## Branches

- `main` — clean; merged through Stage 1.5b CP2 (commit `bff9457`).
- `phase/1.5-c-information-architecture` — current working branch; Plans 1 + 2 commits landed; Plans 3-7 still pending (Plan 3 spawns after Jake halt-review approves Plan 2 architectural decisions).

## Outstanding tech debt + known issues

Canonical §12 is authoritative. Selected highlights:

- **Embedding-on-create wiring gap** — cost intelligence pillar 2 requires this; named as a blocker.
- **Dashboard 503s on aggregations** — historical pain point; new architecture rules require index plans + caching plans on every aggregation.
- **Phase 3.4 dropdown optgroup labels** — relabel `[New]` / `[Legacy]` / `[Pending]` to PM-facing terms (per memory `project_phase3_4_polish_dropdown_labels`).
- **PR #26 follow-up** — extracted_data cache + UI alignment to invoice review (per memory `project_phase3_4_pr26_merge_blockers`).

### Deferred from QA baseline 2026-04-29

These were knowingly deferred from `.planning/qa-runs/2026-04-29-1012-qa-report.md` to keep the build-system phase scoped. Address in a dedicated security-hardening pass before launch.

- **MEDIUM — `vercel.json` X-Frame-Options should be `DENY`** (currently `SAMEORIGIN`). Largely redundant once CSP `frame-ancestors 'none'` is enforced (now in place), but tighten anyway for legacy-browser coverage.
- **MEDIUM — Permissions-Policy is incomplete.** Add `payment=(), usb=(), fullscreen=(self), clipboard-read=()` alongside the existing camera/mic/geolocation locks. `payment=()` is the relevant Stripe-adjacent surface.
- **MEDIUM — No Cross-Origin-Opener-Policy.** Add `Cross-Origin-Opener-Policy: same-origin-allow-popups` (Stripe-redirect compatible). Track COEP `require-corp` as a separate roadmap item — every third-party resource must set CORP headers, so it requires a coordinated rollout.
- **CSP follow-up — migrate from `'unsafe-inline'` to nonces.** The current CSP allows `'unsafe-inline'` in `script-src` and `style-src` because Next.js 14 injects inline scripts (hydration) and inline styles without nonces by default. Next.js docs describe a middleware-based nonce flow; adopt it before launch so the CSP becomes meaningfully strict. (HIGH-finding H1 was resolved by adding the CSP itself; tightening it is the follow-up.)

### Env vars requiring real values before flow activation

- **`STRIPE_WEBHOOK_SECRET`** — currently `whsec_placeholder` in both Production and Preview. Requires the real value from the Stripe Dashboard webhook endpoint before any payment flow is exercised. Wave 1 (subscription / billing activation) blocks on this.
- **`RESEND_API_KEY`** — currently `re_placeholder`. Requires real Resend account + verified sending domain before any transactional email is sent (notifications, draw approvals, etc.). Wave 1 (notifications activation) blocks on this.
- **`STRIPE_PRICE_STARTER` / `_PROFESSIONAL` / `_ENTERPRISE`** — empty in `.env.local`, not pushed to Vercel. Populate after Stripe products exist; then `vercel env add` for both envs.

## Test fixtures

Drummond is the canonical reference job. Real-data fixtures live at `__tests__/fixtures/classifier/.local/` (gitignored). Synthetic fixtures (R.21) are used everywhere else.

## Pre-launch state

Ross Built is Tenant 1, pre-launch — test data only. No migration risk during foundation work. Other tenants will land on production data once the foundation hardens.

## Relevant memory entries

- `feedback_subagent_additions.md` — flag subagent additions at kickoff.
- `feedback_qa_report_path.md` — write QA reports to `./qa-reports/` (project) not the harness sandbox.
- `project_phase3_4_pm_role_gate.md` — `org_cost_codes` writes are owner/admin only.
- `feedback_force_push_rule.md` — `--force-with-lease` OK on solo feature branches post-rebase; never on main/shared; never plain `--force`.
- `project_phase3_4_polish_dropdown_labels.md` — dropdown relabel before PR ready-for-review.
- `project_phase3_4_pr26_merge_blockers.md` — fresh-session sequence + open questions.
