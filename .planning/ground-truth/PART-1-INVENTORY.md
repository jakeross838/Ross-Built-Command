# GROUND-TRUTH-VERIFICATION — PART 1 INVENTORY (Stage 1 of 3)

**Date:** 2026-05-29
**Source state:** local HEAD `acbfa06` (current main). Production canonical alias `https://nightwork-platform.vercel.app` → `dpl_EW1JKqFcKZVJxAZsozPbXNqLLhY8` (`x14j6jhg5`), post-Phase-1 + listener-off baseline.
**Verification baseline:** listener-off (Phase-1 × listener interaction bug separately tracked at `.planning/tech-debt/TD-WB-LISTENER-PHASE1-INTERACTION.md`; nothing in this inventory is interpreted as "broken because of that bug" — those are flagged separately).
**Tier posture:** HIGH (system-spanning verification). Bootstrap-under-existing-pipeline because `tiering-implementation` hasn't shipped. After tiering ships, GTV becomes a retrospective validation case per nwrp256 §3.
**Sequencing:** GTV (c) → interaction-bug (a) → tiering-implementation (b), locked per nwrp256 §4 + MASTER-PLAN §12.
**Scope this stage:** Stage 1 inventory only. Stages 2 + 3 (per-flow verification + synthesis) re-authorized after this stage's halt-gate.
**Stage 1 ceiling:** $60. Estimated mid-stage spend at draft: ~$22-25 (well within ceiling).

---

## Stage 0 — preconditions (verified before inventory work)

### 0.1 Production state verified

| | |
|---|---|
| Canonical alias | `https://nightwork-platform.vercel.app` → `dpl_EW1JKqFcKZVJxAZsozPbXNqLLhY8` (`x14j6jhg5`) |
| Source | HEAD `acbfa06` (post-Phase-1) |
| `NEXT_PUBLIC_AUTH_STATE_LISTENER` (Production) | absent (mitigation in place) |
| `NEXT_PUBLIC_AUTH_STATE_LISTENER` (Preview) | `true` (preserved for bisect — nwrp251) |
| 6 `NEXT_PUBLIC_FEATURE_*` flags (Production + Preview) | `""` (empty — encrypted, per SETUP-COMPLETE.md MANUAL §1). Empty `!== "true"` → all six feature flags HIDE. |

### 0.2 Smoke jobs sanity (critical Stage-0 finding)

**Smoke Job Alpha/Beta/Gamma/Delta/Epsilon/Zeta/Eta/Theta/Iota/Kappa are NOT in the Ross Built org.** They live in a separate `Verification Harness Fixture Org` (slug `fixture-harness-org`, id `00000000-0000-0000-0000-fb1ce0a55e55`) created via migration 00092/00093 + `scripts/fixtures/smoke-seed.sql` (Wave-D D-4).

Why Jake sees them in the sidebar: he's `platform_admin` per migration 00048, with cross-org `SELECT` via migration 00049. The "ALL 25 JOBS" sidebar badge = 15 Ross Built active jobs + 10 fixture-org active jobs.

Fixture org composition (10 active members + 10 active jobs):
- 1 `owner`: `smoke-owner@nightwork.local` (`00000000-0000-0000-0002-000000000001`)
- 1 `admin`: `harness-fixture@nightwork.local` (`5eb26edc-5989-477f-ac42-d1e9264db0e2`)
- 7 `pm`: `smoke-pm-alpha@nightwork.local` .. `smoke-pm-eta@nightwork.local` (`00000000-0000-0000-0002-000000000002..0008`)
- 1 `accounting`: `smoke-accounting@nightwork.local` (`00000000-0000-0000-0002-000000000009`)

**Implication for Stage 2 (per nwrp256 §1):**
- Read-only adversarial probes on Ross Built jobs (Drummond/Fish/Markgraf/Clark/etc.) — use Jake's Ross Built owner session. Safe.
- Write-testing on smoke jobs — requires fixture-org user login. Jake's Ross Built session blocks writes via RLS by design. **Stage 2A entry-gate must provision a fixture-org login flow** (smoke-owner / smoke-pm-* / smoke-accounting credentials). Recommend reading `scripts/fixtures/smoke-seed.sql` for credential setup + extending the SmokeAuthHelper design from tiering doc §3 for this purpose.

### 0.3 Other orgs in the database

