---
title: Workflow Intelligence — Cross-Entity Validation Patterns
status: canonical
created: 2026-05-05
authoritative_for:
  - Cross-entity validation rules (data graph as moat)
  - Workflow intelligence pattern catalog (39 patterns)
  - Phase-mapped backlog input to F1 schema design
relationship_to_other_docs:
  - "ARCHITECTURE.md (TBD — created in Plan 7) will cross-reference this doc as the workflow patterns canonical input. Plan 7 will add the reciprocal back-reference; this doc ships standalone now."
  - "ENTITY-INVENTORY.md (TBD — created in Plan 7 alongside ARCHITECTURE.md) catalogs every entity. Required entities for each WI pattern below align to that catalog when it lands."
  - "ROLES-CATALOG.md (TBD — created in Plan 7) defines the role-aware permission matrix. WI patterns whose status flow involves role gates depend on this."
  - "INGESTION-ARCHITECTURE.md (TBD — created in Plan 7) defines multi-modal ingestion routing. WI-038 (multi-modal punchlist) and WI-029/030/037 (daily-log + photo + materials) depend on ingestion patterns from this doc."
  - "MASTER-PLAN.md §10 D-066..D-072 — architectural decisions backing this doc."
  - "CLAUDE.md §Architecture Rules — R.2 'Recalculate, don't increment' applies to every aggregation pattern below; cross-entity validation rules CANNOT be retrofitted by recompute alone, they require entity relationships designed for cross-validation from F1."
---

# Workflow Intelligence — Cross-Entity Validation Patterns

## Purpose

This document captures the cross-entity validation rules and workflow intelligence patterns that distinguish Nightwork from Procore, Buildertrend, and other off-the-shelf construction-management tools. These are the "data graph as moat" patterns — workflows that require multiple entities working together. They cannot be built into 1.5c (no backend yet) but are captured now as canonical input to:

- **F1 schema design** — entity relationships must support cross-validation from day one
- **F3-F5 engine implementation** — the intelligence layer that consumes the data graph
- **Wave 1.1-Lite + Wave 2 + Wave 3 build phases** — UX surfaces that expose intelligence
- **Plan 7 of Stage 1.5c** — atomic update of canonical docs (this doc, ARCHITECTURE.md, ENTITY-INVENTORY.md, ROLES-CATALOG.md, INGESTION-ARCHITECTURE.md, CLAUDE.md)

Each pattern is a workflow that REQUIRES multiple entities to be linked correctly, with engine intelligence on top, to produce a behavior off-the-shelf tools cannot. The entity graph + engine combination is the moat.

## Reading Order

1. **PURPOSE** (above) — why this doc exists, what it informs
2. **RELATIONSHIP TO OTHER DOCS** (frontmatter) — how it connects to canonical architecture docs
3. **THE 39 PATTERNS** (below) — organized by surface
   - Section A: Invoice approval workflow intelligence (16 patterns; WI-001..WI-016)
   - Section B: Budget workflow intelligence (11 patterns; WI-017..WI-027)
   - Section C: Cross-cutting "no other tool has this" patterns (12 patterns; WI-028..WI-039)
4. **PATTERN STATUS LEGEND** — at end of doc

Each pattern is documented with:

- **Pattern ID** (WI-NNN)
- **Name**
- **Description** (what it does, why it matters, who benefits)
- **Required entities** (what data graph entities must exist)
- **Required engine capabilities** (what intelligence layer needs to exist)
- **Phase target** (when it gets built)
- **Status** (planned / in progress / shipped — most start as "planned")
- **Dependencies** (other WI patterns or system capabilities this requires)

---

## Section A — Invoice Approval Workflow Intelligence (16 patterns)

These patterns make invoice approval the right kind of work for the PM/QA/accounting role: contextual, fast, evidence-rich, audit-tracked. The single-entity invoice review most tools offer is replaced by a graph-walk that surfaces budget, PO, CO, vendor history, daily-log, and time-entry context inline.

### WI-001: Inline budget context on invoice approval

**Description:** When approving an invoice, show the cost code's revised budget, total invoiced to date (including this invoice), committed (open POs + approved-unbilled COs), and available balance — all live in the right rail of the review view. The approver sees "this trade has $X remaining" without leaving the page. Eliminates the "approved against last month's draw numbers" failure mode (Pain Point 4 in CLAUDE.md).

**Required entities:** `invoices`, `budget_lines`, `cost_codes`, `purchase_orders`, `change_orders`, `draws`

