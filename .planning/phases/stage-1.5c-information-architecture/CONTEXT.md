# Phase stage-1.5c-information-architecture — Context

**Gathered:** 2026-05-05 (assumptions mode, source-of-truth = EXPANDED-SCOPE.md APPROVED 2026-05-05 + Jake nwrp44 amendments)
**Status:** Ready for planning

<domain>
## Phase Boundary

Per Jake nwrp43 (MAJOR ARCHITECTURE CONTEXT RESET) + nwrp44 (3 amendments + chain authorization):

Stage 1.5c is a 5-7 day IA mini-phase that lands BEFORE `/gsd-ship` of stage-1.5b-prototype-gallery. It implements the new top nav structure + section placeholders + canonical architecture documentation as the production app's main nav structure (the 1.5b prototypes wire to it via thin-wrapper extraction per D-053).

**Goal:** Implement the SHAPE of the new architecture before any deep implementation. Anything requiring real backend logic = placeholder. Production routes mount existing 1.5b prototype components via prop-drilled thin wrappers (T10c-clean separation). Canonical documentation locks 8 architectural principles as the reference for F1-F6 phases.

**Out of scope:**
- F1+ schema migrations (knowledge graph entity model)
- F2+ role expansion (4-role to 15-role) and permission matrix wiring
- F3+ magic link infrastructure + multi-modal ingestion routing
- F4+ time tracking + equipment + expenses
- F5+ Price Intel cross-pollination engine
- F6+ Pay Apps assembled-from-data engine
- Wave 2+ entity creation (Schedule backend, Daily Logs, Punchlist, RFIs, Submittals, Photos, Documents)
- Wave 1.1 polish backlog beyond TD-20/25/26 (per D-056 / Q10=B-modified)
- Real-backend wiring for production routes (per Q8=A — F1)
</domain>

<decisions>
## Implementation Decisions

### Phase-level locked decisions (inheriting from EXPANDED-SCOPE.md + Jake nwrp44)

The following decisions are LOCKED entering planning. The planner inherits them and does NOT re-litigate. Phase-local IDs D-01..D-30 below; corresponding MASTER-PLAN.md global IDs D-051..D-056 noted.

#### Architecture (locked per nwrp43 8 principles + nwrp44 amendments)

- **D-01 (= MASTER-PLAN D-051):** Full Bills/Pay Apps terminology rename in 1.5c (Q1=A). Production routes become `/financials/bills` + `/financials/pay-apps`. Legacy `/invoices` + `/draws` 301-redirect via `next.config.mjs` redirects rule. ALL UI labels, fixture string content (in committed sanitized fixtures), component names, audit-log action strings converge. ~50-80 sites of label change. Half-rename creates worse drift than no rename.

- **D-02 (= MASTER-PLAN D-052):** Sub Portal stub structure = 3 distinct routes (Q3=B): `/sub-portal` (auth), `/sub-portal/magic/[token]` (magic link), `/sub-portal/public/[token]` (public link). Each describes its specific F3 future-state. Stubbing 3 routes now means F3 doesn't refactor URL paths. Magic-link URL pattern is a customer-facing email artifact — naming it now prevents email-content rewrites later.

- **D-03 (= MASTER-PLAN D-053):** Thin-wrapper extraction (Q4=A) — refactor 11 prototype components to accept fixture data as props. Production routes (`/financials/bills/[id]` etc.) and `/design-system/prototypes/*` paths both re-import the same component file with different props (production = real data when F1 lands; prototype = Caldwell fixture). T10c hook BLOCKS production routes from importing fixtures directly — prop-drilled refactor is REQUIRED. 11 prototypes affected: invoices/[id], draws/[id], draws/[id]/print, jobs/[id]/budget, jobs/[id]/schedule, vendors, vendors/[id], documents/[id], owner-portal, owner-portal/draws/[id], mobile-approval, reconciliation.

