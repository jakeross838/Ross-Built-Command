# Grounded inventory — what Nightwork can actually do right now

**Generated:** 2026-05-26
**Source:** Live repo walk + MASTER-PLAN.md ship log + Supabase migrations on disk + nav-bar shape + per-route page inspection
**Posture:** Honest. No optimistic rounding. Status labels: **working** (renders + main flows function on real DB data) / **partial** (renders but main flows missing or runs on synthetic fixtures) / **scaffold-only** (placeholder card or 501 stub) / **not-built** (in roadmap, zero code).

**Scale at a glance:**
- 203 page.tsx files (live routes)
- 123 API route.ts files
- 108 SQL migrations on disk (numbered 00001..00108)
- 64 page.tsx files import `NwPlaceholderCard` ("Coming F-N") — about 31% of all routes
- 8 top-nav sections — Today | Pipeline | Jobs | Financials | Price Intel | People | Company | Reports + Admin dropdown

---

## Capability map

### 1. Core financial workflow (the original Phase 1 scope — Ross Built's day-to-day pain)

#### 1.1 Bills list + per-bill review (formerly "invoices")
- **What it does in plain English:** Operator opens `/financials/bills` (rebranded — same code path as legacy `/invoices`), sees the org's list of vendor bills with vendor name, amount, status, PM assigned, days outstanding. Sort/filter by status, vendor, PM, aging bucket. Click into `/financials/bills/[id]` for the review screen with side-by-side file preview + structured fields + allocations editor + status timeline.
- **Routes:** `/financials/bills` (re-export of `/invoices`), `/invoices` (real impl), `/invoices/queue`, `/invoices/qa`, `/financials/bills/[id]`, `/invoices/[id]` (legacy), `/invoices/[id]/qa`.
- **API endpoints:** `/api/invoices/[id]` (GET/PATCH), `/api/invoices/[id]/action`, `/api/invoices/[id]/line-items`, `/api/invoices/[id]/allocations`, `/api/invoices/[id]/payment`, `/api/invoices/[id]/dismiss-duplicate`, `/api/invoices/[id]/partial-approve`, `/api/invoices/[id]/docx-html`, `/api/invoices/batch-action`, `/api/invoices/save`, `/api/invoices/parse` (Claude Vision upload).
- **Status: working** (this is the most-shipped surface in the repo).
- **Honest assessment:** Invoice/bill upload → AI parse → PM review → approve/deny → assign cost code → log to activity_log all functions on real data. List page is 1000+ lines of real client-side rendering with sorting, filtering, batch actions. Per-bill review uses real DB query for ID `/financials/bills/[id]` (Wave-E Plan E-3 wired DB row → CaldwellInvoice shape adapter → InvoiceReviewView component); some fields (confidence_details, line_items array) default to empty when seed rows don't populate. PM mobile review present at `/jobs/[id]/mobile-approval` but mounts Caldwell synthetic fixtures, not real DB.

#### 1.2 AI invoice parsing (Claude Vision)
- **What it does in plain English:** Operator uploads a PDF/image/docx of a vendor bill. File goes to Claude API. Returns JSON with vendor name, invoice number, date, line items, total, and confidence scores per field. Confidence drives routing: >=85% → PM inbox, 70-84% → PM with yellow flag, <70% → Diane triage.
- **Routes/APIs:** `/api/invoices/parse` (uploads + calls Claude), `/api/invoices/import/upload` (bulk batch), `/api/invoices/import/[batchId]/parse-next` (one-at-a-time), `/api/invoices/import/[batchId]/bulk-assign`.
- **Lib:** `src/lib/claude/parse-invoice.ts`, `src/lib/claude.ts`, `src/lib/invoices/parse-file.ts`, `src/lib/invoices/bulk-import.ts`.
- **Status: working** for PDFs + photos + .docx. xlsx returns "convert to PDF" error.
- **Honest assessment:** Real end-to-end. Real Claude API calls. Confidence scoring real. Bulk import via `/financials/bills/queue` is real. The "AI learns from PM corrections" idea is partial — `parser_corrections` table exists (migration 00044) with the data being captured (`src/lib/invoices/corrections.ts`), but there's no self-learning loop that adjusts the next parse based on corrections — that's the data plumbing, not the feedback loop.

#### 1.3 Bill duplicate detection
- **What it does in plain English:** When a new bill is parsed, check vendor + invoice_number + total + date against existing bills. If match, surface in UI before save with "dismiss" option that logs why.
- **Lib:** `src/lib/invoices/duplicate-detection.ts`
- **API:** `/api/invoices/[id]/dismiss-duplicate`
- **Status: working**

#### 1.4 Job list with health indicators
- **What it does in plain English:** Operator opens `/jobs`, sees all jobs with health dot (green/yellow/red), PM, contract amount, % complete, days since last activity, open bills count, oldest bill age. Sort by health, name, activity, budget. Filter by status (active/complete/warranty/cancelled).
- **Routes:** `/jobs`, `/jobs/[id]` (job detail with financial bar + overview cards), `/jobs/new` (create job).
- **API:** `/api/jobs` (GET/POST/PATCH), `/api/jobs/health` (the aggregator), `/api/jobs/[id]` (single), `/api/jobs/[id]/overview`.
- **Status: working**
- **Honest assessment:** Real list + real health computation. Health logic in `/api/jobs/health` aggregates open invoices, budget %, last activity. PM assignment uses real `profiles` join. The B-1a-bis client refactor (May 2026) made client identity its own table — `clients(id, full_name, email, phone)` separated from `jobs` (PII fence per D-078/D-079). ClientCombobox on the create-job page is real and tested. Find-or-create race-condition catch shipped in B-4 (commit `e76233d`, May 26).

