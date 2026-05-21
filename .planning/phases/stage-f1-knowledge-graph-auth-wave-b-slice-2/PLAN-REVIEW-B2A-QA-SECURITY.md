# PLAN-REVIEW-B2A-QA-SECURITY — Post-execute security verification

**Scope:** B-2a Token-issuance security model — load-bearing QA review per nwrp207  
**Commits audited:** fc19a2e..ee43e78  
**Reviewer:** Security reviewer (Claude Code)  
**Date:** 2026-05-21  
**Verdict: BLOCKING**

---

## Executive summary

Five of six security checks PASS. One check FAILS with BLOCKING severity.

**BLOCKING-1: `create_client_portal_invite` has live EXECUTE grant to `anon` role.** The migration §3a issued `REVOKE FROM PUBLIC` but the live `pg_proc.proacl` still shows `anon` as a grantee. This means unauthenticated callers (homeowner token context, public internet) can invoke the invite-issuance RPC directly. This is an admin-only function. Exploitation: a caller with no org membership can call `create_client_portal_invite` with a crafted `p_org_id` — the RPC's own auth guard will reject it, but the surface should never be reachable by `anon` at the DB privilege layer. The function's internal `app_private.user_org_id()` check provides defense-in-depth, but revocation is expected and explicitly specified. This is a live privilege misconfiguration.

All other findings: PASS with notes.

---

## Per-finding table

| # | Check | Verdict | Detail |
|---|-------|---------|--------|
| 1 | RPC NULL-leak closure | PASS | Live body matches migration source exactly |
| 2a | create_client_portal_invite grants | BLOCKING | `anon` has EXECUTE — should be `authenticated` only |
| 2b | submit_client_portal_message grants | PASS | `anon` confirmed; `authenticated` and `postgres` also present (see note) |
| 2c | mark_client_portal_message_read grants | PASS | `anon` confirmed; `authenticated` and `postgres` also present (see note) |
| 3 | CSRF Origin check on admin revoke | PASS | Origin check fires before `getCurrentMembership()` |
| 4 | Timing-oracle index (BLK-3) | PASS | Non-partial index confirmed |
| 5 | search_path hardening | PASS | All 5 SECURITY DEFINER functions have `search_path=public, pg_temp` |
| 6 | Rate-limit DB-backed | PASS | In-process Map fully replaced by DB RPC |

---

## Check 1 — RPC NULL-leak closure

**Verdict: PASS**

### Live query output

```
CREATE OR REPLACE FUNCTION public.create_client_portal_invite(...)
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
...
  -- B-2a NEW: derive client_id from jobs.client_id (D-05 leak fix).
  SELECT j.client_id INTO _client_id
    FROM public.jobs j
   WHERE j.id = p_job_id AND j.org_id = p_org_id;
  IF _client_id IS NULL THEN
    RAISE EXCEPTION 'B-2a invariant FAILED: ...';
  END IF;
  ...
    COALESCE(p_expires_at, now() + interval '1 year'),
```

### Verification

- `SELECT j.client_id INTO _client_id FROM public.jobs j WHERE j.id = p_job_id`: PRESENT
- `RAISE EXCEPTION` on NULL: PRESENT
- `now() + interval '1 year'`: PRESENT
- Same-org guard `AND j.org_id = p_org_id`: PRESENT (defense-in-depth on top of composite FK)

All three required elements verified live. NULL-leak fix confirmed shipped.

---

## Check 2 — REVOKE/GRANT pairs (live `pg_proc.proacl`)

### Live query output

