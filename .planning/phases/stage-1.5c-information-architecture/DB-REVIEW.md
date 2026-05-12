# DB-REVIEW — stage-1.5c-information-architecture

**Branch:** phase/1.5-c-information-architecture
**HEAD:** accb55f
**Reviewer:** database-reviewer agent
**Date:** 2026-05-11
**Verdict: PASS**

---

## Scope

This is a navigation restructure and route-migration phase. No new schema objects, no new migrations, no net-new query patterns. The review confirms that characterization and surfaces one pre-existing cross-tenant query that belongs to the migrated platform-admin surface, not to this phase.

---

## Check 1 — Migration files

`git diff main...phase/1.5-c-information-architecture --name-only | grep 'supabase/migrations'` → **empty output.**

Zero migration files added, removed, or modified on this branch. The highest-numbered migrations on disk (00092, 00093) are harness fixture migrations that predated the IA work and appear identically on main.

**Result: PASS.**

---

## Check 2 — New aggregation patterns

All changed source files were scanned for net-new `.from()`, `.select()`, `.aggregate()`, and application-side aggregation loops. Three categories of DB-touching files were found:

### A. Plans 4 + 6 REAL-LOGIC thin wrappers (admin/billing, admin/cost-codes, admin/users)

These are confirmed verbatim copies of their counterparts on main:

- `src/app/admin/billing/page.tsx` mirrors `src/app/settings/billing/page.tsx`. Queries: `subscriptions` filtered by `org_id`, `organizations.update` keyed on `session.client_reference_id` (Stripe webhook pattern, identical to source).
- `src/app/admin/cost-codes/page.tsx` mirrors `src/app/settings/cost-codes/page.tsx`. Query: `cost_codes` with `.eq("org_id", membership.org_id)` and `.is("deleted_at", null)`.
- `src/app/admin/users/page.tsx` mirrors `src/app/settings/team/page.tsx`. Queries: `org_members`, `profiles` (IN on user_ids), `org_invites` — all `.eq("org_id", membership.org_id)`.

All three call `getCurrentMembership()` before any DB access. All queries are org-scoped. No aggregation introduced. **No delta from source.**

### B. Platform-admin route migration (/admin/platform/* → /platform-admin/*)

Fourteen routes were moved, not written from scratch. The source routes on main (`src/app/admin/platform/`) carry identical query logic. Spot-checked: `audit/page.tsx`, `cost-intelligence/page.tsx`, `organizations/page.tsx`, `users/[id]/page.tsx`, `support/[id]/page.tsx`, `feedback/page.tsx`. Every `.from()` call maps 1:1 to the main counterpart.

The `bootstrap-aliases-panel.tsx` component (used by the BootstrapTab) was not modified on this branch (`git diff` returned zero lines).

**No new aggregation patterns introduced.**

### C. Placeholder routes (Plans 4, 5, 6 — ~90 files)

All new placeholder pages (`pipeline/`, `company/`, `people/`, `price-intel/`, `reports/`, `sub-portal/`, `jobs/[id]/*` tab routes) contain zero DB access — confirmed by scanning the diff for any uncommented `supabase`, `.from(`, `createServerClient`, or `createBrowserClient` references. The only supabase references in these files are inside comments documenting what future implementations will do.

`src/app/jobs/[id]/layout.tsx` (the PerJobTabs sub-nav mount) introduces no DB calls.

**Result: PASS.**

---

## Check 3 — src/lib/supabase/client.ts env-gated block

The only change to this file is the W.1 harness auth bridge. Full analysis:

- The block is guarded by `typeof window !== "undefined"` (client-only) and `process.env.NEXT_PUBLIC_VERCEL_ENV !== "production"`. Because `NEXT_PUBLIC_*` vars are inlined at build time, on production builds this compiles to `if (false) { ... }` — dead code, zero runtime cost, zero attack surface in production.
- The bridge calls `supabase.auth.setSession()` on the **already-initialized** module-level `supabase` client. It does not create a second client instance, so there is no risk of the multi-instance auth-event deadlock documented in Supabase Discussion #37755 (nwrp85).
- `setSession` only updates the in-memory session cache and emits a BroadcastChannel event. It performs no database query — it does not touch any tenant table, does not invoke `auth.users`, and does not call `auth.getUser()`. The subsequent `useCurrentRole` calls that benefit from this use the cached session; they still go through the standard Supabase auth path.
- The global is single-use: it is deleted immediately after `setSession` is called, preventing HMR or React Strict Mode double-mount from re-firing.
- Token validation: the bridge only proceeds if both `access_token` and `refresh_token` are non-empty strings. An attacker who can set `window.__nightwork_harness_session` would need a valid, live token pair — at which point they are already authenticated. No privilege escalation possible.

**No new query patterns. No new DB access. Result: PASS.**

---

## Pre-existing observations (not introduced by this branch)

These exist identically on main. Not blocking, recorded for the next schema-focused phase.

**platform_admin_audit — unbounded action scan in fetchFilterOptions:**
`src/app/platform-admin/audit/page.tsx` (migrated from `/admin/platform/audit/page.tsx` on main) calls `supabase.from("platform_admin_audit").select("action")` with no LIMIT to populate the filter dropdown. As the audit log grows this becomes a full sequential scan on an append-only table. Mitigation when this matters: add a `DISTINCT action` aggregate or a covering index on `action`; the query is platform-admin only (not tenant-facing) and the table is expected to be small for the foreseeable future. Pre-existing; not introduced here.

**vendor_item_pricing — unlimited fetch in ItemsTab:**
`src/app/platform-admin/cost-intelligence/page.tsx` fetches `SELECT item_id, total_cents FROM vendor_item_pricing WHERE deleted_at IS NULL` with no LIMIT to compute per-item spend in application code. This is a full-table read that grows O(n) with invoice volume. Pre-existing on main; platform-admin only. Mitigation when volume warrants: push the aggregation to a SQL view or a `SUM(total_cents) GROUP BY item_id` query.

**document_extraction_lines — multi-equality filter with no LIMIT in BootstrapTab:**
Four equality filters (`verification_status`, `is_allocated_overhead`, `is_transaction_line`, `match_tier`) plus `.is("deleted_at", null)` with no row limit. This will benefit from a composite index on `(match_tier, verification_status, deleted_at)` if the table grows large. Pre-existing on main.

None of these are regressions introduced by this branch.

---

## Summary

| Check | Result |
|---|---|
| New migration files | PASS — zero |
| New aggregation patterns | PASS — zero; all DB code is verbatim from main |
| REAL-LOGIC thin wrappers (Plans 4 + 6) | PASS — org-scoped, getCurrentMembership preserved |
| client.ts env-gated setSession bridge | PASS — no DB queries; production dead-code |
| Pre-existing platform-admin scan patterns | NOTE — pre-existing on main, not a regression |

**Overall verdict: PASS.**

No database concerns block merge of this branch.
