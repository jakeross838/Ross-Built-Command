# Grounded inventory — price intelligence actual state

**Generated:** 2026-05-26
**Source:** Live repo walk + migration audit + grep
**Question:** What does "price intelligence" actually consist of in the codebase TODAY?

## TL;DR for the impatient orchestrator

Price intelligence in this repo is **substantially built and shipped — far more than I expected before the walk.** It is NOT scaffold-only. It is also NOT a single coherent system; there are **two parallel pricing-data systems** that grew from different phase efforts and have NOT been reconciled.

Specifically:

1. **Cost Intelligence Spine** (migration 00052, Wave 1A) — the AI-extraction-driven `vendor_item_pricing` table with `items` taxonomy, item aliases, two-stage verification queue, and a full UI under `/cost-intelligence/*` (10 pages) + 24 API routes + 13 lib modules. This is the moat.

2. **`pricing_history` table** (migration 00073 Phase 2.8 + 00077 Phase 3.1) — a simpler append-only audit spine that triggers off `invoices.status='qa_approved'` (plus proposal/PO/CO equivalents) to capture price points. Different schema, different trigger philosophy, different consumers.

3. **B-3 (migration 00107) is NOT a pricing-history trigger.** Jake's directive said "the pricing_history triggers from B-3 feed this — what's built on top, what's missing?" — that framing is incorrect. **B-3 is a SOFT-DELETE AUDIT trigger that writes to `activity_log`.** It has nothing to do with pricing data. The phrase "pricing_history" appears nowhere in B-3-PLAN, 00107, or 00107.down. The pricing_history triggers that actually exist are 3 phases older (migrations 00073 + 00077).

4. **The nav already exposes Price Intel as a primary section.** `nav-bar.tsx:147` mounts `/price-intel` at top-nav position 5 (Today | Pipeline | Jobs | Financials | **Price Intel** | People | Company | Reports). Routes under `/price-intel/*` are 1.5c-era re-exports of the existing `/cost-intelligence/*` routes (per `src/app/price-intel/page.tsx:21` — `export { default } from "@/app/cost-intelligence/page"`).

So "what's built": the data foundation, the AI extraction pipeline, the verification UI, the cost-lookup widget, the items database browser, the verification queue, the unit-conversion suggestion workflow, and the AI-correction learning feed. "What's missing": the user-facing "is this invoice fair vs. history" comparison surface (anomaly detection scaffold returns `is_anomaly=false, reason='insufficient history'` per queries.ts:28-32) and the bid-comparison + vendor-performance pages exist as routes but I have NOT walked them deeply enough to claim they're fully wired.

## The B-3 "pricing_history" question — clearing the confusion

Jake's directive said: "the pricing_history triggers from B-3 feed this." That conflates two unrelated things. Here is the honest mapping:

### What migration 00107 (B-3) actually installs

Path: `supabase/migrations/00107_b3_soft_delete_audit_trigger_def_wc_1.sql`

- A SECURITY DEFINER trigger function `app_private.audit_soft_delete()` that writes to `public.activity_log` whenever any of 32 tenant tables has a row transition from `deleted_at IS NULL` to `deleted_at IS NOT NULL` (i.e., a soft-delete).
- 32 per-table AFTER UPDATE triggers, one per tenant table, named `zz_soft_delete_audit_<table>` — the `zz` prefix forces alphabetic-last firing order.
- Two RESTRICTIVE RLS backstop policies on `org_members` (DEF-WC-1) to close a cross-tenant membership leak vector.

The audit row uses `action='deleted'`, `details.mechanism='db_trigger'`, and `details.actor_source` (three-tier `auth.uid()` → `app.current_user_id` → NULL). Nothing about price, vendor, cost code, or amount enters the trigger. It is **soft-delete audit**, full stop.

### What the REAL pricing_history triggers do (migrations 00073 + 00077)

Path: `supabase/migrations/00073_pricing_history.sql` (Phase 2.8, Branch 2) — table + 4 triggers
Path: `supabase/migrations/00077_pricing_history_status_trigger.sql` (Phase 3.1) — GH #19 corrective trigger

These create `public.pricing_history`, a separate append-only table with this shape:

```
pricing_history (
  id, org_id, job_id,
  source_type ('invoice'|'proposal'|'po'|'co'),
  source_id, source_line_id,
  vendor_id, cost_code_id, description,
  quantity, unit, unit_price (cents BIGINT), amount (cents BIGINT), date,
  canonical_item_id  -- FK to items spine (Amendment E)
  match_confidence,
  created_at, created_by,
  UNIQUE (source_type, source_line_id)
)
```

5 indexes (org+cost_code+date, org+vendor+date, GIN trigram on description, org+job+date, source-lookup).

The 4 trigger functions (00073) + 1 corrective trigger (00077) listen for these transitions:

- `invoices.status` → `qa_approved` (the 00077 corrective trigger — this is the one that actually fires in prod)
- `proposals.status` → `accepted`
- `purchase_orders.status` → `issued`
- `change_orders.status` → `approved`

Each trigger transactionally INSERTs one row per source line item, with `ON CONFLICT (source_type, source_line_id) DO NOTHING` for idempotency.

Key historical note from 00077: the original 00073 invoice_line trigger NEVER fired in real flow because the app-layer UPDATE ordering updated `invoice_line_items` BEFORE `invoices.status='qa_approved'`, so the line-level trigger read a stale `qa_review` parent status. This was caught at Phase 3.1 Stage 3B-1 (qa-reports/qa-branch3-phase3.1.md §7), filed as GH #19, and fixed by 00077 which moves the trigger to `AFTER UPDATE OF status ON invoices`. All 55 historically qa_approved invoices on Ross Built were orphaned until then; 54 were backfilled at 00073 apply time, and 1 (Metro Electric #60433) qa_approved post-00073 became the canary.

So the pricing_history infrastructure IS shipped, IS firing in real flow as of Phase 3.1, and IS connected to the Cost Intelligence spine via the `canonical_item_id` FK (Amendment E). But it is NOT what B-3 installed.

### Why the confusion might have happened

The B-3-PLAN docs DO heavily discuss the audit-log mechanism (`activity_log`), and the B-3 trigger function does write a JSONB `details` blob that LOOKS like a per-row audit entry. If someone skimmed the B-3 description and thought "audit trigger writing per-row history = pricing history," that mental model is wrong but understandable. The right answer is: **pricing_history is a Phase 2.8 / Phase 3.1 artifact; B-3 is Slice-2 audit work.**

## Data foundation — actual state

### Raw pricing data sources (each present and populated)

- **`invoices.line_items`** (JSONB array) — populated by Claude Vision parse. Fields per line: description, date, qty, unit, rate, amount. Confirmed present at `00001_initial_schema.sql` and extended via `00013_invoice_line_items_and_co_flags.sql`.
- **`invoice_line_items`** (normalized table) — Phase 2 onwards. Per-line rows split out for queryability. Columns: `qty`, `unit`, `rate` (dollars NUMERIC), `amount_cents` (BIGINT). The cost-intelligence pipeline reads from this table.
- **`purchase_orders` + `po_line_items`** — confirmed present (migration 00028).
- **`change_orders` + `change_order_lines`** — confirmed present (migration 00028).
- **`proposals` + `proposal_line_items`** — confirmed present (migration 00065).
- **`budget_lines`** with `original_estimate` + `revised_estimate` (cents) — confirmed present.

### Two parallel pricing-history tables

System A — **Cost Intelligence Spine** (migration 00052, Wave 1A):

