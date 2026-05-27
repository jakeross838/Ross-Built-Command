---
phase: internal-launch-hide
review_type: plan-review-security
iteration: 2
reviewer: security-reviewer
date: 2026-05-26
verdict: APPROVE
basis: iter1 previously-PASS items verified not regressed; all 5 checks PASS
---

# Security Plan Review — internal-launch-hide PLAN.md (iter 2)

## Verdict: APPROVE

All five checks PASS. The nwrp232 revision applied cleanly. No regressions on previously-PASS items.

---

## CHECK 1 — Owner Portal DUAL gate (load-bearing): PASS

**Evidence:**

Plan lines 634–641 contain the gate code verbatim:

```ts
if (!isFeatureEnabled("OWNER_PORTAL")) {
  if (pathname === "/owner" || pathname.startsWith("/owner/")) {
    return respond404();
  }
  if (pathname.startsWith("/api/owner-portal/")) {
    return respond404();
  }
}
```

Both path families confirmed present:
- UI path: `pathname === "/owner" || pathname.startsWith("/owner/")` — catches `/owner/some-token`, `/owner` root
- API path: `pathname.startsWith("/api/owner-portal/")` — catches `/api/owner-portal/admin/revoke-token`, `/api/owner-portal/acknowledge`, `/api/owner-portal/acknowledge-pay-app`, and any other sub-routes

Both gates are inside a single outer `if (!isFeatureEnabled("OWNER_PORTAL"))` block — the guard is `NEXT_PUBLIC_FEATURE_OWNER_PORTAL !== "true"` via the helper, which is the canonical D-04 fail-closed idiom (empty string, undefined, "false", all evaluate to OFF).

The revision did NOT touch the Owner Portal gate block. Confirmed by grep: `isFeatureEnabled("OWNER_PORTAL")` appears exactly once as the gate condition; the two inner checks are identical to what iter-1 reviewed.

**Response shape correct:**
- `respond404()` helper defined at plan line 613–624: `/api/*` paths return `NextResponse.json({ error: "Not found" }, { status: 404 })`; non-API paths return `NextResponse.rewrite(notFoundUrl, { status: 404 })`. The API path check in `respond404` is `pathname.startsWith("/api/")`. Since `/api/owner-portal/*` matches, it returns JSON 404. Correct.

**Gate fires BEFORE PUBLIC_PATHS auth-redirect-skip:**
Confirmed: insertion point is AFTER the `!user && !isPublic()` auth gate block (line 155–167). The Owner Portal paths ARE in PUBLIC_PATHS (lines 27, 32, 41, 48 of current middleware), so the auth gate passes anon users through to line 210+ where the feature gate fires. Simulation verified:

```
isPublic("/api/owner-portal/admin/revoke-token") → true  (via "/api/owner-portal/admin" startsWith match)
isPublic("/owner/some-token")                   → true
Feature flag gate at line 210+: returns respond404() when OWNER_PORTAL !== "true"
```

The gate independently 404s regardless of PUBLIC_PATHS bypass — which is the correct posture (PUBLIC_PATHS is auth-redirect skip only, not a security gate bypass).

---

## CHECK 2 — PEOPLE hardcoded gate replaces isFeatureEnabled gate cleanly: PASS

**Task 1 — FeatureFlagName union has 6 members, PEOPLE absent:**

Plan lines 317–323 show the union type:
```ts
export type FeatureFlagName =
  | "OWNER_PORTAL"
  | "PIPELINE"
  | "COMPANY"
  | "REPORTS"
  | "PRICE_INTEL_F5"
  | "FINANCIALS_F1_VIEWS";
```

PEOPLE is not in the union. The explicit prohibition at plan line 375: "Don't add PEOPLE to the union or FLAG_ENV_VALUE Record." No `NEXT_PUBLIC_FEATURE_PEOPLE` in the FLAG_ENV_VALUE Record (lines 330–336 enumerate exactly the 6 flags above). Grep confirms: no `isFeatureEnabled("PEOPLE")` call anywhere in the plan's action blocks — all occurrences are negation-guards ("Do NOT", "FORBIDDEN", "would fail TypeScript compile").

