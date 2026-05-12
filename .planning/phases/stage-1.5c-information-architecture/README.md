# Stage 1.5c — Information Architecture

**Status:** PLANS DRAFTED iter-2 — pending plan-review iter-2 + Jake review
**Branch (at execute time):** `phase/1.5-c-ia-restructure` (cut by `/gsd-execute-phase`)
**Predecessor:** stage-1.5b-prototype-gallery (locked at commit `dd3baff`; prototypes shipped, awaiting `/gsd-ship` after 1.5c lands)
**Successor:** F1 (Knowledge Graph Schema + Auth Foundation)

**iter-2 history:**
- iter-1 plans drafted 2026-05-04 → 2026-05-05
- /nightwork-plan-review iter-1 ran 2026-05-05 → REVISE-PLAN verdict (13 CRITICAL findings + 6 cross-reviewer agreements)
- Jake nwrp45 (2026-05-05): resolved 4 architectural decisions (D-19/D-20/D-21/D-22 = MASTER-PLAN D-057/D-058/D-059/D-060) + locked 5 must-fix CRITICALs + 10 mechanical fixes + 4 watchpoints
- iter-2 plans regenerated 2026-05-05 (this version): 7 plan files revised in place addressing nwrp45 amendments
- /nightwork-plan-review iter-2 (next step) — expected APPROVE / WARNING verdict

---

## What this phase does

Per Jake nwrp43 (MAJOR ARCHITECTURE CONTEXT RESET) + nwrp44 (3 amendments + chain authorization) + nwrp45 (4 architectural decisions + iter-2 amendments):

Stage 1.5c is a 5-7 day IA mini-phase (revised duration estimate: 7.25-8.25 days iter-2 vs 6.25-7.25 iter-1 due to D-20 +1d migration scope) that lands BEFORE `/gsd-ship` of stage-1.5b-prototype-gallery. It implements the SHAPE of the new architecture before any deep implementation. Anything requiring real backend logic = placeholder. Production routes mount existing 1.5b prototype components via prop-drilled thin wrappers (T10c-clean separation per D-03) WRAPPED in `.design-system-scope` (per iter-2 D-19). Canonical documentation locks the 8 architectural principles as the reference for F1-F6 phases.

**8-section top nav:** `Today | Pipeline | Jobs | Financials | Price Intel | People | Company | Reports` + Admin ▾ + Platform Admin badge + Notifications bell + User menu.