#### 1.5 Per-job financial dashboard
- **What it does in plain English:** Click a job, see contract amount, % billed, budget used, open bills count, draw status, days since activity.
- **Route:** `/jobs/[id]` (695 LOC — real implementation).
- **Status: working** (job detail) / **partial-fixtures** (budget tab).
- **Honest assessment:** `/jobs/[id]` is real DB-wired, renders financial-bar + overview-cards from `/api/jobs/[id]` + `/api/jobs/[id]/overview`. BUT `/jobs/[id]/budget` (100 LOC) mounts the BudgetView prototype component with **Caldwell synthetic fixtures**, NOT real `budget_lines` queries. The header comment explicitly says "F1 swaps fixtures for real Supabase queries". So clicking "Budget" inside a job shows Caldwell's mock numbers, not the real job's numbers.

#### 1.6 Purchase orders (per-job)
- **What it does in plain English:** PM creates a PO against a vendor + cost code with amount. Tracks status (draft/issued/partially_invoiced/fully_invoiced/closed/void). Per-job PO list. Org-wide PO list (`/financials/purchase-orders`) is placeholder.
- **Routes:** `/jobs/[id]/purchase-orders`, `/jobs/[id]/purchase-orders/new`, `/financials/purchase-orders` (placeholder).
- **API:** `/api/purchase-orders/[id]`, `/api/jobs/[id]/purchase-orders`, `/api/jobs/[id]/po-import` (CSV import).
- **Status: working** (per-job PO list + create form are real) / **scaffold-only** (org-wide PO list)

#### 1.7 Change orders (per-job)
- **What it does in plain English:** PM creates a PCCO numbered per job. Adjusts budget lines + contract amount. GC fee at configurable rate (default 20%, can be 18% or 0%). Status workflow (draft → pending_approval → approved → executed).
- **Routes:** `/jobs/[id]/change-orders`, `/jobs/[id]/change-orders/new`, `/change-orders/[id]`, `/financials/change-orders` (placeholder).
- **API:** `/api/change-orders/[id]`, `/api/jobs/[id]/change-orders`, `/api/draws/[id]/change-orders` (CO inclusion in draws).
- **Status: working** (per-job CO list + create + approval flow are real) / **scaffold-only** (org-wide CO list)

#### 1.8 Draws / Pay Apps (AIA G702/G703)
- **What it does in plain English:** Monthly cycle: assemble approved bills for a period, generate G702 summary + G703 line-by-line continuation, lock when submitted to owner, revise via "Rev 1" rows if needed. Generates payment voucher PDF.
- **Routes:** `/draws` (org-wide draw list — REAL), `/draws/new` (wizard), `/draws/[id]` (detail), `/financials/pay-apps` (re-export of /draws), `/financials/pay-apps/[id]` (mounts Caldwell), `/financials/pay-apps/[id]/print` (print view).
- **API:** `/api/draws`, `/api/draws/new` (transactional RPC migration 00061), `/api/draws/[id]` (GET/PATCH), `/api/draws/[id]/action` (approve/submit/pay), `/api/draws/[id]/revise`, `/api/draws/[id]/compare`, `/api/draws/[id]/cover-letter`, `/api/draws/[id]/export` (PDF), `/api/draws/preview`, `/api/draws/drafts`, `/api/draws/[id]/change-orders`, `/api/draws/[id]/internal-billings`, `/api/draws/[id]/internal-billings/attach`.
- **Status: partial** (real backend, mixed UI state).
- **Honest assessment:** The draw assembly + DB-side math is real and shipped (migration 00030, 00061, 00069). Cover-letter generation is real. PDF export is real. The user-facing review screen `/financials/pay-apps/[id]` mounts **Caldwell synthetic fixtures** for the visual approval pattern; the legacy `/draws/[id]` route is the real DB-wired path. Print view at `/financials/pay-apps/[id]/print` also fixture-mounted. So operators can use the real draw workflow today only via `/draws/[id]` URLs; the new IA `/financials/pay-apps/[id]` is a visual prototype.

#### 1.9 Lien releases
- **What it does in plain English:** Track conditional + unconditional waivers per draw. Upload PDFs. Generate compilation packets.
- **Routes:** `/financials/lien-releases` (re-export of `/invoices/liens`), `/invoices/liens`, `/jobs/[id]/lien-releases`.
- **API:** `/api/lien-releases`, `/api/lien-releases/[id]`, `/api/lien-releases/[id]/upload`, `/api/lien-releases/bulk`.
- **Status: working** (DB migration 00033 + 00063 shipped; per-job and cross-job UIs render real data; uploads functional).
- **Honest assessment:** Empty-state UI on `/financials/lien-releases` is missing (TD-WE-03 in registry) — when no rows exist, the DataGrid shows blank, not an empty-state card.

#### 1.10 Payments tracking
- **What it does in plain English:** Operator marks bills as paid; logs check number; flags whether check was picked up at office (vs mailed). Ross Built policy: invoice received by 5th → pay on 15th; received by 20th → pay on 30th; weekend/holiday → next business day.
- **Routes:** `/invoices/payments`, `/financials/payments` (scaffold).
- **API:** `/api/invoices/payments/bulk`, `/api/invoices/payments/batch-by-vendor`, `/api/invoices/[id]/payment`.
- **Lib:** `src/lib/payment-schedule.ts`, `src/lib/utils/payment-schedule.ts`
- **Status: working** for the underlying mechanics; the `/financials/payments` IA destination is a 13-LOC placeholder.

#### 1.11 Aging report
- **What it does in plain English:** Cross-job bill aging by 30/60/90+ buckets.
- **Routes:** `/financials/aging` (re-mount of `/financials/aging-report`), `/financials/aging-report`.
- **Status: partial / scaffold-only** — the page shows "Coming soon" body text with a link to Payment Tracking. The aging math infrastructure exists in queries but the page itself isn't built.

