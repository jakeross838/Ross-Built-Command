# Entity Inventory (canonical)

**Locked:** 2026-05-04 (Stage 1.5c)
**Source:** Principle 2 ([ARCHITECTURE.md](./ARCHITECTURE.md)) + nwrp43 entity list + iter-2 mechanical #6 + CLAUDE.md "Data Model — Full Entity Map"

This document is canonical. F1 schema design reads it before designing tables. Each row's "Retention class" + "PII?" columns encode compliance posture (SOC2 C1.1 per ARCHITECTURE §7).

Cross-references:
- [ARCHITECTURE.md](./ARCHITECTURE.md) §7 SOC2 control mapping — C1.1 confidentiality references this doc's classification columns
- [WORKFLOW-INTELLIGENCE.md](./WORKFLOW-INTELLIGENCE.md) — cross-entity validation patterns reference these entities
- [ROLES-CATALOG.md](./ROLES-CATALOG.md) — role permissions scope these entities
- [INGESTION-ARCHITECTURE.md](./INGESTION-ARCHITECTURE.md) — multi-modal ingestion lands rows in these tables

---

## 31+ Entities (with Retention class + PII? columns per iter-2 mechanical #6)

| Entity | Description | F-N when shipped | Relationships | Retention class | PII? |
|--------|-------------|------------------|---------------|-----------------|------|
| Jobs | Universal parent | Wave 1 (existing) | →Vendors / Cost Codes / Pay Apps / etc. | tenant-deletion-lifecycle | yes (client_name, client_email, client_phone, address) |
| Vendors | Subs + suppliers | Wave 1 (existing) | →Bills / Lien Releases / Performance | tenant-deletion-lifecycle | no — B2B commercial contact info per D-079 (phone/email/address are published business data, not customer PII; sole-proprietor edge case acknowledged at D-079 trigger (iii) + finding-1-reclassification.md). W-9 TIN belongs in separate Tax Records entity row (Wave 4 vendor portal scope). |
| Clients | Homeowners + commercial | F1 | →Jobs / Pay Apps approval | forever (audit trail) | yes (name, email, phone, address) |
| Employees | Internal team | F2 (extends profiles + org_members) | →Roles / Time / Activity | tenant-deletion-lifecycle | yes (email, phone, comp data, SSN if stored) |
| Products | Material catalog (Selections VIEW) | F5 | →Vendors / Cost Codes | per-record | no |
| Cost Codes | 5-digit AIA categories | Wave 1 (existing) | →Budget Lines / Bills | per-record | no |
| Bills (vendor invoices) | What GC RECEIVES | Wave 1 (existing — renamed in 1.5c per D-051) | →Vendors / Jobs / Cost Codes / POs / COs / Pay Apps | forever (audit trail; activity_log preserves) | no (financial; no PII unless invoice mentions individual W-9) |
| Pay Apps (builder→owner) | What GC SENDS | Wave 1 (existing — renamed in 1.5c per D-051) | →Jobs / Pay App Line Items / Lien Releases | forever | no |
| Purchase Orders | Job-scoped vendor commitments | Wave 1 (existing) | →Vendors / Jobs / Cost Codes / COs | forever | no |
| Time Entries | Employees clock in | F4 | →Employees / Jobs / Cost Codes / Pay Apps | tenant-deletion-lifecycle | yes (employee identity, geo if GPS) |
| Equipment | Vehicles + tools | F4 | →Equipment Usage | tenant-deletion-lifecycle | no |
| Equipment Usage | Per-job time + cost | F4 | →Equipment / Jobs / Cost Codes | forever | no |
| Expenses | Non-job + corporate | F4 | →Cost Codes / Receipts | forever | varies (receipt may include cardholder name) |
| Change Orders | PCCO log entries | Wave 1 (existing) | →Jobs / Bills / POs / Pay Apps | forever | no |
| Lien Releases | Florida 4-statute types | Wave 1 (existing — partial; F1 fixes R.7) | →Vendors / Bills / Pay Apps | forever (legal record) | yes (vendor signatory name) |
| Documents | Plans/specs/contracts/lien releases | Wave 2 | →Jobs / Vendors / Type discriminator | forever (typically) | varies (contracts have signatory PII) |
| Photos | Categorized + tagged | Wave 2 | →Jobs / Rooms / Vendors | tenant-deletion-lifecycle | varies (people-in-photos) |
| Schedule Items | Gantt timeline | Wave 2 | →Jobs / Predecessors / Vendors | tenant-deletion-lifecycle | no |
| Daily Logs | Voice/video AI extraction | Wave 2 | →Jobs / Photos / Punchlist | tenant-deletion-lifecycle | varies (voice transcripts may name people) |
| RFIs | Sub responds via magic link | Wave 2/3 | →Jobs / Subs / Submittals | forever (audit) | yes (sub identity, response content) |
| Submittals | Sub deliverable docs | Wave 2/3 | →Jobs / Subs / Architects | forever | varies |
| Punchlist Items | Voice/video punchlist | Wave 2 | →Jobs / Rooms / Products / Vendors / To-Dos | tenant-deletion-lifecycle | varies |
| To-Dos | Job-scoped tasks | Wave 2 | →Jobs / Employees / Punchlist | tenant-deletion-lifecycle | no |
| Activities | Event log (existing activity_log) | Wave 1 (existing) | →ALL entities (audit trail) | **forever** (audit-log-preservation rule per CLAUDE.md soft-delete + status_history) | varies (logs entity_id which may indirectly tie to PII) |
| Permits | Building permits + inspections | Wave 2/3 | →Jobs / Permit categories | forever (legal record) | varies |
| Insurance Policies | Corporate liability | Wave 2 | →Vendors (sub COIs) / Compliance | forever | yes (policy holder identity) |
| Tax Records | W-9s + 1099s | Wave 4 | →Vendors / Employees / Jobs | forever (legal/tax record) | yes (TIN/SSN) |
| Selections | Picked → spec → ordered → delivered → installed → warranty | Wave 4 | →Products / Jobs / POs / Vendors | tenant-deletion-lifecycle | no |
| Estimates | Price Intel powered | Wave 4 | →Jobs (pre-con) / Cost Codes | tenant-deletion-lifecycle | varies |
| Proposals | E-sign proposals | Wave 1 (existing) | →Jobs / Clients / Contracts | forever (legal record) | yes (signatory identity) |
| Contracts | Owner contracts + sub master | Wave 4 | →Clients / Jobs / Vendors | forever | yes (signatory identity) |
| Bids | Sub bids in flight | Wave 4 | →Jobs / Vendors / Estimates | tenant-deletion-lifecycle | no |
| client_portal_access | Owner/sub magic links (migration 00074) | existing | →Jobs (scope-bound) | per-record (token expiry) | no (SHA-256 hashed token) |
| platform_admins | Cross-org operator gate (migration 00048) | existing | →auth.users (user_id-bounded) | per-record | no (operator identity tied to auth.users only) |

