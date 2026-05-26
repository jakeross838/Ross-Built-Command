# Nightwork — Grounded Inventory

**Generated:** 2026-05-26
**Authorized by:** nwrp223 §10-44
**Source:** Live repo walk + Supabase migrations on disk + MASTER-PLAN.md ship log + design docs. Not memory.
**Posture:** Honest. No optimistic rounding. Plain language. No codenames (translated inline where used).
**Composition:** 4 parallel read-only inventory agents (A/B/C/D); their full reports live at `.planning/grounding-pass/A-D-*.md`.

---

## The Orchestrator Headline

Five things that stood out enough to flag before the section-by-section walk.

1. **The invoice flow is genuinely usable today with two workarounds.** Diane could start running real Ross Built invoices through this system tomorrow — minus email intake (she'd download then upload) and minus QuickBooks push (she'd dual-enter into QBO). Everything between those two bookends is wired and edge-cased: the gold-standard review screen, AI parse with math-mismatch detection, graduated over-budget gates, partial line splits, auto lien releases on draw submit, lock-aware editing matrix, full audit trail. The 2,234-line review page is not a prototype — it is the production-grade pattern the whole rest of the app is supposed to extend from. This is closer to "ship-ready with two integration gaps" than to "needs Phase 4 future work" as CLAUDE.md framed it.

2. **The nwrp223 framing on "pricing_history triggers from B-3" was incorrect — and price intelligence is substantially more built than the directive assumed.** B-3 (migration 00107, shipped 2026-05-22) is a soft-delete audit trigger that writes to the activity log; it has nothing to do with pricing. The actual pricing-history triggers are 3 phases older — migrations 00073 + 00077 (Phase 2.8 + Phase 3.1, shipped pre-Wave-B). And on top of those, a separate Wave 1A AI-extraction spine (`vendor_item_pricing` + items + aliases + verification queue + embeddings) is fully shipped with a working UI under `/cost-intelligence/*`. Cost lookup, items browser, verification queue, recent-learnings feed all work today. What's missing for "useful to PMs" is the inline "this invoice is 12% above your vendor's median for this cost code" flag on the invoice review screen — the data is there; the comparison logic isn't wired yet. Honest framing: **F5-Lite shipped; F5-Full ~60% complete.**

3. **Wave 1.1-Lite drift confirmed: Owner Portal was Wave 3 by the original on-disk plan.** The authored Wave 1.1 expansion document (April 2026) explicitly listed "Owner-portal invoice viewer" as Wave 3 scope, not Wave 1.1-Lite. Wave 1.1-Lite was supposed to be polish on the internal invoice flow Ross Built already uses. The drift happened by aggregation — F1-Wave-B is "Knowledge Graph + Auth Foundation"; owner tokens are an auth surface; owner tokens need a UI; UI needs full security rigor. No explicit D-### decision authorized building Owner Portal in Slice-2. By the time anyone questioned it, B-2a (security) and B-2b (UI) had shipped. The grounding pass is the course-correction — your nwrp222 "possibly drift, possibly deliberate" instinct was right: drift.

4. **UI on the launch surfaces is in good shape — well under a week of polish.** The invoice list, invoice review, PM queue, QA queue are all on Slate tokens, use the canonical primitives, match the Document Review pattern, and the PM queue has a real card-based mobile layout (not a shrunken table). UI debt that touches these surfaces is about an hour of work plus possibly a half-day spike on PDF preview mobile pinch-zoom. The Cost Intelligence hub at `/cost-intelligence` is also real and works. Light cosmetic polish, not real rebuilds.

5. **Hiding what shouldn't show is cheap — about 2 hours of work.** No feature-flag library exists, but the env-var pattern is already established (Wave-B used `NEXT_PUBLIC_AUTH_STATE_LISTENER` for the W.1 listener gate). Add 4-6 `NEXT_PUBLIC_FEATURE_*` env vars, conditional-render the top nav, add a middleware 404 block for direct-URL access to disabled sections, and the app feels complete at reduced scope. Roughly 50 placeholder routes + 6 Caldwell-fixture-mount production routes + the owner portal disappear from the user's discovery path.

Together: **the internal Ross Built launch is closer than the two-week drift suggests.** What it takes to get there is not "build a lot of new stuff" — it's "hide what isn't real, polish what is, wire 3-4 specific integrations, then test vigorously."

---

## Section 1 — What Exists

In plain language: every shipped Nightwork capability, feature by feature, with honest status. Pulled from real repo + MASTER-PLAN + migrations on disk. Status: **working** (renders + main flows function on real DB data) / **partial** (renders but main flows missing or runs on synthetic fixtures) / **scaffold-only** (placeholder card or 501 stub) / **not-built** (in the roadmap, zero code).

**Scale at a glance:**
- 203 page routes
- 123 API endpoints
- 108 SQL migrations
- About 64 of 203 routes (~31%) import the "Coming F-N" placeholder card
- 8-section top nav

**Approximate totals:**
- ~58 working capabilities
- ~15 partial (mostly: production routes that mount Caldwell synthetic fixtures instead of real DB)
- ~45 scaffold-only routes + 1 stub API (the `convert-to-po` 501)
- ~20 not-built capability clusters in the roadmap with zero code

### Core financial workflow (the original Phase 1 scope)

| Capability | Status | Honest note |
|---|---|---|
| Bills list (`/invoices`, `/financials/bills`) | **working** | 851-line page; real filtering, sorting, batch operations; the most-shipped surface in the repo |
| Bill review screen (`/invoices/[id]`) | **working** | 2,234-line gold-standard Document Review pattern; runs on real DB |
| AI invoice parsing (Claude Vision) | **working** | Sonnet 4, metered, math-mismatch mandatory, per-line cost code suggestions; PDFs/images/DOCX |
| Bulk import (`/invoices` import modal) | **working** | 50-file batches; one-at-a-time Claude calls; status tracking |
| Duplicate detection | **working** | Hard match (vendor+amount+date) blocks save; soft fuzzy match flags + dismiss |
| Jobs list (`/jobs`) | **working** | Real health computation, PM assignment, contract amount, % complete; client-table split shipped (B-1a-bis) |
| Per-job financial dashboard (`/jobs/[id]`) | **working** | 695 LOC; real financial bar; real overview cards |
| Per-job budget tab (`/jobs/[id]/budget`) | **partial — mounts Caldwell fixtures** | Renders BudgetView prototype with synthetic numbers; not the job's real budget |
| Purchase orders (per-job) | **working** | Per-job PO list + create form + balance tracking |
| Purchase orders (org-wide list) | **scaffold-only** | `/financials/purchase-orders` is "Coming F1" placeholder |
| Change orders (per-job) | **working** | PCCO numbering + GC fee + approval workflow |
| Change orders (org-wide list) | **scaffold-only** | `/financials/change-orders` is "Coming F1" placeholder |
| Draws / Pay Apps backend (G702/G703) | **working** | Real DB-side math; cover letter; PDF export; lien-release auto-creation on submit |
| Draws — legacy UI (`/draws/[id]`) | **working** | Real DB-wired path |
| Draws — new IA (`/financials/pay-apps/[id]`) | **partial — mounts Caldwell fixtures** | Visual prototype; real backend is at `/draws/[id]` |
| Lien releases | **working** | Per-vendor-per-draw auto-create; bulk upload + filename match; empty-state UI missing (TD-WE-03) |
| Payments tracking | **working** | Schedule, mark paid, reverse, bulk; Ross Built 5th-→15th / 20th-→30th cutoff math |
| Aging report (`/financials/aging`) | **scaffold-only** | "Coming soon" copy; math infrastructure exists but page not built |
| Budget per cost code (data layer) | **working** | Cents storage; recalculate-on-read |
| Cost codes (per-org + NAHB canonical spine) | **working** | Import, suggest, approve; canonical NAHB anchored |
| Internal billings (RB labor/equipment) | **working** | Migration 00038; per-job 976-line tab; attaches to draws |
| Proposals (AI-extracted vendor quotes) | **partial** | Extract + review + commit all work; convert-to-po is the only 501 stub |

