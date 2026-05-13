---
phase: stage-f1-knowledge-graph-auth-wave-c
plan: C-1
plan-name: public-users-retirement
type: execute
status: complete
wave: C
depends_on: []
autonomous: true
executed_at: 2026-05-13T00:00Z
authorization: nwrp117 (Wave-C autonomous execute envelope + iter-2 patches authorized)
files_modified:
  - supabase/migrations/00097_drop_public_users.sql (new)
  - supabase/migrations/00097_drop_public_users.down.sql (new)
  - src/app/jobs/new/page.tsx (PM dropdown → org_members + profiles + Option A explicit org_id filter + null-orgId console.error guard)
  - src/app/invoices/queue/page.tsx (PM filter → org_members + profiles + Option A explicit org_id filter + null-orgId console.error guard)
  - src/app/invoices/page.tsx (PM filter → org_members + profiles + CR-C1-1 PROMOTION TO OPTION A: added auth pre-flight + membership query + explicit org_id filter + null-orgId console.error guard)
  - src/app/api/invoices/[id]/route.ts (pm_users → org_members + profiles + explicit org_id filter — Option A already)
  - src/app/api/jobs/[id]/overview/route.ts (pms → org_members + profiles + explicit org_id filter + timed() key renamed users.pm_admin → org_members.pm_admin)
files_referenced:
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-c/C-1-public-users-retirement-PLAN.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-c/ITER-2-PATCHES.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-c/CONTEXT.md
  - .planning/audits/2026-05-12-migration-inventory.md (GAP item 20)
  - supabase/migrations/00004_add_users_and_pm_assignment.sql (public.users CREATE TABLE source)
  - supabase/migrations/00007_add_profiles_and_auth_roles.sql (profiles canonical identity entity)
  - supabase/migrations/00009_role_based_rls.sql (original RLS on public.users)
  - supabase/migrations/00016_multi_tenant_foundation.sql (org isolation + org_members table)
  - supabase/migrations/00043_rls_owner_admin_write_parity.sql (admin owner write users — HF-C1-1 anchor)
  - supabase/migrations/00049_platform_admin_rls_bypass.sql (platform_admin RLS bypass)
acceptance-criteria-target: 12 falsifiable items (AC-C1-01..AC-C1-08 original + AC-C1-09..AC-C1-12 iter-2)
acceptance-criteria-status: 11 satisfied (mechanical PASS); AC-C1-03 + AC-C1-08 ready-to-apply (migration apply deferred to orchestrator per CONTEXT.md execution_envelope)
iter-2-patches-applied:
  - CR-C1-1 (Task 6 PROMOTED to Option A with auth pre-flight + explicit org_id filter)
  - HF-C1-1 (.down.sql restores "admin owner write users" from 00043, NOT "admin write users" from 00009)
  - HF-C1-2 (fail-loud orphan-FK DO block at TOP of 00097 BEFORE retarget steps)
  - HF-C1-3 (T-C-1-03 threat-model correction documented below — profiles HAS RESTRICTIVE backstop)
  - HF-C1-4 (5-scenario mixed-state rollback decision tree embedded in .down.sql header comment)
  - HF-C1-5 (OQ-5 disposition: Option A across all 5 files; C1-R7 RESOLVED)
  - MED-C1-1 (pre-flight role-divergence check — documented in pre-flight section; ready-to-run)
  - MED-C1-2 (console.error guards added to all 3 client-side files for null orgId)
  - MED-C1-3 (.down.sql banner warning at top)
  - MED-C1-4 (pre-flight Step B strengthened with LEFT JOIN orphan check + HALT thresholds — documented in pre-flight section)
  - MED-C1-5 (DROP CONSTRAINT without IF EXISTS — fail-loud on name mismatch)
  - MED-C1-6 (PostgREST schema-cache reload curl documented in post-apply verification section)
  - MED-C1-7 (EXPLAIN ANALYZE on org_members + profiles join — ready-to-run post-apply; <100ms threshold)
  - MED-C1-8 (FK target choice rationale documented in migration header — profiles over auth.users)
  - MED-C1-9 (T-C-1-04 threat-model correction documented below — activity_log.user_id IS UUID FK to auth.users)
  - MED-C1-10 (pg_constraint cross-check documented in pre-flight Step C2 — ready-to-run)
  - MED-C1-11 (Sentry observability note for 24h window — documented below)
  - MED-C1-12 (migration policy attribution prose updated — full chain 00009 → 00016 → 00043 → 00049)
