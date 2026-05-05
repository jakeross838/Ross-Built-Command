---
reviewer: security
phase: stage-1.5c-information-architecture
review-iteration: 1
date: 2026-05-04
verdict: APPROVE WITH CONDITIONS
blocking-findings: 1
high-findings: 2
medium-findings: 2
low-findings: 3
---

# Security Plan Review — Stage 1.5c Information Architecture

## Executive Summary

Stage 1.5c is a structure-only IA phase. No new authentication mechanisms, no new API routes with mutations, no new database schemas, and no real backend wiring. The security surface area added is intentionally thin. Most findings are either pre-existing concerns that 1.5c planning must explicitly resolve during execution, or latent risks in stubs that F3 must not inherit in a broken state.

**Verdict: APPROVE WITH CONDITIONS.**

One BLOCKING finding must be resolved at Plan 6 execution time before ship: the `/platform-admin/*` path gap in `src/middleware.ts`. All other findings are HIGH or lower and have clear mitigations callable within the plan's own task structure.

---

## Finding Index

| ID | Severity | Plan | Component | Title |
|----|----------|------|-----------|-------|
| SEC-1 | BLOCKING | Plan 6 Task 2 | middleware.ts | `/platform-admin/*` not in middleware platform_admin gate |
| SEC-2 | HIGH | Plan 1 Task 3 | next.config.mjs | Redirect chain: `/admin/platform/*` destinations point at unprotected `/platform-admin/*` before SEC-1 is resolved |
| SEC-3 | HIGH | Plan 4 Task 3 | Sub Portal stubs | Token param rendered in page — confirm no reflection before F3 |
| SEC-4 | MEDIUM | Plan 3 | Production routes | Owner Portal `owner_view` role gate absent from middleware — depends on page-level only |
| SEC-5 | MEDIUM | Plan 1 Task 3 | next.config.mjs | BILLING_ESCAPE_PATHS still references `/settings/billing` after redirect to `/admin/billing` |
| SEC-6 | LOW | Plan 7 | Canonical docs | Secrets / real tenant data must not appear in 4 new architecture docs |
| SEC-7 | LOW | Plan 2 Task 1 | AUDIT-LOG-STRATEGY.md | Dual-vocabulary audit log creates forensic ambiguity — confirm UI filter is correct |
| SEC-8 | LOW | All plans | Documentation files | Privacy gate must run on all new `.planning/architecture/*.md` files as well as `.tsx` files |

---

## Detailed Findings

### SEC-1 (BLOCKING) — `/platform-admin/*` not in middleware platform_admin gate

**Location:** `src/middleware.ts` lines 65–79 + Plan 6 Task 2 Step C

**Evidence from middleware.ts:**

The existing gate is:
```
if (pathname === "/admin/platform" || pathname.startsWith("/admin/platform/")) {
```

The new `/platform-admin` path introduced by Plan 6 is NOT covered by this check. The middleware has no branch for `/platform-admin` or `/platform-admin/*`.

Plan 6 Task 2 Step C identifies this gap correctly ("existing middleware semantics at /platform-admin/* — either path-based regex updated to include /platform-admin OR generic auth-then-role check applies") and recommends Option A (update the middleware regex). However, the plan marks this as something the executor must verify and decide at execute time, without a mandatory halt condition if Option A isn't chosen. This is insufficient for a security gate on a cross-org admin surface.

**Risk:** A non-platform-admin authenticated user navigating directly to `/platform-admin` receives no redirect. They land on the placeholder page which lists cross-org tooling categories. Even as a static placeholder, revealing the existence and structure of cross-org operations tools to a regular org member violates least-privilege. More critically, this sets a dangerous precedent before F1 wires real functionality behind this path.

**Required fix:** Plan 6 Task 2 MUST add the following block to `src/middleware.ts` before the design-system gate (or after the existing `/admin/platform` block, as a parallel guard):

```typescript
// Platform admin section at /platform-admin/* — same posture as /admin/platform/*.
// Per CONTEXT D-09 + Plan 6 Task 2.
if (pathname === "/platform-admin" || pathname.startsWith("/platform-admin/")) {
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", "/platform-admin");
    return NextResponse.redirect(loginUrl);
  }
  if (!isPlatformAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/today";
    url.search = "";
    return NextResponse.redirect(url);
  }
  // Authorized — fall through to response.
}
```

Note the redirect destination uses `/today` (not `/dashboard`) since Plan 1 establishes `/today` as the authenticated home. If Plan 1 has not yet shipped when Plan 6 executes, use `/dashboard` which itself redirects to `/today` via Plan 1's redirect map.

