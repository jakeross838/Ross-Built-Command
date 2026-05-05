# Expanded scope — stage-1.5c-information-architecture

**Status:** APPROVED 2026-05-05 (with amendments — see "Approved amendments" section below)
**Generated:** 2026-05-04
**Approved:** 2026-05-05 by Jake (nwrp44)

## Approved amendments (per Jake nwrp44)

### Amendment 1 — Q10 narrowed to structural TDs only
Q10=A (fix all bundled) is REPLACED with **Q10=B-modified**: fix only **TD-20** (NwButton bypass), **TD-25** (Card padding="lg" forbidden), **TD-26** (fontWeight: 600 violation) during the Q4=A thin-wrapper extraction. These are structural debt that affects pattern compliance and component contract, so they bundle naturally with the extraction refactor.

DEFERRED to Wave 1.1-Lite (cosmetic / missing-audit-trail items that benefit from real backend during that phase anyway):
- TD-21 (rgba inline mobile-approval)
- TD-22 (Money component G703)
- TD-23 (missing audit timelines vendor + contract + plan)
- TD-24 (missing audit timeline owner-portal/draws)
- TD-27 (h1 missing nw-direction-headline class)
- TD-28 (vendors list aria-current)

This shrinks 1.5c bundled scope by ~50% while keeping architectural coherence (production routes that don't extend gold-standard patterns are still architecturally incoherent — the structural fixes Q10=B-modified preserves are the ones that block lifting).

### Amendment 2 — Item 6 acceptance criterion: side-by-side visual verification
After thin-wrapper extraction completes for the 11 lifted prototypes, run side-by-side visual verification: production route at `/financials/bills/[id]` must render identically to `/design-system/prototypes/invoices/[id]`, and same for all 11 extracted route pairs. Method: screenshot or DOM-diff at minimum, manual visual walk preferred. **Treat divergence as a CRITICAL finding, not polish.** Halt if any diverge and investigate before proceeding.

### Amendment 3 — D-051 through D-056 numbering locked
Per Jake nwrp44 explicit assignment (Q9=A baseline + Q10=B-modified produces 6th decision):
- **D-051** = Q1=A (full Bills/Pay Apps rename in 1.5c)
- **D-052** = Q3=B (3 Sub Portal stubs at `/sub-portal`, `/sub-portal/magic/[token]`, `/sub-portal/public/[token]`)
- **D-053** = Q4=A (thin-wrapper extraction — refactor 11 prototype components for prop-drilled fixture data, T10c-clean)
- **D-054** = Q5=A (mobile hamburger expands all 8 + Admin + User; bell + Platform Admin badge stay top-right)
- **D-055** = Q6=C (Cash Flow + Getting Started moved from Today screen to `/company/overview`)
- **D-056** = Q10=B-modified (fix structural TDs TD-20/25/26 only in 1.5c; defer cosmetic TD-21/22/23/24/27/28 to Wave 1.1-Lite)

All other Q1-Q15 recommendations approved as written (Q2=A, Q3=B, Q5=A, Q6=C, Q7=A, Q8=A, Q9=A, Q11=C, Q12=A, Q13=A, Q14=A, Q15 per recommendation).

## iter-2 amendments (per Jake nwrp45, 2026-05-05)

After plan-review iter-1 returned REVISE-PLAN with 13 CRITICAL findings + 6 cross-reviewer agreements, Jake nwrp45 resolved 4 architectural decisions and authorized iter-2:

### 4 architectural decisions resolved

- **Decision A — Site Office direction scope (D-057):** **A = a (wrap production routes in `.design-system-scope` class).** Minimal scope change; preserves D-07 by construction. Plan 3 thin-wrapper extraction wraps each production route's outer container in `.design-system-scope`. The scope's meaning is extended from "playground-only" to "Site Office consumer."
- **Decision B — /admin/platform 13 sub-routes migration (D-058):** **B = a-modified (full migration in 1.5c).** Wildcard redirect `/admin/platform/:path* → /platform-admin/:path*` AND mount the existing `/admin/platform` layouts + 13 sub-routes at the new `/platform-admin` path. Sub-routes are real, working, migrated — Jake and Andrew never lose access to audit / orgs / users / feedback / support / items / cost-intelligence. `/platform-admin` index page itself stays as placeholder showing directory of available tools. Migration happens in 1.5c, NOT deferred to Wave 1.1-Lite. Scope addition: ~1d for migration work, accepted as worth the URL hygiene.
- **Decision C — PerJobTabs mobile posture (D-059):** **C = b (collapse to dropdown <768px).** Matches existing nav-bar mobile hamburger pattern. Plan 5 PerJobTabs renders 6 primary tabs + More dropdown on ≥768px; collapses to a single dropdown showing all tabs on <768px.
- **Decision D — Admin dropdown vs Admin section overview (D-060):** **D = a (both exist with clear precedence).** Admin dropdown is power-user shortcut (top-nav direct access to settings sub-items); `/admin` section overview Card grid is canonical destination (clicking "Admin" in main nav lands here). Plans document the precedence in CLAUDE.md atomic update.

### 5 must-fix CRITICAL findings (iter-2 mandatory)

1. **Site Office scope leak** (XR-4 / design-pushback C-1) — RESOLVED via Decision A. Plan 3 wraps production routes in `.design-system-scope`. iter-2 watchpoint: visual diff before/after.
2. **JobTabs vs PerJobTabs double-nav collision** (architect C-1) — Plan 5 explicitly removes inline `<JobTabs>` from all 9 existing `/jobs/[id]/*` pages (page.tsx, draws/page.tsx, budget/page.tsx, invoices/page.tsx, change-orders/page.tsx, activity/page.tsx, lien-releases/page.tsx, internal-billings/page.tsx, purchase-orders/page.tsx), OR renames them to use the new layout-mounted `<PerJobTabs>`. Goal: zero double-tab-bar rendering.
3. **/admin/platform regression** (architect C-2) — RESOLVED via Decision B-modified. Plan 1 adds wildcard redirect `/admin/platform/:path* → /platform-admin/:path*`. Plan 6 mounts existing 13 sub-route layouts at `/platform-admin/{audit,organizations,users,feedback,support,items,cost-intelligence}` paths. iter-2 watchpoint: verify migrated sub-routes are functional, not just routed.
4. **/platform-admin auth gate** (XR-2 / security BLOCKING SEC-1 + compliance W-1) — Plan 6 Task 2 LOCKS Option A (middleware regex extension). `src/middleware.ts:65` updates to match `/admin/platform` AND `/platform-admin/*` with same `!isPlatformAdmin` redirect posture. iter-2 watchpoint: auth bypass test (PM/accountant authenticated session navigating to `/platform-admin/audit` MUST receive redirect).
5. **Audit-log schema rewrite** (XR-3 / enterprise-readiness C-1+C-2 + compliance C-1) — Plan 2 Step B replaces concat-action-string framing with the actual `entity_type` + `action` separate-column reality (verified via 5+ live audit-write sites: `src/lib/activity-log.ts:20-49`, `src/app/api/draws/[id]/action/route.ts:243`, `src/app/api/lien-releases/*`, `src/app/api/cron/overdue-invoices/route.ts:65`). Strategy 1' (entity_type-aware UI label mapping) becomes primary recommendation. Plan 2 (or Plan 7) ships `src/lib/audit/action-labels.ts` helper module (~30 LOC) — contract committed, even if no code calls it yet. iter-2 watchpoint: live audit-site smoke test.

### 10 mechanical fixes (iter-2 must encode)

1. **Plans 5+6 add `depends_on Plan 4 Task 1`** (PlaceholderCard) — OR PlaceholderCard creation hoists to Plan 1.
2. **PlaceholderCard rename to `NwPlaceholderCard`** + Plan 7 atomic update includes COMPONENTS.md §7 entry per PROPAGATION-RULES.md §4b workflow.
3. **Plan 1 PlatformAdminBadge hardcoded hex `#F7F5EC` fallback** — verify `--text-on-dark` and `--border-on-dark` tokens exist in `colors_and_type.css`; drop fallbacks. If tokens don't exist, propagation-rules workflow blocks 1.5c.
4. **Plan 1 `/admin/billing` redirect loop fix** — add `/admin/billing` to `BILLING_ESCAPE_PATHS` (middleware.ts:12-16) + update billing-gate redirect destination from `/settings/billing` to `/admin/billing`.
5. **Plan 4 Sub Portal token stub fixes** — (a) param-reflection grep verify (`grep -E "params\.token"` returns 0); (b) F3 compliance contract in stub copy (token expiry, scope binding, audit-log-on-use, cookie-vs-querystring posture, JWT-with-org-claim REJECTED by-construction).
6. **Plan 7 ENTITY-INVENTORY.md adds "Retention class" + "PII?" columns.** ROLES-CATALOG.md adds "Cross-org?" column. ARCHITECTURE.md adds §SOC2 control mapping section (CC6.1 / CC6.6 / CC6.7 / CC7.2 / PI1.1 / C1.1).
7. **Plan 7 atomic 9-doc commit** (instead of 4 NEW commit + 5 UPDATED commit). AC-1.5c-7-11 verifies `git log -1 --stat shows all 9 docs`.
8. **Plan 7 atomic update idempotency guard** — `grep -c 'D-040' .planning/MASTER-PLAN.md` before append; halt if >0.
9. **Plan 4 AC-1.5c-4-07 verify** — add 3 explicit grep tokens (one per Sub Portal stub).
10. **Real-logic re-mounts preserve `getCurrentMembership()` verbatim** (Plans 4 + 6). Add per-route grep diff verify: `diff <(grep -E 'getCurrentMembership|org_id|requireMembership' src/app/<source>) <(grep -E ... src/app/<destination>)` — expect zero diff.

### Owner Portal auth posture clarification (multi-tenant W-1)

CONTEXT D-08's "owner_view role gate" claim is misleading. iter-2 plans should clarify:
- 1.5c is structural — Owner Portal at `/owner-portal/*` mounts thin-wrapper components with Caldwell fixtures. No real auth flow exercised.
- F1 wires real backend. F1 must commit to either (a) extending `client_portal_access` token model (SHA-256 + service-role-API + anon-grant per migration 00074) OR (b) introducing `owner_view` member role with RLS for owner-scoped reads. NOT both.
- Plan 7 ARCHITECTURE.md (or new OWNER-PORTAL-CUTOVER.md) documents this constraint so F1 inherits it.

### iter-2 specific watchpoints

1. **Verify Decision A actually fixes Site Office propagation** — visual diff before/after extraction (production route `/financials/bills/[id]` rendered without `.design-system-scope` wrap vs with wrap; expect 1px slate-tile left-stamp + JetBrains Mono UPPERCASE eyebrow + Space Grotesk Medium headline now appear on production after wrap).
2. **Verify Decision B migrated `/admin/platform` sub-routes are functional, not just routed** — smoke test: navigate to `/platform-admin/audit`, `/platform-admin/organizations`, `/platform-admin/users`, etc.; confirm each renders the existing layout + functionality (audit log table loads, org list loads, user list loads, etc.).
3. **Verify `/platform-admin` middleware gate actually rejects non-platform-admin users** — auth bypass test: log in as a PM (non-platform-admin); navigate to `/platform-admin/audit`; confirm redirect to `/dashboard` or 404 (NOT a successful render).
4. **Verify audit-log writes use new schema correctly** — live audit site smoke test: trigger an audit-log write at one of the 5+ live sites (`/api/draws/[id]/action/route.ts:243` is the easiest); confirm `entity_type` + `action` columns are populated separately (not concatenated).

### D-057 through D-060 logged in MASTER-PLAN.md DECISIONS LOG (Plan 7 atomic update)

- D-057 = Decision A (Site Office .design-system-scope wrapping for production routes)
- D-058 = Decision B-modified (full /admin/platform → /platform-admin migration in 1.5c, including 13 sub-routes mounted)
- D-059 = Decision C (PerJobTabs collapse to dropdown <768px)
- D-060 = Decision D (Admin dropdown shortcut + /admin canonical destination, both surfaces with clear precedence)

D-051..D-056 unchanged (carried forward from nwrp44 amendments).

## Standing rules during execution (per nwrp44)

- **Parallel execution by work type:**
  - Independent work (placeholder routes, documentation files, isolated extracted components) → parallel batches of 6-8 agents per wave
  - Coupled work (thin-wrapper extraction architecture, audit-log string strategy, redirect map) → single architect first, then parallel implementers
  - Architecture decisions → surface to Jake, do not auto-decide
- **Integration checkpoints every 2-3 days, not at end of phase**
- **Real-data smoke tests catch what plan-review misses**
- **Visual walk of extracted routes before declaring extraction complete** (Amendment 2)
- **Build + typecheck + hooks must remain clean throughout** (no "fix later" — incremental green)
- **Privacy gate (32-token denylist) clean across all new files**

---


**Stated scope (Jake's words, verbatim — nwrp43):**

> MAJOR ARCHITECTURE CONTEXT RESET — read carefully before doing anything.
>
> Over a long chat session (nwrp35-50ish), Jake and I have fundamentally re-architected what Nightwork is. The plans, fixtures, and prototypes built so far are still valid as Wave 1 surfaces, but the broader product architecture has changed. Your understanding from before this conversation is incomplete. This prompt establishes the new architectural context, captures it in canonical project documents, and dispatches a properly-planned IA mini-phase (Stage 1.5c) to land before /gsd-ship of 1.5b.
>
> Jake's strategic position: Wants Ross Built actively using Nightwork (invoices, Price Intel, draws) within 8-10 weeks, but wants foundations broad enough to support the comprehensive vision so future phases don't require painful refactors. Build the architecture right, but only implement what Ross Built needs first. Everything else is structured placeholder.
>
> ═══════════════════════════════════════════════════════════
> PART 1 — CORE ARCHITECTURE PRINCIPLES (lock as canonical)
> ═══════════════════════════════════════════════════════════
>
> Nightwork is being repositioned from "construction project management tool" to "construction company operating system + cost intelligence data platform." Eight architectural principles are now canonical:
>
> PRINCIPLE 1 — Data-first foundation
> Every event in the lifecycle of a construction company is a data point. Every entity is queryable. Reports are emergent (queries against the graph), not hand-built features. The data graph is the moat — competitors who built feature-first can never catch up because they didn't capture data structurally from day one.
>
> PRINCIPLE 2 — Knowledge graph data model
> F1+ phases must build a relational entity-relationship knowledge graph, not isolated tables. Core entities: Jobs, Vendors, Clients, Employees, Products, Cost Codes, Bills (vendor invoices), Pay Apps (builder→owner), Purchase Orders, Time Entries, Equipment, Equipment Usage, Expenses, Change Orders, Lien Releases, Documents, Photos, Schedule Items, Daily Logs, RFIs, Submittals, Punchlist Items, To-Dos, Activities (event log), Permits, Insurance Policies, Tax Records, Selections, Estimates, Proposals, Contracts, Bids. Plus relationships and audit trails for every entity.
>
> PRINCIPLE 3 — Cost Intelligence is BOTH a layer AND destinations
> Price Intel surfaces inline (estimates show learned cost ranges, invoice approval flags anomalies, selections show install costs) AND is its own primary nav section with destination workflows (Material Orders, Cost Lookup, Bid Comparison, Vendor Performance). Same engine, multiple lenses. Selections Catalog is a VIEW of Price Intel filtered by product entities, not a separate database.
>
> PRINCIPLE 4 — Cross-pollination of data on every ingestion event
> When an invoice line item ingests, it enriches: Product entity (with photo/spec/cost history), Vendor performance record, Cost Code data point, Selections Catalog entry, Job budget. ONE event, MULTIPLE entities updated. This is the moat compounding.
>
> PRINCIPLE 5 — Aggressive ingestion across modalities
> Every input modality becomes structured data:
> - Text → parsed and routed
> - Voice/transcripts → transcribed, structured, routed (Plaud-style meetings, voice notes)
> - Video → frame extraction, transcript extraction, routing (punchlist walks, progress walks)
> - Photos → categorized, linked to job/location/vendor
> - Email-in → categorized, linked to entities (vendor invoices via email, client communications)
> - Sensor data → equipment time, GPS, weather (future)
>
> The user's job is to do the work. The system's job is to extract structure. No manual filing, no manual data entry where avoidable. Punchlist example: PM walks house with phone, talks while filming. System transcribes → identifies room → identifies product/vendor → creates punchlist item with photo + description + assignment + due date. ONE 10-second comment generates 5+ database operations across 4+ entities, manually-zero.
>
> PRINCIPLE 6 — Role-aware everything
> Same nav structure for all users; visibility filtered per role. ~15+ default roles (Owner, GM, Sr PM, PM, Estimator, Accountant, Foreman, Field, Designer, Sub Foreman, Sub Bookkeeper, Owner/Homeowner, Architect/External, Inspector, Banker, etc.) with granular permissions. Companies can customize roles. Org chart drives reporting + approval routing + notification routing + permission inheritance.
>
> PRINCIPLE 7 — Today as personal home screen
> Dashboard renamed Today. Always role-aware, action-oriented. PM sees their queues + day's schedule. Field worker sees today's job + clock-in. Accountant sees their queues. Owner sees strategic dashboard. Same slot, different content. Eventually (Wave 3+) auto-generated daily plans tell employees what to do.
>
> PRINCIPLE 8 — External access via magic links + universal applicability
> Subs/architects/inspectors/owners act on Nightwork without full accounts. Email-driven workflows: "respond to RFI" → click → temporary session → respond. "Sign PO" → click → e-sign. "Submit bill" → click → upload. Profile-based feature flags support custom builders, remodelers, commercial GCs from one platform. Pre-con prominent for custom, lighter for remodel. RFIs/submittals prominent for commercial.
>
> INGESTION-IS-DATA PRINCIPLE EXTENSIONS:
> - Pay apps are ASSEMBLED FROM DATA (queries against time + invoices + COs for period), not manually built
> - Reports are queries (saved or AI-generated from natural language)
> - Estimates are guided queries against historical similar jobs
> - Selections track full lifecycle: picked → spec to sub → ordered → delivered → installed → warranty
>
> ═══════════════════════════════════════════════════════════
> PART 2 — LOCKED TOP NAV STRUCTURE
> ═══════════════════════════════════════════════════════════
>
> Replace current "Dashboard | Financial | Operations | Cost Intelligence | Admin" with:
> Today | Pipeline | Jobs | Financials | Price Intel | People | Company | Reports
>
> Plus: Admin ▾ dropdown, Platform Admin badge (Jake/Andrew only), Notifications bell, User menu.
>
> 8 items. Each a primary daily-use destination. Role-filtered per user.
>
> ═══════════════════════════════════════════════════════════
> PART 3 — SECTION BREAKDOWNS (full target structure)
> ═══════════════════════════════════════════════════════════
>
> TODAY (role-aware home screen — replaces Dashboard for personal experience): action items per role, my day's plan, my queues, recent activity affecting me, alerts, quick actions per role, AI insights (Wave 3+).
>
> PIPELINE (pre-construction lifecycle): Leads (CRM), Estimates (Price Intel powered), Bids out (sent to subs), Proposals (e-sign), Contracts (owner contracts, sub master agreements).
>
> JOBS (active construction): Jobs list (filters: active/closed/archived/warranty/on-hold), click → per-job context with deep sub-nav (Part 4).
>
> FINANCIALS (money flows org-wide): Bills (vendor → builder), Purchase Orders, Pay Apps / Draws (builder → owner), Lien Releases, Change Orders, Payments, Aging / AR-AP.
>
> PRICE INTEL (knowledge graph surfaces — the moat): Overview, Cost Lookup, Selections Catalog, Material Orders, Bid Comparison, Anomaly Review, Vendor Performance, Verification Queue, Cost Database.
>
> PEOPLE: Vendors / Subs (W9, COI, License, performance link to Price Intel), Clients (current + past + leads from Pipeline), Internal Team (employees with roles, comp, performance), Org Chart, Sub Portal.
>
> COMPANY (running the business): Overview, P&L, Cash Flow, Expenses, Time Tracking, Compliance, Fleet & Equipment, Insurance, Permits & Licensing, Tax, Capacity Planning, Documents (corporate, legal).
>
> REPORTS (analytics + AI report builder): Saved Reports, AI Report Builder (Wave 3+: natural language → query → result), Custom Report Builder, Scheduled Reports, Templates.
>
> ADMIN ▾: Org Settings, Users & Roles, Permissions Matrix, Org Chart, Approval Workflows, Notification Rules, Cost Codes / Chart of Accounts, Templates, Integrations, Billing, Workflow Customization, Profile (company type).
>
> PLATFORM ADMIN (Jake/Andrew only): Cross-org tools, system monitoring, support, Cost Intelligence engine internals.
>
> ═══════════════════════════════════════════════════════════
> PART 4 — PER-JOB SUB-NAV
> ═══════════════════════════════════════════════════════════
>
> Primary tabs (filtered per role): Overview | Schedule | Budget | Selections | Bills | Pay Apps | More ▾
>
> "More" dropdown:
> - Documentation: Plans, Specs, Photos, Documents
> - Coordination: RFIs, Submittals, Change Orders, Daily Logs
> - Tasks: To-Dos, Punchlist
> - Time: Time Entries
> - Permits: Building Permits + Inspections
> - People: Team
> - Activity: Activity Feed
> - Closeout: Final Lien Releases, Substantial Completion (phase-aware)
> - Warranty: Warranty Claims (phase-aware, post-CO)
> - Pre-Con: Estimates, Proposals, Contracts (phase-aware, hidden post-contract)
>
> Phase-aware visibility logic deferred to F2.
> Role-aware visibility deferred to F2.
>
> ═══════════════════════════════════════════════════════════
> PART 5 — OWNER PORTAL & SUB PORTAL
> ═══════════════════════════════════════════════════════════
>
> Owner Portal (already designed in 1.5b — keep as is):
> My Project, Selections, Pay Apps, Photos, Documents, Communication, Warranty (post-CO).
>
> Sub Portal (NEW — three access patterns):
> 1. Authenticated sub portal: My Jobs, Bids, POs, Bills, Schedule, Daily Logs, RFIs, Documents, Profile
> 2. Magic link emails: respond to RFI, sign PO, submit bill — temporary auth via email link
> 3. Public job links: read-only views via unique URL (architects, inspectors)
>
> ═══════════════════════════════════════════════════════════
> PART 6 — REVISED ROADMAP & PHASE PLAN
> ═══════════════════════════════════════════════════════════
>
> Jake's strategic constraint: ship Ross Built usable product (invoices + Price Intel + draws) in ~8-10 weeks. Build foundations comprehensively but only implement what's needed for that customer.
>
> REVISED PHASE PLAN:
>
> STAGE 1.5c — IA Foundation (THIS PHASE, ships in 5-7 days before 1.5b)
> Implements complete nav structure with placeholders. Documentation locks all architectural principles. NO deep implementation.
>
> STAGE 1.5b ship — happens after 1.5c lands so 1.5b ships with new IA in place
>
> PHASE F1 — Knowledge Graph Schema + Auth Foundation (3-4 weeks): Real data graph entities + relationships in Supabase, Multi-tenant RLS at entity level, Audit trails on every entity, Auth + organization model, Magic link infrastructure (for F4 magic-link external access), Email-in receiving infrastructure, Foundation for ingestion routing, Stage 1.5b prototypes wired to real entities (read-only first).
>
> PHASE F2 — Roles Engine + Today Engine (2-3 weeks): Roles + permissions engine (real implementation), Default role library (~15 roles from Principle 6), Permission matrix UI, Org Chart visual, Today screen role-aware logic, Phase-aware per-job nav (logic, not just structure), Profile-based feature flags.
>
> PHASE F3 — Approval + Notification Engines (2 weeks): Approval workflow engine (customizable per company), Notification routing engine, Magic link external access (subs respond to RFIs, sign POs without account), Sub Portal authenticated experience, Email + transcript ingestion routing (basic — full AI routing in Wave 3).
>
> PHASE F4 — Time Tracking + Equipment + Expenses (2 weeks): Time tracking engine (employees clock in to jobs/cost codes), Equipment tracking + allocation, Expense management, Time → Pay App flow (auto-generate billable line items), Time → Payroll integration (QuickBooks), Time → Price Intel feeding (learn real labor costs per cost code).
>
> PHASE F5 — Price Intel Engine (3-4 weeks): Cost intelligence learning engine — the moat starts compounding, Cross-entity pollination (invoice → product entity, vendor performance, cost code update, selections catalog enrichment), Anomaly detection, Cost lookup search, Vendor performance scoring, Verification queue, Bid comparison engine.
>
> PHASE F6 — Pay App + Draw Engine (2 weeks): Pay apps assembled from data (query against time + invoices + COs), G702/G703 production-ready printing, Lien release workflow, Owner approval flow.
>
> WAVE 1.1-LITE — Ross Built Live (2-3 weeks): Wires invoices/draws/Price Intel to real backend, Ross Built imports historical data + starts using Nightwork actively, Iteration based on real use, ROSS BUILT GENERATING DATA = MOAT STARTS COMPOUNDING.
>
> WAVE 2 — Operations Features (4-6 weeks): Schedule (Gantt with real backend), Daily Logs (with photo + voice + video ingestion), Punchlist (with AI video routing per Principle 5), Selections workflows, Documents (plans, specs, photos), Reconciliation engine (lock leading candidate).
>
> WAVE 3 — Communication + AI Layer (4-6 weeks): AI Report Builder (natural language → graph queries), Email + transcript AI routing (full implementation), Voice/video punchlist with AI structured extraction, Vendor portal full experience, Activity feed + comments.
>
> WAVE 4 — Pre-Construction + Warranty (4-6 weeks): CRM / Leads, Estimating (Price Intel powered), Proposals + e-sign, Contracts, Warranty management, As-builts archive.
>
> WAVE 5+ — Customer 2-N onboarding, Founding 50, refinement.
>
> Total time to Ross Built live use of core flows: ~12-14 weeks from now.
> Total time to Customer 2 readiness: ~22-26 weeks from now.
>
> MASTER-PLAN.md must be updated to reflect this revised plan. Add D-040 through D-055 capturing key decisions: D-040: Top nav 8-section structure locked; D-041: Today as personal home (replaces Dashboard for role-aware experience); D-042: Knowledge graph as F1+ data model; D-043: Roles + permissions in F2; D-044: Magic link external access in F3; D-045: Aggressive multi-modal ingestion architecture (Principle 5); D-046: Price Intel as both layer + destination; D-047: Profile-based feature flags; D-048: Phase-aware per-job nav; D-049: Wave 1.1 split into 1.1-Lite (RB usable) and Wave 1.1-Full (later); D-050: F1-F6 expanded scope vs original F1-F4.
>
> ═══════════════════════════════════════════════════════════
> PART 7 — IA MINI-PHASE SCOPE (Stage 1.5c — what ACTUALLY ships in 5-7 days)
> ═══════════════════════════════════════════════════════════
>
> Implements the SHAPE before any deep implementation. Anything requiring real backend logic = placeholder.
>
> A. TOP NAV RESTRUCTURE: Replace current "Dashboard | Financial | Operations | Cost Intelligence | Admin" with locked 8-section structure. Section header components, hover states, active states (use Site Office direction tokens). Mobile responsive (hamburger or appropriate mobile pattern). Notifications bell + User menu integrated. Platform Admin badge for Jake/Andrew (basic role check, full implementation in F2).
>
> B. SECTION-LEVEL PLACEHOLDER ROUTES: For each top-nav section, create primary route + sub-routes per Part 3. Roughly 60-90 routes total. Each placeholder shows: Eyebrow (section name), Headline (feature name), Body (2-3 sentence description), Wave badge ("Coming F1 / F2 / Wave 1.1-Lite / Wave 2 / etc"), Optional representative screenshot/mockup.
>
> Routes that should NOT be placeholders (real content from 1.5b prototypes): /jobs, /jobs/[id], /jobs/[id]/budget, /jobs/[id]/schedule (Wave 2 preview), /financials/bills/[id] (currently /design-system/prototypes/invoices/[id]), /financials/draws/[id], /financials/draws/[id]/print, /financials/reconciliation, /people/vendors, /people/vendors/[id], /jobs/[id]/documents/[id], /owner-portal, /owner-portal/draws/[id], /jobs/[id]/mobile-approval.
>
> The /design-system/prototypes/* routes from 1.5b stay accessible at their current paths under platform_admin gate (for portfolio/demo). The PRODUCTION routes (without /design-system prefix) wire to the same components.
>
> C. PER-JOB SUB-NAV SCAFFOLD: Tab component for primary tabs. "More" dropdown for secondary items. Phase-aware logic SKELETON (hardcoded phase for now, full logic in F2). Role-aware visibility SKELETON (hardcoded role for now, full logic in F2).
>
> D. TODAY SCREEN SCAFFOLD: Replace current Dashboard at "/" with new Today screen. Basic version (full personalization in F3): Section header "Today", Subtitle "Your action items and queues". Action items section (org-wide queues — same as current dashboard for now). "Your Day" placeholder section: "Coming F3 — personalized daily plan". Activity Feed (existing component). Cash Flow (existing component). Today should feel different from generic dashboard.
>
> E. OWNER PORTAL & SUB PORTAL ENTRIES: Owner Portal (existing prototype routes work, accessible at /owner-portal). Sub Portal (stub at /sub-portal showing "Coming F3 — Subcontractor self-service portal with magic link access").
>
> F. ADMIN SECTION WITH ROLES PLACEHOLDERS: /admin (settings overview), /admin/users, /admin/roles ("15 default roles will live here, customizable per org — coming F2"), /admin/permissions, /admin/org-chart, /admin/approval-workflows, /admin/notification-rules, /admin/cost-codes, /admin/templates, /admin/integrations, /admin/billing, /admin/workflow-customization, /admin/profile.
>
> G. PLATFORM ADMIN BADGE: Top-right badge visible only to Jake/Andrew (platform_admins). Click goes to /platform-admin/* (placeholder).
>
> H. CANONICAL DOCUMENTATION: Create or update — .planning/architecture/ARCHITECTURE.md (NEW: 8 principles documented, Data graph model overview, Section purposes, Phase plan); .planning/architecture/ENTITY-INVENTORY.md (NEW: Catalog of all data graph entities, Brief description of each, Reference for F1 schema design); .planning/architecture/ROLES-CATALOG.md (NEW: Default 15+ roles, Permissions scope per role, Reference for F2 implementation); .planning/architecture/INGESTION-ARCHITECTURE.md (NEW: Multi-modal ingestion architecture, Email-in/voice/video/photo routing patterns, AI extraction patterns, Reference for F3+ implementation); CONTEXT.md UPDATE; MASTER-PLAN.md UPDATE (D-040 through D-055; CURRENT POSITION; rewrite NEXT PLANNED WORK with revised roadmap); PHILOSOPHY.md UPDATE (Today as home pattern, role-aware filtering pattern, multi-modal ingestion pattern); PATTERNS.md UPDATE (placeholder treatment patterns, role-filtered nav patterns, phase-aware sub-nav patterns).
>
> I. TESTING & WALKING: Build + typecheck passes. All hooks silent (T10c, tenant-blind, bouncy-easing). Privacy gate clean (32-token denylist). Visual walk: Jake walks new IA structure in browser. Mobile responsive check on iPhone Safari (M3 ship gate).
>
> ═══════════════════════════════════════════════════════════
> PART 8 — CRITICAL CONSTRAINTS
> ═══════════════════════════════════════════════════════════
>
> DO NOT modify existing 1.5b prototype routes (they wire to new structure but components stay).
> DO NOT modify _fixtures/drummond/ (sanitized fixtures locked).
> DO NOT modify scripts/sanitize-drummond.ts (Wave 0 deliverable, locked).
> DO NOT modify the design-system playground at /design-system (separate from /design-system/prototypes/).
> DO update production app's main nav structure.
> DO update all documentation atomically.
> Privacy gate (32-token denylist) must remain clean.
> Hooks (T10c, tenant-blind, bouncy-easing) must remain silent.
> Build + typecheck must remain clean.

---

## 1. Mapped entities and workflows

### 1.1 Knowledge graph entities referenced by Part 1 Principle 2

| Entity (Principle 2) | VISION wave | Current state | Notes for 1.5c |
|---|---|---|---|
| Jobs | Wave 1 | COMPLETE (existing) | Already exists at `/jobs/[id]`. 1.5c re-routes to canonical. |
| Vendors | Wave 1 | COMPLETE | Existing at `/vendors`. 1.5c moves canonical to `/people/vendors`. Existing route stays accessible via redirect. |
| Clients | Wave 1+ | MISSING (`client_portal_access` exists; `clients` proper does not) | Placeholder under `/people/clients`. F1 schema. |
| Employees | Wave 1+ | PARTIAL (`profiles` + `org_members`) | Placeholder under `/people/team`. F2 expands to comp + performance. |
| Products | Wave 4 | MISSING (selections catalog as VIEW per Principle 3) | Placeholder under `/price-intel/selections-catalog`. F5 schema. |
| Cost Codes | Wave 1 | COEXISTING (3-table drift; F1 wipe-and-reseed per D-020) | Placeholder admin route `/admin/cost-codes`; existing `/settings/cost-codes` redirects. |
| Bills (vendor invoices) | Wave 1 | COMPLETE | Existing at `/invoices`. **Renamed to Bills under `/financials/bills`.** Critical naming change to surface in this phase. |
| Pay Apps (builder→owner) | Wave 1 | COMPLETE (draws) | Existing at `/draws`. **Renamed to Pay Apps under `/financials/pay-apps`** — terminology shift to match Principle 2. |
| Purchase Orders | Wave 1 | COMPLETE | Existing job-scoped only. Surface under `/financials/purchase-orders`. |
| Time Entries | F4 | MISSING | Placeholder. F4 schema. |
| Equipment, Equipment Usage | F4 | MISSING | Placeholder. F4 schema. |
| Expenses | F4 | MISSING | Placeholder under `/company/expenses`. F4 schema. |
| Change Orders | Wave 1 | COMPLETE | Existing at `/change-orders/[id]`. Surface under `/financials/change-orders`. |
| Lien Releases | Wave 1 | PARTIAL (R.7 violation per CURRENT-STATE A.2 — F1 fixes) | Surface under `/financials/lien-releases`. |
| Documents (general) | Wave 2 | MISSING / AMBIGUOUS | Placeholder. Per-job `/jobs/[id]/documents/[id]` exists. |
| Photos | Wave 2 | MISSING | Placeholder under per-job More dropdown. |
| Schedule Items | Wave 2 | MISSING (1.5b has prototype only) | Placeholder + existing prototype wired into per-job tab. |
| Daily Logs | Wave 2 | MISSING | Placeholder. |
| RFIs | Wave 2/3 | MISSING | Placeholder. F3 magic-link writes for sub-RFI response. |
| Submittals | Wave 2/3 | MISSING | Placeholder. |
| Punchlist Items | Wave 2 | MISSING (Principle 5 voice/video example) | Placeholder. Wave 2/3 ingestion. |
| To-Dos | Wave 2 | MISSING | Placeholder. |
| Activities (event log) | Wave 1 | COMPLETE (`activity_log`) | Surface under per-job Activity Feed + Today recent activity. |
| Permits | Wave 2/3 | MISSING | Placeholder. |
| Insurance Policies | Wave 2 | MISSING | Placeholder under `/company/insurance`. |
| Tax Records | Wave 4 | MISSING | Placeholder under `/company/tax`. |
| Selections | Wave 4 | MISSING | Placeholder under per-job + `/price-intel/selections-catalog`. |
| Estimates | Wave 4 | MISSING | Placeholder under `/pipeline/estimates`. |
| Proposals | Wave 1 (committed entity) | COMPLETE | Existing at `/proposals/review/[extraction_id]`. Surface under `/pipeline/proposals`. |
| Contracts | Wave 4 | MISSING | Placeholder under `/pipeline/contracts`. |
| Bids | Wave 4 | MISSING | Placeholder under `/pipeline/bids-out` + `/price-intel/bid-comparison`. |

**Total entity placeholder coverage:** 31 of 31 enumerated in Principle 2.

### 1.2 Existing routes affected (audit of `src/app/`)

| Existing path | 1.5c canonical path | Disposition |
|---|---|---|
| `/dashboard` | `/today` (with `/` → `/today` redirect) | RENAME (Today screen scaffold) |
| `/financial` | `/financials` (already exists at both) | CONSOLIDATE — drop `/financial`; one canonical spelling |
| `/financials` | `/financials` (overview) | KEEP |
| `/financials/aging-report` | `/financials/aging` | RENAME for consistency |
| `/operations` | DELETE | Replaced by `/today` action-items + per-job tabs + Wave 2 placeholders |
| `/cost-intelligence/*` | `/price-intel/*` | RENAME — 6 subpaths to redirect |
| `/invoices` | `/financials/bills` | RENAME (Bills terminology) — keep `/invoices` 301-redirect |
| `/invoices/queue` | `/financials/bills/queue` | RENAME |
| `/invoices/qa` | `/financials/bills/qa` | RENAME |
| `/invoices/payments` | `/financials/payments` | MOVE |
| `/invoices/liens` | `/financials/lien-releases` | RENAME |
| `/draws` | `/financials/pay-apps` | RENAME (Pay Apps terminology) |
| `/draws/[id]` | `/financials/pay-apps/[id]` | MOVE — keep `/draws/[id]` 301-redirect |
| `/draws/[id]/print` | `/financials/pay-apps/[id]/print` | MOVE |
| `/change-orders/[id]` | `/financials/change-orders/[id]` | MOVE |
| `/jobs` | `/jobs` | KEEP — list page |
| `/jobs/[id]` | `/jobs/[id]` (Overview tab default) | KEEP |
| `/vendors` | `/people/vendors` | MOVE |
| `/vendors/[id]` | `/people/vendors/[id]` | MOVE |
| `/proposals/review/[extraction_id]` | `/pipeline/proposals/review/[extraction_id]` | MOVE |
| `/settings/*` | `/admin/*` | RENAME (Admin top-nav dropdown) |
| `/admin/platform` | `/platform-admin` | RENAME (Platform Admin badge) |
| `/design-system/*` (playground) | `/design-system/*` | KEEP — gated to platform_admin per existing middleware |
| `/design-system/prototypes/invoices/[id]` | `/financials/bills/[id]` (production) + keep `/design-system/prototypes/invoices/[id]` (portfolio) | DUAL — see Q4 |

**Approximate scope:** 32 route renames/moves (existing) + ~60-90 placeholder routes (new) = ~95-125 route file touches. Plus middleware/redirect rules for legacy paths.

### 1.3 Workflows referenced

| Workflow | Mention in nwrp43 | Surface in 1.5c |
|---|---|---|
| Today action items (role-aware) | Part 3, Part 7 D | Today screen scaffold (org-wide queue lists, role logic deferred to F2) |
| Per-job phase-aware nav | Part 4 | Skeleton with hardcoded phase + role; logic deferred to F2 |
| External access via magic links | Part 5, Principle 8 | `/sub-portal` stub + magic-link placeholder pages; engine deferred to F3 |
| Multi-modal ingestion routing | Principle 5 | NOT in 1.5c — Q11 confirms deferred to F3+ |
| Profile-based feature flags | Principle 8 | Placeholder at `/admin/profile` only — Q12 confirms deferred to F2 |

---

## 2. Prerequisite gaps

What MUST exist before this phase can ship safely. These are **blockers** if missing.

| # | Gap | Source | Blocking? |
|---|---|---|---|
| 1 | Site Office direction tokens + Set B palette implemented | D-037, `.planning/design/CHOSEN-DIRECTION.md` | NO — already shipped Stage 1.5a. Site Office tokens, JetBrains Mono UPPERCASE eyebrows, 1px slate-tile left-stamp, 150ms ease-out are live. |
| 2 | shadcn/Heroicons primitive boundary | COMPONENTS.md | NO — already shipped 1.5a. Tenant-blind primitives rule + Icon Library Boundary live. New nav components must follow. |
| 3 | NwButton primitive (TD-20) used over raw `<button>` | findings.md TD-20 | **YES (partial blocker)** — TD-20 was an explicit "fix before lifting any prototype to production route" call. Production routes added in 1.5c MUST use NwButton. |
| 4 | Audit timelines on owner portal + vendor + contract + plan stubs (TD-23, TD-24) | findings.md | **YES (partial)** — when 1.5c moves vendor + owner-portal prototypes to production routes, these missing audit timelines come with them. Either fix-in-flight or explicitly defer (Q10). |
| 5 | Mobile responsive M3 phone gate | EXPANDED 1.5b §0 acceptance | **YES (gating)** — M3 phone walk on iPhone+Safari is part of 1.5b ship gate (still pending). 1.5c either piggybacks on M3 walk or carves its own — see Q13. |
| 6 | platform_admin role + middleware gating | migration 00048, middleware.ts:98 | NO — already exists. New `/platform-admin` placeholder reuses existing posture. |
| 7 | `useCurrentRole()` hook | `src/hooks/use-current-role.ts` (referenced in nav-bar.tsx) | NO — already exists. New 8-section nav reuses + extends. |
| 8 | NotificationBell + FeedbackTrigger components | `src/components/notification-bell.tsx`, `feedback-trigger.tsx` | NO — already exist. New nav reuses. |
| 9 | NwWordmark + NwIcon + collapse-at-360px logic | nav-bar.tsx:284-289 | NO — already exists. New nav reuses verbatim. |
| 10 | `/api/dashboard` aggregation endpoint | `src/app/api/dashboard/route.ts` | NO — already exists. Today screen scaffold reuses for org-wide queues (Q6 wave-zero behavior). |
| 11 | Sanitized Caldwell fixtures + 4-tier privacy gate | `_fixtures/drummond/*`, `.planning/fixtures/drummond/SUBSTITUTION-MAP.md` (gitignored) | NO — already exists per nwrp33 C6. 1.5c does NOT touch fixtures (Part 8 constraint). |
| 12 | 1.5b prototype routes exist at `/design-system/prototypes/*` | `src/app/design-system/prototypes/*` | NO — already exist. 1.5c either re-imports their components into production paths (Q4=A) or adds thin wrappers (Q4=B). |
| 13 | T10c sample-data isolation hook | `.claude/hooks/nightwork-post-edit.sh` (T10a-T10d) | NO — already lives. 1.5c production routes must remain T10c-clean (no `_fixtures/drummond` imports). **CRITICAL:** if 1.5c re-imports prototype components from `/design-system/prototypes/*`, those components MUST be refactored to accept data via props, not import fixtures directly. Otherwise T10c blocks the move. See Q4 + §4 cross-cutting. |

---

## 3. Dependent-soon gaps

What's likely needed shortly after — design for it now to avoid refactor.

| # | Gap | Likely next phase | Design implication for 1.5c |
|---|---|---|---|
| 1 | Role-aware nav filtering with 15+ roles | F2 | Nav structure must accept a `role` parameter that drives `show.section` booleans. Don't hardcode 4-role ACCESS map — make it data-driven so F2 swaps in 15 roles. |
| 2 | Phase-aware per-job sub-nav | F2 | Per-job tabs accept a `phase` enum input ("active" / "closeout" / "warranty" / "pre-con"). Hide/show closeout/warranty/pre-con tabs accordingly. F2 wires the phase to a `jobs.phase` column or computed view. |
| 3 | Profile-based feature flags | F2 | Top-nav + admin items must accept a `profile` enum input ("custom_builder" / "remodeler" / "commercial_gc"). Pipeline section is prominent for custom, lighter for remodel — don't hardcode visibility. |
| 4 | Magic link routing | F3 | Sub Portal stub must accept a token-validation fallback path. The 3 access patterns (auth, magic link, public link) need 3 different middleware behaviors. Even at stub level, 3 distinct routes are clearer than 1. |
| 5 | Today screen role-personalization | F2/F3 | Today screen scaffold should split layout into "Universal" (org-wide queue counts) + "Personal" (placeholder; F2 fills in role-specific cards). Don't bake org-wide queues into the only layout — layer them. |
| 6 | Bills / Pay Apps terminology | All future phases | Once 1.5c renames Invoices→Bills and Draws→Pay Apps, ALL fixture string content, all UI labels, all component prop names should converge. Half-rename creates worse drift than no rename. **Critical decision in Q3.** |
| 7 | Reports as queries | Wave 3+ | Reports section placeholder. Don't build a "report list" UI; build a "saved queries" placeholder that explicitly reads as "AI Report Builder coming F4+". Different mental model than feature-list reports. |
| 8 | Cross-pollination on ingestion (Principle 4) | F1-F5 cumulative | Bills surface (renamed from Invoices) needs to display "this bill enriched: vendor performance, cost code data point, product entity, selections catalog" — even as a placeholder badge. Sets expectation that ingestion is a multi-write event. Worth a stub in 1.5c. |
| 9 | RFI/Submittal entities Wave 2/3 | Wave 2/3 | Per-job More dropdown placeholders for RFIs + Submittals. Magic-link "respond to RFI" workflow targeted F3. The RFI route accepts query-string token validation even at stub level. |
| 10 | Pay Apps assembled from data (Part 6 ingestion-is-data extension) | F6 | Pay Apps placeholder (production route) shows EXISTING draw fixture data as a prototype, but text indicates "F6: Pay App auto-generated from time + invoices + COs in this period." Sets ingestion-is-data expectation. |
| 11 | Owner Portal terminology unification | Future | If `/owner-portal` becomes its own subdomain or auth-isolated path, decide now. Q2 surfaces this. |
| 12 | Mobile-approval reject + kickback paths (TD-W2-2) | Wave 1.1-Lite | If `/jobs/[id]/mobile-approval` lifts to production in 1.5c, the missing reject path (findings.md F-W2-2) ships with it. Either patch in 1.5c or document as carry-over. |

---

## 4. Cross-cutting checklist

| Concern | Status | Rationale |
|---|---|---|
| **Audit logging** | DEFER | 1.5c is structural. Placeholder routes have no mutations. Today screen reads `/api/dashboard` (existing audit posture). Only mutation surface is Pick-Direction route — already platform-admin-gated. **Confirm:** new nav components are read-only. |
| **Permissions** | APPLIES | New nav must be role-filtered (Principle 6). Today's 4-role ACCESS map at `nav-bar.tsx:57-63` becomes 8-section + role-aware. 1.5c uses simplified role check (existing 4-role hook); 15-role expansion is F2. **Recommendation:** structure ACCESS map as data-driven so F2 expansion is mechanical. |
| **Optimistic locking** | N/A | No new write endpoints in 1.5c. |
| **Soft-delete + status_history** | N/A | No new entities/mutations. Production-route renames inherit existing data shape. |
| **Recalculate, don't increment** | N/A | No derived totals introduced. Today screen reuses dashboard endpoint. |
| **Multi-tenant RLS** | N/A | No new tables. |
| **Idempotency** | N/A | No new write endpoints. |
| **Background jobs** | N/A | No new async work. |
| **Rate limiting** | N/A | Same as above. |
| **Observability** | APPLIES (light) | Sentry tags (`user_id`, `org_id`, `platform_admin`) already set in middleware. New nav components inherit. **Confirm:** placeholder routes don't introduce ad-hoc `console.error` calls (CONCERNS.md HIGH-2026-04-24, unresolved). |
| **Data import/export** | N/A | No new entities. |
| **Document provenance (V.3)** | N/A | No new document-originated entities. |
| **Mobile-friendly** | APPLIES (HEAVY) | New 8-section nav + Admin dropdown + Platform Admin badge + Notifications bell + User menu = 12 chrome surfaces on desktop. On mobile (hamburger), priority order matters. **See Q5.** Per-job sub-nav with primary tabs + More dropdown also needs mobile design. CLAUDE.md PM-on-mobile workflow + 360px breakpoint apply. |
| **Drummond fixtures sufficient** | APPLIES | 1.5c production routes display Caldwell (sanitized Drummond) data via existing 1.5b prototype components. Q4 determines whether new production routes import the prototype components or duplicate them. T10c hook (sample-data isolation) BLOCKS direct fixture imports from production paths — existing prototype components are at `_fixtures/drummond` and may import directly. **CRITICAL design decision in Q4.** |
| **CI test gate** | DEFER (PARTIAL APPLIES) | No new HTTP endpoints. Build + typecheck must remain clean (Part 8). No new test surfaces required. |
| **Error handling for partial failures** | N/A | No multi-step writes. |
| **Graceful degradation** | APPLIES (light) | Notifications bell + dashboard fetch already handle Resend / API failures. New nav components inherit. |
| **Forbidden tokens (Site Office §13)** | APPLIES | New nav components must use Site Office tokens — UPPERCASE eyebrows, JetBrains Mono 10-11px, 0.18em tracking, no rounded corners >2px, no purple/pink, no Card padding="lg" (TD-25 already flagged). Post-edit hook + privacy gate enforce. |
| **Tenant-blind primitives** | APPLIES | New nav UI components in `src/components/ui/` accept NO `org_id` / `membership` / `vendor_id` props. Hook enforces. |
| **NwButton bypass (TD-20)** | APPLIES — partial blocker | Per findings.md TD-20: "Fix before lifting any prototype to production route." 1.5c lifts ≥6 prototypes to production. NwButton conversion required for these. |
| **Audit timelines on lifted prototypes (TD-23, TD-24)** | APPLIES | vendor + contract + plan + owner-portal/draws missing audit timelines. Either fix-in-flight or carry forward. **See Q10.** |
| **SYSTEM.md violations on lifted prototypes (TD-25, TD-26, TD-27)** | APPLIES | 3 violations in owner-portal + prototypes/page. Fix-in-flight when production-mounting these surfaces. |
| **404 routing for renamed paths** | APPLIES | Legacy paths `/dashboard`, `/invoices`, `/draws`, `/cost-intelligence/*` etc. need redirects. Use `next.config.js` redirects rule for clarity over middleware (rebuilds catch typos). 32 renames per §1.2. |
| **Hooks (T10c, tenant-blind, bouncy-easing) silent** | APPLIES — gating | Part 8 constraint. T10c is the highest-risk for this phase due to fixture imports. |

---

## 5. Construction-domain checklist

| Domain consideration | Applies? | Rationale |
|---|---|---|
| Drummond as reference job | YES | Caldwell-sanitized fixtures are the only data source for production-mounted prototypes. 1.5c does NOT add new fixture data. |
| Field mistakes become permanent QC entries | NO | No punchlist or daily log mutations in 1.5c. Wave 2 work. |
| Draw requests link to punchlist | NO | Wave 2 work. |
| Invoice review is the gold standard UI | YES | Production-mounted Bills (formerly Invoices), Pay Apps (formerly Draws), Lien Releases, Change Orders, Vendors, Documents, Owner Portal Pay Apps all extend Document Review pattern (PATTERNS §2). 1.5c doesn't redesign — it re-routes. |
| Stone blue palette + Slate type system + logo top-right | YES | Site Office direction + Set B palette per D-037. New top-nav extends existing nav-bar's logo-top-right + collapse-at-360px posture. |
| Stored aggregates require rationale comments | N/A | No new aggregates. |
| Cost-plus open-book transparency | APPLIES | Owner Portal Pay Apps surface (now at `/owner-portal/draws/[id]`) becomes canonical at `/owner-portal/pay-apps/[id]`. Owner-facing Bills visibility is Wave 3+. |
| Florida-specific (lien statute types, FL contractor licenses) | NO | Lien Releases page is a placeholder/move; F1 wires the 4-statute schema. 1.5c is structural. |
| GC fee semantics on cost-plus | NO | Existing Drummond fixtures + draw prototype handle this; no change in 1.5c. |
| Real-phone walk gate | YES | Part 7 I lists "Mobile responsive check on iPhone Safari is the M3 ship gate." Same M3 device per CONTEXT D-31 OR a new walk. **See Q13.** |
| Bills vs Invoices terminology | YES | **CRITICAL CONSTRUCTION-DOMAIN POINT.** In US construction terminology, "bill" is what the GC RECEIVES (vendor → builder); "invoice" is what the GC SENDS (builder → owner — although "pay app" is more common). Principle 2 explicitly names "Bills (vendor invoices)" and "Pay Apps (builder→owner)". This terminology shift aligns Nightwork with industry convention. **Half-rename = worse drift than no rename.** Q1 locks it. |
| Pay Apps vs Draws terminology | YES | "Draw" is bank-loan terminology (construction loan draws); "Pay App" is contractor-payment-application terminology (what Ross Built actually fills out — AIA G702 is a "Application for Payment"). Principle 2 names "Pay Apps." Same critical decision. |
| Selections lifecycle (picked → spec → ordered → delivered → installed → warranty) | NO (placeholder) | Selections placeholder shows the lifecycle as a future-state badge. F5 schema + workflow. |
| RFI/Submittal magic-link sub workflows | NO (placeholder) | F3 work. 1.5c places stubs at `/sub-portal/*` with copy describing future flow. |

---

## 6. Targeted questions for Jake

### Q1. **Bills / Pay Apps terminology rename — full or partial?**

Principle 2 names "Bills (vendor invoices)" and "Pay Apps (builder→owner)". Existing app uses "Invoices" + "Draws."

**Options:**
- **A: Full rename in 1.5c.** Production routes become `/financials/bills` + `/financials/pay-apps`. Legacy `/invoices` + `/draws` 301-redirect. ALL UI labels, fixture string content, component names, audit-log action strings converge. ~50-80 sites of label change.
- B: Surface rename only. Routes rename + UI labels rename, but fixture strings, audit-log action strings, component class names, comment references stay "invoice" / "draw" until F1.
- C: No rename in 1.5c. Routes stay `/invoices` / `/draws`, just nested under `/financials`. Defer terminology to F1.

**Recommended: A.** Rationale: 1.5c is the **largest IA reset between now and Wave 1.1-Lite ship**. If 1.5c doesn't full-rename, every subsequent phase touches both terminologies and leaks the old one. Ross-Built users (Diane, PMs) won't grok the change in 1.5c unless it's complete. Half-renames create worse drift than no rename. Cost: ~2-3 days within the 5-7 day budget — but mostly mechanical replace + redirect rules.

### Q2. **Owner Portal auth posture in 1.5c — same auth, separate auth, or subdomain?**

Part 5 says Owner Portal "already designed in 1.5b" and routes accessible at `/owner-portal`. 1.5b prototypes live at `/design-system/prototypes/owner-portal`. Production move requires auth decision.

**Options:**
- A: **Same auth, role-gated** — Owner Portal at `/owner-portal/*` rendered with same Supabase auth, role gate `owner_view` (existing). Middleware ensures owner role users only see Owner Portal nav items.
- B: Separate auth domain — `/owner` subpath with token-based access, no Supabase auth tied to org_members. Magic link only.
- C: Subdomain — `owner.nightwork.build` with separate cookie domain. Most isolated; most infra work.

**Recommended: A.** Rationale: existing `client_portal_access` table (Wave 3 COMPLETE) provides token-based invite. Owner Portal at `/owner-portal/*` with same Supabase auth + role gate is mechanically simplest. 1.5c is structural — defer auth-isolation to Wave 3 owner portal full phase. This also unifies the role-aware nav model (Principle 6) — owner_view sees a different filter, not a different app.

### Q3. **Sub Portal stub depth — 1 stub or 3 stubs?**

Part 5 lists 3 access patterns (auth, magic link, public link). Part 7 E says "stub at /sub-portal."

**Options:**
- A: 1 stub at `/sub-portal` describing all 3 patterns.
- B: **3 stubs:** `/sub-portal` (auth), `/sub-portal/magic/[token]` (magic link), `/sub-portal/public/[token]` (public link). Each describes its specific F3 future-state.
- C: 1 stub + 1 magic-link route placeholder (path `/m/[token]` for shorter URLs in emails).

**Recommended: B.** Rationale: 3 distinct middleware behaviors will exist in F3. Stubbing the route shape now means F3 doesn't refactor URL paths. Magic-link URL pattern is also a customer-facing email artifact — naming it now (e.g., `/sub-portal/magic/[token]` or `/m/[token]`) prevents email-content rewrites later. 3 stubs is minimal effort (3 small static pages).

### Q4. **`/design-system/prototypes/*` after 1.5c — duplicate, re-export, or thin wrapper?**

Production routes mount the 1.5b prototype components. The /design-system/prototypes/ paths "stay accessible under platform_admin gate" per Part 7 B.

**Options:**
- A: **Thin wrapper** — extract prototype components to `src/components/prototypes/` with fixture-import refactored to prop-drill. Both production routes and `/design-system/prototypes/*` re-import same component file with different props (production = real data when F1 lands; prototype = Caldwell fixture).
- B: Re-export — keep components at `_components` under `design-system/prototypes/`; production routes re-export the same React components verbatim. Both surfaces import directly from prototype location.
- C: Duplicate — copy components into production paths; prototype paths stay as-is. Two copies, manual sync forever.

**Recommended: A.** Rationale: T10c hook BLOCKS production routes from importing fixtures directly (sample-data isolation rule). Prototype components currently import from `_fixtures/drummond/*` directly. Either we (a) refactor components to accept fixture data as props (1.5c work), or (b) prototype-only routes wrap components with fixture-injection, production routes wrap with API-data-injection. Option A makes 1.5c slightly heavier (~half-day refactor per prototype × 11 = ~5 days) — but C is paying that cost forever. **TIME RISK:** if A is chosen, the 5-7 day budget is tight. Recommend front-loading the refactor and explicitly carving the audit-timeline + NwButton fixes (TD-20, TD-23, TD-24) into 1.5c (Q10).

### Q5. **Mobile chrome priority order**

12 desktop chrome surfaces (8 nav items + Admin dropdown + Platform Admin badge + Notifications bell + User menu) → mobile hamburger has limited space.

**Options:**
- A: Hamburger expands all 8 nav items + Admin section + User menu. Notifications bell + Platform Admin badge stay top-right. **Recommended.**
- B: Hamburger has ALL 12. Top-bar collapses to logo + hamburger only.
- C: Today + Jobs as bottom-fixed mobile tabs (always visible); other 6 sections in hamburger. iOS-app-style.

**Recommended: A.** Rationale: existing nav-bar.tsx already handles 4 nav items + bell + theme + sign-out + role badge. Extending to 8 nav items in mobile dropdown is mechanical. Bottom-fixed tabs (option C) is an attractive future direction but adds ~1-2 days. 1.5c stays minimal; bottom-fixed is Wave 1.1-Lite if PM mobile testing proves need.

### Q6. **Today screen Wave-zero behavior — preserve or simplify?**

Part 7 D says Today shows org-wide queues "same as current dashboard for now." Current `src/app/dashboard/page.tsx` has 5 main sections: Welcome header / Attention items / Activity feed / Cash Flow KPIs / Getting Started checklist.

**Options:**
- A: **Preserve all sections, restructure layout** to feel different from generic dashboard. Add eyebrow "TODAY" + new copy "Your action items and queues" + add a "Your Day" placeholder card at top reading "Coming F3 — personalized daily plan."
- B: Strip to bare minimum (just Attention + Activity); kill Cash Flow + Getting Started.
- C: Move Cash Flow + Getting Started to `/company/overview` (canonical destination per Part 3); Today shows Attention + Activity + Your-Day-placeholder only.

**Recommended: C.** Rationale: Cash Flow + Getting Started are **company-running data**, not personal action items. Principle 7 explicitly says Today is action-oriented. Cash Flow belongs at `/company/overview` per Part 3 anyway. Move them in 1.5c — done right once. Today gets cleaner action-item focus. Cost: small migration of 2 dashboard cards to a new route. Saves a refactor in F2 when Today gets role-personalized.

### Q7. **Today as `/today` route or `/` root?**

Currently `/` redirects to `/dashboard`. Today screen could be at `/` or `/today`.

**Options:**
- A: **`/today` with `/` → `/today` redirect.** Authenticated users land at `/today`. Bookmarks + deep-links use canonical `/today`.
- B: `/` is Today (no separate `/today`). Eliminates redirect.
- C: Both — `/today` and `/` render same component.

**Recommended: A.** Rationale: keeps `/` as a redirect target — supports future profile-based-feature-flag-driven landing (custom_builder users land at `/today`; commercial_gc users may land at `/pipeline`). One-line redirect rule.

### Q8. **Routes-NOT-placeholders list — additions in 1.5c?**

Part 7 B lists ~14 routes that wire to existing 1.5b prototypes (production paths, not stubs). Are any of these worth promoting from prototype-only to "first iteration of real backend wiring" in 1.5c?

**Options:**
- A: **No promotion in 1.5c.** All listed routes stay 1.5b-component-mounted (Caldwell fixture data). F1 wires real backend.
- B: Wire `/people/vendors` to existing `vendors` table (the only Wave 1 entity COMPLETE today with real data). PM can preview real Ross Built vendor list (after Drummond import in F4) on production route. Test data is synthetic now anyway.
- C: Wire `/jobs` list to existing `jobs` table (1 Caldwell job exists). Same logic.

**Recommended: A.** Rationale: 1.5c is structural. Mixing real-backend wiring complicates the 5-7 day budget. F1 wiring is its own phase. Keep 1.5c clean — production paths render Caldwell fixtures as a **showcase** of "what the design will look like with real data" for Jake's IA walk; F1 swaps in real queries. **However,** if Q4=A (refactor components for prop-drilled data), then Q8=A is mechanical.

### Q9. **D-040 through D-055 — full 16 enumerated or 11 enumerated + 5 reserved?**

Part 6 says "add D-040 through D-055" (16 decisions) but enumerates only D-040 through D-050 (11). What are D-051 through D-055?

**Options:**
- A: **11 enumerated + 5 reserved.** D-051 = "1.5c terminology rename Bills/Pay Apps locked" (Q1=A); D-052 = "1.5c Sub Portal 3-stub structure" (Q3=B); D-053 = "1.5c prototype-component thin-wrapper extraction" (Q4=A); D-054 = "1.5c mobile chrome priority A" (Q5=A); D-055 = "Today screen Wave-zero layout = Q6=C with Cash Flow moved to /company/overview". Numbering reflects 1.5c's resolved questions, not arbitrary placeholders.
- B: 11 enumerated, 5 deleted. Use D-040 through D-050 only; later phases pick up D-051+.
- C: 11 enumerated, 5 reserved for F1 entity-graph foundational decisions.

**Recommended: A.** Rationale: 1.5c expansion produces 5 strategic decisions worth logging. The numbering Jake committed to in nwrp43 is the right amount. Recording them as 1.5c's outcomes preserves the audit trail for future "why did we go terminology-first?" questions. If Q1-Q15 produce more than 5 lockable decisions, extend D-056+.

### Q10. **TD-20 / TD-23 / TD-24 fix-in-flight or defer?**

11 prototypes lift to production routes in 1.5c. 6 of them have NwButton bypass (TD-20). Vendors + Contract + Plan stubs + Owner-Portal/Draws missing audit timelines (TD-23, TD-24). findings.md TD-20 explicitly says: "Fix before lifting any prototype to production route."

**Options:**
- A: **Fix all in 1.5c.** TD-20 (NwButton) + TD-23 (audit timelines on vendor/contract/plan) + TD-24 (audit timeline on owner-portal/draws) + TD-25 (Card padding) + TD-26 (fontWeight 600) + TD-27 (nw-direction-headline) + TD-21 (rgba inline) + TD-22 (Money component) all addressed during prototype-component extraction (Q4=A). Adds ~1.5-2 days to budget.
- B: Fix only TD-20 (the explicit "before lifting" call). Defer TD-21-27 to Wave 1.1-Lite polish.
- C: Defer all to Wave 1.1-Lite; production routes ship with TD violations carried forward.

**Recommended: A.** Rationale: TD-20 is a hard precondition (findings.md verbatim). TD-23/24 (missing audit timelines) violate the gold-standard pattern (Document Review = file preview + right-rail + audit timeline). Shipping production routes that don't extend the gold standard is **architecturally incoherent.** Fix all during the Q4=A extraction work — these TD items are bundled with the prototype-component refactor anyway. Budget impact: ~1.5 days; budget remains 5-7 days because TD work overlaps with the extraction.

### Q11. **Multi-modal ingestion in 1.5c — confirm structure-only?**

Principle 5 mentions email-in, voice, video, photos. Part 7 doesn't mention these for 1.5c. Confirm.

**Options:**
- A: **1.5c is structure-only.** Voice/video/email-in routing is F3+ work. Placeholders read "Coming F3 — voice/video punchlist with AI extraction."
- B: 1.5c includes a single ingestion-stub route (e.g., `/jobs/[id]/punchlist` with file-upload placeholder) to validate IA shape.
- C: 1.5c includes `/jobs/[id]/punchlist`, `/jobs/[id]/daily-logs`, `/jobs/[id]/photos`, `/jobs/[id]/rfis` per-job tab placeholders all describing future ingestion patterns.

**Recommended: C.** Rationale: structure-only IS the goal, but the IA can't be evaluated unless every per-job tab from Part 4 has a placeholder. Per-job More dropdown items (Documentation, Coordination, Tasks, Time, Permits, People, Activity, Closeout, Warranty, Pre-Con) all need stubs. C provides the full IA picture without doing F3 work. Each stub is ~30 LOC.

### Q12. **Profile-based feature flags in 1.5c — confirm placeholder only?**

Principle 8 + D-047 mention profile-based feature flags. Part 7 F mentions `/admin/profile`. Confirm.

**Options:**
- A: **1.5c stops at the placeholder.** `/admin/profile` shows a stubbed selector ("Custom Builder / Remodeler / Commercial GC — coming F2"). No actual filtering happens; nav structure same for all profiles.
- B: 1.5c implements minimal profile-based hiding (custom_builder shows Pipeline section; remodeler hides Pipeline). Configured via Ross-Built default = custom_builder.
- C: 1.5c implements full profile selection + reads from `org_settings`. F2 just expands the role/permission matrix on top.

**Recommended: A.** Rationale: Principle 8 is canonical; D-047 records the decision. But IMPLEMENTATION is F2. 1.5c placeholder describes the future; F2 wires it. Mixing implementation into 1.5c blurs the "structure only" promise. Confirm placeholder posture.

### Q13. **M3 phone walk — same device per CONTEXT D-31, or new device for 1.5c?**

CONTEXT D-31 locks M3 phone gate as iPhone+Safari. Stage 1.5b is gated on M3 walk (currently pending). 1.5c also tests mobile. Same gate or new?

**Options:**
- A: **Same M3 device + walk done once for both 1.5b + 1.5c.** Jake walks 1.5b prototypes AND 1.5c production routes (the same components, different paths) in one phone session before 1.5b ship.
- B: 1.5c carves separate M3 walk after 1.5b ship.
- C: M3 not required for 1.5c — IA mini-phase is structural; mobile testing goes to Wave 1.1-Lite when surfaces have real workflows.

**Recommended: A.** Rationale: 1.5c's production routes mount the same components 1.5b's prototype routes do (per Q4=A). One walk validates both. Sequencing per Part 9: 1.5c lands first, Jake walks new IA, 1.5b ships with new IA in place. The walk happens once, after 1.5c executes. Pragmatic.

### Q14. **Wave 1.1 → Wave 1.1-Lite vs Wave 1.1-Full naming**

findings.md §9 references "Wave 1.1 polish backlog" with 22+ items. Part 6 splits Wave 1.1 into Wave 1.1-Lite (RB usable) and Wave 1.1-Full (later). Where does the existing polish backlog land?

**Options:**
- A: **Existing Wave 1.1 backlog (TD-20 through TD-35 and friends) → Wave 1.1-Lite scope.** Polish items are mechanical and orthogonal to RB-going-live. Polish is also fast (~3-5 days work). Bundle into Wave 1.1-Lite gate.
- B: Existing Wave 1.1 backlog → Wave 1.1-Full. Wave 1.1-Lite is purely "wire to real backend, ship to Ross Built." Polish lands later.
- C: Split — TD-20 (NwButton bypass blocking promotions) + TD-23/24 (missing audit timelines) → Wave 1.1-Lite. Cosmetic polish (TD-25/26/27/F-W2-3) → Wave 1.1-Full.

**Recommended: A.** Rationale: Wave 1.1-Lite is "Ross Built actively using Nightwork." Diane + PMs notice missing audit timelines and inline rgba. Polish items are 5-day work; absorbing them into Wave 1.1-Lite avoids "we shipped to RB but it has X visible bugs." Wave 1.1-Full = future-tenant onboarding hardening, not RB-polish. **Special case:** if Q10=A and TD-20/21/22/23/24 land in 1.5c, Wave 1.1-Lite scope shrinks to TD-25/26/27/28 + F-W2-* items + the 22 backlog items not yet listed.

### Q15. **Ross Built profile = custom_builder — does 1.5c hide pre-con prominently?**

Principle 8 says custom builders see pre-con prominently, remodelers see it lighter, commercial GCs see RFIs/submittals prominent.

**Options:**
- A: **1.5c shows full nav for all roles with no profile-based filtering.** All profiles see same Pipeline section (with Estimates / Bids out / Proposals / Contracts as placeholders). F2 adds profile-based hiding.
- B: 1.5c hardcodes Ross-Built-as-custom_builder. Pipeline section shows full subitems. Remodeler/commercial profiles N/A in 1.5c; F2 adds them.
- C: 1.5c includes a placeholder profile selector at `/admin/profile` with NO filtering effect. Same nav for all profiles. F2 wires filtering.

**Recommended: C.** Rationale: combined with Q12=A (placeholder only). Principle 8 is canonical; implementation is F2. 1.5c describes the eventual posture without performing the filtering. Custom_builder is Ross Built's profile — but this is a default, not a wired filter. F2 wires.

---

## 7. Recommended scope expansion

**Stated:** Jake's nwrp43 dispatch — Stage 1.5c IA mini-phase (5-7 days) implementing 8-section top nav + section placeholders + per-job sub-nav + Today screen + Owner Portal/Sub Portal entries + Admin section + Platform Admin badge + canonical documentation, all sequenced before /gsd-ship of stage-1.5b-prototype-gallery.

**Recommended phase scope:**

1. **Top nav restructure to 8 sections + Admin dropdown + Platform Admin badge + Notifications bell + User menu.** Replace `nav-bar.tsx` `NavItemKey` union from 5-item to 8-item; rebuild ACCESS map data-driven for F2 expansion to 15 roles; mobile hamburger orders all 8 + Admin + User menu (Q5=A); Notifications bell + Platform Admin badge stay top-right pinned. (~1 day)

2. **Bills + Pay Apps full terminology rename in production paths + UI labels + audit-log action strings** (Q1=A). `/financials/bills`, `/financials/pay-apps`, `/financials/lien-releases`, `/financials/change-orders`, `/financials/payments`, `/financials/aging`. Legacy paths `/invoices`, `/draws`, `/cost-intelligence/*` 301-redirect via `next.config.js` redirects rule. (~1.5 days)

3. **Per-job sub-nav scaffold** with primary tabs (Overview / Schedule / Budget / Selections / Bills / Pay Apps / More ▾) and More dropdown (Documentation / Coordination / Tasks / Time / Permits / People / Activity / Closeout / Warranty / Pre-Con). Phase-aware visibility skeleton (hardcoded `phase: "active"` for now). Role-aware visibility skeleton (hardcoded role for now). (~1 day)

4. **Today screen scaffold at `/today`** (Q7=A). Three-section layout: "Your Day" placeholder ("Coming F3 — personalized daily plan"), Action Items (org-wide queues from existing `/api/dashboard`), Activity Feed. **Move** Cash Flow + Getting Started to `/company/overview` (Q6=C). (~1 day)

5. **60-90 placeholder routes** organized by section per Part 3. Each placeholder uses Site Office tokens — eyebrow (section name), headline (feature name), 2-3 sentence body, Wave badge ("Coming F1 / F2 / Wave 1.1-Lite / Wave 2 / Wave 3 / Wave 4"). Per-job More dropdown items (RFIs / Submittals / Daily Logs / Photos / Punchlist / etc.) covered (Q11=C). (~1.5 days)

6. **Production routes for 1.5b prototypes via thin-wrapper extraction** (Q4=A). Refactor 11 prototype components to accept fixture data as props (T10c-clean separation). Production paths: `/financials/bills/[id]`, `/financials/pay-apps/[id]`, `/financials/pay-apps/[id]/print`, `/jobs/[id]/budget`, `/jobs/[id]/schedule`, `/people/vendors`, `/people/vendors/[id]`, `/jobs/[id]/documents/[id]`, `/owner-portal`, `/owner-portal/pay-apps/[id]`, `/jobs/[id]/mobile-approval`, `/financials/reconciliation`. Existing `/design-system/prototypes/*` paths stay as portfolio with thin wrappers re-importing same components with fixture data. Concurrently fix TD-20 (NwButton), TD-21 (rgba), TD-22 (Money), TD-23 (vendor + contract + plan audit timelines), TD-24 (owner-portal/pay-apps audit timeline), TD-25 (Card padding), TD-26 (fontWeight 600), TD-27 (nw-direction-headline) (Q10=A). (~2-3 days)

7. **Owner Portal (production at `/owner-portal/*`, same auth + role gate)** (Q2=A) and **Sub Portal 3-stub structure** at `/sub-portal`, `/sub-portal/magic/[token]`, `/sub-portal/public/[token]` (Q3=B). Each stub describes future-state with Wave badge. (~0.5 day)

8. **Admin section restructure** at `/admin/*`: settings overview / users / roles / permissions / org-chart / approval-workflows / notification-rules / cost-codes / templates / integrations / billing / workflow-customization / profile (Q12=A: placeholder only). Existing `/settings/*` routes 301-redirect. (~0.5 day)

9. **Platform Admin badge** top-right for Jake/Andrew (existing platform_admins query); links to `/platform-admin` placeholder. Existing `/admin/platform` redirects. (~0.25 day)

10. **Canonical documentation** atomic update:
    - `.planning/architecture/ARCHITECTURE.md` (NEW) — 8 principles + data graph model + section purposes + revised phase plan
    - `.planning/architecture/ENTITY-INVENTORY.md` (NEW) — 31 entities catalog with brief descriptions
    - `.planning/architecture/ROLES-CATALOG.md` (NEW) — 15+ roles + permission scopes
    - `.planning/architecture/INGESTION-ARCHITECTURE.md` (NEW) — multi-modal ingestion + AI extraction patterns
    - `CONTEXT.md` (UPDATE) — 8 principles canonical, role-aware as architectural requirement, knowledge graph as F1 deliverable
    - `MASTER-PLAN.md` (UPDATE) — D-040 through D-055 (Q9=A); CURRENT POSITION; rewrite NEXT PLANNED WORK with revised roadmap (Stage 1.5c → F1 → F2 → ... → Wave 1.1-Lite)
    - `.planning/design/PHILOSOPHY.md` (UPDATE) — Today as home pattern, role-aware filtering pattern, multi-modal ingestion pattern
    - `.planning/design/PATTERNS.md` (UPDATE) — placeholder treatment patterns, role-filtered nav patterns, phase-aware sub-nav patterns
    - **CLAUDE.md UPDATE** — add Bills/Pay Apps terminology to "Data Model" + invoice → bill / draw → pay-app references. (~1 day)

11. **next.config.js redirects rule for legacy paths** (32 renames per §1.2). Build + typecheck pass; T10c hook silent; tenant-blind hook silent; bouncy-easing hook silent; privacy gate clean. (~0.5 day)

12. **M3 phone walk + visual walk** combined with 1.5b ship gate (Q13=A) — Jake walks new IA on iPhone+Safari + desktop before 1.5b ships. (Jake-time, not budget time.)

**Total estimated executor time: 6-8 days** — slightly above the 5-7 day target due to Q4=A + Q10=A bundling. Recommend committing to 7-day target with explicit stop-rule: if items 6+10 take >4 days, halt and consult Jake on what to defer.

**Out of scope (deferred):**
- F1 schema migrations (knowledge graph entity model) — F1 phase
- F2 role expansion (4-role to 15-role) and permission matrix wiring — F2 phase
- F2 phase-aware per-job logic (skeleton ships, logic deferred) — F2 phase
- F2 profile-based feature flag wiring (placeholder ships, filtering deferred) — F2 phase
- F3 magic link infrastructure — F3 phase
- F3 multi-modal ingestion routing (email-in, voice, video) — F3+ phase
- F4 time tracking + equipment + expenses — F4 phase
- F5 Price Intel cross-pollination engine — F5 phase
- F6 Pay Apps assembled-from-data engine — F6 phase
- Wave 2+ entity creation (Schedule, Daily Logs, Punchlist, RFIs, Submittals, Photos, Documents) — Wave 2 phase
- Wave 1.1 polish backlog beyond TD-20/21/22/23/24/25/26/27 — Wave 1.1-Lite phase (Q14=A)
- Mobile bottom-fixed tabs (Q5=C alternative) — defer to Wave 1.1-Lite
- Real-backend wiring for production routes (Q8=A) — F1
- Renaming `/dashboard` → `/today` server-side redirect chain only; old dashboard path 301s to `/today`. KEEP existing dashboard component until F2 personalization.

**Acceptance criteria target (preview — final criteria locked in /gsd-discuss-phase):**
- [ ] 8-section top nav implemented (`Today | Pipeline | Jobs | Financials | Price Intel | People | Company | Reports`) + Admin dropdown + Platform Admin badge + Notifications bell + User menu
- [ ] Mobile hamburger orders all 8 nav items + Admin + User menu (Q5=A)
- [ ] Site Office tokens applied (UPPERCASE eyebrows, JetBrains Mono 0.18em tracking, 1px slate-tile left-stamp on cards, 150ms ease-out motion)
- [ ] All 32 legacy paths 301-redirect to canonical (validated via curl or middleware test)
- [ ] Bills / Pay Apps terminology consistent across UI labels + route paths + activity-log action strings + new fixture string content (Q1=A)
- [ ] 60-90 placeholder routes render with eyebrow + headline + body + Wave badge per Part 3
- [ ] Per-job sub-nav primary tabs + More dropdown render with skeleton phase + role logic
- [ ] Today screen at `/today` with Your Day placeholder + Action Items + Activity Feed; `/` redirects to `/today`
- [ ] Cash Flow + Getting Started moved from dashboard to `/company/overview` (Q6=C)
- [ ] 11 production routes mount 1.5b prototype components via thin-wrapper extraction; T10c hook silent
- [ ] Owner Portal at `/owner-portal/*` accessible; Sub Portal 3 stubs at `/sub-portal`, `/sub-portal/magic/[token]`, `/sub-portal/public/[token]`
- [ ] Admin section restructured at `/admin/*` (13 placeholders + redirected `/settings/*`)
- [ ] Platform Admin badge for Jake/Andrew → `/platform-admin` placeholder
- [ ] TD-20 NwButton bypass fixed for all 6+ lifted prototypes; TD-21/22/23/24/25/26/27 fixed
- [ ] ARCHITECTURE.md / ENTITY-INVENTORY.md / ROLES-CATALOG.md / INGESTION-ARCHITECTURE.md created
- [ ] CONTEXT.md / MASTER-PLAN.md / CLAUDE.md / PHILOSOPHY.md / PATTERNS.md updated atomically
- [ ] D-040 through D-055 logged in MASTER-PLAN.md DECISIONS LOG
- [ ] Build passes (`npm run build`); typecheck clean (0 errors in src/); test suite passes
- [ ] Hooks silent: T10c sample-data isolation, tenant-blind primitives, bouncy-easing, post-edit Forbidden tokens
- [ ] Privacy 4-tier gate clean (32-token denylist 0 hits)
- [ ] M3 phone walk gate passes — Jake walks new IA on iPhone+Safari (Q13=A; combined with 1.5b ship gate)
- [ ] /nightwork-plan-review iter-1 passes
- [ ] /nightwork-qa post-execute passes with no CRITICAL findings

---

## 8. Risks and assumptions

| # | Risk / assumption | Mitigation |
|---|---|---|
| R1 | Q4=A (thin-wrapper extraction) takes longer than estimated; pushes budget past 7 days | Front-load extraction work in early days. If extraction unfit at day 3, halt and consult Jake on dropping placeholder count or terminology rename scope. |
| R2 | Bills / Pay Apps full rename (Q1=A) introduces audit-log action-string drift; existing audit_log rows have `invoice_*` actions but new rows write `bill_*` | Decision: keep historical action strings AS-IS (no migration); new writes use new action strings; UI labels read both as same surface. Document rationale. F1 may consolidate via migration. |
| R3 | T10c hook blocks production-routes that import prototype components without prop-drill refactor | Q4=A explicitly addresses this. Validate via test run before sequencing the rename PR. |
| R4 | M3 phone walk surfaces NEW issues in lifted production routes that were not surfaced in 1.5b prototype walk | Q13=A bundles walks. If new issues, log to Wave 1.1-Lite (Q14=A scope). |
| R5 | nwrp43 Part 6 enumerates D-040 through D-050 but says D-040 through D-055 — Q9 resolves but Jake may want to preserve placeholder D-051+ for future phases | If Jake prefers Q9=B (delete reserved 5), accept; the 5 1.5c outcomes can be D-051 through D-055 anyway since they are sequential. |
| R6 | Per-job tab `/jobs/[id]/budget` already exists but `/jobs/[id]/schedule` is prototype-only — no current production route. 1.5c production-mounts schedule, but underlying Wave 2 schema does not exist | Schedule production route reads Caldwell fixture (per Q4=A); F1+ creates schema; F-Wave 2 wires real data. Same posture as Bills/Pay Apps — production path with prototype data. Document on placeholder. |
| R7 | Q10=A (fix all TD items) discovers more deeply-rooted prototype issues during refactor (e.g., Card padding="lg" embedded in component templates) — scope creep | Time-box TD work to 1.5 days; if exceeded, halt and partial-defer to Wave 1.1-Lite. |
| R8 | Existing `/dashboard` route keeps existing component; only `/today` mounts new layout | Sequenced: 1.5c renames `/dashboard` → `/today` redirect (no component change yet); F2 swaps in role-personalized component. Mitigates dashboard component complexity in 1.5c. |
| R9 | 60-90 placeholder routes is approximate — final count may diverge | Plan-phase deriving from Part 3 + Part 4 will produce exact count. Not a budget risk; pages are ~30 LOC each. |
| A1 | Assumption: Jake approves Q1=A (full Bills/Pay Apps rename) | If Jake picks Q1=B or Q1=C, scope shrinks ~1-1.5 days. |
| A2 | Assumption: Q10=A bundles TD work into 1.5c | If Jake picks Q10=B or Q10=C, scope shrinks ~1-1.5 days but 1.5b ship may need TD-20 fix anyway. |
| A3 | Assumption: existing `useCurrentRole()` hook handles 4 roles cleanly; expansion to 15 roles is F2 work | F2 expansion mechanically extends the hook — 1.5c does not refactor the hook itself. |
| A4 | Assumption: `next.config.js` redirects rule sufficient for 32 legacy paths (vs middleware) | Validated by existing `/cost-intelligence` paths having no redirects today. New static redirects are the right tool. |
| A5 | Assumption: existing platform_admin gating in middleware:98 covers Platform Admin badge logic | Verified inline. New badge component reuses `useCurrentRole()` + supabase platform_admins query already at nav-bar.tsx:170-176. |
| A6 | Assumption: Caldwell fixtures support all per-job placeholders (e.g., `/jobs/[id]/punchlist` placeholder needs no fixture; `/jobs/[id]/schedule` needs schedule_items fixture which exists) | Verified — sanitize-drummond.ts produces 25 schedule_items + 30 budget_lines + 7 invoices + 5 draws etc. Sufficient for all production routes. Placeholder routes need no fixture. |
| A7 | Assumption: M3 walk on iPhone+Safari catches mobile chrome priority issues | If Q5=A (hamburger expands all 8) is wrong on phone, log to Wave 1.1-Lite. M3 gate is "Jake walks" not "Jake approves" per CONTEXT D-31. |

---

## 9. Hand-off

After Jake approves this expansion (or amends it):
- `/nightwork-auto-setup stage-1.5c-information-architecture` runs (creates phase directory, branch `phase/1.5-c-ia-restructure`, copies template files, writes SETUP-COMPLETE.md)
- Then `/np stage-1.5c-information-architecture` for plan generation
- Then `/nightwork-plan-review iter-1` — architect, planner, enterprise-readiness, multi-tenant-architect, scalability, compliance, security, design-pushback agents review the plan
- Jake reviews plan iteration
- Then `/nx execute` — preflight 10-check gate runs, then `/gsd-execute-phase` proceeds
- After 1.5c executes onto `phase/1.5-c-ia-restructure`, Jake walks new IA on desktop + iPhone Safari
- Then `/gsd-ship stage-1.5b-prototype-gallery` picks up new IA in place
- Then `/gsd-ship stage-1.5c-information-architecture`

**Halt point per nwrp43 Part 9 step 4:** orchestrator halts at this artifact for Jake review. No setup, no plan generation, no execution before Jake's approval signal.

---

*End of EXPANDED-SCOPE.md*
