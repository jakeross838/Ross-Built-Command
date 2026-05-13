---
phase: stage-f1-knowledge-graph-auth-wave-d
plan: D-1
plan-name: postgrest-fk-refactor
type: execute
wave: D
depends_on:
  - D-5  # D-078 decision must exist in MASTER-PLAN before code references it (per nwrp121 execution order)
autonomous: true
halt_after: false
threat_model_severity: medium
status: not-started
authored: 2026-05-13
authored_by: gsd-planner (claude-opus-4-7[1m])
authorization: nwrp121 (Wave-D dispatch + Addition 1 + Rule 2 BLOCKING)
requirements: []
source_decisions:
  - "ISSUE 1 (Wave-D EXPANDED-SCOPE) — PostgREST hint `profiles:user_id(...)` returns PGRST200 because no FK exists between org_members.user_id and profiles.id. Confirmed via direct REST API call against current main."
  - "nwrp121 Addition 1 — D-078 decision: user-identity FK convention. Org_members.user_id FK retargets to profiles.id (display embedding); auth.users FKs preserved for ownership/audit/identity columns."
  - "Wave-D EXPANDED-SCOPE Plan D-1 §Plan D-1 — Issue 1 fix scope = migration + 9-site refactor."
  - "Rule 2 (nwrp120 diagnosis) — plan-review iter-1 MUST cite the FK constraint that enables each PostgREST embedding hint."

files_modified:
  - supabase/migrations/00098_add_org_members_profiles_fk.sql
  - supabase/migrations/00098_add_org_members_profiles_fk.down.sql
  - src/app/api/dashboard/route.ts
  - src/app/api/jobs/health/route.ts
  - src/app/settings/workflow/page.tsx
  - src/app/api/invoices/[id]/route.ts
  - src/app/api/jobs/[id]/overview/route.ts
  - src/app/invoices/page.tsx
  - src/app/invoices/queue/page.tsx
  - src/app/jobs/new/page.tsx

files_referenced:
  - supabase/migrations/00007_add_profiles_and_auth_roles.sql:15-22 (profiles.id PK FKs to auth.users(id) ON DELETE CASCADE; canonical identity equivalence per line 5)
  - supabase/migrations/00016_multi_tenant_foundation.sql:93-105 (org_members CREATE TABLE; user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE; UNIQUE(org_id, user_id))
  - supabase/migrations/00016_multi_tenant_foundation.sql:115-119 (initial seed from profiles — every org_members.user_id was once a profiles.id, so the 1:1 invariant holds for all historical rows)
  - supabase/migrations/00094_d035_cleanup.sql (Wave-A migration shape reference — BEGIN/COMMIT, idempotent guards, header documentation, post-apply verification)
  - supabase/migrations/00096_invoice_allocations_org_id.sql:43-62 (fail-loud DO block reference for pre-flight orphan check)
  - supabase/migrations/00097_drop_public_users.sql:65-88 (fail-loud DO block reference — closest pattern: orphan FK enumeration before constraint mutation)
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-a/A-1-d035-cleanup-PLAN.md (Wave-A plan pattern reference)
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-c/C-1-public-users-retirement-PLAN.md (Wave-C plan pattern reference; introduced the malformed hint that this plan corrects)
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md (Wave-D scope + Issue 1 fix definition)
  - CLAUDE.md (Architecture Rules — multi-tenant RLS, FK conventions, never-delete posture)

requires:
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-d/CONTEXT.md (if present)

provides:
  - "Schema: FK constraint org_members_user_id_profiles_fkey exists in pg_constraint with conrelid=public.org_members + confrelid=public.profiles"
  - "PostgREST relationship resolution restored: queries against /rest/v1/org_members with profile:profiles(...) embed return 200 + embedded profile data (NOT PGRST200)"
  - "9 src consumers refactored from broken hint `profiles:user_id (id, full_name)` to correct hint `profile:profiles (id, full_name)`; alias singular to clarify single-row embed"
  - "Consumer destructuring updated: row.profiles → row.profile across all 9 sites where applicable; defensive Array.isArray() handling preserved where the existing helper (pickFirst) makes it cheap"
  - "Wave-D Issue 1 closed; Wave-C runtime regression (post-ship smoke FAIL on PM dropdown empty + activity feed undefined names) resolved"

affects:
  - "Dashboard /api/dashboard (activity feed user-name resolution) — PMs + admins names now render in last-20 activity feed instead of 'Team member' fallback"
  - "Job health /api/jobs/health (jobs-table PM column) — PM names now render instead of empty"
  - "Settings workflow /settings/workflow (default-PM dropdown for bulk import) — list now populates with org PM+admin+owner names"
  - "Invoice detail /api/invoices/[id] (pm_users array) — list populates with org PM+admin names"
  - "Job overview /api/jobs/[id]/overview (pms array + activity-feed nameById) — both arrays populate"
  - "Jobs new /jobs/new (PM dropdown) — populates"
  - "Invoices list /invoices (PM filter dropdown) — populates"
  - "Invoice queue /invoices/queue (PM dropdown) — populates"
  - "No UI-visible behavior change beyond bug-fix: all 9 surfaces gain working PM names where they were previously empty/fallback strings"

sequence:
  before: D-4 (smoke harness verifies D-1 fix on all 9 sites)
  parallel_authoring_ok: true (Wave-D Plans D-1 + D-2 + D-3 + D-4 + D-5 author in parallel per nwrp121)
  parallel_execute_ok: D-2 (Issue 2 thin-wrapper fix touches different files; no overlap)

acceptance-criteria-target: 7 falsifiable items (AC-D1-01..AC-D1-07); see "Acceptance criteria" below

threat_model:
  trust_boundaries:
    - "DB schema change boundary — migration 00098 ADDS a CHECK-style FK constraint to org_members; no DROP, no CASCADE, no data loss. Failure mode: pre-flight DO-block RAISES if any org_members.user_id does NOT resolve in profiles.id (would indicate identity drift since 00007 design)."
    - "PostgREST relationship boundary — alias change `profiles:user_id` → `profile:profiles` changes the JSON response shape from `{ profiles: {...} }` to `{ profile: {...} }`. All 9 consumer destructuring sites MUST be updated atomically with the select() change or runtime errors surface."
    - "FK convention divergence boundary — D-078 codifies that org_members.user_id now has FKs to BOTH auth.users (existing, ON DELETE CASCADE) AND profiles (NEW, NO ACTION). Both must succeed in the same row insert; this is the same posture as invoices.assigned_pm_id post-Wave-C, which already proves the dual-FK pattern works."

  threats:
    - id: T-D-1-01
      category: "D (Denial of Service — migration fails on production due to orphan org_members.user_id values not in profiles)"
      component: "ALTER TABLE org_members ADD CONSTRAINT org_members_user_id_profiles_fkey"
      disposition: "mitigate"
      mitigation: "Pre-flight DO block (Step A in Task 1) RAISES EXCEPTION with row count if any org_members.user_id is NOT IN (SELECT id FROM profiles). Per 00007:5 design, profiles.id === auth.users.id, and org_members.user_id FKs to auth.users with ON DELETE CASCADE — meaning every org_members.user_id value MUST equal an auth.users.id value, and 00016:115-119 seeded org_members from profiles, so the 1:1 invariant holds for historical rows. New org_members rows created post-00016 inherit the same invariant because Supabase Auth signups create both auth.users + profiles atomically via the existing trigger. If the pre-flight DO BLOCK raises, HALT for Jake — orphan indicates identity drift requiring investigation BEFORE FK add."
    - id: T-D-1-02
      category: "T (Tampering — JSON response shape change breaks consumers)"
      component: "9 src/ files; `select()` hint changed from `profiles:user_id (...)` to `profile:profiles (...)`"
      disposition: "mitigate"
      mitigation: "Each of the 9 consumers is refactored in the same plan + same commit as the migration. The alias change `profiles` → `profile` (singular) signals the single-row embed; PostgREST returns an object (not array) when the embed resolves to a single FK target row. Existing defensive Array.isArray() handling at consumer sites is preserved on the new alias (e.g. `Array.isArray(m.profile) ? m.profile[0] : m.profile` continues to work for the corner case where PostgREST may return an array — though in practice the single FK should return a single object). Task 2-10 explicitly diff each consumer; Task 11 grep-verifies 0 hits remain for the old hint. `npm run build` + `npx tsc --noEmit` MUST pass before commit (covers TypeScript-side type tightening for inline anonymous types in queue + invoices)."
    - id: T-D-1-03
      category: "I (Information Disclosure — embedding resolves to wrong row due to FK ambiguity)"
      component: "PostgREST embed resolution for org_members→profiles"
      disposition: "accept"
      mitigation: "After 00098, org_members has TWO FK paths to identity tables: (a) user_id → auth.users(id) [from 00016], (b) user_id → profiles(id) [new, this migration]. The PostgREST hint `profile:profiles (id, full_name)` explicitly names `profiles` as the target table; PostgREST resolves via the FK whose target column matches (profiles.id). No ambiguity at SQL level because PostgREST disambiguates by target-table name in the alias syntax. If a future migration adds a SECOND FK from org_members.user_id to profiles.id (improbable), the hint would become ambiguous and require named-FK syntax — but this is not a concern in 00098 because only one FK to profiles is added."
    - id: T-D-1-04
      category: "R (Repudiation — historical org_members.user_id rows reference auth.users IDs that no longer have profiles)"
      component: "Pre-flight DO block coverage"
      disposition: "mitigate"
      mitigation: "Pre-flight DO block COUNTs orphans BEFORE the ALTER. If profiles row was hard-deleted (which would violate the never-delete rule + the ON DELETE CASCADE on profiles.id → auth.users.id), the org_members.user_id ALSO would have been deleted via the same auth.users CASCADE. In practice: auth.users delete cascades to profiles AND org_members, so orphans cannot exist. If the DO-block surfaces orphans anyway, that signals manual SQL intervention bypassed CASCADE — HALT for Jake to investigate."
    - id: T-D-1-05
      category: "D (Denial of Service — .down.sql leaves FK in place if applied to an environment past 00098)"
      component: "supabase/migrations/00098_add_org_members_profiles_fk.down.sql"
      disposition: "accept"
      mitigation: ".down.sql is a single DROP CONSTRAINT IF EXISTS — idempotent. Risk only materializes if the down is applied to an environment that never applied 00098 (no-op, safe). All Nightwork environments (prod + preview + dev) are well past 00097 (Wave-C applied 2026-05-13); the down is intended for emergency rollback within hours of 00098 apply."