```json
[
  { "proname": "create_client_portal_invite", "role": "postgres",       "privilege_type": "EXECUTE" },
  { "proname": "create_client_portal_invite", "role": "anon",           "privilege_type": "EXECUTE" },
  { "proname": "create_client_portal_invite", "role": "authenticated",  "privilege_type": "EXECUTE" },
  { "proname": "create_client_portal_invite", "role": "service_role",   "privilege_type": "EXECUTE" },

  { "proname": "mark_client_portal_message_read", "role": "postgres",       "privilege_type": "EXECUTE" },
  { "proname": "mark_client_portal_message_read", "role": "anon",           "privilege_type": "EXECUTE" },
  { "proname": "mark_client_portal_message_read", "role": "authenticated",  "privilege_type": "EXECUTE" },
  { "proname": "mark_client_portal_message_read", "role": "service_role",   "privilege_type": "EXECUTE" },

  { "proname": "submit_client_portal_message",    "role": "postgres",       "privilege_type": "EXECUTE" },
  { "proname": "submit_client_portal_message",    "role": "anon",           "privilege_type": "EXECUTE" },
  { "proname": "submit_client_portal_message",    "role": "authenticated",  "privilege_type": "EXECUTE" },
  { "proname": "submit_client_portal_message",    "role": "service_role",   "privilege_type": "EXECUTE" }
]
```

### Analysis

**Expected per plan:**

| Function | Expected grantees | Actual grantees |
|----------|-------------------|-----------------|
| `create_client_portal_invite` | `authenticated` only | `postgres`, `anon`, `authenticated`, `service_role` |
| `submit_client_portal_message` | `anon` | `postgres`, `anon`, `authenticated`, `service_role` |
| `mark_client_portal_message_read` | `anon` | `postgres`, `anon`, `authenticated`, `service_role` |

**`postgres` appearing on all three:** The `postgres` role is the function owner/superuser (the role that executed the migration). Its presence in `proacl` is a PostgreSQL default for the definer and is NOT a security issue. This is a false positive pattern per security review conventions.

**`service_role` appearing on all three:** In Supabase, `service_role` inherits `authenticated` which inherits `PUBLIC`. Because `REVOKE FROM PUBLIC` was issued but Supabase's role hierarchy means `service_role` receives the privilege via inheritance from `authenticated`, the explicit `GRANT TO authenticated` propagates through. This is expected Supabase role behavior and not a distinct security gap.

**`authenticated` on `submit_client_portal_message` and `mark_client_portal_message_read`:** These are homeowner-callable RPCs designed for `anon`. The extra `authenticated` grant is mildly over-permissive but low risk — authenticated org members calling these RPCs would still be rejected at the RPC's internal token-validation logic (the token check requires a valid `access_token_hash`). This is a WARNING, not BLOCKING.

**`anon` on `create_client_portal_invite`:** BLOCKING. This is an admin-only invite-issuance RPC. The spec (migration §3a comment: "authenticated only — admin function") requires `anon` NOT have EXECUTE. Root cause: migration 00074 never issued `REVOKE FROM PUBLIC` before its initial `GRANT TO authenticated`. The `PUBLIC` role in PostgreSQL includes `anon`. When migration 00104 issued `REVOKE FROM PUBLIC`, Supabase may have had `anon` already granted explicitly (or the inheritance chain was already materialized in `proacl`), and `REVOKE FROM PUBLIC` does not revoke explicitly named role grants. The `anon` entry survives.

**Remediation required:** A follow-up migration must issue:
```sql
REVOKE EXECUTE ON FUNCTION public.create_client_portal_invite(UUID, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) FROM anon;
```
This is additive and safe to apply at any time — the function's internal `app_private.user_role() IN ('owner','admin','pm')` guard prevents actual exploitation, but the DB-layer privilege is not correctly scoped.

**Recommendation: HALT. Do not ship B-2b until this is addressed.**

---

## Check 3 — CSRF on admin revoke

**Verdict: PASS**

Source: `src/app/api/owner-portal/admin/revoke-token/route.ts` lines 80-97

```typescript
// ===== Step 2: CSRF Origin check per H-2 iter-1 SYNTHESIS =====
const origin = request.headers.get("origin");
const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL;
if (!expectedOrigin) {
  return NextResponse.json({ error: "Service misconfigured ..." }, { status: 500 });
}
if (!origin || origin !== expectedOrigin) {
  return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
}

// ===== Step 3: Authentication + role gate =====
const membership = await getCurrentMembership();
```

