# Security Review — Stage 1.5c Information Architecture

**Branch:** phase/1.5-c-information-architecture
**HEAD:** accb55f
**Reviewer:** security (Claude)
**Date:** 2026-05-11
**Scope:** 235 changed files; focused on 5 key surfaces per brief

---

## Verdict

**CONDITIONAL PASS**

One MEDIUM finding (W.1 env-gate claim is incorrect) requires documentation correction and a follow-up env-var addition to Vercel project settings before ship. All other findings are LOW or NOTE severity. No BLOCKING or HIGH issues found. The platform-admin gate, sub-portal token posture, audit log client type, and getCurrentMembership chain are all correct.

---

## Findings by Severity

---

### MEDIUM

#### M-1 — W.1 bridge env gate: `NEXT_PUBLIC_VERCEL_ENV` is never set; bridge is active on production

**File:** `src/lib/supabase/client.ts:71`

**Condition checked:**
```
process.env.NEXT_PUBLIC_VERCEL_ENV !== "production"
```

**Problem:** Vercel provides `VERCEL_ENV` as a server-side system environment variable. It does NOT automatically expose `NEXT_PUBLIC_VERCEL_ENV` to the client bundle. `NEXT_PUBLIC_*` prefixed variables must be either (a) explicitly added in the Vercel project dashboard, or (b) forwarded via `next.config.mjs`'s `env` block. Neither is present in this codebase (confirmed: `next.config.mjs` has no `env` key forwarding `VERCEL_ENV`; `.env.example`, `.env.local.example`, and `.env.local` all lack `NEXT_PUBLIC_VERCEL_ENV`; the GitHub Actions workflow does not set it).

Therefore, `process.env.NEXT_PUBLIC_VERCEL_ENV` evaluates to `undefined` on every environment — local, preview, and **production**. The condition `undefined !== "production"` is always `true`. The bridge is active everywhere, not just in dev/preview.

**The RLS-AUDIT.md claim** ("Vercel inlines NEXT_PUBLIC_* at build time, dead code on prod") is **incorrect** for this specific variable. It would be true only if the variable were configured in Vercel's project settings.

**Actual risk level:** The practical security impact is LOW. The bridge calls `supabase.auth.setSession({ access_token, refresh_token })` but only if `window.__nightwork_harness_session` is set with valid string tokens. An attacker who already holds a valid `access_token` and `refresh_token` is already authenticated — `setSession` would not grant any additional capability. No privilege escalation path exists. The bridge is single-use and self-clearing.

However: (1) the misleading gate claim creates a false production-safety assumption that future reviewers and contributors will inherit; (2) the bridge is unnecessary dead weight in the production bundle; (3) if Vercel ever changes how it handles system env vars, the claim's inaccuracy could mask a real gap.

**Required remediation (before ship):**
Add `NEXT_PUBLIC_VERCEL_ENV=production` as an environment variable in the Vercel project dashboard scoped to the **Production** environment only (not Preview, not Development). This makes the production build bundle see `"production"` at build time, and the Next.js compiler dead-code-eliminates the bridge block as written.

Alternatively, add to `next.config.mjs`:
```js
env: {
  NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "",
},
```
This propagates Vercel's server-side `VERCEL_ENV` into the client bundle at build time, making the gate effective. This is the safer choice as it does not require manual per-environment dashboard configuration.

Update RLS-AUDIT.md and the comment block in `client.ts` to accurately reflect the configured-variable requirement rather than implying it is automatic.

---

### LOW

#### L-1 — `verifyCheckoutSession` executes before membership auth check in `/admin/billing`

**File:** `src/app/admin/billing/page.tsx:84-91`

```typescript
if (searchParams.session_id) {
  await verifyCheckoutSession(searchParams.session_id);  // line 85 — runs first
}
const membership = await getCurrentMembership();  // line 88
if (!membership) redirect("/login");
```

**Problem:** Any authenticated (but not yet auth-checked for role) user can supply an arbitrary Stripe `session_id` via `?session_id=cs_xxx` and trigger a Stripe API call plus a conditional `organizations.update()` before membership role is confirmed. The update keys on `session.client_reference_id` (the org ID embedded by Stripe at checkout creation), not the current user's org.

**Actual risk level:** LOW. Three mitigations bound the blast radius: (1) the middleware still requires a valid Supabase session — unauthenticated users are redirected to `/login` before reaching this page; (2) `verifyCheckoutSession` uses `createServerClient()` (not service-role), so the `organizations.update()` is subject to the `"admin update own org"` RLS policy (`USING (id = app_private.user_org_id() AND app_private.user_role() IN ('admin','owner'))`), which blocks cross-org writes at the database layer; (3) the stripe checkout session must be a real completed Stripe session with a matching subscription.

**Pre-existing:** This pattern is identical in `src/app/settings/billing/page.tsx` on `main`. The `admin/billing` page was created as a verbatim copy (Plan 6 Task 1). This is a carry-over deficiency, not a new regression introduced by this branch.