must_haves:
  truths:
    - "After migration 00098 applies, `SELECT conname FROM pg_constraint WHERE conrelid='public.org_members'::regclass AND confrelid='public.profiles'::regclass` returns exactly 1 row with conname=org_members_user_id_profiles_fkey"
    - "After D-1 PR merges, `grep -rnF 'profiles:user_id' src/` returns 0 hits"
    - "After D-1 PR merges, `grep -rnE 'profile:profiles' src/ --include=\"*.ts\" --include=\"*.tsx\"` returns at least 9 hits (one per refactored site; allowing for multi-line select() expressions to span a line)"
    - "REST API call `GET /rest/v1/org_members?select=user_id,profile:profiles(id,full_name)&org_id=eq.<RB_org_id>&is_active=eq.true` returns HTTP 200 with each row containing a `profile` object with `id` + `full_name` populated (NOT PGRST200; NOT empty profile)"
    - "Dashboard /api/dashboard activity feed shows actual user names (e.g. 'Jake Ross', 'Andrew Ross', 'Diane') in the user_name field of activity entries instead of 'Team member' fallback for known PM/admin users"
    - "Job-overview /api/jobs/[id]/overview returns pms array with at least 1 entry { id, full_name } populated when called against a Drummond-like job in an org with PMs"
    - "Invoice detail /api/invoices/[id] returns pm_users array with at least 1 entry { id, full_name } populated"
    - "Workflow settings /settings/workflow PM dropdown lists the org's PM+admin+owner names (verified against Drummond reference data: at least 8 internal-team rows)"
    - "Invoice queue /invoices/queue PM filter dropdown populates with the org's PM+admin names"
    - "Invoices list /invoices PM filter dropdown populates with the org's PM+admin names"
    - "Jobs new /jobs/new PM dropdown populates with the org's PM+admin names"
    - "Job-health /api/jobs/health response includes pm_name populated for jobs that have a pm_id pointing at a valid profile (replaces the 'no name available' fallback observed pre-D-1)"
    - "`npm run build` passes with zero TypeScript errors"
    - "`npx tsc --noEmit` passes"
    - "Drummond grep gate (.githooks/pre-commit) silent on the committed diff"
    - "Harness Layer 1 (DB integrity + RLS coverage) PASS post-migration — no advisor flag re: redundant or conflicting FK on org_members.user_id"

  artifacts:
    - path: "supabase/migrations/00098_add_org_members_profiles_fk.sql"
      provides: "Forward DDL: pre-flight orphan check + ADD CONSTRAINT org_members_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES profiles(id)"
      contains: "ALTER TABLE public.org_members"
      contains_also: "REFERENCES public.profiles(id)"

    - path: "supabase/migrations/00098_add_org_members_profiles_fk.down.sql"
      provides: "Reverse DDL: DROP CONSTRAINT IF EXISTS org_members_user_id_profiles_fkey"
      contains: "DROP CONSTRAINT IF EXISTS org_members_user_id_profiles_fkey"

    - path: "src/app/api/dashboard/route.ts"
      provides: "Activity-feed pre-fetch uses profile:profiles (id, full_name) hint resolving via 00098 FK; userNameMap built from raw.profile (singular) not raw.profiles"
      not_contains: "profiles:user_id"
      contains: "profile:profiles"

    - path: "src/app/api/jobs/health/route.ts"
      provides: "PM name pre-fetch uses profile:profiles (id, full_name) hint; pmNameMap built from raw.profile"
      not_contains: "profiles:user_id"
      contains: "profile:profiles"

    - path: "src/app/settings/workflow/page.tsx"
      provides: "Default-PM list query uses profile:profiles (id, full_name) hint; pms mapping destructures from rec.profile"
      not_contains: "profiles:user_id"
      contains: "profile:profiles"

    - path: "src/app/api/invoices/[id]/route.ts"
      provides: "pm_users array sourced via profile:profiles (id, full_name) hint; destructuring updated to m.profile"
      not_contains: "profiles:user_id"
      contains: "profile:profiles"

    - path: "src/app/api/jobs/[id]/overview/route.ts"
      provides: "Two query sites (pms list at line 77; activity-feed pre-fetch at line 117) use profile:profiles (id, full_name) hint; nameById + pms mapping destructure from raw.profile + m.profile respectively"
      not_contains: "profiles:user_id"
      contains: "profile:profiles"

    - path: "src/app/invoices/page.tsx"
      provides: "PM filter dropdown query uses profile:profiles (id, full_name) hint; pms mapping destructures from m.profile"
      not_contains: "profiles:user_id"
      contains: "profile:profiles"

    - path: "src/app/invoices/queue/page.tsx"
      provides: "PM filter dropdown query uses profile:profiles (id, full_name) hint; pms mapping destructures from m.profile"
      not_contains: "profiles:user_id"
      contains: "profile:profiles"

    - path: "src/app/jobs/new/page.tsx"
      provides: "PM dropdown query uses profile:profiles (id, full_name) hint; pms mapping destructures from m.profile"
      not_contains: "profiles:user_id"
      contains: "profile:profiles"

  key_links:
    - from: "supabase/migrations/00098_add_org_members_profiles_fk.sql"
      to: "public.org_members.user_id → public.profiles.id FK"
      via: "ALTER TABLE ADD CONSTRAINT org_members_user_id_profiles_fkey FOREIGN KEY ... REFERENCES"
      pattern: "REFERENCES public\\.profiles\\(id\\)"

    - from: "src/app/api/dashboard/route.ts line 159 (activity-feed pre-fetch)"
      to: "org_members.user_id_profiles_fkey FK (created in 00098)"
      via: "supabase.from('org_members').select('user_id, profile:profiles (id, full_name)')"
      pattern: "profile:profiles \\(id, full_name\\)"

    - from: "src/app/api/jobs/health/route.ts line 113 (PM name pre-fetch)"
      to: "org_members.user_id_profiles_fkey FK (created in 00098)"
      via: "supabase.from('org_members').select('user_id, profile:profiles (id, full_name)')"
      pattern: "profile:profiles \\(id, full_name\\)"

    - from: "src/app/settings/workflow/page.tsx line 22 (default-PM list)"
      to: "org_members.user_id_profiles_fkey FK (created in 00098)"
      via: "supabase.from('org_members').select('user_id, profile:profiles (id, full_name)')"
      pattern: "profile:profiles \\(id, full_name\\)"

    - from: "src/app/api/invoices/[id]/route.ts line 113 (pm_users array)"
      to: "org_members.user_id_profiles_fkey FK (created in 00098)"
      via: "supabase.from('org_members').select('user_id, profile:profiles (id, full_name)')"
      pattern: "profile:profiles \\(id, full_name\\)"

    - from: "src/app/api/jobs/[id]/overview/route.ts line 77 (pms list)"
      to: "org_members.user_id_profiles_fkey FK (created in 00098)"
      via: "supabase.from('org_members').select('user_id, profile:profiles (id, full_name)')"
      pattern: "profile:profiles \\(id, full_name\\)"

    - from: "src/app/api/jobs/[id]/overview/route.ts line 117 (activity-feed pre-fetch)"
      to: "org_members.user_id_profiles_fkey FK (created in 00098)"
      via: "supabase.from('org_members').select('user_id, profile:profiles (id, full_name)')"
      pattern: "profile:profiles \\(id, full_name\\)"

    - from: "src/app/invoices/page.tsx line 204 (PM filter dropdown)"
      to: "org_members.user_id_profiles_fkey FK (created in 00098)"
      via: "supabase.from('org_members').select('user_id, profile:profiles (id, full_name)')"
      pattern: "profile:profiles \\(id, full_name\\)"

    - from: "src/app/invoices/queue/page.tsx line 220 (PM filter dropdown)"
      to: "org_members.user_id_profiles_fkey FK (created in 00098)"
      via: "supabase.from('org_members').select('user_id, profile:profiles (id, full_name)')"
      pattern: "profile:profiles \\(id, full_name\\)"

    - from: "src/app/jobs/new/page.tsx line 80 (PM dropdown)"
      to: "org_members.user_id_profiles_fkey FK (created in 00098)"
      via: "supabase.from('org_members').select('user_id, profile:profiles (id, full_name)')"
      pattern: "profile:profiles \\(id, full_name\\)"