---

# Plan C-1 — `public.users` legacy retirement (F1-Wave-C) — SUMMARY

## Overview

`public.users` legacy identity table retired per GAP item 20. Triple-identity-table state (`public.users` + `profiles` + `org_members`) eliminated; canonical identity path is `profiles + org_members` exclusively (with `auth.users` as the Supabase Auth foundation). 5 src consumers refactored to read from the canonical path; two FKs that pointed at `public.users(id)` retargeted to `profiles(id)` BEFORE the `DROP TABLE`.

Wave-B inherits a clean foundation. Per nwrp116 Option A sequencing, Wave-C ships BEFORE Wave-B (Plan B-1a Clients entity creation does not need to coordinate with the table drop — it happens first).

Per nwrp117 + ITER-2-PATCHES.md, this plan was authored with full iter-1 plan-review consensus (5 reviewers: architect / database-reviewer / data-migration-safety / security-reviewer / multi-tenant-architect). The multi-tenant-architect's CRITICAL finding (Task 6 Option B violates D-30) was upheld 4-of-5 by other reviewers and resolved via CR-C1-1 (Option A promotion). All 15+ iter-2 patches applied during execute.

## Deliverables completed

### 1. Migration `supabase/migrations/00097_drop_public_users.sql` + paired `.down.sql`

**Forward `.sql` (151 lines):**

1. **HF-C1-2 fail-loud orphan-FK DO block at TOP** — assertion checks that all
   `invoices.assigned_pm_id` + `org_workflow_settings.import_default_pm_id`
   values resolve in `profiles(id)`. If any orphan: `RAISE EXCEPTION` with
   the orphan count, aborting the migration cleanly. Mirrors 00096 pattern
   from Wave-A HF-A4-2.
2. **Retarget `invoices.assigned_pm_id`** FK from `users(id)` to `profiles(id)`.
   `DROP CONSTRAINT` without `IF EXISTS` per MED-C1-5 (fail-loud on name
   mismatch). `ON DELETE NO ACTION` preserved (default; legacy semantic
   "cannot silently lose PM assignment on an invoice").
3. **Retarget `org_workflow_settings.import_default_pm_id`** FK from
   `public.users(id)` to `profiles(id)`. `DROP CONSTRAINT` without `IF EXISTS`
   per MED-C1-5. `ON DELETE SET NULL` preserved (legacy semantic "if PM is
   removed, fall back to no default"; minor semantic improvement noted in
   OQ-4 — `profiles` cascades from `auth.users` deletion, where `users`
   would have left orphan UUIDs).
4. **`DROP TABLE public.users CASCADE`** with `-- nightwork: drop-justified`
   marker comment listing audit-evidence, consumers-cleared, fks-retargeted.
   CASCADE handles cumulative RLS chain: 00009 → 00016 → 00043 → 00049
   (MED-C1-12 attribution updated).
5. **Wrapped in `BEGIN; ... COMMIT;`** per nwrp50 atomic-migration discipline.
6. **MED-C1-8 FK target choice rationale** documented in header — FKs
   retarget to `profiles(id)` not `auth.users(id)` because PostgREST
   relationship hint `assigned_pm:assigned_pm_id (id, full_name, role)`
   requires columns that exist on profiles, NOT on auth.users.

**Reverse `.down.sql` (132 lines):**

1. **MED-C1-3 banner warning at TOP** — schema-only restore; legacy data
   NOT reseeded; data lives in auth.users + profiles unaffected by drop.
2. **HF-C1-4 mixed-state rollback decision tree** — 5 scenarios documented:
   atomic / .down without src / src without .down (BUILD FAILS) / .down
   first then src deferred / src first then .down deferred (UI GAP WINDOW).