#### 1.12 Budget per cost code
- **What it does in plain English:** Each job's budget is a list of cost codes with original_estimate + revised_estimate (after approved COs). G703 reads from these.
- **API:** `/api/budget-lines`, `/api/budget-lines/[id]`, `/api/jobs/[id]/budget-import` (XLSX import).
- **Lib:** `src/lib/budget-export.ts`, `src/lib/recompute-percentage-billings.ts`, `src/lib/recalc.ts`.
- **Status: working** (data layer) / **partial** (job-detail "budget" tab mounts fixtures).

#### 1.13 Cost codes (per-org + canonical NAHB spine)
- **What it does in plain English:** Each org has its own 5-digit code list (`org_cost_codes`). Anchored to a canonical `canonical_cost_codes` table (NAHB spine, migration 00082). Admin can import via CSV.
- **Routes:** `/admin/cost-codes`, `/settings/cost-codes`, `/cost-intelligence/codes`.
- **API:** `/api/cost-codes`, `/api/cost-codes/[id]`, `/api/cost-codes/bulk`, `/api/cost-codes/import`, `/api/cost-codes/template`, `/api/cost-code-suggestions`, `/api/cost-code-suggestions/[id]/resolve`, `/api/cost-intelligence/codes`, `/api/cost-intelligence/codes/import`.
- **Status: working**.
- **Honest assessment:** The PM "suggest a new cost code" path exists (`pending_cost_code_suggestions` table). Admin/owner approves or rejects. Real.

#### 1.14 Internal billings (Ross Built internal labor/equipment costs)
- **What it does in plain English:** Ross Built bills its own internal time/equipment to a job — separate from external vendor invoices.
- **Routes:** `/settings/internal-billings`, `/jobs/[id]/internal-billings` (976 LOC — biggest per-job tab).
- **API:** `/api/internal-billing-types`, `/api/jobs/[id]/internal-billings`, `/api/draws/[id]/internal-billings/attach`.
- **Status: working** (migration 00038).

#### 1.15 Proposals (vendor quotes coming in, AI-extracted)
- **What it does in plain English:** Vendor sends a proposal PDF. Upload → Claude extracts → PM reviews → either save or convert to PO.
- **Routes:** `/proposals/review/[extraction_id]` (review form), `/pipeline/proposals` (placeholder).
- **API:** `/api/proposals/extract`, `/api/proposals/extract/[extraction_id]/reject`, `/api/proposals/commit`, `/api/proposals/[proposal_id]/convert-to-po` (**501 stub** — explicitly returns "not yet implemented", Phase 3.5 owns).
- **Lib:** `src/lib/ingestion/extract-proposal.ts`, `src/lib/cost-intelligence/extract-invoice.ts`.
- **Status: partial** — extract + review + commit all work; "convert to PO" route is the only 501 in the repo.

---

### 2. Auth + multi-tenant guts (the platform foundation)

#### 2.1 Authentication (Supabase auth)
- **What it does in plain English:** Email + password sign-up. Forgot password. Email magic links (planned but not active). Sessions via Supabase cookie.
- **Routes:** `/login`, `/signup`, `/forgot-password`, `/onboard`.
- **API:** `/api/onboarding/complete`.
- **Status: working**

#### 2.2 Multi-tenant org membership
- **What it does in plain English:** Every record has `org_id`. Every API call resolves the current user's membership via `getCurrentMembership()`. Every query filters by `membership.org_id`. RLS at DB level is the backstop. New tenants self-onboard from `/signup` → `/onboard` flow.
- **Lib:** `src/lib/org/session.ts`, `src/lib/org/require.ts`, `src/lib/org/branding.ts`, `src/lib/org/billing.ts`, `src/lib/org/public.ts`.
- **Migrations:** 00016 (multi-tenant foundation), 00017 (white-label storage), 00019 (org invites), 00046 (RLS tighten reads), 00080 (RLS on core tables).
- **API:** `/api/organizations/current`, `/api/organizations/invites/[id]`, `/api/organizations/members/[id]`, `/api/organizations/members/invite`, `/api/organizations/logo`.
- **Status: working** — load-bearing across the whole platform.

#### 2.3 User roles (owner / admin / pm / accounting)
- **What it does in plain English:** Each org_member has one of four roles. Nav items filter by role. API endpoints check role.
- **Lib:** `src/hooks/use-current-role.ts`, `src/components/nav-bar.tsx` (ACCESS gate).
- **Status: working** for the 4-role model. **NOT-built** for the 15+ role catalog promised in F2 (ROLES-CATALOG.md).

#### 2.4 Soft-delete audit trigger (B-3 — shipped May 22)
- **What it does in plain English:** When any row in the 32 tenant tables is "soft-deleted" (deleted_at set), a database trigger automatically writes an `activity_log` row recording who, when, which entity, and that the mechanism was the DB trigger (vs. application code). Backstop for accidental cross-tenant deletion.
- **Migration:** 00107 (`app_private.audit_soft_delete()` SECURITY DEFINER trigger applied to 32 tables).
- **Status: working** — but per nwrp219, only 5 of 32 tables empirically tested with fixture rows; the other 27 confirmed by CASE-mapping static analysis. Full live coverage tracked as TD-B3-FIXTURE-COVERAGE-32-TABLE before real Diane onboarding.

#### 2.5 Activity log (append-only audit trail)
- **What it does in plain English:** Every status change, financial mutation, deletion attempt (successful or blocked) writes a row to `activity_log` with entity type, action, who, when, details (JSONB). UI surfaces this on `/today`'s Activity Feed + various per-job/per-entity activity views.
- **Lib:** `src/lib/activity-log.ts` (single write path), `src/lib/audit/action-labels.ts` (UI labels with Bills/Pay Apps terminology mapping).
- **Status: working**. Type union ActivityEntityType extended to cover 32+ entity types in B-3.