### Auth + multi-tenant guts (the platform foundation)

| Capability | Status | Honest note |
|---|---|---|
| Authentication (Supabase) | **working** | Email + password; forgot password; magic links planned |
| Multi-tenant org membership | **working** | Every API resolves via `getCurrentMembership()`; RLS backstop; org bootstrap from signup |
| 4-role permissions (owner/admin/PM/accounting) | **working** | Coarse; the 15-role catalog promised in F2 is not built |
| Soft-delete audit trigger (B-3) | **working** | Migration 00107; 32 tables; backstop for accidental cross-tenant deletion; only 5 of 32 tables empirically tested (rest by CASE-mapping static analysis) |
| Activity log (cross-entity audit trail) | **working** | Every status change writes; 35+ entity types after B-3 |
| Platform admin (Jake/Andrew cross-tenant) | **working** | One of the most-built surfaces; impersonation, audit log, support, feedback, cost-intelligence cross-org view |
| Stripe billing | **partial — env vars placeholder** | Code is real; webhook secret + price IDs are still `re_placeholder` / similar; won't transact today |
| Onboarding wizard | **working** | Signup → org create → first job + PMs |
| Org settings (logo, branding, workflow rules) | **partial** | Basic settings work; "workflow customization" UI is shelved (TD-WE-05) |
| Knowledge graph scaffold (B-1b) | **scaffold-only** | 3 validators exist; only the PII-fence validator has a runtime enforcement point |

### Owner portal (client-facing)

| Capability | Status | Honest note |
|---|---|---|
| Owner-portal token issuance (B-2a) | **working** | Cryptographic token model, 1-year expiry, MANDATORY admin revocation, DB-backed rate limiting |
| Owner-portal homeowner dashboard (B-2b) | **working** | Mobile-first standalone layout; shipped to production runtime |
| Sub portal (subcontractor self-service) | **scaffold-only** | 3 placeholder pages; F3 compliance copy |

### Cost Intelligence engine (the "price intel" foundation)

| Capability | Status | Honest note |
|---|---|---|
| Cost Intelligence hub (`/cost-intelligence`) | **working** | KPI cards; cost lookup widget; items browser; recent-learnings feed |
| Cost lookup widget | **working** | Search by item; per-vendor pricing history; canonical-unit-price computed |
| Items database (`/cost-intelligence/items`) | **working** | Grouped table by category/vendor/job |
| Verification queue (`/cost-intelligence/verification`) | **working** | Tabbed by line nature; Diane/QA verifies AI classifications |
| Unit conversions queue | **working** | Confirm/reject workflow |
| Recent learnings feed | **working** | Aliases + corrections + confirmed conversions, 30-day window |
| Embeddings (pgvector + OpenAI text-embedding-3-small) | **working** | Wired; metered; backfill utility |
| `/price-intel` section root | **working** | Re-exports `/cost-intelligence` (real surface) |
| `/price-intel/anomaly-review` + `/bid-comparison` + `/vendor-performance` + `/selections-catalog` + 5 more | **scaffold-only** | All "Coming F5" placeholders |

### Design system + UI scaffold

| Capability | Status | Honest note |
|---|---|---|
| Slate design tokens + 8 base primitives | **working** | Site Office direction LOCKED at CP2; tokens enforced via post-edit hook |
| Components playground (gated to staff) | **working** | 13 routes; full variant + palette + pattern + philosophy + forbidden anti-pattern coverage |
| Prototype components (BudgetView, DrawApprovalView, etc.) | **working as primitives** | 13 React components; mounted on 6 production routes with synthetic fixtures instead of real DB |
| Top navigation + section overviews | **working** | 8-section nav; brand mark top-left; section landings honestly label Live vs Coming |

### Internal / admin / debug surfaces

| Capability | Status | Honest note |
|---|---|---|
| Admin section (org-level) | **partial — 5 of 13 routes live** | Users, cost codes, billing, owner-portal-tokens live; roles/permissions/workflows are F2/F3 placeholders |
| Settings section (legacy + still-live) | **working** | Company, team, cost codes, billing, financial, internal billings, usage |
| Support / feedback inbox | **working** | AI support chat (Claude API with tools); feedback table; cross-org accumulation visible to staff |
| Vendor list + detail | **working** | Import + merge + per-vendor history |
| Today (`/today`) | **partial — 2 of 3 sections live** | Action Items + Activity Feed are real; "Your Day" is "Coming F3 — personalized daily plan" placeholder at the TOP of the page |

### Build / verification / harness

| Capability | Status | Honest note |
|---|---|---|
| Vercel + Next.js 14 + Supabase deploy | **working** | Production at the canonical URL; auto-deploy from main |
| 3-layer verification harness | **working framework, Layer 2 SKIP-clean for integrity-domain** | Layer 1 (mechanical) + Layer 3 (visual GPT-4V) running; Layer 2 has 1 working rule, rest SKIP-clean pending introspection in F2+ |
| Pre-commit hooks | **working** | Drummond grep gate (never bypassed); Claude-mediated hook with doc-only-skip + Execute-Phase footer detection |
| Smoke harness (Playwright) | **working** | 11 of 13 routes pass; 2 stable pre-existing failures |

### What's clearly not built (roadmap items, zero code)

