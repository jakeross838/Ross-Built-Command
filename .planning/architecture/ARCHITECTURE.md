# Architecture (canonical)

**Locked:** 2026-05-04 (Stage 1.5c)
**Source:** Jake nwrp43 + 1.5c discuss-phase + plan-phase outputs + nwrp44 amendments + nwrp45 iter-2 amendments + nwrp46 iter-3 amendments

This document is canonical. Future plan-phase / research-phase / execute-phase agents read it first.

---

## 0. Purpose

Lock the 8 architectural principles + data graph model + section purposes + phase plan that govern Nightwork from F1 onward. Provide SOC2 control mapping (CC6.1 / CC6.6 / CC6.7 / CC7.2 / PI1.1 / C1.1) so compliance posture is design-time-visible.

Cross-references:
- [ENTITY-INVENTORY.md](./ENTITY-INVENTORY.md) — 31+ entity catalog with Retention class + PII? columns (iter-2 mechanical #6)
- [ROLES-CATALOG.md](./ROLES-CATALOG.md) — 15+ default roles with Cross-org? column (iter-2 mechanical #6)
- [INGESTION-ARCHITECTURE.md](./INGESTION-ARCHITECTURE.md) — multi-modal ingestion patterns
- [WORKFLOW-INTELLIGENCE.md](./WORKFLOW-INTELLIGENCE.md) — 39 cross-entity validation patterns (WI-001..WI-039 per D-066/D-071)
- [VERIFICATION-PIPELINE.md](./VERIFICATION-PIPELINE.md) — 3-layer verification harness per D-073
- [MASTER-PLAN.md](../MASTER-PLAN.md) — DECISIONS LOG (D-001..D-077; D-040..D-065 added by Stage 1.5c)

---

## 1. The 8 principles (canonical)

### Principle 1 — Data-first foundation

Every event in the lifecycle of a construction company is a data point. Every entity is queryable. Reports are emergent (queries against the graph), not hand-built features. The data graph is the moat.

**Implication for F1+:** schemas designed for cross-entity queries from day one. No siloed "this is the invoices module" thinking — every entity participates in the graph.

### Principle 2 — Knowledge graph data model

F1+ phases must build a relational entity-relationship knowledge graph. See [ENTITY-INVENTORY.md](./ENTITY-INVENTORY.md) for the 31+ entity catalog. Entities + relationships + cross-validation patterns (per [WORKFLOW-INTELLIGENCE.md](./WORKFLOW-INTELLIGENCE.md)) form the substrate.

**Implication for F1+:** entity schemas accept eventual cross-validation. WI patterns guide relationship design (e.g., daily logs reference photos reference jobs reference cost codes — links are first-class).

### Principle 3 — Cost Intelligence is BOTH a layer AND destinations

Price Intel surfaces inline (every cost-quoting screen consults the engine) AND as its own primary nav section (cost lookup, vendor performance, anomaly detection).

**Implication for F1+:** F5 (Price Intel engine) is a shared dependency for F1's invoice review, F2's estimating, F6's pay apps. Engine ships once; surfaces consume.

### Principle 4 — Cross-pollination of data on every ingestion event

ONE event, MULTIPLE entities updated. Invoice arrives → vendor record updated (last-invoiced-date) + budget line updated (committed-to-date) + cost code performance updated (price-per-unit) + price intel updated (historical-cost) + audit log written. Single ingest, fanout.

**Implication for F1+:** ingestion routes write to multiple tables in a single transaction. Fanout is explicit (Inngest functions per D-022) not implicit.

### Principle 5 — Aggressive ingestion across modalities

Email-in / voice / video / photo / form fill / paste / scanner. Multi-modal ingestion routes to the same entity layer. See [INGESTION-ARCHITECTURE.md](./INGESTION-ARCHITECTURE.md).

**Implication for F1+:** F3 wires email-in + magic-link forms; Wave 3 adds voice/video AI extraction (WI-038 punchlist multi-modal per D-069). Same schema, different sources.

### Principle 6 — Role-aware everything

Same nav structure for all users; visibility filtered per role. Data-driven ACCESS map enables F2 expansion to 15 roles mechanically. See [ROLES-CATALOG.md](./ROLES-CATALOG.md) for the 15+ role catalog.

**Implication for F1+:** F2 wires real role + permission engine. 1.5c lands 4-role baseline ACCESS map; F2 swaps in 15-role matrix without nav-bar refactor.

### Principle 7 — Today as personal home screen

Dashboard renamed Today. Personal home screen replaces generic dashboard. Action-oriented; role-aware (F2). Cash Flow + Getting Started belong in /company/overview, not /today.

**Implication for F1+:** Today screen scaffold landed in 1.5c. F2/Wave 1.1-Lite adds per-role personalization. Wave 3 (D-070) auto-generates daily plans from schedule + assigned work + role + weather + historical patterns.

### Principle 8 — External access via magic links + universal applicability

Subs/architects/inspectors/owners act without full accounts. Magic-link infrastructure extends `client_portal_access` (migration 00074) to subs (F3), architects (F3), inspectors (F3 public link), owners (F1 commits to ONE auth path per multi-tenant W-1).

**Implication for F1+:** F1 picks Path A (extend `client_portal_access` tokens) OR Path B (introduce `owner_view` role with RLS) for owner portal — NOT both. F3 wires sub/architect/inspector magic-link engine.

---

## 2. Top nav structure

8 sections (per D-040): **Today | Pipeline | Jobs | Financials | Price Intel | People | Company | Reports**

Plus chrome elements: **Admin ▾** dropdown (per D-060 power-user shortcut), **Platform Admin** badge (per D-058 platform_admin gate), **Notifications** bell, **User menu**.

Per D-060: Admin dropdown is power-user shortcut (top-nav direct access to settings sub-items); `/admin` section overview Card grid is canonical destination (clicking "Admin" label routes to /admin overview; ▾ affordance opens dropdown). Both surfaces simultaneously; no UX duplication.

---

## 3. Per-job sub-nav

Primary tabs: **Overview | Schedule | Budget | Selections | Bills | Pay Apps | More ▾**

On viewports <768px (per D-059): collapses to single dropdown showing all tabs (matches existing nav-bar mobile hamburger pattern).

**More ▾** contents:
- **Documentation:** Plans / Specs / Photos / Documents
- **Coordination:** RFIs / Submittals / Change Orders / Daily Logs
- **Tasks:** To-Dos / Punchlist
- **Time** / **Permits** / **People** / **Activity**
- **Phase-aware:** Closeout (visible when phase ∈ {close, warranty}) / Warranty (visible when phase=warranty) / Pre-Con (visible when phase=pre-con)

---

## 4. Section purposes

- **Today** (Principle 7) — personal home; action items + Your Day + activity feed. Org-wide queues at Wave-zero (F2 personalizes; Wave 3 D-070 auto-generates).
- **Pipeline** — pre-construction leads + bids out + proposals out (Custom Builder profile prominent; Remodeler lighter per Principle 8).
- **Jobs** — universal parent. Per-job sub-nav (§3) for active jobs. List+Detail for landing.
- **Financials** — Bills (vendor invoices, D-051) + Pay Apps (builder→owner pay applications, D-051) + budgets + POs + COs + lien releases (R.7 fix in F1) + payments (F1 first-class per D-033).
- **Price Intel** (Principle 3) — cost lookup + vendor performance + anomaly detection + selections catalog (F5 wires engine).
- **People** — vendors + clients (F1 schema) + employees (F2 expands) + subs.
- **Company** — overview (Cash Flow / Getting Started moved here per Principle 7) + expenses (F4) + reports.
- **Reports** — emergent (queries against graph); not hand-built features (Principle 1).
- **Admin ▾ + /admin overview** (D-060) — settings + cost codes + profile (placeholder per Principle 8 / D-047) + roles (F2 wires) + billing (Stripe; iter-2 mechanical #4 wires `/settings/billing` redirect to `/admin/billing`).
- **Platform Admin** (cross-org operator gate per migration 00048; D-058 /platform-admin migration; iter-2 must-fix #4 LOCKS Option A).

---

## 5. Site Office direction scope (per D-057 + D-061)

Production routes activate Site Office direction-aware CSS rules via TWO prerequisites that BOTH must be in place:

1. **Root layout** `src/app/layout.tsx` imports `@/app/design-system/design-system.css` so the rules bundle into all routes (per Plan 1 task / D-23).
2. **Each production route wrapper** uses `<div data-direction="C" data-palette="B" className="design-system-scope">` mirroring the playground layout at `src/app/design-system/prototypes/layout.tsx:39` (per Plan 3 task / D-19).

Without BOTH, Site Office C-specific signatures (1px slate-tile left-stamp, JetBrains Mono UPPERCASE eyebrows at 0.18em, Space Grotesk Medium 500 headlines, 16px compact card padding, 16px section gap, 150ms ease-out motion) are inert.

**Production baseline (without the wrap)** already inherits ~70% of Site Office at root level via globals.css + colors_and_type.css + NwEyebrow inline `var(--…, fallback)` pattern (Inter body 15px, JetBrains Mono UPPERCASE eyebrow at 0.14em base, slate palette with light/dark theme, grain texture). The wrap closes the remaining 30% — the C-specific overrides.

**DO NOT REMOVE the wrap or strip the attributes** — this is load-bearing on production. Stripping the wrap drops production back to the 70% baseline. See [PATTERNS.md](../design/PATTERNS.md) "Production Site Office activation" entry for the load-bearing contract.

---

## 6. Revised phase plan

(Per [EXPANDED-SCOPE.md](../expansions/stage-1.5c-information-architecture-EXPANDED-SCOPE.md) Part 6 / D-050 / D-049.)

### F1 — Knowledge Graph Schema + Auth Foundation (3-4 weeks)

Real data graph entities + relationships in Supabase. Multi-tenant RLS at entity level. Audit trails on every entity. Auth + organization model. Magic link infrastructure (for F4 magic-link external access). Email-in receiving infrastructure. Foundation for ingestion routing. Stage 1.5b prototypes wired to real entities (read-only first).

**F1 first-day tasks (per D-035 F0-absorbed):** drop `change_order_budget_lines`; add `lien_releases.status_history`; fix docx-html auth; decide `budgets` table fate. Reference-job cost-code wipe-and-reseed per D-020.

### F2 — Roles Engine + Today Engine (2-3 weeks)

Roles + permissions engine (real implementation). Default role library (~15 roles from Principle 6; see [ROLES-CATALOG.md](./ROLES-CATALOG.md)). Permission matrix UI. Org Chart visual. Today screen role-aware logic. Phase-aware per-job nav (logic, not just structure). Profile-based feature flags (Principle 8).

### F3 — Approval + Notification Engines (2 weeks)

Approval workflow engine (customizable per company; per D-024 invoice flow first). Notification routing engine. Magic link external access (subs respond to RFIs, sign POs without account). Sub Portal authenticated experience. Email + transcript ingestion routing (basic — full AI routing in Wave 3).

Inngest Cloud per D-022 (managed; pg_cron complementary).

### F4 — Time Tracking + Equipment + Expenses (2 weeks)

Time tracking engine (employees clock in to jobs/cost codes). Equipment tracking + allocation. Expense management. Time → Pay App flow (auto-generate billable line items). Time → Payroll integration (QuickBooks). Time → Price Intel feeding (learn real labor costs per cost code).

Reference-job historical back-import via V.2 portability framework as dogfood pass (per D-025/D-031).

### F5 — Price Intel Engine (3-4 weeks)

Cost intelligence learning engine — the moat starts compounding. Cross-entity pollination (Principle 4). Anomaly detection. Cost lookup search. Vendor performance scoring. Verification queue. Bid comparison engine.

Powers WI-010/011/012/029/030/031/037 cross-entity validation per D-067 (single intelligence layer, multiple validation surfaces).

### F6 — Pay App + Draw Engine (2 weeks)

Pay apps assembled from data (query against time + invoices + COs). G702/G703 production-ready printing (AIA reference Pay App 8). Lien release workflow. Owner approval flow.

Powers WI-028/035/033/036 punchlist-blocks-release state machine per D-068.

### Wave 1.1-Lite (per D-049)

Subset of Wave 1.1 polish that Ross Built can use immediately post-F6. Excludes large-blast items deferred to Wave 1.1-Full. Cosmetic TDs from 1.5c deferred backlog (TD-21/22/23/24/27/28 per D-056) land here when real backend exists.

### Wave 2

Project operations: schedules + daily logs + punchlists + to-dos + document management. Schedule intelligence schema fields ship in F3.

### Wave 3

Communication: email intake + weekly owner updates + in-app notifications + client portal. Multi-modal punchlist ingestion (WI-038 per D-069). Auto-generated daily plans (WI-039 per D-070).

### Wave 4

Intelligence: reports + analytics + AI insights + selections catalog full.

---

## 7. SOC2 control mapping (iter-2 mechanical #6)

Stage 1.5c is structural — no new auth surfaces; preserves existing posture per CLAUDE.md "Multi-tenant RLS is non-negotiable" + "Platform admin (cross-tenant)" sections.

| SOC2 Control | Description | Implementation |
|--------------|-------------|----------------|
| **CC6.1** Logical access | Authentication + authorization gates | Middleware `isPlatformAdmin` gate at `/admin/platform/*` + `/platform-admin/*` (per iter-2 must-fix #4 LOCKS Option A); 8-section nav ACCESS map role-gated; `getCurrentMembership()` filters every API query (per CLAUDE.md "Every API route uses getCurrentMembership() before DB access"). |
| **CC6.6** Boundary protection | Tenant isolation | Tenant-blind primitives in `src/components/ui/` accept NO `org_id` / `membership` / `vendor_id` props (hook enforced per SPEC A12.1); RLS at every query layer; Caldwell fixtures sanitized per 1.5b SUBSTITUTION-MAP.md. |
| **CC6.7** Restricted access | Audit + scoping | `platform_admins` table SELECT policy is user_id-bounded (cross-org by design per migration 00048); `org_id` RLS on every tenant table; iter-2 must-fix #4 confirms /platform-admin/* gates non-platform_admin redirected. |
| **CC7.2** System monitoring | Observability | Sentry tags `user_id`, `org_id`, `impersonation_active`, `platform_admin` set in middleware per request; Sentry filtered queries enable cross-org investigation by platform_admins (per CLAUDE.md "Platform admin" section). |
| **PI1.1** Processing integrity (audit trail) | Change tracking | `activity_log` table: `entity_type` + `action` separate columns (per `src/lib/activity-log.ts:20-49`); `status_history` JSONB on workflow entities (per CLAUDE.md "Soft delete + status_history JSONB"); `src/lib/audit/action-labels.ts` maps DB enum to UI labels (Strategy 1-prime per [AUDIT-LOG-STRATEGY.md](../phases/stage-1.5c-information-architecture/AUDIT-LOG-STRATEGY.md)). F1 may extend enum or migrate; until then dual vocabulary (Bills/Pay Apps UI labels over invoice/draw entity_type) is the convention. |
| **C1.1** Confidentiality | Data classification | See [ENTITY-INVENTORY.md](./ENTITY-INVENTORY.md) "Retention class" + "PII?" columns per iter-2 mechanical #6. |

---

## 8. Owner Portal F1 auth path constraint (iter-2 multi-tenant W-1)

CONTEXT D-08's "owner_view role gate" claim is misleading. iter-2 clarification:

- **1.5c is structural** — Owner Portal at `/owner-portal/*` mounts thin-wrapper components with Caldwell fixtures (Plan 3). NO real auth flow exercised in 1.5c.
- **F1 wires real backend. F1 commits to ONE auth path:**
  - **Path A:** Extend `client_portal_access` token model (SHA-256 + service-role-API + anon-grant per migration 00074). Token-scoped per job; cookie-bound session; no `owner_view` membership row needed.
  - **Path B:** Introduce `owner_view` member role with RLS for owner-scoped reads. Owner has an `org_members` row with `role='owner_view'`; RLS policies grant SELECT on scoped entities only.
- **NOT both.** F1 picks one; the other is rejected by-construction.

**Rationale for forcing the choice:** dual auth paths create permission-stack reasoning overhead (auditor reviewing "how did this owner see this invoice?" must trace through 2 code paths). Single auth path = single mental model = single audit trail.

**Plan 7 documents this so F1 inherits the constraint.** Implementation choice is F1's call.

---

## 9. RLS posture summary table by entity (per DEF-WC-3 / B-3)

Captures the as-is RLS posture for every tenant-scoped entity post-B-3 ship (2026-05-22). Pattern variance documented to enable future Pattern B → Pattern A uniformity sweep (deferred to Wave 1.1-Lite per B-3-CONTEXT D-48).

**Cross-references:**
- [ENTITY-INVENTORY.md](./ENTITY-INVENTORY.md) — Retention class + PII? columns
- [phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-3-PLAN.md §2.4](../phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-3-PLAN.md) — full design rationale

| Entity (table) | RLS pattern | Scope axis (Q10b) | Soft-delete trigger | Audit coverage |
| --- | --- | --- | --- | --- |
| approval_chains | B (PERMISSIVE-only joins) | ORG-scoped tenant | YES (B-3) | Trigger only |
| budget_lines | A (RESTRICTIVE backstop) | ORG-scoped tenant | YES (B-3) | Trigger only |
| change_order_lines | A | ORG-scoped tenant | YES (B-3) | Trigger only |
| change_orders | A | ORG-scoped tenant | YES (B-3) | Both (app `logActivity` + trigger) |
| clients | B (PERMISSIVE-only — 3 PERMISSIVE policies, NO RESTRICTIVE backstop per live `pg_policies`) | ORG-scoped tenant | YES (B-3) | Both |
| cost_codes | A | ORG-scoped tenant | YES (B-3) | Trigger only |
| document_extraction_lines | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| document_extractions | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| draw_adjustment_line_items | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| draw_adjustments | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| draw_line_items | A | ORG-scoped tenant | YES (B-3) | Trigger only |
| draws | A | ORG-scoped tenant | YES (B-3) | Both (app + trigger) |
| internal_billings | A | ORG-scoped tenant | YES (B-3) | Trigger only |
| invoice_allocations | A (Q10b SELECT-wrapped — sole table on this form; see migration 00096) | ORG-scoped tenant | YES (B-3) | Trigger only |
| invoice_line_items | A | ORG-scoped tenant | YES (B-3) | Trigger only |
| invoices | A | ORG-scoped tenant | YES (B-3) | Both (app + trigger) |
| items | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| job_item_activity | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| job_milestones | B | ORG-scoped tenant | YES (B-3) | Both (app + trigger) |
| jobs | A | ORG-scoped tenant | YES (B-3) | Both (app + trigger) |
| lien_releases | A | ORG-scoped tenant | YES (B-3) | Both (app + trigger) |
| line_bom_attachments | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| line_cost_components | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| po_line_items | A | ORG-scoped tenant | YES (B-3) | Trigger only |
| proposal_line_items | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| proposals | B | ORG-scoped tenant | YES (B-3) | Both (app + trigger) |
| purchase_orders | A | ORG-scoped tenant | YES (B-3) | Both (app + trigger) |
| selection_categories | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| selections | B | ORG-scoped tenant | YES (B-3) | Both (app + trigger) |
| unit_conversion_suggestions | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| vendor_item_pricing | B | ORG-scoped tenant | YES (B-3) | Trigger only |
| vendors | A | ORG-scoped tenant | YES (B-3) | Trigger only |
| org_members | A (post-B-3 DEF-WC-1; canonical direct-call form) | ORG-scoped tenant | N/A (no deleted_at column) | App only |
| activity_log | A | ORG-scoped tenant | N/A (append-only; no deleted_at column) | N/A (IS the audit) |
| platform_admins | Special (cross-org) | Cross-tenant | N/A | App only |
| client_portal_access | B (PERMISSIVE-only — 3 PERMISSIVE policies; uses `revoked_at`/`expires_at` lifecycle NOT `deleted_at`) | ORG-scoped tenant | N/A (no deleted_at; uses revoked_at lifecycle) | App only |

**Legend:**
- **RLS pattern A** = canonical Wave-A: RESTRICTIVE "org isolation" backstop + role-bound PERMISSIVE writes (per migration 00080 / 00094 sweep)
- **RLS pattern B** = pre-Wave-A: PERMISSIVE-only with `org_id IN (SELECT FROM org_members)` JOIN-style isolation (17 tables + `client_portal_access`)
- **Scope axis Q10b** — ORG-scoped tenant (direct-filter RLS) vs USER-scoped child (RLS-by-join, e.g., `support_messages`)
- **Soft-delete trigger** — `zz_soft_delete_audit_<table>` from B-3 fires on `deleted_at` transition NULL → NOT NULL; uses generic CASE-mapped singular entity_type
- **Audit coverage** — application-layer `logActivity` calls + trigger-layer `audit_soft_delete` complement (B-3 trigger fills the gap for the 22 "trigger only" tables; the 10 "both" tables ALREADY had application-layer audit via `logActivity` before B-3)

**Sweep plan (Wave 1.1-Lite):** Convert Pattern B → Pattern A for the 17 PERMISSIVE-only tenant tables + `client_portal_access`. Adds RESTRICTIVE backstop matching the canonical 15-table Wave-A shape. NOT in B-3 scope (B-3 is trigger + `org_members` DEF-WC-1 only).

---

## 10. Decisions reference

D-001..D-077 in [MASTER-PLAN.md DECISIONS LOG](../MASTER-PLAN.md). 1.5c phase decisions D-01..D-27 in [stage-1.5c-information-architecture/CONTEXT.md](../phases/stage-1.5c-information-architecture/CONTEXT.md).

D-040..D-065 (Stage 1.5c additions):

| ID | Date | Decision |
|----|------|----------|
| D-040 | 2026-05-04 | Top nav 8-section structure locked |
| D-041 | 2026-05-04 | Today as personal home (Principle 7) |
| D-042 | 2026-05-04 | Knowledge graph as F1+ data model |
| D-043 | 2026-05-04 | Roles + permissions in F2 |
| D-044 | 2026-05-04 | Magic link external access in F3 |
| D-045 | 2026-05-04 | Aggressive multi-modal ingestion architecture (Principle 5) |
| D-046 | 2026-05-04 | Price Intel as both layer + destination (Principle 3) |
| D-047 | 2026-05-04 | Profile-based feature flags (F2 wires; 1.5c placeholder) |
| D-048 | 2026-05-04 | Phase-aware per-job nav (F2 wires) |
| D-049 | 2026-05-04 | Wave 1.1 split into 1.1-Lite + 1.1-Full |
| D-050 | 2026-05-04 | F1-F6 expanded scope vs original F1-F4 |
| D-051 | 2026-05-04 | 1.5c full Bills/Pay Apps terminology rename (schema-aware per iter-2 must-fix #5) |
| D-052 | 2026-05-04 | 1.5c Sub Portal 3-stub structure with F3 compliance contracts |
| D-053 | 2026-05-04 | 1.5c thin-wrapper extraction (12 prototype components → props-only Views) |
| D-054 | 2026-05-04 | 1.5c mobile chrome priority |
| D-055 | 2026-05-04 | Today screen Wave-zero layout (Q6=C) |
| D-056 | 2026-05-04 | 1.5c structural TD fixes only (TD-20/25/26) |
| D-057 | 2026-05-05 | Site Office .design-system-scope wrapping for production routes (Decision A) |
| D-058 | 2026-05-05 | Full /admin/platform → /platform-admin migration in 1.5c (Decision B-modified) |
| D-059 | 2026-05-05 | PerJobTabs collapse to dropdown <768px (Decision C) |
| D-060 | 2026-05-05 | Admin dropdown shortcut + /admin canonical destination (Decision D) |
| D-061 | 2026-05-05 | Decision A patch — wrap mirrors playground + design-system.css from root |
| D-062 | 2026-05-05 | PATTERNS.md inheritance paragraph reconciliation |
| D-063 | 2026-05-05 | SEC-9 audit viewer Supabase client type verify |
| D-064 | 2026-05-05 | SEC-10 production wrappers tenant-attribute grep verify |
| D-065 | 2026-05-05 | Atomic commit title: 4 NEW + 6 UPDATED |

---

**End of ARCHITECTURE.md.** Future plan-phase agents read this first; F1+ schema design inherits the 8 principles + Owner Portal auth constraint.