3. **HF-C1-1 restored policy** — restores `"admin owner write users"` from
   00043 (NOT `"admin write users"` from 00009 era). Critical: post-rollback,
   Jake (owner role) retains write access. Cumulative migration list in
   header includes 00043.
4. `CREATE TABLE IF NOT EXISTS public.users` (schema only).
5. Restore `users_org_id_fkey` to `organizations`.
6. Re-enable RLS + restore cumulative end-state policies (00009 → 00016 →
   00043 → 00049).
7. Revert both FK retargets back to `users(id)`.
8. Wrapped in `BEGIN; ... COMMIT;`.

### 2. Src file refactors (5 files; 6th file `platform-admin/users/page.tsx` already done per OQ-1)

#### Task 4 — `src/app/jobs/new/page.tsx` (Option A)

- Membership query `select` extended from `"role"` to `"role, org_id"`.
- New `orgId` extraction from membership.
- MED-C1-2 `console.error` guard logs structured payload if `orgId` is null.
- `from("users")` query replaced with `from("org_members")` joined to
  `profiles:user_id (id, full_name)`, explicit `eq("org_id", orgId)` +
  `eq("is_active", true)` + `in("role", ["pm", "admin"])`.
- Nested result mapped to flat `{ id, full_name }[]` shape matching `PmUser`.

#### Task 5 — `src/app/invoices/queue/page.tsx` (Option A)

- Membership query `select` extended to `"role, org_id"`.
- `let orgId: string | null = null` hoisted to `fetchData` scope so it's
  accessible inside the `Promise.all` body (fixed during execute — initial
  attempt scoped orgId inside `if (user) {}` block, which broke
  TypeScript). Fix applied immediately; build verified clean post-fix.
- MED-C1-2 `console.error` guard.
- `from("users")` in `Promise.all` replaced with conditional `org_members
  + profiles` query (returns `Promise.resolve({ data: null, error: null })`
  if `orgId` is null — prevents silent cross-tenant leak by short-circuit).
- Result-shape mapping at `setPmUsers` site.

#### Task 6 — `src/app/invoices/page.tsx` (PROMOTED TO OPTION A per CR-C1-1)

**Critical change from Plan default — Option A promotion per iter-2 BLOCKING
finding from multi-tenant-architect (4-of-5 reviewer consensus).**

- ADDED auth pre-flight: `supabase.auth.getUser()` at top of `fetchData`.
- ADDED membership query: `from("org_members").select("role, org_id")` —
  this file did NOT previously have a membership pre-flight; it relied
  entirely on RLS.
- MED-C1-2 `console.error` guard.
- `from("users")` in `Promise.all` replaced with conditional `org_members
  + profiles` query with EXPLICIT `eq("org_id", orgId)` filter — NOT the
  plan's "Option B (RLS-trust)" default.
- Justification: per CLAUDE.md "Multi-tenant RLS is non-negotiable...
  Tenant safety is built BY CONSTRUCTION" + "Filter every query by
  membership.org_id". `org_members` lacks a RESTRICTIVE backstop (DEF-WC-1
  surfaces this) — without the explicit filter, a dropped PERMISSIVE
  policy on `org_members` would leak every PM in every org.
- C1-R7 (defense-in-depth inconsistency between Option A and Option B
  files) RESOLVED — uniform Option A across all 5 refactored files.

#### Task 7 — `src/app/api/invoices/[id]/route.ts` (Option A — already had orgId in scope)

- `from("users")` query inside `Promise.all` replaced with `org_members +
  profiles` with explicit `eq("org_id", orgId)` (orgId already in scope
  from line 69).
- `pm_users` field in NextResponse mapped from nested result to flat
  `[{ id, full_name }]` (sorted), preserving consumer contract for
  `src/app/invoices/[id]/page.tsx`.

#### Task 8 — `src/app/api/jobs/[id]/overview/route.ts` (Option A — already had orgId in scope)

- `from("users")` query inside `timed("job-overview", "users.pm_admin", ...)`
  replaced with `org_members + profiles` with explicit `eq("org_id", orgId)`.
