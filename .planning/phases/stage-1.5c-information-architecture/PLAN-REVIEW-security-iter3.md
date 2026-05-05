# Security Plan Review — Stage 1.5c iter-3
Reviewer: security (Claude)
Date: 2026-05-04
Scope: iter-3 corrections only — SEC-9 (MEDIUM) + SEC-10 (LOW)

---

## Verdict

**APPROVED — no blocking findings.**

Both SEC-9 and SEC-10 corrections are adequate, with one important
clarification on SEC-9 that must be documented at execute time (see
below). No new security surface was introduced by iter-3.

---

## SEC-9 — Audit viewer Supabase client type

### Source file inspection (performed now, not deferred to execute)

`src/app/admin/platform/audit/page.tsx` uses `createServerClient()`
imported from `@/lib/supabase/server`.

`src/lib/supabase/server.ts` implements `createServerClient()` using
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon key, NOT service-role). It is a
cookie-bearing session client — identical to what a regular authenticated
Server Component uses.

Cross-org reads therefore depend entirely on RLS, not service-role
bypass. `platform_admin_audit` has RLS enabled (migration 00048).
The only SELECT policy is `platform_admin_audit_staff_read`:

```sql
CREATE POLICY "platform_admin_audit_staff_read" ON public.platform_admin_audit
  FOR SELECT USING (app_private.is_platform_admin());
```

There is no `org_id` column on `platform_admin_audit` and no
`org_isolation` RESTRICTIVE policy. The table is not in migration
00049's tenant-table list. The sole read gate is
`app_private.is_platform_admin()`. A non-platform-admin calling
`createServerClient()` against this table receives zero rows because RLS
blocks them at the database layer.

**Summary of actual client posture:**

| Attribute | Value |
|-----------|-------|
| Client builder | `createServerClient()` from `@/lib/supabase/server` |
| Key used | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| RLS active | Yes |
| Cross-org read mechanism | RLS policy `platform_admin_audit_staff_read` via `is_platform_admin()` |
| Service-role bypass | Not used. Not needed for this table. |

Plan 6's iter-2 description states "service-role client per existing
posture" — this is **inaccurate** as a description of the current source
code. The client is anon + RLS, not service-role. The security posture
is sound (RLS gate is correct) but Plan 6's SUMMARY documentation must
accurately record the client type as `createServerClient()` /
anon+cookie, not service-role. Using inaccurate documentation here
creates the exact risk Plan 6's iter-3 amendment was trying to prevent:
future F1 / Wave 1.1-Lite work reading the SUMMARY and believing the
route uses service-role when it does not.

### Assessment of Plan 6 iter-3 verify adequacy

**Step 1 — Inspect source client type:** Adequate. The verify explicitly
requires documenting which client builder is in use. Execute will find
`createServerClient()` as documented above.

**Step 2 — Migrated viewer must preserve identical client type
verbatim:** Adequate. "Same import path, same client builder call, same
query shape" is the right constraint. Since the source uses
`createServerClient()`, the migrated `src/app/platform-admin/audit/page.tsx`
must use the same.

**Step 3 — Cross-org row smoke test:** The smoke test design is
mechanically sound: PM (non-platform-admin) gets redirected by
middleware before reaching the page; platform_admin can read cross-org
rows because `is_platform_admin()` returns true for their session. The
test correctly distinguishes the two principals.

One gap: the smoke test spec says "confirm service-role bypass / RLS
posture preserved." At execute time the executor will find that service-
role is NOT used. The executor must not treat this as a bug — it is
correct. The SUMMARY must state: "Client is `createServerClient()` /
anon+cookie. Cross-org access gated by `platform_admin_audit_staff_read`
RLS policy. No service-role bypass needed for this table."

**SEC-9 resolution status: RESOLVED with required SUMMARY documentation
constraint.** Plan 6 iter-3 amendment is structurally sufficient. The
executor must accurately document the anon client (not service-role) in
Plan 6 SUMMARY.

---

## SEC-10 — Production wrappers tenant-context attributes

### Grep scope adequacy

Plan 3's iter-3 defensive grep is:

```
grep -rE 'data-org-id|data-org-name|data-tenant' \
  src/app/financials/ src/app/jobs/ src/app/owner-portal/ src/app/people/
```

Plan 3 (Wave 2) is the only plan that introduces `data-direction` /
`data-palette` attributes via the `.design-system-scope` wrap template.
These are presentation attributes — they activate CSS custom properties
scoped inside `.design-system-scope`. They carry no tenant identity
information.

**Coverage review against all plans that create production routes:**