Also add `/platform-admin` to the set of paths platform admins can reach even during billing gate expiry (the existing `isPlatformAdmin` exemption at line 133 already handles this, but verify the new path inherits it — it does, since the billing gate check already short-circuits on `!isPlatformAdmin`).

**Acceptance criterion addition for Plan 6 AC-1.5c-6-08:** The existing criterion reads "Existing platform_admins gate enforced at /platform-admin/* (middleware updated OR page-level check)." The OR must be replaced with AND for middleware. Page-level checks are defense-in-depth supplements, not substitutes for middleware gating on a cross-org admin surface. Change the criterion to: "Middleware updated to gate /platform-admin/* to isPlatformAdmin users; smoke test as PM = 302 to /today; as Jake = 200."

---

### SEC-2 (HIGH) — Redirect chain: `/admin/platform/*` destinations point at unprotected `/platform-admin/*`

**Location:** Plan 1 Task 3 + `next.config.mjs` (current lines 30–33)

**Evidence from next.config.mjs current state:**

```javascript
{ source: "/admin/platform/items", destination: "/admin/platform/cost-intelligence", permanent: true },
{ source: "/admin/platform/pricing", destination: "/admin/platform/cost-intelligence?tab=pricing", permanent: true },
{ source: "/admin/platform/extractions", destination: "/admin/platform/cost-intelligence?tab=extractions", permanent: true },
{ source: "/admin/platform/classifications", destination: "/admin/platform/cost-intelligence?tab=classifications", permanent: true },
```

Plan 1 Task 3 specifies updating these to point at `/platform-admin/cost-intelligence?tab=...`. After that update, a user following the redirect chain `/admin/platform/pricing` → `/platform-admin/cost-intelligence?tab=pricing` lands at the new path. If SEC-1 is unresolved at the time Plan 1 executes, the new destination `/platform-admin/cost-intelligence?tab=pricing` is ungated. The redirect updates and the middleware patch MUST ship together in the same build.

**Risk:** This is a sequencing dependency, not an independent vulnerability. It is HIGH rather than BLOCKING because Plan 6 (where the middleware fix lives) is specified to execute before the smoke tests in Plan 7. The risk is that if Plans 1 and 6 execute in the wrong order, there is a window where the CI admin redirects point at ungated pages.

**Required fix:** Add an explicit note in Plan 1 Task 3's `done` criteria: "Destination updates to `/platform-admin/*` are NOT complete until Plan 6's middleware fix for `/platform-admin/*` is verified (SEC-1 per PLAN-REVIEW-security.md). Plan 1's redirect map updates to `/platform-admin/cost-intelligence?tab=...` may ship, but the smoke test for those specific redirects is gated on Plan 6 completion." Plan 7's integration smoke test already covers this holistically, but the explicit sequencing note prevents an executor from declaring Plan 1 done without Plan 6's gate in place.

---

### SEC-3 (HIGH) — Sub Portal token params: confirm no reflection before F3

**Location:** Plan 4 Task 3, `/sub-portal/magic/[token]/page.tsx` and `/sub-portal/public/[token]/page.tsx`