**Recommended fix (deferred, not blocking ship):** Move the membership check and role guard to execute before `verifyCheckoutSession`, and add a cross-check that `session.client_reference_id === membership.org_id` before applying the update. This eliminates the unnecessary Stripe round-trip for non-admin/owner members and closes the theoretical cross-org update window at the application layer (independent of RLS).

---

### NOTE

#### N-1 — WARNING-1 carry-forward: RESOLVED

**File:** `src/middleware.ts:219-220`

WARNING-1 from the harness ship QA (commit 704bf65) flagged `NODE_ENV` usage in the design-system gate. The current code at line 219 reads:

```typescript
const isProd =
  process.env.VERCEL_ENV === "production" ||
  process.env.NODE_ENV === "production";
```

`VERCEL_ENV` is the primary signal (server-side, set by Vercel per-deployment-type). `NODE_ENV` is a secondary fallback for local dev. The comment at line 213-216 explains the reasoning. This is correct. WARNING-1 is **resolved and confirmed** at current HEAD.

The `isVerificationBypass` function at line 86 also correctly uses `process.env.VERCEL_ENV === "production"` (not `NODE_ENV`) as its production-block check. Both paths are consistent.

---

#### N-2 — Impersonation cookie `secure` flag uses `NODE_ENV`, not `VERCEL_ENV`

**Files:** `src/app/api/admin/platform/impersonate/route.ts:81`, `src/app/api/admin/platform/impersonate/end/route.ts:51`

```typescript
secure: process.env.NODE_ENV === "production",
```

**Analysis:** Vercel sets `NODE_ENV=production` for ALL deployed environments (production and preview). Local dev has `NODE_ENV=development`. Therefore `secure: true` applies correctly to all Vercel deployments and `secure: false` applies only in local dev (where HTTPS is not used anyway). This behavior is correct in practice, though it differs from the middleware pattern (which uses `VERCEL_ENV`).

No action required. Flagging for documentation consistency — if the codebase wants a uniform pattern, these two routes should eventually migrate to `VERCEL_ENV` or `VERCEL_ENV || NODE_ENV`, matching the middleware convention. Not a security gap.

---

#### N-3 — Impersonation end route redirects to stale `/admin/platform/` path

**File:** `src/app/api/admin/platform/impersonate/end/route.ts:59-60`

```typescript
redirect: targetOrgId
  ? `/admin/platform/organizations/${targetOrgId}`
  : "/admin/platform",
```

The end-impersonation response body tells the client to navigate to `/admin/platform/*`. These paths 308-redirect to `/platform-admin/*` per `next.config.mjs`. The redirect chain works but is one hop longer than necessary. A user ending impersonation will land at the old path, receive a 308, then arrive at the correct canonical page. No security gap — the platform-admin gate at `/platform-admin/*` is in place.

Low-priority cleanup: update the redirect targets to `/platform-admin/organizations/${targetOrgId}` and `/platform-admin` respectively.

---

#### N-4 — `/admin/cost-codes` has no role restriction (any org member can read)

**File:** `src/app/admin/cost-codes/page.tsx:19-28`

The cost-codes page checks `getCurrentMembership()` but does not gate on `role`. Any authenticated org member can read the cost codes list. This matches the source page at `src/app/settings/cost-codes/page.tsx` which has the same posture. Write operations are handled by `CostCodesManager` server actions which enforce `owner`/`admin` role separately. Read access to cost codes is intentional (PMs need to see cost codes during invoice review). No finding, confirming pre-existing posture is preserved verbatim per Plan 6 iter-2 mechanical #10.

---

#### N-5 — `?redirect=` parameter is set in login URL but never consumed at post-login

**File:** `src/middleware.ts:123, 157, 233`; `src/app/login/actions.ts`

The middleware correctly sets `loginUrl.searchParams.set("redirect", pathname)` when bouncing users to `/login`. However, `src/app/login/actions.ts:loginAction` ignores the `redirect` query parameter and always redirects to `/dashboard` (or `/onboard`). The parameter is therefore informational only — no open redirect risk exists (the value is never followed).

Note: when `loginAction` is updated in a future phase to honor `redirect`, it must validate that the target is a same-origin path (starts with `/` and does not start with `//`) before following it, to prevent open redirect.

---

## Specific Checks from Brief

### 1. `/platform-admin/*` middleware gate — PASS

`src/middleware.ts:146-167` explicitly gates both `pathname === "/admin/platform"` / `pathname.startsWith("/admin/platform/")` AND `pathname === "/platform-admin"` / `pathname.startsWith("/platform-admin/")` with identical `!isPlatformAdmin` posture. Non-platform-admin authenticated users receive a redirect to `/dashboard`. Unauthenticated users receive a redirect to `/login` with the original path preserved in `?redirect=`. Defense-in-depth secondary check in `src/app/platform-admin/layout.tsx:15-19` calls `getPlatformAdmin()` and redirects to `/dashboard` if null.

The `isPlatformAdmin` boolean is derived in `src/lib/supabase/middleware.ts:246` from a direct DB lookup against `platform_admins` using the session-authenticated `user.id`. Inbound `x-platform-admin` headers are stripped at line 48 before the lookup to prevent header-forgery bypass.