---

# D-1 — PostgREST FK resolution: add org_members→profiles FK + refactor 9 hint sites

## Goal

Fix Wave-D Issue 1: PostgREST `profiles:user_id (id, full_name)` hint returns **PGRST200** on every query (confirmed via direct REST API call against current main) because no FK exists between `org_members.user_id` and `profiles.id`. PostgREST resolves embed hints via FK metadata in `pg_constraint`; it interprets `profiles:user_id` as "embed table named `user_id` aliased as `profiles`" — but there is no `user_id` table, hence the error.

**Root cause:** Both `org_members.user_id` and `profiles.id` independently FK to `auth.users(id)` (per 00007:16 + 00016:96), but no direct FK between them. PostgREST does not follow transitive FK chains.

**Resolution (per D-078 / nwrp121 Addition 1):**

1. **Migration 00098** — Add direct FK `org_members.user_id → profiles.id` (data-safe because `profiles.id === auth.users.id === org_members.user_id` per 00007:5 design + 00016 seed origin; pre-flight DO block fails loud if any drift exists).
2. **Refactor 9 src consumer sites** — Change hint from `profiles:user_id (id, full_name)` to `profile:profiles (id, full_name)`. The alias becomes `profile` (singular) to match PostgREST's single-row embed contract; consumer destructuring updated from `row.profiles` to `row.profile` where applicable.

After this plan ships, all 9 surfaces (3 pre-existing latent-broken + 6 Wave-C-touched) render real user names where they previously showed empty dropdowns or fallback strings like `"Team member"`.

## Source decisions (verbatim from authoritative sources)

> **Wave-D EXPANDED-SCOPE Plan D-1:**
>
> - Migration: `ALTER TABLE org_members ADD CONSTRAINT org_members_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES profiles(id)` (data-safe: profiles.id === auth.users.id === org_members.user_id 1:1 invariant)
> - Refactor 9 sites from broken `profiles:user_id(id, full_name)` to `profile:profiles(id, full_name)`:
>   - 6 Wave-C-touched: `invoices/page.tsx:204`, `invoices/queue/page.tsx:220`, `jobs/new/page.tsx:80`, `api/invoices/[id]/route.ts:113`, `api/jobs/[id]/overview/route.ts:77+117`
>   - 3 pre-existing latent-broken: `api/dashboard/route.ts:159`, `api/jobs/health/route.ts:113`, `settings/workflow/page.tsx:22`
> - Plan-review iter-1 MUST cite FK constraint per Rule 2
>
> (`.planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md` §Plan D-1 lines 28-33)

> **nwrp121 Addition 1 (D-078 decision):**
>
> Going-forward convention: NEW user-identity FKs default to `auth.users` UNLESS the column is used in PostgREST embedding hints for display, in which case `profiles`. Document the column explicitly when choosing profiles.
>
> (`.planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md` lines 55-61)

> **Rule 2 (nwrp120 diagnosis):**
>
> For any plan that introduces or modifies a PostgREST embedding hint, the plan body MUST cite the FK constraint that enables that hint (constraint name + migration filename + line range). Plan-review iter-1 verifies the citation against the actual migration text. Missing or incorrect citation is BLOCKING.

---

## Pre-flight grep (REQUIRED at execute start)

Executor MUST run BEFORE editing any file:

```bash
grep -rnF 'profiles:user_id' src/
```

**Planner-time grep result (2026-05-13, against current main):**

```
src/app/settings/workflow/page.tsx:22:      .select("user_id, profiles:user_id (id, full_name)")
src/app/api/dashboard/route.ts:159:        .select("user_id, profiles:user_id (id, full_name)")
src/app/api/invoices/[id]/route.ts:113:      .select("user_id, profiles:user_id (id, full_name)")
src/app/api/jobs/[id]/overview/route.ts:77:        .select("user_id, profiles:user_id (id, full_name)")
src/app/api/jobs/[id]/overview/route.ts:117:        .select("user_id, profiles:user_id (id, full_name)")
src/app/jobs/new/page.tsx:80:        .select("user_id, profiles:user_id (id, full_name)")
src/app/api/jobs/health/route.ts:113:        .select("user_id, profiles:user_id (id, full_name)")
src/app/invoices/queue/page.tsx:220: .select("user_id, profiles:user_id (id, full_name)")
src/app/invoices/page.tsx:204: .select("user_id, profiles:user_id (id, full_name)")
```

**Result: 9 hit sites — matches Wave-D EXPANDED-SCOPE §Plan D-1 exactly.**

| File | Line | Wave classification | Consumer destructure |
|---|---|---|---|
| `src/app/api/dashboard/route.ts` | 159 | Pre-existing latent-broken | `raw.profiles` via pickFirst (line 424) |
| `src/app/api/jobs/health/route.ts` | 113 | Pre-existing latent-broken | `raw.profiles` inline (line 128) |
| `src/app/settings/workflow/page.tsx` | 22 | Pre-existing latent-broken | `rec.profiles` inline (line 32) |
| `src/app/api/invoices/[id]/route.ts` | 113 | Wave-C-touched | `m.profiles` inline (line 157) |
| `src/app/api/jobs/[id]/overview/route.ts` | 77 (pms) | Wave-C-touched | `m.profiles` inline (line 206) |
| `src/app/api/jobs/[id]/overview/route.ts` | 117 (activity-feed nameById) | Wave-C-touched | `raw.profiles` inline (line 161) |
| `src/app/invoices/page.tsx` | 204 | Wave-C-touched (CR-C1-1 Option A) | `m.profiles` inline (line 242) |
| `src/app/invoices/queue/page.tsx` | 220 | Wave-C-touched | `m.profiles` inline (line 254) |
| `src/app/jobs/new/page.tsx` | 80 | Wave-C-touched | `m.profiles` inline (line 86) |

If the grep at execute time differs from this 9-site set:
- **More than 9 hits** → HALT for Jake (newer code introduced more broken hints)
- **Fewer than 9 hits** → proceed with actual matches; document in SUMMARY.md which were already fixed

---

## Pre-flight FK enumeration (REQUIRED at execute start)

Executor MUST run BEFORE applying migration:

```sql
-- Confirm starting state: zero FKs from org_members → profiles
SELECT
  tc.constraint_name,
  kcu.column_name AS source_column,
  ccu.table_name AS target_table,
  ccu.column_name AS target_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'org_members';
```

**Expected output (1 row — the existing auth.users FK):**

```
constraint_name           | source_column | target_table | target_column
--------------------------+---------------+--------------+--------------
org_members_user_id_fkey  | user_id       | users        | id
```

(Note: `target_table` shows `users` because Postgres resolves `auth.users` as just `users` in this view when `target_schema=auth`. The FK was created in 00016:96 against `auth.users(id) ON DELETE CASCADE`. Confirm `confrelid::regclass` returns `auth.users` if querying `pg_constraint` directly.)

If a SECOND FK already exists from `org_members.user_id` to ANY profiles-like target, HALT for Jake — duplicate FK would make the migration a no-op at best, conflict at worst.

---

## Scope inclusions

1. **SQL migration `00098_add_org_members_profiles_fk.sql`** that:
   - Pre-flight DO block enumerates orphans (`org_members.user_id NOT IN (SELECT id FROM profiles)`); RAISES EXCEPTION if any exist
   - Adds FK constraint `org_members_user_id_profiles_fkey` FOREIGN KEY (user_id) REFERENCES public.profiles(id)
   - No ON DELETE clause — defaults to NO ACTION (acceptable: profiles.id deletion already cascades from auth.users.id; org_members.user_id ALSO cascades from auth.users.id; the NO ACTION on this new FK means "cannot delete a profile while org_members rows reference it", which is correct semantic because the underlying auth.users CASCADE would already have removed the org_members row first if the user is deleted)
2. **Reverse migration `00098_add_org_members_profiles_fk.down.sql`** that:
   - Single DROP CONSTRAINT IF EXISTS — idempotent, schema-only revert
3. **9 src file refactors:**
   - Change `select(...)` hint from `profiles:user_id (id, full_name)` → `profile:profiles (id, full_name)`
   - Update consumer destructuring from `row.profiles` → `row.profile` where applicable (preserving defensive `Array.isArray()` handling on the new alias)
   - Update inline TypeScript types where they reference the old shape (e.g. `Array<{ user_id: string; profiles: ... }>` → `Array<{ user_id: string; profile: ... }>`)
4. **Smoke verification:** REST API call against retargeted hint returns 200 + populated `profile` object (NOT PGRST200).
5. **`npm run build` + `npx tsc --noEmit`** pass after all 9 refactors.

## Scope exclusions