- `items` (universal taxonomy: canonical_name, item_type ∈ {material/labor/equipment/service/subcontract/other}, category, subcategory, specs JSONB, unit, default_cost_code_id, ai_confidence, human_verified). Trigram index + GIN spec index + embedding column.
- `item_aliases` (vendor-scoped fuzzy match shortcuts; trigram-indexed; occurrence_count maintained).
- `vendor_item_pricing` — the spine. unit_price_cents, quantity, total_cents, unit, job_id, cost_code_id, scope_tags, source_type ∈ {invoice/invoice_line/po/po_line/co/co_line/proposal/quote/manual_entry}, source_invoice_id, source_extraction_line_id, transaction_date, ai_confidence, created_via ∈ {alias_match/trigram_match/ai_semantic_match/ai_new_item/manual}, human_verified, auto_committed.
- `invoice_extractions` — staging table for two-stage capture (was renamed to `document_extractions` per migration 00076 — same semantics).
- `invoice_extraction_lines` (renamed `document_extraction_lines`) — per-line staging with `verification_status ∈ {pending/verified/corrected/rejected/auto_committed}`, proposed_item_id, match_tier, match_confidence, match_reasoning, candidates_considered JSONB.
- `job_item_activity` — plan-vs-actual rollup per job/item with first_purchase_date + last_purchase_date.
- `item_classification_corrections` — every human correction feeds back as training signal.
- `selection_categories` + `selections` — selections catalog with 13 default categories seeded per org.
- `home characteristics` columns on `jobs` (heated_sf, total_sf, bedroom_count, bathroom_count, finish_level ∈ {production/semi_custom/custom/luxury/ultra_luxury}, construction_type, site_characteristics JSONB, complexity_factors JSONB, region_jurisdiction JSONB).
- `organizations.cost_intelligence_settings` (per-org auto-commit gate, default OFF).

Spine triggers (defined in 00052):
- `trg_vip_after_insert` (AFTER INSERT on `vendor_item_pricing`) — maintains `job_item_activity` rollup + `item_aliases` occurrence_count.
- `trg_iel_status_rollup` (on `invoice_extraction_lines` status changes) — updates parent extraction's verified_lines_count + verification_status.

System B — **`pricing_history`** (migrations 00073 + 00077, Phase 2.8 / Phase 3.1):

- Simpler shape: source_type ∈ {invoice/proposal/po/co}, source_id, source_line_id, vendor_id, cost_code_id, description, quantity, unit, unit_price (cents), amount (cents), date, canonical_item_id (FK to items spine — connection point), match_confidence, created_by.
- Append-only — no `deleted_at`, no UPDATE policy. Correction path is service-role SQL DELETE (documented in 00073 header).
- Triggers fire on workflow status transitions (invoice → qa_approved, proposal → accepted, PO → issued, CO → approved). The corrective 00077 trigger replaced the broken 00073 line-trigger via GH #19 Path A.

### Why two systems exist (best inference from comments)

Phase 2.8 shipped `pricing_history` as a simple status-trigger-driven audit spine before the Wave 1A `vendor_item_pricing` spine landed in migration 00052. The `canonical_item_id` FK in `pricing_history` (Amendment E) was the seam — the intent appears to be that `pricing_history` is the raw event log (every line every approval ever), and `vendor_item_pricing` is the AI-verified canonical-item-keyed version, with `pricing_history` rows getting matched to canonical items over time via Branch 3/4 matching logic.

I did not find a master document that explicitly reconciles the two systems' roles, and the architecture docs (ARCHITECTURE.md §6 F5) describe a future single "Price Intel Engine" rather than acknowledging that two pre-F5 implementations exist. **This is a real architectural reconciliation question for whoever scopes the launch.**

### What's the actual data shape today?

Every approved-and-QA-approved invoice produces:

1. One `pricing_history` row per `invoice_line_item` (via 00077 trigger on `invoices.status` → `qa_approved`).
2. Zero-to-many `vendor_item_pricing` rows depending on whether human-verified extraction lines have been committed via `lib/cost-intelligence/commit-line-to-spine.ts`.
3. `job_item_activity` rollup updates (via `trg_vip_after_insert`).
4. `item_aliases` occurrence_count increments (via `trg_vip_after_insert`).

So the data IS being captured continuously, in TWO different shapes, in real flow.

## UI surfaces — actual state

### `/price-intel` (top-nav primary section)

- `/price-intel` — re-exports `/cost-intelligence` (the hub).
- `/price-intel/cost-lookup` — re-exports `/cost-intelligence/lookup`.
- `/price-intel/anomaly-review`, `/price-intel/bid-comparison`, `/price-intel/cost-database`, `/price-intel/material-orders`, `/price-intel/selections-catalog`, `/price-intel/vendor-performance`, `/price-intel/verification` — page files exist but I did not deep-walk each.

