# Security Review — internal-launch-hide PLAN.md
**Reviewer:** security-reviewer
**Date:** 2026-05-26
**Plan:** internal-launch-hide (Phase 1 of Internal Ross Built Launch SEQUENCE — HIDE)
**Verdict:** WARNING

---

## Summary

The plan is architecturally sound and the Owner Portal dual gate is correctly specified. All six checks pass with one WARNING and two informational observations that do not block dispatch but should be noted. The WARNING is a gap in the smoke test's Owner Portal API coverage (item verified to be cosmetically incomplete in test #3, not a gate defect). No CRITICAL findings.

---

## CHECK 1 — Owner Portal DUAL Gate (load-bearing)
**Result: PASS**

### UI routes

The plan specifies (Task 3, plan lines 609-612):
```ts
if (!isFeatureEnabled("OWNER_PORTAL")) {
  if (pathname === "/owner" || pathname.startsWith("/owner/")) {
    return respond404();
  }
```

Coverage against actual filesystem routes:
- `/owner` (root layout + not-found.tsx) — covered by `pathname === "/owner"`
- `/owner/[token]` (homeowner dashboard) — covered by `pathname.startsWith("/owner/")`
- `/owner/[token]/pay-apps/[id]` (pay-app detail) — covered by `pathname.startsWith("/owner/")`
- `/owner/error.tsx`, `/owner/layout.tsx` — framework internals, not HTTP routes; not reachable via URL

All UI routes are correctly gated.

### API routes

The plan specifies (Task 3, plan lines 613-615):
```ts
  if (pathname.startsWith("/api/owner-portal/")) {
    return respond404();
  }
```

Coverage against actual filesystem routes:
- `/api/owner-portal/acknowledge-pay-app` — `startsWith("/api/owner-portal/")` matches (`/api/owner-portal/acknowledge-pay-app` starts with the prefix). COVERED.
- `/api/owner-portal/admin/revoke-token` — `startsWith("/api/owner-portal/")` matches. COVERED.

Note on PUBLIC_PATHS interaction: The plan correctly identifies (plan lines 183-188, CONTEXT D-05) that PUBLIC_PATHS at middleware lines 27/32/41/48 marks Owner Portal routes as auth-redirect-skippable, NOT as auth-check-skip. The 404 gate fires at the new insertion point (after line 209) which is AFTER the `!user && !isPublic(pathname)` branch at lines 155-167. This means:
- Anon visitor to `/owner/abc` with flag off: `isPublic("/owner/abc")` returns true (PUBLIC_PATHS includes "/owner"), so the `!user && !isPublic` branch does NOT fire. Flow continues to the new 404 gate at ~line 210, which fires `respond404()`. Correct.
- Anon visitor to `/api/owner-portal/acknowledge-pay-app` with flag off: `isPublic(...)` returns true (PUBLIC_PATHS lists this explicitly), so the 401 branch does NOT fire. Flow hits the new 404 gate. Correct.
- Anon visitor to `/api/owner-portal/admin/revoke-token` with flag off: `isPublic("/api/owner-portal/admin/revoke-token")` — the PUBLIC_PATHS entry is `"/api/owner-portal/admin"` and the matcher is `pathname.startsWith("${p}/")`; `/api/owner-portal/admin/revoke-token` starts with `/api/owner-portal/admin/`, so `isPublic` returns true. Anon request passes the auth gate and reaches the new 404 gate. Correct.

The dual gate as specified correctly intercepts all Owner Portal requests regardless of auth state when the flag is off.

---

## CHECK 2 — Middleware Insertion Point Ordering
**Result: PASS**

CONTEXT D-05 specifies: insert AFTER `updateSession()` at line 141, AFTER platform-admin block (188-209), BEFORE design-system block (235).

The plan (Task 3 action, plan lines 547-548) specifies:
> "Add a new 404 gate block in `middleware()` function BETWEEN the platform-admin block (ends at line 209) and the design-system block header (starts at line 211)."

The plan's Task 3 acceptance criteria (plan line 771-775) explicitly requires:
- "Insertion point is AFTER the platform-admin closing brace (line ~209) AND BEFORE the `// Design-system playground gate` comment header (line ~211)"
- "Existing platform-admin block (lines 188-209) UNCHANGED"
- "Existing design-system block (lines 211-281) UNCHANGED"