- **No CLAUDE.md update.** D-5 codifies the D-078 FK convention in MASTER-PLAN.md; CLAUDE.md remains unchanged. (Wave-D EXPANDED-SCOPE §Plan D-5 is the doc-update channel.)
- **No data migration / backfill.** Migration adds a constraint only; existing rows are unchanged. Pre-flight DO-block verifies 1:1 invariant.
- **No `profiles` or `auth.users` schema changes.** FK target column `profiles.id` already exists from 00007:16.
- **No `org_members` row-level changes.** Constraint add does not modify any existing org_members row; only the `pg_constraint` system catalog gains an entry.
- **No PostgREST schema cache reload work.** Supabase auto-reloads the PostgREST schema cache on DDL changes via `pg_notify('pgrst', 'reload schema')` triggers (or manual `NOTIFY` if needed). Migration applies cleanly; the schema cache reload is operational, not migration content.
- **No `activity_log.user_id` change.** That column is TEXT without FK and unrelated to PostgREST embed resolution.
- **No `jobs.pm_id` rework.** Column has no FK and is unaffected.
- **No Issue 2 (AppShell double-wrap) fix.** Plan D-2 territory; independent refactor scope, parallel execute.

---

## Migration design rationale

### Why add the FK at all (vs. switching consumers to a different query pattern)

Three viable approaches were considered:

1. **Add FK + use named embed hint** (THIS PLAN) — minimal-blast, preserves existing query shape, restores PostgREST relationship resolution.
2. **Drop the embed and do 2-step query** — fetch org_members rows, then `IN (user_id, user_id, ...)` query against profiles. Costs extra round-trip; 9 sites means 9 query patterns to rewrite + maintain. Rejected.
3. **Use the existing auth.users FK** — `org_members.user_id → auth.users(id) → profiles.id (PK)` is a transitive chain. PostgREST does NOT follow transitive FKs. Cannot embed profiles through auth.users. Rejected.

Approach 1 is the smallest viable surgical fix; D-078 codifies the convention going-forward.

### Why `profile:profiles` (singular alias) instead of preserving `profiles:user_id`

The malformed hint `profiles:user_id` uses PostgREST's column-disambiguation syntax (`<alias>:<source_column>`), which is meant to disambiguate when multiple FKs from the same source table point at the same target. It interprets `user_id` as a TABLE NAME (because that's where column-disambiguation looks for ambiguous joins), and since there's no `user_id` table, returns PGRST200.

The correct syntax for an unambiguous FK relationship is `<alias>:<target_table>` (e.g. `profile:profiles`). The alias becomes `profile` (singular) because PostgREST returns a SINGLE object for a single-FK relationship (not an array of profiles), and the singular naming clarifies the contract.

**Consumer-side implication:** Existing destructuring code that does `Array.isArray(row.profiles) ? row.profiles[0] : row.profiles` (a defensive pattern from when the hint shape was unclear) continues to work on the new alias — but the more idiomatic post-fix code is just `row.profile`. Both patterns are accepted in the refactor (Tasks 4-12); the choice is per-site based on minimal-diff preference. The acceptance criteria pin on `profile:profiles` appearing + `profiles:user_id` not appearing — not on whether the destructure uses Array.isArray.

### Why NO ACTION on the new FK (not CASCADE)

The existing org_members.user_id FK to auth.users(id) is `ON DELETE CASCADE` — when an auth user is deleted, the org_members row is also deleted. The new org_members.user_id FK to profiles(id) gets NO ACTION (default).

Semantic: profiles.id is itself ON DELETE CASCADE from auth.users.id (00007:16). So:
- Delete auth.users row → profiles row deleted (CASCADE) AND org_members row deleted (CASCADE from auth.users FK).
- The new FK to profiles is never triggered in this chain because both child rows go away together.
- The NO ACTION on the new FK serves as a defensive guard: a hand-crafted SQL deletion of a profiles row WITHOUT the matching auth.users deletion would be blocked by the new FK (because the org_members row would have an orphan reference). This matches the never-delete posture.

CASCADE on the new FK would be redundant + would allow profile-only deletion to silently remove org_members rows — incorrect semantic.

### Why migration 00098 is data-safe (1:1 invariant proof)

For every org_members row created via Supabase Auth signup:
1. `auth.users` row created first (by Supabase Auth).
2. `profiles` trigger fires (from 00007:42-58 era; trigger creates profile row with `id = NEW.id` from auth.users).
3. `org_members` row created (via app code or invitation flow) with `user_id = profiles.id = auth.users.id`.

For historical org_members rows (pre-00016 era, seeded in 00016:115-119):
- Seeded from `profiles` directly: `INSERT INTO org_members ... SELECT '00000000-...', p.id, ... FROM profiles p`.
- Every seeded org_members.user_id is a profiles.id by construction.

The only way an org_members row could exist with `user_id NOT IN profiles.id` is:
- Hand-crafted SQL insert bypassing the trigger AND the seed pattern — anomalous; pre-flight DO block detects.

The DO block at the top of 00098 is fail-loud belt + suspenders: it should never raise in practice, but if it does, that signals identity drift requiring investigation.

---

## Implementation tasks

### Task 1 — Pre-flight verification (REQUIRED before any edits)

**Path:** N/A (verification only)

**Action:** Executor MUST complete all steps before editing files.

**Step A — Grep verification:**

```bash
grep -rnF 'profiles:user_id' src/
```

Expected: 9 hits matching the planner-time table above. If different, HALT.

**Step B — FK enumeration on org_members:**

Run the SQL from "Pre-flight FK enumeration" section above. Expected: 1 row showing the existing `org_members_user_id_fkey` → `auth.users(id)`. If a SECOND FK already targets profiles, HALT.

**Step C — Orphan check (read-only):**

```sql
SELECT COUNT(*) AS orphan_org_members
  FROM public.org_members om
  LEFT JOIN public.profiles p ON p.id = om.user_id
 WHERE p.id IS NULL;
```

Expected: 0 rows. If > 0, HALT for Jake — identity drift requires investigation BEFORE applying 00098. (The DO block in the migration will also catch this, but better to surface during planning verification.)

**Step D — REST API confirmation (optional but recommended):**

Reproduce the PGRST200 against current main:

```bash
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/org_members?select=user_id,profiles:user_id(id,full_name)&is_active=eq.true&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TEST_USER_JWT"
```

Expected: HTTP 400 with PGRST200 body `"Could not find a relationship between 'org_members' and 'user_id'"`. Documents the reproducer in SUMMARY.md so post-fix the same call against the new hint can be compared.

**Verify:** All 3 mandatory steps documented in SUMMARY.md before proceeding to Tasks 2-12.

---

### Task 2 — Author migration `00098_add_org_members_profiles_fk.sql`

**Path:** `supabase/migrations/00098_add_org_members_profiles_fk.sql`

**Read first:**
- `supabase/migrations/00007_add_profiles_and_auth_roles.sql:15-22` (profiles.id PK FKs to auth.users(id) ON DELETE CASCADE)
- `supabase/migrations/00016_multi_tenant_foundation.sql:93-119` (org_members CREATE + user_id FK to auth.users + initial seed from profiles)
- `supabase/migrations/00096_invoice_allocations_org_id.sql:43-62` (fail-loud DO block reference)
- `supabase/migrations/00097_drop_public_users.sql:65-88` (closer fail-loud DO block reference: orphan FK enumeration before constraint mutation)

**Action:** Create new file with the following content.