These are NOT placeholder pages; the layout.tsx wraps children in `AppShell` so navigation persists. The intent of the 1.5c re-export pattern was: keep the working `/cost-intelligence` URL operational for backward compatibility, surface the user-visible "Price Intel" terminology at `/price-intel`, and 308-redirect the old → new path (per CONTEXT D-01 + Plan 1).

### `/cost-intelligence` (the canonical hub — the real implementation)

`src/app/cost-intelligence/page.tsx` (670 lines). On mount, fetches:
- All `items` rows (org-scoped via RLS).
- All `vendor_item_pricing` rows (up to 50,000).
- `document_extraction_lines` pending count.
- `unit_conversion_suggestions` pending count.
- Scope-pricing rows missing `scope_size_value`.
- Recent learnings via `/api/cost-intelligence/recent-learnings`.

Aggregates into:
- KPI cards: Total Items, Pricing Observations (across N vendors), Pending Verification (with oldest-pending days), Total Spend Tracked (across N jobs).
- Cost Lookup widget (`CostLookupWidget` component).
- "Recent Learnings" panel — aliases learned, classification corrections, confirmed unit conversions over last 30 days.
- "Needs Attention" panel — verification queue, conversion confirmations, zero-vendor items, uncategorized items.
- Items Browser — `ItemsGroupedTable` with group-by category/vendor/job toggle, persisted to localStorage.

### `/cost-intelligence/lookup` (cost lookup workspace)

`src/app/cost-intelligence/lookup/page.tsx`. Real search UI:

- Debounced search against `/api/cost-intelligence/items?q=…`.
- Per-item detail bundle: aliases, full pricing history (with unit conversion applied + canonical-unit-price computed), per-vendor breakdown.

This IS the "PM asks: what has X cost historically?" UI surface. It works.

### `/cost-intelligence/verification`

`src/app/cost-intelligence/verification/page.tsx`. Real verification queue UI. Has tabs (NATURE_BY_TAB), `VerificationQueue` component, `VerificationDetailPanel` component, scope-split workflow, component-source attribution, BOM attachments, mark-non-item flow.

This is the "Diane/QA verifies the AI's item classifications" surface. Substantial — first 80 lines alone import 17 modules.

### `/platform-admin/cost-intelligence` (cross-tenant admin view)

Server-rendered page with 6 tabs: Items, Pricing, Extractions, Classifications, Conversions, Bootstrap. Each tab does a cross-org query against the spine tables. Read-only window for Jake/Andrew to see what every customer's cost intelligence looks like, including AI token consumption per extraction.

### Other related routes

- `/cost-intelligence/items` (full items view)
- `/cost-intelligence/items/[id]` (item detail)
- `/cost-intelligence/codes` (canonical cost code management)
- `/cost-intelligence/conversions` (unit conversion confirmation queue)
- `/cost-intelligence/scope-data` (scope-pricing enrichment)
- `/cost-intelligence/suggestions` (AI suggestions inbox)

## API surfaces — actual state

24+ API routes under `src/app/api/cost-intelligence/`:

- `items/` — GET search, GET by id
- `items/[id]/` — full detail bundle (item + aliases + pricing)
- `conversions/[id]/confirm` + `conversions/[id]/reject` — unit conversion approval workflow
- `bom-attachments/[id]/confirm` + `bom-attachments/[id]/reject` + `bom-attachments/create` — BOM attachment workflow
- `extraction-lines/[id]/components` — line component management
- `extraction-lines/[id]/mark-non-item` — skip non-pricing lines
- `extraction-lines/[id]/reclassify` — change AI classification
- `extraction-lines/[id]/revert-split` — undo scope-split
- `extraction-lines/[id]/scope` — scope-size enrichment
- `extraction-lines/[id]/skip` — skip line
- `extraction-lines/[id]/split-scope` — split scope into components
- `extraction-lines/[id]/unflag` — unflag for review
- `extractions/[invoiceId]` — extraction detail
- `lines/bulk-approve` — batch-commit verified lines
- `lines/[lineId]` — line ops
- `codes/[id]` + `codes/import` + `codes/` — canonical cost code CRUD
- `recent-learnings` — learning feed
- `scope-data/[pricingId]` + `scope-data/` — scope data enrichment

