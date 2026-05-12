# AI-LOGIC-CHECK -- stage-1.5c-information-architecture

**Agent:** nightwork-ai-logic-tester  
**Skill:** `.claude/skills/nightwork-ai-logic-checker/SKILL.md`  
**Branch:** `phase/1.5-c-information-architecture`  
**HEAD:** `accb55f`  
**Date:** 2026-05-11  
**Scope filter:** Plans 4 / 5 / 6 / 7 -- IA work (placeholders, sub-nav, route migration, middleware regex extension, canonical-doc updates). Plans 1/2/3 already reviewed in prior cycles; included here only as context for the REAL-LOGIC re-mount provenance.

---

## Verdict

**PASS** with three **NOTE**-level latent edge cases worth tracking for F1 / Wave 1.1.

No BLOCKING findings. No WARNING findings. No new financial math, no new state machines, no new aggregations. The REAL-LOGIC re-mounts preserve the source logic verbatim except for the documented intentional deltas (path/import/redirect-destination).

---

## Surface inventory

| Surface | Risk class | Outcome |
|---|---|---|
| `src/components/nav/per-job-tabs.tsx` | Stateless presentation -- string equality on pathname; mobile vs desktop branching | PASS (one NOTE) |
| `src/app/jobs/[id]/layout.tsx` | Hardcoded phase=active flagged for F2 externalisation per CLAUDE.md Org-configurable | PASS -- explicit W-8 note in code |
| `src/middleware.ts` regex extension | Auth gate matching; must gate BOTH /admin/platform/* AND /platform-admin/* identically | PASS |
| `src/app/admin/{users,cost-codes,billing}/page.tsx` | REAL-LOGIC re-mounts (NOT thin export-default-from wrappers -- re-implementations that import shared client components + types) | PASS -- diffs minimal and intentional |
| `src/app/platform-admin/**/page.tsx` (12 files) | REAL-LOGIC migrations from /admin/platform/** | PASS -- diffs are link-only (audit verified) |
| `src/app/admin/{roles,permissions,org-chart,...}/page.tsx` | Pure placeholders | PASS -- no logic |
| Placeholders in pipeline/price-intel/company/reports/people/sub-portal/jobs sub-pages | Pure placeholders | PASS -- no logic |

---

## Section 1 -- PerJobTabs (src/components/nav/per-job-tabs.tsx)

### Forward reasoning -- six concrete inputs

The active-tab matcher is exact-equality: pathname === `/jobs/JOBID/PATH` (using template literal). The More-active matcher is pathname.startsWith(`/jobs/JOBID/`) minus a primary-tab exact match.

**Input A (Overview / happy path):** jobId=`job-abc`, pathname=`/jobs/job-abc`.
- Expected: Overview tab active, More inactive, mobile button shows Overview.
- Actual: activeTab matches path: empty-string; isMoreActive -- /jobs/job-abc.startsWith(/jobs/job-abc/) returns false (no trailing slash), so isMoreActive=false. activeLabel=Overview.
- Match: YES.

**Input B (primary tab):** pathname=/jobs/job-abc/budget.
- Expected: Budget active, More inactive.
- Actual: exact match -> activeTabKey=budget; primary-tab membership excludes from isMoreActive.
- Match: YES.

**Input C (More item):** pathname=/jobs/job-abc/rfis.
- Expected: no primary active, More active, mobile button shows RFIs.
- Actual: activeTab=undefined; startsWith(/jobs/job-abc/) true and not in primary -> isMoreActive=true. activeLabel=RFIs (found in moreItems).
- Match: YES.

**Input D (different job, similar id prefix):** jobId=job, pathname=/jobs/job-abc/budget.
- Expected: no false-positive cross-job match. This is the substring/prefix trap.
- Actual: pathname.startsWith(/jobs/job/) is false (pathname has /jobs/job-abc/). No false match. activeTab=undefined. isMoreActive=false (correctly returns false because the trailing-slash anchor on the prefix prevents cross-job confusion).
- Match: YES.

**Input E (near-miss /jobs/job-abc-extra):** jobId=job-abc, pathname=/jobs/job-abc-extra/budget.
- Expected: not active on job-abc.
- Actual: pathname.startsWith(/jobs/job-abc/) is false. No false match.
- Match: YES.

**Input F (hypothetical deep sub-route -- currently unused but worth noting):** pathname=/jobs/job-abc/budget/edit.
- Expected (intuitive): Budget tab active (we are inside Budget).
- Actual: activeTab undefined (exact-match fails); isMoreActive=true (startsWith match, not in primary). So the More dropdown lights up, NOT Budget.
- Match: PARTIAL.
- NOTE (severity NOTE): this is a latent edge case. No /jobs/[id]/budget/* sub-routes exist today (verified via find src/app/jobs/[id]/budget); the only nested job routes today are /change-orders/new, /documents/[documentId], /purchase-orders/new, none under primary tabs. If F1 / Wave 2 introduces a sub-route under a primary tab (e.g., /budget/[lineId], /bills/[id], /pay-apps/[drawId]), this matcher will need to be relaxed from exact-equality to a hierarchical match. Recommend tracking in deferred-items.

### Edge-case audit

- Zero values: N/A -- no numeric inputs.
- Negative values: N/A.
- Empty collections: moreItems is never empty (base items + phase items always yield >= 14 items). allTabsAsDropdownItems always >= 20.
- Boundaries: pathname could be empty string from usePathname() during transition; the !!pathname && guard on isMoreActive handles this.
- Concurrent edits: N/A (stateless render).
- Soft-deleted upstream: N/A.
- Revisions: N/A.
- Locked records: N/A.
- Tenant boundary: PASS -- jobId is a non-tenant route param; no org_id / membership props; tenant-blind per CLAUDE.md primitives rule.

### Domain sense check

- A PM landing on /jobs/[id] sees Overview lit up -- matches expectation.
- A PM tapping More then RFIs sees More lit up and RFIs shown as mobile button -- matches expectation.
- Mobile under 768px collapses to a single dropdown with active label -- matches CLAUDE.md PM-on-mobile rule.
- 44px touch target via px-4 py-3 + text height ~= 44-48px -- passes WCAG 2.2 AA per SYSTEM.md section 6.

### State machine

N/A -- stateless presentation.

### Verdict for this surface

**PASS** with one **NOTE** (Input F latent edge case).

---

## Section 2 -- Middleware regex extension (src/middleware.ts:146-167)

### Forward reasoning -- twelve concrete inputs

The gate predicate is:

```
pathname === "/admin/platform" ||
pathname.startsWith("/admin/platform/") ||
pathname === "/platform-admin" ||
pathname.startsWith("/platform-admin/")
```

| # | pathname | Expected | Actual | Match |
|---|---|---|---|---|
| 1 | /admin/platform | gated | exact match line 147 | YES |
| 2 | /admin/platform/audit | gated | startsWith line 148 | YES |
| 3 | /admin/platform/organizations/abc | gated | startsWith line 148 | YES |
| 4 | /platform-admin | gated | exact match line 149 | YES |
| 5 | /platform-admin/audit | gated | startsWith line 150 | YES |
| 6 | /platform-admin/organizations/abc | gated | startsWith line 150 | YES |
| 7 | /admin | NOT gated (regular Admin section) | no clause matches | YES |
| 8 | /admin/users | NOT gated | no clause matches | YES |
| 9 | /admin/billing | NOT gated | no clause matches | YES |
| 10 | /admin/platformer (substring near-miss) | NOT gated | exact false; startsWith requires trailing slash, false | YES |
| 11 | /platform-administration (near-miss) | NOT gated | no clause matches | YES |
| 12 | /admin/platform-other (near-miss) | NOT gated | exact false; startsWith requires /admin/platform/ exactly, false | YES |

**No widening or narrowing.** The regex extension correctly mirrors the /admin/platform/* behaviour at /platform-admin/*.

### Interaction with next.config.mjs 301 redirects

The wildcard redirect /admin/platform/:path* to /platform-admin/:path* (next.config.mjs:133) is server-level and runs before middleware on the redirected request. Sequence:

1. Browser hits /admin/platform/audit.
2. next.config 301 to /platform-admin/audit.
3. Browser follows redirect -- new request to /platform-admin/audit.
4. Middleware runs, evaluates startsWith(/platform-admin/) is true.
5. If !user, redirect to /login?redirect=/platform-admin/audit.
6. If user and !isPlatformAdmin, redirect to /dashboard.
7. If user and isPlatformAdmin, fall through to render.

The middleware ALSO gates the original /admin/platform/* path (lines 147-148) as belt-and-suspenders. If the next.config redirect were ever removed or misconfigured, the middleware would still block unauthorised access. Good defence-in-depth.

### Edge-case audit

- Zero values: N/A.
- Negative values: N/A.
- Empty collections: N/A.
- Boundaries:
  - Pathname /admin/platform (no trailing slash) -- gated via exact match. CORRECT.
  - Pathname /platform-admin (no trailing slash) -- gated via exact match. CORRECT.
- Concurrent edits: N/A (read-only auth gate).
- Soft-deleted upstream: isPlatformAdmin is resolved by updateSession which calls the platform_admins lookup; if the row is soft-deleted (or not present), isPlatformAdmin=false and the user is redirected to /dashboard. CORRECT -- closed-by-default.
- Revisions: N/A.
- Locked records: N/A.
- Tenant boundary: PASS -- platform_admins is cross-tenant by design; this gate is the only mechanism that should permit cross-tenant rendering, and it is held closed by isPlatformAdmin resolution.

### Domain sense check

- A non-staff user (PM, accounting, owner) navigating to /platform-admin/audit from a bookmark or old URL receives a redirect to /dashboard. They never see the gated content. Matches CLAUDE.md Platform admin (cross-tenant) posture.
- Jake / Andrew (seeded platform_admins per migration 00048) hit the page successfully -- confirmed via Plan 6 watchpoint #2 smoke documented in 01.5c-6 SUMMARY.
- An unauthenticated visitor receives a redirect to /login?redirect=/platform-admin/audit so they return to the intended destination post-login. Matches existing /admin/platform/* posture (lines 152-158).

### State machine

N/A -- auth gate, not a workflow state machine.

### Verdict for this surface

**PASS** -- no widening, no narrowing, mirror of existing /admin/platform/* gate is exact.

---

## Section 3 -- REAL-LOGIC re-mount thin-wrapper pattern

### Important calibration: the re-mounts are NOT pure export-default-from wrappers

The task brief described the re-mounts as thin export-default-from wrappers preserving the source logic verbatim. This is imprecise. The actual pattern across the 4 Admin REAL-LOGIC and 13 Platform Admin REAL-LOGIC re-mounts is:

- Admin REAL-LOGIC (/admin/users, /admin/cost-codes, /admin/billing): the data-loading server-component body is copy-paste with three intentional deltas: (a) absolute import paths to the source client component plus exported types, (b) redirect destination updated from /settings/company to /admin per CONTEXT D-22, (c) header comment block added.
- Platform Admin REAL-LOGIC (/platform-admin/audit and 11 siblings): byte-for-byte identical except for hardcoded link href strings that point to the same surfaces under the new prefix (e.g., /admin/platform/audit to /platform-admin/audit).

The grep-diff-zero claim cited in Plan 6 was scoped to the patterns getCurrentMembership, org_id, requireMembership -- those ARE preserved verbatim across all re-mounts.

### Concrete diff inventory (verified against HEAD accb55f)

| Source | Destination | Meaningful diff | Categorisation |
|---|---|---|---|
| src/app/settings/team/page.tsx | src/app/admin/users/page.tsx | 6 substantive: header comment, import paths, type imports re-exported instead of re-declared, redirect dest /settings/company to /admin, function rename TeamPage to UsersPage | All intentional per Plan 6 + D-22 |
| src/app/settings/cost-codes/page.tsx | src/app/admin/cost-codes/page.tsx | 4 substantive: header comment, import paths, type re-import instead of re-declare. Logic IDENTICAL. | All intentional |
| src/app/settings/billing/page.tsx | src/app/admin/billing/page.tsx | Header comment + import path + redirect /settings/company to /admin + one class text-white to text-nw-white-sand + a few internal comment removals. CRLF to LF newline change inflated raw diff to 638 lines; diff -w -B reduces to ~35 meaningful lines. | All intentional. Class change is cosmetic. |
| src/app/admin/platform/audit/page.tsx | src/app/platform-admin/audit/page.tsx | 1 line: Clear link href /admin/platform/audit to /platform-admin/audit | Intentional |
| src/app/admin/platform/organizations/page.tsx | src/app/platform-admin/organizations/page.tsx | 2 lines: link hrefs | Intentional |
| src/app/admin/platform/organizations/[id]/page.tsx | src/app/platform-admin/organizations/[id]/page.tsx | 2 lines: link hrefs | Intentional |
| src/app/admin/platform/users/page.tsx | src/app/platform-admin/users/page.tsx | 2 lines: link hrefs | Intentional |
| src/app/admin/platform/users/[id]/page.tsx | src/app/platform-admin/users/[id]/page.tsx | 3 lines: link hrefs | Intentional |
| src/app/admin/platform/feedback/page.tsx | src/app/platform-admin/feedback/page.tsx | 2 lines: link hrefs | Intentional |
| src/app/admin/platform/feedback/[id]/page.tsx | src/app/platform-admin/feedback/[id]/page.tsx | 1 line: link href | Intentional |
| src/app/admin/platform/support/page.tsx | src/app/platform-admin/support/page.tsx | 2 lines: link hrefs | Intentional |
| src/app/admin/platform/support/[id]/page.tsx | src/app/platform-admin/support/[id]/page.tsx | 1 line: link href | Intentional |
| src/app/admin/platform/items/[id]/page.tsx | src/app/platform-admin/items/[id]/page.tsx | 1 line: link href /admin/platform/items to /platform-admin/cost-intelligence | Intentional per D-20 |
| src/app/admin/platform/cost-intelligence/page.tsx | src/app/platform-admin/cost-intelligence/page.tsx | 3 lines: link hrefs (including tab links) | Intentional |
| src/app/admin/platform/layout.tsx | src/app/platform-admin/layout.tsx | 0 lines: byte-identical | Verbatim |

### Logic preservation verification

For each REAL-LOGIC re-mount I diff-grepped the source-vs-dest for Math.round, formatCents, .reduce, status_history, subscription_status, trial_ends_at. Result: zero diff across every pair. No financial-math, aggregation, or status-transition line drifted in the migration.

### Edge-case audit

- Soft-deleted upstream: /admin/users queries org_members.role and filters by org_id; /admin/cost-codes adds .is(deleted_at, null) -- matches source verbatim. Soft-deleted rows correctly excluded.
- Tenant boundary: all 3 Admin REAL-LOGIC routes call getCurrentMembership() and filter .eq(org_id, membership.org_id). Verbatim from source. The /platform-admin migrations preserve createServerClient() (anon + session + RLS gate via platform_admin_audit_staff_read), NOT service-role -- explicitly verified per Plan 6 SEC-9 note.
- Permission gate: /admin/users rejects PM and accounting (only owner/admin pass) -- verbatim from source. Redirect destination updated /settings/company to /admin -- semantically correct because /admin is the canonical landing per D-22 (and /settings/company would itself redirect back to /admin via next.config, creating a 2-hop redirect chain -- the dest update flattens this to 1 hop).
- Stripe race conditions in billing: the verifyCheckoutSession flow is preserved verbatim. The optimistic-UI org update is unchanged from source. The webhook remains the canonical state update.

### Domain sense check

- Diane (accounting role) navigating to /admin/users is redirected to /admin -- matches source behaviour (was redirected to /settings/company). A PM tapping a billing link from Admin overview lands on /admin/billing and sees the same plan / card / subscription view as before. No visual or functional regression.
- Jake hitting /admin/platform/audit (old bookmark) gets 301 to /platform-admin/audit then renders the same audit table with cross-org rows. Andrew likewise.

### State machine

N/A for these routes -- they are read paths plus existing Stripe-billing actions which are preserved verbatim. No new state transitions.

### Verdict for this surface

PASS. Re-mounts preserve logic verbatim within the documented exceptions (path/import/redirect-dest/cosmetic class). Diff inventory above is the affirmative evidence per the skill rule: Pass requires affirmative evidence.

---

## Section 4 -- src/app/jobs/[id]/layout.tsx hardcoded phase

### Forward reasoning

  const phase: JobPhase = "active";

This is hardcoded for 1.5c. The W-8 deferred-item comment is explicit, and the morePhaseItems() function in per-job-tabs.tsx is wired to read phase from the layout. F2 will replace this with a jobs.phase column read.

### Edge-case audit

- For every job in the system today, this renders the same closeout link (because the predicate phase=closeout OR phase=active is true when phase=active). A job that has FINISHED construction and is in warranty / pre-con would still see the closeout link. This is OK in 1.5c because all per-job tabs except Overview / Schedule / Budget / Selections / Bills / Pay Apps are placeholders -- none of the More items perform real work yet.
- F2 must wire the real phase column AND the phase=warranty / phase=pre_con branches will then become reachable. The W-8 note in code captures this.

### Domain sense check

- A PM viewing a job that has moved to warranty sees Closeout in the More dropdown today. This is wrong domain-wise -- but it is a known placeholder, the More items themselves are also placeholders, and the deferred-items.md tracks W-8.
- NOTE-level (not WARNING) because the surface is placeholder-only.

### Verdict

PASS with NOTE: hardcoded phase is documented and tracked for F2.

---

## Hard-rule audit (per SKILL.md)

- Always reason in cents. N/A -- no new cents math in this phase. Existing cents math at /admin/billing (subscription plan price display) is preserved verbatim from source.
- Always trace the audit log. N/A -- no new state transitions. Existing audit log integration at /platform-admin/audit is verbatim from source (uses createServerClient + RLS; confirmed per SEC-9 note in Plan 6).
- Always check the lock state. N/A -- no new write paths.
- Always ask: would I tell Jake this output is correct? YES on every surface inspected. The PerJobTabs renders the right tab active for every realistic input; the middleware gates /platform-admin/* correctly; the re-mounts preserve logic verbatim.

---

## NOTE-level items to track for F1 / Wave 1.1

1. PerJobTabs deep sub-route active-state. If F1 introduces a sub-route under a primary tab (e.g., /jobs/[id]/budget/[lineId], /jobs/[id]/bills/[id], /jobs/[id]/pay-apps/[drawId]), the current exact-match pathname === /jobs/JOBID/PATH will fail to light up the parent primary tab. The More dropdown will instead light up. Fix: relax to hierarchical match for primary tabs, e.g. pathname === /jobs/JOBID/PATH OR pathname.startsWith(/jobs/JOBID/PATH/). Currently no sub-routes exercise this, so it is latent.

2. Hardcoded phase=active in /jobs/[id]/layout.tsx. Already tracked in code-comment as W-8. F2 must wire jobs.phase column read; without this the closeout / warranty / pre-con visibility logic in morePhaseItems() is dead code.

3. /admin/integrations plan-listed as REAL-LOGIC but rendered as placeholder. /settings/integrations does not exist on disk, so Plan 6 auto-deviated to placeholder per its Rule 3. The Admin overview tile correctly badges it Coming F3 rather than Live. This is faithful to the deviation -- not a bug, but worth flagging that the Plan 6 manifest files_modified list is partially aspirational here.

---

## Cross-references

- nightwork-spec-checker -- pairs with this report; checks did we build what was asked.
- .planning/phases/stage-1.5c-information-architecture/PLAN-REVIEW-security.md and iter2/iter3 -- already covered SEC-1 / SEC-9 (middleware regex + Supabase client type at /platform-admin/audit). This logic-checker confirms those decisions hold in the shipped code.
- 01.5c-6-admin-platform-admin-SUMMARY.md -- documents the watchpoint #2 (sub-route functional) and #3 (auth bypass) smoke results which align with the middleware analysis here.
- deferred-items.md -- should track NOTE #1 above (deep sub-route active-state) if not already.

---

## Final verdict

PASS.

All five required checks from the task brief:

1. No new financial calculations introduced. Verified by grep -- zero matches for Math.round, formatCents, formatDollars, * 100, / 100 in src/app/today/, src/components/nav/. Existing billing math preserved verbatim across /admin/billing.
2. No new status transitions or state machines. Verified -- no status =, no status_history writes, no setStatus calls in any new file outside the verbatim re-mounts.
3. REAL-LOGIC re-mount thin-wrapper pattern does not break original semantics. Verified by line-by-line diff (table in Section 3). All deltas are intentional, documented, and semantically correct.
4. PerJobTabs active-state logic correctly matches the current pathname. Six concrete trace inputs verified; one NOTE (latent deep-sub-route case, not currently exercised).
5. Middleware regex does not accidentally widen or narrow the auth gate. Twelve concrete trace inputs verified; gate posture for /platform-admin/* is exact mirror of /admin/platform/*. Soft-deleted platform_admins row correctly closes gate.

No BLOCKING. No WARNING. Three NOTE-level latent edge cases worth tracking but none affect the shipped behaviour.