```sql
-- Migration 00098: Add FK from org_members.user_id to profiles.id.
--
-- Source decision: nwrp121 Addition 1 (D-078 — user-identity FK convention)
-- + Wave-D EXPANDED-SCOPE Plan D-1 + Rule 2 (plan-review iter-1 cites FK).
--
-- Rationale: PostgREST resolves embed hints (e.g.
-- `select=profile:profiles(id, full_name)`) by inspecting pg_constraint for
-- a FK from the source table (org_members) to the target table (profiles).
-- Prior to this migration, no such FK existed: `org_members.user_id` FK'd
-- to `auth.users(id)` (00016:96), and `profiles.id` FK'd to `auth.users(id)`
-- (00007:16), but PostgREST does NOT follow transitive FK chains. The
-- malformed hint `profiles:user_id (...)` returned PGRST200 on every call
-- (confirmed via direct REST API call against current main, 2026-05-13).
--
-- Wave-D EXPANDED-SCOPE Plan D-1 introduces this FK and refactors the 9
-- src consumer sites to use the correct hint syntax `profile:profiles (...)`.
--
-- Data-safety proof (1:1 invariant):
--   * profiles.id === auth.users.id by design (00007:5 doc comment).
--   * org_members.user_id === auth.users.id by FK (00016:96 ON DELETE CASCADE).
--   * Therefore org_members.user_id === profiles.id for every existing row.
--   * 00016:115-119 seed populated org_members FROM profiles directly,
--     establishing the invariant at seed time.
--   * Going-forward: Supabase Auth signup creates auth.users → trigger
--     creates profiles → app code creates org_members. The chain preserves
--     the invariant by construction.
--   * Pre-flight DO block (Step 0 below) RAISES EXCEPTION if any orphan
--     org_members.user_id is detected (i.e. value not in profiles.id). In
--     practice this should never fire; it's a fail-loud belt + suspenders.
--
-- Cascading effects (none):
--   * ADD CONSTRAINT does NOT modify any existing org_members row.
--   * Only pg_constraint system catalog gains an entry.
--   * Supabase auto-reloads PostgREST schema cache via DDL-trigger NOTIFY
--     (operational, not migration content).
--
-- FK convention divergence rationale (D-078):
--   * org_members.user_id now has DUAL FKs:
--     - existing FK to auth.users(id) ON DELETE CASCADE (00016:96)
--     - NEW FK to profiles(id) NO ACTION (this migration)
--   * D-078: NEW user-identity FKs default to auth.users UNLESS the column
--     is used in PostgREST embedding hints for display, in which case
--     profiles. org_members.user_id is the display-embedding case (used
--     in 9 src consumer hints post-Wave-D); profiles FK is correct.
--   * The dual-FK pattern is the same as invoices.assigned_pm_id post-
--     Wave-C (00097 retargeted to profiles; auth.users no longer in chain).
--     This plan ADDS a second FK rather than retargeting because
--     org_members.user_id's ON DELETE CASCADE semantic from auth.users is
--     load-bearing: deleting an auth user must cascade-delete their
--     org_members rows. Retargeting to profiles would lose that semantic.
--
-- Reversibility: `00098_add_org_members_profiles_fk.down.sql` drops the
-- single constraint; idempotent (IF EXISTS guard).
--
-- Pre-flight executor verification (run BEFORE applying this migration):
--   SELECT COUNT(*) FROM public.org_members om
--     LEFT JOIN public.profiles p ON p.id = om.user_id WHERE p.id IS NULL;
--   -- expect: 0. If > 0, HALT for Jake.

BEGIN;

-- 0. FAIL-LOUD ORPHAN-FK ASSERTION.
--    Mirrors 00096 HF-A4-2 + 00097 iter-2 HF-C1-2 pattern. Aborts cleanly
--    if any org_members.user_id value does NOT resolve in profiles(id).
--    Per 00007:5 + 00016:96 design, this should be 0 rows for all historical
--    + going-forward data. If this raises, surface to Jake — orphan
--    indicates identity drift requiring investigation BEFORE FK add.
DO $$
DECLARE
  v_orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO v_orphan_count
    FROM public.org_members om
    LEFT JOIN public.profiles p ON p.id = om.user_id
    WHERE p.id IS NULL;
  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION 'Pre-flight: % org_members rows have user_id NOT IN profiles. Aborting before FK add.', v_orphan_count;
  END IF;
END $$;

-- 1. Add the FK constraint enabling PostgREST embed resolution.
--    Constraint name `org_members_user_id_profiles_fkey` follows Postgres
--    auto-generation convention: <source_table>_<source_column>_<target_table>_fkey.
--    Naming matters because the down migration references it by name.
--    NO ON DELETE clause: defaults to NO ACTION. Rationale in header.
ALTER TABLE public.org_members
  ADD CONSTRAINT org_members_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);

COMMIT;

-- Post-apply executor verification (run AFTER applying this migration):
--   SELECT conname FROM pg_constraint
--     WHERE conrelid='public.org_members'::regclass
--       AND confrelid='public.profiles'::regclass;
--   -- expect: 1 row, conname=org_members_user_id_profiles_fkey
--
--   -- Reproduce the post-fix REST call (replaces the prior PGRST200):
--   curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/org_members?\
--     select=user_id,profile:profiles(id,full_name)&is_active=eq.true&limit=1" \
--     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
--     -H "Authorization: Bearer $TEST_USER_JWT"
--   -- expect: HTTP 200, body=[{"user_id":"...","profile":{"id":"...","full_name":"..."}}]
```

**Verification:**
- `psql -c "SELECT conname FROM pg_constraint WHERE conrelid='public.org_members'::regclass AND confrelid='public.profiles'::regclass;"` returns 1 row with `conname=org_members_user_id_profiles_fkey`
- `psql -c "\d public.org_members"` shows both FKs: `user_id → auth.users(id) ON DELETE CASCADE` AND `user_id → public.profiles(id)`
- Post-apply REST call (header documents) returns 200 + populated `profile` object

---

### Task 3 — Author reverse migration `00098_add_org_members_profiles_fk.down.sql`

**Path:** `supabase/migrations/00098_add_org_members_profiles_fk.down.sql`

**Action:** Create new file.

```sql
-- Reverse migration 00098: Drop org_members→profiles FK.
--
-- Single DROP CONSTRAINT IF EXISTS — idempotent.
--
-- WARNING: Applying this .down.sql leaves the 9 src consumer hints in their
-- D-1-refactored state (`profile:profiles (id, full_name)`). Those hints
-- WILL return PGRST200 again once the FK is gone — same regression Wave-D
-- Issue 1 fixes. Do NOT apply this .down without ALSO reverting the 9 src
-- file changes (revert the D-1 PR commits in lockstep).
--
-- Intended use: emergency rollback within hours of 00098 apply, BEFORE any
-- production traffic relies on the new hints.

BEGIN;

ALTER TABLE public.org_members
  DROP CONSTRAINT IF EXISTS org_members_user_id_profiles_fkey;

COMMIT;
```

---

### Task 4 — Refactor `src/app/api/dashboard/route.ts`

**Path:** `src/app/api/dashboard/route.ts`

**Current state (line 157-160):**

```typescript
timed("dashboard", "profiles.org_members", false,
  supabase.from("org_members")
    .select("user_id, profiles:user_id (id, full_name)")
    .eq("org_id", orgId).eq("is_active", true)),
```

**Current consumer (line 422-426):**

```typescript
const userNameMap = new Map<string, string>();
for (const raw of (orgProfilesRes.data ?? []) as unknown as Array<Record<string, unknown>>) {
  const p = pickFirst(raw.profiles) as { id: string; full_name: string | null } | null;
  if (p?.id && p.full_name) userNameMap.set(p.id, p.full_name);
}
```

**Refactor:**

```typescript
// AFTER (line 157-160):
timed("dashboard", "profiles.org_members", false,
  supabase.from("org_members")
    .select("user_id, profile:profiles (id, full_name)")
    .eq("org_id", orgId).eq("is_active", true)),
```

```typescript
// AFTER (line 422-426):
const userNameMap = new Map<string, string>();
for (const raw of (orgProfilesRes.data ?? []) as unknown as Array<Record<string, unknown>>) {
  const p = pickFirst(raw.profile) as { id: string; full_name: string | null } | null;
  if (p?.id && p.full_name) userNameMap.set(p.id, p.full_name);
}
```

**Notes:**
- `pickFirst` helper (line 526-529) is preserved unchanged; it's already array-safe for the corner case where PostgREST returns an array.
- The comment block above the query (lines 154-156) remains accurate — pre-fetch profiles via org_members.

**Verify:**
- File grep: `grep -c 'profile:profiles' src/app/api/dashboard/route.ts` returns ≥ 1
- File grep: `grep -c 'profiles:user_id' src/app/api/dashboard/route.ts` returns 0
- File grep: `grep -c 'raw\.profile\b' src/app/api/dashboard/route.ts` returns ≥ 1

---

### Task 5 — Refactor `src/app/api/jobs/health/route.ts`

**Path:** `src/app/api/jobs/health/route.ts`

**Current state (line 110-114):**

```typescript
// Pre-fetch all org PM names via org_members join — covers any PM on any job.
timed("jobs-health", "profiles.org_members", false,
  supabase.from("org_members")
    .select("user_id, profiles:user_id (id, full_name)")
    .eq("org_id", orgId).eq("is_active", true)),
```

**Current consumer (line 125-131):**

```typescript
// PM name map — orgProfilesRes is org_members with joined profiles.
const pmNameMap = new Map<string, string>();
for (const raw of (orgProfilesRes.data ?? []) as unknown as Array<Record<string, unknown>>) {
  const profile = Array.isArray(raw.profiles) ? raw.profiles[0] : raw.profiles;
  const p = profile as { id?: string; full_name?: string | null } | null;
  if (p?.id && p.full_name) pmNameMap.set(p.id, p.full_name);
}
```

**Refactor:**

```typescript
// AFTER (line 110-114):
// Pre-fetch all org PM names via org_members join — covers any PM on any job.
timed("jobs-health", "profiles.org_members", false,
  supabase.from("org_members")
    .select("user_id, profile:profiles (id, full_name)")
    .eq("org_id", orgId).eq("is_active", true)),
```

```typescript
// AFTER (line 125-131):
// PM name map — orgProfilesRes is org_members with joined profiles.
const pmNameMap = new Map<string, string>();
for (const raw of (orgProfilesRes.data ?? []) as unknown as Array<Record<string, unknown>>) {
  const profile = Array.isArray(raw.profile) ? raw.profile[0] : raw.profile;
  const p = profile as { id?: string; full_name?: string | null } | null;
  if (p?.id && p.full_name) pmNameMap.set(p.id, p.full_name);
}
```

**Verify:**
- `grep -c 'profile:profiles' src/app/api/jobs/health/route.ts` returns ≥ 1
- `grep -c 'profiles:user_id' src/app/api/jobs/health/route.ts` returns 0
- `grep -c 'raw\.profile\b' src/app/api/jobs/health/route.ts` returns ≥ 1