**Bills/Pay Apps full terminology rename:** Invoices → Bills + Draws → Pay Apps everywhere (50-80 label sites + 32 path 301-redirects). Audit-log entity_type values continue 'invoice' / 'draw' per existing schema (per iter-2 must-fix CRITICAL #5 schema-aware framing); UI maps via src/lib/audit/action-labels.ts.

**60-90 placeholder routes:** every section + per-job tab covered with Wave-badged stubs.

**12 production routes:** mounting refactored prototype components with Caldwell fixture data (per iter-2 D-19: wrapped in .design-system-scope for Site Office signature propagation).

**Full /admin/platform → /platform-admin migration (per iter-2 D-20):** 13 sub-routes migrated with REAL functionality preserved (audit, organizations, users, feedback, support, items, cost-intelligence). Index page stays placeholder showing directory.

**4 NEW canonical docs:** ARCHITECTURE / ENTITY-INVENTORY / ROLES-CATALOG / INGESTION-ARCHITECTURE (with iter-2 mechanical #6 column additions: Retention class + PII? + Cross-org? + §SOC2 control mapping).

**5 EXISTING docs updated atomically (per iter-2 mechanical #7):** CONTEXT / MASTER-PLAN / CLAUDE / PHILOSOPHY / PATTERNS + COMPONENTS.md §7 NwPlaceholderCard entry per iter-2 mechanical #2.

---

## iter-2 amendments summary (per Jake nwrp45)

Addresses 13 CRITICAL findings + 6 cross-reviewer agreements from /nightwork-plan-review iter-1 REVISE-PLAN report.

### 4 architectural decisions resolved (LOCKED)

- **D-19 (= MASTER-PLAN D-057) — Decision A:** Wrap production routes in `.design-system-scope` className. Plan 3 thin-wrapper extraction wraps each production route's outer container. Resolves Site Office scope leak (XR-4).
- **D-20 (= MASTER-PLAN D-058) — Decision B-modified:** Full `/admin/platform` → `/platform-admin` migration in 1.5c. Plan 1 adds wildcard redirect; Plan 6 mounts existing 13 sub-route layouts. ~1d additional scope.
- **D-21 (= MASTER-PLAN D-059) — Decision C:** PerJobTabs collapses to dropdown <768px (matches existing nav-bar mobile hamburger pattern).
- **D-22 (= MASTER-PLAN D-060) — Decision D:** Admin dropdown shortcut + `/admin` canonical destination both exist with clear precedence.

### 5 must-fix CRITICALs

1. Site Office scope leak (XR-4) — RESOLVED via D-19. Plan 3 wraps production routes in `.design-system-scope`.
2. JobTabs vs PerJobTabs double-nav collision (architect C-1) — Plan 3 Task 4 explicitly REMOVES inline `<JobTabs>` from 9 existing `/jobs/[id]/*/page.tsx` files.
3. /admin/platform regression (architect C-2) — RESOLVED via D-20. Plan 1 wildcard redirect + Plan 6 mounts 13 sub-routes.
4. /platform-admin auth gate (XR-2) — Plan 6 Task 2 LOCKS Option A: middleware.ts:65 regex extended to also match /platform-admin/*.
5. Audit-log schema rewrite (XR-3) — Plan 2 Step B replaces concat-action-string framing with entity_type + action separate-column reality. Strategy 1-prime (entity_type-aware UI label mapping) primary recommendation. action-labels.ts helper module ships in 1.5c (Plan 2; ~30 LOC contract committed).

### 10 mechanical fixes

1. Plans 5+6 depends_on resolved by hoisting NwPlaceholderCard to Plan 1 Task 1
2. PlaceholderCard renamed to NwPlaceholderCard (PROPAGATION-RULES.md §4b naming) + COMPONENTS.md §7 entry in Plan 7
3. PlatformAdminBadge hex fallback fix — Plan 1 verifies tokens; uses Option B (existing tokens, no hex)
4. /admin/billing redirect loop fix — Plan 1 adds /admin/billing to BILLING_ESCAPE_PATHS + updates billing-gate destination
5. Sub Portal token stub fixes — Plan 4: param-reflection grep verify + F3 compliance contract in stub copy
6. Plan 7 column additions — ENTITY-INVENTORY adds Retention class + PII?; ROLES-CATALOG adds Cross-org?; ARCHITECTURE adds §SOC2 control mapping
7. Plan 7 atomic 9-doc commit (instead of split 4 NEW + 5 UPDATED commits)
8. Plan 7 atomic update idempotency guard — `grep -c 'D-040' MASTER-PLAN.md` before append
9. Plan 4 AC-1.5c-4-07 verify — 3 explicit grep tokens (one per Sub Portal stub)
10. Real-logic re-mounts preserve `getCurrentMembership()` verbatim per route grep diff

### 4 iter-2 watchpoints

1. Visual diff before/after .design-system-scope wrap on production (Plan 3 Task 5)
2. Sub-route functionality verify post-migration (Plan 6 Task 2)
3. Auth bypass test for /platform-admin middleware (Plan 6 Task 2)
4. Audit-log live smoke test confirming entity_type + action columns separate (Plan 2 Task 1)

### Owner Portal posture clarification (multi-tenant W-1)

- 1.5c is structural — Caldwell fixtures only; no real auth flow exercised
- F1 commits to ONE auth path: extending client_portal_access tokens OR introducing owner_view role with RLS — NOT both
- Plan 7 ARCHITECTURE.md documents this constraint for F1 inheritance

---

## Read first (in order)

1. **`.planning/expansions/stage-1.5c-information-architecture-EXPANDED-SCOPE.md`** — APPROVED 2026-05-05 with 3 nwrp44 amendments + iter-2 amendments (per nwrp45). Source of truth for D-01..D-22.
2. **`.planning/phases/stage-1.5c-information-architecture/CONTEXT.md`** — 22 phase-local locked decisions D-01..D-22 (mapping to MASTER-PLAN D-051..D-060). Read in full.
3. **`.planning/phases/stage-1.5c-information-architecture/DISCUSSION-LOG.md`** — audit trail.
4. **`.planning/expansions/stage-1.5c-information-architecture-SETUP-COMPLETE.md`** — infrastructure baseline.
5. **`.planning/phases/stage-1.5c-information-architecture/PATTERNS.md`** — pattern map for the ~95 files (with iter-2 amendments section appended).
6. **`.planning/plan-reviews/stage-1.5c-information-architecture-plan-review.md`** — iter-1 REVISE-PLAN report (motivates iter-2 amendments).

---

## 7 plans organized in 4 waves (iter-2)

### Wave 1 — Top nav restructure + Today scaffold + redirects map (~1.5 days, foundation)

**Plan 1 — Top nav 8-section restructure + Today scaffold + 32-path redirects map + NwPlaceholderCard hoist + middleware.ts BILLING_ESCAPE_PATHS update**
- File: `01.5c-1-nav-today-redirects-PLAN.md`
- depends_on: `[]`
- autonomous: false (halt_after: true)
- 3 tasks: (a) NwPlaceholderCard creation (HOISTED per iter-2 mechanical #1) + 8-section nav-bar.tsx refactor + Platform Admin badge component (Option B token approach per iter-2 mechanical #3); (b) Today screen + Cash Flow/Getting Started moved to /company/overview; (c) 32-path redirect map INCLUDING D-20 wildcard /admin/platform/:path* + middleware.ts BILLING_ESCAPE_PATHS update per iter-2 mechanical #4.

### Wave 2 — Thin-wrapper extraction + production routes + structural TD fixes (~3 days)

**Plan 2 — Thin-wrapper extraction architect — TWO exemplars (InvoiceReviewView + BudgetView per iter-2 W-2) + AUDIT-LOG-STRATEGY.md REWRITE per iter-2 must-fix #5 + action-labels.ts helper**
- File: `01.5c-2-thin-wrapper-architect-PLAN.md`
- depends_on: `[1]`
- autonomous: false (halt_after: true — surfaces audit-log strategy + T10c hook posture + 2 exemplars to Jake)
- 3 tasks: (a) AUDIT-LOG-STRATEGY.md REWRITE schema-correct (entity_type + action separate columns) + action-labels.ts helper + T10c hook verification + live audit-log smoke; (b) InvoiceReviewView Document Review pattern exemplar; (c) BudgetView multi-fixture aggregation pattern exemplar (iter-2 W-2 — 2nd exemplar).

**Plan 3 — Thin-wrapper implementers + production routes WITH .design-system-scope wrap (D-19) + JobTabs removal (must-fix #2) + side-by-side visual verify**
- File: `01.5c-3-extraction-production-routes-PLAN.md`
- depends_on: `[2]`
- autonomous: false (halt_after: true — D-07 visual verification CRITICAL halt + iter-2 watchpoint #1)
- 5 tasks: (a) Extract 9 remaining prototype components; (b) Mount 12 production routes WITH .design-system-scope wrap (D-19) + getCurrentMembership preservation (mechanical #10) + REAL vs PLACEHOLDER (W-5); (c) Rewrite 11 portfolio routes; (d) REMOVE inline JobTabs from 9 existing /jobs/[id]/*/page.tsx (iter-2 must-fix CRITICAL #2); (e) D-07 side-by-side visual verification at 3 viewports (iter-2 W-3 method) + iter-2 watchpoint #1 D-19 wrap diff.

### Wave 3 — Section placeholders + Sub Portal + Per-job sub-nav + Admin restructure + Platform Admin migration (~3 days)

**Plan 4 — Section overview routes + Sub Portal 3 stubs (with explicit F3 compliance contracts per iter-2 mechanical #5) + Wave 3 mid-checkpoint smoke (iter-2 LOW-2/LOW-4)**
- File: `01.5c-4-section-placeholders-sub-portal-PLAN.md`
- depends_on: `[1, 3]`
- autonomous: true
- 4 tasks (was 3): (a) Pipeline section + NwPlaceholderCard consumer; (b) Financials + Price Intel sections — REAL-LOGIC mounts preserve getCurrentMembership per iter-2 mechanical #10; (c) People + Sub Portal 3 stubs (with F3 compliance contracts) + Company + Reports; (d) Wave 3 mid-checkpoint smoke per iter-2 planner LOW-2/LOW-4.

**Plan 5 — Per-job sub-nav scaffold WITH mobile <768px collapse-to-dropdown (D-21) + per-job tab placeholders + JobTabs removal cross-reference smoke**
- File: `01.5c-5-per-job-tabs-PLAN.md`
- depends_on: `[1, 3]`
- autonomous: true
- 2 tasks: (a) PerJobTabs component with iter-2 D-21 mobile collapse-to-dropdown + /jobs/[id]/layout.tsx mount; (b) 19 per-job placeholder routes (consume NwPlaceholderCard from Plan 1) + iter-2 must-fix #2 cross-reference smoke (zero double tab bars).

**Plan 6 — Admin section restructure + Platform Admin FULL MIGRATION (per iter-2 D-20: 13 sub-routes mounted) + middleware.ts regex extension (must-fix #4 Option A LOCKED)**
- File: `01.5c-6-admin-platform-admin-PLAN.md`
- depends_on: `[1, 3]`
- autonomous: false (halt_after: true — iter-2 watchpoint #2 sub-route functional + watchpoint #3 auth bypass test)
- 2 tasks: (a) /admin/* 13 routes (4 real-logic mounts + 8 placeholders + 1 overview canonical destination per D-22); (b) /platform-admin/* full migration of 13 sub-routes per iter-2 D-20 + middleware.ts regex extension per iter-2 must-fix CRITICAL #4 Option A LOCKED + watchpoint #2 (sub-route functional smoke) + watchpoint #3 (auth bypass test).

### Wave 4 — Documentation atomic update + final smoke (~1.25 days)

**Plan 7 — 4 NEW canonical docs (with iter-2 mechanical #6 column additions) + 6 ATOMIC doc updates (5 EXISTING + COMPONENTS.md §7 NwPlaceholderCard entry per iter-2 mechanical #2) + integration smoke + M3 phone walk gate setup**
- File: `01.5c-7-canonical-docs-smoke-PLAN.md`
- depends_on: `[3, 4, 5, 6]`
- autonomous: false (halt_after: true)
- 3 tasks: (a) Create 4 NEW canonical docs at `.planning/architecture/` with iter-2 mechanical #6 columns (Retention class + PII? + Cross-org? + §SOC2); (b) Update 5 EXISTING docs + COMPONENTS.md §7 NwPlaceholderCard entry ATOMICALLY per iter-2 mechanical #7 (single 9-10 doc commit) + idempotency guard per iter-2 mechanical #8 + schema-aware audit-log language per iter-2 must-fix #5; (c) Final integration smoke + iter-2 enterprise-r W-4 post-deploy curl checks + M3 phone walk readiness gate.

---

## Standing rules during execution (per nwrp44 + nwrp45)

- **Parallel execution by work type:**
  - Independent work → parallel batches of 6-8 agents per wave
  - Coupled work → single architect first, then parallel implementers
  - Architecture decisions → surface to Jake, do NOT auto-decide
- **Integration checkpoints every 2-3 days, not at end of phase** (Plan 1 halt + Plan 2 halt + Plan 3 halt + Plan 4 mid-checkpoint smoke + Plan 6 halt + Plan 7 halt)
- **Real-data smoke tests catch what plan-review misses** (iter-2 watchpoints #2 + #3 + #4 enforce)
- **Visual walk of extracted routes before declaring extraction complete** (per D-07 + iter-2 watchpoint #1)
- **Build + typecheck + hooks must remain clean throughout** (no "fix later" — incremental green)
- **Privacy gate (32-token denylist) clean across all new files** (iter-2 security LOW SEC-6/7/8 explicit grep on canonical docs)

## Halt-after gates encoded (iter-2)

1. **Plan 1 halt** — after Wave 1 lands. Jake walks new top nav + Today scaffold + spot-checks 3-5 redirects + reviews iter-2 mechanical #3 token gap decision.
2. **Plan 2 halt** — after thin-wrapper architect ships 2 exemplars + AUDIT-LOG-STRATEGY rewrite + action-labels.ts helper. Jake confirms approach.
3. **Plan 3 halt** — after D-07 side-by-side visual verification at 3 viewports + iter-2 watchpoint #1 D-19 wrap visual diff. ANY divergence = CRITICAL halt.
4. **Plan 6 halt** — after Platform Admin full migration + iter-2 watchpoints #2 + #3 (sub-route functional + auth bypass test).
5. **Plan 7 halt** — final integration checkpoint. Build + typecheck clean; all hooks silent; privacy gate clean; M3 phone walk gate ready.

## Out of scope (deferred per CONTEXT)

- F1+ schema migrations (knowledge graph entity model)
- F2+ role expansion (4-role to 15-role) and permission matrix wiring
- F3+ magic link infrastructure + multi-modal ingestion routing
- F4+ time tracking + equipment + expenses
- F5+ Price Intel cross-pollination engine
- F6+ Pay Apps assembled-from-data engine
- Wave 2+ entity creation (Schedule backend, Daily Logs, Punchlist, RFIs, Submittals, Photos, Documents)
- Wave 1.1 polish backlog beyond TD-20/25/26 (per D-06)
- Real-backend wiring for production routes (per Q8=A — F1)
- Owner Portal F1 auth path decision (constraint documented in Plan 7 ARCHITECTURE.md; F1 picks one path)

## Critical reference files

- **`.planning/MASTER-PLAN.md`** — D-039 last; 1.5c adds D-040..D-060 atomically per D-16 (Plan 7 work; iter-2 mechanical #7 atomic commit + #8 idempotency guard)
- **`.planning/architecture/CP1-RESOLUTIONS.md`** — predecessor architectural decisions
- **`CLAUDE.md` (root)** — Bills/Pay Apps update + schema-aware audit-log language per iter-2 must-fix CRITICAL #5
- **`.planning/design/SYSTEM.md / COMPONENTS.md / PATTERNS.md / PHILOSOPHY.md / CHOSEN-DIRECTION.md / PROPAGATION-RULES.md`** — design system locked at CP2; PHILOSOPHY + PATTERNS + COMPONENTS get atomic updates per iter-2
- **`.planning/phases/stage-1.5b-prototype-gallery/CONTEXT.md` + `findings.md` + 6 PLAN files** — predecessor (PART 8 LOCKED — do NOT modify)
- **`src/app/design-system/prototypes/*` (11 components)** — extraction source per D-03
- **`src/components/job-tabs.tsx`** — existing 9-page consumer; iter-2 must-fix #2 explicit removal in Plan 3 Task 4
- **`src/middleware.ts`** — Plan 1 BILLING_ESCAPE_PATHS update (mechanical #4) + Plan 6 regex extension (must-fix CRITICAL #4 Option A LOCKED)

## Plan-review iter-2 reviewer slate (next step)

Per nwrp44 + nwrp45: architect, planner, enterprise-readiness, multi-tenant-architect, scalability, compliance, security, design-pushback. iter-2 expected verdict: APPROVE / WARNING (no CRITICAL findings remaining; iter-2 amendments address all 13 iter-1 CRITICAL items).

If iter-2 returns REVISE-PLAN: surface to Jake; he decides whether to revise EXPANDED-SCOPE (re-architect), accept partial revision and override specific findings, or hold the phase.

If iter-2 returns APPROVE/WARNING: `/nx stage-1.5c-information-architecture` (preflight + execute + qa) per Jake decision.
</content>
</invoke>
