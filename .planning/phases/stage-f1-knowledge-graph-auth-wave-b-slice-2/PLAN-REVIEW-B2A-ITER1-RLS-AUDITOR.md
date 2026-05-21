# Plan-Review B-2a iter-1 — RLS Auditor

**Captured 2026-05-21 from agent inline return.** Source: nightwork-rls-auditor agent return content (the agent's own disk-write was suppressed by its system prompt; this file captures the agent's full report verbatim for audit-trail persistence).

**Verdict: NEEDS-WORK** — No BLOCKING findings. Two WARNINGs + two NOTEs require plan-author response before execute dispatch.

## Check 1 — PUBLIC_PATHS Extension

**Verdict: PASS with WARNING**

The PLAN correctly adds both `/owner` and `/api/owner-portal` to `PUBLIC_PATHS` in `src/middleware.ts:7` (§6.g, Task 5). The existing `isPublic()` matcher at `src/middleware.ts:32-34` uses `startsWith(`${p}/`)`, so `/owner` covers `/owner/{token}` (B-2b) and `/api/owner-portal` covers `/api/owner-portal/admin/revoke-token` (B-2a) and `/api/owner-portal/acknowledge` (B-2b forward-compatible).

The PLAN's reasoning in §5 Sweep 3 (lines 251-254) is correct: PUBLIC_PATHS bypasses the auth-redirect only. Route handlers retain their own auth checks. PLAN explicitly notes: "**CRITICAL:** middleware adding `/api/owner-portal/*` to PUBLIC_PATHS does NOT mean the route is unauthenticated."

**WARNING-1 (not blocking, but requires acknowledgment):** The PUBLIC_PATHS entry at line 909 has comment "admin revocation API + anon homeowner API." The admin revocation route (`/api/owner-portal/admin/revoke-token`) is NOT anon-accessible — it must be authenticated admin. The combined comment conflates two entirely different auth models under one PUBLIC_PATHS entry. While the implementation is mechanically correct (route handler calls `getCurrentMembership()` regardless of PUBLIC_PATHS), the comment increases the cognitive hazard for future editors. **Plan-author should clarify the comment to distinguish: `/api/owner-portal/acknowledge` (anon-via-token, B-2b) from `/api/owner-portal/admin/*` (authenticated admin, B-2a).**

## Check 2 — Anon-Role Policy Preservation on `client_portal_access`

**Verdict: PASS**

Existing RLS posture on `client_portal_access` (00074:247-301) is preserved unchanged:

- `client_portal_access_org_read` — SELECT: `app_private.is_platform_admin() OR (org_id = user_org_id() AND role IN ('owner','admin','accounting') OR pm-on-own-jobs narrowing)`. No anon SELECT policy.
- `client_portal_access_org_insert` — INSERT for authenticated users only.
- `client_portal_access_org_update` — UPDATE for authenticated users only.
- No DELETE policy.
- No anon direct-access path — portal clients access via SECURITY DEFINER RPCs (GRANT TO anon).

B-2a's migration 00104 ADDs `client_id` + `revoked_seq` columns via `ALTER TABLE ... ADD COLUMN`. `ALTER TABLE ... ADD COLUMN` does NOT touch existing RLS policies. The three existing policies (SELECT, INSERT, UPDATE) remain active and unchanged. New columns inherit no special treatment — subject to the same row-level policy expressions.

The new `owner_portal_rate_limit` table has RLS enabled with **no policies** — correct posture. `ENABLE ROW LEVEL SECURITY` with no PERMISSIVE policies means no role except `service_role` (which bypasses RLS) can access. The `GRANT SELECT, INSERT, UPDATE ON public.owner_portal_rate_limit TO service_role` is consistent.

The `activity_log` column add (`actor_token_id`) does not affect RLS. Existing RESTRICTIVE policy on `activity_log` (00026:99-101) applies to all rows including those with the new column.

## Check 3 — Revocation API Role-Gating

**Verdict: PASS with WARNING**

The admin revocation route `POST /api/owner-portal/admin/revoke-token` is correctly gated:

1. `getCurrentMembership()` is called first (§6.d line 580-581, Task 7 step 2, AC-B2a-08 verification step 2).
2. Role assertion: `membership.role IN ('owner', 'admin')` — PM excluded.
3. Returns 401 when `getCurrentMembership()` returns null; 403 when role check fails.
4. `updateWithLock` scopes to `orgId: membership.org_id` — cross-tenant revocation blocked.
5. AC-B2a-09 verification correctly tests that anon POST returns 401 (from `getCurrentMembership()` at route handler entry), NOT a 302 redirect.

**WARNING-2 (requires acknowledgment):** The rate-limit guard is applied with `'ip'` key type, NOT `'token'` key type. The `TOKEN_LIMIT_PER_MINUTE = 30` limit applies to token-bearing requests; the admin revocation endpoint only applies the IP-level cap. Arguably correct design (admin sessions are authenticated), but means a single compromised admin account can revoke all tokens in the org within the `IP_LIMIT_PER_MINUTE = 60` window without per-admin-session rate limit. **Plan-author should explicitly confirm this is an accepted design choice** OR add a per-membership.user_id rate-limit key.