---

### Task 6 — Refactor `src/app/settings/workflow/page.tsx`

**Path:** `src/app/settings/workflow/page.tsx`

**Current state (line 19-26):**

```typescript
// PMs who can be the default assignee for unmatched invoices in bulk import.
supabase
  .from("org_members")
  .select("user_id, profiles:user_id (id, full_name)")
  .eq("org_id", membership.org_id)
  .eq("is_active", true)
  .in("role", ["pm", "admin", "owner"]),
```

**Current consumer (line 28-38):**

```typescript
type PmRow = { user_id: string; profiles: { id: string; full_name: string | null } | null };
const pms = (pmList.data ?? [])
  .map((r) => {
    const rec = r as unknown as PmRow;
    const profile = Array.isArray(rec.profiles) ? rec.profiles[0] : rec.profiles;
    return profile?.id && profile.full_name
      ? { id: profile.id, name: profile.full_name }
      : null;
  })
  .filter((p): p is { id: string; name: string } => p !== null)
  .sort((a, b) => a.name.localeCompare(b.name));
```

**Refactor:**

```typescript
// AFTER (line 19-26):
// PMs who can be the default assignee for unmatched invoices in bulk import.
supabase
  .from("org_members")
  .select("user_id, profile:profiles (id, full_name)")
  .eq("org_id", membership.org_id)
  .eq("is_active", true)
  .in("role", ["pm", "admin", "owner"]),
```

```typescript
// AFTER (line 28-38):
type PmRow = { user_id: string; profile: { id: string; full_name: string | null } | { id: string; full_name: string | null }[] | null };
const pms = (pmList.data ?? [])
  .map((r) => {
    const rec = r as unknown as PmRow;
    const profile = Array.isArray(rec.profile) ? rec.profile[0] : rec.profile;
    return profile?.id && profile.full_name
      ? { id: profile.id, name: profile.full_name }
      : null;
  })
  .filter((p): p is { id: string; name: string } => p !== null)
  .sort((a, b) => a.name.localeCompare(b.name));
```

**Notes:**
- The `PmRow` type updated to use `profile` field with the union to satisfy the defensive `Array.isArray` check. This matches the existing pattern in Wave-C-touched files.

**Verify:**
- `grep -c 'profile:profiles' src/app/settings/workflow/page.tsx` returns ≥ 1
- `grep -c 'profiles:user_id' src/app/settings/workflow/page.tsx` returns 0
- `grep -c 'rec\.profile\b' src/app/settings/workflow/page.tsx` returns ≥ 1

---

### Task 7 — Refactor `src/app/api/invoices/[id]/route.ts`

**Path:** `src/app/api/invoices/[id]/route.ts`

**Current state (line 108-117):**

```typescript
// PM list sourced from org_members + profiles (Plan C-1 — legacy
// users-table retirement; see .planning/audits/2026-05-12-migration-inventory.md
// GAP item 20).
supabase
  .from("org_members")
  .select("user_id, profiles:user_id (id, full_name)")
  .eq("org_id", orgId)
  .eq("is_active", true)
  .in("role", ["pm", "admin"]),
```

**Current consumer (line 155-162):**

```typescript
pm_users: ((pmUsersRes.data ?? []) as Array<{ user_id: string; profiles: { id: string; full_name: string } | { id: string; full_name: string }[] | null }>)
  .map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return profile && profile.id && profile.full_name
      ? { id: profile.id, full_name: profile.full_name }
      : null;
  })
```

**Refactor:**

```typescript
// AFTER (line 108-117):
// PM list sourced from org_members + profiles. Plan D-1 (Wave-D Issue 1
// fix): hint syntax updated from `profiles:user_id (...)` (PGRST200) to
// `profile:profiles (...)` resolving via the FK
// org_members_user_id_profiles_fkey created in 00098.
supabase
  .from("org_members")
  .select("user_id, profile:profiles (id, full_name)")
  .eq("org_id", orgId)
  .eq("is_active", true)
  .in("role", ["pm", "admin"]),
```

```typescript
// AFTER (line 155-162):
pm_users: ((pmUsersRes.data ?? []) as Array<{ user_id: string; profile: { id: string; full_name: string } | { id: string; full_name: string }[] | null }>)
  .map((m) => {
    const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
    return profile && profile.id && profile.full_name
      ? { id: profile.id, full_name: profile.full_name }
      : null;
  })
```

**Verify:**
- `grep -c 'profile:profiles' src/app/api/invoices/\[id\]/route.ts` returns ≥ 1
- `grep -c 'profiles:user_id' src/app/api/invoices/\[id\]/route.ts` returns 0

---

### Task 8 — Refactor `src/app/api/jobs/[id]/overview/route.ts` (TWO query sites)

**Path:** `src/app/api/jobs/[id]/overview/route.ts`

**Site A — Current state (line 72-80, pms list):**

```typescript
// PM list sourced from org_members + profiles (Plan C-1 — legacy
// users-table retirement; see .planning/audits/2026-05-12-migration-inventory.md
// GAP item 20).
timed("job-overview", "org_members.pm_admin", false,
  supabase.from("org_members")
    .select("user_id, profiles:user_id (id, full_name)")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .in("role", ["pm", "admin"])),
```

**Site A — Current consumer (line 204-212):**

```typescript
pms: ((usersRes.data ?? []) as Array<{ user_id: string; profiles: { id: string; full_name: string } | { id: string; full_name: string }[] | null }>)
  .map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return profile && profile.id && profile.full_name
      ? { id: profile.id, full_name: profile.full_name }
      : null;
  })
```

**Site A — Refactor:**

```typescript
// AFTER (line 72-80):
// PM list sourced from org_members + profiles. Plan D-1 (Wave-D Issue 1
// fix): hint syntax updated to `profile:profiles (...)` resolving via the
// FK org_members_user_id_profiles_fkey created in 00098.
timed("job-overview", "org_members.pm_admin", false,
  supabase.from("org_members")
    .select("user_id, profile:profiles (id, full_name)")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .in("role", ["pm", "admin"])),
```

```typescript
// AFTER (line 204-212):
pms: ((usersRes.data ?? []) as Array<{ user_id: string; profile: { id: string; full_name: string } | { id: string; full_name: string }[] | null }>)
  .map((m) => {
    const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
    return profile && profile.id && profile.full_name
      ? { id: profile.id, full_name: profile.full_name }
      : null;
  })
```

**Site B — Current state (line 115-118, activity-feed pre-fetch):**

```typescript
timed("job-overview", "profiles.org_members", false,
  supabase.from("org_members")
    .select("user_id, profiles:user_id (id, full_name)")
    .eq("org_id", orgId).eq("is_active", true)),
```

**Site B — Current consumer (line 158-164):**

```typescript
// Activity feed — resolve user names via prefetched org_members
const nameById = new Map<string, string>();
for (const raw of (orgProfilesRes.data ?? []) as Array<Record<string, unknown>>) {
  const profile = Array.isArray(raw.profiles) ? raw.profiles[0] : raw.profiles;
  const p = profile as { id?: string; full_name?: string | null } | null;
  if (p?.id && p.full_name) nameById.set(p.id, p.full_name);
}
```

**Site B — Refactor:**

```typescript
// AFTER (line 115-118):
timed("job-overview", "profiles.org_members", false,
  supabase.from("org_members")
    .select("user_id, profile:profiles (id, full_name)")
    .eq("org_id", orgId).eq("is_active", true)),
```

```typescript
// AFTER (line 158-164):
// Activity feed — resolve user names via prefetched org_members
const nameById = new Map<string, string>();
for (const raw of (orgProfilesRes.data ?? []) as Array<Record<string, unknown>>) {
  const profile = Array.isArray(raw.profile) ? raw.profile[0] : raw.profile;
  const p = profile as { id?: string; full_name?: string | null } | null;
  if (p?.id && p.full_name) nameById.set(p.id, p.full_name);
}
```

**Verify:**
- `grep -c 'profile:profiles' src/app/api/jobs/\[id\]/overview/route.ts` returns 2 (one per site)
- `grep -c 'profiles:user_id' src/app/api/jobs/\[id\]/overview/route.ts` returns 0

---

### Task 9 — Refactor `src/app/invoices/page.tsx`

**Path:** `src/app/invoices/page.tsx`

**Current state (line 196-208):**

```typescript
// PM dropdown sourced from org_members + profiles (Plan C-1 — legacy
// users-table retirement; see .planning/audits/2026-05-12-migration-inventory.md
// GAP item 20). Option A: explicit org_id filter — tenant safety by
// construction per D-30 (iter-2 CR-C1-1 promotion from Option B;
// 4-of-5 reviewer consensus).
orgId
  ? supabase
      .from("org_members")
      .select("user_id, profiles:user_id (id, full_name)")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .in("role", ["pm", "admin"])
  : Promise.resolve({ data: null, error: null }),
```

**Current consumer (line 239-249):**

```typescript
if (!pmResult.error && pmResult.data) {
  const pms = (pmResult.data as Array<{ user_id: string; profiles: { id: string; full_name: string } | { id: string; full_name: string }[] | null }>)
    .map((m) => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      return profile && profile.id && profile.full_name
        ? { id: profile.id, full_name: profile.full_name }
        : null;
    })
    .filter((p): p is PmUser => p !== null)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
  setPmUsers(pms);
}
```