#### 2.6 Platform admin (cross-tenant Jake/Andrew tools)
- **What it does in plain English:** Separate `platform_admins` table (migration 00048) — Jake + Andrew can see across all orgs. Audit log records every staff action. Impersonation with 1-hour expiry + red banner. Reset password. Mark org as churned.
- **Routes:** `/platform-admin` (canonical), `/admin/platform/*` (legacy URL — both work due to redirect chain). `/platform-admin/organizations`, `/platform-admin/users`, `/platform-admin/audit`, `/platform-admin/feedback`, `/platform-admin/support`, `/platform-admin/cost-intelligence`. 13+ sub-routes including detail views per entity.
- **API:** `/api/admin/platform/impersonate`, `/api/admin/platform/impersonate/end`, `/api/admin/platform/organizations/[id]/actions`, `/api/admin/platform/users/[id]/actions`, `/api/admin/platform/audit/export`, `/api/admin/platform/feedback/[id]`, `/api/admin/platform/support/[id]`, `/api/admin/integrity-check`.
- **Status: working** — this is one of the most fully-built surfaces in the repo.

#### 2.7 Stripe billing
- **What it does in plain English:** Subscription tiers (Starter / Pro / Enterprise). Stripe Checkout for new subs. Stripe Customer Portal for self-serve management. Webhook handles status changes.
- **Routes:** `/pricing`, `/settings/billing`, `/admin/billing`.
- **API:** `/api/stripe/checkout`, `/api/stripe/portal`, `/api/stripe/webhook`.
- **Migration:** 00024.
- **Status: partial** — code is real but `STRIPE_WEBHOOK_SECRET` and `STRIPE_PRICE_*` env vars are still set to placeholder values in Vercel per the tech-debt registry. So billing renders but won't actually transact until env-var resolution.

#### 2.8 Onboarding wizard
- **What it does in plain English:** New org signs up → fills out company name + logo + cost code seed + first PM invites + first job.
- **Route:** `/onboard`.
- **API:** `/api/onboarding/complete`.
- **Migration:** 00020 onboarding_columns, 00021/22/23 signup bootstrap.
- **Status: working**

#### 2.9 Org settings (logo, name, branding, workflow rules)
- **What it does in plain English:** Admin edits org-level settings — name, logo, GC fee default, retainage default, payment schedule cutoffs.
- **Routes:** `/settings/company`, `/settings/admin`, `/settings/financial`, `/settings/workflow` (shelved per TD-WE-05; redirects to `/admin/workflow-customization` placeholder), `/settings/usage`.
- **API:** `/api/workflow-settings`, `/api/organizations/current`.
- **Migration:** 00031 retainage, 00032 workflow settings.
- **Status: partial** — basic org settings work; "workflow customization" UI is in flight (the form exists but route is shelved).

#### 2.10 Knowledge graph scaffold (B-1b — May 18)
- **What it does in plain English:** A directory of cross-entity validation rules. Three example validators ship: WI-001 (inline budget context), WI-013 (multi-job allocation totals), client-pii-not-embedded (blocks PostgREST query patterns that would leak homeowner email/phone). Registry pattern for adding more.
- **Lib:** `src/lib/knowledge-graph/types.ts`, `src/lib/knowledge-graph/validators/`, `src/lib/knowledge-graph/queries/`, `src/lib/knowledge-graph/index.ts`.
- **Status: scaffold-only** — the framework exists, 3 validators exist, but only the PII-fence validator has an active enforcement point (plan-review iter-1 grep gate). The other two are tested in `__tests__/validators/` but no API route or batch job invokes them at runtime. F2-F5 expand to 35+ validators.

---

### 3. Owner portal (client-facing — for the homeowner)

#### 3.1 Owner portal token issuance (B-2a — May 22)
- **What it does in plain English:** Admin generates a 1-year token for a specific client + job. Token URL is `/owner/[token]`. Homeowner clicks, sees their dashboard scoped to that client + job ONLY. Admin can revoke.
- **Routes:** `/admin/owner-portal-tokens` (admin UI to manage tokens), `/owner/[token]` (homeowner entry).
- **API:** `/api/owner-portal/admin/revoke-token`, `/api/owner-portal/acknowledge-pay-app`.
- **Lib:** `src/lib/owner-portal/token.ts`, `src/lib/owner-portal/rate-limit.ts`.
- **Migration:** 00074 (client_portal_access original), 00104 (token issuance security model), 00105 (ACL hardening), 00106 (acknowledge dedupe).
- **Status: working**.
- **Honest assessment:** Real cryptographic token model with same-origin Origin-header CSRF defense, composite FK invariant (org_id + client_id matches clients table), DB-backed rate-limit, non-partial hash index against timing oracles. Heavy security architecture.

#### 3.2 Owner portal homeowner dashboard (B-2b — May 22)
- **What it does in plain English:** Homeowner sees their job's draws + change orders + status. Read-only. They can acknowledge a pay app (writes activity_log row tagged with actor_token_id, not actor_user_id).
- **Routes:** `/owner/[token]` (dashboard), `/owner/[token]/pay-apps/[id]` (per pay-app detail).
- **Status: working**.
- **Honest assessment:** Real DB-wired with sanitized data shape (Caldwell fixture-shape types reused for the View component, but the View itself receives real DB rows mapped field-by-field). Mobile-first standalone layout (no nav-bar — anon homeowner experience). This portal IS shipped to production runtime.

