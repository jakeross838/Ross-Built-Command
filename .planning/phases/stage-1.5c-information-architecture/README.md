# Stage 1.5c — Information Architecture

**Status:** PLANS DRAFTED — pending plan-review iter-1 + Jake review
**Branch (at execute time):** `phase/1.5-c-ia-restructure` (cut by `/gsd-execute-phase`)
**Predecessor:** stage-1.5b-prototype-gallery (locked at commit `dd3baff`; prototypes shipped, awaiting `/gsd-ship` after 1.5c lands)
**Successor:** F1 (Knowledge Graph Schema + Auth Foundation)

---

## What this phase does

Per Jake nwrp43 (MAJOR ARCHITECTURE CONTEXT RESET) + nwrp44 (3 amendments + chain authorization):

Stage 1.5c is a 5-7 day IA mini-phase that lands BEFORE `/gsd-ship` of stage-1.5b-prototype-gallery. It implements the SHAPE of the new architecture before any deep implementation. Anything requiring real backend logic = placeholder. Production routes mount existing 1.5b prototype components via prop-drilled thin wrappers (T10c-clean separation per D-03). Canonical documentation locks the 8 architectural principles as the reference for F1-F6 phases.

**8-section top nav:** `Today | Pipeline | Jobs | Financials | Price Intel | People | Company | Reports` + Admin ▾ + Platform Admin badge + Notifications bell + User menu.

**Bills/Pay Apps full terminology rename:** Invoices → Bills + Draws → Pay Apps everywhere (50-80 label sites + 32 path 301-redirects + audit-log action strings + fixture string content + component names).

**60-90 placeholder routes:** every section + per-job tab covered with Wave-badged stubs.

**11 production routes:** mounting refactored prototype components with Caldwell fixture data (real-backend wiring deferred to F1).

**4 NEW canonical docs:** ARCHITECTURE / ENTITY-INVENTORY / ROLES-CATALOG / INGESTION-ARCHITECTURE.

**5 EXISTING docs updated:** CONTEXT / MASTER-PLAN / CLAUDE / PHILOSOPHY / PATTERNS.

---

## Read first (in order)

1. **`.planning/expansions/stage-1.5c-information-architecture-EXPANDED-SCOPE.md`** — APPROVED 2026-05-05 with 3 nwrp44 amendments. Source of truth for the 12 numbered scope items in §7 and the risks/assumptions in §8.
2. **`.planning/phases/stage-1.5c-information-architecture/CONTEXT.md`** — 18 phase-local locked decisions D-01..D-18 (mapping to MASTER-PLAN D-051..D-056). Domain, decisions, canonical refs, code context, deferred items. Read in full.
3. **`.planning/phases/stage-1.5c-information-architecture/DISCUSSION-LOG.md`** — audit trail; sources for each decision.
4. **`.planning/expansions/stage-1.5c-information-architecture-SETUP-COMPLETE.md`** — 0 AUTO + 0 MANUAL + 9 VALIDATE all PASS. No new infrastructure required.
5. **`.planning/phases/stage-1.5c-information-architecture/PATTERNS.md`** — pattern map for the ~95 files this phase creates/modifies. Maps each new file to its closest existing analog.

---

## 7 plans organized in 4 waves

### Wave 1 — Top nav restructure + Today scaffold + redirects map (~1.5 days, foundation)

**Plan 1 — Top nav 8-section restructure + Today scaffold + 32-path redirects map**
- File: `01.5c-1-nav-today-redirects-PLAN.md`
- depends_on: `[]`
- autonomous: false (halt_after: true — Jake reviews integration checkpoint after Wave 1)
- 3 tasks: (a) 8-section nav-bar.tsx refactor + 8-item ACCESS map data-driven for F2 + Platform Admin badge component; (b) Today screen at `/today` + Cash Flow + Getting Started moved to `/company/overview` + `/` redirects to `/today` + existing `/dashboard` 301-redirect to `/today`; (c) 32-path redirect map appended to next.config.mjs redirects().