**Refactor:**

```typescript
// AFTER (line 196-208):
// PM dropdown sourced from org_members + profiles. Plan D-1 (Wave-D
// Issue 1 fix): hint syntax updated from `profiles:user_id (...)` to
// `profile:profiles (...)` resolving via the FK
// org_members_user_id_profiles_fkey created in 00098. Option A: explicit
// org_id filter — tenant safety by construction per D-30 (preserved from
// C-1 CR-C1-1 promotion).
orgId
  ? supabase
      .from("org_members")
      .select("user_id, profile:profiles (id, full_name)")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .in("role", ["pm", "admin"])
  : Promise.resolve({ data: null, error: null }),
```

```typescript
// AFTER (line 239-249):
if (!pmResult.error && pmResult.data) {
  const pms = (pmResult.data as Array<{ user_id: string; profile: { id: string; full_name: string } | { id: string; full_name: string }[] | null }>)
    .map((m) => {
      const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
      return profile && profile.id && profile.full_name
        ? { id: profile.id, full_name: profile.full_name }
        : null;
    })
    .filter((p): p is PmUser => p !== null)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
  setPmUsers(pms);
}
```

**Verify:**
- `grep -c 'profile:profiles' src/app/invoices/page.tsx` returns ≥ 1
- `grep -c 'profiles:user_id' src/app/invoices/page.tsx` returns 0

---

### Task 10 — Refactor `src/app/invoices/queue/page.tsx`

**Path:** `src/app/invoices/queue/page.tsx`

**Current state (line 214-224):**

```typescript
// PM dropdown sourced from org_members + profiles (Plan C-1 — legacy
// users-table retirement; see .planning/audits/2026-05-12-migration-inventory.md
// GAP item 20).
orgId
  ? supabase
      .from("org_members")
      .select("user_id, profiles:user_id (id, full_name)")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .in("role", ["pm", "admin"])
  : Promise.resolve({ data: null, error: null }),
```

**Current consumer (line 251-262):**

```typescript
if (!pmResult.error && pmResult.data) {
  const pms = (pmResult.data as Array<{ user_id: string; profiles: { id: string; full_name: string } | { id: string; full_name: string }[] | null }>)
    .map((m) => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      return profile && profile.id && profile.full_name
        ? { id: profile.id, full_name: profile.full_name }
        : null;
    })
    .filter((p): p is PmUser => p !== null)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
  setPmUsers(pms);
}
```

**Refactor:**

```typescript
// AFTER (line 214-224):
// PM dropdown sourced from org_members + profiles. Plan D-1 (Wave-D
// Issue 1 fix): hint syntax updated to `profile:profiles (...)` resolving
// via the FK org_members_user_id_profiles_fkey created in 00098.
orgId
  ? supabase
      .from("org_members")
      .select("user_id, profile:profiles (id, full_name)")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .in("role", ["pm", "admin"])
  : Promise.resolve({ data: null, error: null }),
```

```typescript
// AFTER (line 251-262):
if (!pmResult.error && pmResult.data) {
  const pms = (pmResult.data as Array<{ user_id: string; profile: { id: string; full_name: string } | { id: string; full_name: string }[] | null }>)
    .map((m) => {
      const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
      return profile && profile.id && profile.full_name
        ? { id: profile.id, full_name: profile.full_name }
        : null;
    })
    .filter((p): p is PmUser => p !== null)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
  setPmUsers(pms);
}
```

**Verify:**
- `grep -c 'profile:profiles' src/app/invoices/queue/page.tsx` returns ≥ 1
- `grep -c 'profiles:user_id' src/app/invoices/queue/page.tsx` returns 0

---

### Task 11 — Refactor `src/app/jobs/new/page.tsx`

**Path:** `src/app/jobs/new/page.tsx`

**Current state (line 78-93):**

```typescript
const { data: members } = await supabase
  .from("org_members")
  .select("user_id, profiles:user_id (id, full_name)")
  .eq("org_id", orgId)
  .eq("is_active", true)
  .in("role", ["pm", "admin"]);
const pms = (members ?? [])
  .map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return profile && profile.id && profile.full_name
      ? { id: profile.id as string, full_name: profile.full_name as string }
      : null;
  })
  .filter((p): p is PmUser => p !== null)
  .sort((a, b) => a.full_name.localeCompare(b.full_name));
setPms(pms);
```

**Refactor:**

```typescript
// AFTER (line 78-93):
// Plan D-1 (Wave-D Issue 1 fix): hint syntax updated from
// `profiles:user_id (...)` to `profile:profiles (...)` resolving via the
// FK org_members_user_id_profiles_fkey created in 00098.
const { data: members } = await supabase
  .from("org_members")
  .select("user_id, profile:profiles (id, full_name)")
  .eq("org_id", orgId)
  .eq("is_active", true)
  .in("role", ["pm", "admin"]);
const pms = (members ?? [])
  .map((m) => {
    const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
    return profile && profile.id && profile.full_name
      ? { id: profile.id as string, full_name: profile.full_name as string }
      : null;
  })
  .filter((p): p is PmUser => p !== null)
  .sort((a, b) => a.full_name.localeCompare(b.full_name));
setPms(pms);
```

**Verify:**
- `grep -c 'profile:profiles' src/app/jobs/new/page.tsx` returns ≥ 1
- `grep -c 'profiles:user_id' src/app/jobs/new/page.tsx` returns 0

---

### Task 12 — Post-refactor verification

**Path:** N/A (verification only)

**Action:**

**Step A — Full-tree grep verification:**

```bash
grep -rnF 'profiles:user_id' src/
# Expected: 0 hits

grep -rnE 'profile:profiles' src/ --include="*.ts" --include="*.tsx"
# Expected: at least 9 hits (one per refactored site; multi-line select() OK)
```

**Step B — Build + type-check:**

```bash
npm run build
# Expected: 0 errors, 0 TypeScript complaints

npx tsc --noEmit
# Expected: 0 errors
```

**Step C — Apply migration via Supabase MCP:**

```
mcp__supabase__apply_migration name=00098_add_org_members_profiles_fk
```

Verify post-apply:

```sql
SELECT conname, confrelid::regclass AS target_table
  FROM pg_constraint
 WHERE conrelid='public.org_members'::regclass
   AND confrelid='public.profiles'::regclass;
-- expect: 1 row, conname=org_members_user_id_profiles_fkey, target_table=profiles
```

```sql
-- Reproducer check — confirm orphans still 0 post-apply
SELECT COUNT(*) AS orphan_org_members
  FROM public.org_members om
  LEFT JOIN public.profiles p ON p.id = om.user_id
 WHERE p.id IS NULL;
-- expect: 0
```

**Step D — REST API confirmation (the smoking-gun fix):**

```bash
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/org_members?select=user_id,profile:profiles(id,full_name)&is_active=eq.true&limit=3" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TEST_USER_JWT"
```

**Expected:** HTTP 200 with body like:

```json
[
  {"user_id":"<uuid>","profile":{"id":"<uuid>","full_name":"Jake Ross"}},
  {"user_id":"<uuid>","profile":{"id":"<uuid>","full_name":"Andrew Ross"}},
  {"user_id":"<uuid>","profile":{"id":"<uuid>","full_name":"Diane"}}
]
```

**NOT** the prior PGRST200:

```json
{"code":"PGRST200","details":"...","message":"Could not find a relationship between 'org_members' and 'user_id' in the schema cache"}
```

**Step E — Layer 1 harness:**

```bash
npm run harness:layer1
# expect: PASS (no new RLS/FK advisor warnings)
```

**Step F — Drummond grep gate:**

Verify `.githooks/pre-commit` stays silent on the committed diff. The diff should contain ONLY:
- `profile:profiles` (added)
- `profiles:user_id` removals
- `.profile` (vs `.profiles`) consumer destructuring
- Inline TypeScript type updates

No Drummond reference data should appear in the diff (the migration is purely schema; the src refactors touch query syntax only).

**Done:**
- All 9 sites verified via grep
- npm run build + tsc --noEmit pass
- Migration applied + post-apply pg_constraint query confirms FK
- REST API call returns 200 + populated profile object
- Layer 1 harness PASS
- Drummond gate silent

---

## Acceptance criteria

| ID | Criterion | Verification command/method |
|---|---|---|
| AC-D1-01 | FK constraint `org_members_user_id_profiles_fkey` exists post-migration | `SELECT conname FROM pg_constraint WHERE conrelid='public.org_members'::regclass AND confrelid='public.profiles'::regclass;` returns exactly 1 row |
| AC-D1-02 | Zero hits for old broken hint syntax | `grep -rnF 'profiles:user_id' src/` returns 0 hits |
| AC-D1-03 | At least 9 hits for new correct hint syntax | `grep -rnE 'profile:profiles' src/ --include="*.ts" --include="*.tsx"` returns ≥ 9 hits |
| AC-D1-04 | REST API call against new hint returns 200 with populated profile data (NOT PGRST200) | `curl /rest/v1/org_members?select=user_id,profile:profiles(id,full_name)&is_active=eq.true` returns HTTP 200 + each row has `profile.id` + `profile.full_name` populated |
| AC-D1-05 | All 9 src consumer sites use new hint + updated destructuring | Per-file grep verification: each of 9 files returns ≥ 1 hit for `profile:profiles` and 0 hits for `profiles:user_id` |
| AC-D1-06 | TypeScript + build pass | `npm run build` exit 0; `npx tsc --noEmit` exit 0 |
| AC-D1-07 | Pre-flight orphan count is 0 + Layer 1 harness PASS | `SELECT COUNT(*) FROM org_members om LEFT JOIN profiles p ON p.id=om.user_id WHERE p.id IS NULL;` returns 0; `npm run harness:layer1` exits 0 |

