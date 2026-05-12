# Roles Catalog (canonical)

**Locked:** 2026-05-04 (Stage 1.5c)
**Source:** Principle 6 ([ARCHITECTURE.md](./ARCHITECTURE.md)) + nwrp43 role list + iter-2 mechanical #6

This document is canonical. F2 reads it before wiring the roles + permissions engine. The "Cross-org?" column flags `platform_admin` as the only cross-tenant role; all other roles are org-scoped via RLS + `getCurrentMembership()` filters.

Cross-references:
- [ARCHITECTURE.md](./ARCHITECTURE.md) §7 CC6.1 logical access — middleware `isPlatformAdmin` gate references this catalog
- [ENTITY-INVENTORY.md](./ENTITY-INVENTORY.md) — role permissions scope which entities
- CLAUDE.md "Team & Roles" section — Ross Built role assignments

---

## 15+ Default Roles (F2 wires)

| Role | Scope | Typical user | F-N when wired | Cross-org? |
|------|-------|--------------|----------------|------------|
| Owner | Full company access; final approval | Founder / CEO (Lee Ross at RB) | Existing (1.5c) | No (org-scoped) |
| Admin | Full operational access | Director of Construction (Jake/Andrew) | Existing (1.5c) | No (org-scoped) |
| GM | Operations oversight | General Manager | F2 | No |
| Sr PM | Multi-job approvals | Senior Project Manager | F2 | No |
| PM | Assigned-job ownership | Project Manager (6 PMs at RB) | Existing (1.5c — limited) | No |
| Estimator | Price Intel + estimates | Estimating staff | F2 | No |
| Accountant | Bills QA + Pay Apps + Lien Releases | Diane at RB | Existing (1.5c — limited) | No |
| Foreman | Field crew lead | Field foreman | F2 | No |
| Field | Time + photos | Field staff | F2 | No |
| Designer | Selections + plans + specs | Interior designer | F2 | No |
| Sub Foreman | Sub crew lead | Sub crew lead | F2 (sub portal F3) | No (sub-scoped) |
| Sub Bookkeeper | Sub bills + lien releases | Sub accounting | F2 (sub portal F3) | No (sub-scoped) |
| Owner / Homeowner | Cost-plus open-book transparency | Homeowner | Existing (1.5c — limited via owner_view; F1 commits to one path per multi-tenant W-1) | No (job-scoped via client_portal_access OR member role) |
| Architect / External | RFIs / submittals / plan review | External architect | F3 (magic link) | No (magic link scope-bound) |
| Inspector | Read-only public link | Building inspector | F3 (public link) | No (public link scope-bound) |
| Banker | Construction-loan draw review | Loan officer | Wave 4 | No (job-scoped) |
| **platform_admin** | **Cross-tenant operations** | **Jake / Andrew (operator staff)** | **Existing (migration 00048)** | **YES** (cross-org by design; user_id-bounded SELECT) |

---

iter-2 mechanical #6: **Cross-org?** column flags `platform_admin` as the only Cross-org role. All other roles are org-scoped via RLS + `getCurrentMembership()` filters. See [ARCHITECTURE.md](./ARCHITECTURE.md) §7 CC6.7 for the user_id-bounded SELECT policy that scopes `platform_admin` reads to the operator's own identity (not arbitrary cross-org writes).

---

## Profile-based feature flags (Principle 8 — F2 wires)

Org profile drives nav visibility + section prominence. Three profiles ship in F2:

- **Custom Builder** — Pipeline prominent (proposals → contracts → leads), Pre-Con visible (per-job tab when phase=pre-con), RFIs/Submittals lighter (smaller volume vs commercial). **Default profile.**
- **Remodeler** — Pipeline lighter (no Bids out — smaller deal sizes), Pre-Con visible (often longer pre-con phase), RFIs/Submittals lighter.
- **Commercial GC** — Pipeline visible (bid invitations + proposals), RFIs/Submittals prominent (heavy paper trail), schedule visible at top level (Gantt drives day-to-day).

Ross Built profile = **Custom Builder** (default). Placeholder selector at `/admin/profile` (per Plan 6 stub); F2 wires real toggle + ACCESS map filtering.

---

## Permission scopes (F2 wires the matrix)

(Reference TBD per F2; placeholder catalogue here. F2 produces the full matrix.)

| Scope | Description |
|-------|-------------|
| read.bills.own | Read bills assigned to me / my jobs |
| read.bills.all | Read all bills in the org |
| approve.bills.own | Approve bills on my jobs |
| approve.bills.all | Approve any bill |
| push.qb | Push approved bills to QuickBooks |
| read.pay-apps.own | Read pay apps for my jobs |
| approve.pay-apps | Approve pay apps for owner submission |
| read.budgets.own | Read budgets for my jobs |
| edit.budgets.own | Edit budgets for my jobs (excluding original contract; CO-driven) |
| approve.cos | Approve change orders |
| read.daily-logs.own | Read daily logs for my jobs |
| write.daily-logs | Write daily logs (any job per scope) |
| read.photos.own | Read photos for my jobs |
| write.photos | Write photos (Wave 2) |
| manage.users | Add/remove members + role assignment |
| manage.cost-codes | Edit `org_cost_codes` |
| manage.profile | Edit org profile (Custom Builder / Remodeler / Commercial GC) |
| platform_admin.* | Cross-org operator scopes (see migration 00048; D-058 /platform-admin migration) |

F2 expands. F1 audit log captures every permission check (per CC6.1).

---

## platform_admin operational notes

Per CLAUDE.md "Platform admin (cross-tenant)" section:

- **Who has it today:** Jake Ross, Andrew Ross (seeded in migration 00048).
- **How to grant:** direct SQL insert (no UI). Manual audit row required.
- **Where the UI lives:** `/platform-admin` (per D-058 migration from `/admin/platform`). Middleware regex matches BOTH legacy `/admin/platform/*` AND new `/platform-admin/*` paths with same redirect posture for non-platform_admin.
- **Impersonation:** signed `nw_impersonate` cookie; 1-hour max; red banner visible; audit-logged. **Do NOT use for casual browsing** — the audit log is company-visible.
- **RLS posture:** SELECT-cross-org via migration 00049 user_id-bounded policy; writes/deletes stay org-scoped — cross-org mutations route through service-role API routes that audit-log unconditionally.
- **Sentry tags:** `user_id`, `org_id`, `impersonation_active`, `platform_admin` set in middleware per request.

See [ARCHITECTURE.md](./ARCHITECTURE.md) §7 CC6.7 + `docs/platform-admin-runbook.md` for full runbook.

---

**End of ROLES-CATALOG.md.** F2 reads this before wiring the roles + permissions engine; F3 magic-link engine references the External / Inspector roles' scope-binding posture.