- **D-04 (= MASTER-PLAN D-054):** Mobile chrome priority = hamburger expands all 8 nav items + Admin section + User menu (Q5=A). Notifications bell + Platform Admin badge stay top-right pinned. Existing `nav-bar.tsx` ACCESS map at lines 57-63 expands from 4-item to 8-item structure; rebuild data-driven so F2 swap to 15 roles is mechanical.

- **D-05 (= MASTER-PLAN D-055):** Today screen Wave-zero layout (Q6=C): Move Cash Flow + Getting Started cards from current `/dashboard` to new `/company/overview` route. Today screen at `/today` shows: "Your Day" placeholder ("Coming F3 — personalized daily plan") + Action Items (org-wide queues from existing `/api/dashboard`) + Activity Feed. `/` redirects to `/today` (Q7=A). Existing `/dashboard` route 301-redirects to `/today`.

- **D-06 (= MASTER-PLAN D-056):** Per nwrp44 Amendment 1 — Q10=B-modified: fix only structural TDs in 1.5c during D-053 thin-wrapper extraction:
  - **TD-20** NwButton primitive bypass (FIX)
  - **TD-25** Card padding="lg" Site Office Forbidden (FIX)
  - **TD-26** fontWeight: 600 SYSTEM.md §4d violation (FIX)
  
  DEFERRED to Wave 1.1-Lite (cosmetic / missing-audit-trail items that benefit from real backend during that phase anyway):
  - TD-21 (rgba inline mobile-approval)
  - TD-22 (Money component G703)
  - TD-23 (missing audit timelines vendor + contract + plan)
  - TD-24 (missing audit timeline owner-portal/draws)
  - TD-27 (h1 missing nw-direction-headline class)
  - TD-28 (vendors list aria-current)
  
  Shrinks 1.5c bundled scope by ~50% while keeping architectural coherence (the structural fixes are the ones that block lifting).

#### Visual verification (per nwrp44 Amendment 2)

- **D-07:** After D-053 thin-wrapper extraction completes, run side-by-side visual verification: production route at `/financials/bills/[id]` MUST render identically to `/design-system/prototypes/invoices/[id]` (same for all 11 extracted route pairs). Method: screenshot or DOM-diff at minimum, manual visual walk preferred. **Treat divergence as a CRITICAL finding, not polish.** Halt extraction and investigate before proceeding to other items.

#### Auth + permissions

- **D-08:** Owner Portal at `/owner-portal/*` uses same Supabase auth + role gate `owner_view` (Q2=A). Existing `client_portal_access` table provides token-based invite. Defer auth-isolation (separate domain or subdomain) to Wave 3 owner portal full phase. Unifies role-aware nav model — owner_view sees a different filter, not a different app.

- **D-09:** Platform Admin badge top-right for Jake/Andrew uses existing `platform_admins` query at nav-bar.tsx:170-176. Click → `/platform-admin/*` placeholder (Part 7 G). No middleware change needed — existing posture preserved.

- **D-10:** Today screen role-aware logic = SKELETON only (Q12=A). 1.5c stops at the placeholder. F2 wires actual role-personalization. Profile-based feature flags (Principle 8) = placeholder at `/admin/profile` showing stubbed selector ("Custom Builder / Remodeler / Commercial GC — coming F2"). No actual filtering happens; nav structure same for all profiles in 1.5c.

#### IA structure

- **D-11:** 8-section top nav: `Today | Pipeline | Jobs | Financials | Price Intel | People | Company | Reports`. Plus Admin ▾ dropdown + Platform Admin badge + Notifications bell + User menu. Replace existing 5-section structure (`Dashboard | Financial | Operations | Cost Intelligence | Admin`).

- **D-12:** Per-job sub-nav primary tabs = `Overview | Schedule | Budget | Selections | Bills | Pay Apps | More ▾`. More dropdown items: Documentation (Plans/Specs/Photos/Documents), Coordination (RFIs/Submittals/Change Orders/Daily Logs), Tasks (To-Dos/Punchlist), Time (Time Entries), Permits, People (Team), Activity (Activity Feed), Closeout (Final Lien Releases/Substantial Completion — phase-aware), Warranty (Warranty Claims — phase-aware post-CO), Pre-Con (Estimates/Proposals/Contracts — phase-aware hidden post-contract). Phase-aware visibility logic deferred to F2 (1.5c has skeleton only).