**Required engine capabilities:** Real-time aggregation of invoices/POs/COs per cost_code with R.2 recalculate-don't-increment.

**Phase target:** Wave 1.1-Lite (entity graph from F1 + budget aggregation)

**Status:** planned

**Dependencies:** F1 entity model; F2 status framework; budget index from F1.

---

### WI-002: Inline PO context on invoice approval

**Description:** When the parsed invoice references a PO (or AI matches a PO), show the PO's amount, balance, status, and any prior invoices against it inline. If the new invoice would push the PO over its amount, flag it with the overage value. PM either approves the overage explicitly (Rule 2 from CLAUDE.md What-If Handling), or sends back to vendor.

**Required entities:** `invoices`, `purchase_orders`, `vendors`

**Required engine capabilities:** PO-balance running total per PO; AI PO-match scoring on parse.

**Phase target:** Wave 1.1-Lite

**Status:** planned

**Dependencies:** WI-001 (budget context); F1 PO model.

---

### WI-003: Inline CO context on invoice approval

**Description:** When the invoice references a CO (parsed from description text or matched by vendor + scope keyword), show the CO's amount, GC fee rate, total_with_fee, status, and remaining balance against the CO uplift. If the invoice would draw down more than the CO uplift permits, flag.

**Required entities:** `invoices`, `change_orders`, `budget_lines`

**Required engine capabilities:** CO-attribution to invoices via `co_id` link or AI scope matching; CO-balance running total.

**Phase target:** Wave 1.1-Lite

**Status:** planned

**Dependencies:** WI-001, WI-005.

---

### WI-004: Cost code on every line item, not just header

**Description:** Multi-line invoices often span trades (e.g., a single Coastal Smart Systems invoice charging electrical + low-voltage + media-wall). Each line item gets its own cost code, not just the invoice header. The approver allocates per-line; the audit trail records per-line cost code attribution; budget aggregations roll up per-cost-code accurately.

**Required entities:** `invoice_line_items` with `cost_code_id` FK per line; `cost_codes`

**Required engine capabilities:** Per-line AI cost-code suggestion; per-line approver override capture; per-line allocation to budget aggregation.

**Phase target:** F1 (schema) + Wave 1.1-Lite (UI)

**Status:** planned

**Dependencies:** F1 invoice line model with cost code FK.

---

### WI-005: Change Order references as entities, not text strings

**Description:** Today CO references live as substrings in invoice descriptions ("PCCO #2"). Tomorrow `invoice.co_id` is an FK to `change_orders.id`, with scope, approved amount, GC fee, and remaining balance available for cross-validation. AI parse extracts CO references; user-confirmed CO link persists.

**Required entities:** `invoices.co_id` FK; `change_orders`; `invoice_line_items.co_id` FK (for partial-CO invoices)

**Required engine capabilities:** AI CO-reference extraction from invoice text; CO-link confirmation UX; CO-balance running total.

**Phase target:** F1 (schema) + Wave 1.1-Lite (UI)

**Status:** planned

**Dependencies:** WI-003.

---

### WI-006: Vendor performance card inline

**Description:** The right rail shows the vendor's bid accuracy (estimate vs final), T&M overrun rate, quality history (% invoices with QA kickback), lien-release reliability (% on-time), and historical bid range vs market. The approver sees "this vendor's track record" without leaving the invoice. Inputs Price Intel feedback loop.

**Required entities:** `vendors`, `invoices` (history), `proposals` (bids), `change_orders` (overruns), `lien_releases`, `qa_kickback_log` (TBD)

**Required engine capabilities:** Vendor performance computation (F5 Price Intel engine); historical aggregation per vendor.

**Phase target:** Wave 2 (after F5)

**Status:** planned

**Dependencies:** F5 Price Intel engine; vendor history aggregation index.

---

### WI-007: Comments / approval thread

**Description:** PM, QA, and accountant can add comments inline on an invoice. The thread is visible to all approvers; replies stack chronologically; resolved comments collapse. Replaces email-and-Teams chatter that loses context.

**Required entities:** `invoice_comments` (TBD), `users`, `invoices`

**Required engine capabilities:** Comment threading; @-mention notifications via F3 magic-link infra; comment-resolved state machine.

**Phase target:** Wave 1.1-Lite

**Status:** planned

**Dependencies:** F2 user model; F3 notifications.

---

### WI-008: Prev/next invoice navigation in queue

