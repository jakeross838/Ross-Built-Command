# Security Review — Stage 1.5c Information Architecture

**Branch:** phase/1.5-c-information-architecture
**HEAD verified:** 7fa0725
**Prior review HEAD:** accb55f
**Reviewer:** security (Claude)
**Review date:** 2026-05-11 (initial); 2026-05-12 (M-1 re-verification after GATE-B.1 fixes)
**Scope:** M-1 fix verification pass; all other findings from prior review re-confirmed at HEAD 7fa0725

---

## Verdict

**PASS**

M-1 is resolved. The env passthrough is mechanically correct: Vercel sets `VERCEL_ENV=production` on production deploys; `next.config.mjs` now forwards it into the client bundle as `NEXT_PUBLIC_VERCEL_ENV` via the `env` block; the gate at `src/lib/supabase/client.ts:71` evaluates `"production" !== "production"` = false at build time, making the W.1 bridge dead code in the production bundle. All other findings from the prior CONDITIONAL PASS are unchanged. No new findings introduced by commits between accb55f and 7fa0725.

---

## M-1 Verification — CLEARED

### What was required

The prior review (accb55f) found that `process.env.NEXT_PUBLIC_VERCEL_ENV` was never configured, causing the W.1 harness bridge gate to always evaluate true (undefined !== "production") — the bridge ran on every environment including production. Remediation required adding an explicit passthrough in `next.config.mjs` so Vercel's server-side `VERCEL_ENV` system variable reached the client bundle.

### What commit 7fa0725 did

Added to `next.config.mjs` lines 16-18:

```js
env: {
  NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "",
},
```

The commit touched exactly one file (`next.config.mjs`, +14 lines). No other source files were modified.

### Verification of correctness

Three properties confirmed by direct file inspection:

**1. Passthrough is correct for Vercel's system env behavior.**
Vercel automatically injects `VERCEL_ENV` as a server-side system env var in every build environment: `"production"` on production deploys, `"preview"` on PR/branch deploys, and it is unset in local dev. The `?? ""` fallback means local dev bundles get an empty string, which also satisfies `"" !== "production"` = true (bridge active locally — correct for harness dev use). The passthrough does not require manual per-environment Vercel dashboard configuration; the system variable is always present on Vercel builds.

**2. Gate at client.ts is correctly wired.**
`src/lib/supabase/client.ts:71` reads `process.env.NEXT_PUBLIC_VERCEL_ENV !== "production"`. Next.js inlines all `NEXT_PUBLIC_*` env vars at build time (static string substitution). On a production Vercel build where `VERCEL_ENV=production`, the compiled output is effectively `"production" !== "production"` which is `false`. The entire `if` block (lines 69-105) is dead code in the production bundle — the bridge is unreachable.

**3. The gate claim in the comment block is now accurate.**
`src/lib/supabase/client.ts:44-49` documents: "Vercel sets VERCEL_ENV to 'production' on production deploys... Next.js inlines NEXT_PUBLIC_* env vars at build time, so on production builds this block compiles to a no-op (`if (false) { ... }`) — dead code in the production bundle, zero attack surface." This description is now accurate given the `next.config.mjs` passthrough. Previously this was documentation debt; it is not anymore.

### Grep confirming no other VERCEL_ENV consumers were missed

All usages of `NEXT_PUBLIC_VERCEL_ENV` and `VERCEL_ENV` across the source tree:

- `next.config.mjs:17` — the passthrough definition
- `src/lib/supabase/client.ts:71` — the W.1 bridge gate (reads `NEXT_PUBLIC_VERCEL_ENV`)
- `src/middleware.ts:86` — `isVerificationBypass` production block (reads server-side `VERCEL_ENV` directly, correct for middleware)
- `src/middleware.ts:219` — design-system gate production check (reads `VERCEL_ENV`, correct for middleware)
- `src/lib/verification/_browser.ts:113` — documentation comment only

The middleware correctly reads `VERCEL_ENV` directly (not `NEXT_PUBLIC_VERCEL_ENV`) because middleware executes server-side where the system variable is available without a `NEXT_PUBLIC_` prefix. The client bundle correctly reads `NEXT_PUBLIC_VERCEL_ENV` which is now explicitly configured. Both patterns are correct for their respective runtime contexts.

**M-1: CLEARED.**

---

## Commits Between accb55f and 7fa0725 — No New Findings

Four commits were added between the prior review HEAD and the current HEAD:

| Commit | Description | Security relevance |
|--------|-------------|-------------------|
| 96484db | AppShell layout fix for section overview NavBar | UI/layout only; no API surface changes |
| 20d6ef5 | Design system hygiene (F-01, F-02, F-04, FLAG-2) | Component token cleanup; no auth or data changes |
| 9ef5dab | Canonicalize admin/billing StatusBadge to NwBadge | Component substitution; no logic changes |
| 7fa0725 | NEXT_PUBLIC_VERCEL_ENV passthrough (M-1) | Security fix only |

No new API routes, no new auth surfaces, no new data queries, no schema changes introduced in these four commits. No new security findings.

---

## Prior Findings Status at HEAD 7fa0725

### MEDIUM

| ID | Finding | Status |
|----|---------|--------|
| M-1 | W.1 bridge env gate always true in production | **CLEARED** — passthrough in next.config.mjs makes gate effective |

### LOW

| ID | Finding | Status |
|----|---------|--------|
| L-1 | `verifyCheckoutSession` executes before membership auth check in `/admin/billing` | **Unchanged — deferred per prior review.** Pre-existing pattern carried over from `settings/billing`. RLS backstop confirmed intact: `createServerClient()` used (not service-role), so any `organizations.update()` is subject to the "admin update own org" RLS policy. Stripe `client_reference_id` cross-check gap remains. Target: Wave 1.1-Lite billing hardening pass. |

### NOTEs (unchanged, no new action needed)

| ID | Finding | Status |
|----|---------|--------|
| N-1 | WARNING-1 (NODE_ENV vs VERCEL_ENV in design-system gate) | Resolved at accb55f, confirmed at 7fa0725 |
| N-2 | Impersonation cookie `secure` flag uses `NODE_ENV` not `VERCEL_ENV` | Not a security gap; `NODE_ENV=production` on all Vercel builds |
| N-3 | Impersonation end-route redirects to stale `/admin/platform/` paths | Low-priority cleanup; 308 redirect chain works |
| N-4 | `/admin/cost-codes` reads accessible to all org members | Intentional; PMs need cost codes during review; write ops gated separately |
| N-5 | `?redirect=` in login URL not consumed by loginAction | No open redirect risk; parameter is ignored, not followed |

---

## Surfaces Confirmed Unchanged

The following checks from the prior review were re-confirmed at HEAD 7fa0725 by direct inspection:

- `/platform-admin/*` middleware gate: `src/middleware.ts:146-167` — PASS (code unchanged)
- `/platform-admin/audit` uses `createServerClient` (SEC-9): `src/app/platform-admin/audit/page.tsx:1,57,136` — PASS (code unchanged)
- Sub-portal `params.token` reflection: both pages return comment-only matches confirming the grep is against documentation, not live reads — PASS
- `isVerificationBypass` timing-safe compare — PASS (code unchanged)
- `harness-auth-state.json` gitignored — PASS (no change to .gitignore)
- No hardcoded secrets in changed files — PASS
- CSP in `vercel.json` — PASS (no changes to vercel.json)
- `dangerouslySetInnerHTML` audit: three instances exist in the codebase; all are static, developer-controlled strings (CSS string literals in page.tsx/pricing/usage; HTML entity strings from a hardcoded array in typography/page.tsx). No user input reaches any of these sinks.
- `/api/users/theme` unauthenticated POST: sets only a `nw_theme` cookie with validated enum value (`"light"` or `"dark"`); no data read or write; no tenant data involved. Acceptable — this is a UX preference endpoint.
- `/api/csv-parse/xlsx` unauthenticated POST: parses caller-uploaded file; returns parsed structure to caller only; no DB writes. Acceptable — the caller is the authenticated browser client uploading their own file; Supabase session auth occurs at the DB write step downstream.
- Cron `/api/cron/overdue-invoices`: uses `CRON_SECRET` optional guard; when set, enforces timing-unsafe comparison. This is a pre-existing pattern on main. Low-priority improvement: replace `provided !== expectedKey` with a timing-safe compare to prevent timing oracle on the secret. Not a new finding for this branch.

---

## Required Actions Before Ship

None. M-1 is cleared. All other deferred items carry forward at their prior severity.

## Deferred (Non-Blocking, Carried From Prior Review)

| # | Severity | Action | Target |
|---|----------|--------|--------|
| L-1 | LOW | `/admin/billing` and `/settings/billing`: move `getCurrentMembership()` + role guard before `verifyCheckoutSession()`; add `session.client_reference_id === membership.org_id` cross-check | Wave 1.1-Lite billing hardening |
| N-3 | NOTE | Update impersonation end-route response redirects to `/platform-admin/*` canonical paths | Wave 1.1-Lite cleanup |