- **D-13:** Multi-modal ingestion in 1.5c = full per-job tab placeholders for all More-dropdown items (Q11=C). Each placeholder ~30 LOC describes future ingestion patterns ("Coming F3 — voice/video punchlist with AI extraction"). Provides full IA picture without doing F3 work.

- **D-14:** Routes-NOT-placeholders list = no real-backend wiring promotion in 1.5c (Q8=A). All 11 lifted prototype routes stay 1.5b-component-mounted with Caldwell fixture data. F1 wires real backend.

#### Documentation atomic update

- **D-15:** 4 NEW canonical docs land at `.planning/architecture/`:
  - `ARCHITECTURE.md` — 8 principles + data graph model overview + section purposes + revised phase plan
  - `ENTITY-INVENTORY.md` — 31+ entities catalog with brief descriptions
  - `ROLES-CATALOG.md` — 15+ default roles with permission scopes
  - `INGESTION-ARCHITECTURE.md` — multi-modal ingestion patterns + AI extraction patterns

- **D-16:** 5 EXISTING docs updated:
  - `CONTEXT.md` (project-level, NOT this file) — 8 principles canonical, role-aware as architectural requirement, knowledge graph as F1 deliverable
  - `MASTER-PLAN.md` — D-040 through D-055 added (D-056 already locked here per nwrp44); CURRENT POSITION updated; rewrite NEXT PLANNED WORK with revised roadmap (Stage 1.5c → F1 → F2 → ... → Wave 1.1-Lite)
  - `CLAUDE.md` — Bills/Pay Apps terminology in "Data Model" + invoice → bill / draw → pay-app references
  - `.planning/design/PHILOSOPHY.md` — Today as home pattern, role-aware filtering pattern, multi-modal ingestion pattern
  - `.planning/design/PATTERNS.md` — placeholder treatment patterns, role-filtered nav patterns, phase-aware sub-nav patterns

#### Phase walks

- **D-17:** M3 phone walk = single walk bundled with 1.5b ship gate (Q13=A). Same iPhone+Safari device per CONTEXT D-31 from 1.5b. Jake walks 1.5b prototypes AND 1.5c production routes (same components, different paths) in one phone session. Walk happens once after 1.5c executes; 1.5b ships afterward with new IA in place.

#### Wave 1.1 splitting

- **D-18:** Wave 1.1 splits per Q14=A: existing Wave 1.1 polish backlog (TD-20..TD-35 minus the 3 fixed in D-06) → Wave 1.1-Lite scope. Polish bundles with Ross-Built-going-live; Wave 1.1-Full = future-tenant onboarding hardening, not RB polish.

### Standing rules during execution (per nwrp44)

- **Parallel execution by work type:**
  - Independent work (placeholder routes, documentation files, isolated extracted components) → parallel batches of 6-8 agents per wave
  - Coupled work (thin-wrapper extraction architecture, audit-log string strategy, redirect map) → single architect first, then parallel implementers
  - Architecture decisions → surface to Jake, do NOT auto-decide
- **Integration checkpoints every 2-3 days, not at end of phase**
- **Real-data smoke tests catch what plan-review misses**
- **Visual walk of extracted routes before declaring extraction complete** (per D-07)
- **Build + typecheck + hooks must remain clean throughout** (incremental green; no "fix later")
- **Privacy gate (32-token denylist) clean across all new files**

### Folded Todos

None — `gsd-sdk query todo.match-phase 1.5c` was not run because GSD framework doesn't yet recognize phase 1.5c (added per nwrp43 architecture reset, ROADMAP.md update is part of this phase's deliverable D-16).

### Claude's Discretion

Tactical sub-decisions during implementation (Claude decides during execute, applying Site Office tokens consistently):

