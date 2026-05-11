# Nightwork — Project Context (canonical)

**Updated 2026-05-04 (Stage 1.5c iter-2)**
**Source:** Stage 1.5c plan-phase outputs + nwrp43 + nwrp44/45/46 amendments

This document is the project-level canonical context that future plan-phase, research-phase, and execute-phase agents read at session start. It points to the deep canonical docs at `.planning/architecture/` and `.planning/design/` and locks the architectural posture for F1+.

For day-to-day standing rules, see [CLAUDE.md](../CLAUDE.md) (root). For the canonical entry point with full DECISIONS LOG, see [MASTER-PLAN.md](./MASTER-PLAN.md).

---

## 1. The 8 architectural principles (canonical)

Locked at Stage 1.5c (per D-040..D-050). Full text in [architecture/ARCHITECTURE.md](./architecture/ARCHITECTURE.md) §1:

1. **Data-first foundation** — every event is a data point; reports are emergent queries.
2. **Knowledge graph data model** — F1+ entity-relationship graph; see [ENTITY-INVENTORY.md](./architecture/ENTITY-INVENTORY.md).
3. **Cost Intelligence is BOTH a layer AND destinations** — Price Intel inline + as primary nav section.
4. **Cross-pollination of data on every ingestion event** — ONE event, MULTIPLE entities updated.
5. **Aggressive ingestion across modalities** — voice / video / photo / email / scanner; see [INGESTION-ARCHITECTURE.md](./architecture/INGESTION-ARCHITECTURE.md).
6. **Role-aware everything** — same nav, filtered per role; see [ROLES-CATALOG.md](./architecture/ROLES-CATALOG.md).
7. **Today as personal home screen** — Dashboard renamed Today; F2 personalizes.
8. **External access via magic links + universal applicability** — subs / architects / inspectors / owners act without full accounts.

---

## 2. Role-aware as architectural requirement

Per Principle 6 (D-043 + D-047 + D-048). Same nav structure for all users; visibility filtered per role. Data-driven ACCESS map enables F2 expansion to 15 roles mechanically.

15+ default roles catalogued at [ROLES-CATALOG.md](./architecture/ROLES-CATALOG.md) with Cross-org? column flagging `platform_admin` as the only cross-org role.

Profile-based feature flags (Custom Builder / Remodeler / Commercial GC) drive nav prominence per org type. Ross Built profile = Custom Builder (default).

---

## 3. Knowledge graph as F1 deliverable