**Description:** While reviewing invoice 4 of 8 in the day's queue, the approver presses "next" (keyboard or click) to jump to invoice 5 without returning to the queue list. Invoice context replaces wholesale; budget/PO/CO context refreshes for the new cost code; comments thread loads. Reviewing 8 invoices in a row takes minutes, not the half hour it takes today.

**Required entities:** Queue state (per-PM ordered list of invoice IDs)

**Required engine capabilities:** Queue ordering logic (priority, age, vendor cluster, etc.); URL-state preservation across navigation.

**Phase target:** Wave 1.1-Lite

**Status:** planned

**Dependencies:** F2 invoice queue model.

---

### WI-009: Send-back / kickback workflow

**Description:** PM disputes an invoice (wrong amount, wrong scope, missing line item) and sends back to the vendor with a note. The vendor receives a magic-link email to view the dispute, upload a corrected invoice, or respond. The original is marked `pm_held` until the vendor responds. Replaces email-and-call chase that loses thread.

**Required entities:** `invoices.status_history`, `vendor_communications` (TBD), magic-link tokens

**Required engine capabilities:** Status transition framework (F2); magic-link token generation + verification (F3); vendor reply handling.

**Phase target:** F3 (magic-link infra) + Wave 2 (UX)

**Status:** planned

**Dependencies:** F2 status framework; F3 magic-link.

---

### WI-010: Daily log validation — flag invoice if no field activity

**Description:** When a vendor invoices labor for week of Nov 4-8, validate that the daily log shows their crew on-site that week. If the daily log shows zero activity for that vendor in that period, flag the invoice for PM review with the discrepancy. "No field activity = no invoicing" is the cost-plus-builder mantra; the data graph enforces it.

**Required entities:** `daily_logs`, `daily_log_entries`, `vendors`, `invoices`, `time_entries` (optional)

**Required engine capabilities:** Daily-log-to-invoice correlation engine (cross-period, per-vendor); F5 Price Intel engine adjacency.

**Phase target:** Wave 1.1-Lite (basic correlation) + F5 (intelligence layer)

**Status:** planned

**Dependencies:** Daily logs model (Wave 2); F5 Price Intel engine; WI-029.

---

### WI-011: Time entry validation — flag if invoiced labor exceeds clocked hours

**Description:** When a vendor invoices "16 hours @ $85/hr", validate that 16 hours of clock-in/clock-out for that vendor's crew exists in the time-entry log for the period. If invoiced labor exceeds clocked, flag. Catches T&M overbilling that today can only be caught by manual reconciliation.

**Required entities:** `time_entries`, `vendors`, `invoices`, `invoice_line_items`

**Required engine capabilities:** Time-entry-to-invoice correlation engine; per-vendor labor aggregation.

**Phase target:** F5 (engine) + Wave 2 (UX)

**Status:** planned

**Dependencies:** F4 time tracking + equipment + expenses; F5 Price Intel engine; WI-031.

---

### WI-012: Photo evidence requirement for milestone work

**Description:** Invoices for milestone-tied work (framing complete, drywall complete, finish complete) require photos in the daily log for that period showing the milestone. If photos are missing, the invoice is flagged "missing photo evidence" and routed to PM for visual confirmation before approval.

**Required entities:** `daily_log_photos`, `daily_logs`, `invoices`, `cost_codes` (with milestone flag)

**Required engine capabilities:** Cost-code-to-milestone mapping; photo-presence validation per period; AI photo-content classification (optional, F5+).

**Phase target:** Wave 2 (with daily logs) + F5 (intelligence)

**Status:** planned

**Dependencies:** Daily logs + photos (Wave 2); WI-030.

---

### WI-013: Multi-job allocation — single invoice spans multiple jobs

**Description:** A single roofing invoice covers two adjacent jobs (Caldwell + Burgess) where a sub-crew works one in the morning and the other in the afternoon. PM splits the invoice into two job allocations with audit trail. Each allocation tracks separately; the original file is preserved with the original `invoice_id` plus an `allocation_log` table.

**Required entities:** `invoice_allocations` (or per-line `invoice_line_items.job_id`), `invoices`, `jobs`

**Required engine capabilities:** Multi-job allocation UX; per-line cost-code + job allocation; allocation audit trail.

**Phase target:** F1 (schema) + Wave 1.1-Lite (UX)

**Status:** planned

**Dependencies:** F1 entity model; existing 4-table invoice-line-shape (D-034).

---

### WI-014: Cross-pollination preview on approval