- Exact wave decomposition (Wave 1: top nav restructure + Today scaffold + per-job sub-nav; Wave 2: thin-wrapper extraction + structural TD fixes + side-by-side verify; Wave 3: 60-90 placeholder routes + Admin section + Sub Portal; Wave 4: documentation atomic update + redirects + smoke tests). Plan-phase will lock the wave decomposition.
- Specific URL slug choices for placeholder routes (e.g., `/financials/aging` vs `/financials/aging-ar-ap`)
- Sub Portal stub copy text (within "Coming F3 — Subcontractor self-service portal with magic link access" pattern)
- Per-job placeholder description copy (within "Coming [Wave/F-N]" pattern)
- TanStack Table v8 reuse vs new pattern for any DataGrid surfaces in the IA scaffold
- Halt only if a tactical choice would force a SYSTEM.md / COMPONENTS.md / PATTERNS.md update.

### Phase-local decisions added per Jake nwrp45 (post-iter-1 plan-review)

After /nightwork-plan-review iter-1 returned REVISE-PLAN with 13 CRITICAL findings (REVISE-PLAN report at `.planning/plan-reviews/stage-1.5c-information-architecture-plan-review.md`), Jake nwrp45 resolved 4 architectural decisions:

- **D-19 (= MASTER-PLAN D-057):** Site Office direction scope — Plan 3 thin-wrapper extraction wraps each production route's outer container in `.design-system-scope` (Decision A from plan-review). Extends scope's meaning from "playground-only" to "Site Office consumer." Preserves D-07 by construction. Not "promote to globals.css" (which would be SYSTEM.md-level change requiring `/nightwork-propagate`). Not "redefine D-07."

- **D-20 (= MASTER-PLAN D-058):** Full `/admin/platform` → `/platform-admin` migration in 1.5c (Decision B-modified from plan-review). Wildcard redirect `/admin/platform/:path* → /platform-admin/:path*` AND mount existing 13 sub-route layouts at the new path. Sub-routes are real, working, migrated. `/platform-admin` index page itself stays as placeholder showing directory of available tools. NOT deferred to Wave 1.1-Lite. Scope addition: ~1d for migration, accepted as worth the URL hygiene.

- **D-21 (= MASTER-PLAN D-059):** PerJobTabs collapses to dropdown <768px (Decision C from plan-review). Matches existing nav-bar mobile hamburger pattern. Plan 5 PerJobTabs renders 6 primary tabs + More dropdown on ≥768px; collapses to a single dropdown showing all tabs on <768px.

- **D-22 (= MASTER-PLAN D-060):** Admin dropdown vs Admin section overview both exist with clear precedence (Decision D from plan-review). Admin dropdown is power-user shortcut (top-nav direct access to settings sub-items); `/admin` section overview Card grid is canonical destination (clicking "Admin" in main nav lands here). Plans document precedence in CLAUDE.md atomic update.

### iter-2 watchpoints (per Jake nwrp45)

These are explicit verifications in the iter-2 plans:

1. **Visual diff verify Decision A (D-19)** — Plan 3 explicitly screenshots production route before/after `.design-system-scope` wrap; expect 1px slate-tile left-stamp + JetBrains Mono eyebrow + Space Grotesk headline to appear post-wrap.
2. **Sub-route functionality verify Decision B (D-20)** — Plan 6 explicitly smokes /platform-admin/audit, /organizations, /users, /feedback, /support, /items, /cost-intelligence; each must render existing layout + functionality.
3. **Auth bypass test for /platform-admin middleware (D-09 + 5th must-fix)** — Plan 6 includes test: PM (non-platform-admin) navigating to /platform-admin/audit MUST redirect (NOT successful render).
4. **Audit-log live smoke test (5th must-fix)** — Plan 2 (or Plan 7) triggers audit-log write at /api/draws/[id]/action/route.ts:243 (or equivalent); confirms entity_type + action columns populated separately.

### NOT decisions (planner must surface for Jake)