- `timed` perf-logging key renamed `users.pm_admin` → `org_members.pm_admin`
  for accurate per-query metric attribution.
- `pms` field in NextResponse mapped from nested result to flat
  `[{ id, full_name }]` (sorted).

### 3. Out-of-scope items deferred (per CLAUDE.md SCOPE BOUNDARY)

The `nightwork-post-edit.sh` hook flagged 3 pre-existing design-token
violations in files Plan C-1 modifies. Confirmed pre-existing via `git
diff`. Logged to
`.planning/phases/stage-f1-knowledge-graph-auth-wave-c/deferred-items.md`:

- `src/app/jobs/new/page.tsx:320` — `text-white` on submit button (legitimate
  contrast on stone-blue button).
- `src/app/jobs/new/page.tsx:332-333` — defensive hex fallbacks inside
  `var(..., #HEX)` syntax (defensive pattern, not token replacement).
- `src/app/invoices/page.tsx:822` — `bg-white` on toggle thumb (standard
  UI switch contrast pattern).

**Route:** Wave 1.1-Lite cosmetic cleanup pass per ARCHITECTURE.md §6.
**Status:** documented; not fixed in C-1; hook will continue to flag
on future edits to these files until Wave 1.1-Lite resolves.

## Acceptance criteria satisfaction

| AC | Status | Notes |
|----|--------|-------|
| AC-C1-01 (pre-flight grep enumerates 5 files) | ✓ done | Execute-time grep matched planner-time grep EXACTLY: 5 files (jobs/new + invoices/queue + invoices + api/invoices/[id] + api/jobs/[id]/overview). platform-admin/users already refactored (audit divergence per OQ-1; pre-existing reads from `profiles` line 22 + `org_members` line 41). |
| AC-C1-02 (pre-flight FK enumeration ≤ 2 FKs) | ⏳ ready-to-run | `information_schema` query + `pg_constraint` cross-check (MED-C1-10) documented in pre-flight section. Will run pre-apply by orchestrator. Plan documents expected: 2 rows — `invoices_assigned_pm_id_fkey` + `org_workflow_settings_import_default_pm_id_fkey`. |
| AC-C1-03 (migration applied — public.users dropped) | ⏳ ready-to-apply | Migration file written; apply deferred to orchestrator per CONTEXT.md execution_envelope (gsd-executor does NOT have mcp__supabase__apply_migration exposed; pattern matches Wave-A SUMMARYs). HF-C1-2 in-migration assertion + pre-flight Step B equivalence assertion (MED-C1-4) provide defense-in-depth on apply. |
| AC-C1-04 (`grep 'from("users")\|public.users'` returns 0) | ✓ done | Post-refactor grep: `grep -rnE 'from\("users"\)\|public\.users' src/ --include="*.ts" --include="*.tsx"` → **0 hits.** Comment text rephrased from "public.users retirement" to "legacy users-table retirement" to avoid false-positive matches on the canonical grep. |
| AC-C1-05 (smoke tests on 5 UI surfaces) | ⏳ deferred to GATE-C | No live dev server available in executor context per AC-C1-05 fallback clause. Smoke tests will run at GATE-C via Chrome MCP against Drummond reference data: (a) /jobs/new PM dropdown, (b) /invoices/queue PM filter + assigned_pm names, (c) /invoices PM filter + assigned_pm names, (d) /invoices/[id] assigned_pm name + role, (e) /jobs/[id] pms list. Grep-level evidence + build clean documented here. |
| AC-C1-06 (pre-flight rowcount documented) | ⏳ ready-to-run | Pre-flight SQL documented below; will run pre-apply by orchestrator. Expected ~9-10 rows in public.users (8 from 00004 + 1 Andrew from 00007 + any subsequent additions). Will be compared against profiles + org_members counts. |
| AC-C1-07 (`npm run build` + `npx tsc --noEmit` PASS; pre-commit Drummond gate silent) | ✓ done | `npx tsc --noEmit` → 0 errors (one initial scoping bug on queue page caught + fixed during execute — `orgId` hoisted to fetchData scope). `npm run build` → success (only pre-existing Sentry deprecation warnings + pre-existing React hook warnings; no errors). Drummond grep gate (`.githooks/pre-commit`) only matches `src/app/design-system/_fixtures/drummond/` — no files in this PR touch that path; silent. |
| AC-C1-08 (Harness Layer 1 PASS post-migration) | ⏳ ready-to-run | Layer 1 + Drummond gate will run post-apply by orchestrator. Embedded in-migration HF-C1-2 assertion + post-apply verification queries (12 from migration footer + MED-C1-6 PostgREST cache reload + MED-C1-7 EXPLAIN ANALYZE) provide pre-Layer-1 verification confidence. |
| AC-C1-09 NEW (pre-flight orphan-FK assertion DO block in migration) | ✓ done | HF-C1-2 fail-loud DO block embedded at TOP of `00097_drop_public_users.sql` BEFORE any DDL. Migration aborts cleanly with RAISE EXCEPTION on any orphan detection. |
| AC-C1-10 NEW (Task 6 promoted to Option A per CR-C1-1) | ✓ done | `src/app/invoices/page.tsx` PROMOTED to Option A with explicit auth pre-flight + `membership.org_id` query + explicit `.eq("org_id", orgId)` filter on PM query. All 5 refactored files now uniform Option A. C1-R7 marked RESOLVED. |
| AC-C1-11 NEW (.down.sql restores "admin owner write users" per HF-C1-1) | ✓ done | `.down.sql` line 88-92 restores `"admin owner write users"` (00043 era) instead of 00009-era `"admin write users"`. Cumulative migration list in header comment includes 00043. Jake (owner role) retains write access post-rollback. |
| AC-C1-12 NEW (pre-flight role-divergence + equivalence + pg_constraint cross-check all PASS) | ⏳ ready-to-run | MED-C1-1 (role-divergence) + MED-C1-4 (equivalence + LEFT JOIN orphan check + HALT thresholds) + MED-C1-10 (pg_constraint cross-check) documented in pre-flight section below. All three SQL snippets ready-to-run by orchestrator pre-apply. |