| org_id | name | active jobs | active members | notes |
|---|---|---|---|---|
| `00000000-0000-0000-0000-000000000001` | Ross Built Custom Homes | 15 | 9 | Primary tenant |
| `60a3e876-6b69-45ad-8b3d-62baed96d501` | QA Test Company | 0 | 1 | Empty test org (could be cleaned up at custodian's discretion) |
| `c0a42420-509d-4d2c-b789-0d6e3ce17519` | 8j Test Company | 0 | 1 | Empty test org (similar) |
| `00000000-0000-0000-0000-fb1ce0a55e55` | Verification Harness Fixture Org | 10 | 10 | Harness fixture; safe for write-testing |

---

## Part 1.1 — Route map (203 routes)

### 1.1.0 Classification scheme

Per nwrp256 §5 (premise-verification per CLAUDE.md Rule 10): routes classified as `(a) live + wired to real backend` require runtime test on the listener-off baseline. Stage 1 produces **(a)-CANDIDATE** classifications (code-read evidence only); runtime verification of these candidates is proposed for **Stage 1.5** (per-route authed walk, batched via Chrome MCP or Jake's incognito walks).

Other classifications (b/c/d/e) are derivable from code + middleware reads — no runtime test required:

- **(a)-CANDIDATE — live + wired (RUNTIME-PENDING)** — page has supabase/fetch calls and renders real data when those calls resolve. Classification UPGRADES to **(a)-VERIFIED** at Stage 1.5 after runtime walk. Until then, do NOT treat as "known working."
- **(b) partial/stubbed** — page has SOME code (form, partial UI) but is incomplete or stubbed in obvious ways (e.g., TODO comments at critical state transitions, mocked data).
- **(c) scaffold/placeholder** — no data calls; static "Coming F<N>" or "Placeholder" content; rendered for IA structure but no behavior.
- **(d) feature-flag-hidden (via nav)** — route exists and is reachable by direct URL, but the nav-bar / section-overview filter hides the link in current state. Direct-URL access still works.
- **(e) middleware-404'd** — `src/middleware.ts:212-336` intercepts the request and returns 404 (rewrite to `/_not-found`) on direct URL. The route file may exist but is unreachable.

Important: a single route can have multiple classifications. The most-restrictive applies (e > d > b > c > a-candidate). All 6 NEXT_PUBLIC_FEATURE_* flags are `""` on Production right now, so all middleware feature-flag gates fire. PEOPLE is hardcoded HIDE regardless of flag.

### 1.1.1 Middleware-404'd in current state (e) — 46 routes

Per `src/middleware.ts:255-336`. Direct URL → 404. Direct evidence: middleware.ts file:line. No runtime test needed.

**OWNER_PORTAL gate** (`src/middleware.ts:255-262`, flag empty → fires):
- `src/app/owner/[token]/page.tsx` — anon homeowner pay-app view
- `src/app/owner/[token]/pay-apps/[id]/page.tsx` — anon pay-app detail

NOT gated by middleware (separate routes under `/owner-portal/`, not `/owner/`):
- `src/app/owner-portal/page.tsx`
- `src/app/owner-portal/pay-apps/[id]/page.tsx`
- **Finding — Q1.1.1A:** these two routes look like Owner Portal staging surfaces but the OWNER_PORTAL middleware gate only covers `/owner/*` and `/api/owner-portal/*`. **`/owner-portal/*` is NOT middleware-gated.** Unclear if intentional (admin-only Owner Portal preview?) or oversight. Surface for Stage 1.5 / Stage 2A.

**PIPELINE gate** (lines 264-269): 6 routes
- `pipeline/page.tsx`, `pipeline/{bids-out,contracts,estimates,leads,proposals}/page.tsx`

**COMPANY gate** (lines 271-276): 13 routes
- `company/page.tsx`, `company/{capacity-planning,cash-flow,compliance,documents,expenses,fleet-equipment,insurance,overview,p-l,permits-licensing,tax,time-tracking}/page.tsx`

**REPORTS gate** (lines 278-283): 6 routes
- `reports/page.tsx`, `reports/{ai-builder,custom-builder,saved,scheduled,templates}/page.tsx`

**PEOPLE hardcoded gate** (lines 285-292): 6 routes
- `people/page.tsx`, `people/{clients,org-chart,team}/page.tsx`, `people/vendors/page.tsx`, `people/vendors/[id]/page.tsx`

**PRICE_INTEL_F5 gate** (lines 294-313): 7 sub-routes
- `price-intel/{anomaly-review,bid-comparison,cost-database,material-orders,selections-catalog,vendor-performance,verification}/page.tsx`

**FINANCIALS_F1_VIEWS gate** (lines 321-335): 4 routes
- `financials/{change-orders,purchase-orders,reconciliation}/page.tsx`, `jobs/[id]/schedule/page.tsx`

**Total (e) — 44 routes** (excluding `/owner-portal/*` Q1.1.1A).

### 1.1.2 Code-classified as (c) scaffold/placeholder — 88 routes

Pages with no supabase/fetch calls that aren't middleware-gated (excluding section-overview pages — see 1.1.3). Rendered for IA structure; no behavior.

**Per section breakdown** (after removing (e) routes):

| Section | (c) count | Notes |
|---|---|---|
| `design-system/*` | 25 | All design-system playground routes. Gated to `platform_admin` in production via `src/middleware.ts:362-408`. Includes `/design-system/prototypes/*` (12 prototype pages with sample data — IA reference) and `/design-system/components/*` + `/design-system/{forbidden,palette,patterns,philosophy,typography}/*` (design docs). |
| `jobs/[id]/*` | ~17 | Most per-job sub-tabs are placeholder pages: `closeout`, `daily-logs`, `documents`, `internal-billings`, `lien-releases`, `pay-apps`, `permits`, `photos`, `plans`, `pre-con`, `punchlist`, `rfis`, `selections`, `specs`, `submittals`, `team`, `time-entries`, `to-dos`, `warranty`. Per Phase 1 nav reduction (T4) only `overview / budget / bills / pay-apps` are in PRIMARY_TABS; `change-orders / purchase-orders / activity` in More dropdown; rest are reachable by direct URL but hidden from per-job nav. |
| `cost-intelligence/*` | 5 | Legacy duplicate of `price-intel/*`. Per `next.config.mjs:83-88` `/cost-intelligence/*` 308-redirects to `/price-intel/*`. So source files exist but are unreachable. **Finding — Q1.1.2A: dead-code candidates — 5 legacy cost-intelligence pages exist with placeholder content; redirects route to `/price-intel/*`. Should they be deleted?** |
| `settings/*` | 6 | Legacy duplicate of `admin/*`. Per `next.config.mjs:115-125` `/settings/*` 308-redirects to `/admin/*`. Files exist but unreachable. **Finding — Q1.1.2B: similar dead-code — 6 legacy settings pages; should they be deleted?** |
| `sub-portal/*` | 3 | Subcontractor portal placeholder (`sub-portal/page.tsx`, `sub-portal/magic/[token]/page.tsx`, `sub-portal/public/[token]/page.tsx`). Not in launch scope. (c) — no data calls. |
| `nw-test` | 1 | Internal test page; not in launch scope. |
| `operations` | 1 | Stale `/operations` route; 308-redirected to `/today` per `next.config.mjs:79-80`. Dead code. |
| `financial` | 1 | Stale `/financial` (singular) — 308-redirected to `/financials` per `next.config.mjs:71`. Dead code. |
| `financials/*` | ~7 | After excluding 3 middleware-gated F1 views, remaining placeholder-class are section-overview Cards (see 1.1.3). |
| Other | ~23 | Mixed |

**Total (c) — ~88 routes**, of which 12 are 308-redirect dead-code candidates (`cost-intelligence/* + settings/* + operations + financial`).

### 1.1.3 Section overview pages — (d) section-filtered or (a)-CANDIDATE

The 8 section roots (`today/page.tsx`, `jobs/page.tsx`, `financials/page.tsx`, `price-intel/page.tsx`, `pipeline/page.tsx` [e], `company/page.tsx` [e], `reports/page.tsx` [e], `people/page.tsx` [e]) + 6 admin section roots fall into a special class. Per Phase 1 T5, each section overview page filters its SECTIONS Card grid by `tile.live` or `isFeatureEnabled(...)`.

**Live section roots (4):**
- `today/page.tsx` — Action Items + Activity Feed widgets. **(a)-CANDIDATE** — has supabase calls. Runtime test required.
- `jobs/page.tsx` — 25 jobs list (platform_admin cross-org view). **(a)-CANDIDATE** — calls `/api/jobs/health` + supabase. Runtime test required.
- `financials/page.tsx` — 5-Card overview after F1 filter (Bills, Pay Apps, Payments, Lien Releases, Aging). Mostly static Card grid with route links; one supabase call for pending count. **(a)-CANDIDATE**.
- `price-intel/page.tsx` — re-exports `/cost-intelligence` working surface (per `src/app/price-intel/page.tsx:21`). **(a)-CANDIDATE**.

**Admin overview (1):**
- `admin/page.tsx` — Card grid filtered to 4 live tiles (Users, Cost Codes, Billing, Owner Portal Tokens) per Phase 1 T5. Per CLAUDE.md "Admin dropdown vs /admin section overview" D-060: this is the canonical admin destination. **(a)-CANDIDATE**.

### 1.1.4 (a)-CANDIDATE routes — 73 routes with supabase/fetch calls (RUNTIME-PENDING)

Per Stage 1 ceiling, code-read classification only. **Runtime verification proposed for Stage 1.5** (per modification 5).

**Section breakdown** (from `grep -lE 'supabase\.|fetch\(/api/|await supabase'`):

| Section | (a)-candidates | Launch-critical? | Stage 1.5 priority |
|---|---|---|---|
| `admin/*` | 16 | Mixed | HIGH for `users`, `cost-codes`, `billing`, `owner-portal-tokens`; MEDIUM for rest |
| `jobs/*` | 12 | YES — primary financial-core surfaces | HIGH for `[id]/overview`, `[id]/budget`, `[id]/bills`, `[id]/pay-apps`, `[id]/change-orders`, `[id]/purchase-orders`, `[id]/activity`, `jobs/page.tsx`, `jobs/new` |
| `platform-admin/*` | 11 | Operator surface (Jake/Andrew) | MEDIUM — not launch-critical for Diane/PMs but used by Jake |
| `cost-intelligence/*` | 7 | Dead-route family (308 to price-intel); but ROOT `/cost-intelligence` IS the actual working surface re-exported by `/price-intel`. **Finding — Q1.1.4A: confusing — `/cost-intelligence/*` redirects to `/price-intel/*` per next.config.mjs, but `price-intel/page.tsx:21` re-exports `/cost-intelligence` page logic. Need to verify which is actually rendered at `/price-intel`.** | HIGH (price intel core) |
| `invoices/*` | 6 | YES — invoice review is the gold-standard pattern per CLAUDE.md | HIGH for `[id]/page.tsx`, `[id]/qa/page.tsx` |
| `settings/*` | 4 | Dead-route family (308 to admin) | LOW (verify redirect targets work; source pages dead) |
| `draws/*` | 3 | YES — draw wizard | HIGH for `new/page.tsx` |
| `vendors/*` | 2 | Dead-route family (308 to people/vendors which is hardcoded HIDE) | LOW |
| `signup` | 1 | YES — onboarding | MEDIUM |
| `proposals` | 1 | Proposal review | MEDIUM |
| `pricing` | 1 | Marketing/landing | LOW |
| `onboard` | 1 | YES — first-time setup | MEDIUM |
| `login` | 1 | YES — auth entry | HIGH |
| `forgot-password` | 1 | Auth recovery | MEDIUM |
| `financials` (root) | 1 | YES — section overview | HIGH |
| `dashboard` | 1 | 308-redirects to `/today` | LOW (verify redirect) |
| `change-orders/[id]` | 1 | YES — CO detail | HIGH |
| `today` | 1 | YES — landing | HIGH |
| `company` (root) | 1 | Middleware-404'd (e) | — |
| `page.tsx` (root `/`) | 1 | Marketing landing for anon; redirect for authed | MEDIUM |

**Stage 1.5 proposed runtime-verification set (launch-critical (a)-CANDIDATES — 21 routes):**

1. `/` (root — anon marketing vs authed redirect)
2. `/login`
3. `/today`
4. `/jobs` (list)
5. `/jobs/[id]` (overview — pick a real job, e.g., Drummond)
6. `/jobs/[id]/budget`
7. `/jobs/[id]/bills`
8. `/jobs/[id]/pay-apps`
9. `/jobs/[id]/change-orders`
10. `/jobs/[id]/purchase-orders`
11. `/jobs/[id]/activity`
12. `/jobs/new` (wizard)
13. `/financials` (section overview)
14. `/financials/bills` (Bills queue)
15. `/financials/pay-apps` (Pay Apps list)
16. `/invoices/[id]` (canonical invoice review — gold standard pattern)
17. `/invoices/[id]/qa` (QA queue)
18. `/draws/new` (draw wizard)
19. `/change-orders/[id]` (CO detail)
20. `/price-intel` (root — re-exported cost-intelligence working surface)
21. `/admin` + `/admin/cost-codes` + `/admin/users` + `/admin/billing` + `/admin/owner-portal-tokens` (4 live admin tiles)

Estimated cost for Stage 1.5: ~$15-25 (Chrome MCP browser walk of 21 routes + observation capture). Can run inline if Jake authorizes at halt-gate, OR Jake walks them himself and reports.

### 1.1.5 Summary count by classification

| Class | Count | % | Notes |
|---|---|---|---|
| (e) middleware-404'd | 44 | 22% | Phase 1 HIDE work + hardcoded PEOPLE |
| (c) scaffold/placeholder | ~88 | 43% | Includes 12 dead-code-from-redirects |
| (a)-CANDIDATE (runtime-pending) | 73 | 36% | Stage 1.5 verifies subset of launch-critical |
| (b) partial/stubbed | ~unknown | — | Discovered during Stage 1.5 walks or Stage 2 testing |
| (d) feature-flag-hidden (via nav, NOT middleware) | TBD | — | Mostly subsumed by (e) since all flags are empty; (d) only distinct if a route is hidden from nav but reachable + working by direct URL. Sub-portal + design-system playground fit this; rest are (e). |

**Total: 203 routes. (e) + (c) > 60% of route surface = static/hidden. The launch-active surface is ~73 (a)-CANDIDATE routes, of which ~21 are launch-critical for Stage 1.5 verification.**

---

## Part 1.2 — Feature-flag state

| Flag | Production value | Preview value | Behavior in current state | Gated routes |
|---|---|---|---|---|
| `NEXT_PUBLIC_FEATURE_OWNER_PORTAL` | `""` (empty) | `""` (empty) | HIDE — middleware-404 fires | `/owner/*`, `/api/owner-portal/*` (NOT `/owner-portal/*` — Q1.1.1A) |
| `NEXT_PUBLIC_FEATURE_PIPELINE` | `""` | `""` | HIDE | `/pipeline*` (6 routes) |
| `NEXT_PUBLIC_FEATURE_COMPANY` | `""` | `""` | HIDE | `/company*` (13 routes) |
| `NEXT_PUBLIC_FEATURE_REPORTS` | `""` | `""` | HIDE | `/reports*` (6 routes) |
| `NEXT_PUBLIC_FEATURE_PRICE_INTEL_F5` | `""` | `""` | HIDE | 7 specific price-intel sub-routes |
| `NEXT_PUBLIC_FEATURE_FINANCIALS_F1_VIEWS` | `""` | `""` | HIDE | `/financials/{change-orders,purchase-orders,reconciliation}`, `/jobs/[id]/schedule` |
| (hardcoded) PEOPLE | n/a | n/a | HIDE | `/people*` (6 routes) — un-hides at F2/Wave-2 via code change |
| `NEXT_PUBLIC_AUTH_STATE_LISTENER` | **absent** | `true` | listener-OFF on Prod (mitigation); ON on Preview | `src/hooks/use-current-role.ts:67-102` |

**Cross-reference vs locked launch scope** (`.planning/launch/INTERNAL-LAUNCH-SCOPE-LOCKED.md`):
- ✅ Financial core visible (Bills + Pay Apps + Payments + Lien Releases + Aging on `/financials` overview).
- ✅ Owner Portal hidden (OWNER_PORTAL flag empty + middleware gate fires).
- ✅ ~50 placeholders hidden (44 middleware-404 + ~6 effective via section-overview filtering).
- ✅ Schedule + Selections hidden (FINANCIALS_F1_VIEWS gates schedule; selections is per-job and not in PRIMARY_TABS).
- ⚠️ Integrations deferred — `/admin/integrations` is a placeholder (c), reachable via direct URL. Acceptable as deferred per scope but not hidden.
- ⚠️ Q1.1.1A — `/owner-portal/*` routes exist but aren't middleware-gated. Possible Owner Portal leak via direct URL. Needs Stage 1.5 verification.

---

## Part 1.3 — Schema inventory

### 1.3.1 Table count + tenant scoping

108 migrations in `supabase/migrations/` (latest `00108_b4_clients_full_name_trgm_index.sql`). Public schema has **60 base tables**:
- **52 tables have `org_id`** (tenant-scoped per CLAUDE.md Architecture Rules).
- **8 tables have NO `org_id`** (cross-tenant or system tables): `canonical_cost_codes`, `cost_code_templates`, `organizations`, `owner_portal_rate_limit`, `platform_admin_audit`, `platform_admins`, `support_messages`, `unit_conversion_templates`.

The 8 no-org_id tables match expected exemptions per CLAUDE.md Architecture Rules:
- `organizations` — primary tenant root.
- `platform_admins` + `platform_admin_audit` — cross-tenant operator infra per CLAUDE.md Platform-admin section.
- `canonical_cost_codes`, `cost_code_templates`, `unit_conversion_templates` — global templates seeded once.
- `owner_portal_rate_limit` — per-token rate-limit; scoped via `client_portal_access` join.
- `support_messages` — joins to `support_conversations` per Q10b child-of-user-scoped rule (CLAUDE.md Architecture Rules → Child entity scope-axis rule).

No anomalies in tenant scoping at the table level.

### 1.3.2 Ross Built org row counts (launch-critical entities)

Query against Ross Built org_id `00000000-0000-0000-0000-000000000001`:

| Table | Rows | Status | Notes |
|---|---|---|---|
| `jobs` | 15 | ✅ Populated | Real Ross Built jobs (Drummond, Fish, Markgraf, Clark, etc.) |
| `clients` | 14 | ✅ Populated | F1-Wave-B Slice-1 B-1a-bis migration 00100 + 00101 backfill |
| `vendors` | 24 | ✅ Populated | Real vendor list (SmartShield, Florida Sunshine Carpentry, Doug Naeher Drywall, etc.) |
| `budget_lines` | 288 | ✅ Populated | ~19 lines/job avg |
| `cost_codes` | 218 | ✅ Populated | Canonical 5-digit Ross Built set per CLAUDE.md Data Model |
| `org_cost_codes` | 12 | ✅ Sparse | Per-org custom codes; mostly using canonical |
| `change_orders` | 88 | ✅ Heavily populated | Real PCCO history (sample: PCCO #72 -$557, #71 +$2600, #70 +$2485.65 — Drummond Pay App 8 lineage) |
| `change_order_lines` | 0 | ⚠️ EMPTY | Header-only; COs don't decompose into line items in Ross Built workflow. **NOT a bug** — `change_orders.amount + gc_fee_amount + total_with_fee` is the source of truth. |
| `invoices` | 57 | ✅ Populated | Real invoice history; mix of statuses |
| `invoice_line_items` | 119 | ✅ Populated | ~2 lines/invoice avg |
| `invoice_allocations` | 52 | ✅ Populated | Per F1-Wave-A Plan A-4 (org-scoped child table per Q10b) |
| `document_extractions` | 133 | ✅ Populated | AI parsing run more times than invoices created (extractions outnumber invoices — some don't become invoice records; expected for unmatched/duplicate/rejected parses) |
| `draws` | 3 | ✅ Sparse | The "Draw in Draft 41d / 39d" Action Items reference these |
| `draw_line_items` | 16 | ✅ Sparse | ~5-6 lines/draw |
| `draw_adjustments` | 0 | ⚠️ EMPTY | No adjustments made yet. May indicate the adjustment feature is built but unused, or not used because no draws are revised. Stage 2E verifies. |
| `lien_releases` | 0 | 🚨 **EMPTY — launch-blocker candidate** | Per AIA workflow lien releases are MANDATORY at every draw. Ross Built has 3 draws and 0 lien releases. Either (a) the feature isn't built, (b) the feature exists but isn't wired, (c) Ross Built tracks them outside Nightwork still. **Finding — Q1.3.2A: lien_releases is the most surprising empty in the launch-critical set. Needs Stage 2E investigation.** |
| `purchase_orders` | 0 | 🚨 **EMPTY** | Ross Built has 0 POs. PO functionality may not be in use in Ross Built workflow (the PO table + FKs exist, but no records). **Finding — Q1.3.2B: PO surface in launch scope was marked HIDE for org-wide views (FINANCIALS_F1_VIEWS gate) but per-job PO UI is visible. With 0 POs, what does the per-job PO surface show? Empty state? Stage 2D investigates.** |
| `po_line_items` | 0 | ⚠️ EMPTY | Follows from purchase_orders = 0 |
| `proposals` | 1 | ✅ Sparse | One proposal — single test record or genuine first proposal. |
| `proposal_line_items` | 7 | ✅ Sparse | 7 lines for the one proposal. |
| `pricing_history` | 126 | ✅ Populated | F5-Lite price intel data source |
| `items` | 61 | ✅ Populated | Items catalog (cost intelligence canonical list) |
| `vendor_item_pricing` | 7 | ⚠️ Sparse | Vendor pricing for items; thin. Stage 2B price intel verifies. |
| `selections` | 0 | ⚠️ EMPTY | Selection categories exist (13) but no selections recorded. Per locked scope selections is HIDDEN (per-job tab dropped); empty is expected. |
| `selection_categories` | 13 | ✅ Populated | Selection schema seeded |
| `profiles` | 9 | ✅ Populated | Matches org_members count |
| `org_members` | 9 | ✅ Populated | 9 members in Ross Built (per CLAUDE.md Team & Roles: 2 admin + 1 owner + 4 accounting + 6 PM = 13 intended; current = 9. Diff: some roles not yet provisioned; some may not yet be active accounts) |
| `org_invites` | 0 | ⚠️ EMPTY | No pending invites |
| `org_workflow_settings` | 1 | ✅ One row | Org-level workflow config |
| `notifications` | 78 | ✅ Populated | In-app notification history |
| `email_inbox` | 0 | ⚠️ EMPTY | Email intake not yet wired; per CLAUDE.md "Phase 4" |
| `job_milestones` | 0 | ⚠️ EMPTY | No milestones tracked; Wave-2 feature |
| `activity_log` | 63 | ✅ Populated | Cross-entity event log |

### 1.3.3 EMPTY tables — interpretation

Empty doesn't always mean broken. Categorization:

| Status | Tables | Why empty |
|---|---|---|
| Expected empty (HIDE / future wave) | `email_inbox`, `job_milestones`, `selections`, `org_invites`, `draw_adjustments` | Features are HIDE in launch scope OR genuinely unused |
| Header-only by design | `change_order_lines` | COs don't decompose; not a bug |
| **Launch-critical empty (Q1.3.2A)** | `lien_releases` | Per AIA workflow MANDATORY at every draw. 0 with 3 draws = workflow gap. |
| **Surprising empty (Q1.3.2B)** | `purchase_orders`, `po_line_items` | PO feature exists in code but not used. Workflow choice or PO UI broken? |

---

## Part 1.4 — Data-model spine

Launch-critical entity FK graph (verified live via `information_schema.table_constraints` query):

```
                    organizations (root tenant)
                          |
                          | org_id (52 child tables)
                          ↓
        ┌────────────────────────────────────────────────────────┐
        |                                                        |
       jobs ──── pm_id → profiles                          clients
        |                                                        ↑
        |   ┌─ client_id ───────────────────────────────────────┘
        |   |
        |   ↓
        ├─ budget_lines ─── cost_code_id → cost_codes
        |       ↑
        |       | budget_line_id (multiple back-refs)
        |       |
        ├─ purchase_orders ── cost_code_id → cost_codes
        |       |             vendor_id → vendors
        |       |             budget_line_id → budget_lines
        |       |             co_id → change_orders
        |       ↑
        |       | po_id (back-ref)
        |       |
        ├─ change_orders ── source_invoice_id → invoices
        |       |          source_proposal_id → proposals
        |       ↑
        |       | (back-refs from invoices.co_id, invoice_allocations.change_order_id,
        |       |  draw_line_items.change_order_id, change_order_lines.co_id,
        |       |  proposals.converted_co_id)
        |       |
        ├─ invoices ── vendor_id → vendors
        |       |     cost_code_id → cost_codes
        |       |     po_id → purchase_orders
        |       |     co_id → change_orders
        |       |     assigned_pm_id → profiles
        |       |     draw_id → draws  ← invoice IS in a draw
        |       |     parent_invoice_id → invoices (self, for revisions)
        |       |     duplicate_of_id → invoices (self, for dedupe)
        |       |     import_batch_id → invoice_import_batches
        |       ↑
        |       ├─ invoice_line_items ── cost_code_id, ai_suggested_cost_code_id,
        |       |                        budget_line_id, po_id
        |       └─ invoice_allocations ── cost_code_id, change_order_id
        |
        ├─ draws ── parent_draw_id → draws (self, for Rev N)
        |       ↑
        |       ├─ draw_line_items ── budget_line_id, change_order_id, internal_billing_id
        |       └─ draw_adjustments ── draw_line_item_id, affected_invoice_id, affected_vendor_id
        |
        ├─ lien_releases ── vendor_id, po_id, draw_id
        |
        ├─ proposals ── source_document_id → document_extractions
        |       |       superseded_by_proposal_id → proposals (self)
        |       |       converted_co_id → change_orders
        |       |       converted_po_id → purchase_orders
        |       |       vendor_id → vendors
        |       ↑
        |       └─ proposal_line_items ── cost_code_id, org_cost_code_id, canonical_code_id, item_id
        |
        ├─ document_extractions ── invoice_id → invoices  (parser writes here first; invoice created on PM approve)
        |
        ├─ job_milestones (empty — Wave-2)
        |
        └─ activity_log ── actor_token_id → client_portal_access
                          (universal cross-entity event log)
```

### 1.4.1 FK spine verdict

**The FK relationships are real, not aspirational.** Every CLAUDE.md Data Model entity has matching FK constraints in live PG schema (verified). Notable observations:

1. **Universal `job_id` parent** confirmed across 7 launch-critical child tables (budget_lines, change_orders, draws, invoices, lien_releases, proposals, job_milestones). Matches CLAUDE.md Architecture Rule "`job_id` is universal parent."
2. **Self-referential FKs** for revision semantics:
   - `invoices.parent_invoice_id` — revision chain
   - `invoices.duplicate_of_id` — dedupe pointer
   - `draws.parent_draw_id` — Rev N chain (locked draws revise via new row)
   - `proposals.superseded_by_proposal_id` — proposal versioning
3. **PO + CO inter-dependency** — `purchase_orders.co_id` (PO created FROM a CO) + `change_order_lines.created_po_id` (CO line generated a PO). Bidirectional. With 0 POs in Ross Built, these FK paths are exercised by zero rows.
4. **Lien release linkage** — `lien_releases.draw_id` + `lien_releases.po_id` + `lien_releases.vendor_id` + `lien_releases.job_id`. The schema supports the AIA workflow correctly. The EMPTY table (Q1.3.2A) is the data-not-feature gap.
5. **Activity log** — single tenant-scoped event log with token-FK for anon owner-portal actions. Consistent with CLAUDE.md Workflow posture Q12 codification.
6. **Document extraction → invoice path** — `document_extractions.invoice_id` is nullable (extractions can exist without becoming invoices). Matches `133 extractions > 57 invoices` ratio in Ross Built.

### 1.4.2 Schema vs CLAUDE.md Data Model deviations

CLAUDE.md "Data Model — Full Entity Map" describes a `budgets` parent table; per its own caveat ("**No `budgets` parent table.** Budgets are derived from line items + change orders, not stored as entities… per Q10c (F1 umbrella EXPANDED-SCOPE) the scaffolded `budgets` table was dropped in migration 00095"). Verified: no `budgets` table in current schema. ✓

No other deviations found at the table-level spine.

---

## Part 1.5 — Drift vs prior grounding-pass inventory

Per nwrp255 directive: "diff against [the days-old inventory]; call out where reality has drifted from that doc."

The grounding-pass inventory (`.planning/grounding-pass/GROUNDED-INVENTORY.md`, commit `022182c` from 2026-05-26) was authored pre-Phase-1. Diffs:

| Aspect | Grounding pass (May 26) | Current state (May 29) | Drift |
|---|---|---|---|
| Phase 1 HIDE | Not yet shipped | Shipped + nav at 4 sections + middleware-404 fires | **Drift: 44 routes newly 404'd** |
| Nav structure | 8 sections | 4 sections + Admin dropdown | Drift |
| W.1 listener | OFF in source | Source listener code unchanged; Prod env var REMOVED (mitigation); Preview env var still `true` | **Drift: env-var divergence** |
| smoke-jobs | Present in fixture-harness-org | Same 10 jobs | No drift |
| Ross Built jobs | 15 active | 15 active (same) | No drift |
| ROW COUNTS (sample) | Not captured comprehensively in grounding pass | This doc captures | Drift = baseline established |
| TD-WB-LISTENER-UNFLAG | Open / observation window | Status `ROLLED-BACK-INVESTIGATING`; subsumed by TD-WB-LISTENER-PHASE1-INTERACTION | Drift |

**Verdict:** the grounding-pass inventory is structurally still valid for IA/scope, but the Phase 1 ship + interaction-bug debug introduced 3 substantive drifts. This PART-1-INVENTORY.md supersedes the grounding pass as the current snapshot of route + schema state.

---

## Findings + open questions surfaced by Stage 1

Tracked as Q1.N.NN; each routes to Stage 1.5 (runtime verification) or Stage 2 (flow verification) for closure.

| ID | Finding | Routes to | Severity |
|---|---|---|---|
| **Q1.1.1A** | `/owner-portal/*` (2 routes) exist but middleware OWNER_PORTAL gate covers only `/owner/*` and `/api/owner-portal/*`. **Possible Owner Portal leak via direct URL.** | Stage 1.5 (visit + verify 404 OR auth gate; if rendered, escalate Stage 2A) | **HIGH** if leakable; LOW if internal admin staging |
| **Q1.1.2A** | 5 legacy `cost-intelligence/*` placeholder pages exist; 308 redirects route them away. Dead code candidates. | Custodian (out of scope this phase) | LOW (cleanup) |
| **Q1.1.2B** | 6 legacy `settings/*` placeholder pages exist; 308 redirects route them away. Dead code candidates. | Custodian (out of scope this phase) | LOW (cleanup) |
| **Q1.1.4A** | `price-intel/page.tsx:21` re-exports `cost-intelligence/page.tsx`. But `next.config.mjs:83` redirects `/cost-intelligence` → `/price-intel`. Which file is actually rendered at `/price-intel`? Possible re-export of a redirected route. | Stage 1.5 (visit + read source) | MEDIUM (could be working-but-confusing or broken) |
| **Q1.3.2A** | `lien_releases` = 0 rows with `draws` = 3. AIA workflow requires lien releases at every draw. Either feature unbuilt, unwired, or tracked outside Nightwork. | Stage 2E (draws + pay apps flow) | **HIGH** — possible launch-blocker for full AIA workflow |
| **Q1.3.2B** | `purchase_orders` = 0 in Ross Built. PO feature has full FK graph + code surfaces but no records. Workflow choice (POs not used) vs feature broken. | Stage 2D (POs + COs flow) | MEDIUM — depends on whether Ross Built actually uses POs |

## Out of scope for this stage

- Runtime verification of any (a)-CANDIDATE — proposed for Stage 1.5 entry-gate per modification 5.
- Adversarial probes — Stage 2 only.
- Real-data ingestion assessment — Part 3 (Stage 2 territory per scoping).
- Per-flow behavior testing — Stage 2A-2F.
- API route mapping — deliberately scoped out for this stage (focus on UI/page routes + schema). If Stage 2 needs API-route ground truth, propose as Stage 2 entry-gate addition.

## Cost actual + Stage 2 entry proposal

**Stage 1 actual spend (estimated):** ~$22-30 (under the $60 ceiling, well within Rule 7d $50 per-plan halt threshold).

Breakdown:
- Route enumeration + grep classification: ~$3-5
- Schema queries (supabase MCP) + FK trace: ~$5-8
- Smoke-job sanity Stage 0: ~$2-3
- Drift comparison: ~$1-2
- Document drafting: ~$10-15

**Proposal for halt-gate decision (Jake):**

Three queued sub-stages, each with halt + re-authorize:

### Stage 1.5 — Runtime verification of launch-critical (a)-CANDIDATEs (proposed)

Authed walk of 21 launch-critical routes (per 1.1.4 list) on `https://nightwork-platform.vercel.app` (listener-off baseline). Each route: confirm renders real data (or empty-state) without hang; capture observed widgets; classify final (a)-VERIFIED / (b) partial / (c) actually-empty.

- **Ceiling:** $25 (within $50 per-plan halt)
- **Mechanism:** Chrome MCP browser automation, authed via your owner-role session. OR you do the walk and I capture into the doc.
- **Output:** appended to this PART-1-INVENTORY.md as section 1.6 "Runtime verification results."
- **Halt-gate:** after Stage 1.5, surface Q1.1.1A + Q1.1.4A findings + any per-route surprises, then re-authorize Stage 2A.

**Recommendation:** Jake walks the 21 routes incognito-authed himself and reports observations. Cheaper + you catch UX surprises a mechanical walk misses. I append findings to this doc.

### Stage 2A — Invoice/bill flow (proposed; requires Stage 1.5 close first)

Per nwrp256 §2: per-flow ceiling $30 (per-plan halt-trigger at $50 absent here). Adversarial scope per nwrp256 §1: read-only against Ross Built; write-testing requires fixture-org login (Stage 2A entry-gate provisions this).

Stage 2A entry-gate:
1. Fixture-org login flow set up (credentials from `scripts/fixtures/smoke-seed.sql` — verify what passwords are set OR generate via Supabase admin API).
2. Q1.1.1A resolved (Owner Portal leak check).
3. Stage 1.5 (a)-VERIFIED outcomes recorded.

---

## Status

**STAGE 1 COMPLETE.** Awaiting Jake's call on:

1. Stage 1.5 (runtime verification of 21 launch-critical routes) — authorize? Walk yourself or have me drive Chrome MCP?
2. Q1.1.1A `/owner-portal/*` middleware-leak check — should this also block Stage 2 if it leaks?
3. Q1.3.2A lien_releases empty — proceed to Stage 2E or treat as Part 3 (data ingestion) territory?
4. Any reframing of the (a)-CANDIDATE vs runtime-verified classification — does modification 5 require I block ALL 73 (a)-CANDIDATES from "live" until walked, or just the 21 launch-critical subset?
5. Stage 2A entry gates as specified — fixture-org login provisioning timing.

Production state at Stage 1 close (2026-05-29 mid-day): `https://nightwork-platform.vercel.app` → `dpl_EW1JKqFcKZVJxAZsozPbXNqLLhY8` (`x14j6jhg5`), post-Phase-1 + listener-off. No changes made by this phase to source, env vars, or deploys.