This is a substantial API. It is NOT a stub.

## Library code — actual state

13 modules under `src/lib/cost-intelligence/`:

- `convert-units.ts` — unit conversion math
- `recent-learnings.ts` — learning feed aggregation (aliases + corrections + confirmed conversions)
- `classify-transaction-line.ts` — line-classification AI workflow
- `match-item.ts` — alias_match / trigram_match / ai_semantic_match / ai_new_item tier logic
- `normalize-item-name.ts` — canonical naming
- `types.ts` — TypeScript types for the spine
- `commit-line-to-spine.ts` — promote verified extraction line to `vendor_item_pricing`
- `allocate-overhead.ts` — overhead allocation across pricing rows
- `classify-line-natures.ts` — line nature classification (material vs. labor vs. overhead etc.)
- `correct-line.ts` — apply human correction
- `extract-invoice.ts` — invoice extraction pipeline (Claude API)
- `embeddings.ts` — OpenAI text-embedding-3-small (1536-dim), api_usage logged, backfill utility
- `queries.ts` — `findSimilarLineItems`, `getVendorPriceHistory`, `getCostCodeRollup`, `flagAnomaly` (the last is explicitly scaffolding — returns `is_anomaly=false, reason='insufficient history'`)

The embeddings + similarity-search infrastructure is REAL. OpenAI `text-embedding-3-small` is wired, with `assertOpenAIKey()` failure-loud + `api_usage` metering. The pgvector + RPC `find_similar_items` integration is there with a fallback.

## Status summary

| Layer | Status | Notes |
|---|---|---|
| Raw data capture (invoices.line_items + invoice_line_items) | working | populated by Claude Vision parse, two-stage verification |
| pricing_history table (status-trigger-driven) | working | 00073 + 00077, idempotent ON CONFLICT, fires on qa_approved + accepted + issued + approved |
| vendor_item_pricing spine (AI-extraction-driven) | working | Wave 1A complete, full source_type enumeration, links back to extraction_lines |
| items + item_aliases + corrections | working | trigram + GIN indexes, ai_confidence + human_verified tracking |
| Embeddings (OpenAI text-embedding-3-small) | working | pgvector wired, RPC + fallback, api_usage logged |
| Query layer (queries.ts) | partial | findSimilarLineItems works; getVendorPriceHistory + getCostCodeRollup are scaffolded for full activation when more data lands; flagAnomaly is scaffold-only |
| UI surface — cost lookup | working | /cost-intelligence/lookup is real and useful |
| UI surface — items browser | working | grouped table with vendor/category/job pivot |
| UI surface — verification queue | working | full Diane/QA workflow, tabbed by line nature |
| UI surface — recent learnings feed | working | aliases + corrections + conversions, 30-day lookback |
| UI surface — anomaly review | partial-or-stub | route exists at /price-intel/anomaly-review but flagAnomaly logic returns false; I did not deep-walk |
| UI surface — bid comparison | partial-or-stub | route exists at /price-intel/bid-comparison; not walked |
| UI surface — vendor performance | partial-or-stub | route exists at /price-intel/vendor-performance; not walked |
| UI surface — selections catalog | partial-or-stub | schema present (selections + selection_categories with 13 default categories seeded); route exists; not walked |
| AI / similarity / matching | working | alias_match + trigram_match + ai_semantic_match + ai_new_item tiers in match-item.ts |
| Two-system reconciliation (pricing_history ↔ vendor_item_pricing) | NOT explicit | both tables exist, `pricing_history.canonical_item_id` FK links them, but no doc says "this is the canonical reconciliation strategy" |

## Honest verdict

**The verdict that matches actual repo state:**