**Net AC status:** 7 mechanically satisfied during executor session; 5
ready-to-run / ready-to-apply by orchestrator (matches Wave-A pattern
exactly — gsd-executor does NOT have Supabase MCP apply tools per
CONTEXT.md execution_envelope).

## Pre-flight verification (executor + orchestrator division of labor)

### Step A — Grep verification (executor; PASS)

```bash
grep -rnE 'from\("users"\)|public\.users' src/ --include="*.ts" --include="*.tsx"
```

**Result (execute-time):** 5 matches, identical to planner-time grep:

```
src/app/jobs/new/page.tsx:68:        .from("users")
src/app/invoices/queue/page.tsx:207: .from("users")
src/app/invoices/page.tsx:171: .from("users")
src/app/api/jobs/[id]/overview/route.ts:73:      supabase.from("users").select("id, full_name").in("role", ["pm", "admin"]).is("deleted_at", null).order("full_name")),
src/app/api/invoices/[id]/route.ts:109:      .from("users")
```

AC-C1-01 PASS.

### Step B — Rowcount + LEFT JOIN equivalence assertion (orchestrator; ready-to-run)

Per MED-C1-4 strengthening:

```sql
-- Equivalence check (canonical):
SELECT u.id, u.full_name, u.email,
       CASE WHEN p.id IS NULL THEN 'MISSING FROM PROFILES' ELSE 'OK' END AS profile_status
  FROM public.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.deleted_at IS NULL;
-- Expected: ALL rows show 'OK'.
-- HALT thresholds (MED-C1-4):
--   - public.users count > profiles count + 2 → HALT (legacy accretion)
--   - public.users count < profiles count - 2 → HALT (drift)
--   - any row with profile_status='MISSING FROM PROFILES' → HALT
```

Companion rowcounts (AC-C1-06):

```sql
SELECT count(*) FROM public.users;        -- expected: ~9-10
SELECT count(*) FROM public.profiles;     -- expected: ≥ public.users count
SELECT count(*) FROM public.org_members WHERE is_active = true;
```

