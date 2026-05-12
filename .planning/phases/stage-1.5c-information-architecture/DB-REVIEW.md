# DB-REVIEW — stage-1.5c-information-architecture

**Branch:** phase/1.5-c-information-architecture
**HEAD:** 7fa0725
**Reviewer:** database-reviewer agent
**Date:** 2026-05-11
**Prior review HEAD:** accb55f (2026-05-11) — PASS
**Verdict: PASS**

---

## GATE-B.1 re-run scope

Four fix commits between accb55f and 7fa0725:

| Commit | Description |
|---|---|
| 96484db | fix(1.5c-ia): section overview pages persist NavBar via AppShell layout (UI FLAG-1) |
| 20d6ef5 | chore(1.5c-ia): design system hygiene per QA findings (F-01, F-02, F-04, FLAG-2) |
| 9ef5dab | refactor(1.5c-ia): canonicalize admin/billing StatusBadge to NwBadge (DS F-03) |
| 7fa0725 | fix(env): explicit NEXT_PUBLIC_VERCEL_ENV passthrough for W.1 harness bridge gating (SECURITY M-1) |

Prior-review declaration was confirmed by the phase spec: 0 schema changes, 0 migration files, 0 new queries, 0 new aggregations. This re-run verifies that the four fix commits did not introduce any database surface.

---

## Check 1 — Migration files

`git diff accb55f..7fa0725 -- supabase/` → **0 bytes.**

Zero migration files added, removed, or modified across all four fix commits. Confirmed by byte-count diff of the `supabase/` tree between the GATE-B doc commit and HEAD.

**Result: PASS — zero.**

---

## Check 2 — New query patterns

Changed `.ts` / `.tsx` files were scanned for `supabase`, `.from`, `.rpc`, `select`, `insert`, `update`, `delete` references introduced by the four commits. Six files matched the scan; each was inspected:

### A. src/app/admin/billing/page.tsx (DS F-03 — NwBadge canonicalization)

The only change in this file across the four commits is the import and usage of `NwBadge` replacing an inline status badge. The two DB-touching functions (`verifyCheckoutSession` and the `subscriptions` select) are **unchanged** from the accb55f baseline and were already reviewed and passed in Check 2A of the prior review. No new queries introduced.

### B. src/app/company/overview/page.tsx (UI FLAG-1 — AppShell layout fix)

The AppShell layout fix adjusted how the component mounts inside the section layout; it did not modify the `org_members` role lookup or the `/api/dashboard` fetch call. Both were present at accb55f and passed prior review. No new queries introduced.

### C. src/app/page.tsx

Root page. The only supabase reference is `supabase.auth.getUser()` — an auth check, not a tenant table query. Unchanged from accb55f.

### D. src/app/price-intel/selections-catalog/page.tsx, src/app/price-intel/vendor-performance/page.tsx

Placeholder pages. The supabase references in these files are inside comments only (documenting future implementation intent). Zero runtime DB access.

### E. src/components/nw/NwPlaceholderCard.tsx

Contains no DB access. The supabase scan match was a false positive on a COMPONENTS.md reference in a comment.

### F. src/lib/supabase/client.ts (SECURITY M-1 — NEXT_PUBLIC_VERCEL_ENV passthrough)

The env fix adds `env.NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? ""` to `nextConfig`. This corrects the production-gate evaluation for the W.1 harness auth bridge (previously `undefined !== "production"` always evaluated true). The bridge itself — analyzed in Check 3 of the prior review — calls `supabase.auth.setSession()` only, which performs no database query. The fix tightens the gate so the bridge is dead code on production builds. No new DB access.

**Result: PASS — zero new queries or aggregations.**

---

## Carry-forward: pre-existing observations (not introduced by this branch)

These exist identically on main and were noted in the prior review. Unchanged by the four fix commits.

**platform_admin_audit — unbounded action scan in fetchFilterOptions:** `SELECT action` with no LIMIT to populate a filter dropdown. Platform-admin only; table expected small. Pre-existing.

**vendor_item_pricing — unlimited fetch in ItemsTab:** Full-table read to compute per-item spend in application code. Platform-admin only. Mitigation when volume warrants: push to a `SUM(total_cents) GROUP BY item_id` query or a SQL view. Pre-existing.

**document_extraction_lines — multi-equality filter with no LIMIT in BootstrapTab:** Will benefit from a composite index on `(match_tier, verification_status, deleted_at)` if the table grows large. Pre-existing.

None of these are regressions introduced by this branch or by the GATE-B.1 autofixes.

---

## Summary

| Check | Result |
|---|---|
| New migration files | PASS — zero |
| New query patterns (4 fix commits) | PASS — zero |
| admin/billing NwBadge refactor | PASS — DB functions unchanged |
| company/overview AppShell fix | PASS — DB calls unchanged |
| NEXT_PUBLIC_VERCEL_ENV env fix | PASS — no DB access; tightens production gate |
| Pre-existing platform-admin scan patterns | NOTE — pre-existing on main, not a regression |

**Overall verdict: PASS.**

No database concerns block merge of this branch. The GATE-B.1 autofixes are UI/env-config only and introduce no database surface.