- Wave decomposition recommendation if it diverges from the natural Wave 1/2/3/4 above (planner's `/gsd-plan-checker` may have suggestions)
- Specific 32-path redirect map (planner derives from D-01 + Part 3 audit + existing routes)
- Audit-log action-string strategy (R2 risk in EXPANDED-SCOPE — historical action strings preserved as-is, new writes use new strings; document rationale in D-06 follow-up)
- Plan-review iter-1 verdict + any reviewer-flagged items (HALT after plan-review per nwrp44)
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents (gsd-planner, gsd-plan-checker, plan-review reviewers) MUST read these before planning:**

### Stage 1.5c-specific
- `.planning/expansions/stage-1.5c-information-architecture-EXPANDED-SCOPE.md` — APPROVED 2026-05-05 with 3 amendments (nwrp44). Source of truth for D-01..D-18 above.
- `.planning/expansions/stage-1.5c-information-architecture-SETUP-COMPLETE.md` — 0 AUTO + 0 MANUAL + 9 VALIDATE infrastructure check (passed 2026-05-05).
- `.planning/expansions/stage-1.5c-information-architecture-AUTO-LOG.md` — Setup audit trail.

### Architecture / strategy
- `.planning/MASTER-PLAN.md` — 32 prior decisions (D-01..D-039 incl D-040..D-050 to be added in 1.5c per Q9=A). MUST be updated atomically per D-16.
- `.planning/architecture/CP1-RESOLUTIONS.md` — D-029 (substitution-map workflow), D-036 (reconciliation strawman as 1.5b deliverable).
- `.planning/architecture/CURRENT-STATE.md`, `TARGET.md`, `GAP.md`, `VISION.md` — strategic context.
- `CLAUDE.md` (root) — Architecture Rules + Tech Stack + Phase Roadmap + Standing Rules. MUST be updated atomically per D-16.

### Stage 1.5b artifacts (predecessor — locked, do NOT modify per Part 8)
- `.planning/phases/stage-1.5b-prototype-gallery/CONTEXT.md` — 32 D-01..D-32 phase-local decisions, including privacy posture.
- `.planning/phases/stage-1.5b-prototype-gallery/findings.md` — Wave 2 deliverable; aggregates 11/11 acceptance + 3 synthesized records + 22+ Wave 1.1 polish items + RESOLVED TD-29/30/31.
- `.planning/phases/stage-1.5b-prototype-gallery/01.5-{1,2,3,4,5,6}-*-PLAN.md` — 6 plans Wave 0 → Wave 2 (history reference).
- `.planning/phases/stage-1.5b-prototype-gallery/SECURITY.md` — security-reviewer artifact from /nightwork-qa 2026-05-05-1052.
- `src/app/design-system/prototypes/*` — 11 prototype routes (extraction source per D-03).
- `src/app/design-system/_fixtures/drummond/*` — 12 sanitized Caldwell fixture files (Part 8 LOCKED — DO NOT modify).

### Design system (locked at CP2 per D-037)
- `.planning/design/SYSTEM.md` — Site Office direction tokens, density modes, motion contracts, accessibility WCAG 2.2 AA, touch targets 44px / 56px, brand customization. §13 Forbidden thresholds enforce TD-25 (Card padding="lg") + TD-26 (fontWeight 600).
- `.planning/design/COMPONENTS.md` — primitive contract (Card, Eyebrow, Badge, Money, DataRow, NwButton, etc.). NwButton enforces TD-20 fix.
- `.planning/design/PATTERNS.md` — page pattern catalogue. MUST be updated per D-16 (placeholder treatment, role-filtered nav, phase-aware sub-nav patterns).
- `.planning/design/PHILOSOPHY.md` — direction lock at Site Office. MUST be updated per D-16 (Today as home, role-aware filtering, multi-modal ingestion patterns).
- `.planning/design/CHOSEN-DIRECTION.md` — Site Office locked at CP2 2026-04-30 (D-037).
- `.planning/design/PROPAGATION-RULES.md` — workflow doc for design-system changes.
- `.impeccable.md` (root) — quality contract anchor.

### Privacy posture (4-tier defense-in-depth)
- `.gitignore` (line 98 = `/.planning/*` rule + line 120 whitelist for `phases/**`)
- `.githooks/pre-commit` — Tier 1.5 grep gate
- `.claude/hooks/nightwork-pre-commit.sh` — Tier 2 + QA-staleness
- `.claude/hooks/nightwork-post-edit.sh` — T10c sample-data isolation + Forbidden hex/tokens (gating for D-03 thin-wrapper extraction)
- `.github/workflows/drummond-grep-check.yml` — Tier 3 CI gate
- `scripts/sanitize-drummond.ts` — extractor-side substringCollisionCheck + grepGate + piiCheck + fkValidation (Tier 1; Wave 0 deliverable, locked, do NOT modify per Part 8)
- `scripts/drummond-invoice-fields.json` (gitignored) — hand-curated invoice JSON

### MASTER-PLAN.md DECISIONS LOG (must add in 1.5c per Q9=A + D-16)
- D-040: Top nav 8-section structure locked
- D-041: Today as personal home (replaces Dashboard for role-aware experience)
- D-042: Knowledge graph as F1+ data model
- D-043: Roles + permissions in F2
- D-044: Magic link external access in F3
- D-045: Aggressive multi-modal ingestion architecture (Principle 5)
- D-046: Price Intel as both layer + destination (Principle 3)
- D-047: Profile-based feature flags
- D-048: Phase-aware per-job nav
- D-049: Wave 1.1 split into 1.1-Lite (RB usable) and Wave 1.1-Full (later)
- D-050: F1-F6 expanded scope vs original F1-F4
- D-051..D-056: 1.5c outcomes per nwrp44 (already in EXPANDED-SCOPE)
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`src/app/design-system/prototypes/*`** — 11 prototype routes (Wave 0 + 1 + 2 of 1.5b). 1.5c extracts these into thin wrappers per D-03. Existing components are correctly structured (Document Review pattern, Pattern3Dashboard, Pattern6ListDetail, Pattern4MobileApproval, Print View, Reconciliation Strawman) — only refactor needed is fixture import → prop drill.
- **`src/components/nav/nav-bar.tsx`** — existing 4-item nav with ACCESS map at lines 57-63 + NwWordmark + NwIcon + collapse-at-360px logic + NotificationBell + FeedbackTrigger + role badge + theme + sign-out. New 8-item nav extends this without rewriting.
- **`src/components/nw/Card.tsx`, `Eyebrow.tsx`, `Badge.tsx`, `Money.tsx`, `DataRow.tsx`, `Button.tsx`** — Site Office-locked primitives. NwButton (per TD-20 fix) is the destination for 6+ raw `<button>` replacements.
- **`src/middleware.ts`** — existing `isPlatformAdmin` posture at lines 34/72/83/101/121 supports D-09 Platform Admin badge.
- **`src/app/api/dashboard/route.ts`** — existing org-wide aggregation. D-05 Today screen reuses for Action Items.
- **`src/app/dashboard/page.tsx`** — existing dashboard. Cash Flow + Getting Started components extract to `/company/overview` per D-05.
- **`src/hooks/use-current-role.ts`** — existing role hook. Wraps to data-driven ACCESS for F2 expansion (per D-04).
- **`next.config.mjs`** — existing async `redirects()` function at line 14. New 32 legacy-path 301-redirects extend.
- **`.githooks/pre-commit` + `.claude/hooks/*` + `.github/workflows/drummond-grep-check.yml`** — 4-tier privacy gate active. New routes inherit.

### Established Patterns

- **Tenant-blind primitives boundary** (CLAUDE.md + COMPONENTS.md): `src/components/ui/` accepts no `org_id` / `membership` / `vendor_id` props. New nav components must follow.
- **Hook T10c sample-data isolation** (`.claude/hooks/nightwork-post-edit.sh:194-230`): forbids imports from `@/lib/(supabase|org|auth)` in `src/app/design-system/*`. Production routes (outside `/design-system/`) CAN import from these — but if production routes re-import prototype components that import fixtures, T10c blocks. Hence D-03 thin-wrapper extraction.
- **Site Office direction signature** (PHILOSOPHY.md + SYSTEM.md): UPPERCASE eyebrows + JetBrains Mono 0.18em tracking + 1px slate-tile left-stamp on cards + Space Grotesk Medium headlines + 16px card padding + 150ms ease-out motion. New nav and placeholder routes apply.
- **Set B palette** (CHOSEN-DIRECTION.md, locked CP2 2026-04-30 per D-037): Stone Blue primary, Dark Slate text, Warm Gray secondary, White Sand background. No Set A `--nw-warm-gray` token under Set B.
- **Document Review pattern** (PATTERNS.md §2): file preview LEFT + structured fields right-rail + audit timeline at bottom. Production routes for invoices/draws/documents/owner-portal/draws extend this. (TD-23/TD-24 audit timeline gaps deferred to Wave 1.1-Lite per D-06.)
- **Recalculate-don't-increment** (CLAUDE.md + R.2): computed budget/draw fields derived on render from source rows. 1.5c does not introduce stored aggregates.
- **Soft delete + status_history JSONB** (CLAUDE.md): not relevant to 1.5c (no mutations).
- **Drummond as reference job** (CLAUDE.md + Standing Rules): Caldwell-sanitized fixtures the only data source. 1.5c does NOT add new fixture data.

### Integration Points

- **Existing `/dashboard` route** → 301-redirect to `/today` (D-05). Existing dashboard component KEEPS at `/today` until F2 personalization.
- **Existing `/invoices`, `/draws`, `/cost-intelligence/*` routes** → 32-path 301-redirect map to `/financials/bills`, `/financials/pay-apps`, `/price-intel/*`, etc. (D-01).
- **Existing `/admin/platform` route** → 301-redirect to `/platform-admin` per D-09.
- **Existing `/settings/*` routes** → 301-redirect to `/admin/*` (D-09 Admin section restructure per Part 7 F).
- **Existing 4-role ACCESS map at nav-bar.tsx:57-63** → restructure to data-driven so F2 swap to 15 roles is mechanical (D-04). 1.5c keeps the existing 4 roles but rebuilds the data shape.
- **Existing `client_portal_access` table (Wave 3 — already shipped)** → Owner Portal at `/owner-portal/*` uses for token-based invite (D-08).
- **Existing `platform_admins` table (migration 00048)** → Platform Admin badge query reuses (D-09).
- **Existing prototype components at `src/app/design-system/prototypes/*`** → 11 components extracted to `src/components/prototypes/` (or similar) per D-03 thin-wrapper refactor. Both `/design-system/prototypes/*` (Caldwell-fixture-injected) and production routes (real-data when F1 lands; Caldwell-fixture-injected for now) re-import.

### Codebase scout summary

The existing code is structurally sound for 1.5c. The largest refactor surface is D-03 thin-wrapper extraction (11 prototype components × ~half-day each = ~5 days). Items 1-5, 7-12 of EXPANDED-SCOPE §7 are mechanical / templated. The phase risk concentrates on (a) D-03 extraction completing within budget, and (b) D-07 side-by-side visual verification catching subtle divergences post-extraction.

`gsd-pattern-mapper` agent will be useful at plan-time to map 60-90 placeholder routes to closest existing analogs (e.g., placeholder treatment pattern from /design-system/prototypes/page.tsx 10-Card index + Wave badge convention).
</code_context>

<specifics>
## Specific Ideas

- D-04 mobile chrome: hamburger expands all 8 nav items + Admin + User; bell + Platform Admin badge stay top-right pinned. Reference: nav-bar.tsx existing collapse-at-360px logic.
- D-07 visual verification method: screenshot or DOM-diff at minimum, manual walk preferred. Tooling — could use Chrome MCP for screenshots, or `playwright` snapshot, or eyeball walk. Plan-phase decides.
- D-13 placeholder pattern: ~30 LOC each, eyebrow + headline + 2-3 sentence body + Wave badge ("Coming F1 / F2 / Wave 1.1-Lite / Wave 2 / Wave 3 / Wave 4"). Mirror /design-system/prototypes/page.tsx 10-Card index pattern.
- D-15 4 NEW canonical docs: ARCHITECTURE.md should follow CONTEXT.md/CP1-RESOLUTIONS.md format conventions in `.planning/architecture/`. ENTITY-INVENTORY.md is a catalog table (entity name | brief description | F-N when shipped). ROLES-CATALOG.md is similar (role name | scope | typical user). INGESTION-ARCHITECTURE.md describes patterns by modality.
</specifics>

<deferred>
## Deferred Ideas

### To Wave 1.1-Lite (per D-06 / Q10=B-modified)
- TD-21: Hardcoded `rgba(247,245,236,0.7)` in mobile-approval/page.tsx:108 (replace with `var(--nw-white-sand)` + opacity wrapper)
- TD-22: Inline cents-to-dollars formatting in draws/[id]/page.tsx G703 table (use `<Money>` component)
- TD-23: Missing audit timelines on vendors/[id] + ContractDocument + PlanDocument sub-components
- TD-24: Missing audit timeline on owner-portal/draws/[id]
- TD-27: owner-portal h1 elements missing nw-direction-headline class
- TD-28: vendors list-rail buttons missing aria-current/aria-pressed

### To F1
- Real backend wiring for production routes (Q8=A) — F1 is the knowledge graph schema phase
- Multi-tenant RLS at entity level
- Audit trails on every entity
- Magic link infrastructure (Sub Portal magic-link auth implementation)
- Email-in receiving infrastructure
- Foundation for ingestion routing
- Lien releases status_history JSONB schema (TD-1)
- Vendor verification W9 / COI / License# fields (TD-2)
- Hierarchical schedule task semantics (TD-3 — depends on Ross Built workflow validation)
- Ross Built generates data → moat starts compounding (Wave 1.1-Lite)

### To F2
- 15-role expansion (D-04 keeps the existing 4 roles in 1.5c; F2 swaps in 15)
- Phase-aware per-job sub-nav LOGIC (D-12 ships skeleton only)
- Profile-based feature flags WIRING (D-10 ships placeholder only)
- Today screen role-personalization (D-10 ships universal queues only)
- Permission matrix UI
- Org Chart visual (placeholder ships in 1.5c)

### To F3
- Approval workflow engine + Notification routing engine
- Magic link external access for Sub Portal (D-02 ships 3 stubs only)
- Sub Portal authenticated experience
- Email + transcript ingestion routing (basic — full AI in Wave 3)

### To F4
- Time tracking + Equipment + Expenses (Per-job /time tab placeholder ships in 1.5c per D-13)

### To F5
- Price Intel cross-pollination engine (Price Intel section placeholders ship in 1.5c)
- Anomaly detection / Cost lookup search / Vendor performance scoring
- Verification queue / Bid comparison engine

### To F6
- Pay Apps assembled from data (production /financials/pay-apps/[id] uses Caldwell fixture in 1.5c per D-14)
- G702/G703 production-ready printing (1.5b ships pixel-perfect cover + 80% G703 prototype)

### To Wave 2+
- Schedule (Gantt) backend + Daily Logs + Punchlist + Selections workflows
- Documents + Photos + RFIs + Submittals
- Reconciliation engine real wiring (1.5b ships strawman matrix prototype)

### To Wave 3+
- AI Report Builder (natural language → graph queries)
- Email + transcript AI routing (full implementation)
- Voice/video punchlist with AI structured extraction
- Vendor portal full experience
- Activity feed + comments

### To Wave 4
- CRM / Leads, Estimating (Price Intel powered), Proposals + e-sign, Contracts, Warranty management

### Reviewed Todos (not folded)

None — `gsd-sdk query todo.match-phase 1.5c` not run (phase not yet in ROADMAP.md; ROADMAP update is part of D-16).
</deferred>