### 2. W.1 harness session bridge env gate — MEDIUM (see M-1 above)

The gate `process.env.NEXT_PUBLIC_VERCEL_ENV !== "production"` is structurally correct in intent but the variable is never configured, making it always active. Practical security risk is LOW (requires valid tokens). Requires Vercel project-settings fix before ship.

### 3. Sub-portal `params.token` reflection grep — PASS

`grep -E "params\.token"` against `src/app/sub-portal/magic/[token]/page.tsx` and `src/app/sub-portal/public/[token]/page.tsx` returns 0 matches. Neither page reads, validates, or reflects the `[token]` route segment into the HTML output. The iter-2 mechanical #5 (a) check passes.

F3 compliance contract is documented in stub copy for both pages. Both stubs explicitly state JWT-with-org-claim REJECTED by-construction, audit-log-on-use requirement, token expiry posture (30-day magic link, 90-day public link), scope binding (single job), and SHA-256 hash pattern (mirroring migration 00074).

### 4. `/platform-admin/audit` client type — PASS (confirms SEC-9 resolution)

`src/app/platform-admin/audit/page.tsx:1,57,136` uses `createServerClient` from `@/lib/supabase/server` (not service-role). Both `fetchAudit()` and `fetchFilterOptions()` call `createServerClient()`. The `platform_admin_audit_staff_read` RLS policy (`FOR SELECT USING (app_private.is_platform_admin())`) gates all reads at the database layer. No service-role bypass on this table. Posture matches the iter-3 plan review approval and the RLS-AUDIT.md entry.

The audit CSV export at `/api/admin/platform/audit/export/route.ts` correctly uses `createServiceRoleClient()` with `requirePlatformAdmin()` called first — service-role is appropriate here because the export needs full cross-org row access and is protected by the application-layer `requirePlatformAdmin()` guard plus the middleware JSON-401 gate for `/api/admin/platform/*` paths.

### 5. `/admin/*` REAL-LOGIC routes — getCurrentMembership chain — PASS

All three REAL-LOGIC re-mounts preserve the `getCurrentMembership()` call:

- `src/app/admin/users/page.tsx:24` — `getCurrentMembership()` + role check (`admin`/`owner`)
- `src/app/admin/billing/page.tsx:88` — `getCurrentMembership()` + role check (`admin`/`owner`)
- `src/app/admin/cost-codes/page.tsx:19` — `getCurrentMembership()` (no role gate, matching source)

All queries filter by `membership.org_id`. No hardcoded ORG_ID fallbacks.

### 6. WARNING-1: NODE_ENV → VERCEL_ENV — RESOLVED (see N-1)

Confirmed in place at current HEAD accb55f. Both the `isVerificationBypass` helper (line 86) and the design-system production gate (lines 219-220) use `VERCEL_ENV` as primary signal.

---

## Additional Surfaces Reviewed

**No hardcoded secrets or API keys** found in any new file in the changed set.

**No `dangerouslySetInnerHTML` or `innerHTML`** in new pages under `src/app/platform-admin/`, `src/app/sub-portal/`, or `src/app/admin/`. The `AuditRow` component renders DB values via JSX (React-escaped by default) and `JSON.stringify` inside a `<pre>` block — no XSS vector.

**`NwPlaceholderCard`** accepts typed props and renders via standard JSX. No XSS surface.

**CSP in `vercel.json`** covers the main attack surfaces (`script-src`, `connect-src`, `frame-ancestors 'none'`). No changes to CSP in this branch.

**Verification bypass timing-safe compare** in `isVerificationBypass` is correct: lengths are compared first (leaks minimum-length floor only — acceptable), then character-by-character XOR accumulates into `mismatch`. Returns `mismatch === 0`. Correct constant-time pattern for secrets of equal length.

**`harness-auth-state.json`** is gitignored (`.gitignore:160-161`). Live session tokens are not committed.

**`sanitize-drummond.ts`** halts on CI/Vercel (`process.env.CI === "true" || process.env.VERCEL === "1"`) and validates gitignore state of `drummond-invoice-fields.json` before proceeding. No PII leakage path in CI.

---

## Required Actions Before Ship

| # | Severity | Action | Owner |
|---|----------|--------|-------|
| 1 | MEDIUM | Add `NEXT_PUBLIC_VERCEL_ENV=production` to Vercel project settings (Production environment only) **or** add `env: { NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "" }` to `next.config.mjs`. Update `client.ts` comment and `RLS-AUDIT.md` to accurately describe the configuration requirement. | Jake / ops |

## Deferred (Non-Blocking)

| # | Severity | Action |
|---|----------|--------|
| L-1 | LOW | In `/admin/billing/page.tsx`, move `getCurrentMembership()` and role guard before `verifyCheckoutSession()`, and add `session.client_reference_id === membership.org_id` cross-check. Same fix needed in `/settings/billing/page.tsx` (pre-existing). Target: Wave 1.1-Lite billing hardening pass. |
| N-3 | NOTE | Update impersonation end-route response redirects to `/platform-admin/*` canonical paths. |
