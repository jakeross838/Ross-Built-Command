# Scalability review - Stage 1.5c (information-architecture)

**Reviewer:** nightwork-scalability-reviewer  
**Phase:** stage-1.5c-information-architecture  
**Iter:** 1  
**Date:** 2026-05-04  
**Verdict:** APPROVE (with forward-looking notes for F1+)

---

## Pillar coverage

| Pillar | Verdict | Evidence | Gap |
|--------|---------|----------|-----|
| Index coverage | N/A | No new queries introduced. Plans 1-7 add zero new DB-touching API routes; the only data path is the existing /api/dashboard reused at /today. | None within 1.5c scope. |
| N+1 risk | N/A | No new fetch loops. /api/dashboard already replaced N+1s with Promise.all + batch lookups (route.ts lines 89-171); 1.5c does not modify that endpoint. | None within 1.5c scope. |
| Aggregation strategy | N/A | No new aggregations. Today screen reuses existing /api/dashboard org-wide queues + cash flow rollup verbatim. Cash Flow + Getting Started cards relocate to /company/overview but render the same data shape. | None within 1.5c scope. |
| Pagination | N/A | All list-shaped surfaces in 1.5c are either (a) placeholders with hardcoded copy (PlaceholderCard, ~60-90 routes) or (b) thin-wrappers over Caldwell fixtures (12-row, 17-row, 18-row arrays - bounded and immutable). No new unbounded list endpoints. | None within 1.5c scope. |
| Hot-path caching | COVERED | /api/dashboard already sets Cache-Control: private, max-age=30, stale-while-revalidate=60 (route.ts:514). The private directive makes it per-user (and therefore per-org since users are org-scoped). Reused unchanged at /today. | Cache key is implicitly per-user; see F1+ note below - server-side KV/edge cache for the dashboard at 100k orgs may need explicit org_id keying. |
| Bulk operations | N/A | 1.5c introduces no imports, exports, or batch updates. The 32 next.config.mjs redirects are static config baked at build time, not runtime DB writes. | None within 1.5c scope. |

---

## Hot paths in this plan

1.5c re-routes existing surfaces but does not change query patterns. The relevant hot path is the Today screen via /api/dashboard:

- **Route:** /today -> /api/dashboard (existing endpoint, unchanged).
- **Query mix:** 15 parallel queries via Promise.all (jobs count, invoices PM queue, draws draft, draws submitted, payments due, duplicates, over-budget budget_lines, open POs, lien releases, activity log 20-row, monthly invoiced, monthly paid, org member profiles, recent invoices for activity, recent draws for activity).
- **Current measured perf:** 312 ms API, 30s Cache-Control (per CONCERNS.md MEDIUM line 169-182). Page render 3.3s but bottleneck is hydration, not the API.
- **Estimated reads/min/org at steady-state:** dashboard is cached 30s -> at most 2 req/min/user x ~5 active users/org = ~10 req/min/org cache-miss budget. With cache hits, far less.
- **At 100k tenants:** 100,000 orgs x 10 req/min cache-miss = ~1M req/min worst case, ~16k qps. Realistically, with 30s cache and not-all-orgs-active, 1-3k qps sustained on /api/dashboard. Each request fans out to 15 queries = 15-45k DB qps under burst. **At the upper end of healthy Postgres throughput on Supabase typical AWS instance class (10k-50k qps for well-indexed queries).**
- **Verdict for 1.5c:** at-risk-but-not-introduced. The route already exists and 1.5c does not change it. Re-routing /dashboard -> /today does not amplify load.

The Today screen Action Items section reuses the existing Attention component pattern (per Plan 1 Task 2 Step B). The Activity Feed reuses the existing component. No new server queries.

The Vendors list (/people/vendors) Plan 3 mounts is a thin-wrapper over the **17-vendor Caldwell fixture array** - bounded constant, no DB read, no scaling concern.

The 11 production routes (Plan 3) all mount fixture arrays. F1 swaps to real Supabase queries with RLS - that is the F1 phase scalability surface, not 1.5c.

---

## Findings

### CRITICAL

None. 1.5c is structure-only and introduces zero new query surface, zero new aggregations, zero new bulk ops, and zero new pagination decisions.

### WARNING

None within 1.5c scope.

### NOTES (forward-looking, F1+ scope - not blocking 1.5c)

These are not findings against 1.5c. They are flagged so the F1 / F6 / Wave 1.1-Lite scalability reviews can address them when the underlying surfaces gain real-data queries:

1. **/api/dashboard at 100k tenants** - the current endpoint runs 15 parallel queries and caches 30s with the private directive (per-user). At 100k orgs the steady-state worst case is ~16k req/min and 240k+ DB qps under burst. This will need either:
   - server-side KV/edge cache keyed on org_id (the private Cache-Control suffices for browser/CDN cache but not for cross-user-within-org consolidation; if 5 PMs per org all hit /today, that is 5x the DB load that one shared org_id-keyed cache layer would impose),
   - an indexed materialized view or trigger-maintained cache table for the cash flow rollup (canonical pattern: jobs.approved_cos_total per CLAUDE.md), or
   - more aggressive cache TTL (60s+) plus stale-while-revalidate on the longest-running queries.
   - **Owner:** F1+ phase that wires real-data dashboards at scale. **Not 1.5c.**