**Task 2 — nav-bar people hardcoded:**

Plan line 471:
```ts
if (item.key === "people") return false;  // hardcoded HIDE per nwrp232 OQ #3 path (b)
```
Explicit prohibition at line 497: "Don't change `people` to use `isFeatureEnabled("PEOPLE")`." AC at line 544 confirms: "`people` item dropped via hardcoded `if (item.key === "people") return false;` (NOT via isFeatureEnabled)."

**Task 3 — middleware PEOPLE gate hardcoded:**

Plan lines 676–678:
```ts
if (pathname === "/people" || pathname.startsWith("/people/")) {
  return respond404();
}
```
No `isFeatureEnabled` call — pure pathname check. Explicit prohibition at line 745: "Don't use `isFeatureEnabled("PEOPLE")` for the /people gate — PEOPLE is NOT in the FeatureFlagName union per nwrp232 OQ #3 path (b)."

`/people/clients` coverage: caught by `pathname.startsWith("/people/")` — no special-case carve-out. Confirmed at plan lines 811–812: "PEOPLE hardcoded gate fires for `/people/clients` AND `/people/vendors` (both caught by `pathname.startsWith("/people/")`; no carve-out per D-03 + nwrp232 Disposition 1)."

**Response shape for PEOPLE gate:**
Uses `respond404()` — same helper as all other gates. Since `/people/*` is not an API path, `respond404()` returns the HTML rewrite (404 status + `/_not-found`). Consistent with other UI gates.

**No remaining `isFeatureEnabled("PEOPLE")` calls:**
Grep of `"PEOPLE"` in plan body — all 16 occurrences are: (a) negation guards, (b) "NOT a flag" documentation, (c) automated-verify scripts checking absence. Zero affirmative call-sites.

**Task 2 nav-bar — `isFeatureEnabled` not called for `people`:**
No `isFeatureEnabled("PEOPLE")` call in the action code. The nav-bar filter (line 463–478) uses hardcoded `if (item.key === "people") return false;` after the three flag-driven drops.

**Phase-level AC:**
Plan line 1554: "`! grep -rEn 'isFeatureEnabled\\("PEOPLE"\\)' src/` returns no matches" — explicitly a phase-level mechanical check.

---

## CHECK 3 — Smoke test #3 path correction (W-1 closure): PASS

**Corrected path present:**

Plan line 1346: "Anonymous POST to `${BASE}/api/owner-portal/admin/revoke-token` with dummy JSON body → expect HTTP 404 (NOT 401)."

Plan line 1348 explicitly states the W-1 rationale: "Original smoke #3 posted to `${BASE}/api/owner-portal/admin?id=test` — NOT a real route. Returns 404 regardless of flag (route doesn't exist) so doesn't actually prove the middleware gate fires. The real route is `/api/owner-portal/admin/revoke-token` at `src/app/api/owner-portal/admin/revoke-token/route.ts`; the middleware gate covers it via `pathname.startsWith("/api/owner-portal/")`. POST to this real path + assert 404 (not 401) = proof the middleware gate fires before the handler."

**Old path not referenced:**
`/api/owner-portal/admin?id=test` appears in the plan only in the context of what the WRONG path was (lines 1348, 1416, 1486) — all in "Don't" / rationale sections. No action block instructs the executor to use the old path.

**Assertion correctness verified:**
The route at `src/app/api/owner-portal/admin/revoke-token/route.ts` (read in full): line 83–97 performs CSRF Origin check FIRST, which would return 403 if Origin header is wrong (before the auth check which would return 401). So the response chain for anon POST without correct Origin, with flag OFF, is:
- Middleware fires at line ~210: returns `{ error: "Not found" }` status 404 before route handler runs
- With flag ON: middleware passes through; CSRF check at route line 92 returns 403 (missing Origin); NOT 401