#### 3.3 Owner portal (legacy / IA placeholder routes)
- **What it does in plain English:** There's also `/owner-portal/page.tsx` + `/owner-portal/pay-apps/[id]/page.tsx` — earlier IA placeholder, distinct from `/owner/[token]/*` (the real one).
- **Status: scaffold-only** (placeholders from earlier IA work; the real path is `/owner/[token]/*`).

#### 3.4 Sub portal (sub-contractor self-service)
- **What it does in plain English:** Eventually subs will log in (or use magic links) to manage their bids, POs, bills, schedule, daily logs, RFIs from one workspace.
- **Routes:** `/sub-portal` (authenticated stub), `/sub-portal/magic/[token]` (magic link stub), `/sub-portal/public/[token]` (public stub).
- **Status: scaffold-only** — three placeholder pages with F3 compliance contracts in copy.

---

### 4. Cost Intelligence engine

#### 4.1 Cost intelligence hub
- **What it does in plain English:** A directory of items (products/materials) with pricing history, vendor preferences, unit conversions, and learning loop. Vendor invoices feed pricing data; admin verifies; engine learns category mappings. Aimed at being the "moat" — a Ross Built priced-item catalog tied to historical real spend data.
- **Routes:** `/cost-intelligence` (hub), `/cost-intelligence/items`, `/cost-intelligence/items/[id]`, `/cost-intelligence/codes`, `/cost-intelligence/lookup`, `/cost-intelligence/verification`, `/cost-intelligence/conversions`, `/cost-intelligence/scope-data`, `/cost-intelligence/suggestions`, `/platform-admin/cost-intelligence` (cross-tenant ops).
- **API:** 23 cost-intelligence endpoints under `/api/cost-intelligence/*` covering: items CRUD, codes CRUD, extraction-lines verification (skip/scope/split-scope/reclassify/mark-non-item/unflag/revert-split/components), bulk-approve lines, conversions confirm/reject, BOM attachments confirm/reject/create, scope-data CRUD, recent-learnings feed, bootstrap-aliases (platform admin).
- **Migrations:** 00052 spine, 00053 pricing+tax+delivery+overhead, 00054 unit conversions, 00055 non-item verification, 00056 cost components queue v2, 00057 pricing model scope, 00058 line nature BOM, 00059 source page number, 00073 pricing_history, 00077 pricing_history status trigger, 00079 classification confidence, 00084 pgvector, 00085 items embedding, 00086 items canonical_code, 00091 document_extractions_cache.
- **Lib:** 13 files in `src/lib/cost-intelligence/` — allocate-overhead, classify-line-natures, classify-transaction-line, commit-line-to-spine, convert-units, correct-line, embeddings (pgvector), extract-invoice, match-item, normalize-item-name, queries, recent-learnings, types.
- **Status: working** as a data-collection layer.
- **Honest assessment:** A LOT of infrastructure has been built — 23 API routes, 13 lib files, 14 migrations, pgvector for semantic item matching. The verification queue is functional (admin verifies AI-classified lines). The pricing_history table accumulates real data via trigger on invoice approval (migration 00077). BUT — the "intelligence" output side (predictive pricing for new estimates, anomaly detection on incoming bills, vendor performance scoring) is **NOT-built**. The data is being collected; nothing is reading the collected data yet to surface insights. The new `/price-intel/*` IA section (Wave 4) has 9 placeholder pages.

#### 4.2 Price Intel section (the new IA section for the engine)
- **What it does in plain English:** Eventually this is the user-facing surface where the cost intelligence engine surfaces insights: cost database lookup, bid comparison, vendor performance scoring, anomaly review, material orders, selections catalog.
- **Routes:** `/price-intel` (overview), `/price-intel/anomaly-review`, `/price-intel/bid-comparison`, `/price-intel/cost-database`, `/price-intel/cost-lookup`, `/price-intel/material-orders`, `/price-intel/selections-catalog`, `/price-intel/vendor-performance`, `/price-intel/verification`.
- **Status: scaffold-only** — all 9 routes are NwPlaceholderCard ("Coming F5" or "Wave 4") tiles.

---

### 5. Design system + UI scaffold

#### 5.1 Design tokens + component library
- **What it does in plain English:** Slate palette (Stone Blue + Slate Deep + Slate Tile + White Sand). Space Grotesk + Inter + JetBrains Mono. Compact + comfortable + print densities. Light + dark themes. ~8 base primitives in `src/components/nw/*` (Badge, Button, Card, DataRow, Eyebrow, Money, NwPlaceholderCard, StatusDot). Heroicons + shadcn UI primitives in `src/components/ui/*` for forms.
- **Status: working** — Stage 1.5a shipped May 1, 2026 (D-037 Site Office + Set B palette LOCKED). Token discipline enforced via post-edit hook that blocks hardcoded hex outside globals.css/tailwind.config.
- **Honest assessment:** The actual visual identity is shipped. Real production usage. There are residual `rgba()` tints in some pages (1.5a-followup-1 + TD-B2b-RGBA-CLEANUP) that the hex regex doesn't catch, but these are cosmetic.

#### 5.2 Components playground (gated to platform_admin)
- **What it does in plain English:** 13 routes at `/design-system/*` showing every component variant, palette swatch, type scale, pattern (12 patterns), philosophy direction (3 directions × 4 renders), forbidden anti-patterns. Used for design reviews + onboarding new contributors. 404'd to non-staff in production.
- **Routes:** `/design-system`, `/design-system/components/data-display`, `.../feedback`, `.../inputs`, `.../navigation`, `.../overlays`, `.../surfaces`, `/design-system/palette`, `/design-system/typography`, `/design-system/patterns`, `/design-system/philosophy`, `/design-system/forbidden`. Plus 13 prototype routes under `/design-system/prototypes/*` showing fully-rendered Caldwell scenarios.
- **Status: working**.