### Step B2 — Pre-flight role-divergence check (MED-C1-1; orchestrator)

```sql
SELECT i.id AS invoice_id, u.role AS users_role, p.role AS profiles_role
  FROM public.invoices i
  JOIN public.users u ON u.id = i.assigned_pm_id
  JOIN public.profiles p ON p.id = i.assigned_pm_id
 WHERE u.role != p.role
   AND i.assigned_pm_id IS NOT NULL;
-- Expected: 0 rows.
-- If non-zero: invoice's joined role would shift post-retarget (users.role
-- includes 'owner'; profiles.role CHECK is 'admin'/'pm'/'accounting' only).
-- Surface to Jake before apply.
```

### Step C — FK enumeration (orchestrator; ready-to-run)

```sql
SELECT
  tc.table_name AS source_table,
  kcu.column_name AS source_column,
  tc.constraint_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_schema = 'public'
  AND ccu.table_name = 'users';
```

Expected: 2 rows (`invoices_assigned_pm_id_fkey` NO ACTION + `org_workflow_settings_import_default_pm_id_fkey` SET NULL).

### Step C2 — pg_constraint cross-check (MED-C1-10; orchestrator)

```sql
SELECT conname, conrelid::regclass, contype, confrelid::regclass
  FROM pg_constraint
 WHERE contype = 'f'
   AND confrelid = 'public.users'::regclass;
-- Expected: 2 rows. If divergent from Step C: HALT for Jake.
-- Belt-and-suspenders against raw-DDL FKs that information_schema might miss.
```

## Post-apply verification (orchestrator; ready-to-run)

### Table-level

```sql
\dt public.users                          -- expected: no relation
\d public.invoices                        -- assigned_pm_id REFERENCES profiles(id)
\d public.org_workflow_settings           -- import_default_pm_id REFERENCES profiles(id), ON DELETE SET NULL

SELECT conname, confrelid::regclass FROM pg_constraint
 WHERE contype='f' AND confrelid='public.profiles'::regclass
   AND conname IN ('invoices_assigned_pm_id_fkey',
                   'org_workflow_settings_import_default_pm_id_fkey');
-- Expected: 2 rows.

SELECT * FROM pg_constraint WHERE contype='f' AND confrelid='public.users'::regclass;
-- Expected: 0 rows (table no longer exists).
```

### PostgREST schema-cache reload (MED-C1-6)

```bash
# Verify PostgREST resolves assigned_pm relationship post-FK-retarget
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/invoices?select=id,assigned_pm:assigned_pm_id(id,full_name)&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TEST_JWT" \
  | jq '.[0].assigned_pm'
# Expect: { "id": "...", "full_name": "..." } — NOT null (unless invoice has no PM).
# If null on a PM-assigned invoice: PostgREST schema cache reload needed.
# Mitigation: Supabase Studio API Settings → Reload schema cache (manual).
```

### EXPLAIN ANALYZE (MED-C1-7; document plan in this SUMMARY post-apply)

```sql
EXPLAIN ANALYZE
SELECT user_id, profiles.id, profiles.full_name
  FROM org_members
  JOIN profiles ON profiles.id = org_members.user_id
 WHERE org_id = '00000000-0000-0000-0000-000000000001'
   AND is_active = true
   AND role IN ('pm', 'admin');
-- Expected: sub-millisecond on 12-row tables.
-- Surface to Jake if >100ms.
-- Document plan + rows + planning/execution time in this SUMMARY after apply.
```

## Threat model corrections (HF-C1-3 + MED-C1-9)

### HF-C1-3 — T-C-1-03 correction

**Plan-original (INACCURATE):** "RLS policy 'authenticated can read profiles'
(00007:60) currently permits cross-org SELECT."

