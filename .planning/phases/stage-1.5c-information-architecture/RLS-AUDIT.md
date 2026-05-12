# RLS audit — Stage 1.5c Information Architecture

**Branch:** phase/1.5-c-information-architecture  
**HEAD:** accb55f  
**Audited:** 2026-05-11  
**Auditor:** nightwork-rls-auditor

## Migrations reviewed

None. Zero `supabase/migrations/` files changed between `main` and this branch (confirmed via `git diff --name-only main..phase/1.5-c-information-architecture -- supabase/migrations/`).

## API routes reviewed

None. Zero `src/app/api/` files changed on this branch (confirmed via `git diff --name-only`).

## Supabase lib files reviewed

- `src/lib/supabase/client.ts` — W.1 harness session bridge (the only changed file in audit scope)

## Platform-admin migration reviewed (Plans 4 + 6)

New tree: `src/app/platform-admin/` (13 sub-routes, all new to this branch)  
Source truth: `src/app/admin/platform/` (unchanged on this branch — still present, no diff)

## Checks

| Check | Verdict | Evidence |
|-------|---------|----------|
| New tables: RLS enabled | N/A — PASS | Zero migrations |
| New tables: at least one policy | N/A — PASS | Zero migrations |
| New tables: org_id filter from jwt/membership | N/A — PASS | Zero migrations |
| New tables: SELECT/INSERT/UPDATE/DELETE policies considered | N/A — PASS | Zero migrations |
| New tables: platform-admin bypass applied | N/A — PASS | Zero migrations |
| New API routes: getCurrentMembership before DB access | N/A — PASS | Zero API route changes |
| New API routes: org_id filter on every query | N/A — PASS | Zero API route changes |
| New API routes: 401/403 on missing membership | N/A — PASS | Zero API route changes |
| New API routes: expected_updated_at + updateWithLock() | N/A — PASS | Zero API route changes |
| Hardcoded ORG_ID fallback | PASS | Only hit: TEMPLATE_ORG_ID in `src/app/api/cost-codes/template/route.ts:12` (permitted). No new hits. |
| W.1 bridge: env gate correct | PASS | `client.ts:71` — `process.env.NEXT_PUBLIC_VERCEL_ENV !== "production"`; Vercel inlines NEXT_PUBLIC_* at build time, dead code on prod |
| W.1 bridge: no privilege escalation | PASS | Bridge calls `supabase.auth.setSession()` — requires a valid access_token + refresh_token; no new auth capability created |
| W.1 bridge: harness user scoped to fixture org only | PASS | `harness-fixture@nightwork.local` membership is fixture-harness-org (`00000000-0000-0000-0000-fb1ce0a55e55`) only, per migration 00092. No cross-tenant data path. |
| /platform-admin/audit: uses createServerClient (not service-role) | PASS | `audit/page.tsx:1,57,136` — `import { createServerClient }` and both `fetchAudit()` and `fetchFilterOptions()` call `createServerClient()` |
| /platform-admin/audit: gated by RLS policy | PASS | `platform_admin_audit_staff_read` policy (migration 00048:94-95) — `FOR SELECT USING (app_private.is_platform_admin())`. Applies to both `/admin/platform/audit` (old) and `/platform-admin/audit` (new) — same table, same policy, same client type |
| /platform-admin layout: middleware gate covers new path | PASS | `middleware.ts:149-150` — `pathname === "/platform-admin"` and `pathname.startsWith("/platform-admin/")` both checked; non-platform-admin redirected to `/dashboard` |
| /platform-admin layout: belt-and-suspenders server check | PASS | `platform-admin/layout.tsx:15-19` — `getPlatformAdmin()` called; redirects to `/dashboard` if null |
| Soft-delete only (no hard DELETE) | N/A — PASS | No writes introduced in this phase |
| status_history appends | N/A — PASS | No writes introduced in this phase |
| Cross-tenant join review | PASS | No new JOIN patterns. The `platform_admin_audit` SELECT queries are intentionally cross-org (platform-admin context by construction — gated by `is_platform_admin()` RLS predicate) |

## Findings

### BLOCKING

None.

### WARNING

- `src/lib/supabase/client.ts:71` — W.1 gate uses `NEXT_PUBLIC_VERCEL_ENV`. Locally, `NEXT_PUBLIC_VERCEL_ENV` is not set in `.env.local`, so the condition evaluates `undefined !== "production"` which is `true` — the bridge is active in local dev. This is the intended behavior (bridge is for dev/preview, not prod), but it means any local developer with `window.__nightwork_harness_session` in their browser could trigger `setSession()`. Risk is negligible (valid token required, single-use, clears itself), but worth noting for completeness.

### NOTE

- The audit page at `src/app/platform-admin/audit/page.tsx` is byte-for-byte identical in logic to the source at `src/app/admin/platform/audit/page.tsx`. Only the "Clear" link href differs (`/platform-admin/audit` vs `/admin/platform/audit`), which is correct — the new route self-links to itself. Auth chain and RLS posture are fully preserved.
- `FIXTURE_ORG_ID` and `FIXTURE_ORG_UUID` in `src/lib/verification/types.ts` are harness-internal constants, not tenant data ORG_IDs. They fall outside the hardcoded ORG_ID rule (that rule targets `org_id` fallbacks in application auth paths — the harness fixture org is a test infrastructure identity, not a tenant bypass).
- Plans 4 and 6 re-mounts are full implementations (not thin `export { default } from "..."` wrappers). Each sub-route imports `createServerClient` and inherits the layout's `getPlatformAdmin()` gate.

## Verdict

**PASS**

No tenant table RLS gaps. No hardcoded ORG_ID fallbacks outside the permitted `TEMPLATE_ORG_ID` exception. The `/platform-admin/audit` migration preserves the `createServerClient` (not service-role) posture and the `platform_admin_audit_staff_read` RLS policy unchanged. The W.1 harness session bridge is correctly env-gated to non-production and introduces no privilege escalation path. The harness fixture user is org-scoped by construction to `fixture-harness-org` only, with no cross-tenant data exposure path.