#### 5.3 Prototype components (mounted on production routes)
- **What it does in plain English:** 13 React components at `src/components/prototypes/*` (BudgetView, DocumentReviewView, DrawApprovalView, DrawPrintView, InvoiceReviewView, MobileApprovalView, OwnerDashboardView, OwnerDrawView, ReconciliationView, ScheduleView, VendorDetailView, VendorListView). Tenant-blind — accept data via props. Reusable between design-system playground and production routes.
- **Status: working** (as primitives).
- **Honest assessment:** These are the load-bearing prototype components. Many production routes mount these with Caldwell synthetic fixture data, not real DB. That's the source of the partial-vs-fixture distinction across `/jobs/[id]/budget`, `/jobs/[id]/schedule`, `/jobs/[id]/mobile-approval`, `/jobs/[id]/documents/[id]`, `/financials/pay-apps/[id]`, `/financials/pay-apps/[id]/print`, `/financials/reconciliation`. The first to flip is `/financials/bills/[id]` (Wave-E Plan E-3 wired DB → view) — adapter pattern proven, just not yet rolled to others.

#### 5.4 Top navigation + section overviews
- **What it does in plain English:** 8-section top nav locked at D-040. Brand mark top-left. Role-based visibility. Each section landing page is a Card grid of sub-routes with "Live" vs "Coming F-N" badges.
- **Routes:** `/financials` (overview), `/people` (overview), `/admin` (overview), `/platform-admin` (overview), `/pipeline` (overview), `/price-intel` (overview), `/company` (overview), `/reports` (overview).
- **Status: working**.

---

### 6. Internal-only / admin / debug surfaces

#### 6.1 Admin section (org-level)
- **What it does in plain English:** Admin-only tools for the org. 4 LIVE routes + 8 placeholders.
- **LIVE routes (real impl):** `/admin/users` (re-mount of /settings/team), `/admin/cost-codes`, `/admin/billing`, `/admin/owner-portal-tokens` (B-2a).
- **Placeholder routes:** `/admin/roles` (F2), `/admin/permissions` (F2), `/admin/org-chart` (F2), `/admin/profile` (F2), `/admin/approval-workflows` (F3), `/admin/notification-rules` (F3), `/admin/workflow-customization` (F3), `/admin/integrations` (F3), `/admin/templates` (Wave 3).
- **Status: partial section** — 5/13 working + 8/13 placeholders.

#### 6.2 Settings section (legacy + still-live)
- **Routes:** `/settings`, `/settings/company`, `/settings/team`, `/settings/cost-codes`, `/settings/billing`, `/settings/financial`, `/settings/admin`, `/settings/internal-billings`, `/settings/usage`, `/settings/workflow` (redirect to admin/workflow-customization placeholder).
- **Status: working** — these pre-dated the `/admin/*` IA migration and still function. Some Plan 6 work migrated them under `/admin/*`; both URLs work simultaneously.

#### 6.3 Support / feedback inbox
- **What it does in plain English:** Users submit feedback via a trigger button in the nav-bar. Goes to a database table. Cross-org accumulation visible to platform admins (Jake/Andrew) at `/platform-admin/feedback`. AI support chat at `/api/support/chat` (Claude API with tools).
- **API:** `/api/feedback`, `/api/support/chat`, `/api/support/current`.
- **Lib:** `src/lib/support/system-prompt.ts`, `src/lib/support/tool-handlers.ts`, `src/lib/support/tools.ts`.
- **Migrations:** 00050 feedback_notes, 00051 support_chat.
- **Status: working**.

#### 6.4 Vendor list + detail
- **Routes:** `/vendors`, `/vendors/[id]`, `/people/vendors`, `/people/vendors/[id]` (re-export).
- **API:** `/api/vendors/[id]`, `/api/vendors/import`, `/api/vendors/merge`.
- **Status: working**.

#### 6.5 Dashboard aggregator (LIVE; redirects to /today)
- **What it does in plain English:** `/dashboard` page was the original home; redirects to `/today` now. The `/api/dashboard` aggregator endpoint is the org-wide query that backs both /today and /company/overview (Cash Flow KPIs + Getting Started checklist).
- **Status: working** for the API; the page is a redirect.

---

### 7. Build / verification / harness

#### 7.1 Vercel + Next.js 14 + Supabase deploy chain
- **Status: working** — production at https://nightwork-platform.vercel.app, auto-deploy from main, single region iad1.

#### 7.2 Verification harness (3-layer, shipped May 11)
- **What it does in plain English:** A per-commit CI signal that runs three layers of automated checks: Layer 1 (mechanical/typecheck/route-status/DOM assertions), Layer 2 (domain standards — e.g., "line items sum to invoice total"), Layer 3 (visual GPT-4V comparison to PLAN.md `<criteria>` blocks). Loop-with-executor lets failing iterations auto-fix up to 3 times before halting for Jake.
- **Lib:** 25+ files under `src/lib/verification/*` — layer1/2/3 runners, orchestrator, state-machine, loop-orchestrator, vercel-discovery, report-writer, criteria-loader, idempotency, registry.
- **Status: working** for Layer 1 + Layer 2 framework + Layer 3 vision-client.
- **Honest assessment:** Layer 1 + Layer 3 are running. Layer 2 has 4 framework standards plus 1 working rule (`conservation/money-line-items-sum`); the integrity-domain standards (audit-conservation, rls-coverage, role-permission-integrity, fixture-coverage) ship in "SKIP-clean" mode pending introspection surfaces in F2+. So Layer 2 catches the one type of math error and trampolines the rest.