D-4 (smoke harness) extends these with runtime UI verification on all 9 surfaces; D-1's ACs are scoped to migration + build + grep + single REST call.

---

## Rule 2 citations (BLOCKING per nwrp121 Addition 1)

Plan-review iter-1 MUST verify each citation against the actual file content.

### Migration that creates the FK

**File:** `supabase/migrations/00098_add_org_members_profiles_fk.sql`

**Constraint definition line (in the migration text):**

```sql
ALTER TABLE public.org_members
  ADD CONSTRAINT org_members_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id);
```

This statement is at the end of Step 1 in the migration body. The migration is structured:
- Lines 1-58: header comments documenting rationale + D-078 reference + 1:1 invariant proof
- Lines 60-77: BEGIN + pre-flight DO block (orphan check)
- Lines 79-83: ALTER TABLE ADD CONSTRAINT (the FK definition itself)
- Lines 85-87: COMMIT + post-apply verification queries in comments

(Exact line numbers will depend on final formatting at write time; planner specifies the structural location, not the literal line ranges.)

### FK constraint enabling each refactored site

All 9 refactored sites share a single FK constraint: **`org_members_user_id_profiles_fkey`** defined in **migration 00098** (this plan).

Per-site mapping:

| # | File | Refactored hint line | FK constraint citation |
|---|---|---|---|
| 1 | `src/app/api/dashboard/route.ts` | 159 | `org_members_user_id_profiles_fkey` (00098) |
| 2 | `src/app/api/jobs/health/route.ts` | 113 | `org_members_user_id_profiles_fkey` (00098) |
| 3 | `src/app/settings/workflow/page.tsx` | 22 | `org_members_user_id_profiles_fkey` (00098) |
| 4 | `src/app/api/invoices/[id]/route.ts` | 113 | `org_members_user_id_profiles_fkey` (00098) |
| 5 | `src/app/api/jobs/[id]/overview/route.ts` | 77 (pms list) | `org_members_user_id_profiles_fkey` (00098) |
| 6 | `src/app/api/jobs/[id]/overview/route.ts` | 117 (activity feed) | `org_members_user_id_profiles_fkey` (00098) |
| 7 | `src/app/invoices/page.tsx` | 204 | `org_members_user_id_profiles_fkey` (00098) |
| 8 | `src/app/invoices/queue/page.tsx` | 220 | `org_members_user_id_profiles_fkey` (00098) |
| 9 | `src/app/jobs/new/page.tsx` | 80 | `org_members_user_id_profiles_fkey` (00098) |

All 9 sites embed the same target table (`profiles`) via the same source column (`org_members.user_id`); a single FK suffices for unambiguous PostgREST resolution across all 9.

### Verification query (BLOCKING)

```sql
SELECT conname
  FROM pg_constraint
 WHERE conrelid='public.org_members'::regclass
   AND confrelid='public.profiles'::regclass;
```

**Expected:** 1 row, `conname=org_members_user_id_profiles_fkey`.

If plan-review iter-1 runs this query against a database where 00098 has NOT yet been applied, it returns 0 rows — which is the expected pre-apply state and DOES NOT fail Rule 2 (the citation is to a forthcoming migration, validated by the plan's migration text). Plan-review verifies: (a) the migration text in this plan's Task 2 actually adds the cited constraint, and (b) the constraint name in the citation matches the constraint name in the migration text.

---

## Open questions

OPEN-QUESTION D-1-Q1: Should the executor add a defensive `NOTIFY pgrst, 'reload schema'` at the bottom of the migration?

> **Context:** Supabase typically auto-reloads the PostgREST schema cache on DDL changes, but a manual NOTIFY at migration end is a belt-and-suspenders pattern observed in some Supabase community examples. Adding it costs nothing if auto-reload is working, and saves a 30-second wait if it's not.
>
> **Recommendation:** OMIT for now. Supabase's auto-reload on DDL has been reliable across all prior Nightwork migrations (94+ applied; never required manual NOTIFY). If post-apply REST call returns PGRST200, executor can issue NOTIFY manually as a recovery step rather than baking it into every migration. Surface to plan-review iter-1 for confirmation.

OPEN-QUESTION D-1-Q2: Should the FK be `ON DELETE CASCADE` instead of NO ACTION?

> **Context:** The header rationale documents WHY NO ACTION is correct (the auth.users CASCADE already removes org_members rows; the new FK should not double-cascade). However, a reviewer might argue that CASCADE on this FK makes the dual-FK pattern more symmetric.
>
> **Recommendation:** KEEP NO ACTION. The rationale in the migration header is strong:
> - auth.users → profiles → org_members chain handles auth deletion via existing CASCADE
> - profiles.id deletion WITHOUT auth.users.id deletion is anomalous (the auth.users delete would have cascaded profiles already)
> - NO ACTION acts as a defensive guard against hand-crafted SQL bypassing CASCADE chains
>
> If plan-review iter-1 disagrees, the change is one ALTER line; revisit at execute time per reviewer feedback.

OPEN-QUESTION D-1-Q3: Should consumer destructuring simplify away the defensive `Array.isArray()` checks given that the new FK guarantees single-row embed?

> **Context:** With the new FK in place, PostgREST will always return a single object (not array) for `profile:profiles(id,full_name)`. The defensive `Array.isArray(m.profile) ? m.profile[0] : m.profile` pattern becomes theoretically unnecessary.
>
> **Recommendation:** PRESERVE the defensive pattern in all 9 sites. Reasons:
> - Minimal-diff posture: changing the destructure shape introduces additional risk + plan-review surface area for marginal benefit.
> - PostgREST's behavior on multi-row embeds depends on FK uniqueness; the new FK is a single FOREIGN KEY (no UNIQUE on profiles.id beyond PK, which IS unique, so single-row return is guaranteed). But future code changes could introduce a multi-row variant.
> - Cost of preserving: ~1 line per site (no perf cost; runtime no-op for single objects).
>
> If a future code-style sweep wants to simplify, that's a Wave 1.1-Full polish task. Wave-D's scope is bug-fix, not style.

---

## Executor notes

- **Apply migration via Supabase MCP** (`mcp__supabase__apply_migration`), not via psql CLI. Per CLAUDE.md "Use the MCP tools directly for all Supabase interactions" + Nightwork conventions.
- **Commit order:** migration files FIRST (separate commit), then src refactors (separate commit). This way if the migration apply fails, the src changes are not yet committed against a broken schema. After both succeed, push as a stacked pair.
- **DO NOT run the smoke harness from D-4 in this plan's execution.** D-4 is the smoke + Rules codification plan; running it here is out of scope. D-1's verification stops at Task 12 (single REST call confirmation).
- **DO NOT modify CLAUDE.md.** D-4 codifies Rules 1-4; D-5 codifies D-078. CLAUDE.md remains untouched in D-1.
- **Branch:** Wave-D ships under `phase/f1-knowledge-graph-auth-wave-d` per Nightwork branch conventions; D-1 commits land on this branch alongside D-2/D-4/D-3/D-5.
- **`/nightwork-qa` runs after all 5 D-plans land on the branch + before `/gsd-ship` per nwrp121 step 7.**

---

## Files written by this plan

| Path | New/Modified | Size estimate |
|---|---|---|
| `supabase/migrations/00098_add_org_members_profiles_fk.sql` | New | ~90 lines (header comments + DO block + ALTER + post-apply doc) |
| `supabase/migrations/00098_add_org_members_profiles_fk.down.sql` | New | ~20 lines |
| `src/app/api/dashboard/route.ts` | Modified | 2-line query change + 1-line consumer change |
| `src/app/api/jobs/health/route.ts` | Modified | 2-line query change + 2-line consumer change |
| `src/app/settings/workflow/page.tsx` | Modified | 1-line query change + 3-line consumer + type change |
| `src/app/api/invoices/[id]/route.ts` | Modified | 1-line query change + 4-line consumer + type change (+3-line comment update) |
| `src/app/api/jobs/[id]/overview/route.ts` | Modified | 2-line query change (2 sites) + 4-line consumer + type change |
| `src/app/invoices/page.tsx` | Modified | 1-line query change + 4-line consumer + type change (+3-line comment update) |
| `src/app/invoices/queue/page.tsx` | Modified | 1-line query change + 4-line consumer + type change |
| `src/app/jobs/new/page.tsx` | Modified | 1-line query change + 2-line consumer change |

Total: 2 new migration files + 9 modified src files. Estimated diff size: ~150-200 lines (mostly comments + type updates).