| Plan | Routes created | Introduce data-direction/palette? | Introduce tenant attrs? |
|------|---------------|----------------------------------|------------------------|
| Plan 3 | /financials/bills/[id], /financials/pay-apps/[id], /financials/pay-apps/[id]/print, /financials/reconciliation, /jobs/[id]/budget, /jobs/[id]/schedule, /people/vendors, /people/vendors/[id], /jobs/[id]/documents/[documentId], /owner-portal, /owner-portal/pay-apps/[id], /jobs/[id]/mobile-approval | Yes — `data-direction="C" data-palette="B"` | No |
| Plan 4 | /pipeline/*, /financials/* (list pages), /price-intel/*, /people/clients, /people/team, /people/org-chart, /sub-portal/*, /company/*, /reports/* | No — placeholder pages, no .design-system-scope wrap | No |
| Plan 5 | /jobs/[id]/layout.tsx + 16 per-job placeholder tab pages | No — tab layout component, no data- attributes on wrappers | No |
| Plan 6 | /platform-admin/* migration, /admin/* placeholder index | No — platform admin section, no design-system-scope wraps | No |

The grep covers `src/app/financials/`, `src/app/jobs/`,
`src/app/owner-portal/`, and `src/app/people/` — the exact directories
where Plan 3's `.design-system-scope` production wrappers land. Plans 4,
5, and 6 do not use the `.design-system-scope` wrap template on their
new pages and therefore cannot introduce tenant-context attributes
through that path.

**One gap in SEC-10 grep scope:** Plan 4 creates routes under
`src/app/pipeline/`, `src/app/price-intel/`, `src/app/company/`,
`src/app/reports/`, and `src/app/sub-portal/`. These are placeholder
pages with no `.design-system-scope` wrap, so the risk is low. However,
if a placeholder template happens to include a data attribute for any
reason (e.g., a sample layout copied from elsewhere), the current grep
would not catch it. This is LOW risk given placeholder pages contain
static copy only, but for completeness the grep could be extended.
**This does not block execution.** The LOW risk is acceptable at this
stage; Plan 4 placeholder pages have no authentication-bearing logic.

**SEC-10 resolution status: RESOLVED.** Grep covers all routes where
the `.design-system-scope` wrap is applied (Plan 3 scope). The gap for
Plan 4/5/6 routes is LOW risk and does not require a remediation before
execute.

---

## iter-3 new surface review

### Plan 1 — design-system.css root layout import

CSS side-effect import only. No runtime code executed on the server. No
data access. No authentication bypass surface. No tenant information in
CSS custom properties (they are hex values and spacing values). Confirmed
no security implications.

### Plan 3 — `data-direction="C" data-palette="B"` attributes

These are HTML attributes consumed exclusively by CSS attribute selectors
inside `.design-system-scope` in `design-system.css`. They encode a
design direction token ("C" = Site Office) and a palette token ("B" =
palette set B). They contain no user identity, no org identity, no
session information. They are static string literals hardcoded in the
page template. Confirmed no tenant context leaks via these attributes.

### Plan 7 — PATTERNS.md reconciliation

Documentation-only changes. No runtime code, no API routes, no database
access. No security implications.

---

## Open items for Plan 6 executor

1. When inspecting `src/app/admin/platform/audit/page.tsx`: the client
   is `createServerClient()` using the anon key. Document this
   accurately in Plan 6 SUMMARY. Do not describe it as "service-role" —
   that description in the iter-3 amendment text is historically
   inaccurate. The security posture (RLS gate via `is_platform_admin()`)
   is correct and must be preserved verbatim.

2. The migrated `src/app/platform-admin/audit/page.tsx` must import from
   `@/lib/supabase/server` and call `createServerClient()`, not
   `createServiceRoleClient()` from `@/lib/supabase/service`. Swapping
   to service-role would bypass RLS on other tables these helper
   functions touch (profiles, organizations look-ups inside `fetchAudit`
   and `fetchFilterOptions`) and would be a regression.

---

## Findings summary

| ID | Severity | Status | Note |
|----|----------|--------|------|
| SEC-9 | MEDIUM | RESOLVED | Plan 6 iter-3 verify is adequate. Client type is `createServerClient()` / anon+RLS, not service-role. Executor must document accurately in SUMMARY. |
| SEC-10 | LOW | RESOLVED | Grep covers all Plan 3 production wrap routes. Plan 4/5/6 gap is LOW risk acceptable. |
| No new findings | — | — | iter-3 CSS import, data-direction/palette attrs, docs changes: no security surface. |

No blocking findings. Stage 1.5c iter-3 approved from security perspective.