This means the assertion `expect HTTP 404` (not 401) is correct: 404 uniquely proves the middleware gate fires. If the gate were absent, the anon request would get 403 (CSRF fails first, before auth). The smoke assertion distinguishes gate-present from gate-absent with correct evidence.

**AC for smoke #3 in plan (line 1485):**
"Per nwrp232 W-1: smoke #3 uses real route `/api/owner-portal/admin/revoke-token` — proves middleware gate fires BEFORE route handler (404 not 401 when flag off)."

**One minor note (informational, not blocking):** The smoke #3 assertion description in the plan says "NOT 401" (line 1346). The actual distinction is "NOT 403" (which is what CSRF check would return) or any non-404 response. The "not 401" wording is close enough and is accurate in the sense that "404 proves gate fired" — the underlying logic is sound. The smoke script should assert status === 404 specifically.

---

## CHECK 4 — Empty-vs-false consistency unchanged: PASS

**Helper canonical idiom:**
Plan lines 364–365:
```ts
export function isFeatureEnabled(name: FeatureFlagName): boolean {
  return FLAG_ENV_VALUE[name] === "true";
}
```
`=== "true"` — the fail-closed canonical form. Empty string `""` → `!== "true"` → feature OFF. Undefined → `!== "true"` → feature OFF. The W.1 precedent (`use-current-role.ts` lines 61–70) uses `!== "true"`; the helper uses `=== "true"` as the positive return — these are semantically equivalent (helper returns true only when value IS "true"; callers use `isFeatureEnabled()` or `!isFeatureEnabled()`).

**All non-PEOPLE flag read sites use `!isFeatureEnabled(...)`:**
- Nav-bar (Task 2): `!isFeatureEnabled("PIPELINE")`, `!isFeatureEnabled("COMPANY")`, `!isFeatureEnabled("REPORTS")` at lines 468–470 — negate to hide
- Middleware (Task 3): `!isFeatureEnabled("OWNER_PORTAL")`, `!isFeatureEnabled("PIPELINE")`, `!isFeatureEnabled("COMPANY")`, `!isFeatureEnabled("REPORTS")`, `!isFeatureEnabled("PRICE_INTEL_F5")`, `!isFeatureEnabled("FINANCIALS_F1_VIEWS")` at lines 634, 644, 651, 658, 691, 720 — negate to hide
- Section overviews (Task 5): `!isFeatureEnabled("FINANCIALS_F1_VIEWS")`, `!isFeatureEnabled("COMPANY")`, `!isFeatureEnabled("PIPELINE")`, `!isFeatureEnabled("REPORTS")` at lines 1009, 1133, 1163, 1197 — negate to hide

No `=== "false"` or `Boolean(process.env...)` patterns in any action block. The phase-level AC at plan line 1553 explicitly requires `! grep -rEn '=== ?"false"|!process\.env\.NEXT_PUBLIC_FEATURE|Boolean\(process\.env\.NEXT_PUBLIC_FEATURE' src/` returns no matches.

---

## CHECK 5 — Other regressions: PASS

**Reversibility AC still present:**
Plan line 1566: "Reversibility spot-check: flip `NEXT_PUBLIC_FEATURE_PIPELINE` to 'true' in Vercel Preview + redeploy → `/pipeline` returns 200." Task 6 smoke #10 (line 1389–1391) includes a reversibility note with MANUAL status. PEOPLE correctly excluded: line 1391 and line 1567 both state "/people NOT in reversibility — hardcoded per nwrp232 OQ #3 path (b)."

**Fail-closed default AC:**
Plan must_haves.truths line 58: "Fail-closed default: build with NO NEXT_PUBLIC_FEATURE_* env vars set behaves identically to build with all 6 explicitly false (env var absent === '' === 'false' === 'anything-not-true' === OFF)." Present and unchanged.