#### 7.3 Pre-commit hooks
- **What it does in plain English:** Two layers:
  1. `.githooks/pre-commit` (Drummond grep gate — never bypassed; prevents committing real Drummond data per D-014 carve-outs).
  2. `.claude/hooks/nightwork-pre-commit.sh` (Claude-mediated only — checks design-token discipline, QA report freshness, hook regex sweeps, doc-only-skip allowlist per Rule 8(e)).
- **Status: working**.
- **Honest assessment:** Multiple lessons learned from the hook itself — TD-NW-HOOK-DOC-ONLY-DETECT closed May 20; TD-NW-HOOK-EXECUTE-PHASE-DETECT closed May 26 with the `Execute-Phase: <plan-id>` commit-body marker. The hook is the operational discipline boundary.

#### 7.4 Smoke harness (Playwright)
- **What it does in plain English:** `scripts/wave-d-smoke.ts` (now selector-fixed per nwrp150) hits 13 production routes after each deploy and verifies they load + match invariants. Smoke baseline 11/13 (2 pre-existing failures TD-WE-01 logo invariant + TD-WE-03 empty-state).
- **Status: working** at the harness level; 2 stable pre-existing failures persist.

---

## 7. What's clearly NOT built (gap reference)

These are explicit roadmap items with zero code:

- **Schedules / Gantt charts (Wave 2):** No `schedule_items` table. `/jobs/[id]/schedule` mounts Caldwell fixtures via ScheduleView component. No real scheduling.
- **Daily logs (Wave 2):** No table, no API, no UI beyond `/jobs/[id]/daily-logs` placeholder.
- **Punchlists (Wave 2):** No table, no API, no UI beyond `/jobs/[id]/punchlist` placeholder. WI-038 multi-modal punchlist ingestion (voice + video) is Wave 3.
- **To-dos (Wave 2):** No table, no API, no UI beyond `/jobs/[id]/to-dos` placeholder.
- **Document management at job level (Wave 2):** `/jobs/[id]/documents` placeholder, `/jobs/[id]/documents/[documentId]` mounts Caldwell fixture document review. Real per-job document storage not built.
- **Photos (Wave 2):** Placeholder only.
- **RFIs (Wave 2):** Placeholder only.
- **Submittals (Wave 2):** Placeholder only.
- **Plans/Specs (Wave 2):** Placeholders only.
- **Permits + warranty + pre-con + closeout (Wave 2):** Placeholders only.
- **Team management / time tracking at per-job level:** `/jobs/[id]/team`, `/jobs/[id]/time-entries` placeholders. Time tracking engine slated F4.
- **Selections catalog (Wave 4):** `/jobs/[id]/selections` placeholder. `/price-intel/selections-catalog` placeholder.
- **Pipeline section (Wave 4):** `/pipeline/leads`, `/pipeline/estimates`, `/pipeline/bids-out`, `/pipeline/contracts` all placeholders. `/pipeline/proposals` is a placeholder, though `/proposals/review/[extraction_id]` (the standalone proposal-review form from Phase 3.4) is real.
- **Reports section (Wave 4):** All 5 sub-routes placeholder (`/reports/ai-builder`, `/reports/custom-builder`, `/reports/saved`, `/reports/scheduled`, `/reports/templates`).
- **Company section sub-pages (most Wave 2-3):** `/company/cash-flow` (mostly real), `/company/overview` (real); the rest (capacity-planning, compliance, documents, expenses, fleet-equipment, insurance, p-l, permits-licensing, tax, time-tracking) all placeholders.
- **People → clients / team / org-chart:** Placeholders. `/people/vendors` is real.
- **Roles engine (F2):** 4-role system works; 15+ role catalog from ROLES-CATALOG.md not built. F2 phase deliverable.
- **Approval engine (F3):** `approval_chains` table exists (migration 00070) with scaffold; no runtime approval-workflow engine reads it. F3 phase deliverable.
- **Notification engine (F3):** `notifications.ts` lib has Resend wiring + Inngest planned per D-022 but `RESEND_API_KEY` is placeholder; no notification subjects are firing today.
- **Time tracking + equipment + expenses (F4):** No tables, no UI.
- **Magic link external access (F3):** Placeholder Sub Portal magic + public routes. No backend.
- **Email-in receiving (Wave 3):** Not built.
- **QuickBooks Online sync (Wave 5):** `qb_vendor_id` + `qb_bill_id` columns exist on relevant tables, but no sync code.
- **Procore + Buildertrend + Bluebeam integrations (Wave 5):** Not built.
- **Schedule intelligence / drift alerts (Wave 4):** Not built.
- **Multi-modal punchlist ingestion (WI-038, Wave 3):** Not built.
- **Auto-generated daily plans (WI-039, Wave 3):** Not built.
- **AI-powered estimates (Wave 4):** Not built; `/pipeline/estimates` placeholder.

---

## 8. Status summary