(b)-extended: "Price intel has substantial infrastructure already shipped — the data foundation, AI extraction pipeline, verification UI, items database, cost lookup search, learning feed, and a separate older pricing_history append-only audit spine all WORK. What's missing for 'usable as the launch core alongside invoice processing' is: (i) a clear architectural decision on whether `pricing_history` and `vendor_item_pricing` should remain as two parallel systems or be consolidated; (ii) deep-walks of the four `/price-intel/*` routes (anomaly-review, bid-comparison, vendor-performance, selections-catalog) to determine whether they are working surfaces or page-shell stubs; (iii) the explicit anomaly-detection logic (`flagAnomaly` returns scaffold today); (iv) a vendor-fairness comparison UI surfaced on the invoice review screen (the 'is this 12% above median' inline flag that ARCHITECTURE.md §6 F5 describes — I did not find this on the invoice review screen during this walk)."

So calling this "launch core" alongside invoice processing is **closer to true than I initially assumed**. It is NOT a from-scratch F5 build; substantial F5-equivalent work has already shipped as Wave 1A (migration 00052) + Phase 2.8 (migration 00073) + Phase 3.1 (migration 00077). The remaining work to make it user-facing-ready for Ross Built launch is closer to **polish + reconciliation + completing the four stub routes + adding the inline vendor-fairness flag on the invoice review screen** than to building from zero.

## What 'price intelligence' would look like FINISHED per ARCHITECTURE.md §6 F5

Per `.planning/architecture/ARCHITECTURE.md:157-159` and Principle 3 (line 38-46):

> Cost intelligence learning engine — the moat starts compounding. Cross-entity pollination (Principle 4). Anomaly detection. Cost lookup search. Vendor performance scoring. Verification queue. Bid comparison engine.

> ONE event, MULTIPLE entities updated. Invoice arrives → vendor record updated (last-invoiced-date) + budget line updated (committed-to-date) + cost code performance updated (price-per-unit) + price intel updated (historical-cost) + audit log written. Single ingest, fanout.

> Price Intel surfaces inline (every cost-quoting screen consults the engine) AND as its own primary nav section (cost lookup, vendor performance, anomaly detection).

Finished state translates to: every invoice that arrives is automatically compared to historical vendor pricing for the same cost code / item, and a PM reviewing the invoice sees an inline confidence band ("This is 12% above the median for SmartShield Homes on cost code 09101 over the last 2 years across 18 prior invoices") — surfaced as a flag on the invoice review screen + a deep dive in the vendor-performance + anomaly-review pages. The bid-comparison engine lets a PM run "is this proposal competitive?" against historical data before signing.

Of those, the data foundation + cost lookup + verification UI + learning feed are real today. The inline invoice-review price-intel flag + anomaly detection logic + bid-comparison engine + vendor-performance scoring are gap items.

## Recommendation surface (not a launch plan — just a flag)

If "invoice processing + price intelligence" is the launch core, three scope decisions are pending before launch can be claimed:

1. **Reconciliation strategy for `pricing_history` vs. `vendor_item_pricing`** — should `pricing_history` rows automatically promote to `vendor_item_pricing` (via Branch 3/4 matching logic that Amendment E in 00073 anticipates)? Or are they intentionally separate (pricing_history as raw event log, vendor_item_pricing as AI-verified canonical)? The architecture docs do not state this explicitly. Without a decision, the two systems will continue to drift.

2. **Status of the four stub-or-real `/price-intel/*` routes** — anomaly-review, bid-comparison, vendor-performance, selections-catalog. Each route file exists; this walk did not determine whether the rendered pages are functional or empty. A 30-minute deep-walk would resolve this.

3. **Inline vendor-fairness flag on invoice review** — the "12% above median" PM-facing signal that F5 describes. The `flagAnomaly` function in `queries.ts` is explicit scaffold (returns `is_anomaly=false` until enough history exists). The data IS there now (`pricing_history` has 2+ years of Ross Built history per 00073 Amendment M backfill). So this is logic work, not data work — implement the comparison + thresholds in `flagAnomaly` + wire to the invoice review page's right-rail panel. This is the highest-leverage missing PM-facing feature for launch.

If launch posture is "ship usable today with a deferral on the moat-compounding intelligence," items 1+2 can defer; item 3 is the must-have because invoice processing is more valuable when each invoice is contextualized against history.

If launch posture is "ship the moat itself with the invoice processing it pollinates," all 3 need scope decisions.

I lean toward calling current state "F5-Lite shipped, F5-Full ~60% complete" — substantially more than I expected before this walk.