2. **Existing CONCERNS.md HIGH item (line 147-165): job detail page 5.4s.** 1.5c re-routes /jobs/[id]/budget and /jobs/[id]/schedule to thin-wrappers (mounts BudgetView / ScheduleView against Caldwell fixtures). 1.5c does not fix the 5.4s issue, but also does not amplify it. The fix lands when F1 wires real-data queries with proper indexing - at which point the **per-job sub-nav (Plan 5) shifts every active job into a layout that hits per-job aggregation queries**. The F1 plan-review must verify the /jobs/[id]/layout.tsx data-fetch pattern (via getCurrentMembership() + indexed (org_id, job_id) lookup) before shipping.

3. **Per-job sub-nav (/jobs/[id]/layout.tsx)** - Plan 5 Task 1 ships a layout that mounts on every /jobs/[id]/* route (existing budget + schedule + change-orders + new placeholder routes + future F1 detail pages). At 100k orgs x 14 active jobs/org x 5 PMs viewing throughout the day, the layout fetcher becomes a hot path. **Plan 5 currently hardcodes phase: active and does not fetch from DB** (per CONTEXT D-12 / D-10 - F2 wires real logic). When F2 makes the layout fetch jobs.phase from DB to drive phase-aware visibility, that fetch must be cached (per-job, longer TTL than dashboard since job phase changes infrequently). **Note for F2 plan-review.**

4. **platform_admins query in PlatformAdminBadge (Plan 1)** - the badge component runs a select user_id from platform_admins where user_id = auth.user.id on every page load (useEffect on mount, per Plan 1 Task 1 Step D). This is a single-row indexed read so per-call cost is trivial. But: **at 100k orgs x all-pages, this is one extra network round-trip per page load even for non-platform-admin users (who get an empty result and render null).** Forward-looking concern: cache the result in sessionStorage keyed on user.id, or expose is_platform_admin via the existing membership cookie/header that middleware already sets. **Note for F1+ optimization pass; not blocking 1.5c since the query is already in production via the existing inline implementation at nav-bar.tsx:170-176 that this plan extracts.**

5. **Sub Portal /sub-portal/magic/[token]/page.tsx** - placeholder in 1.5c, but the URL pattern is locked. F3 implementation must add an indexed lookup on the magic-link token table (presumably client_portal_access or a sibling). Index plan: (token, expires_at) with unique on token. **Note for F3 plan-review.**

---

## Hard rules pass-through

- **New query, no index plan -> CRITICAL.** N/A - no new queries.
- **OFFSET-based pagination for unbounded lists -> CRITICAL.** N/A - no new lists.
- **Aggregation on a hot path with no cache and no trigger-maintained cache -> CRITICAL.** N/A - no new aggregations.
- **Bulk operation with no chunking and no job table -> CRITICAL.** N/A - no bulk ops.
- **Plan says we will add the index later -> BLOCKING.** N/A - no index decisions deferred because no new queries.

All hard-rule checks pass for 1.5c.

---

## Sizing reference

For F1+ planning when this becomes load-bearing: Supabase healthy Postgres throughput is roughly 10-50k qps for well-indexed point-reads and 1-5k qps for aggregation-heavy queries (the dashboard fan-out). 100k tenants x moderate dashboard usage will exhaust the upper end without server-side caching or materialized rollups. The Today screen existing 30s Cache-Control private directive is a foundation - F1 needs to layer either Vercel KV / Upstash Redis with org_id keys, or trigger-maintained cache tables, before promoting the dashboard to real-data queries at scale.

---

## Cross-references

- **database-reviewer** - review the existing /api/dashboard query mechanics during F1 plan-review when real-data queries replace fixtures (out of 1.5c scope).
- **nightwork-rls-auditor** - review tenant safety on platform_admins query and the existing service-role fallback pattern flagged in CONCERNS.md (out of 1.5c scope; already in production).
- **CONCERNS.md** - HIGH Job detail page slow (5.4s) item is the closest existing scale concern to anything 1.5c touches; flagged above as forward-looking note 2.

---

## Final verdict

**APPROVE.**

1.5c is a pure structure / IA / placeholder phase. It introduces no new queries, no new aggregations, no new pagination, no new bulk operations, and no new hot-path surfaces beyond re-routing existing ones. The four pillar checks that could apply (index, N+1, aggregation, pagination) are N/A by design. Hot-path caching is COVERED via the existing /api/dashboard endpoint 30s Cache-Control header that 1.5c reuses unchanged.

The five forward-looking notes above belong to F1, F2, F3 - not 1.5c. They are recorded so the relevant phase reviewer picks them up.