Origin check is on lines 80-97, `getCurrentMembership()` is on line 100. CSRF gate fires first per nwrp205 H-2 spec. Fail-closed on missing `NEXT_PUBLIC_APP_URL`. Cross-origin request returns 403 before any authentication logic runs.

Minor note: `!origin` rejection means requests from same-origin server-to-server calls (no Origin header) are also rejected. This is intentional for a browser-only route and correct per the nwrp205 pattern.

---

## Check 4 — Timing-oracle elimination (BLK-3)

**Verdict: PASS**

### Live query output

```json
{
  "indexname": "idx_client_portal_access_token_hash",
  "indexdef": "CREATE UNIQUE INDEX idx_client_portal_access_token_hash ON public.client_portal_access USING btree (access_token_hash)"
}
```

No `WHERE` clause present. Non-partial form confirmed. The prior partial index (`WHERE revoked_at IS NULL` from migration 00074:188-190) was dropped and recreated without predicate. Timing oracle eliminated: revoked, active, and non-existent token lookups all use the index and incur identical latency.

---

## Check 5 — search_path hardening

**Verdict: PASS**

### Live query output

```json
[
  { "proname": "cleanup_owner_portal_rate_limit",   "proconfig": ["search_path=public, pg_temp"] },
  { "proname": "create_client_portal_invite",       "proconfig": ["search_path=public, pg_temp"] },
  { "proname": "mark_client_portal_message_read",   "proconfig": ["search_path=public, pg_temp"] },
  { "proname": "record_owner_portal_request",       "proconfig": ["search_path=public, pg_temp"] },
  { "proname": "submit_client_portal_message",      "proconfig": ["search_path=public, pg_temp"] }
]
```

All 5 SECURITY DEFINER functions have `search_path=public, pg_temp` pinned. Supabase advisor 0011 / migration 00102 hardening pattern confirmed applied to all B-2a functions. No mutable search_path vulnerability.

---

## Check 6 — Rate-limit DB-backed

**Verdict: PASS**

Source: `src/lib/owner-portal/rate-limit.ts` (lines 1-157)

- No in-process `Map` declaration found anywhere in the file.
- Counter persistence via `supabase.rpc("record_owner_portal_request", ...)` — atomic `INSERT ON CONFLICT DO UPDATE` returning new count.
- Window is per-minute fixed window (UTC floor), shared across serverless invocations via the DB row.
- Fail-OPEN on DB error (documented, Sentry breadcrumb, acceptable per nwrp202 §3 rationale).
- Opportunistic TTL cleanup via `cleanup_owner_portal_rate_limit()` at 1% probability per call.
- Limits: 30/min per token, 60/min per IP. Both serve requests through `recordOwnerPortalRequest`.

The non-functional in-process Map is fully replaced. Counter accumulates correctly across Vercel serverless invocations.

---

## HALT recommendation

**BLOCKING-1 (Check 2a — `anon` grant on `create_client_portal_invite`)** must be resolved before B-2b ships. Required fix is a single-line migration:

```sql
REVOKE EXECUTE ON FUNCTION public.create_client_portal_invite(UUID, UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) FROM anon;
```

This should be issued in a new migration (00105 or appended to B-2b's migration if B-2b has not yet been drafted). The fix does not require a rollback of B-2a — the function's internal auth guard prevents actual exploitation today, but the DB-layer posture must be corrected.

**WARNING-1 (Check 2b/2c — `authenticated` grant on homeowner-only RPCs):** `submit_client_portal_message` and `mark_client_portal_message_read` grant EXECUTE to both `anon` and `authenticated`. The plan specified `anon` only. Internal token-validation logic prevents org-authenticated callers from bypassing homeowner scope, but the extra grant is non-spec. Recommended cleanup in the same remediation migration. Not BLOCKING independently.