The verify block (plan lines 749-752) includes a mechanical line-number check:
```bash
grep -n "Internal-Launch Phase 1 — feature-flag 404 gates" src/middleware.ts | head -1 | awk -F: '{print $1}'
# Expected: line number > 209 AND < 235
```

Confirmed: the plan preserves the updateSession Sentry-tag pipeline and the platform-admin staff bypass posture. The insertion point ordering is correctly specified and mechanically verified.

---

## CHECK 3 — Empty-vs-False Consistency Across All Read Sites
**Result: PASS**

CONTEXT D-04 specifies the canonical idiom: `process.env.NEXT_PUBLIC_FEATURE_X !== "true"`. The plan enforces this through the `isFeatureEnabled` helper.

The helper spec (Task 1, plan lines 359-361):
```ts
export function isFeatureEnabled(name: FeatureFlagName): boolean {
  return FLAG_ENV_VALUE[name] === "true";
}
```

This is the positive form (`=== "true"`); the call sites negate with `!isFeatureEnabled("X")`. Semantically identical to `!== "true"`. The static `FLAG_ENV_VALUE` Record initialized at module load time satisfies Next.js's requirement for static `NEXT_PUBLIC_*` string-literal reads.

Verification coverage across all four read sites:

1. **nav-bar.tsx** (Task 2) — PRIMARY_NAV filter uses `!isFeatureEnabled("X")` for pipeline, company, reports, people. Verify AC includes `! grep -E '=== ?"false"' src/components/nav-bar.tsx`.
2. **middleware.ts** (Task 3) — 7 gate blocks all use `!isFeatureEnabled("X")`. Verify AC includes `No "=== "false"" or other forbidden idioms`.
3. **section-overview pages** (Task 5) — 5 flag-driven pages use `!s.live && !isFeatureEnabled(...)`. Verify AC includes forbidden-idiom check across all 6 files.
4. **per-job-tabs.tsx** (Task 4) — D-06 uses static array removal, NOT per-tab env-var gating. No `isFeatureEnabled` import. D-04 does not apply here because there are no feature-flag reads in this file by design. This is correct per CONTEXT D-06; per-job-tabs.tsx is NOT a "read site" for the env-var pattern because it uses static removal.

Phase-level mechanical AC (plan lines 1485-1486):
```bash
grep -rn "NEXT_PUBLIC_FEATURE_" src/ | expected: exactly 7 matches (all in feature-flags.ts)
! grep -rEn '=== ?"false"|!process\.env\.NEXT_PUBLIC_FEATURE|Boolean\(process\.env\.NEXT_PUBLIC_FEATURE' src/
```

Empty string `""` !== `"true"` evaluates to `true` → `isFeatureEnabled()` returns `false` → features are OFF. Unset (`undefined`) and `"false"` evaluate identically. The fail-closed default is correctly specified across all three Vercel value states Jake called out.

---

## CHECK 4 — /people/clients Carve-Out Non-Presence
**Result: PASS**

CONTEXT D-03 explicitly resolves: HIDE `/people/clients` alongside the rest of `/people/*`. No carve-out.

Task 3 middleware gate (plan lines 644-648):
```ts
if (!isFeatureEnabled("PEOPLE")) {
  if (pathname === "/people" || pathname.startsWith("/people/")) {
    return respond404();
  }
}
```

`/people/clients` starts with `/people/` → gated. No conditional exclusion present in the plan. The plan's acceptance criteria (line 768) explicitly states: "PEOPLE gate fires for `/people/clients` (no carve-out per D-03)". The smoke test (Task 6 test #4) includes `GET ${BASE}/people/clients → 404 (per D-03)`.

Confirmed: no carve-out present in the plan specification.

---

## CHECK 5 — Reversibility AC Presence
**Result: PASS**

The plan specifies three-state verification:

1. **Flag at `""` (current state) — route HIDDEN:** must_haves.truths line 41: "Direct URL to /owner/* returns HTTP 404 when NEXT_PUBLIC_FEATURE_OWNER_PORTAL !== 'true'". All 12 path families include similar truths.
2. **Flag at `"true"` — route EXPOSED:** plan verification section (line 1498): "Reversibility spot-check: flip NEXT_PUBLIC_FEATURE_PIPELINE to 'true' in Vercel Preview + redeploy → `/pipeline` returns 200 with the placeholder Card grid visible". must_haves.truths (line 55): "Flipping any NEXT_PUBLIC_FEATURE_* env var to 'true' in Vercel + redeploy preview re-exposes routes without code changes".
3. **Flag at `"false"` — route HIDDEN:** must_haves.truths (line 56): "Fail-closed default: build with NO NEXT_PUBLIC_FEATURE_* env vars set behaves identically to build with all 6 explicitly false (env var absent === '' === 'false' === 'anything-not-true' === OFF)". This is enforced by the `=== "true"` idiom.

All three states are covered. Runtime AC is Rule 1 compliant (Vercel preview walk required, not just local typecheck).

---

## CHECK 6 — Standard Security Baseline
**Result: PASS with OBSERVATION**

### No secrets in plan body
The plan body contains no hardcoded secrets, tokens, or credentials. Smoke script AC (plan line 1380) explicitly prohibits hardcoded credentials: `! grep -E "(rossbuilt|drummond|Drummond|RossBuilt2026|jakeross)" scripts/smoke-internal-launch-hide.mjs`.

### No SSRF / injection vectors
The middleware changes are read-only pathname checks: `pathname === "/x"` and `pathname.startsWith("/x/")`. No user-supplied data is evaluated in URL construction, template strings, or exec calls. The regex `/^\/jobs\/[^/]+\/schedule(\/.*)?$/` is anchored, bounded, and contains no catastrophic backtracking vectors (`[^/]+` matches a non-slash character class with no unbounded alternation).

### 404 response does not leak route existence
The plan specifies (Task 3 action, plan lines 573-598):
- API paths: `NextResponse.json({ error: "Not found" }, { status: 404 })` — generic error message, no portal-specific language.
- Non-API paths: `NextResponse.rewrite(notFoundUrl, { status: 404 })` where `notFoundUrl.pathname = "/_not-found"` — matches design-system gate precedent at middleware line 268. Rewrite not redirect, preventing 3xx existence disclosure.

STRIDE threat T-ilh-04 addresses this explicitly.

### No new endpoints introduced
Task 3 adds ONLY middleware gates. No new API routes, no new auth paths, no new DB queries. Confirmed by `files_modified` list: no new route files.

### No new authentication paths
CONTEXT (plan line 96): "No auth changes per CONTEXT". PUBLIC_PATHS is explicitly preserved unchanged (Task 3 AC line 773).

### OBSERVATION — Smoke test #3 tests /api/owner-portal/admin with query parameter, not the actual revoke-token sub-route

The smoke script test #3 (plan line 1275) tests:
```
Anonymous fetch to `${BASE}/api/owner-portal/admin?id=test` → expect HTTP 404
```

The actual route that exists is `/api/owner-portal/admin/revoke-token` (POST endpoint). `/api/owner-portal/admin` with a query param is not a valid Next.js route and would 404 regardless of the feature flag (no `route.ts` at `/api/owner-portal/admin/`). The smoke test would PASS here but for the wrong reason — it's not proving the flag gate fires, it's seeing a route-not-found 404.

The plan correctly specifies the gate covers `pathname.startsWith("/api/owner-portal/")` (Task 3, line 613), which DOES cover `/api/owner-portal/admin/revoke-token`. The implementation gate is correct. The smoke test for this specific endpoint is mis-targeted.

This is a WARNING (smoke test insufficient for this one endpoint) not a CRITICAL (the gate spec is correct). Recommend: update smoke test #3 to POST to `/api/owner-portal/admin/revoke-token` with a dummy JSON body `{ token_id: "invalid", expected_updated_at: "2025-01-01T00:00:00Z" }` and expect 404. This is harder to test anonymously because the route requires auth (POST requires getCurrentMembership), but the middleware 404 fires BEFORE the handler, so an anon POST should still return 404 (not 401) when the flag is off.

---

## ADDITIONAL FINDINGS

### FINDING A — Platform admin bypass posture for Owner Portal is correctly implemented

CLAUDE.md §Platform admin states staff can impersonate for debugging. The plan's insertion AFTER the platform-admin block (lines 188-209) means platform admins can reach `/owner/*` and `/api/owner-portal/*` for debugging even when the flag is off. This is intentional per CONTEXT D-05: "platform-admin block must run first so staff debugging a hidden Owner Portal via impersonation can reach it." This is correct behavior.