---

## Legend

- **Retention class:**
  - `forever` — never deleted; audit-trail or legal record. Survives org-delete (audit log preservation). Examples: activity_log, lien_releases (legal), proposals (legal), permits (legal), tax records.
  - `tenant-deletion-lifecycle` — deleted on org delete (cascade via foreign-key constraints + RLS); preserved while org active. Soft-delete (`deleted_at`) within active org. Examples: jobs, vendors, time_entries, photos, daily_logs.
  - `per-record` — varies per row (e.g., token expiry; soft-deleted with grace period). Examples: client_portal_access (tokens expire), platform_admins (manual grant/revoke).
- **PII?** — flagged where personally identifiable information is stored:
  - `yes` — direct PII (name, email, phone, SSN, TIN, signatory identity, address)
  - `no` — financial/structural only; no PII
  - `varies` — PII may appear in nested content (e.g., voice transcript names a person; receipt cardholder name)

---

## Relationships (knowledge graph spine)

Per Principle 2, F1 schema design must enable cross-entity queries. Key spine relationships:

- **Jobs is universal parent.** Every operational entity → Jobs (FK or join table).
- **Vendors ↔ Cost Codes** via `default_cost_code_id` (existing) + per-bill cost code (existing).
- **Bills ↔ POs** via `po_id` (existing — partial); F1 adds `commitment_id` for UCM consolidation (working title per D-027).
- **Pay Apps ↔ Bills** via `draw_line_items` (existing) — pay app aggregates approved bills in period.
- **Activities (activity_log) ↔ ALL entities** via `entity_type` + `entity_id` (Strategy 1-prime per AUDIT-LOG-STRATEGY.md; iter-2 must-fix #5 schema-aware).
- **Photos ↔ Daily Logs ↔ Punchlist Items** (Wave 2 → 3) — multi-modal ingestion fanout.
- **Time Entries ↔ Pay Apps** (F4 → F6) — Time → Pay App flow auto-generates billable line items.
- **client_portal_access ↔ Jobs** (existing) — token-scoped per job; F1 commits to extending OR introducing owner_view (multi-tenant W-1 per ARCHITECTURE §8).
- **platform_admins ↔ auth.users** (existing — user_id-bounded SELECT per migration 00048).

Cross-validation patterns: see [WORKFLOW-INTELLIGENCE.md](./WORKFLOW-INTELLIGENCE.md) WI-001..WI-039.

---

## F1 schema design checklist

When F1 starts entity-table work, verify each entity in this catalog has:

1. **`id` UUID + `created_at` / `updated_at` / `created_by` / `org_id`** (per CLAUDE.md Architecture Rules).
2. **Soft-delete via `deleted_at`** (per CLAUDE.md "Never delete records").
3. **`status_history` JSONB** if workflow entity (per CLAUDE.md).
4. **RLS policies filtering on `org_id`** (per CLAUDE.md "Multi-tenant RLS is non-negotiable").
5. **Audit-log writes** via `activity_log` (entity_type + action per Strategy 1-prime).
6. **Retention class enforcement** — `forever` entities NEVER hard-deleted (cascade-protected); `tenant-deletion-lifecycle` entities cascade on org delete.
7. **PII flag** in F1 audit report — every `yes`/`varies` row reviewed for encryption-at-rest + audit-trail completeness.

---

**End of ENTITY-INVENTORY.md.** F1 schema design inherits this catalog; cross-entity validation patterns in WORKFLOW-INTELLIGENCE.md reference these entities by name.