**Concern:** The plan correctly identifies (in Plan 4's STRIDE entry T-1.5c-4-01) that "Stubs do NOT validate or display token contents — placeholder content renders for any token value." However, the plan does not include an explicit automated check that the `[token]` param is NOT read or rendered anywhere in the stub file.

In the example stub pattern provided in Plan 4 Task 3:

```typescript
import PlaceholderCard from "@/components/nw/PlaceholderCard";
export default function <Name>Page() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <PlaceholderCard ... />
    </div>
  );
}
```

The `[token]` param is not accessed here — correct. But the executor could deviate from this pattern. If an executor adds `params.token` to the render output for debugging purposes ("helpful" copy like "Token: {params.token}"), that reflects a secret value (future magic link token) into the HTML response, which is an XSS / information-disclosure precursor.

**Risk:** Reflected token in stub page. At 1.5c these are placeholder tokens that don't exist, so the practical risk is low now. But the stub becomes a production route in F3; if a developer reads the stub as "it shows the token" they may carry that pattern into the real implementation. Establishing clean stub posture now prevents F3 from inheriting a broken baseline.

**Required fix:** Add to Plan 4 Task 3's verify block for Sub Portal routes:

```
Token-read check:
  grep -E "params\.token|params\[.token.\]|searchParams.*token" \
    src/app/sub-portal/magic/[token]/page.tsx \
    src/app/sub-portal/public/[token]/page.tsx
Returns 0 matches.
```

The stubs must accept but not read `params.token`. The page function signature `({ params }: { params: { token: string } })` is acceptable (type annotation only), but `params.token` must not appear in the render body or be passed to any child component.

---

### SEC-4 (MEDIUM) — Owner Portal `owner_view` role gate not in middleware

**Location:** Plan 3 `must_haves` + `src/middleware.ts`

**Evidence:** Plan 3 trust boundary table states "Owner Portal at /owner-portal/* gated to owner role per existing middleware (D-08 — same auth, role-gated)." However, inspection of `src/middleware.ts` shows no branch for `/owner-portal/*` or any `owner_view` role check. The middleware enforces:
- Unauthenticated users → `/login`
- `/admin/platform/*` → `isPlatformAdmin`
- `/design-system/*` → `isPlatformAdmin` (prod) or authenticated (dev)
- Billing gate → `/settings/billing`

There is no `owner_view` gate in the middleware at all, meaning any authenticated user with any org role can currently navigate to `/owner-portal/*` (subject only to the general auth gate). The plan relies on "existing middleware posture" which does not exist for this path.

**Risk at 1.5c:** MEDIUM. The Owner Portal in 1.5c is Caldwell fixture data only (per D-14 / Q8=A). No real Drummond data is exposed. The risk is that the placeholder OwnerDashboardView displays fixture financial summaries to a non-owner user. This is a pattern violation more than a data breach at the stub level.

**Risk at F1 wiring:** HIGH. When F1 wires real data, if the middleware gate is still absent, any authenticated org member (PM, accountant) can access the owner-facing financial summary.

**Required fix:** Plan 3 must add to its verification block: "Confirm that `/owner-portal/*` requires `owner_view` role via either (a) middleware block OR (b) page-level getCurrentMembership() check with role assertion. Document which approach is taken. If page-level only, add middleware block before F1 wiring." A note should also be added to the F1 phase planning artifacts reminding the implementer that `/owner-portal/*` middleware gating is a prerequisite before real data wires in.

---

### SEC-5 (MEDIUM) — BILLING_ESCAPE_PATHS references `/settings/billing` after redirect to `/admin/billing`

**Location:** `src/middleware.ts` lines 12–16 + Plan 1 Task 3 redirect map

**Evidence from middleware.ts:**

```typescript
const BILLING_ESCAPE_PATHS = [
  "/settings/billing",
  ...
];
```

Plan 1 Task 3 adds a redirect: `{ source: "/settings/billing", destination: "/admin/billing", permanent: true }`. After this redirect lands, an expired-trial user who is gate-redirected to `/settings/billing` (see middleware line 135) will be sent to `/settings/billing`, then immediately 308-redirected to `/admin/billing`. The billing gate check (`canEscapeBillingGate`) tests against `/settings/billing` — which is the path BEFORE the redirect, so the escape logic still works (the request URL is `/settings/billing`, which matches the escape list, before the redirect fires). This is actually safe because Next.js redirects are evaluated at the edge before middleware re-runs on the destination.

However, there is a subtlety: the gate redirect at line 135 sends users to `/settings/billing` (old path). A user arriving at `/admin/billing` directly (typing the URL or clicking a bookmarked canonical path) is NOT in BILLING_ESCAPE_PATHS. They hit the billing gate, get redirected to `/settings/billing?trial_expired=1`, which 308-redirects to `/admin/billing?trial_expired=1`, which... can escape the gate because the request to `/admin/billing` comes from the redirect and the middleware re-runs against `/admin/billing`. But `/admin/billing` is not in BILLING_ESCAPE_PATHS, so the gate fires again, creating a potential loop:

`/admin/billing` → gate → `/settings/billing?trial_expired=1` → 308 → `/admin/billing?trial_expired=1` → gate → `/settings/billing?trial_expired=1` → loop.

**Risk:** An expired-trial user navigating to `/admin/billing` may experience an infinite redirect loop that prevents them from reaching the billing management page — a denial of service on their ability to renew. This is a moderate risk.

**Required fix:** Plan 1 Task 3 must add `/admin/billing` to `BILLING_ESCAPE_PATHS` in `src/middleware.ts` alongside `/settings/billing`. Either remove `/settings/billing` from the list (since it will redirect away) and replace with `/admin/billing`, or keep both for safety during the migration window. Recommended: keep both during 1.5c, remove `/settings/billing` in Wave 1.1-Lite when the old route is retired.

Corresponding change at middleware line 135: update the gate redirect destination from `/settings/billing` to `/admin/billing` once Plan 1 ships and the route is canonical.

---

### SEC-6 (LOW) — Canonical docs must not contain secrets or real tenant data

**Location:** Plan 7 (ARCHITECTURE.md, ENTITY-INVENTORY.md, ROLES-CATALOG.md, INGESTION-ARCHITECTURE.md)

**Concern:** The 4 new canonical documentation files live in `.planning/architecture/`, which is in a gitignored path per `.gitignore` line 98 (`/.planning/*` rule with a whitelist for `phases/**`). Architecture docs at `.planning/architecture/` are outside the `phases/**` whitelist and should be gitignored — however, plan artifacts are regularly read by agents and could be written with real names.

Plan 7's verification block includes a privacy gate check: "Privacy gate clean across all updated docs (32-token denylist returns 0 hits)." This is the correct mitigation.

**Clarification needed:** The ENTITY-INVENTORY.md and ROLES-CATALOG.md reference "Ross Built" company specifics (5-digit cost codes, named PMs, etc.) — these are not secrets, but the 32-token denylist grep should cover the Drummond-specific names (street address, Holmes Beach references, sanitized vendor names). Confirm the privacy gate grep in Plan 7's verification step uses the full 32-token denylist and is not a subset.

**Required action:** No code change needed. Plan 7 executor must use the exact same denylist grep as established in Plan 1's verification block. Flag in Plan 7 task as: "privacy gate grep uses identical 32-token denylist from Plan 1 Plan-level verification block — not a subset."

---

### SEC-7 (LOW) — Dual-vocabulary audit log creates forensic ambiguity

**Location:** Plan 2 Task 1, AUDIT-LOG-STRATEGY.md

**Concern:** Strategy 1 (append-only new vocabulary, dual-filter at read time) is the correct technical choice for this phase. The security concern is not the strategy itself but the filter implementation that will read both `invoice_%` and `bill_%` action strings.

If the UI component that renders audit timelines (in invoice review, draw review, etc.) uses a query like `action LIKE 'invoice_%' OR action LIKE 'bill_%'`, it could accidentally surface audit rows from OTHER entities if action string naming is not disciplined. For example, if a future entity named "Invoice Templates" writes `invoice_template_created`, that row would appear in a Bill's audit timeline.

**Required action:** AUDIT-LOG-STRATEGY.md should document that the dual-vocabulary filter must be anchored with a primary key filter (e.g., `entity_id = :bill_id AND (action LIKE 'invoice_%' OR action LIKE 'bill_%')`), not a loose prefix match. This is a documentation note for the AUDIT-LOG-STRATEGY.md author, not a code change in 1.5c since no audit-log writes occur in this phase.

---

### SEC-8 (LOW) — Privacy gate coverage: `.planning/architecture/*.md` files

**Location:** Plan 7 Task 2 (or equivalent verification pass)

**Concern:** The existing 4-tier privacy gate is oriented toward source files (`.tsx`, `.ts`) and committed planning artifacts. The 4 new architecture docs are created in a gitignored directory (`.planning/architecture/`) but are read by downstream agents as canonical references. If a Drummond-specific term (vendor name, address, client name) appears in ENTITY-INVENTORY.md or ROLES-CATALOG.md — even as an illustrative example — it could propagate into downstream agent outputs or screenshots.

The existing `.githooks/pre-commit` grep gate and the `.github/workflows/drummond-grep-check.yml` CI gate operate on committed files. Since `.planning/architecture/` is gitignored, these gates do NOT cover these new docs.

**Required action:** Plan 7's privacy verification step must explicitly run the 32-token denylist grep against the 4 new `.planning/architecture/*.md` files as a manual step, since the automated hooks won't catch them. This should be a named verification item in Plan 7 AC-1.5c-7-12: "Privacy gate verified manually on 4 new architecture docs (not covered by pre-commit since gitignored) — grep returns 0 matches for 32-token denylist."

---

## OWASP Top 10 Coverage Notes

| OWASP Category | Coverage in 1.5c | Notes |
|---|---|---|
| A01 Broken Access Control | SEC-1 (BLOCKING), SEC-4 (MEDIUM) | New `/platform-admin/*` path ungated; `/owner-portal/*` gate undocumented |
| A02 Cryptographic Failures | N/A | No new crypto surfaces; no passwords, tokens, or keys in scope |
| A03 Injection | N/A | No new database writes; no user input processed in this phase |
| A04 Insecure Design | SEC-3 (HIGH) | Sub Portal token stubs must not reflect token value |
| A05 Security Misconfiguration | SEC-1, SEC-2, SEC-5 | Middleware path coverage gaps; billing escape path stale reference |
| A06 Vulnerable Components | N/A | No new dependencies introduced in this phase |
| A07 Auth Failures | SEC-4 | Owner Portal role gate not in middleware |
| A08 Software and Data Integrity | SEC-7 (LOW) | Audit-log dual-vocabulary filter anchoring |
| A09 Security Logging Failures | SEC-7 | Dual-vocabulary log read correctness |
| A10 SSRF | N/A | No new server-side URL fetches introduced |

---

## Positive Security Observations

1. **Plan 1's STRIDE table is substantive.** T-1.5c-1-01 through T-1.5c-1-06 address real threat categories with correct dispositions. The pattern of writing threat models per plan is exactly correct for a structure-only phase.

2. **Sub Portal stub posture (CONTEXT D-02) is architecturally sound.** Naming the 3 routes now without wiring any validation logic is the right approach — it prevents a worse outcome where F3 inherits paths with partial token-validation code written inconsistently across 3 files.

3. **T10c hook verification (Plan 2 Task 1 Step D) is explicitly planned.** This is the correct approach for the thin-wrapper extraction: test the hook boundary before spawning parallel implementers, not after.

4. **Privacy gate is applied across all new files in every plan's verify block.** The 32-token denylist grep appears in Plans 1–7 uniformly. This is defense-in-depth at the planning artifact level.

5. **The PlatformAdminBadge component (Plan 1 Task 1 Step D)** correctly uses a client-side `isPlatformAdmin` state that returns null/renders nothing before confirmation — preventing flash of admin UI for non-admins. The `cancelled` cancellation flag on the async IIFE is correct async hygiene.

6. **No hardcoded secrets anywhere in the plan artifacts.** All Supabase/API patterns reference `process.env` variables. No credentials, ORG_IDs, or API keys appear in the plan text.

7. **Redirect rules use static literal strings only** — no dynamic segments that accept arbitrary user input are used as redirect destinations. The `:id`, `:path*`, and `:extraction_id` wildcards in `next.config.mjs` redirects map input path segments to output path segments of the same shape — not to user-controlled arbitrary destinations. No open-redirect risk.

---

## Conditions for APPROVE

The following must be satisfied during execution before the phase ships (Plan 7 smoke test gate):

**BLOCKING (must resolve before Plan 6 declares done):**
- SEC-1: Add `/platform-admin` and `/platform-admin/*` to the middleware `isPlatformAdmin` gate in `src/middleware.ts`. Smoke test as PM user = redirected to `/today`. As Jake = 200.

**HIGH (must be verified before Plan 7 smoke test):**
- SEC-2: Confirm Plan 1's redirect destination updates to `/platform-admin/cost-intelligence?tab=...` are not declared done until SEC-1 middleware fix is in place.
- SEC-3: Add token-reflection grep check to Plan 4 Task 3 verify block for Sub Portal stub files.

**MEDIUM (must be addressed before ship gate):**
- SEC-4: Document `/owner-portal/*` role gate approach (middleware or page-level) in Plan 3 SUMMARY. Add note to F1 pre-requisites that middleware gate must precede real-data wiring.
- SEC-5: Add `/admin/billing` to `BILLING_ESCAPE_PATHS` in Plan 1 Task 1 (or Task 3). Update gate redirect destination from `/settings/billing` to `/admin/billing`.

**LOW (can be addressed in Plan 7 documentation pass):**
- SEC-6: Plan 7 executor confirms full 32-token denylist used on architecture docs.
- SEC-7: AUDIT-LOG-STRATEGY.md documents entity_id anchor requirement for dual-vocabulary filter.
- SEC-8: Plan 7 explicitly runs privacy gate grep on `.planning/architecture/*.md` as a manual step outside pre-commit scope.

---

## Verdict

**APPROVE WITH CONDITIONS.** The phase is structurally sound from a security standpoint. The one blocking finding (SEC-1) is already identified as an open question in Plan 6 itself — this review converts it from "executor decides" to "must fix, mandatory middleware update." All other findings are scoped to their respective plan tasks and have clear, low-effort mitigations that fit within the existing execution plan structure.

No architectural redesign is needed. No new phases or tasks are required. The existing plan's halt gates (Plan 6 Task 2 Step C verification smoke test, Plan 7 final smoke test) are the correct enforcement points for these conditions.