## Check 4 — RESTRICTIVE Intersection

**Verdict: PASS**

The existing RESTRICTIVE policy on `activity_log` (00026:99-101) is AS RESTRICTIVE FOR ALL on `(org_id = user_org_id())`. B-2a's `actor_token_id` column add does not change this. Service-role bypasses RLS for writes; reads governed by the RESTRICTIVE + PERMISSIVE combination — org members can only read their own org's audit rows.

For `client_portal_access`: no RESTRICTIVE policy exists. The three PERMISSIVE policies each carry the `org_id = user_org_id()` filter. Composite FK enforces same-org at constraint layer independent of RLS — BY CONSTRUCTION.

For `owner_portal_rate_limit`: RLS enabled with no policies. Service-role has explicit GRANT. Clean.

## Check 5 — Drummond Token Row Backfill Verification (AC-B2a-13 sub-item 9)

**Verdict: PASS with NOTE**

AC-B2a-13 sub-item (9) at line 1874 is concrete and specific:

```sql
SELECT cpa.client_id, j.client_id AS jobs_client_id
  FROM public.client_portal_access cpa
  JOIN public.jobs j ON j.id = cpa.job_id
 WHERE j.name = 'Drummond';
```

The query is mechanically valid. **NOTE-1:** The filter `WHERE j.name = 'Drummond'` could return zero rows without failing loudly if the job is seeded with a variation (e.g., `'Drummond (reference)'`). Plan-author should either confirm exact job name string from fixture OR strengthen probe to assert `COUNT(*) > 0` before checking value equality. This is at ai-logic-tester responsibility per Rule 3.

## Check 6 — Cross-Tenant Probe Documentation (Rule 3 / AI-Logic-Tester)

**Verdict: PASS**

PLAN documents concrete probes sufficient for execute-time invocation:
- **AC-B2a-02** (lines 1904-1915): FK constraint probe + explicit cross-tenant INSERT attempt — concrete BEGIN; ... ROLLBACK; pattern.
- **AC-B2a-06 Query 3** (lines 2016-2038): cross-org `create_client_portal_invite` call from org_B with org_A's job_id + zero-leakage-row verification.
- **AC-B2a-11** (lines 2165-2178): cross-client probe via `assertDrawBelongsToToken(<other-client-draw-id>, <drummond-token>)`.
- **AC-B2a-08 step 7** (lines 2106-2110): cross-tenant admin revoke probe — org_B admin tries to revoke org_A token.

All four probes are specific enough for execute-time invocation.

## Check 7 — Rule 9 Alignment (Cross-Reviewer Factual Disagreements)

No active cross-reviewer factual contradictions surfaced in the B-2a PLAN. PLAN explicitly resolves each iter-1 SYNTHESIS finding (B-1..B-11) in §4 with concrete citations.

**NOTE-2:** PLAN at §6.d line 582 shows the admin revoke route's `updateWithLock` call passing `updates: { revoked_at: 'now()' as any /* Supabase casts string→now()*/ }`. The `as any` cast is a type-system escape hatch that violates CLAUDE.md TypeScript strict mode rule. Task 7 step 4 at line 1720 already corrects to `{ revoked_at: new Date().toISOString(), ... }` — but the §6.d sketch still shows the `as any` form. Discrepancy could confuse the executor. **NOTE for executor:** follow Task 7 step 4 as authoritative form, not §6.d sketch.

## Summary

### BLOCKING
None.

### WARNING
- **WARNING-1** (§6.g / middleware comment): The comment on the `/api/owner-portal` PUBLIC_PATHS entry conflates anon-homeowner access and authenticated-admin access. Clarify.
- **WARNING-2** (§6.d / Task 7 / threat model): Admin revocation rate-limit applies IP-level only; no per-admin-session token. Plan-author should explicitly accept as design choice OR add per-user_id key.

### NOTE
- **NOTE-1** (AC-B2a-13 sub-item 9 / AC-B2a-03): Drummond SQL probe filter could pass silently with 0 rows.
- **NOTE-2** (§6.d vs Task 7 inconsistency): `as any` form contradicts authoritative Task 7 step 4.

## Path to PASS

Two plan-author acknowledgments required before execute dispatch:
1. Add comment clarification to §6.g distinguishing the two access models under `/api/owner-portal/*`.
2. Explicitly disposition WARNING-2 in the threat model or accept it in dispatch authorization checklist (§12).

Both NOTE items are at-execute-time responsibilities for ai-logic-tester and the executor respectively.

The B-2a PLAN's RLS posture is substantively sound: composite FK enforces same-org BY CONSTRUCTION, anon-role policy on `client_portal_access` is preserved, admin revocation route calls `getCurrentMembership()` correctly, RESTRICTIVE intersection on `activity_log` is unaffected, `owner_portal_rate_limit` ships with RLS-on-no-policies, and Drummond canary is concrete SQL. Two WARNINGs require plan-author acknowledgment; neither is BLOCKING. **Verdict: NEEDS-WORK** (minor acknowledgments required; no structural RLS defects found).