### Wave 2 — Thin-wrapper extraction + production routes + structural TD fixes (~2-3 days, architect-then-implementers)

**Plan 2 — Thin-wrapper extraction architect (single architect, halt_after for Jake review)**
- File: `01.5c-2-thin-wrapper-architect-PLAN.md`
- depends_on: `[1]`
- autonomous: false (halt_after: true — surfaces audit-log action-string strategy + T10c hook semantics decision to Jake before parallel implementers run)
- 2 tasks: (a) Define InvoiceReviewView shape (the exemplar) + decide audit-log action string strategy + verify T10c hook posture; (b) Refactor InvoiceReviewView component to props-only as the canonical thin-wrapper precedent.

**Plan 3 — Thin-wrapper implementers + production routes + structural TD fixes + side-by-side visual verify (parallel implementers)**
- File: `01.5c-3-extraction-production-routes-PLAN.md`
- depends_on: `[2]`
- autonomous: false (halt_after: true — D-07 visual verification is a CRITICAL halt criterion)
- 4 tasks: (a) Extract remaining 10 prototype components to props-only Views + apply TD-20/25/26 structural fixes; (b) Mount 11 production routes as thin wrappers in `/financials/bills`, `/financials/pay-apps`, `/jobs/[id]/budget`, `/jobs/[id]/schedule`, `/people/vendors`, `/owner-portal`, etc.; (c) Rewrite the 11 `/design-system/prototypes/*` pages as thin wrappers (KEEP route accessible under platform_admin gate per Part 7 B); (d) Side-by-side visual verification all 11 production-vs-prototype route pairs (D-07 CRITICAL halt criterion).

### Wave 3 — Section placeholders + Sub Portal + Per-job sub-nav + Admin restructure (~1.5 days, parallel-safe)

**Plan 4 — Section overview routes + Sub Portal 3 stubs + Owner Portal mount**
- File: `01.5c-4-section-placeholders-sub-portal-PLAN.md`
- depends_on: `[1, 3]`
- autonomous: true
- 3 tasks: (a) PlaceholderCard component + Pipeline/People/Company/Reports section overviews + their sub-routes (~30 placeholder pages); (b) Price Intel section restructure (rename `/cost-intelligence/*` to `/price-intel/*` with placeholders for Wave 4/F5 entries); (c) Sub Portal 3 stubs at `/sub-portal`, `/sub-portal/magic/[token]`, `/sub-portal/public/[token]` + Owner Portal section overview placeholder.

**Plan 5 — Per-job sub-nav scaffold + per-job tab placeholders**
- File: `01.5c-5-per-job-tabs-PLAN.md`
- depends_on: `[1, 3]`
- autonomous: true
- 3 tasks: (a) PerJobTabs component (primary tabs + More ▾ dropdown skeleton, hardcoded phase: "active"); (b) Per-job placeholder routes for ~20 More-dropdown items (Documentation, Coordination, Tasks, Time, Permits, People, Activity, Closeout, Warranty, Pre-Con); (c) `src/app/jobs/[id]/layout.tsx` mount wiring + Bills/Pay Apps sub-tabs.

**Plan 6 — Admin section restructure + Platform Admin placeholder**
- File: `01.5c-6-admin-platform-admin-PLAN.md`
- depends_on: `[1, 3]`
- autonomous: true
- 2 tasks: (a) `/admin/*` 13 placeholders + rename existing `/settings/*` redirects (Plan 1 did the redirect; Plan 6 wires the destinations); (b) `/platform-admin/*` placeholder + redirect from existing `/admin/platform`.

### Wave 4 — Documentation atomic update + final smoke (~1 day)