**Description:** Before clicking Approve, the approver sees a preview: "approving this updates the following entities — vendor performance for Coastal Smart Systems, cost code 09101 history, Coastal Smart product entries (4 SKUs from line items), Selections catalog (2 SKUs added), Price Intel fan-out (this rate joins the historical comparison set)." The approver knows what data graph nodes their action touches before they touch them. Replaces the implicit "Approve and pray" model.

**Required entities:** Many — vendors, cost_codes, products (TBD), selections (TBD), price_intel rows

**Required engine capabilities:** Cross-entity update preview computation; F5 Price Intel engine; selections engine; product extraction engine.

**Phase target:** Wave 2+ (after F5 lands)

**Status:** planned

**Dependencies:** F5 Price Intel engine; selections + product entity models (Wave 2).

---

### WI-015: AI Parse Confidence collapsed by default

**Description:** AI parse confidence panel is collapsed by default in the invoice review view. Inline summary shows overall %, flag count, confidence tone (success/warning/danger). Click to expand the per-field grid + flag detail. The approver scans the gist; expands only when triaging a low-confidence parse. Reclaims ~25% of the right-rail real estate for budget context (which is workflow data, not diagnostic).

**Required entities:** `invoices.confidence_score`, `invoices.confidence_details`, `invoices.flags`

**Required engine capabilities:** None — UI pattern only.

**Phase target:** Stage 1.5c Plan 2 amendment (this doc) — **landed 2026-05-05**

**Status:** shipped

**Dependencies:** None.

---

### WI-016: Status Timeline collapsed by default

**Description:** Status Timeline panel (audit trail of who-did-what-when) is collapsed by default in the invoice review view. Inline summary shows step count + terminal status badge. Click to expand the full chronological timeline. Same pattern as WI-015 for visual consistency. Audit history is one click away when a question arises; not occupying ~25% of the page when it doesn't.

**Required entities:** `invoices.status_history` (JSONB)

**Required engine capabilities:** None — UI pattern only.

**Phase target:** Stage 1.5c Plan 2 amendment (this doc) — **landed 2026-05-05**

**Status:** shipped

**Dependencies:** None.

---

## Section B — Budget Workflow Intelligence (11 patterns)

These patterns make the budget view the cost-plus PM's primary daily artifact: live, evidence-rich, drillable, comparison-ready. The static G703-shaped table most tools offer is replaced by a budget-as-graph-pivot where every cell is a query into the underlying entity graph.

### WI-017: Committed column

**Description:** Budget view shows, per cost code line: Original | Revised | Committed | Previous | This Period | Total | % Complete | Available. Committed = open POs + approved-but-unbilled CO uplift counted against revised. Available = revised − committed − invoiced. Eliminates the "$0 invoiced, $50K remaining" misread when there's a $40K open PO + $8K approved-unbilled CO already committed against the line.

**Required entities:** `budget_lines`, `purchase_orders`, `change_orders`, `invoices`

