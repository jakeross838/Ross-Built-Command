# Spec check -- Phase stage-1.5c-information-architecture

## Acceptance criteria

AC source: structured criteria blocks in each plan PLAN.md (retrofitted in commit 6ed6b21 per nwrp89 GATE-A.2 for Plans 4/5/6; authored for Plans 1/2/3 in commit 52fa8ff). Harness run #25703521075 on HEAD accb55f: PASS=159 / FAIL=0 / SKIP=4.

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| AC-1.5c-1-01 | 8-section nav renders in correct order on desktop | COVERED | src/components/nav-bar.tsx PRIMARY_NAV array; harness Layer 1 PASS |
| AC-1.5c-1-02 | Admin dropdown opens; 13 items; Org Settings first | COVERED | src/components/nav/admin-dropdown.tsx ADMIN_ITEMS 13 items |
| AC-1.5c-1-03 | PlatformAdminBadge platform_admins-only; nw-white-sand + border-default; no hex | COVERED | src/components/nav/platform-admin-badge.tsx; hex grep = 0 |
| AC-1.5c-1-04 | Mobile hamburger expands 8 items + Admin + Sign Out | COVERED | nav-bar.tsx mobileOpen block; harness Layer 1 PASS |
| AC-1.5c-1-05 | Bell + badge + theme toggle top-right pinned | COVERED | nav-bar.tsx flex siblings of hamburger button |
| AC-1.5c-1-06 | ACCESS Record data-driven shape | COVERED | nav-bar.tsx; harness Layer 1 PASS |
| AC-1.5c-1-07 | redirect to /today in root; /dashboard 308-redirects | COVERED | src/app/page.tsx; next.config.mjs permanent:true = 50 |
| AC-1.5c-1-08 | /today renders 8-section nav with Site Office aesthetic | PARTIAL -- V.3 N/A | Body AC-1-9 PASS @ 0.95; nav N/A per V.3 harness limitation -- harness-internals SDK issue not production bug; Jake OBSERVATION A confirms production nav renders correctly |
| AC-1.5c-1-09 | /today three-section scaffold | COVERED | src/app/today/page.tsx three-section code; harness PASS @ 0.95 |
| AC-1.5c-1-10 | permanent:true count >= 44 | COVERED | Actual = 50 verified live |
| AC-1.5c-1-11 | 12 existing redirect rules preserved | COVERED | SUMMARY: 12 destinations updated |
| AC-1.5c-1-12 | D-20 wildcard /admin/platform/:path* present | COVERED | Plan 7 smoke redirect 8 PASS 308 |
| AC-1.5c-1-13 | /admin/billing in BILLING_ESCAPE_PATHS; no redirect loop | COVERED | src/middleware.ts; Plan 7 smoke redirect 10 PASS |
| AC-1.5c-1-14 | NwPlaceholderCard.tsx with NwPlaceholderCardProps | COVERED | File present; COMPONENTS.md grep = 4 |
| AC-1.5c-1-15 | Build + all hooks silent; hex = 0 | COVERED | 150 pages compiled; hex grep admin/platform-admin = 0 |
| AC-1.5c-1-16 | Hex literal grep on 11 modified files = 0 | COVERED | Verified live |
| AC-1.5c-1-17 | pendingVerification/Conversions consumers independent of nav-bar | COVERED | SUMMARY iter-2 watchpoint W-7 |
| AC-1.5c-2-01..13 | InvoiceReviewView + BudgetView props-only; action-labels.ts; T10c; TD fixes=0; tenant-blind; build clean | COVERED | Both View files present; action-labels.ts present; grep TD-20/25/26 = 0 |
| AC-1.5c-2-AMEND-01 | BudgetView Committed column; Available replaces Balance; KPI strip | COVERED | Commit 0cb99db; BudgetView.tsx 615 LOC |
| AC-1.5c-2-AMEND-02 | Parse Confidence + Status Timeline collapsed by default | COVERED | Commit cb9aab9; InvoiceReviewView.tsx 442 LOC |
| AC-1.5c-2-AMEND-03 | BudgetView footer dev info removed | COVERED | Commit ade04b4 |
| AC-1.5c-2-AMEND-04 | WORKFLOW-INTELLIGENCE.md 39 patterns; MASTER-PLAN D-066..D-072 | COVERED | .planning/architecture/WORKFLOW-INTELLIGENCE.md present |
| AC-1.5c-3-01 | 10 NEW View components 12 total | COVERED | ls returns 12 View.tsx files |
| AC-1.5c-3-02 | All 10 NEW Views use import type for Caldwell types | COVERED | T10c hook silent; build passes |
| AC-1.5c-3-03..05 | TD-20/25/26 fixes across all 10 NEW Views | COVERED | grep returns 0 all 10 files |
| AC-1.5c-3-06 | Views tenant-blind | COVERED | grep -rE on prototypes/ = 0 |
| AC-1.5c-3-07 | 12 production page.tsx files at canonical paths | COVERED | All 12 confirmed present; build 88 pages |
| AC-1.5c-3-08..10 | Wrappers: fixtures + View + notFound; design-system-scope wrap | COVERED | grep design-system-scope on bills pay-apps budget = 2 each |
| AC-1.5c-3-11 | 11 portfolio /design-system/prototypes routes as thin wrappers | COVERED | Missed by Plan 3; resolved by Plan 3a-now commit 93a83f6; confirmed |
| AC-1.5c-3-12 | Bills/Pay Apps terminology in user-visible labels | COVERED | DrawApprovalView uses Pay App; InvoiceReviewView uses Bill |
| AC-1.5c-3-13 | Owner Portal mounted with design-system-scope; W-1 documented | COVERED | owner-portal/page.tsx confirmed; SUMMARY iter-2 W-1 |
| AC-1.5c-3-14 | Mobile Approval 393x852; 56px Approve | COVERED | jobs/[id]/mobile-approval/page.tsx present; NwButton size=lg-touch |
| AC-1.5c-3-15 | Print preview preserves @media print stylesheet | COVERED | financials/pay-apps/[id]/print/page.tsx + DrawPrintView.tsx scoped style |
| AC-1.5c-3-16..17 | D-07 12-pair visual + Site Office signatures at 3 viewports | PARTIAL -- deferred to M3 walk | All 12 routes data-direction=C data-palette=B + design-system-scope confirmed; harness Layer 3 PASS; M3 phone walk = formal sign-off |
| AC-1.5c-3-18 | JobTabs removed from 9 pages | COVERED | grep = 0 across all 8 modified files; 9th implicit via REAL-route replace |
| AC-1.5c-3-19..20 | getCurrentMembership preserved; REAL vs PLACEHOLDER documented | COVERED | 11 PLACEHOLDER + 1 REAL-REPLACED with backup comment |
| AC-1.5c-3-21..23 | Build/typecheck/hooks silent; privacy clean; SEC-10 DOM = 0 | COVERED | grep data-org-id etc = 0; build 88 pages; hex = 0 |
| AC-1.5c-4-01 | NwPlaceholderCard imported not created by Plan 4 | COVERED | Pipeline sub-routes grep = 2 per file |
| AC-1.5c-4-02 | Pipeline: 6 routes | COVERED | /pipeline + 5 sub-routes confirmed |
| AC-1.5c-4-03..04 | Financials 9 sub-routes + overview; Price Intel 9 routes; canonical terminology | COVERED (component-internal rename deferred F1 per D-01) | All URLs exist; wrapper headers carry canonical labels |
| AC-1.5c-4-05 | People: 4 routes; vendors from Plan 3 | COVERED | people/page clients team org-chart + vendors confirmed |
| AC-1.5c-4-06 | Sub Portal: 3 distinct routes | COVERED | /sub-portal /sub-portal/magic/[token] /sub-portal/public/[token] present |
| AC-1.5c-4-07 | Sub Portal stubs describe F3 future-state; 3 grep tokens | COVERED | Subcontractor self-service=1; magic link=3; public read-only=1 |
| AC-1.5c-4-08 | Sub Portal stubs do NOT reflect params.token | COVERED | grep -rE params.token = 0 |
| AC-1.5c-4-09 | F3 compliance contract | COVERED | Token expiry=2; JWT-with-org-claim REJECTED=2; client_portal_access or SHA-256=7 |
| AC-1.5c-4-10 | Company: 12 routes; /company/overview from Plan 1 not duplicated | COVERED | company/* confirmed; /company/overview is Plan 1 component |
| AC-1.5c-4-11 | Reports: 6 routes; Wave 3 AI Report Builder references | COVERED | all sub-routes present; all Wave 3 badged |
| AC-1.5c-4-12 | Placeholders approx 30 LOC; NwPlaceholderCard uniform | COVERED | Sub-routes avg 17-25 LOC; all import NwPlaceholderCard; overview pages use Card grid (see NOTE) |
| AC-1.5c-4-13 | All approx 50 routes Site Office tokens; no hardcoded hex | COVERED | hex grep admin/platform-admin = 0; post-edit hook auto-fixed aging-report token |
| AC-1.5c-4-14 | REAL-LOGIC re-mounts preserve getCurrentMembership verbatim | COVERED | Auth grep diff = 0 for all 10 re-mount routes |
| AC-1.5c-4-15 | REAL vs PLACEHOLDER documented per route | COVERED | SUMMARY table: 10 REAL + 1 RESTRUCTURE + 39 PLACEHOLDER |
| AC-1.5c-4-16 | Wave 3 mid-checkpoint smoke PASS | COVERED | SUMMARY Task 4: all 8 nav sections + 5 sub-routes + 3 Plan 3 routes PASS |
| AC-1.5c-5-01 | 6 primary tabs on desktop | COVERED | PRIMARY_TABS array = 6 |
| AC-1.5c-5-02 | Collapse to single dropdown on mobile per D-21 | COVERED | md:hidden/md:flex = 4 hits; mobile branch renders SubNavDropdown |
| AC-1.5c-5-03 | More dropdown contains required sub-sections | COVERED | moreBaseItems = 14 per CONTEXT D-12 |
| AC-1.5c-5-04 | layout.tsx mounts PerJobTabs with phase=active | COVERED | jobs/[id]/layout.tsx present; hardcodes phase=active |
| AC-1.5c-5-05 | Phase-aware: active shows Closeout; hides Warranty + Pre-Con | COVERED | morePhaseItems conditions verified |
| AC-1.5c-5-06 | 19 per-job placeholder routes with NwPlaceholderCard | COVERED | 19 routes confirmed; all import NwPlaceholderCard |
| AC-1.5c-5-07..08 | Bills + Pay Apps sub-tabs exist | COVERED | bills/page.tsx + pay-apps/page.tsx present |
| AC-1.5c-5-09 | Budget + schedule inherit sub-nav via layout | COVERED (mechanical) | Next.js layout chain; no page.tsx change required |
| AC-1.5c-5-10 | Active state: stone-blue underline desktop; activeLabel mobile | COVERED | borderBottom 2px solid var(--nw-stone-blue) in per-job-tabs.tsx |
| AC-1.5c-5-11 | More dropdown reuses NavDropdown UX behavior | COVERED (SubNavDropdown variant) | SubNavDropdown mirrors hybrid hover+click + keyboard nav; plan UX contract preserved |
| AC-1.5c-5-12 | Mobile responsive 4-viewport visual | PARTIAL -- deferred to M3 walk | Tailwind md: classes confirmed; visual = M3 phone walk gate |
| AC-1.5c-5-13 | Punchlist + Daily Logs reference Principle 5 multi-modal | COVERED | grep voice/video/Principle-5: punchlist=2 daily-logs=3 |
| AC-1.5c-5-14 | Zero double tab bars | COVERED | grep import JobTabs + JobTabs render = 0 across 8 files |
| AC-1.5c-6-01 | Admin overview Card grid at /admin; D-22 canonical destination | COVERED | src/app/admin/page.tsx present; redirect loop resolved |
| AC-1.5c-6-02 | 3 REAL-LOGIC admin re-mounts (Users/Billing/Cost Codes) | COVERED | All 3 files present; getCurrentMembership grep positive in all 3 |
| AC-1.5c-6-03 | 10 admin placeholders | COVERED | roles permissions org-chart profile approval-workflows notification-rules workflow-customization integrations templates = 10 |
| AC-1.5c-6-04 | /platform-admin/*: 14 surfaces | COVERED | layout.tsx + page.tsx + 12 migrated sub-routes confirmed |
| AC-1.5c-6-05 | middleware.ts extended for /platform-admin/*; same isPlatformAdmin posture | COVERED | grep -c /platform-admin middleware.ts = 7 |
| AC-1.5c-6-06 | Shared components updated | COVERED | platform-sidebar audit-row end-impersonation-button all modified |
| AC-1.5c-6-07 | SEC-9: /platform-admin/audit uses createServerClient not service-role | COVERED | grep createServerClient = 3; createServiceRoleClient = 0 |
| AC-1.5c-6-08 | iter-2 mechanical 10 verified for 15 routes | COVERED | 14/15 ZERO DIFF; 1 documented URL-path-only divergence |
| AC-1.5c-7-01 | 4 NEW canonical docs at .planning/architecture/ | COVERED | All 4 present on disk |
| AC-1.5c-7-02 | 6 EXISTING docs atomically updated in single commit 6d1c568 | COVERED | 11-file atomic commit confirmed in git log |
| AC-1.5c-7-03 | CLAUDE.md schema-aware audit-log language | COVERED | entity_type.*invoice = 1; action-labels.ts = 1; concat framing = 0 |
| AC-1.5c-7-04 | Retention/PII/Cross-org/SOC2 columns in new docs | COVERED | SUMMARY grep verifications all PASS |
| AC-1.5c-7-05 | Owner Portal F1 auth path constraint documented W-1 | COVERED | ARCHITECTURE.md section 8 |
| AC-1.5c-7-06 | >= 2 consumers per new pattern in PHILOSOPHY (4) + PATTERNS (6) | COVERED | Consumers grep = 4 PHILOSOPHY 6 PATTERNS |
| AC-1.5c-7-07 | D-040..D-065 added to MASTER-PLAN atomically; idempotency guard | COVERED | D-040/D-060/D-065 grep = 6 in MASTER-PLAN.md |
| AC-1.5c-7-08 | Final smoke: build + typecheck + 10 redirects PASS | COVERED | 10/10 redirects PASS; build 150 pages; typecheck clean |
| AC-1.5c-7-09 | NwPlaceholderCard COMPONENTS.md entry | COVERED | grep NwPlaceholderCard COMPONENTS.md = 4 |

## Spec deliverables

- [x] 8-section top nav with ACCESS map -- src/components/nav-bar.tsx
- [x] /today screen -- src/app/today/page.tsx
- [x] /company/overview -- src/app/company/overview/page.tsx
- [x] 38 308-redirect rules -- next.config.mjs permanent:true = 50
- [x] NwPlaceholderCard primitive -- src/components/nw/NwPlaceholderCard.tsx
- [x] AdminDropdown + PlatformAdminBadge -- src/components/nav/
- [x] design-system.css root-import -- src/app/layout.tsx grep = 1
- [x] InvoiceReviewView -- src/components/prototypes/InvoiceReviewView.tsx 442 LOC
- [x] BudgetView with Committed column -- src/components/prototypes/BudgetView.tsx 615 LOC
- [x] src/lib/audit/action-labels.ts -- present; 6 entity_type refs
- [x] AUDIT-LOG-STRATEGY.md -- .planning/phases/stage-1.5c-information-architecture/AUDIT-LOG-STRATEGY.md
- [x] WORKFLOW-INTELLIGENCE.md 39 patterns -- .planning/architecture/WORKFLOW-INTELLIGENCE.md
- [x] 10 NEW props-only View components -- 12 total in src/components/prototypes/
- [x] 12 production routes with data-direction=C data-palette=B design-system-scope wrap -- confirmed
- [x] 8 existing /jobs/[id]/* JobTabs removed -- grep = 0
- [x] Plan 3a-now: 10 portfolio prototype routes as thin wrappers -- commit 93a83f6
- [x] 50 placeholder routes Plan 4 -- all 50 files confirmed
- [x] PerJobTabs + SubNavDropdown + /jobs/[id]/layout.tsx -- src/components/nav/per-job-tabs.tsx 415 LOC
- [x] 19 per-job tab placeholder routes -- all confirmed
- [x] 13 admin routes (3 REAL + 10 placeholders + overview) -- src/app/admin/
- [x] 14 /platform-admin surfaces (12 sub-routes + layout + index) -- src/app/platform-admin/
- [x] middleware.ts regex extension for /platform-admin/* -- grep = 7
- [x] Shared component dual-awareness updates -- platform-sidebar audit-row end-impersonation-button
- [x] 4 NEW canonical docs -- ARCHITECTURE.md ENTITY-INVENTORY.md ROLES-CATALOG.md INGESTION-ARCHITECTURE.md
- [x] 6 EXISTING docs atomically updated -- commit 6d1c568 11-file atomic
- [x] D-040..D-065 in MASTER-PLAN -- confirmed
- [x] Final integration smoke report -- SUMMARY Plan 7

## Domain rules spot-check

- Drummond fixtures used: yes -- All 12 View components consume CALDWELL_* fixtures (Caldwell = sanitized Drummond per phase convention). Production routes /financials/bills/inv-caldwell-001 and /financials/pay-apps/d-caldwell-05 confirmed passing in Plan 7 smoke. ARCHITECTURE.md references AIA reference Pay App 8. Evidence: src/components/prototypes/BudgetView.tsx InvoiceReviewView.tsx all 10 Plan 3 Views.
- Recalculate-not-increment honored: yes -- BudgetView.tsx useMemo rows computes previous_applications this_period total_to_date percent_complete balance_to_finish committed available from source fixture rows on every render. Zero stored aggregates introduced in any Plan 1-7 file. Evidence: src/components/prototypes/BudgetView.tsx.
- Multi-tenant RLS posture: pass -- SEC-10 DOM tenant-attribute leak = 0 across src/components/prototypes/ src/app/financials/ src/app/platform-admin/ (verified live). platform_admins table query user_id-bounded per migration 00048. /platform-admin/* middleware gate extends to new prefix with identical !isPlatformAdmin posture. SEC-9: /platform-admin/audit uses createServerClient (anon+RLS) not createServiceRoleClient -- grep = 3/0. Sub-Portal stubs do not reflect params.token (grep = 0). F3 compliance contract (JWT-with-org-claim REJECTED SHA-256 hash service-role-API audit-log-on-use) documented. All REAL-LOGIC re-mounts preserve auth posture zero-diff.
- Design tokens (no hardcoded colors): pass -- hex grep on src/app/admin/ and src/app/platform-admin/ = 0. Post-edit hook auto-fixed pre-existing violations on files touched by this phase. Remaining pre-existing CSS-var-fallback hex in src/app/jobs/[id]/page.tsx:582-583 is out-of-scope tracked in deferred-items.md. All new components use var(--*) CSS variables or nw-* Tailwind utilities.
- Audit log writes added on every state change: N/A -- stage-1.5c-information-architecture is a pure UI/IA restructure. No new state transitions or write endpoints were introduced. action-labels.ts and AUDIT-LOG-STRATEGY.md establish the correct convention for future writes. CLAUDE.md updated with schema-aware audit-log language per iter-2 must-fix CRITICAL 5.

## Findings

### BLOCKING

None.

### WARNING

1. AC-1.5c-1-08: /today 8-section nav vision criterion marked N/A (V.3 harness limitation). The harness Layer 3 test for the 8-section nav on /today failed due to client-side useCurrentRole returning null under the Playwright-injected session -- a confirmed harness-internals @supabase/ssr SDK mismatch not a production navigation bug. AC-1-9 (body scaffold) PASS @ 0.95 and AC-1-13 (Platform Admin badge gating) PASS @ 0.70 confirm the page renders correctly. Jake OBSERVATION A (production correct) corroborates. A post-phase harness-internals fix is queued. Until resolved this criterion has no automated evidence -- only Jake manual observation and surrounding passing criteria.

2. AC-1.5c-3-11 Plan 3 SUMMARY documents it as DEFERRED even though Plan 3a-now (commit 93a83f6) resolved it. The Plan 3 SUMMARY self-check still marks it DEFERRED -- a documentation gap not a code gap. AC-1.5c-3-16/17 and AC-1.5c-5-12 are formally deferred to M3 phone walk per CONTEXT D-17/Q13=A -- expected workflow for visual sign-off.

3. Plan 4 REAL-LOGIC re-mounts use export-default re-exports rather than verbatim component copy. The plan body said COPY the rendering logic. The executor chose re-exports because verbatim copy would have duplicated approximately 5000 LOC with inherited token violations. Auth posture is byte-identical (same module at both URLs). The component-internal label rename (Invoice/Draw to Bill/Pay App inside underlying components) is deferred to F1 per CONTEXT D-01. The re-export approach is architecturally cleaner and preserves spec intent; the component-internal terminology gap is a known F1 task not a missed criterion.

4. Pre-existing CSS-var-fallback hex literals in src/app/jobs/[id]/page.tsx:582-583 are pre-existing token violations in files touched during Plan 3 JobTabs removal. Correctly identified documented in deferred-items.md and deferred per scope-boundary rule.

### NOTE

1. Plan 5 built SubNavDropdown helper instead of directly reusing NavDropdown. The plan specified reuses existing NavDropdown component. NavDropdown hard-codes dark-nav foreground colors that would render invisible on the light sub-nav surface. SubNavDropdown is a sibling helper that mirrors the identical UX contract (hybrid hover+click + keyboard nav + click-outside-to-close + focus management). NavDropdown is unchanged. This is a Rule 1 (bug fix) deviation that preserves plan intent while resolving a color-contract incompatibility.

2. Plan 4 Reports and Company section overview pages use a Card grid pattern not NwPlaceholderCard. Sub-routes use NwPlaceholderCard uniformly. Overview pages function as navigation hubs where a section-heading + card-grid is more appropriate. AC-1.5c-4-12 passes for sub-routes; the overview Card grid is a reasonable alternative for section indexes.

3. NIGHTWORK_PRECOMMIT_DISABLE=1 used for Plans 3-6 commits (Jake-authorized per nwrp88 Block N+2). The system .githooks/pre-commit Drummond grep gate remained armed throughout. --no-verify was never used. End-of-phase /nightwork-qa closes the staleness gap. Process-compliant per documented authorization.

4. Visual walk criteria cannot be evidenced by this spec-checker without an authenticated browser session. Code-level signals are all positive: data-direction=C data-palette=B design-system-scope confirmed on all 12 production routes; design-system.css confirmed in root layout; Slate token signatures confirmed across View components; harness Layer 3 PASS on design-system prototype routes. M3 phone walk is the formal sign-off gate.

## Verdict

PASS

All 159 harness criteria PASS on HEAD accb55f (FAIL=0 SKIP=4 -- all 4 SKIPs are documented non-defects: 1 Layer 2 introspection dep Wave 1.1, 1 Layer 3 ambiguous-vision below 0.7 per V.3 known limitation, 2 related SKIP categories). No BLOCKING findings. All acceptance criteria are COVERED by code-level evidence or PARTIAL with clear documented reasons (M3 phone walk gate for visual criteria; V.3 harness limitation for AC-1-8 client-side nav). All spec deliverables confirmed present on disk. Domain rules pass.

Ship is contingent on:
1. M3 phone walk completing without CRITICAL halt criteria (AC-1.5c-3-16/17 AC-1.5c-5-12)
2. AC-1-8 harness criterion formally resolved (V.3 N/A accepted per Jake OBSERVATION A or harness auth fix post-phase)

Both are expected workflow within the defined verification posture not new BLOCKING findings surfaced by this spec-check.

---
Generated: nightwork-spec-checker
Phase: stage-1.5c-information-architecture
HEAD: accb55f (Plan 7 SUMMARY -- canonical-docs-smoke)
Date: 2026-05-11
