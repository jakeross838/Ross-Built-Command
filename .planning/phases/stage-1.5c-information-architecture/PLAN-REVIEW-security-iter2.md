---
reviewer: security
phase: stage-1.5c-information-architecture
iter: 2
date: 2026-05-04
commit: d767d53
verdict: APPROVE WITH CONDITIONS
blocking: 0
high: 0
medium: 1
low: 1
carry_forward_from_iter1: ALL RESOLVED (SEC-1 BLOCKING → RESOLVED, SEC-2 HIGH → RESOLVED, SEC-3 HIGH → RESOLVED, SEC-4 MEDIUM → DEFERRED WITH CONSTRAINT DOCUMENTED, SEC-5 MEDIUM → RESOLVED, SEC-6/7/8 LOW → RESOLVED)
---

# Security Plan-Review — Stage 1.5c iter-2

## Verdict

**APPROVE WITH CONDITIONS**

Iter-1 BLOCKING SEC-1 is resolved at the plan level. All 5 High/Medium findings from iter-1 are either resolved or deferred with documented constraints. 2 new findings are raised (1 MEDIUM, 1 LOW). No new BLOCKING or HIGH findings.

Conditions before ship (AC-level, not blocking plan execution):
- MEDIUM SEC-9: audit log viewer cross-org posture must be explicitly verified in Plan 6 SUMMARY (not just asserted)
- LOW SEC-10: Plan 3 must include an explicit grep check that `.design-system-scope` containers do not emit `data-org-id` or other tenant-context DOM attributes

---

## Iter-1 Findings — Resolution Status

### SEC-1 BLOCKING: /platform-admin/* middleware gate — RESOLVED

iter-2 disposition: **RESOLVED — FULLY ADDRESSED**

Plan 6 Task 2 locks Option A. The exact proposed middleware extension is present in Plan 6 `<interfaces>` block (lines 279–284) and repeated in the `<action>` Step D block (lines 563–594). The before/after diff is explicit:

BEFORE: `if (pathname === "/admin/platform" || pathname.startsWith("/admin/platform/"))`
AFTER: adds `|| pathname === "/platform-admin" || pathname.startsWith("/platform-admin/")`

The gate preserves the identical `!user → /login redirect` and `!isPlatformAdmin → /dashboard redirect` flow. The extension is:
- Locked as "Option A ONLY" — Option B (page-level check) explicitly rejected in Plan 6 objective
- Referenced in AC-1.5c-6-10 (falsifiable: `grep -c '/platform-admin' src/middleware.ts` returns >=2)
- Verified by auth bypass test (AC-1.5c-6-12): PM session navigating to /platform-admin/audit must redirect, not render

The `depends_on: [1, 3]` in Plan 6's frontmatter ensures Plan 1 (which installs the wildcard redirect) and Plan 3 (which installs the actual page files) are both complete before Plan 6 middleware extension executes. No race window.