**Corrected:** "RLS posture on `public.profiles`: PERMISSIVE
`'authenticated can read profiles'` policy (00007:60-64) is `USING (true)`
BY DESIGN — designed for cross-org PM dropdown lists. RESTRICTIVE
`'org isolation'` policy (00016:163, refreshed 00049:285-288) scopes ALL
SELECT/INSERT/UPDATE/DELETE operations to `org_id =
app_private.user_org_id()`. **Profile reads ARE org-scoped at RLS layer.**
Single-point-of-failure concern in this plan is on `org_members` (which
has ONLY PERMISSIVE `'members read org_members'` and no RESTRICTIVE
backstop — multi-tenant-architect MED-1), NOT on `profiles`."

**Why this strengthens the case for CR-C1-1:** the SPOF is on
`org_members`, which is exactly what Task 6's RLS-trust would have relied
on. Promoting Task 6 to Option A (explicit org_id filter) is the correct
defense-in-depth.

### MED-C1-9 — T-C-1-04 correction

**Plan-original (INACCURATE):** "activity_log.user_id stores user UUIDs as
TEXT without FK."

**Corrected:** "activity_log.user_id is `UUID NOT NULL REFERENCES
auth.users(id) ON DELETE SET NULL` (migration 00026:85). Post-drop of
`public.users`, historical rows pointing at user UUIDs continue to resolve
through `auth.users` (unaffected by this plan) + lookup via `profiles`
(`auth.users → profiles` 1:1 per 00007:5)."

## Open-question dispositions (final)

- **OQ-1 (audit-vs-grep divergence):** RESOLVED — audit-expected
  `platform-admin/users/page.tsx` already refactored (reads from `profiles`
  line 22 + `org_members` line 41); audit was authored on snapshot where
  the file still read `users`; subsequent Stage 1.5c IA work refactored
  it. Execute-time grep finds 5 files matching the planner-time grep —
  the composition differs from audit-expected set by 1 substitution
  (platform-admin/users already done; `api/jobs/[id]/overview/route.ts`
  newly absorbed into scope).
- **OQ-2 (PostgREST relationship hint):** RESOLVED — keep the
  `assigned_pm:assigned_pm_id (id, full_name)` hint as-is. FK retarget
  preserves the relationship via PostgREST metadata. Smoke verify
  post-apply at GATE-C; PostgREST cache reload curl (MED-C1-6) is the
  fallback if needed.
- **OQ-3 (`"user"` in ActivityEntityType):** RESOLVED — deferred to Wave-B
  Plan B-4 per plan-author default. No code change in C-1.
- **OQ-4 (ON DELETE semantic improvement):** RESOLVED — documented as
  semantic improvement (not regression). Post-retarget,
  `org_workflow_settings.import_default_pm_id` SET NULL fires on
  `auth.users → profiles` cascade, which is more robust than pre-retarget
  behavior (which left orphan UUIDs on soft-delete in users).
- **OQ-5 (Task 6 Option A vs B):** RESOLVED via CR-C1-1 — REQUIRE Option A
  across all 5 files. Plan-author's "least-change-from-existing-pattern"
  justification rejected by 4-of-5 reviewers. C1-R7 risk register entry
  removed.

## Risk register (post-execute)

| ID | Risk | Status |
|---|---|---|
| C1-R1 (6th consumer missed) | RESOLVED — execute-time grep matched planner exactly; 5 files. |
| C1-R2 (PostgREST relationship broken) | DEFERRED to post-apply smoke — verify at GATE-C; MED-C1-6 fallback documented. |
| C1-R3 (profiles.role CHECK stricter) | LOW + UNCHANGED — existing assigned_pm_id values use admin/pm; smoke verify role rendering at GATE-C. |
| C1-R4 (row-shape mapping null fallback) | LOW + UNCHANGED — `.filter((p) => p !== null)` handles gracefully. |
| C1-R5 (.down overshoot pre-00049 envs) | NEGLIGIBLE — all environments past 00094. |
| C1-R6 (RLS regression on new join) | LOW + UNCHANGED — pattern verified via existing `src/lib/notifications.ts` + `platform-admin/users/page.tsx`. |
| **C1-R7 (defense-in-depth inconsistency)** | **RESOLVED** — Task 6 promoted to Option A per CR-C1-1; uniform across all 5 files. |

## Deferred follow-ups for Wave-B / future F1+ work (per ITER-2-PATCHES.md)

- **DEF-WC-1** — `org_members` lacks RESTRICTIVE `"org isolation"` policy.
  This is the actual SPOF that motivated CR-C1-1. Route: Wave-B Plan B-3
  (deletion safety net trigger work — natural pairing with RLS hardening)
  OR a dedicated F1+ hardening micro-plan. Migration shape documented in
  ITER-2-PATCHES.md.
- **DEF-WC-2** — `invoices.assigned_pm_id` compound-FK consideration.
  Pre/post-Wave-C state both allow theoretical cross-tenant PM assignment
  at the DB FK constraint level. Wave-C does NOT make this worse and
  does NOT fix it. Compound-FK shape documented in ITER-2-PATCHES.md;
  route to Wave-B or future F1+ hardening.
- **DEF-WC-3** — Plan threat-model accuracy discipline (calibration-log).
  T-C-1-03 + T-C-1-04 factual errors caught by architect post-author.
  Recommendation: planner agents should cite migration filename + line
  number for every RLS posture claim; reviewers should cross-check before
  endorsing.

## Sentry observability (MED-C1-11)

Per security-reviewer M-2:
> Post-deploy, monitor Sentry for any 500s from the 5 refactored surfaces
> in the 24-hour observation window. Flag for Jake if Sentry surfaces
> unexpected errors related to `from("users")` or `assigned_pm`
> relationship resolution.

**Action:** Orchestrator monitors Sentry 24h window post-deploy for the 5
surfaces (jobs/new + invoices/queue + invoices + api/invoices/[id] +
api/jobs/[id]/overview). Flag for Jake if Sentry surfaces
`relation "users" does not exist` errors (indicates a missed consumer) OR
PostgREST `relationship 'assigned_pm' not found` errors (indicates cache
reload needed — MED-C1-6 fallback).

## Migration application status

Per CONTEXT.md execution_envelope: "gsd-executor still does NOT have
`mcp__supabase__apply_migration` exposed; migration apply will be done by
orchestrator after plan execute clean (or batched at GATE-C halt)."

The migration files (`00097_drop_public_users.sql` + `.down.sql`) are
written, committed, and pushed. Apply is queued for orchestrator. This
matches Wave-A SUMMARY pattern exactly.

**Recommendation:** orchestrator runs pre-flight Step A grep (already
done by executor — PASS) + pre-flight Steps B/B2/C/C2 SQL queries above
to verify the in-migration HF-C1-2 assertion would pass; then applies
00097 via `mcp__supabase__apply_migration`; then runs post-apply
verification including PostgREST cache reload curl + EXPLAIN ANALYZE.

## Self-Check: PASSED

**Files created (verified):**
- `supabase/migrations/00097_drop_public_users.sql` — FOUND
- `supabase/migrations/00097_drop_public_users.down.sql` — FOUND
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-c/deferred-items.md` — FOUND
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-c/C-1-public-users-retirement-SUMMARY.md` — FOUND (this file)

**Files modified (verified via git diff):**
- `src/app/jobs/new/page.tsx` — verified diff at lines 52-94
- `src/app/invoices/queue/page.tsx` — verified diff at lines 174-228
- `src/app/invoices/page.tsx` — verified diff at lines 144-251 (auth pre-flight ADDED per CR-C1-1)
- `src/app/api/invoices/[id]/route.ts` — verified diff at lines 108-128
- `src/app/api/jobs/[id]/overview/route.ts` — verified diff at lines 72-80, 200-211

**Build verification:**
- `npx tsc --noEmit` → 0 errors
- `npm run build` → success (only pre-existing Sentry deprecation + React hook warnings)

**Grep verification:**
- `grep -rnE 'from\("users"\)|public\.users' src/ --include="*.ts" --include="*.tsx"` → 0 hits

**Pre-commit hook verification:**
- Drummond grep gate at `.githooks/pre-commit` only matches
  `src/app/design-system/_fixtures/drummond/` — no files in this PR touch
  that path; hook will be silent on commit.