| Capability cluster | Working | Partial / fixture-mounted | Scaffold-only | Not built |
|---|---|---|---|---|
| Core financial — bill intake/review/approve | 6 (1.1, 1.2, 1.3, 1.4, 1.5, 1.13) | 1 (1.5 job-budget tab on fixtures) | 0 | 0 |
| Core financial — POs / COs / draws / pay-apps / liens / payments / aging | 7 (per-job PO/CO, draws backend, lien releases, payments mechanics, internal billings) | 4 (`/financials/pay-apps/[id]` Caldwell-mount, aging-report copy-only, payments IA destination is stub, draw approval prototype-mounted) | 0 | 0 |
| Auth + multi-tenant guts | 7 (auth, org membership, 4-role system, soft-delete trigger, activity log, platform admin, onboarding) | 2 (Stripe billing placeholder env vars, workflow customization shelved) | 1 (Knowledge Graph 3 validators scaffold; no runtime invokers) | 0 |
| Owner portal (homeowner) | 2 (B-2a tokens + B-2b dashboard) | 0 | 2 (Sub Portal 3 stubs; `/owner-portal/*` legacy stubs) | 0 |
| Cost Intelligence | ~14 (data-collection: extraction, classification, conversions, embeddings, items CRUD, codes, verification queue) | 1 (engine reads collected data — nothing yet) | 9 (`/price-intel/*` section placeholders) | 0 |
| Design system + UI scaffold | 8 (tokens, components playground, prototype components, nav, section overviews) | 6 (production routes mounting Caldwell fixtures: budget, schedule, mobile-approval, document review, pay-app detail, reconciliation) | 0 | 0 |
| Internal/admin/debug | ~10 (Admin section: 5 LIVE; platform_admin 6 LIVE; settings duplicates; vendor list; support chat; feedback inbox) | 0 | 8 (Admin F2/F3 placeholders) | 0 |
| Build / verification / harness | 4 (Vercel deploy, 3-layer harness, pre-commit hooks, smoke harness) | 1 (Layer 2 ships SKIP-clean for integrity domain) | 0 | 0 |
| Roadmap items not yet built | 0 | 0 | ~25 placeholders | ~20 (schedules/Gantt, daily logs, punchlists, to-dos, photos, RFIs, submittals, plans/specs, permits, warranty, pre-con, closeout, time tracking, expenses, reports, pipeline AI estimates, schedule intelligence, multi-modal ingestion, daily plans, integrations) |

**Approximate totals across all surfaces:**
- **Working:** ~58 capability units
- **Partial (mostly: prototype-mounts-fixtures or shelved UI):** ~15 units
- **Scaffold-only (NwPlaceholderCard or 501 stub):** ~45 placeholder routes / 1 stub API route / 3 scaffold lib areas
- **Not-built (in roadmap, zero code):** ~20 capability clusters

---

## 9. What stands out (honest observations)

1. **Bill intake + review is genuinely shipped end-to-end.** PM workflow, AI parsing, duplicate detection, allocation editor, status timeline, payment tracking, activity log — all real. This is the highest-value surface for Ross Built today and it works.

2. **Most "prototype-shape" production routes mount Caldwell synthetic fixtures, not real DB.** This is the most important nuance for an internal launch. Specifically:
   - `/jobs/[id]/budget` — looks complete; shows Caldwell numbers.
   - `/jobs/[id]/schedule` — looks complete; shows Caldwell schedule.
   - `/jobs/[id]/mobile-approval` — looks complete; shows Caldwell pay app.
   - `/jobs/[id]/documents/[documentId]` — looks complete; shows Caldwell document.
   - `/financials/pay-apps/[id]` — looks complete; shows Caldwell draw approval.
   - `/financials/pay-apps/[id]/print` — looks complete; shows Caldwell G702/G703.
   - `/financials/reconciliation` — looks complete; shows Caldwell reconciliation matrix.

   The Wave-E Plan E-3 pattern (`/financials/bills/[id]` — wrap DB query in CaldwellInvoice-shape adapter → mount prototype) is the swap pattern. Six surfaces above need that swap to be operator-usable. Internal launch will hit these if Diane/PMs navigate by clicking through.

3. **Cost Intelligence has heavy data-collection infrastructure but no output side.** 23 API routes, 13 lib files, 14 migrations, pgvector embeddings, classification + verification queue — all real. But there's no engine reading the accumulated data to surface insights yet. The `/price-intel/*` section is 9 scaffold-only routes. So the "moat compounds" claim is true at the input layer but invisible at the user layer until F5.

4. **Owner Portal is fully shipped and client-facing — must be hidden for internal Ross Built launch.** `/owner/[token]/*` and the admin token-issuance UI at `/admin/owner-portal-tokens` both work. For an internal-only launch, these need feature-flag gating or removal from the admin section.

5. **The "Today" screen is real but lean.** Pulls Action Items + Activity Feed from `/api/dashboard` (real aggregator). "Your Day" section is the placeholder ("Coming F3 — personalized daily plan"). So `/today` looks like a functional home screen but two of its three sections are real and one is explicitly "coming later".

6. **All Wave 2 per-job operational tabs are placeholders.** Schedule, daily logs, punchlist, photos, RFIs, submittals, plans, specs, permits, warranty, pre-con, closeout, team, time-entries, to-dos — 15 per-job tabs are NwPlaceholderCard. PerJobTabs nav shows them. Clicking any of them reaches a "Coming Wave 2/3" card. If Diane/PMs click around the per-job nav, they hit 15 walls.

7. **Section overviews (e.g., `/financials`, `/admin`, `/people`) honestly label LIVE vs Coming.** Each section's Card grid has "Live" or "Coming F-N" badges, so operators reading the section landing can self-orient. This means the navigation itself communicates the partial state — not dishonest at the IA level, just thin at the leaf level for everything beyond core financial workflow.

8. **Roles + permissions are 4-role only.** Owner / admin / pm / accounting. The 15-role catalog (Owner, GM, PM, super, foreman, accountant, AP clerk, AR clerk, estimator, designer, super-intern, sub_foreman, sub_bookkeeper, sub, homeowner) is the F2 deliverable. So permission boundaries are coarse today.

9. **Stripe billing is wired but unactivated.** Webhook secret, price IDs all placeholder. Pricing page renders. Settings/billing renders. No real subscription transaction. Same for Resend email (`RESEND_API_KEY=re_placeholder`) — code is real, env-vars unset.

10. **The build/verification/harness layer is substantial and well-shipped.** 3-layer verification, hooks, smoke harness, GH Action — significant investment in process discipline that won't be visible to operators but represents real maturity in the codebase shape.