Per Principle 2 (D-042 + D-066 + D-071). F1 schema design reads [ENTITY-INVENTORY.md](./architecture/ENTITY-INVENTORY.md) (31+ entities with Retention class + PII? columns per iter-2 mechanical #6) and [WORKFLOW-INTELLIGENCE.md](./architecture/WORKFLOW-INTELLIGENCE.md) (39 cross-entity validation patterns per D-066/D-071) before designing tables.

Knowledge graph entities + relationships + cross-validation patterns form the data graph moat (Principle 1).

---

## 4. 8-section top nav structure

Per D-040 + D-051 (Bills/Pay Apps terminology). Locked at Stage 1.5c.

**Sections:** Today | Pipeline | Jobs | Financials | Price Intel | People | Company | Reports

**Chrome:** Admin ▾ dropdown (D-060 power-user shortcut) + Platform Admin badge (D-058) + Notifications bell + User menu.

Full structure in [architecture/ARCHITECTURE.md](./architecture/ARCHITECTURE.md) §2.

---

## 5. Per-job sub-nav structure

Primary tabs (D-053): Overview | Schedule | Budget | Selections | Bills | Pay Apps | More ▾

Mobile (<768px per D-059): collapses to single dropdown.

More ▾ catalogues Documentation / Coordination / Tasks / Time / Permits / People / Activity + phase-aware Closeout / Warranty / Pre-Con.

Full structure in [architecture/ARCHITECTURE.md](./architecture/ARCHITECTURE.md) §3.

---

## 6. Multi-modal ingestion architecture

Per Principle 5 (D-045) + WI-038/D-069 + WI-039/D-070.

Modalities: Email-in / Magic-link form / Scanner / Voice / Video / Photo / Paste / API / Realtime UI events. Same entity layer; same schema; different sources.

F1 schema design includes `source_type` + `source_id` + `idempotency_key` + `raw_payload` + `confidence_score` columns on every ingest-able entity.

Full architecture in [architecture/INGESTION-ARCHITECTURE.md](./architecture/INGESTION-ARCHITECTURE.md).

---

## 7. Site Office direction scope on production routes

Per D-057 (iter-2 Decision A) + D-061 (iter-3 patch).

Production routes activate Site Office direction-aware CSS via TWO prerequisites:
1. Root layout imports `@/app/design-system/design-system.css`.
2. Each production route wrapper uses `<div data-direction="C" data-palette="B" className="design-system-scope">` mirroring the playground layout.

DO NOT REMOVE the wrap or strip the attributes — load-bearing on production. See [architecture/ARCHITECTURE.md](./architecture/ARCHITECTURE.md) §5 + [design/PATTERNS.md](./design/PATTERNS.md) "Production Site Office activation" entry.

---

## 8. Audit-log canonical posture (iter-2 must-fix #5 — schema-aware)

Per D-051 (iter-2 must-fix CRITICAL #5).

**Audit-log `entity_type` values continue to use 'invoice' (vendor bills) and 'draw' (builder pay-apps) per existing schema** (`src/lib/activity-log.ts:20-49`). UI components map these to 'Bill' / 'Pay App' labels via `src/lib/audit/action-labels.ts`. F1 may extend the enum or migrate; until then dual vocabulary is the convention.

NOT 'bill_*' concat framing — schema-aware approach preserves audit-log integrity across the terminology rename.

Full rationale in [phases/stage-1.5c-information-architecture/AUDIT-LOG-STRATEGY.md](./phases/stage-1.5c-information-architecture/AUDIT-LOG-STRATEGY.md). Canonical inline summary in [CLAUDE.md](../CLAUDE.md) Architecture Rules section.

---

## 9. Owner Portal F1 auth path constraint (iter-2 multi-tenant W-1)

Per ARCHITECTURE.md §8.

1.5c is structural — Owner Portal mounts thin-wrapper components with sanitized fixtures. F1 wires real backend.

**F1 commits to ONE auth path:**
- **Path A:** Extend `client_portal_access` token model (SHA-256 + service-role-API + anon-grant per migration 00074)
- **Path B:** Introduce `owner_view` member role with RLS for owner-scoped reads

NOT both. F1 picks one.

---

## 10. iter-2 amendments noted

Per nwrp45 + nwrp46. Key amendments documented in MASTER-PLAN.md D-057..D-065:
- **D-057** Site Office .design-system-scope wrapping (Decision A)
- **D-058** Full /admin/platform → /platform-admin migration (Decision B-modified)
- **D-059** PerJobTabs collapse to dropdown <768px (Decision C)
- **D-060** Admin dropdown shortcut + /admin canonical destination (Decision D)
- **D-061..D-065** iter-3 patches (Decision A wrap correction; PATTERNS.md reconciliation; SEC-9 audit viewer client type; SEC-10 tenant-attribute grep; atomic commit title)

---

## 11. Phase plan reference

Revised phase plan per D-050 + D-049: F1 → F2 → F3 → F4 → F5 → F6 → Wave 1.1-Lite → Wave 1.1-Full → Wave 2 → Wave 3 → Wave 4.

Full phase plan in [architecture/ARCHITECTURE.md](./architecture/ARCHITECTURE.md) §6.

Current position + Next planned work tracked in [MASTER-PLAN.md](./MASTER-PLAN.md) §9 + §12.

---

## 12. Stage 1.5c outcomes

Stage 1.5c iter-3 shipped:
- 8-section top nav + Admin ▾ + Platform Admin badge
- 8 section overviews + ~60 placeholder routes
- Per-job sub-nav with 6 primary tabs + More ▾ (collapse <768px)
- Today as home (replaces Dashboard)
- Bills/Pay Apps terminology rename (schema-aware per iter-2 must-fix #5)
- 12 production routes wrapped with `.design-system-scope` data-direction=C data-palette=B
- /admin/platform → /platform-admin migration (full 13 sub-routes)
- /admin section overview Card grid + Admin ▾ dropdown shortcut (D-060)
- Sub Portal 3 stubs (auth / magic / public) with F3 compliance contracts
- 32 redirect rules from legacy paths
- M3 phone walk readiness gate (bundled with 1.5b ship per D-17)
- 4 NEW canonical docs at `.planning/architecture/` (this update)
- 6 UPDATED docs (CONTEXT, MASTER-PLAN, CLAUDE, PHILOSOPHY, PATTERNS, COMPONENTS) atomically

---

**End of CONTEXT.md.** Future agents read this at session start; the canonical entry points are MASTER-PLAN.md (DECISIONS LOG) and the .planning/architecture/* docs (deep architectural posture).