These exist in the roadmap with no code yet:
- Schedules / Gantt charts
- Daily logs
- Punchlists (including the multi-modal voice/video version)
- To-dos
- Document management at job level (per-job docs storage)
- Photos
- RFIs / submittals / plans / specs
- Permits + warranty + pre-construction + closeout
- Time tracking + equipment + expenses (the F4 stack)
- Selections catalog UI
- Pipeline section (leads / estimates / bids-out / contracts / proposals)
- Reports section (AI builder / custom builder / saved / scheduled / templates)
- Most of People section (clients page is stale placeholder despite real backend; team + org-chart not built)
- Most of Company section (cash-flow + overview are partial; rest placeholders)
- 15-role catalog (only 4 roles today)
- Approval engine (table exists; engine doesn't)
- Notification engine (Resend wired; env vars placeholder; no notifications fire today)
- Email-in receiving
- QuickBooks Online sync (schema columns exist; zero integration code)
- Procore + Buildertrend + Bluebeam integrations
- Schedule intelligence + drift alerts
- Auto-generated daily plans
- AI-powered estimates

### What stands out (honest observations)

- **Bill intake + review is genuinely end-to-end shipped.** The highest-value surface for Ross Built today, and it works.
- **Six production routes mount synthetic Caldwell fixtures instead of real DB.** Specifically: `/jobs/[id]/budget`, `/jobs/[id]/schedule`, `/jobs/[id]/mobile-approval`, `/jobs/[id]/documents/[documentId]`, `/financials/pay-apps/[id]`, `/financials/pay-apps/[id]/print`, `/financials/reconciliation`. The Wave-E E-3 swap pattern (`/financials/bills/[id]` wired DB → adapter → prototype view) is proven; it hasn't been rolled to the other six.
- **Cost Intelligence has heavy data-collection infrastructure but no PM-facing output side yet.** 23 API routes, 13 lib files, 14 migrations, pgvector — all real. The "moat compounds" claim is true at the input layer but invisible at the user layer until the F5 surfaces exist.
- **Owner Portal is fully shipped and client-facing — must be hidden for internal launch.** Routes work, security is real, audit logs fire. For internal-only launch, these need to be gated behind a feature flag.
- **All 15 per-job operational tabs are placeholder walls.** Schedule, daily logs, punchlist, photos, RFIs, submittals, plans, specs, permits, warranty, pre-con, closeout, team, time-entries, to-dos. Clicking through the per-job nav hits 15 walls today.
- **Stripe billing renders but won't transact.** Same for Resend email — code is real, env vars are placeholder.
- **The build + verification + hook infrastructure is substantial.** Roughly 25 files under `src/lib/verification/`, 3-layer harness running, hook calibration validated in production over the last 30 days. Not user-visible but represents real codebase maturity.

Full detail: `.planning/grounding-pass/A-repo-capabilities.md`.

---

## Section 2 — Invoice Processing + Price Intelligence: Actual State

This is the launch core. Be specific.

### Invoice processing — actual state

**Verdict:** Diane could use this on a real Ross Built job today, with two large workarounds. The core workflow is wired, edge-cased, and tested.

**What works end-to-end:**

1. **File upload (single + bulk).** Single via modal on `/invoices?action=upload` (drag-and-drop, 5-step progress UI). Bulk via the same page (up to 50 files in a batch, client polls one-at-a-time so Claude rate limits don't blow up). Both with real drag-drop state, real progress visibility, real storage to Supabase.

2. **AI parse (Claude Vision).** Sonnet 4 with a long structured prompt. Returns vendor name, invoice number, date, line items (per-line with description/qty/unit/rate/amount), total, confidence per field, math-mismatch flag, per-line cost code suggestions constrained to the org's cost code list. Math-mismatch detection is mandatory. PDFs go in native; images base64; DOCX converted via mammoth first. Metered into `api_usage` table for plan-limit enforcement.

3. **Auto-match.** Vendor matched via token-overlap; job matched via multi-signal (name + address + client + filename + description) with score + reasons + ambiguous flag; cost code auto-filled if Claude's per-line suggestion has confidence ≥ 0.8.

4. **Confidence routing.** Score < 0.7 → Diane sees it first in QA queue. Score ≥ 0.7 → PM inbox. The "≥85% one-click approve" tier from CLAUDE.md exists as a Quick-Approve UX layer on the PM queue (org-configurable threshold, default 95%).

5. **PM review screen at `/invoices/[id]`.** 2,234 lines. The gold-standard pattern. File preview on the LEFT (PDF via react-pdf, image with click-to-zoom, DOCX via sanitized mammoth HTML), structured fields on the RIGHT with per-line cost code editor and multi-cost-code allocations editor, audit timeline in the right rail, payment + payment-tracking panels below. PM approves / holds / denies / requests info / partial-approves / kicks-back.

6. **Approve gates.** Server-side: required job_id + cost_code_id; CO lines hard-blocked if no CO reference; org-configurable gates for invoice-date / budget-allocation / PO-linkage / duplicate-must-be-dismissed; budget gate with graduated severity (yellow at 0-10% over, orange at 10-25% requires note, red at 25%+ requires PM acknowledgement + choose-CO-path); amount-increase > 10% over AI total requires note.

7. **Status flow.** Real transitions appended to `status_history` JSONB AND a cross-entity row in `activity_log` per change. Lock-aware editing matrix: 32 status × 4 role combinations, all unit-tested. Field-level audit log for privileged role edits on locked invoices.

8. **QA queue.** Diane at `/invoices/qa` sees status `qa_review` + `pm_approved`. QA-approve advances to `qa_approved`; kick-back routes back to `pm_review` with required note. Banner on detail page shows kick-back reason.

9. **Payment tracking.** Auto-computes payment date from Ross Built's 5th-→15th, 20th-→30th, weekend-skip schedule. Records check number / method / pickup-or-mailed. Bulk payment endpoint. Reverse-payment endpoint (blocked if draw is locked).

10. **Draw pickup.** Diane creates a draw at `/draws/new`, picks invoices from `qa_approved`+ pool. On draw submit, a transactional RPC atomically flips invoices to `in_draw`, auto-creates one lien-release row per vendor per draw, writes status history.

11. **Lien releases.** Cindy at `/invoices/liens` bulk-uploads vendor-signed PDFs with filename-pattern matching. Per-vendor-per-draw auto-creation already happened on draw submit.

**The two large workarounds:**

1. **No email intake.** Phase 4 in CLAUDE.md. Today Diane downloads each invoice from her email and manually uploads. No `accounting@rossbuilt.com` parser. No inbound webhook. The bulk-import flow softens this (50 files at once) but the manual step is still there. **This is the single biggest day-to-day friction.**

2. **No QuickBooks push.** The schema is ready (`qb_bill_id` column on invoices, statuses `pushed_to_qb` and `qb_failed`, both referenced in filter logic). But no integration code. Zero. Only one "quickbooks" string match in the entire codebase, and it's an overhead-detection keyword in the job matcher. After Diane QA-approves an invoice, it sits at `qa_approved` until a draw pulls it in — she still has to re-enter every approved invoice into QBO manually.

**Lesser gaps that don't block launch:**

- No PM mobile push notifications (SMS or web push) — PMs in the field don't get told "you have invoices waiting"; they have to open the app.
- No "Today" landing for Diane — she has to know to navigate to `/invoices/queue` or `/invoices/qa`.
- Aging report is "Coming soon" copy — the data is there, the page isn't.
- Cost codes can't be added on-the-fly from the invoice screen — admin has to go elsewhere to add a code.
- Partial approval is line-based, not amount-based — can't say "approve $10k of this $12k invoice" without splitting at line level.
- No PO auto-binding — parser extracts `po_reference_raw`, PM picks PO from dropdown manually.
- Outbound "ask the vendor for lien release" email not automated.
- Bulk-approve uses the workflow-settings gates but skips the per-line CO-reference check that single-approve enforces.
- Math-mismatch is reported but not blocking (correct for Ross Built; vendor formats vary).

**Diane's day-to-day verdict.** Real workflow is ~80-90% there. Email intake and QB push are the two integrations that close the loop. Mobile push and the Today landing are quality-of-life wins on top.

Full detail: `.planning/grounding-pass/B-invoice-processing.md`.

### Price intelligence — actual state

**Verdict:** Substantially built — "F5-Lite shipped, F5-Full ~60% complete." Far more than the nwrp223 framing assumed.

**The B-3 framing correction.** Your nwrp223 directive said "the pricing_history triggers from B-3 feed this." That framing is incorrect. B-3 (migration 00107, shipped 2026-05-22) is a soft-delete audit trigger that writes to the activity log — it has nothing to do with pricing. The actual pricing-history triggers are migrations 00073 (Phase 2.8) + 00077 (Phase 3.1), shipped before Wave-B started. The phrase "pricing_history" appears nowhere in B-3's plan or migration files. Easy to conflate because both are "audit triggers writing per-row history" — but they're unrelated.

**Two parallel pricing-data systems exist, never explicitly reconciled.**

System A — **Cost Intelligence Spine** (Wave 1A, migration 00052 onwards):
- `items` table — universal taxonomy with canonical name, item type (material / labor / equipment / service / subcontract), category, specs JSONB, unit, default cost code, AI confidence, human-verified flag. Trigram index + GIN spec index + embedding column.
- `item_aliases` — vendor-scoped fuzzy match shortcuts; trigram-indexed; occurrence_count maintained.
- `vendor_item_pricing` — the AI-extraction-driven spine. unit_price_cents, quantity, total_cents, unit, job_id, cost_code_id, scope_tags, source_type (invoice/PO/CO/proposal/manual), human_verified, auto_committed, created_via (alias_match/trigram_match/ai_semantic_match/ai_new_item/manual).
- `document_extractions` + `document_extraction_lines` — two-stage staging for AI extraction with per-line verification status, match tier, candidates considered.
- `job_item_activity` — plan-vs-actual rollup per job per item.
- `item_classification_corrections` — every human correction feeds back as training signal.
- `selection_categories` + `selections` — 13 default categories seeded per org.
- Embeddings: OpenAI text-embedding-3-small (1536-dim), metered, pgvector wired.

System B — **`pricing_history`** (Phase 2.8 + 3.1):
- Simpler shape: source_type ∈ {invoice/proposal/po/co}, source_id, source_line_id, vendor_id, cost_code_id, description, quantity, unit, unit_price (cents), amount (cents), date, canonical_item_id (FK to items spine — the seam), match_confidence.
- Append-only — no `deleted_at`, no UPDATE policy. Corrections via service-role SQL DELETE.
- Triggers fire on workflow status transitions: invoice → qa_approved, proposal → accepted, PO → issued, CO → approved. Idempotent via `ON CONFLICT DO NOTHING`.

The 00077 corrective trigger fixed a real production bug — the 00073 line-level trigger never fired in real flow because app-layer UPDATE ordering read a stale parent status. 54 historically qa_approved invoices were backfilled at 00073 apply; the corrective in 00077 fixed forward-looking firing. The reconciliation between System A and System B is implied by the `pricing_history.canonical_item_id` FK to items but never explicitly documented.

**What works today on the user side:**

| Surface | Status | Note |
|---|---|---|
| `/cost-intelligence` hub | **working** | KPI cards (Total Items, Pricing Observations, Pending Verification, Total Spend Tracked); cost lookup widget; recent-learnings panel; pending-attention panel; items browser with category/vendor/job grouping |
| `/cost-intelligence/lookup` | **working** | "PM asks: what has X cost historically?" — debounced search; per-item detail with aliases + full pricing history + canonical-unit-price + per-vendor breakdown |
| `/cost-intelligence/verification` | **working** | Diane / QA workflow tabbed by line nature; verification queue + detail panel; scope-split + component-source attribution; BOM attachments; mark-non-item flow |
| `/cost-intelligence/items` + `/items/[id]` | **working** | Items database browser + detail |
| `/cost-intelligence/conversions` | **working** | Unit conversion confirmation queue |
| `/cost-intelligence/recent-learnings` (panel) | **working** | Aliases + corrections + confirmed conversions, 30-day window |
| `/platform-admin/cost-intelligence` | **working** | Cross-tenant 6-tab read-only window for Jake/Andrew |

**What's missing for "useful to PMs on the invoice review screen":**

- **The inline "12% above median" vendor-fairness flag is not wired.** The `flagAnomaly()` function in `src/lib/cost-intelligence/queries.ts` returns `is_anomaly=false, reason='insufficient history'` — explicit scaffold. The data exists (`pricing_history` has 2+ years of Ross Built history per migration 00073's Amendment M backfill); the comparison logic isn't wired. This is the highest-leverage missing PM-facing feature.
- **9 of the `/price-intel/*` sub-routes are placeholders** ("Coming F5"). Specifically: anomaly-review, bid-comparison, vendor-performance, selections-catalog, material-orders, cost-database, verification (the `/price-intel/` version, distinct from the working `/cost-intelligence/verification`).
- **No explicit reconciliation document** between the two pricing-data systems. Should `pricing_history` rows auto-promote to `vendor_item_pricing` via Branch 3/4 matching logic, or are they intentionally separate (raw event log vs AI-verified canonical)? This is a real architectural question for launch scope.

**Gap to "Diane and PMs use price intel on real RB jobs":**
1. Wire `flagAnomaly()` with real comparison logic against `pricing_history` data.
2. Surface the anomaly flag inline on the invoice review screen's right rail.
3. Either deep-walk the 4 stub `/price-intel/*` routes and wire them, OR hide them per Section 4.
4. Decide on the reconciliation strategy (defer if not blocking).

Full detail: `.planning/grounding-pass/C-price-intelligence.md`.

---

## Section 3 — UI State of the Launch Surfaces

In plain language: the invoice and price-intel screens specifically. Are they consistent with the design system? Is the UI debt that touches them light or real? Mobile + desktop posture? Honest finalization estimate?

### Invoice surfaces

**Verdict:** In good shape. Slate tokens correctly applied, real canonical primitives, Document Review pattern matches on the review screen, PM Queue has a real mobile card-stack layout (not a shrunken table). Under-an-hour of cosmetic polish across the surfaces.

| Surface | Design tokens | Primitives | Pattern match | Mobile | Honest note |
|---|---|---|---|---|---|
| `/invoices` (all-invoices list) | ✓ Slate tokens; no hardcoded hex | ✓ Real `NwButton`, `NwBadge`, `NwMoney`, `EmptyState`, `SkeletonList` | List + Inline Stats + Filter Rail | Responsive utility classes; dense table scrolls horizontally on phones | 851 lines; zero placeholder content; real fetch, filter, sort, batch ops |
| `/invoices/[id]` (review) | ✓ Slate tokens; ONE `rgba(91,134,153,0.3)` loading-spinner literal (same pattern as TD-B2b-RGBA-CLEANUP) | ✓ Real primitives + heavy decomposition into `src/components/invoices/*` | ✓ Gold-standard Document Review (file LEFT, fields RIGHT, audit timeline below) | Works; sticky bottom action bar on mobile; PDF preview is heavy on touch (named Wave 1.1 polish work) | The 2,234-line gold-standard surface |
| `/invoices/queue` (PM queue) | ✓ Slate tokens; same `rgba(91,134,153,...)` hover-tint pattern | ✓ Real primitives | Two-view layout: mobile card-stack OR desktop table, toggled by `md:hidden`/`md:block`; floating batch-action bar; toasts top-center | ✓ Real card-based mobile layout — explicitly designed for PMs on phones | 1,571 lines; quick-approve as full-width CTA on phone cards |
| `/invoices/qa` (Diane's queue) | ✓ | ✓ | Same pattern as PM queue | Same | Lightweight; accounting-specific gates |
| `/invoices/payments` | ✓ | ✓ | Inline check-number entry, mailed/picked-up toggle | Works | Payment lifecycle tracking |
| `/invoices/liens` | ✓ | ✓ | Bulk-upload + filename-match table | Works | Lien release coordination |
| `/financials/bills` + `/financials/bills/[id]` | re-exports of `/invoices/*` | re-exports | re-exports | re-exports | Bills/Pay Apps terminology rename per D-051 |

### Price-intel surfaces

**Verdict:** The root `/price-intel` re-exports the working `/cost-intelligence` hub — looks done. But the 7 sub-routes under `/price-intel/*` are all "Coming F5" placeholders. The `/cost-intelligence/*` family is real (and is what the user actually sees when they click "Price Intel" in the nav).

| Surface | Status |
|---|---|
| `/price-intel` (root — re-export) | ✓ Working (real Cost Intelligence hub) |
| `/cost-intelligence` (the canonical hub) | ✓ Working — Slate tokens, real primitives, real fetches, hub-style overview |
| `/cost-intelligence/lookup` | ✓ Working |
| `/cost-intelligence/items` + `/items/[id]` | ✓ Working |
| `/cost-intelligence/verification` | ✓ Working |
| `/cost-intelligence/conversions` | ✓ Working |
| `/cost-intelligence/codes` | ✓ Working |
| `/cost-intelligence/scope-data` | ✓ Working |
| `/cost-intelligence/suggestions` | ✓ Working |
| `/price-intel/anomaly-review` | ⚠ "Coming F5" placeholder |
| `/price-intel/bid-comparison` | ⚠ "Coming F5" placeholder |
| `/price-intel/cost-database` | ⚠ "Coming F5" placeholder |
| `/price-intel/material-orders` | ⚠ "Coming F5" placeholder |
| `/price-intel/selections-catalog` | ⚠ "Coming F5" placeholder |
| `/price-intel/vendor-performance` | ⚠ "Coming F5" placeholder |
| `/price-intel/verification` | ⚠ "Coming F5" placeholder (distinct from the working `/cost-intelligence/verification`) |

The Cost Intelligence hub mobile experience is the only soft spot — the grouped table doesn't have a phone-specific layout. Diane is desktop-first so not blocking; Wave 1.1 polish if PMs end up using it.

### UI debt touching the launch surfaces

Pulled from MASTER-PLAN §11 tech-debt registry:

| Entry | Touches launch surfaces? | Effort |
|---|---|---|
| TD-B2b-RGBA-CLEANUP | Yes — same `rgba(91,134,153,...)` literal pattern recurs in `/invoices/[id]` loading spinner + `/invoices/queue` selected-row tint + `client-combobox.tsx` (used in invoice header for client assignment) | Trivial — 4-6 sites, ~20 minutes total; consolidate to a `--nw-tint-stone-08` token or `color-mix()` |
| TD-1.5a-followup-1 | Same `rgba()` pattern across 7 design-system pages (not invoice routes, but same regex family) | Small — bundle with TD-B2b |
| TD-WE-01 | Nav-bar `min-[360px]:` Tailwind arbitrary breakpoint not compiling; affects wordmark rendering on every authenticated surface including invoice routes | Small — replace with named breakpoint `sm:` (640px) or investigate the Tailwind v3 regression; ~15 minutes |
| TD-WE-02 | Logo placement docs-vs-implementation drift; already resolved in CLAUDE.md per 2026-05-15 update; implementation was always correct (top-left) | Done — no code action |
| TD-WE-03 | Lien-releases + pay-apps empty state | Small — wrap `<EmptyState>`; not launch-blocking |
| TD-B1abis-03 | ClientCombobox token polish (used in invoice review for client assignment) | Trivial — replace inline shadow + style with utility classes; ~10 minutes |
| NwButton TD-20 lag | No remaining hand-rolled approve/reject buttons on invoice screens | Done |

**Net debt touching launch surfaces:** under an hour of cosmetic work.

### Mobile + desktop posture

Honest:
- Invoice list on mobile (`/invoices`): works. Stat cards stack 2×2; table scrolls horizontally with `min-w-[1100px]` (correct for a dense data table). PMs reviewing on phones typically use `/invoices/queue` instead.
- Invoice review on mobile (`/invoices/[id]`): works with room for the Wave 1.1 polish already enumerated. Touch targets mostly via `NwButton` ≥44px. Modals mobile-friendly. PDF preview is the heaviest surface — most likely to need pinch-zoom + responsive sizing.
- Invoice review on desktop: works — gold-standard pattern.
- PM Queue on mobile (`/invoices/queue`): works well. Real mobile card-stack (not a shrunken table). Quick-approve as full-width CTA. Touch checkbox via 44×44 wrapper. Floating batch-action bar pinned bottom. **Designed for the PM-on-phone use case.**
- Cost Intelligence hub on mobile: partial — desktop-primary. Not launch-blocking.
- Price Intel placeholder routes: render correctly but content is "Coming F5." Hide them per Section 4.

### Rough finalization estimate

Light cosmetic polish across the surfaces — **well under a week of focused UI work** to feel finished. Specifically:

| Item | Effort |
|---|---|
| RGBA cleanup bundle (TD-B2b + TD-1.5a-followup-1 + TD-B1abis-03) across invoice + design-system surfaces + ClientCombobox | ~1 hour |
| Nav-bar `min-[360px]:` breakpoint fix (TD-WE-01) | ~15 min |
| Invoice file preview mobile polish (pinch-zoom + pan + responsive PDF sizing) — Wave 1.1 spike risk | ~half day to one day, depending on whether PDF.js needs surgery or just CSS |
| PM Queue touch-target audit | ~30 min |
| Cost Intelligence hub mobile pass (optional — not launch-blocking) | ~2-4 hours |

**Total: well under a week of focused UI work to get the launch surfaces feeling finished.** Assumes feature-flagging hides the placeholder routes (Section 4) and no new functional scope creeps in.

The biggest unknown is the PDF preview mobile work — could be quick CSS or could be a real spike. The Wave 1.1 expansion doc §8 R3 already flagged this risk and recommended a spike before commitment.

Full detail: `.planning/grounding-pass/D-ui-state-and-hiding.md`.

---

## Section 4 — What Needs Hiding

In plain language: what's built-but-not-launch-scope that should be feature-flagged off so the internal app feels COMPLETE at reduced scope. Specifically what hides + how.

### What hides

**Owner Portal** (already shipped via B-2a + B-2b in Slice-2, but is Wave 3 scope per the original Wave 1.1 expansion doc — see Section 5):
- `/owner/[token]/page.tsx` (homeowner dashboard)
- `/owner/[token]/pay-apps/[id]/page.tsx`
- `/owner/layout.tsx`, `/owner/error.tsx`, `/owner/not-found.tsx`
- `/api/owner-portal/acknowledge-pay-app/route.ts`
- `/api/owner-portal/admin/revoke-token/route.ts`
- Already not in the internal nav (`nav-bar.tsx` has no `/owner` links), so functionally hidden by default. Recommendation: add explicit feature-flag gating so a stray `client_portal_access` row in production can't accidentally serve a working portal.

**Placeholder routes** (~50 total, all renders of `NwPlaceholderCard` with future-wave badges):

| Section | Placeholder routes | Wave |
|---|---|---|
| Admin | approval-workflows, integrations, notification-rules, org-chart, permissions, roles, templates, workflow-customization | F2/F3/Wave 3 |
| Company | capacity-planning, cash-flow, compliance, documents, expenses, fleet-equipment, insurance, p-l, permits-licensing, tax, time-tracking | F4/Wave 2/Wave 3/Wave 4 |
| Pipeline | bids-out, contracts, estimates, leads, proposals | Wave 4 |
| People | clients (stale — real backend exists post-B-1a), org-chart, team | F1/F2 |
| Reports | ai-builder, custom-builder, saved, scheduled, templates | Wave 3 |
| Sub portal | root, magic/[token], public/[token] | F3 |
| Per-job tabs | activity, bills, closeout, daily-logs, documents, pay-apps, permits, photos, plans, pre-con, punchlist, rfis, selections, specs, submittals, team, time-entries, to-dos, warranty | Wave 2/F2/F3/F4/F5/Wave 1.1-Lite |
| Price Intel sub-routes | anomaly-review, bid-comparison, cost-database, material-orders, selections-catalog, vendor-performance, verification | F5 |
| Financials org-wide | change-orders (org-wide), purchase-orders (org-wide) | F1 |

**Caldwell-fixture-mount production routes** (look real but show synthetic data instead of the user's real data — these are technically working pages but they lie about what the user owns):

- `/jobs/[id]/budget`
- `/jobs/[id]/schedule`
- `/jobs/[id]/mobile-approval`
- `/jobs/[id]/documents/[documentId]`
- `/financials/pay-apps/[id]`
- `/financials/pay-apps/[id]/print`
- `/financials/reconciliation`

The Wave-E E-3 swap pattern (`/financials/bills/[id]` uses a DB row → Caldwell-shape adapter → mounts the prototype with real data) is the proven path. For launch: either swap these to real DB (cumulative ~1-2 days of work; same adapter pattern × 6) or hide them.

**Partial Today-screen sections:**
- "Your Day" card at the top of `/today` — "Coming F3 — personalized daily plan." Sections 2 + 3 (Action Items, Activity Feed) ARE real. Recommendation: hide or replace the "Your Day" card with a real launch-surface aggregate (e.g., "Open Invoices Today" + "Pay Apps Due This Week").

### How the hiding works

**No feature-flag library exists today.** Zero matches for `NEXT_PUBLIC_FEATURE_*`, `feature_flag`, `featureFlag` under `src/`. But the env-var-as-feature-flag pattern is already established — Wave-B used `NEXT_PUBLIC_AUTH_STATE_LISTENER=true` to gate the W.1 auth listener with explicit observation window. That precedent is the template.

**Three layers, ~2 hours total:**

1. **Env-var conventions** (~30 min — inventory + add to Vercel Production + Preview):
   - `NEXT_PUBLIC_FEATURE_OWNER_PORTAL` — default `false`
   - `NEXT_PUBLIC_FEATURE_PRICE_INTEL_F5` — default `false`
   - `NEXT_PUBLIC_FEATURE_PIPELINE` — default `false`
   - `NEXT_PUBLIC_FEATURE_COMPANY` — default `false`
   - `NEXT_PUBLIC_FEATURE_REPORTS` — default `false`

2. **Nav-bar conditional rendering** (~30 min — `src/components/nav-bar.tsx`):
   - Filter `PRIMARY_NAV` array by env-var checks before the role filter
   - Filter per-job tabs in `PerJobTabs` by env-var
   - Filter section-overview Card grids on `/financials`, `/people`, `/admin`, `/price-intel`, etc.

3. **Middleware redirect for direct-URL access** (~30 min — `src/middleware.ts`):
   - Add a small block after the platform_admin gate that 404s on disabled-feature paths
   - Pattern: `if (pathname.startsWith("/pipeline") && process.env.NEXT_PUBLIC_FEATURE_PIPELINE !== "true") return new Response(null, { status: 404 });`
   - Per-feature; ~5 lines per gate
   - Strongest hide for Owner Portal: both `/owner/*` AND `/api/owner-portal/*` 404 when flag off

4. **Section-overview filtering** (~30 min — section landing pages):
   - On `/financials`, `/admin`, `/price-intel`, etc., filter the Card grid to only show sections with their feature flag on

**Simpler alternative** (~15 minutes): single `NEXT_PUBLIC_INTERNAL_LAUNCH_MODE=true` env var that restricts the nav to a hard-coded list. Less granular but trivial to add.

### Recommended internal launch nav

Reduce the 8-section nav to **4 sections + Admin dropdown**:

> **Today | Jobs | Financials | Price Intel | (Admin ▾)**

What that hides:
- Pipeline (Wave 4)
- People (mostly F2)
- Company (mostly F4 / Wave 2)
- Reports (Wave 3)
- Owner Portal (Wave 3 — admin grants it but homeowners can't reach without external rollout)
- Per-job tabs: hide all 15 placeholder operational tabs; keep only the working ones (Bills, Pay Apps real, Budget once swapped to real DB, POs, COs)
- Price Intel sub-routes: keep `/price-intel` root (working Cost Intelligence hub); hide the 7 F5 placeholder sub-routes from the section overview Card grid; let direct-URL hits 404

The system feels complete at reduced scope because users only see surfaces that work. The Owner Portal, F2-F5 placeholders, Caldwell-fixture-mount routes, and partial Today sections are all parked — the work isn't wasted; it's just not reachable until the launch posture justifies exposing it.

Full detail: `.planning/grounding-pass/D-ui-state-and-hiding.md`.

---

## Section 5 — What Wave 1.1-Lite Originally Scoped

In plain language: pull the actual original Wave 1.1-Lite plan from disk. What was "Lite" supposed to cut? Compare to where Slice-2 actually went.

### What's on disk

The canonical Wave 1.1-Lite definition is **deliberately vague**. From `.planning/architecture/ARCHITECTURE.md`:

> Wave 1.1-Lite (per D-049) — Subset of Wave 1.1 polish that Ross Built can use immediately post-F6. Excludes large-blast items deferred to Wave 1.1-Full. Cosmetic TDs from 1.5c deferred backlog land here when real backend exists.

Decision D-049 (2026-05-04) split Wave 1.1 into Lite + Full but didn't enumerate specific Lite deliverables — the foundation work (F1-F6) was still upstream, so the actual Lite scope was supposed to crystallize once foundation landed.

The **concrete** version of Wave 1.1's intent lives in `.planning/expansions/wave-1.1-invoice-approval-EXPANDED-SCOPE.md` (April 2026 — predates the Lite/Full split). Jake's stated scope in that doc:

> "Polish invoice approval and ship to Ross Built for real Drummond use. Make it bulletproof and mobile-friendly."

Concrete recommended scope (8 items):
1. Migrate invoice approval flow to F2's `transitionEntity` + `approval_chains` framework
2. Mobile-first invoice review (touch targets, file preview pinch-zoom, primary CTAs)
3. Bulletproof intake (idempotency middleware, duplicate detection, AI parse retry)
4. Real Drummond data flowing (after F4 back-import)
5. Owner-visible PM approval status (status_history `client_visible` flag — designed for portal precursor, NOT the portal itself)
6. Notification fan-out tightening (per-role defaults; reduce 13-per-invoice noise)
7. HTTP integration tests for top-5 invoice routes
8. Production rollout staged 24h

Explicit out-of-scope items deferred to later waves:
- Bulk approve → Wave 1.2
- Approval delegation UI → Wave 3
- Email-intake invoice ingestion → Wave 3
- Multi-attachment invoice splitting → Wave 1.2
- Mobile-first AI correction loop → Wave 1.2
- Per-org notification preferences UI → Wave 3
- **Owner-portal invoice viewer → Wave 3**
- Cross-tenant invoice export → Wave 5

### Compare to what Slice-2 actually built

| 1.1-Lite intended scope | What Slice-2 has built | Match / drift |
|---|---|---|
| Subset of Wave 1.1 polish RB can use immediately post-F6 | Owner Portal token model + UI (B-2a + B-2b) | DRIFT — Owner Portal is Wave 3 scope per the original doc |
| Cosmetic TDs from 1.5c when real backend exists | RGBA / token cleanups (TD-B2b-RGBA-CLEANUP, TD-B1abis-03) all deferred | MATCH conceptually; not actively addressed yet |
| Mobile-first invoice review polish | NOT attempted in Slice-2 | NO MATCH (not built) |
| Migrate to `transitionEntity` + `approval_chains` framework | NOT attempted — approval_chains schema still dead config | NO MATCH (deferred to F2 properly) |
| Bulletproof intake (idempotency, duplicate detection) | Duplicate detection pre-shipped; idempotency middleware F3 scope | PARTIAL pre-existing |
| Real Drummond data | F4 not yet shipped; synthetic fixture-harness-org seed instead | NO MATCH (F4 deferred) |
| Owner-visible PM approval (status_history `client_visible` flag) | Not attempted | NO MATCH |
| Notification fan-out tightening | Not attempted | NO MATCH |
| Bulk approve as Wave 1.2 (deferred) | ALREADY SHIPPED at `/invoices/queue` (batch action bar) | OVER-DELIVERED earlier than planned |
| **Owner-portal invoice viewer → Wave 3** | **OWNER PORTAL UI SHIPPED in Slice-2 (B-2a + B-2b)** | **DRIFT — Wave 3 work landed in Slice-2** |

### Was the portal-first work in 1.1-Lite, or did the plan drift?

**The plan drifted.** Honest reconstruction:

Slice-1 (D-080 + B-1a + B-1a-bis + B-1b, shipped 2026-05-14 → 2026-05-18) was legitimate foundation work — FK convention migration, clients schema split, knowledge-graph scaffold, types pipeline, Layer 2 standards, W.1 listener. That work IS F1-Wave-B foundation per D-050.

Slice-2 was originally umbrella-scoped under "Wave-B Slice-2." When iter-1 plan review on the original umbrella B-2 plan surfaced a NULL-leak finding in the owner-portal token model, B-2 was split into B-2a (security foundation) + B-2b (UI read-only). B-2a was then authored at full external-grade security rigor: composite FK invariants, RPC NULL-leak fix, 1-year token lifecycle, mandatory admin revocation, non-partial token-hash index, DB-backed rate limiting, activity-log token-actor tracking. Migration 00104 + ACL hardening 00105.

**That security rigor is the right posture for a public client-facing portal where the threat model includes adversarial token discovery, replay, and rate-limit bypass. It is NOT the right posture for an internal-only launch where Diane and PMs are the only users and they're all on the same VPN.**

Where did the portal-first decision come from? Tracing the DECISIONS LOG:
- D-044 (2026-05-04): "Magic link external access in F3" — explicitly placed external access in F3, NOT in Lite.
- D-049 (2026-05-04): Wave 1.1 split into Lite + Full. No portal mention.
- F1-Wave-B EXPANDED-SCOPE: Wave-B IS "Knowledge Graph + Auth Foundation" per D-050. Per nwrp200 (re-split into B-2a + B-2b), the plan author put Owner Portal as Slice-2 scope because the owner-token auth model IS an auth surface, so it nominally belongs under F1's auth-foundation umbrella.

**No D-### decision explicitly authorized "build the Owner Portal in Slice-2."** It happened by aggregation — F1-Wave-B is auth foundation; owner tokens are auth; owner tokens need a UI; UI needs full security rigor. By the time anyone questioned it, B-2a had shipped (2026-05-22) and B-2b followed within hours.

The Wave 1.1 expansion doc's intent — polish what RB uses internally and ship for real Drummond use — was lost in the foundation-work focus. The current state (nwrp222 → nwrp223): GATE B-4 signed, B-5/B-6/B-7 paused for this grounding pass to decide whether to continue down the portal-first path or pivot to internal-operator surfaces.

**The grounding pass IS the course-correction.** Your nwrp223 framing — "the real target is a deployed, vigorously-tested, internally-usable Nightwork for Ross Built, scoped to INVOICE PROCESSING + PRICE INTELLIGENCE as the working core, with everything not needed HIDDEN" — is the original Wave 1.1-Lite intent restated.

Full detail: `.planning/grounding-pass/D-ui-state-and-hiding.md` Part 2.

---

## Section 6 — The Gap to Launch

In plain language: given that the launch scope is invoice processing + price intelligence for internal Ross Built use, what actually has to be BUILT, what gets HIDDEN, what gets UI-FINALIZED. Plain-language gap list.

### BUILD (real new work)

Sequenced roughly by leverage. Estimates are rough.

| # | What | Why | Estimate |
|---|---|---|---|
| 1 | **Email intake** — `accounting@rossbuilt.com` parser → auto-create invoice rows in `import_queued` status | Single biggest day-to-day friction for Diane. Today she manually downloads each invoice and uploads. Resend env var is in the list but no inbound webhook code exists. CLAUDE.md Phase 4 future work. | 3-5 days, depending on how the inbound webhook is structured and whether the parser handles all known Ross Built vendor patterns. Real Drummond/Fish fixtures exist for testing. |
| 2 | **QuickBooks Online push** — after QA-approve, push to QBO via the schema's existing `qb_bill_id` column | The other half of Diane's bottleneck. Without this she dual-enters every invoice into QBO manually. Schema is ready; integration code is zero. | 1-2 weeks. Real Intuit OAuth flow + QBO API client + bill push + sync error handling. The hardest part is OAuth + sandbox testing. |
| 3 | **Inline vendor-fairness flag on invoice review** — `flagAnomaly()` real logic + right-rail panel surfacing "X% above your median for this vendor/cost code over N prior invoices" | Highest-leverage PM-facing feature for price intel. Data exists (2+ years of `pricing_history`). Logic in `queries.ts:flagAnomaly` returns scaffold today. | 2-3 days. Comparison logic + threshold tuning + UI surfacing on the review screen. Real-data validation against Ross Built history. |
| 4 | **PM mobile push notifications** (SMS or web push) — "you have invoices waiting" | Quality-of-life for PMs in the field. Current notifications fire only via email/in-app, which requires opening the app. | 1-2 days. SMS via Twilio or web push via VAPID. Existing `notifyRole` / `notifyUser` infrastructure is the integration point. |
| 5 | **Caldwell-fixture-mount swap for `/financials/pay-apps/[id]`** (the new IA pay-app review screen) | Hide-vs-swap call. Pay app review is launch-relevant. If swapped: real RB pay-app data shown. If hidden: Diane uses `/draws/[id]` (legacy URL) which IS real. | Swap: 1 day (Wave-E E-3 pattern proven; same adapter × 1 surface). Hide: ~5 minutes (feature-flag the route or remove from nav). |
| 6 | **(Optional) Caldwell-fixture-mount swap for other 5 surfaces** | The other 5 (`/jobs/[id]/budget`, `/jobs/[id]/schedule`, `/jobs/[id]/mobile-approval`, `/jobs/[id]/documents/[documentId]`, `/financials/reconciliation`) are LESS launch-critical for invoice-only scope. Hide if not needed. | Swap each: ~1 day. Hide all 5: ~10 min. |
| 7 | **(Optional) Reconciliation strategy for `pricing_history` vs `vendor_item_pricing`** | Architectural cleanup; not user-visible but affects future F5 work. | Architecture decision + doc; ~half day for the decision, days-to-weeks for implementation if consolidation chosen. |

**Build total for must-haves (#1-4):** ~3-4 weeks of focused work.
**Build total including #5 (pay-app swap):** ~3-4 weeks + 1 day.
**Build total including #6 (all 6 swaps) + #7 (reconciliation):** ~5-6 weeks.

### HIDE (cheap)

About 2 hours of work, per Section 4:

| What | Effort |
|---|---|
| Add 5 `NEXT_PUBLIC_FEATURE_*` env vars to Vercel Production + Preview | ~30 min |
| Filter nav-bar `PRIMARY_NAV` + `PerJobTabs` by env var | ~30 min |
| Middleware 404 block for direct-URL access to disabled sections | ~30 min |
| Filter section-overview Card grids on `/financials`, `/admin`, `/price-intel`, etc. | ~30 min |

**Even simpler: single `NEXT_PUBLIC_INTERNAL_LAUNCH_MODE=true` boolean ~15 minutes.**

What gets hidden:
- Owner Portal (`/owner/*` + `/api/owner-portal/*`)
- ~50 placeholder routes (Admin F2/F3, Company Wave 2/F4, Pipeline Wave 4, People F2, Reports Wave 3, Sub Portal F3, per-job tabs Wave 2-F5, Price Intel sub-routes F5, Financials F1 org-wide lists)
- 15 per-job operational placeholder tabs
- Pipeline / Company / Reports sections from nav entirely
- "Your Day" partial section on `/today` (or replace with real launch-surface aggregate)
- 5-7 of the Caldwell-fixture-mount production routes (whichever aren't swapped)

Internal launch nav becomes: **Today | Jobs | Financials | Price Intel | (Admin ▾)**.

### UI-FINALIZE (light)

Under a week of focused UI work, per Section 3:

| What | Effort |
|---|---|
| RGBA cleanup bundle across invoice surfaces + design-system pages + ClientCombobox | ~1 hour |
| Nav-bar `min-[360px]:` breakpoint fix | ~15 min |
| Invoice file preview mobile polish (pinch-zoom + pan + responsive PDF sizing) | half day to 1 day (spike risk) |
| PM Queue touch-target audit on Chrome DevTools iPhone emulation | ~30 min |
| Cost Intelligence hub mobile pass (optional, not launch-blocking) | 2-4 hours |
| (Optional) Replace "Your Day" partial card on `/today` with real aggregate | half day to 1 day |

**Total UI finalize:** under a week.

### TEST (vigorously)

Before declaring launch-ready, per the original Wave 1.1 plan and your nwrp223 emphasis on "vigorously-tested":

| What | Why |
|---|---|
| End-to-end Drummond + Fish invoice walks | Real fixtures exist (`test-invoices/Dewberry-*` + `test-invoices/fish-invoices/*.pdf` + ground truth CSV). Not exercised in CI today. Manually verify upload → parse → approve → QA → draw walk |
| Real RB usage testing with Diane (1-2 week dogfood window before broad PM rollout) | The single best test of "is this usable" is Diane using it on real invoices in real volume |
| PM mobile review on real phones | iPhone + Android, real bills, real approval flow. Touch targets, PDF preview, signature flow if applicable |
| Permissions matrix smoke (status × role full sweep) | Already unit-tested; verify integration |
| Tenant-boundary smoke (org A user cannot see org B data via any route) | Already RLS-enforced; verify via cross-org probe |
| Soft-delete trigger fixture coverage extension (TD-B3-FIXTURE-COVERAGE-32-TABLE) | 5 of 32 tables empirically tested at B-3 ship; the other 27 are CASE-mapped static analysis. Before real Diane data, extend the fixture-harness-org to seed rows on all 32 tables and observe the trigger fire on each |
| Production staged rollout (24h observation) | Per original Wave 1.1 plan |

### Total launch path

If we commit to invoice processing + price intelligence as the launch core:

| Phase | Duration | What lands |
|---|---|---|
| HIDE | ~2 hours | Feature-flag system + nav cleanup + Owner Portal middleware gate |
| UI-FINALIZE | Under a week | RGBA cleanup, breakpoint fix, PDF preview mobile polish, optional Today rebuild |
| BUILD must-haves | 3-4 weeks | Email intake + QB push + flagAnomaly + PM push notifications |
| BUILD nice-to-haves (optional) | 1-2 more weeks | Pay-app swap (+ other 5 Caldwell swaps if launch needs them), reconciliation strategy |
| TEST + dogfood | 1-2 weeks | Diane uses on real RB jobs; PM mobile testing; production staged rollout |

**Internal RB launch-ready: ~5-7 weeks from green-light, assuming clear scope and no major surprises.**

The single highest-leverage cluster is **email intake + QB push** — those two integrations make the system actually replace Diane's current paper-and-spreadsheet loop instead of running parallel to it. Without them, she keeps doing the manual upload + dual-entry work in addition to using Nightwork. With them, the system actually eliminates her bottleneck.

The second-highest-leverage cluster is the **inline vendor-fairness flag** — the "12% above median" signal on the invoice review screen. PMs already approve based on gut feel about vendor fairness; surfacing the data they're already implicitly using would be visibly valuable on day one. The data is there; the comparison logic isn't.

Everything else is polish or scope-deferral.

---

## What this grounded inventory does NOT do

Per nwrp223 §41: this is the inventory. **It does not draft a launch plan.** That's the next step, after you confirm this inventory is accurate and trustworthy.

What the inventory does NOT decide:
- Which of the 7 BUILD items make the cut (and in what order)
- Whether to swap or hide the 6 Caldwell-fixture-mount production routes
- Whether to reconcile the two pricing-data systems pre-launch or defer to F5-Full
- The dogfood window length
- The production staged rollout posture
- Whether internal launch means "Diane only" first, then PMs, or all 8 RB users at once
- Whether Owner Portal stays parked behind the feature flag indefinitely, or has a follow-up wave to actually expose it
- Whether B-5/B-6/B-7 plans get retired, repurposed, or held in their current shape for post-launch

All of that is for the launch plan, which gets built on this inventory once you confirm the inventory is honest.

---

## Standing by for your review.

Per nwrp223 §41: "Do NOT draft the launch plan yet. Just the grounded inventory. Jake reviews it, confirms it's accurate and he trusts it, THEN we build the launch plan on it. The plan is only as good as this inventory is honest."

Open questions you might want to surface back to me before we move on:
1. Does this inventory match your understanding of repo state? Anything that surprised you or feels off?
2. Any feature / capability / route I missed that should be in the inventory?
3. Any working capability I called "partial" or "scaffold-only" that's actually more shipped than I credited (or vice versa)?
4. Does the BUILD / HIDE / UI-FINALIZE / TEST gap structure match how you want to think about the launch path, or do you want to slice the work differently?
5. Are the rough estimates (3-5 days email intake, 1-2 weeks QB push, etc.) in the right ballpark?

After confirmation, the next step would be drafting the actual launch plan (with explicit phasing, ACs, threat models, etc.) — but only when you say go.

---

**Detailed source reports:**
- `.planning/grounding-pass/A-repo-capabilities.md` — 393 lines, ~58 working capabilities catalogued
- `.planning/grounding-pass/B-invoice-processing.md` — 441 lines, "Diane can use this with two workarounds" verdict + full file/path reference
- `.planning/grounding-pass/C-price-intelligence.md` — 287 lines, two-systems reconciliation question surfaced + F5-Lite-shipped verdict
- `.planning/grounding-pass/D-ui-state-and-hiding.md` — 424 lines, UI audit + Wave 1.1-Lite drift confirmed + hiding mechanism specified