**Required engine capabilities:** Aggregation engine (R.2 recalculate-don't-increment); per-line committed computation.

**Phase target:** Stage 1.5c Plan 2 amendment (this doc) — **landed 2026-05-05** (CO portion only; PO portion deferred until PO fixtures land)

**Status:** shipped (CO portion); planned (PO portion — Wave 1.1-Lite)

**Dependencies:** F1 PO model for full implementation.

---

### WI-018: Variance flags

**Description:** Over-budget lines render in danger color (`var(--nw-danger)`) so the overrun is unmistakable when scanning. On-budget lines render quietly in primary text color. Lines approaching budget (>= 90% complete) render in warning color as an early-warning signal. The PM scans the budget and sees red where attention is needed; doesn't have to compute mentally.

**Required entities:** `budget_lines`, `invoices`, computed `available`

**Required engine capabilities:** Threshold-based color rendering; configurable warning thresholds in `org_settings`.

**Phase target:** Wave 1.1-Lite (refinement of existing color treatment)

**Status:** planned (currently shipped at minimum threshold — over-budget red; warning band not yet wired)

**Dependencies:** WI-017 (committed column for accurate available).

---

### WI-019: Original / Revised breakdown on each line

**Description:** Each budget line shows Original alongside Revised. Hovering or clicking the Revised cell drills into the per-line CO history: which COs added (or deducted), when, vendor, scope. Replaces the lossy "Revised = some number" with full CO attribution per line.

**Required entities:** `budget_lines`, `change_orders`, `change_order_lines` (per-line CO attribution)

**Required engine capabilities:** Per-line CO history drill-down; CO-to-budget-line linkage.

**Phase target:** Wave 2

**Status:** planned

**Dependencies:** F1 schema for CO-to-budget-line links.

---

### WI-020: Change Order summary at top of budget view

**Description:** Above the budget table, a collapsible summary: "5 approved COs totaling +$7,988 net; 1 deductive CO -$10,200; net contract delta +$23,460." Click to expand a CO log table. Replaces the "what's the contract worth right now?" mental computation with a visible answer.

**Required entities:** `change_orders` for this job

**Required engine capabilities:** Aggregation per status × direction (additive vs deductive).

**Phase target:** Wave 1.1-Lite

**Status:** planned

**Dependencies:** F1 entity model.

---

### WI-021: Cost code drill — click row → all related entities

**Description:** Click a cost code row → drill page shows all invoices, POs, COs, time entries, and material entries against that cost code on this job. Each row links to its source. Cost code becomes a query handle into the data graph.

**Required entities:** Many — `invoices`, `purchase_orders`, `change_orders`, `time_entries`, `material_entries` (TBD)

**Required engine capabilities:** Multi-entity union query per cost code; consistent presentation primitives.

**Phase target:** Wave 2

**Status:** planned

**Dependencies:** F4 time entries; F4 material entries; F5 cost-intelligence aggregation primitives.

---

### WI-022: Group by trade phase (sitework, MEP, finishes)

**Description:** Toggle the budget table between flat (every cost code) and grouped (sitework / structural / MEP / finishes / equipment). Groups roll up totals; collapse-by-default with click to expand per-group cost codes. Lets the PM scan budget at the right level of detail for the question.

**Required entities:** `cost_codes` with `category` field (already in fixture)

**Required engine capabilities:** Grouping engine; collapsible group rendering.

**Phase target:** Wave 1.1-Lite

**Status:** planned

**Dependencies:** None — schema supports today.

---

### WI-023: Filter by status (active, completed, not started)

**Description:** Filter budget rows by status: lines with no invoicing yet ("not started"), lines with active spend, lines fully drawn. Lets the PM focus on the trades that matter today (active) without scrolling past the 60% of lines that are 0% or 100%.

**Required entities:** Computed status from `total_to_date / revised_estimate`

**Required engine capabilities:** Filter UI; computed-field-as-filter.

**Phase target:** Wave 1.1-Lite

**Status:** planned

**Dependencies:** None.

---

### WI-024: Current draw filter (this Pay App #5 only)

**Description:** Toggle to show only lines with `this_period > 0` — i.e., lines being billed in the current draw. The G703 view, but as a filter. Lets the PM review just the slice that affects the in-flight pay application.

**Required entities:** `invoices.draw_id`, `draws.id`

**Required engine capabilities:** Per-draw filter on aggregated rows.

**Phase target:** Wave 1.1-Lite

**Status:** planned

**Dependencies:** None.

---

### WI-025: Proposal range comparison inline

**Description:** For lines where 3 sub bids exist (e.g., framing got bids from 3 carpenters during pre-construction), show the range inline: "Bid range: $48K-$58K; selected $48K (Bay Region)". The PM remembers what bids were on the table when revisiting the budget mid-build. Powers WI-006 vendor-performance feedback.

**Required entities:** `proposals` (TBD), `proposal_line_items` (TBD), `cost_codes`, `vendors`, `budget_lines`

**Required engine capabilities:** Proposal-to-budget-line linkage; bid range aggregation per cost code.

**Phase target:** Wave 2 (with proposals model)

**Status:** planned

**Dependencies:** F1 proposals entity model; pre-con phase work.

---

### WI-026: Per-line drill-down for full audit trail

**Description:** Click any cell in the budget grid → audit timeline for that line: all invoices, all COs, all status changes, all PM notes, all reconciliation drift events tied to this line. The line becomes a query into the activity_log filtered by entity_type + entity_id (or by cost_code_id for cross-entity rollup).

**Required entities:** `activity_log`, `budget_lines`, all referenced entities

**Required engine capabilities:** Per-entity audit timeline rendering; activity_log query primitives.

**Phase target:** Wave 2

**Status:** planned

**Dependencies:** F2 audit framework (already has activity_log).

---

### WI-027: Footer dev info removal

**Description:** The "30 of 30 budget lines · Site Office Compact Density" footer is diagnostic info, not user-facing data. Removed from production budget views. If a row count is needed, it lives in a view-options menu (not in page chrome).

**Required entities:** None — UI-only

**Required engine capabilities:** None.

**Phase target:** Stage 1.5c Plan 2 amendment (this doc) — **landed 2026-05-05**

**Status:** shipped

**Dependencies:** None.

---

## Section C — Cross-Cutting "No Other Tool Has This" Patterns (12 patterns)

These are the data-graph-as-moat differentiators. Each pattern requires entity relationships designed for cross-validation from F1, an engine intelligence layer, and a UX surface. None can be retrofitted with recompute alone — the graph and the engine are first-class.

### WI-028: Punchlist completion blocks final balance release

**Description:** State machine: a job's final draw cannot release until the punchlist is 100% closed. The Pay Apps engine queries the punchlist; if any item is open, the final draw is in `draft` and shows "blocked: 3 open punchlist items" with a deep-link to the punchlist. PM either resolves the punchlist (close items as done with photos) or escalates. Owner-facing draw approval shows the linkage so the owner sees why their final balance is on hold.

**Required entities:** `punchlist_items`, `draws`, `jobs`, `daily_logs` (for resolution evidence)

**Required engine capabilities:** F6 Pay Apps engine state machine; punchlist-to-draw blocking rule; owner-facing notification.

**Phase target:** F6 (Pay Apps engine — D-068)

**Status:** planned

**Dependencies:** Wave 2 punchlist model; F6 Pay Apps engine.

---

### WI-029: Daily log presence required before invoice approval

**Description:** No field activity (per daily log) for a vendor in a period = no invoicing valid for that vendor in that period. The invoice review surface refuses to mark `qa_approved` if the daily log has zero entries for the vendor's crew in the invoiced period. PM can override with a documented reason (logged in `pm_overrides`).

**Required entities:** `daily_logs`, `daily_log_entries` (with vendor + crew fields), `invoices`, `vendors`

**Required engine capabilities:** Daily-log-to-invoice correlation engine; period overlap detection; override-with-reason workflow.

**Phase target:** Wave 1.1-Lite (basic) + F5 (intelligence)

**Status:** planned

**Dependencies:** Wave 2 daily logs; F5 correlation engine; D-067.

---

### WI-030: Photo evidence required for milestone-tied invoices

**Description:** Invoices for milestone-tied cost codes (defined per `cost_codes.milestone_flag`) require photos in the daily log for that period showing the milestone (framing photos for framing-complete invoice, drywall photos for drywall-complete invoice). If photos missing, invoice flagged for PM photo confirmation before approval. AI photo-content classification (F5+) adds intelligence: "of 6 photos for the period, 0 show the framing structure".

**Required entities:** `daily_log_photos`, `cost_codes.milestone_flag`, `invoices`

**Required engine capabilities:** Photo-presence validation per period × cost code; AI photo classification (F5+).

**Phase target:** Wave 2 + F5 (intelligence)

**Status:** planned

**Dependencies:** Wave 2 daily logs + photos; F5 photo classifier.

---

### WI-031: Time entries reconcile to invoiced labor

**Description:** Sum of clocked hours per cost code per period must match invoiced labor hours per cost code per period. If the vendor invoices "16 hours of framing" but time entries show 12 hours of framing labor that period, the reconciliation surface flags the 4-hour drift. PM either validates (different definition of work, e.g., off-site fabrication time) or kicks back.

**Required entities:** `time_entries` (with cost_code + vendor + period), `invoice_line_items` (with cost_code + labor flag), `vendors`

**Required engine capabilities:** Time-entry-to-invoice reconciliation engine; drift detection per period × cost code × vendor.

**Phase target:** F5 (engine) + Wave 2 (reconciliation surface)

**Status:** planned

**Dependencies:** F4 time tracking; F5 Price Intel engine; D-067.

---

### WI-032: Vendor bid auto-flagged if bidding above historical average

**Description:** When a vendor submits a proposal/bid, the system computes their bid against historical market rates (Price Intel engine output). If the bid is N% above the market average for that scope at that time of year, the proposal review flags it inline. "Bay Region Carpentry usually bids 8% above market — current bid is 12% above; consider negotiation." Replaces gut-feel pricing with data-backed flags.

**Required entities:** `proposals`, `proposal_line_items`, `vendors`, Price Intel historical aggregations

**Required engine capabilities:** F5 Price Intel engine — historical bid aggregation per cost code × region × season; bid comparison engine.

**Phase target:** Wave 2 (with proposals) + F5 (intelligence)

**Status:** planned

**Dependencies:** F5 Price Intel engine; proposals entity model.

---

### WI-033: CO requires RFI or written authorization attached before invoicing

**Description:** A change order can be created without backup, but it cannot be invoiced against until an RFI (Request for Information) or signed written authorization is attached. Attempting to invoice against a CO with no authorization document blocks at QA. Forces the documentation discipline that today is followed by convention but not by enforcement.

**Required entities:** `change_orders`, `rfi` (TBD), `documents`, `invoice_co_link` (or `invoices.co_id`)

**Required engine capabilities:** Document-attachment-as-precondition state machine; RFI entity model.

**Phase target:** F6 (Pay Apps engine state machine) + Wave 2 (RFI model)

**Status:** planned

**Dependencies:** F1 RFI model; F2 status framework; D-067.

---

### WI-034: Sub schedule deviation auto-flags pay app

**Description:** Schedule engine tracks each sub's planned vs actual progress per scheduled task. If a sub is 2+ weeks behind schedule on tasks tied to current pay app cost codes, the pay app review flags: "Sub Carpentry is 2 weeks behind on framing; framing line being invoiced this period — verify quality and scope before approving." PM either confirms the work was done (catch-up) or holds the pay app pending resolution.

**Required entities:** `schedule_items`, `vendors`, `invoices`, `draws`

**Required engine capabilities:** Schedule deviation detection; sub-to-cost-code linkage; pay-app flagging engine.

**Phase target:** Wave 2 (schedule) + F6 (Pay Apps engine)

**Status:** planned

**Dependencies:** Wave 2 schedule model; F6 Pay Apps engine.

---

### WI-035: Lien release missing from previous draw blocks current draw

**Description:** State machine: if a vendor submitted a lien release for last draw that's still `pending` (not received), they cannot be invoiced into the current draw. Forces the lien-release discipline (Florida statute 713.20 chain-of-payment) at the engine level. PM can override with a documented reason for cases where lien release is in mail or follow-up needed.

**Required entities:** `lien_releases`, `invoices`, `draws`, `vendors`

**Required engine capabilities:** F6 Pay Apps engine state machine; lien-release-to-draw blocking rule.

**Phase target:** F6 (Pay Apps engine — D-068)

**Status:** planned

**Dependencies:** Wave 1.1-Lite lien-release tracking; F6 Pay Apps engine.

---

### WI-036: Inspection required before next-phase invoicing

**Description:** State machine: framing-complete inspection must pass before drywall invoices can be approved. Inspection records are entities; their pass-status is queried before invoicing for the dependent phase. Replaces the "I think framing inspection passed" knowledge in PM's head with a queryable fact.

**Required entities:** `inspections` (TBD), `cost_codes` (with phase + dependency mapping), `invoices`

**Required engine capabilities:** Inspection-to-phase-dependency engine; phase ordering.

**Phase target:** Wave 2 (inspections) + F6 (Pay Apps engine)

**Status:** planned

**Dependencies:** F1 inspections entity model; F6 Pay Apps engine.

---

### WI-037: Materials-delivered-per-daily-log before installation invoice valid

**Description:** Plumbing rough-in invoice valid only after the daily log shows plumbing materials delivered (per delivery photos / receiving entries). If materials show up in the invoice ("rough-in PEX, 12 fixtures") but daily logs have no record of those materials arriving on-site, flag.

**Required entities:** `daily_log_entries` (with material flag), `material_entries` (TBD), `invoices`, `cost_codes`

**Required engine capabilities:** Material-arrival-to-installation correlation; cost-code material-prerequisite mapping.

**Phase target:** Wave 2 + F5 (intelligence)

**Status:** planned

**Dependencies:** F4 material entries; F5 correlation engine.

---

### WI-038: Multi-modal punchlist — PM walks house with phone

**Description:** PM does the final walkthrough holding their phone. Open the camera. Walk room to room talking about what they see: "Kitchen island countertop has a chip on the left edge — Coastal Granite needs to remediate. Master bath shower glass is missing the brass clip in the upper right. Living room floor near the fireplace has a scratch — Sandhill Hardwood." Voice + video stream uploads. AI extracts: room location, vendor (matched against vendor catalog), description, photo (extracted frame from video at the moment described), assigned-to (vendor by default; can be overridden), due date (default + N days). Each becomes a structured punchlist item. PM finishes the walkthrough with 23 line items entered with zero typing.

**Required entities:** `punchlist_items`, `vendors`, `jobs`, voice transcripts (F3 ingestion), video frames (F3 ingestion)

**Required engine capabilities:** Multi-modal AI extraction (voice + video → structured items); F3 ingestion routing; vendor name matching; room/location detection from video.

**Phase target:** Wave 3 (D-069)

**Status:** planned

**Dependencies:** F3 multi-modal ingestion infrastructure; AI extraction engine; D-069.

---

### WI-039: Auto-generated daily plans

**Description:** System tells employees what to do based on their role, assigned work, schedule, weather, and historical patterns. PM logs in: "Today: review 3 invoices waiting on you (Bay Region + Coastal Smart + Anchor Bay); walk Caldwell foundation pour (delayed 2 days due to rain forecast); approve Burgess CO #6 deductive ($-12,400 framing reduction)." Sub logs in: "Today: Burgess framing day 4 — interior partitions; expected on-site 7 AM; lunch at 11:30; rain forecast at 3 PM consider tarping."

**Required entities:** Many — `users`, `roles`, `schedules`, `invoices`, `change_orders`, `daily_logs`, `weather_data`

**Required engine capabilities:** Personalized daily-plan engine; role-aware activity prioritization; weather + schedule awareness; "Today screen" personalization (extends D-055 / Principle 7 — Today as personal home).

**Phase target:** Wave 3 (D-070)

**Status:** planned

**Dependencies:** F2 roles + permissions; F3 schedule engine; F5 intelligence layer; D-070.

---

## Pattern Status Legend

- **planned** — Documented in this doc; not yet built. Most patterns at time of doc creation.
- **in progress** — Implementation underway in a current phase.
- **shipped** — Built and live (currently: WI-015, WI-016, WI-017 (CO portion), WI-027).

## Architectural Commitments

These patterns embody the architectural decisions in MASTER-PLAN.md §10:

- **D-066** — Cross-entity validation rules are first-class architectural concern. Patterns WI-028 through WI-039 are the data-graph-as-moat differentiator.
- **D-067** — Daily-log + time-entry + photo correlation is an F5 Price Intel engine capability. Single intelligence layer, multiple validation surfaces. Powers WI-010, WI-011, WI-012, WI-029, WI-030, WI-031, WI-037.
- **D-068** — Punchlist-blocks-release state machine is an F6 Pay Apps engine capability. Powers WI-028, WI-035 (and WI-033, WI-036 by extension).
- **D-069** — Multi-modal punchlist ingestion (WI-038) is a Wave 3 capability requiring voice + video + AI structured extraction infrastructure.
- **D-070** — Auto-generated daily plans (WI-039) is a Wave 3 capability built on roles engine + scheduling intelligence + Today-screen personalization.
- **D-071** — All 39 WI patterns are tracked in this doc as canonical phase-mapped backlog. F1 schema design must read WI patterns and design entities/relationships to support their eventual implementation.
- **D-072** — 1.5c IA mini-phase scope discipline maintained. Only WI-015, WI-016, WI-017 (CO portion), WI-027 land in 1.5c. All others defer to their target phase.

## Update Protocol

This is a canonical doc. Updates follow the propagation discipline in PROPAGATION-RULES.md:

1. **Adding a new pattern** — append a new WI-NNN entry. Update the section count in the section header. Add the pattern's commitments to MASTER-PLAN.md if it represents a new architectural decision.
2. **Marking a pattern as shipped** — change `Status: planned` to `Status: shipped` and add a "Shipped:" line with phase + commit hash. Update the Pattern Status Legend tally.
3. **Reassigning a phase target** — document the rationale in the pattern entry; update MASTER-PLAN.md if the change reflects a re-prioritization decision.
4. **Cross-doc updates** — when a related canonical doc (ARCHITECTURE.md, ENTITY-INVENTORY.md, ROLES-CATALOG.md, INGESTION-ARCHITECTURE.md) lands or is updated, sync the frontmatter `relationship_to_other_docs` block. Plan 7 will add the reciprocal links into ARCHITECTURE.md, ENTITY-INVENTORY.md, etc.

---

*Created: 2026-05-05 (Stage 1.5c Plan 2 amendment per Jake nwrp48)*
*Patterns: 39 total — Section A (16) + Section B (11) + Section C (12)*
*Shipped at creation: 4 (WI-015, WI-016, WI-017 CO portion, WI-027)*
*Cross-references pending: ARCHITECTURE.md, ENTITY-INVENTORY.md, ROLES-CATALOG.md, INGESTION-ARCHITECTURE.md (all created in Plan 7)*