SEC-1 is RESOLVED at the plan level. Runtime verification (watchpoint #3) is mandatory before ship.

---

### SEC-2 HIGH: Redirect chain sequencing — RESOLVED

iter-2 disposition: **RESOLVED — SEQUENCING ENFORCED BY WAVE DEPENDENCY**

The concern in iter-1 was that Plan 1's `/admin/platform → /platform-admin` redirects would activate before the SEC-1 middleware gate existed, exposing an unprotected /platform-admin/* tree.

iter-2 resolution: Plan 6 depends on Plan 1 (`depends_on: [1, 3]`) and is in Wave 3 — which only spawns after Plan 1 (Wave 1) completes with a Jake halt-review. The middleware extension (Plan 6 Task 2 Step D) therefore lands in the same plan execution that also mounts the /platform-admin/* page files. The two halves (routes exist + middleware gates them) cannot be separated: they are a single atomic plan. Plan 1's redirects pointing at /platform-admin/* are inert during Wave 1 because /platform-admin/* does not exist yet; by the time Plan 6 creates those files, it also extends the middleware gate in the same task.

This is a valid resolution. The redirect chain cannot be active without the gate, and the gate cannot be skipped without the files being absent.

SEC-2 is RESOLVED.

---

### SEC-3 HIGH: Sub Portal param reflection — RESOLVED

iter-2 disposition: **RESOLVED — GREP VERIFY LOCKED AS AC**

Plan 4 must_haves (line 96) explicitly states: `grep -E 'params\\.token' src/app/sub-portal/magic/[token]/page.tsx src/app/sub-portal/public/[token]/page.tsx` returns 0.

The stub code templates in Plan 4's `<action>` block (lines 588–659) confirm the page components use no `params.token` reference — the route accepts `[token]` as a named segment for URL semantics only, not for rendering. The stub copy includes a comment: "IMPORTANT: this stub does NOT validate or display the [token] param."

AC-1.5c-4-08 is a falsifiable, grep-verified criterion. If any token reflection appears, the halt condition triggers (Plan 4 line 966: "iter-2 mechanical #5 (a) — params.token grep returns >0 in Sub Portal stubs; halt + remove reflection").

SEC-3 is RESOLVED.

---

### SEC-4 MEDIUM: /owner-portal/* role gate — DEFERRED WITH CONSTRAINT DOCUMENTED

iter-2 disposition: **DEFERRED — BUT DOCUMENTED CONSTRAINT SATISFIES CONCERN**

iter-2 confirms: 1.5c mounts /owner-portal/* as thin-wrapper production routes using Caldwell fixtures only. No real auth flow is wired in 1.5c. The concern was that no middleware gate existed for /owner-portal/*.

Plan 7 AC-1.5c-7-14 addresses this by requiring ARCHITECTURE.md to document: "F1 commits to ONE auth path (extending client_portal_access tokens OR introducing owner_view role with RLS) — not both." This constraint is drafted in Plan 7's ARCHITECTURE.md template (lines 399–407), which explicitly states Path A / Path B and "NOT both."

Residual concern: there is still no explicit middleware gate for /owner-portal/* in 1.5c. The plans acknowledge the routes are "gated to authenticated org members (existing middleware posture)" (Plan 3, line 87). This means /owner-portal/* falls under the general authenticated-session gate, not a specific owner/client_portal_access gate. For 1.5c with Caldwell fixture data only, this is acceptable — the route renders Caldwell sample data, not real tenant data.

The condition for F1 is that the F1 implementer reads the ARCHITECTURE.md constraint before wiring real data. This is documentation-deferred, not code-deferred.

SEC-4 is CONDITIONALLY RESOLVED for 1.5c. F1 must not wire real owner data without implementing either Path A or Path B first.

---

### SEC-5 MEDIUM: /admin/billing redirect loop — RESOLVED

iter-2 disposition: **RESOLVED — BOTH HALVES PRESENT IN PLAN 1**

Plan 1's `provides:` frontmatter (line 38) explicitly states: "middleware.ts updates: (a) /admin/billing added to BILLING_ESCAPE_PATHS (per iter-2 mechanical fix #4), (b) billing-gate redirect destination updated from /settings/billing to /admin/billing."

The must_haves truth (line 63) is falsifiable: "/admin/billing added to BILLING_ESCAPE_PATHS (middleware.ts:12-16); billing-gate redirect destination updated from /settings/billing to /admin/billing (no redirect loop after Plan 1's /settings/billing → /admin/billing redirect lands)."

The artifacts entry (line 92) confirms: middleware.ts `provides: "BILLING_ESCAPE_PATHS extended with /admin/billing; gate redirect destination updated to /admin/billing"` and `contains: "/admin/billing"`.

Both the escape-path addition and the gate redirect destination update are encoded as a single atomic Plan 1 change. The loop scenario (expired-trial user → billing gate → /settings/billing → 308 → /admin/billing → billing gate fires → loop) is closed because /admin/billing is in BILLING_ESCAPE_PATHS and the gate now redirects to /admin/billing directly.

SEC-5 is RESOLVED.

---

### SEC-6/7/8 LOW: Privacy gate scope on .planning/architecture/*.md — RESOLVED

iter-2 disposition: **RESOLVED — EXPLICIT GREP STEP LOCKED**

Plan 7 must_haves (line 71) states: "Privacy gate clean across all updated docs (32-token denylist returns 0 hits) — iter-2 security LOW SEC-6/7/8: explicit grep step on .planning/architecture/*.md scope."

Plan 7 AC-1.5c-7-16 is: "Privacy gate clean (32-token denylist returns 0 hits) across all updated docs + src/ — iter-2 security LOW SEC-6/7/8 explicit grep." This is a falsifiable acceptance criterion.

The expanded-scope document notes these .planning/architecture/*.md files are gitignored and not covered by the pre-commit hook grep gate or CI. Plan 7 explicitly covers them with a manual grep step.

The Plan 7 task 1 action block (line 535) reinforces: "Token discipline for all 4 docs: Markdown only; no hardcoded code blocks with hex; no privacy-gate violations (32-token denylist) — iter-2 security LOW SEC-6/7/8 explicit grep step in verify."

SEC-6/7/8 are RESOLVED.

---

## New Findings — iter-2 Scope

### SEC-9 MEDIUM: Audit log viewer cross-org read posture — asserted but not proven in plan

**Component:** Plan 6 / `/platform-admin/audit/page.tsx` (migrated from `/admin/platform/audit/page.tsx`)

**Finding:** The STRIDE entry T-1.5c-6-07 states the audit log query "uses service-role client + isPlatformAdmin gate (preserved per iter-2 mechanical #10)." This is correct as a design claim. However, the mechanical #10 verification in Plan 6 Task 2 relies on a grep diff of `getCurrentMembership|org_id|requireMembership` between the source and migrated file. The issue is that the audit log viewer in `/admin/platform/audit/page.tsx` legitimately does NOT use `getCurrentMembership()` or `org_id` filtering — it uses the service-role client to read cross-org data. The grep diff will return "zero diff" simply because neither file has those patterns, which is correct for a cross-org tool but does not confirm the service-role client is actually in use.

**Risk:** If the source file at `/admin/platform/audit/page.tsx` was implemented without the service-role client (using the org-scoped anon client instead), then the migration silently copies that gap. The existing middleware isPlatformAdmin gate prevents unauthorized access at the route level, but the RLS posture on the underlying query is not verified by the grep diff.

**Recommended fix:** Plan 6 SUMMARY must explicitly document the Supabase client type used in `/platform-admin/audit/page.tsx` — verify it uses `createServiceRoleClient()` (or equivalent), not `createServerClient()` / anon key. The watchpoint #2 functional smoke (each migrated sub-route renders) is necessary but not sufficient for this — the audit log may render correctly while making an org-scoped query that returns only the current session's org rows. Add a cross-org verify step to the Plan 6 SUMMARY checklist: confirm audit log table returns rows from multiple org_ids (not filtered to a single org).

**Severity:** MEDIUM — does not block execution, but must be verified in Plan 6 SUMMARY before ship.

---

### SEC-10 LOW: .design-system-scope outer wrap — DOM tenant-context leak audit needed

**Component:** Plan 3 / all 12 production route thin-wrappers

**Finding:** Decision A wraps each production route's outer container in `.design-system-scope`. This is a CSS scoping class, not a data attribute. However, the plan's verification steps (Plan 3 Task 4 watchpoint #1 visual verification, iter-2 D-19) do not include an explicit check that the wrapper element does not also carry `data-org-id`, `data-org-name`, or similar tenant-context DOM attributes from the layout chain.

The risk vector: Next.js layouts can inject `data-*` attributes on the root element (or layout-level server components can write metadata that bubbles to DOM). If the thin-wrapper pattern introduces any `data-org-id={membership.org_id}` on the `.design-system-scope` div (a common pattern for CSS theming or debugging), that value would be visible in client-side DOM inspection, potentially leaking org context across page views shared via screen capture or developer tools.

The current plan specs do not include a `grep -rn 'data-org-id\|data-tenant\|data-org-name'` across the 12 production route wrappers.

**Recommended fix:** Plan 3's verify block should add: `grep -rE 'data-org-id|data-org-name|data-tenant' src/app/financials/ src/app/jobs/ src/app/owner-portal/ src/app/people/` returns 0 (for the thin-wrapper production route files only). This is a one-line verify addition with no implementation cost.

**Severity:** LOW — the likelihood is low (the plan's `.design-system-scope` wrapper is specified as a plain CSS class with no data attributes), but the absence of an explicit grep check leaves a gap.

---

## New Scope Verification (iter-2 additions)

### Decision B-modified: /platform-admin full migration — audit log viewer cross-org access posture

**Assessment:** The architecture is correct. The `/platform-admin/audit` route is:
1. Blocked at the middleware level to non-platform_admins (SEC-1 fix)
2. Intended to read cross-org audit data (legitimate by design per migration 00048 + CLAUDE.md)
3. Migrated verbatim from `/admin/platform/audit` per iter-2 mechanical #10

The design posture is sound. Flagged as SEC-9 MEDIUM above because execution verification is not complete in the plan spec.

### Decision A: .design-system-scope wrap on production routes

**Assessment:** The CSS class is a styling scope, not a data carrier. Plan 3's STRIDE register (T-1.5c-3-* entries) does not flag DOM leakage. The tenant-blind hook (`grep -c 'org_id\|membership\|vendor_id' src/app/financials/bills/[id]/page.tsx` type checks) guards against tenant context in component props but not DOM attributes on the wrapper div. See SEC-10 LOW above.

### NwPlaceholderCard primitive

**Assessment:** The contract in Plan 1 `<interfaces>` block (line 312) explicitly states: "Tenant-blind primitive — accepts NO org_id / membership / vendor_id props per CLAUDE.md UI rules." The `NwPlaceholderCardProps` interface (lines 302–310) is:
```
eyebrow: string
headline: string
body: string
wave: PlaceholderWave
className?: string
```
No auth or tenant context props. The component imports only from `@/components/nw/*` (Card, Eyebrow, Badge). This is correct. No security concern.

### src/lib/audit/action-labels.ts helper module

**Assessment:** The module contract in Plan 2 STRIDE (T-1.5c-2-04) explicitly states: "action-labels.ts is UI mapping layer; doesn't write or modify audit data." The key_links entry confirms it imports `ActivityEntityType + ActivityAction` as type-only imports from `src/lib/activity-log.ts`. The `provides` tag says "pure function." The module has no Supabase dependency, no getCurrentMembership, no org_id. It is a static lookup table from DB enum values to UI label strings. No security concern.

### /admin/billing fix (SEC-5 follow-through)

**Assessment verified:** Plan 1 encodes both halves of the fix in a single middleware.ts change:
- (a) Add `/admin/billing` to `BILLING_ESCAPE_PATHS`
- (b) Update billing-gate redirect destination from `/settings/billing` to `/admin/billing`

Without (a), the gate would redirect expired-trial users to `/admin/billing` but the gate would immediately re-trigger because `/admin/billing` is not in the escape list. Without (b), (a) is irrelevant. Both are present. Fix is structurally complete.

---

## Summary Table

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| SEC-1 | BLOCKING (iter-1) | /platform-admin/* middleware gate | RESOLVED — Plan 6 Task 2 LOCKS Option A, AC-1.5c-6-10 + AC-1.5c-6-12 verify |
| SEC-2 | HIGH (iter-1) | Redirect chain sequencing | RESOLVED — Plan 6 depends_on [1,3]; Wave 3 executes after Wave 1 halt |
| SEC-3 | HIGH (iter-1) | Sub Portal param reflection | RESOLVED — AC-1.5c-4-08 grep verify locked, halt condition if >0 |
| SEC-4 | MEDIUM (iter-1) | /owner-portal/* role gate | DEFERRED — 1.5c Caldwell-only; F1 constraint documented in ARCHITECTURE.md per AC-1.5c-7-14 |
| SEC-5 | MEDIUM (iter-1) | /admin/billing redirect loop | RESOLVED — Plan 1 adds /admin/billing to BILLING_ESCAPE_PATHS + updates gate destination |
| SEC-6/7/8 | LOW (iter-1) | Privacy gate on .planning/architecture/*.md | RESOLVED — Plan 7 AC-1.5c-7-16 explicit grep step |
| SEC-9 | MEDIUM (NEW) | Audit log viewer cross-org client type not proven by grep diff | CONDITION — Plan 6 SUMMARY must verify service-role client usage + cross-org row confirm |
| SEC-10 | LOW (NEW) | .design-system-scope wrapper DOM tenant-context leak not grep-checked | CONDITION — Plan 3 verify block should add grep for data-org-id on wrapper files |

---

## Conditions for Ship

1. **SEC-9 MEDIUM (Plan 6 SUMMARY):** Before Plan 7 spawns, Plan 6 SUMMARY must include an explicit statement of the Supabase client type in `/platform-admin/audit/page.tsx` (service-role vs anon) and a cross-org verify step (audit log returns rows from multiple org_ids or an explicit note explaining why this is not possible in the test environment). If service-role client is not used, raise a new BLOCKING finding.

2. **SEC-10 LOW (Plan 3 verify):** Plan 3 verify block should add `grep -rE 'data-org-id|data-org-name|data-tenant' src/app/financials/ src/app/jobs/ src/app/owner-portal/ src/app/people/` returns 0 for the wrapper files. This is additive to Plan 3's existing verify — no implementation change needed unless the grep hits.

---

## Standing Rules Compliance (D-051..D-060)

All plans reviewed comply with:
- D-051: getCurrentMembership() called before DB access on all real-logic routes (iter-2 mechanical #10 enforces this)
- D-052: No hardcoded ORG_ID as fallback (no new API routes introduced in 1.5c)
- D-053: expected_updated_at optimistic locking (no new write endpoints in 1.5c)
- D-054..D-060: Design token / UI rules (not security-relevant; confirmed clean per design-pushback reviewer)