**Middleware tag posture preservation:**
Plan lines 583–587 in the Task 3 insertion block comment:
```
// Insertion point: AFTER platform-admin block (line 209)
// AND AFTER updateSession (line 141) so Sentry tags (user_id, org_id,
// impersonation_active, platform_admin) are stamped on requests that hit
// these 404s.
```
The current `src/middleware.ts` ends at line 309 with no feature-flag gates (pre-execution state). The plan's insertion instruction at lines 568–579 specifies inserting AFTER the platform-admin closing brace (verified as line 209 in current file) and BEFORE the design-system block comment (verified as line 211). The `updateSession` call at line 141 runs first; Sentry tags are set inside `updateSession`. Gate fires at ~line 210 = after Sentry tags are stamped.

**Middleware tag posture AC (plan line 814):** "Insertion point is AFTER the platform-admin closing brace (line ~209) AND BEFORE the `// Design-system playground gate` comment header (line ~211)." Consistent with current file layout (verified by reading middleware.ts).

**/people/clients no carve-out:**
Plan line 811: "no carve-out per D-03 + nwrp232 Disposition 1." The hardcoded PEOPLE gate is `pathname === "/people" || pathname.startsWith("/people/")` — `/people/clients` is caught by the `startsWith` branch. No special case introduced.

**404 response shape non-disclosure:**
Plan line 1520 (threat model T-ilh-04): "All gated paths return identical HTTP 404 (HTML rewrite for non-API; JSON for API). Path is indistinguishable from any unknown route." The `respond404()` helper uses `NextResponse.rewrite(notFoundUrl, { status: 404 })` — rewrite not redirect, so the URL does not change in the browser. No 3xx response code leaks the route's existence.

**depends_on annotations present (per nwrp232 revision):**
- Task 1: `depends_on="[]"` (no dependencies)
- Task 2: `depends_on="[1]"` (depends on helper)
- Task 3: `depends_on="[1]"` (depends on helper)
- Task 4: `depends_on="[]"` (static removal, no flag dependency)
- Task 5: `depends_on="[1]"` (depends on helper)
- Task 6: `depends_on="[1, 2, 3, 4, 5]"` (depends on all tasks)

All dependency chains are correct. Task 6 (smoke) depends on all output tasks — ensures smoke runs against the complete implementation.

**halt_gate_ceiling updated:**
Plan line 30: `halt_gate_ceiling: 50` and plan line 28 authorization chain: `nwrp231 (plan-review ceiling bump $25→$50)` and `nwrp232 (extends to cover revision cycle)`. Correctly reflects one bump used per Rule 7c.

---

## Summary Table

| Check | Verdict | Key Evidence |
|-------|---------|--------------|
| CHECK 1 — Owner Portal DUAL gate | PASS | Both `/owner/*` and `/api/owner-portal/*` inside `!isFeatureEnabled("OWNER_PORTAL")` block; JSON 404 for API path; not regressed by revision |
| CHECK 2 — PEOPLE hardcoded gate | PASS | PEOPLE absent from FeatureFlagName union (6 members); nav hardcoded `return false`; middleware hardcoded pathname check; people/page.tsx uses `.live` filter only; zero affirmative `isFeatureEnabled("PEOPLE")` calls anywhere |
| CHECK 3 — Smoke #3 path corrected | PASS | Real route `/api/owner-portal/admin/revoke-token` specified; old `?id=test` path appears only in "what not to do" context; 404 assertion correctly proves gate fires before handler |
| CHECK 4 — Empty-vs-false consistency | PASS | `=== "true"` idiom in helper; all callers use `!isFeatureEnabled()`; no `=== "false"` or Boolean coercion patterns |
| CHECK 5 — Other regressions | PASS | Reversibility AC present (PEOPLE excluded); fail-closed AC present; middleware tag preservation intact; /people/clients no carve-out; 404 shape does not leak route existence; depends_on annotations all correct |

**No action items required. Plan is APPROVE for dispatch.**