### FINDING B — /api/owner-portal/acknowledge path coverage is technically correct but borderline

PUBLIC_PATHS includes `/api/owner-portal/acknowledge` (line 32 of middleware.ts). The `isPublic` matcher uses `pathname.startsWith("${p}/")`; so `/api/owner-portal/acknowledge` exact match uses `pathname === p`. The new gate `pathname.startsWith("/api/owner-portal/")` covers it: `/api/owner-portal/acknowledge` starts with `/api/owner-portal/`. This is correct.

Note: the PUBLIC_PATHS entry `/api/owner-portal/acknowledge` (line 32) appears to be a prefix that no longer has a direct Next.js route handler (the actual route is `/api/owner-portal/acknowledge-pay-app`). The comment at middleware lines 33-38 explicitly notes that `/api/owner-portal/acknowledge` does NOT startsWith-match `/api/owner-portal/acknowledge-pay-app` due to the hyphen boundary. This is pre-existing middleware state unrelated to this plan. The feature-flag gate covers the actual route regardless.

### FINDING C — HARD HALT dispatch blockers are correctly flagged in plan

The plan has two explicit HARD HALT dispatch blockers (plan lines 127-138):
- Q1 — Schedule flag bundling
- Q3 — PEOPLE flag mechanism (path a vs path b)

Both require Jake's explicit resolution before `/nx` dispatch. These are not security issues; they are scope/budget discipline issues correctly flagged by the plan-author. The security-reviewer notes both HARDs are present and correctly structured.

---

## Per-Check Summary

| Check | Result | Evidence |
|-------|--------|----------|
| CHECK 1: Owner Portal DUAL gate | PASS | Task 3 lines 609-615 cover `/owner`, `/owner/*`, `/api/owner-portal/*`; all 3 real route families confirmed from filesystem; ordering verified correct for anon requests via PUBLIC_PATHS analysis |
| CHECK 2: Middleware insertion ordering | PASS | Plan Task 3 specifies after line 209 (platform-admin), before line 211 (design-system); mechanical verify AC includes line-number check |
| CHECK 3: Empty-vs-false consistency | PASS | `=== "true"` idiom centralized in helper; all 3 read sites (nav-bar, middleware, section-overview pages) use `!isFeatureEnabled()`; per-job-tabs uses static removal (not a read site); forbidden-idiom grep ACs cover all files |
| CHECK 4: /people/clients carve-out non-presence | PASS | `pathname.startsWith("/people/")` catches `/people/clients`; no exclusion clause; smoke test explicitly includes this route |
| CHECK 5: Reversibility AC presence | PASS | Three-state verification (empty/true/false) specified in must_haves.truths + verification section + smoke test |
| CHECK 6: Standard security baseline | PASS with OBSERVATION | No secrets, no injection, 404 response opaque; OBSERVATION: smoke test #3 mis-targets `/api/owner-portal/admin?id=test` instead of the real sub-route `/api/owner-portal/admin/revoke-token` |

---

## Verdict

**WARNING**

The Owner Portal dual gate is correctly specified. The middleware implementation spec is sound. The fail-closed idiom is consistently enforced. No CRITICAL or BLOCKING findings.

The single WARNING is the smoke test mis-target on `/api/owner-portal/admin` (smoke test #3 tests a non-existent route path rather than the real `/admin/revoke-token` sub-route). The gate implementation itself is correct — this is a test-coverage gap, not a security gap.

**Recommended fix before /nx dispatch:** Update smoke test Task 6 test #3 to POST to `${BASE}/api/owner-portal/admin/revoke-token` with dummy JSON body and assert HTTP 404 (not 401) when flag is off. This proves the middleware gate fires before the handler, not that the route is simply 404-by-default.

**Dispatch posture:** WARNING does not block dispatch if Jake accepts the smoke test gap as acceptable risk given the implementation gate is correctly specified. The implementation itself will gate the route correctly. The smoke test gap means the automated evidence for this specific endpoint will be weaker than for other endpoints. Jake's call.

**Two HARD HALTs in the plan (Q1 and Q3) MUST be resolved by Jake before /nx dispatch** — these are plan-author correctly-flagged scope questions, not security reviewer findings.