**Plan 7 — 4 NEW canonical docs + 5 UPDATED docs + integration smoke + M3 phone walk gate setup**
- File: `01.5c-7-canonical-docs-smoke-PLAN.md`
- depends_on: `[3, 4, 5, 6]`
- autonomous: false (halt_after: true — final integration checkpoint, M3 phone walk readiness gate)
- 3 tasks: (a) Create 4 NEW canonical docs at `.planning/architecture/`; (b) Update 5 EXISTING docs atomically (CONTEXT, MASTER-PLAN, CLAUDE, PHILOSOPHY, PATTERNS); (c) Final integration smoke + M3 phone walk readiness gate setup.

---

## Standing rules during execution (per nwrp44)

- **Parallel execution by work type:**
  - Independent work (placeholder routes, documentation files, isolated extracted components) → parallel batches of 6-8 agents per wave
  - Coupled work (thin-wrapper extraction architecture, audit-log string strategy, redirect map) → single architect first, then parallel implementers
  - Architecture decisions → surface to Jake, do NOT auto-decide
- **Integration checkpoints every 2-3 days, not at end of phase**
- **Real-data smoke tests catch what plan-review misses**
- **Visual walk of extracted routes before declaring extraction complete** (per D-07 — divergence = CRITICAL halt)
- **Build + typecheck + hooks must remain clean throughout** (no "fix later" — incremental green)
- **Privacy gate (32-token denylist) clean across all new files**

## Halt-after gates encoded

1. **Plan 1 halt** — after Wave 1 lands. Jake walks new top nav + Today scaffold on desktop + iPhone Safari (briefly). Confirms 8-section nav structure renders + redirects work + Today screen feels different from generic dashboard.
2. **Plan 2 halt** — after thin-wrapper architect decides audit-log action string strategy + T10c hook posture. Jake confirms approach before Plan 3 spawns 4-6 parallel implementers.
3. **Plan 3 halt** — after D-07 side-by-side visual verification of all 11 production-vs-prototype route pairs. ANY divergence is CRITICAL — investigate before proceeding to Wave 3.
4. **Plan 7 halt** — final integration checkpoint. Build + typecheck clean; all hooks silent; privacy gate clean; M3 phone walk gate ready.

## Out of scope (deferred per CONTEXT)

- F1+ schema migrations (knowledge graph entity model)
- F2+ role expansion (4-role to 15-role) and permission matrix wiring
- F3+ magic link infrastructure + multi-modal ingestion routing
- F4+ time tracking + equipment + expenses
- F5+ Price Intel cross-pollination engine
- F6+ Pay Apps assembled-from-data engine
- Wave 2+ entity creation (Schedule backend, Daily Logs, Punchlist, RFIs, Submittals, Photos, Documents)
- Wave 1.1 polish backlog beyond TD-20/25/26 (per D-06 / Q10=B-modified): TD-21, TD-22, TD-23, TD-24, TD-27, TD-28
- Real-backend wiring for production routes (per Q8=A — F1)

## Critical reference files

- **`.planning/MASTER-PLAN.md`** — D-039 last; 1.5c adds D-040..D-056 atomically per D-16 (Plan 7 work)
- **`.planning/architecture/CP1-RESOLUTIONS.md`** — predecessor architectural decisions (CP1-CP2)
- **`CLAUDE.md` (root)** — Architecture Rules + Tech Stack + Phase Roadmap + Standing Rules; Bills/Pay Apps update lands here per D-16
- **`.planning/design/SYSTEM.md / COMPONENTS.md / PATTERNS.md / PHILOSOPHY.md / CHOSEN-DIRECTION.md / PROPAGATION-RULES.md`** — design system locked at CP2; PHILOSOPHY + PATTERNS get atomic updates per D-16
- **`.planning/phases/stage-1.5b-prototype-gallery/CONTEXT.md` + `findings.md` + 6 PLAN files** — predecessor (PART 8 LOCKED — do NOT modify)
- **`src/app/design-system/prototypes/*` (11 components)** — extraction source per D-03

## Plan-review iter-1 reviewer slate (next step after this plan-phase)

Per nwrp44: architect, planner, enterprise-readiness, multi-tenant-architect, scalability, compliance, security, design-pushback. Critical findings block execute. Halt for Jake review of plan-review iter-1 results.
