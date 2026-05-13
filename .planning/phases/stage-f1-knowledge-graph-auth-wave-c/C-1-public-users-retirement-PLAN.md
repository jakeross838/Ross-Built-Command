---
phase: stage-f1-knowledge-graph-auth-wave-c
plan: C-1
plan-name: public-users-retirement
type: execute
wave: C
depends_on: []
autonomous: true
halt_after: false
threat_model_severity: medium
status: not-started
authored: 2026-05-12
authored_by: gsd-planner (claude-opus-4-7[1m])
authorization: nwrp116 (Wave-C single-plan dispatch — Option A sequencing per nwrp115 Item 2; Wave-C ships BEFORE Wave-B)
requirements: []
source_decisions:
  - "GAP item 20 (.planning/audits/2026-05-12-migration-inventory.md) — public.users legacy table actively read by 5 src files; superseded conceptually by profiles + org_members; retirement scheduled to Wave-C per nwrp114"
  - "Q2 A1 spirit (umbrella F1 EXPANDED-SCOPE — schema philosophy: full normalize; profiles + org_members is canonical identity path)"
  - "Q10b C codified rule (umbrella F1 EXPANDED-SCOPE — RLS coverage; public.users dropped entirely so no RLS rewrite needed)"
  - "D-30 (CLAUDE.md Architecture posture — tenant boundary by construction; refactored read paths preserve getCurrentMembership() + org-scoped queries)"
  - "Q12 (umbrella F1 EXPANDED-SCOPE — versioning intent; public.users is NOT a workflow entity; drop is structural cleanup, not versioning concern)"

files_modified:
  - supabase/migrations/00097_drop_public_users.sql
  - supabase/migrations/00097_drop_public_users.down.sql
  - src/app/jobs/new/page.tsx
  - src/app/invoices/queue/page.tsx
  - src/app/invoices/page.tsx
  - src/app/api/invoices/[id]/route.ts
  - src/app/api/jobs/[id]/overview/route.ts

files_referenced:
  - supabase/migrations/00004_add_users_and_pm_assignment.sql (CREATE TABLE public.users — schema reference for .down.sql; FK source for invoices.assigned_pm_id → users(id))
  - supabase/migrations/00007_add_profiles_and_auth_roles.sql (profiles table — canonical identity entity; "profiles.id === auth.users.id === public.users.id" doc comment line 5)
  - supabase/migrations/00009_role_based_rls.sql (RLS policies on public.users — auto-dropped by DROP TABLE CASCADE)
  - supabase/migrations/00016_multi_tenant_foundation.sql (line 84: public.users.org_id FK to organizations — schema reference; lines 92-119: org_members table + initial seed from profiles)
  - supabase/migrations/00036_bulk_invoice_import.sql (line 72: org_workflow_settings.import_default_pm_id → public.users(id) FK — MUST be retargeted before drop)
  - supabase/migrations/00049_platform_admin_rls_bypass.sql (lines 319-329: 3 RLS policies on public.users — auto-dropped by CASCADE)
  - src/app/platform-admin/users/page.tsx (audit-expected consumer but ALREADY refactored to profiles + org_members; documents pattern to follow for the 5 remaining consumers)
  - src/lib/notifications.ts (existing profiles + org_members read pattern reference, lines 247/292/328/434/468)
  - .planning/audits/2026-05-12-migration-inventory.md (GAP item 20 evidence; line 38; Section 5)

requires:
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-c-EXPANDED-SCOPE.md
  - .planning/expansions/stage-f1-knowledge-graph-auth-EXPANDED-SCOPE.md
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-c/CONTEXT.md
  - .planning/audits/2026-05-12-migration-inventory.md

provides:
  - "public.users table removed from schema entirely (triple-identity-table state eliminated — Wave-B inherits clean foundation)"
  - "invoices.assigned_pm_id FK retargeted from public.users(id) to public.profiles(id)"
  - "org_workflow_settings.import_default_pm_id FK retargeted from public.users(id) to public.profiles(id)"
  - "5 src consumers refactored to read profiles + org_members exclusively (no from('users') reads remain in src/)"
  - "PostgREST relationship assigned_pm:assigned_pm_id (id, full_name) continues to work post-drop via retargeted FK to profiles"
  - "GAP item 20 closed; D-035 Section 5 task #6 retired"

affects:
  - "Active PM dropdowns in 3 surfaces: jobs/new + invoices/queue + invoices — now sourced from org_members joined to profiles"
  - "Invoice detail page assigned_pm field — now resolves through profiles via retargeted FK"
  - "Job-overview API (/api/jobs/[id]/overview) PM list — now sourced from org_members + profiles"
  - "No UI-visible behavior change expected; user names + roles preserved across refactor"
  - "Historical FK chain comment in 00007 (line 5: 'profiles.id === auth.users.id === public.users.id') — public.users half retired"

sequence:
  before: Wave-B (per Option A — nwrp116; clean foundation for Wave-B Plan B-1a Clients work)
  parallel_authoring_ok: false (single-plan wave)

acceptance-criteria-target: 8 falsifiable items (AC-C1-01..AC-C1-08); see "Acceptance criteria" below

threat_model:
  trust_boundaries:
    - "DB schema change boundary — migration 00097 modifies public schema; CASCADE drops 3 RLS policies on public.users + any remaining indexes; explicit FK retarget on invoices.assigned_pm_id + org_workflow_settings.import_default_pm_id BEFORE the drop"
    - "Code refactor boundary — 5 src files lose references to public.users; build must reflect refactor atomically with migration to prevent runtime errors against a dropped table"
    - "PostgREST relationship boundary — assigned_pm:assigned_pm_id (id, full_name) join is FK-derived. Without FK retarget, the join breaks at runtime even though `from('users')` reads are removed. Hazard surfaces in 3 files (queue + invoices + api/invoices/[id])."
    - "Identity-table semantics boundary — public.users had org_id (legacy multi-tenant residue, see 00016:84); profiles uses auth.users(id) keying. Post-refactor, all PM identity reads route through profiles (no org_id on profile row) joined to org_members (where org_id + role live)."

  threats:
    - id: T-C-1-01
      category: "D (Denial of Service — schema migration fails on production due to unhandled FK)"
      component: "DROP TABLE public.users CASCADE"
      disposition: "mitigate"
      mitigation: "Pre-flight enumeration of FKs to public.users (audit + planner research identified 2: invoices.assigned_pm_id [00004:14] + org_workflow_settings.import_default_pm_id [00036:72]). Both are explicitly retargeted to profiles(id) in the same migration BEFORE the DROP TABLE. CASCADE then only drops the 3 RLS policies (00049:320-329) + auto-cleanup. Executor re-runs FK enumeration via information_schema.referential_constraints pre-apply (Task 1 Step C) — if novel FK surfaces, HALT for Jake."
    - id: T-C-1-02
      category: "T (Tampering — PostgREST relationship broken at runtime)"
      component: "Supabase select() relationship hint `assigned_pm:assigned_pm_id (id, full_name)`"
      disposition: "mitigate"
      mitigation: "PostgREST resolves the named relationship `assigned_pm:assigned_pm_id` via the FK on invoices.assigned_pm_id. Retargeting the FK to profiles(id) (Task 2 Step B) preserves the existing select hint shape — no code change needed in 3 of the 5 src consumer files for the relationship itself. Smoke test verifies the resolved name + ID render correctly post-deploy."
    - id: T-C-1-03
      category: "I (Information Disclosure — assigned_pm dropdown leaks cross-org PMs)"
      component: "PM dropdown queries (jobs/new + invoices/queue + invoices + api/jobs/[id]/overview)"
      disposition: "mitigate"
      mitigation: "All 4 PM-dropdown queries refactored to filter via org_members.is_active=true + org_members.org_id=membership.org_id + org_members.role IN ('pm','admin'). RLS policy 'authenticated can read profiles' (00007:60) currently permits cross-org SELECT, but the org_members.org_id filter scopes the result set. For api/jobs/[id]/overview (server-side service-role-client), explicit org_id filter is added. For client-side reads (3 *.tsx files), the org_members.org_id filter is derived from the user's active membership at query time. Code review: each refactored query has org_id scoping. Harness Layer 1 covers."
    - id: T-C-1-04
      category: "R (Repudiation — historical activity_log rows reference public.users IDs)"
      component: "activity_log.user_id column (TEXT, FK-less)"
      disposition: "accept"
      mitigation: "activity_log.user_id stores user UUIDs as TEXT without FK. Post-drop, historical rows pointing at user IDs that came from public.users continue to resolve via profiles (because profiles.id === public.users.id === auth.users.id per 00007:5 design). No data drift. ActivityEntityType TS union does NOT include 'user' as an entity_type per src/lib/activity-log.ts:35 — but a 'user' member IS present; not touched by this plan. (Wave-B Plan B-4 may extend or rewire.)"
    - id: T-C-1-05
      category: "D (Denial of Service — overshoot on .down.sql restoring legacy state)"
      component: "supabase/migrations/00097_drop_public_users.down.sql"
      disposition: "accept"
      mitigation: "Risk only materializes on parallel/cold-start environment that applied 00004 but not 00009 / 00016 / 00049. All Nightwork environments (prod + preview + dev) are well past 00094 (Wave-A applied 2026-05-12). .down.sql header documents the assumption + states 'schema-only restore; no data reseed'. Production public.users row count is captured pre-flight per Wave-C EXPANDED-SCOPE AC #6 for posterity, but is NOT restored on rollback (data lives in auth.users + profiles)."
    - id: T-C-1-06
      category: "T (Tampering — UI behavior regression on smoke test)"
      component: "5 refactored UI surfaces"
      disposition: "mitigate"
      mitigation: "Drummond reference data is seeded across all 5 PMs (Jake Ross, Lee Worthy, Nelson Belanger, Bob Mozine, Jeff Bryde, Martin Mannix, Jason Szykulski, Diane, Andrew Ross — 9 users from 00004:18 + 00007:88). Each UI surface MUST render the same PM names + dropdown selections post-refactor. Smoke test runs Drummond walk against the 5 surfaces; deviation HALTs for Jake. If Chrome MCP unavailable, smoke deferral documented in SUMMARY with grep-level evidence of expected query shape."

must_haves:
  truths:
    - "After migration 00097 applies, `\\dt public.users` returns no relation"
    - "After migration 00097 applies, `\\d public.invoices` shows assigned_pm_id FK pointing at profiles(id), not users(id)"
    - "After migration 00097 applies, `\\d public.org_workflow_settings` shows import_default_pm_id FK pointing at profiles(id), not users(id)"
    - "After C-1 PR merges, `grep -rnE 'from\\(\"users\"\\)|public\\.users' src/ --include=\"*.ts\" --include=\"*.tsx\"` returns 0 hits"
    - "After C-1 PR merges, `grep -rn 'from(\"users\")' src/ --include=\"*.ts\" --include=\"*.tsx\"` returns 0 hits"
    - "PM dropdown on /jobs/new continues to render all PM + admin org members (verified against Drummond reference data: 8 internal-team rows from RB org)"
    - "Invoice queue at /invoices/queue continues to render assigned_pm.full_name for each invoice row + PM filter dropdown lists same set of PMs"
    - "Invoices list at /invoices continues to render assigned_pm.full_name for each invoice row + PM filter dropdown lists same set of PMs"
    - "Invoice detail GET /api/invoices/[id] continues to return assigned_pm: { id, full_name, role } and pm_users: [{ id, full_name }] arrays"
    - "Job overview GET /api/jobs/[id]/overview continues to return pms: [{ id, full_name }] array (renamed semantically from usersRes to pmsRes if helpful for readability)"
    - "`npm run build` passes with zero TypeScript errors"
    - "`npx tsc --noEmit` passes"
    - "Drummond grep gate (.githooks/pre-commit) silent on the committed diff"
    - "Harness Layer 1 (DB integrity + RLS coverage) PASS post-migration — no advisor flag re: orphan FK on invoices.assigned_pm_id or org_workflow_settings.import_default_pm_id"
    - "Drummond gate (full E2E walk) PASS post-migration"
    - "Pre-flight `SELECT count(*) FROM public.users` rowcount documented in SUMMARY.md"

  artifacts:
    - path: "supabase/migrations/00097_drop_public_users.sql"
      provides: "Forward DDL: retarget 2 FKs to profiles + DROP TABLE public.users CASCADE"
      contains: "ALTER TABLE public.invoices DROP CONSTRAINT"
      contains_also: "DROP TABLE IF EXISTS public.users CASCADE"

    - path: "supabase/migrations/00097_drop_public_users.down.sql"
      provides: "Reverse DDL: recreate public.users table schema (NOT data) — restores cumulative state from 00004 + 00009 + 00016 + 00049; restores 2 FK retargets"
      contains: "CREATE TABLE IF NOT EXISTS public.users"
      contains_also: "ENABLE ROW LEVEL SECURITY"

    - path: "src/app/jobs/new/page.tsx"
      provides: "PM dropdown sourced from org_members + profiles join (role IN ('pm','admin'), is_active=true, scoped to user's org)"
      not_contains: "from(\"users\")"
      contains: "from(\"org_members\")"

    - path: "src/app/invoices/queue/page.tsx"
      provides: "PM filter dropdown sourced from org_members + profiles join; assigned_pm relationship hint preserved (resolves via retargeted FK)"
      not_contains: "from(\"users\")"
      contains: "from(\"org_members\")"

    - path: "src/app/invoices/page.tsx"
      provides: "PM filter dropdown sourced from org_members + profiles join; assigned_pm relationship hint preserved"
      not_contains: "from(\"users\")"
      contains: "from(\"org_members\")"

    - path: "src/app/api/invoices/[id]/route.ts"
      provides: "GET handler pm_users array sourced from org_members + profiles join (replaces inline supabase.from('users') in Promise.all); PATCH handler unchanged"
      not_contains: "from(\"users\")"
      contains: "from(\"org_members\")"

    - path: "src/app/api/jobs/[id]/overview/route.ts"
      provides: "PM list (Promise.all index 1) sourced from org_members + profiles join, scoped to job's org_id"
      not_contains: "from(\"users\")"
      contains: "from(\"org_members\")"

  key_links:
    - from: "supabase/migrations/00097_drop_public_users.sql"
      to: "public.invoices.assigned_pm_id FK"
      via: "ALTER TABLE DROP CONSTRAINT + ADD CONSTRAINT"
      pattern: "REFERENCES public\\.profiles\\(id\\)"

    - from: "supabase/migrations/00097_drop_public_users.sql"
      to: "public.org_workflow_settings.import_default_pm_id FK"
      via: "ALTER TABLE DROP CONSTRAINT + ADD CONSTRAINT"
      pattern: "REFERENCES public\\.profiles\\(id\\)"

    - from: "supabase/migrations/00097_drop_public_users.sql"
      to: "public.users table"
      via: "DROP TABLE CASCADE"
      pattern: "DROP TABLE IF EXISTS public\\.users CASCADE"

    - from: "src/app/jobs/new/page.tsx (PM dropdown)"
      to: "org_members + profiles join"
      via: "supabase.from('org_members') with profiles:user_id (id, full_name) select hint"
      pattern: "from\\(\"org_members\"\\)[\\s\\S]*?profiles:user_id"

    - from: "src/app/invoices/queue/page.tsx (PM filter)"
      to: "org_members + profiles join"
      via: "supabase.from('org_members') with profiles:user_id (id, full_name) select hint"
      pattern: "from\\(\"org_members\"\\)[\\s\\S]*?profiles:user_id"

    - from: "src/app/invoices/page.tsx (PM filter)"
      to: "org_members + profiles join"
      via: "supabase.from('org_members') with profiles:user_id (id, full_name) select hint"
      pattern: "from\\(\"org_members\"\\)[\\s\\S]*?profiles:user_id"

    - from: "src/app/api/invoices/[id]/route.ts (pm_users array)"
      to: "org_members + profiles join"
      via: "supabase.from('org_members') with profiles:user_id (id, full_name) select hint"
      pattern: "from\\(\"org_members\"\\)[\\s\\S]*?profiles:user_id"

    - from: "src/app/api/jobs/[id]/overview/route.ts (pms array)"
      to: "org_members + profiles join"
      via: "supabase.from('org_members') with profiles:user_id (id, full_name) select hint"
      pattern: "from\\(\"org_members\"\\)[\\s\\S]*?profiles:user_id"
---

# C-1 — Retire `public.users` legacy table + refactor 5 consumers

## Goal

Retire the `public.users` legacy identity table entirely per Wave-C EXPANDED-SCOPE + audit GAP item 20. The triple-identity-table state (`public.users` + `profiles` + `org_members`) is eliminated; the canonical identity path is `profiles + org_members` exclusively (with `auth.users` for Supabase Auth). All 5 src consumers refactored to read `profiles + org_members`; two FKs that currently point at `public.users(id)` are retargeted to `profiles(id)` BEFORE the `DROP TABLE`. Wave-B inherits a clean foundation with no legacy identity-table concerns.

## Source decisions (verbatim from authoritative sources)

> **GAP item 20** — `public.users` legacy table still actively read by 5 src files. Triple-identity-table state (`users` + `profiles` + `org_members`) introduces drift risk and undermines the canonical "employees-as-profiles+org_members" model in ENTITY-INVENTORY. F1 retirement work is medium-blast (5 file refactor); consider scheduling explicitly in Wave-A vs Wave-B decomposition.
>
> (`.planning/audits/2026-05-12-migration-inventory.md` line 635)

> **nwrp114 decision** — A-5 (public.users retirement) → DEFER to Wave-C. Reasoning: medium-blast refactor doesn't fit Wave-A's bounded-cleanup verdict. Document Wave-C scope: 5 src file refactors + public.users DROP after consumers cleared.
>
> (.planning/expansions/stage-f1-knowledge-graph-auth-wave-c-EXPANDED-SCOPE.md §Stated scope verbatim)

> **nwrp116 authorization** — Wave-C dispatch authorized; Option A sequencing (Wave-C before Wave-B per nwrp115 Item 2). Single-plan wave (Plan C-1 only).
>
> (`.planning/phases/stage-f1-knowledge-graph-auth-wave-c/CONTEXT.md` line 3)

---

## Pre-flight grep (REQUIRED at execute start)

Executor MUST run BEFORE editing any file:

```bash
grep -rnE 'from\("users"\)|public\.users' src/ --include="*.ts" --include="*.tsx"
```

**Planner-time grep result (2026-05-12, against current main):**

```
src/app/jobs/new/page.tsx:68:        .from("users")
src/app/invoices/queue/page.tsx:207: .from("users")
src/app/invoices/page.tsx:171: .from("users")
src/app/api/jobs/[id]/overview/route.ts:73:      supabase.from("users").select("id, full_name").in("role", ["pm", "admin"]).is("deleted_at", null).order("full_name")),
src/app/api/invoices/[id]/route.ts:109:      .from("users")
```

**Result: 5 src consumers — divergence from audit-expected set.**

| Audit-expected (GAP item 20) | Planner-time grep | Status |
|---|---|---|
| `src/app/platform-admin/users/page.tsx` | **NOT in grep set** | Already refactored to `profiles + org_members`; verified at planner-time (file reads from `profiles` line 22 + `org_members` line 41 — no `from("users")` calls). Confirms audit was authored when this file still read `users`; subsequent stage-1.5c work refactored it. NOT in scope for C-1. |
| `src/app/invoices/queue/page.tsx` | `:207` | In scope |
| `src/app/invoices/page.tsx` | `:171` | In scope |
| `src/app/api/invoices/[id]/route.ts` | `:109` | In scope |
| `src/app/jobs/new/page.tsx` | `:68` | In scope |
| — | `src/app/api/jobs/[id]/overview/route.ts:73` | **NEW finding** — not in audit-expected 5; absorbed into C-1 scope (same query pattern; would otherwise break `npm run build` after FK retarget if `from("users")` reads remained). |

**Net: 5 files refactored.** The composition of the 5 differs from the audit-expected set by one substitution (platform-admin/users already done; api/jobs/[id]/overview added). Per Wave-C EXPANDED-SCOPE AC #1, the executor MUST re-run the same grep at execute start; if the result differs (audit-expected 5 confirmed OR yet-another-file surfaces beyond these 5), HALT for Jake. The expected match (this 5-file set) is documented above.

---

## Pre-flight FK enumeration (REQUIRED at execute start)

Executor MUST verify all FK dependencies BEFORE applying migration:

```sql
-- Query for FKs referencing public.users
SELECT
  tc.table_schema AS source_schema,
  tc.table_name AS source_table,
  kcu.column_name AS source_column,
  ccu.table_schema AS target_schema,
  ccu.table_name AS target_table,
  ccu.column_name AS target_column,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_schema = 'public'
  AND ccu.table_name = 'users';
```

**Planner-time grep result (against `supabase/migrations/`):**

| FK | Migration | Line | Target column | ON DELETE |
|---|---|---|---|---|
| `invoices.assigned_pm_id → users(id)` | 00004 | 14 | `users(id)` | (no explicit clause; defaults to NO ACTION) |
| `org_workflow_settings.import_default_pm_id → public.users(id)` | 00036 | 72 | `public.users(id)` | `SET NULL` |

**These 2 FKs MUST be retargeted to `profiles(id)` BEFORE the DROP TABLE.** If the executor's `information_schema` query at execute time returns a THIRD FK not listed here, HALT for Jake — novel FK indicates an unaudited table dependency.

Note: `jobs.pm_id` is `UUID` without an FK constraint (verified via `00001_initial_schema.sql:21`), so it's unaffected. PostgREST relationship resolution for `jobs.pm_id → users` works via name-matching, not FK — but since `from("users")` reads are eliminated in this plan and `jobs.pm_id` is not retargeted (no FK to drop), there is no PostgREST work for that column.

---

## Scope inclusions

1. **SQL migration `00097_drop_public_users.sql`** that:
   - Retargets `invoices.assigned_pm_id` FK from `users(id)` to `profiles(id)`
   - Retargets `org_workflow_settings.import_default_pm_id` FK from `public.users(id)` to `profiles(id)` (preserves `ON DELETE SET NULL`)
   - `DROP TABLE public.users CASCADE` (cascades to the 3 RLS policies on public.users; no remaining FKs reference it after step 1)
2. **Reverse migration `00097_drop_public_users.down.sql`** that:
   - Restores `public.users` schema (NOT data; data lives in `auth.users + profiles`)
   - Reverts the 2 FK retargets to point back at `users(id)`
   - Restores RLS policies + indexes from cumulative state of 00004 + 00009 + 00016 + 00049
3. **5 src file refactors** to read `profiles + org_members` exclusively:
   - `src/app/jobs/new/page.tsx` (PM dropdown)
   - `src/app/invoices/queue/page.tsx` (PM filter dropdown)
   - `src/app/invoices/page.tsx` (PM filter dropdown)
   - `src/app/api/invoices/[id]/route.ts` (`pm_users` array via Promise.all)
   - `src/app/api/jobs/[id]/overview/route.ts` (PM list via Promise.all index 1)
4. **Smoke tests** of all 5 refactored surfaces against Drummond reference data.
5. **Pre-flight rowcount documented** in SUMMARY.md per AC-C1-06.

## Scope exclusions

- **No CLAUDE.md update.** Audit confirms `public.users` is not referenced as a documented entity in CLAUDE.md (planner-time grep confirms no `### users` heading or "users (legacy)" prose entry). The Stage 1.5c Information Architecture additions already reference the canonical `profiles + org_members` path. No documentation drift to repair.
- **No data migration / archive.** Per Wave-C EXPANDED-SCOPE AC #6, the data in `public.users` is redundant with `auth.users + profiles`. The 9 internal-team rows seeded in 00004 + 00007 have matching rows in `profiles` (verified by audit Section 3 + 00007:88 comment "other 8 users were seeded in migration 00004"). Pre-flight rowcount captured for posterity, but no row-level archive needed.
- **No activity_log entity_type changes.** `ActivityEntityType` TS union in `src/lib/activity-log.ts:35` includes `"user"` as an entity_type member. C-1 does NOT touch this — `'user'` may continue to be written for user-related events post-drop (resolves through `profiles` semantically). Wave-B Plan B-4 may revisit ENUM strategy.
- **No `jobs.pm_id` rework.** Column has no FK (verified via 00001:21). Refactor does not touch it; subsequent PM-resolution code paths that look up names via `pm_id` continue to work via `profiles.id === jobs.pm_id` identity equivalence.
- **No `auth.users` schema changes.** `auth.users` is Supabase Auth foundational; never modified per Wave-C EXPANDED-SCOPE §Out-of-scope.
- **No `profiles` or `org_members` schema changes.** Wave-B + F2 territory per CONTEXT.md.
- **No platform-admin/users/page.tsx work.** Already converted (planner-time verification: reads from `profiles` line 22 + `org_members` line 41 — no `from("users")` calls).

---

## Migration design rationale

### Why retarget the FKs instead of dropping them via CASCADE

`invoices.assigned_pm_id` references `users(id)` via FK named `invoices_assigned_pm_id_fkey` (from 00004:14). If we let `DROP TABLE public.users CASCADE` drop this FK:
- The column survives (FK is the constraint, not the column) but loses its referential semantics.
- PostgREST relationship resolution for `assigned_pm:assigned_pm_id (id, full_name)` in 3 src consumers BREAKS at runtime — PostgREST resolves named relationships through FK metadata.
- Even if we add an FK to `profiles(id)` afterward, doing so post-DROP requires the executor to manually re-stitch the relationship; the migration becomes 2-step + harder to roll back.

**Solution: retarget the FK BEFORE the DROP.** Single transaction:
1. `ALTER TABLE invoices DROP CONSTRAINT invoices_assigned_pm_id_fkey`
2. `ALTER TABLE invoices ADD CONSTRAINT invoices_assigned_pm_id_fkey FOREIGN KEY (assigned_pm_id) REFERENCES public.profiles(id)`
3. (same pattern for `org_workflow_settings.import_default_pm_id` with `ON DELETE SET NULL`)
4. `DROP TABLE public.users CASCADE` (only RLS policies + remaining indexes auto-cleanup)

This preserves the PostgREST relationship hint `assigned_pm:assigned_pm_id (id, full_name)` in the 3 client-side consumer files — they continue to resolve at runtime against `profiles` rows, which have `id` and `full_name` columns matching the existing schema.

### Why `ON DELETE SET NULL` only on import_default_pm_id

The original `org_workflow_settings.import_default_pm_id` FK (00036:72) explicitly carries `ON DELETE SET NULL`. The retarget MUST preserve this clause — semantic of "if PM is removed, fall back to no default."

The original `invoices.assigned_pm_id` FK (00004:14) has NO explicit `ON DELETE` clause; the Postgres default `NO ACTION` applies. The retarget preserves this default (no explicit clause needed; relies on `NO ACTION` semantics). Note: with `profiles.id` cascading from `auth.users.id ON DELETE CASCADE` (00007:16), an `auth.users` deletion will cascade through profiles and trigger NO ACTION blocking on `invoices.assigned_pm_id`. This is acceptable (a user with assigned invoices cannot be silently deleted; they must be explicitly handled). Wave-B may revisit if desired.

### Why CASCADE on DROP TABLE

After the FK retargets, the only remaining dependencies on `public.users` are:
- 3 RLS policies: `org isolation`, `users_delete_strict`, `users_platform_admin_read` (all from 00049:319-329)
- 2 RLS policies from 00009: `authenticated read users`, `admin write users` (00009:33-39)
- `users_org_id_fkey` constraint pointing FROM public.users TO organizations (00016:84) — auto-dropped with table
- 1 trigger if any (none verified in migration grep)

CASCADE is the correct operator. Without CASCADE, the DROP would fail with `cannot drop table users because other objects depend on it`. The auto-dropped objects are scoped to public.users itself — no sibling tables affected.

### Why not drop the column instead of retargeting

`invoices.assigned_pm_id` and `org_workflow_settings.import_default_pm_id` columns are POPULATED with real data (existing invoices have PM assignments; org settings store default PM). Dropping these columns would destroy operational data and break invoice-assignment + import-default features.

The FK retarget preserves all data (UUID values are identity-equivalent between `public.users.id` and `profiles.id` per 00007:5 design comment), preserves PostgREST relationships, and is reversible via the .down migration.

---

## Implementation tasks

### Task 1 — Pre-flight verification (REQUIRED before any edits)

**Path:** N/A (verification only)

**Action:** Executor MUST complete all steps before editing files.

**Step A — Grep verification:**

```bash
grep -rnE 'from\("users"\)|public\.users' src/ --include="*.ts" --include="*.tsx"
```

Expected output (5 file matches):
```
src/app/jobs/new/page.tsx:68:        .from("users")
src/app/invoices/queue/page.tsx:207: .from("users")
src/app/invoices/page.tsx:171: .from("users")
src/app/api/jobs/[id]/overview/route.ts:73:      supabase.from("users").select("id, full_name").in("role", ["pm", "admin"]).is("deleted_at", null).order("full_name")),
src/app/api/invoices/[id]/route.ts:109:      .from("users")
```

If output differs:
- More than 5 files → HALT for Jake
- Fewer than 5 files (audit-expected set surfaces, e.g. `platform-admin/users/page.tsx`) → proceed with actual matches; document in SUMMARY which files were already done

**Step B — Production rowcount:**

```sql
SELECT count(*) AS public_users_rowcount FROM public.users;
```

Document the count in SUMMARY.md. Expected: ~9-10 rows (8 from 00004 + 1 Andrew from 00007 + any subsequent additions). Compare against `SELECT count(*) FROM profiles` and `SELECT count(*) FROM org_members WHERE is_active=true`. If `public.users` count is FAR higher than profiles (e.g. 100+ rows when profiles has 9), HALT — historical data may have accreted.

**Step C — FK enumeration:**

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

Expected output (2 rows):
```
source_table             | source_column        | constraint_name                              | delete_rule
-------------------------+----------------------+----------------------------------------------+-------------
invoices                 | assigned_pm_id       | invoices_assigned_pm_id_fkey                 | NO ACTION
org_workflow_settings    | import_default_pm_id | org_workflow_settings_import_default_pm_id_fkey | SET NULL
```

(Constraint names may vary slightly depending on auto-generation; check the actual names in the query result and use those in the migration.)

If a THIRD FK appears in this enumeration that is not in the planner-time grep result, HALT for Jake — unaudited dependency.

**Verify:** All 3 steps documented in SUMMARY.md before proceeding to Tasks 2-7.

### Task 2 — Author migration `00097_drop_public_users.sql`

**Path:** `supabase/migrations/00097_drop_public_users.sql`

**Action:** Create new file with the following content.

```sql
-- Migration 00097: Retire public.users legacy identity table.
--
-- Source decision: GAP item 20 (.planning/audits/2026-05-12-migration-inventory.md
-- Section 5 line 584; line 635 risk analysis) + Wave-C EXPANDED-SCOPE
-- (.planning/expansions/stage-f1-knowledge-graph-auth-wave-c-EXPANDED-SCOPE.md)
-- + nwrp116 authorization.
--
-- Rationale: `public.users` is the pre-multi-tenant identity table from
-- migration 00004 (2025-Q2 era), seeded with 9 internal-team rows. It was
-- conceptually superseded by `profiles` (00007) + `org_members` (00016) but
-- left in place to avoid coordinated breakage during the multi-tenant
-- foundation work. F1-Wave-A audit (2026-05-12) identified 5 src files
-- still reading from this table; Wave-C Plan C-1 refactors those 5 files
-- to read `profiles + org_members` exclusively and then drops the table.
--
-- The 9-row legacy data is REDUNDANT with profiles (00007:88 docs the
-- equivalence: "profiles.id === auth.users.id === public.users.id"). No
-- data migration is needed; pre-flight rowcount documents the legacy
-- state for posterity but is not restored on rollback.
--
-- This migration is safe:
--   - Pre-flight FK enumeration (planner-time grep): only 2 FKs point at
--     public.users(id), both retargeted to profiles(id) BEFORE the DROP.
--   - PostgREST relationship `assigned_pm:assigned_pm_id (id, full_name)`
--     used in 3 src consumers (invoices/queue, invoices, api/invoices/[id])
--     continues to resolve via the retargeted FK to profiles.
--   - 5 src consumers refactored in the same plan (PR C-1).
--
-- Cascading effects (all expected, no action required):
--   - 5 RLS policies on public.users dropped (3 from 00049 + 2 from 00009).
--   - users_org_id_fkey constraint pointing FROM public.users TO
--     organizations (00016:84) — auto-dropped with table.
--   - Any remaining indexes on public.users — auto-dropped with table.
--
-- NOT affected (intentionally retained):
--   - auth.users (Supabase Auth foundational; never modified).
--   - profiles (00007) — the canonical identity entity.
--   - org_members (00016) — the role/membership-relation entity.
--   - All rows in invoices.assigned_pm_id + org_workflow_settings.
--     import_default_pm_id (UUIDs preserved; FK target switched).
--
-- Reversibility: `00097_drop_public_users.down.sql` recreates the table
-- schema (NOT data) and reverts the 2 FK retargets. Best-effort rollback;
-- the production audit log + invoice assignments are unaffected by either
-- direction (UUIDs are identity-equivalent between public.users and
-- profiles by 00007 design).
--
-- Pre-flight executor verification (run BEFORE applying this migration):
--   SELECT count(*) FROM public.users;  -- documented in SUMMARY.md
--   SELECT * FROM information_schema.referential_constraints WHERE
--     constraint_name LIKE '%users%';   -- expect 2 source FKs, retargeted below

BEGIN;

-- 1. Retarget invoices.assigned_pm_id FK from users(id) to profiles(id).
--    Original FK: invoices_assigned_pm_id_fkey from 00004:14.
--    ON DELETE: NO ACTION (default; preserved post-retarget — auth.users
--               deletion cascades to profiles.id, which then NO ACTIONs
--               on invoices.assigned_pm_id, blocking the cascade. This
--               matches the legacy semantic of "cannot silently lose PM
--               assignment on an invoice").
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_assigned_pm_id_fkey;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_assigned_pm_id_fkey
  FOREIGN KEY (assigned_pm_id) REFERENCES public.profiles(id);

-- 2. Retarget org_workflow_settings.import_default_pm_id FK from
--    public.users(id) to profiles(id).
--    Original FK: org_workflow_settings_import_default_pm_id_fkey from
--    00036:72.
--    ON DELETE: SET NULL (preserved — semantic "if PM is removed, fall
--               back to no default").
ALTER TABLE public.org_workflow_settings
  DROP CONSTRAINT IF EXISTS org_workflow_settings_import_default_pm_id_fkey;

ALTER TABLE public.org_workflow_settings
  ADD CONSTRAINT org_workflow_settings_import_default_pm_id_fkey
  FOREIGN KEY (import_default_pm_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Drop the table. CASCADE handles:
--    - 5 RLS policies on public.users (2 from 00009 + 3 from 00049).
--    - users_org_id_fkey constraint (FROM public.users TO organizations).
--    - Any remaining indexes on public.users.
-- nightwork: drop-justified
--   audit-evidence: .planning/audits/2026-05-12-migration-inventory.md GAP item 20
--   consumers-cleared: 5 src files refactored in PR C-1 (jobs/new + invoices/queue
--                      + invoices + api/invoices/[id] + api/jobs/[id]/overview)
--   fks-retargeted: 2 (invoices.assigned_pm_id + org_workflow_settings.import_default_pm_id)
DROP TABLE IF EXISTS public.users CASCADE;

COMMIT;
```

**Verification:**
- `psql -c "\dt public.users"` returns `no relation` post-migration
- `psql -c "\d public.invoices"` shows `assigned_pm_id` references `profiles(id)`
- `psql -c "\d public.org_workflow_settings"` shows `import_default_pm_id` references `profiles(id)`
- `pg_constraint` query returns 0 FKs targeting `public.users`

### Task 3 — Author reverse migration `00097_drop_public_users.down.sql`

**Path:** `supabase/migrations/00097_drop_public_users.down.sql`

**Action:** Create new file with restoration DDL. **Schema-only restore; no data reseed (per Wave-C EXPANDED-SCOPE).**

```sql
-- Reverse migration 00097: Restore public.users table.
--
-- WARNING: This recreates the `public.users` table SCHEMA only. The
-- forward migration captured pre-flight rowcount per Wave-C EXPANDED-SCOPE
-- AC #6; if a data-restore is required, hand-restore from the SUMMARY.md
-- rowcount + the corresponding auth.users + profiles + org_members rows
-- (which are unaffected by the forward migration). The original 9 internal-
-- team rows from 00004:18 + 00007:88 can be re-seeded by hand if needed,
-- but the canonical identity data lives in profiles post-Wave-C.
--
-- This .down.sql also reverts the 2 FK retargets:
--   - invoices.assigned_pm_id → users(id) (was profiles(id) post-up)
--   - org_workflow_settings.import_default_pm_id → public.users(id) (was profiles(id) post-up)
--
-- Restored state matches the cumulative state of 00004 + 00009 + 00016 + 00049
-- (the 4 forward migrations that touched public.users or its FKs/policies).
--
-- If running this .down on an environment that has not yet reached 00049,
-- the platform_admin RLS policies will overshoot. All Nightwork
-- environments (prod + preview + dev) are well past 00094 (Wave-A applied
-- 2026-05-12) so this is not a concern in practice.

BEGIN;

-- 1. Recreate public.users table (from 00004 base + 00016 org_id FK).
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'pm' CHECK (role IN ('admin', 'pm', 'accounting', 'owner')),
  org_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 2. Restore org_id FK to organizations (from 00016:84).
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_org_id_fkey;
ALTER TABLE public.users
  ADD CONSTRAINT users_org_id_fkey
  FOREIGN KEY (org_id) REFERENCES public.organizations(id);

-- 3. Restore RLS state (from 00009 + 00049).
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 00009 policies.
DROP POLICY IF EXISTS "authenticated read users" ON public.users;
CREATE POLICY "authenticated read users"
  ON public.users FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin write users" ON public.users;
CREATE POLICY "admin write users"
  ON public.users FOR ALL TO authenticated
  USING (app_private.user_role() = 'admin')
  WITH CHECK (app_private.user_role() = 'admin');

-- 00049 policies (cumulative end-state).
DROP POLICY IF EXISTS "org isolation" ON public.users;
CREATE POLICY "org isolation" ON public.users
  AS RESTRICTIVE FOR ALL
  USING (org_id = app_private.user_org_id() OR app_private.is_platform_admin())
  WITH CHECK (org_id = app_private.user_org_id());

DROP POLICY IF EXISTS "users_delete_strict" ON public.users;
CREATE POLICY "users_delete_strict" ON public.users
  AS RESTRICTIVE FOR DELETE
  USING (org_id = app_private.user_org_id());

DROP POLICY IF EXISTS "users_platform_admin_read" ON public.users;
CREATE POLICY "users_platform_admin_read" ON public.users
  FOR SELECT USING (app_private.is_platform_admin());

-- 4. Revert invoices.assigned_pm_id FK back to users(id).
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_assigned_pm_id_fkey;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_assigned_pm_id_fkey
  FOREIGN KEY (assigned_pm_id) REFERENCES public.users(id);

-- 5. Revert org_workflow_settings.import_default_pm_id FK back to public.users(id).
ALTER TABLE public.org_workflow_settings
  DROP CONSTRAINT IF EXISTS org_workflow_settings_import_default_pm_id_fkey;

ALTER TABLE public.org_workflow_settings
  ADD CONSTRAINT org_workflow_settings_import_default_pm_id_fkey
  FOREIGN KEY (import_default_pm_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Note: 9-row legacy data NOT reseeded. If a hard rollback to pre-Wave-C
-- behavior is required, re-run the seed SQL from 00004:17-26 + 00007:88 by
-- hand. The canonical identity data lives in profiles + auth.users (which
-- the up-migration did not touch).

COMMIT;
```

**Note re: .down.sql faithfulness:** Migrations 00004, 00009, 00016, and 00049 all touch `public.users` or its FKs/policies. This single `.down.sql` consolidates the cumulative end-state. Same overshoot caveat as Wave-A Plan A-3 .down.sql (T-C-1-05).

### Task 4 — Refactor `src/app/jobs/new/page.tsx`

**Path:** `src/app/jobs/new/page.tsx`

**Current state:** Lines 66-73 do a PM dropdown query.

```typescript
// Current (lines 66-73):
// Load PMs (and admins — both can manage jobs)
const { data: users } = await supabase
  .from("users")
  .select("id, full_name")
  .in("role", ["pm", "admin"])
  .is("deleted_at", null)
  .order("full_name");
if (users) setPms(users as PmUser[]);
```

**Refactor target:** Read from `org_members` joined to `profiles` (via PostgREST relationship hint), scoped to user's active org.

**Action:**

1. Insert query against `org_members` with role filter + `is_active=true` + `org_id` scoping, with `profiles:user_id (id, full_name)` select hint
2. Transform the nested result into the flat `{ id, full_name }` shape that `setPms` expects

**Diff preview:**

```typescript
// BEFORE (lines 66-73):
// Load PMs (and admins — both can manage jobs)
const { data: users } = await supabase
  .from("users")
  .select("id, full_name")
  .in("role", ["pm", "admin"])
  .is("deleted_at", null)
  .order("full_name");
if (users) setPms(users as PmUser[]);


// AFTER:
// Load PMs (and admins — both can manage jobs) via org_members + profiles.
// (Plan C-1 — public.users retirement; reads from canonical identity path
// per .planning/audits/2026-05-12-migration-inventory.md GAP item 20.)
const { data: members } = await supabase
  .from("org_members")
  .select("user_id, profiles:user_id (id, full_name)")
  .eq("org_id", membership.org_id)
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

**Note on `membership.org_id`:** The current handler reads `membership` from line 52-59 via `org_members.role` query. The refactor needs the org_id from the same source — extend the membership query to also select `org_id`:

```typescript
// Lines 52-59 BEFORE:
const { data: membership } = await supabase
  .from("org_members")
  .select("role")
  .eq("user_id", user.id)
  .eq("is_active", true)
  .order("created_at", { ascending: true })
  .limit(1)
  .maybeSingle();
if (!membership || !["admin", "owner"].includes(membership.role)) {
  setAuthorized(false);
  return;
}
setAuthorized(true);


// Lines 52-59 AFTER:
const { data: membership } = await supabase
  .from("org_members")
  .select("role, org_id")  // ← extended select
  .eq("user_id", user.id)
  .eq("is_active", true)
  .order("created_at", { ascending: true })
  .limit(1)
  .maybeSingle();
if (!membership || !["admin", "owner"].includes(membership.role)) {
  setAuthorized(false);
  return;
}
setAuthorized(true);
```

**Verify:** `grep -n 'from("users")\|from("org_members")' src/app/jobs/new/page.tsx` → 0 hits for users, 2 hits for org_members (membership + PM query).

### Task 5 — Refactor `src/app/invoices/queue/page.tsx`

**Path:** `src/app/invoices/queue/page.tsx`

**Current state:** Lines 204-211 do a PM filter dropdown query.

```typescript
// Current (lines 204-211):
supabase
  .from("users")
  .select("id, full_name")
  .in("role", ["pm", "admin"])
  .is("deleted_at", null)
  .order("full_name"),
```

This is inside `Promise.all([...])` at lines 197-213. The result is `pmResult`; the data is assigned to `setPmUsers(pmResult.data as PmUser[])` at line 238-239.

**Refactor target:** Same pattern as Task 4 — read from `org_members + profiles` scoped to user's org. The `org_id` is available from the existing `membership` query at lines 174-181 (note: this query currently selects only `role`; it must be extended to also select `org_id` analogous to Task 4).

**Action:**

1. Extend the membership query at lines 174-181 to also select `org_id`
2. Replace the `from("users")` query inside `Promise.all` with the org_members + profiles pattern, scoped to `membership.org_id`
3. Map the nested result into `{ id, full_name }[]` shape that `setPmUsers` expects

**Diff preview (Promise.all PM query):**

```typescript
// BEFORE (lines 174-181 + 197-213):
const { data: membership } = await supabase
  .from("org_members")
  .select("role")
  .eq("user_id", user.id)
  .eq("is_active", true)
  .order("created_at", { ascending: true })
  .limit(1)
  .maybeSingle();
role = (membership?.role as typeof role) ?? null;
setCurrentRole(role);

// ...

const [invoiceResult, pmResult, settingsResult] = await Promise.all([
  supabase
    .from("invoices")
    .select(
      "id, vendor_name_raw, vendor_id, ..., assigned_pm:assigned_pm_id (id, full_name)"
    )
    .in("status", ["pm_review", "ai_processed", "pm_held", "pm_denied", "info_requested"])
    .is("deleted_at", null)
    .order("received_date", { ascending: true }),
  supabase
    .from("users")
    .select("id, full_name")
    .in("role", ["pm", "admin"])
    .is("deleted_at", null)
    .order("full_name"),
  fetch("/api/workflow-settings").then((r) => (r.ok ? r.json() : null)).catch(() => null),
]);

// ...

if (!pmResult.error && pmResult.data) {
  setPmUsers(pmResult.data as PmUser[]);
}


// AFTER:
const { data: membership } = await supabase
  .from("org_members")
  .select("role, org_id")  // ← extended select
  .eq("user_id", user.id)
  .eq("is_active", true)
  .order("created_at", { ascending: true })
  .limit(1)
  .maybeSingle();
role = (membership?.role as typeof role) ?? null;
setCurrentRole(role);
const orgId = membership?.org_id ?? null;

// ...

const [invoiceResult, pmResult, settingsResult] = await Promise.all([
  supabase
    .from("invoices")
    .select(
      "id, vendor_name_raw, vendor_id, ..., assigned_pm:assigned_pm_id (id, full_name)"
    )
    .in("status", ["pm_review", "ai_processed", "pm_held", "pm_denied", "info_requested"])
    .is("deleted_at", null)
    .order("received_date", { ascending: true }),
  // PM dropdown sourced from org_members + profiles (Plan C-1 — public.users
  // retirement; see .planning/audits/2026-05-12-migration-inventory.md GAP item 20)
  orgId
    ? supabase
        .from("org_members")
        .select("user_id, profiles:user_id (id, full_name)")
        .eq("org_id", orgId)
        .eq("is_active", true)
        .in("role", ["pm", "admin"])
    : Promise.resolve({ data: null, error: null }),
  fetch("/api/workflow-settings").then((r) => (r.ok ? r.json() : null)).catch(() => null),
]);

// ...

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

**Note re: PostgREST relationship `assigned_pm:assigned_pm_id (id, full_name)` in line 201:** This relationship hint resolves via FK metadata. The retarget in migration 00097 (Task 2) points the FK at `profiles(id)`, so PostgREST will now resolve `assigned_pm` against `profiles` instead of `users`. The select hint shape `(id, full_name)` matches columns that exist on both tables; no code change needed. Verify at smoke test time.

**Verify:** `grep -n 'from("users")\|from("org_members")' src/app/invoices/queue/page.tsx` → 0 hits for users, 2 hits for org_members.

### Task 6 — Refactor `src/app/invoices/page.tsx`

**Path:** `src/app/invoices/page.tsx`

**Current state:** Lines 170-175 do a PM filter dropdown query inside Promise.all.

```typescript
// Current (lines 170-175):
supabase
  .from("users")
  .select("id, full_name")
  .in("role", ["pm", "admin"])
  .is("deleted_at", null)
  .order("full_name"),
```

The result is `pmResult.data`; assigned to `setPmUsers(pmResult.data as PmUser[])` at line 206.

**Notable difference vs. queue page:** `invoices/page.tsx` does NOT currently have a membership query — there's no auth pre-flight that fetches the user's `org_id`. The Promise.all at line 152 runs without explicit org scoping (relies on RLS).

**Refactor target:** Same `org_members + profiles` pattern. Two implementation options:

- **Option A (consistent with queue):** Add an explicit `supabase.auth.getUser()` + `org_members.org_id` pre-flight before the Promise.all, scope the PM query by `org_id`.
- **Option B (RLS-trust):** Rely on RLS to scope `org_members` to the user's org. Since `org_members` RLS policy enforces `org_id = app_private.user_org_id()` (or similar; verified at execute time), the query returns only the user's org's members.

**Decision: Option B (RLS-trust).** Rationale:
1. The original `from("users")` query also relied on RLS for org scoping (no explicit org_id filter); the refactor preserves the same trust model.
2. Adding an explicit auth pre-flight + org_id fetch would change the page-load latency profile (one more round-trip before Promise.all kicks off).
3. The org-isolation RLS policy on `org_members` from 00016 is the canonical defense; defense-in-depth at the explicit filter level is a Wave-B+ concern if desired.

**Caveat:** This means the refactor for `invoices/page.tsx` differs slightly from `invoices/queue/page.tsx` (Task 5). If plan-review prefers strict consistency (always-explicit org_id filter), promote to Option A.

**Action:**

1. Replace the `from("users")` query inside `Promise.all` with the org_members + profiles pattern, NO explicit org_id filter (RLS scopes)
2. Map the nested result into `{ id, full_name }[]` shape

**Diff preview:**

```typescript
// BEFORE (lines 170-175):
supabase
  .from("users")
  .select("id, full_name")
  .in("role", ["pm", "admin"])
  .is("deleted_at", null)
  .order("full_name"),


// AFTER:
// PM dropdown sourced from org_members + profiles (Plan C-1 — public.users
// retirement; see .planning/audits/2026-05-12-migration-inventory.md GAP item 20).
// Org isolation enforced by RLS on org_members (00016 + 00049 policies).
supabase
  .from("org_members")
  .select("user_id, profiles:user_id (id, full_name)")
  .eq("is_active", true)
  .in("role", ["pm", "admin"]),
```

**And the result-shape mapping (line 206):**

```typescript
// BEFORE:
if (!pmResult.error && pmResult.data) setPmUsers(pmResult.data as PmUser[]);


// AFTER:
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

**Note re: PostgREST `assigned_pm:assigned_pm_id (id, full_name)` in lines 148-149 (INVOICES_FULL + INVOICES_MINIMAL):** Same as Task 5 — relationship hint resolves via retargeted FK to `profiles`; no code change needed in those select strings.

**Verify:** `grep -n 'from("users")\|from("org_members")' src/app/invoices/page.tsx` → 0 hits for users, 1 hit for org_members.

### Task 7 — Refactor `src/app/api/invoices/[id]/route.ts`

**Path:** `src/app/api/invoices/[id]/route.ts`

**Current state:** Lines 108-114 do a PM list query inside Promise.all for the GET handler.

```typescript
// Current (lines 108-114, inside Promise.all at line 93):
supabase
  .from("users")
  .select("id, full_name")
  .in("role", ["pm", "admin"])
  .is("deleted_at", null)
  .order("full_name"),
```

The result is `pmUsersRes.data` → returned as `pm_users: pmUsersRes.data ?? []` at line 152.

**Refactor target:** Same `org_members + profiles` pattern. This is a server-side API route with `membership.org_id` already in scope (line 69 has `orgId = membership.org_id`).

**Action:**

1. Replace the `from("users")` query inside Promise.all with org_members + profiles, scoped explicitly by `orgId`
2. Map the result into `{ id, full_name }[]` shape

**Diff preview:**

```typescript
// BEFORE (lines 108-114):
supabase
  .from("users")
  .select("id, full_name")
  .in("role", ["pm", "admin"])
  .is("deleted_at", null)
  .order("full_name"),


// AFTER:
// PM list sourced from org_members + profiles (Plan C-1 — public.users
// retirement; see .planning/audits/2026-05-12-migration-inventory.md GAP item 20).
supabase
  .from("org_members")
  .select("user_id, profiles:user_id (id, full_name)")
  .eq("org_id", orgId)
  .eq("is_active", true)
  .in("role", ["pm", "admin"]),
```

**And the result-shape mapping at line 152:**

```typescript
// BEFORE (line 152):
pm_users: pmUsersRes.data ?? [],


// AFTER:
pm_users: ((pmUsersRes.data ?? []) as Array<{ user_id: string; profiles: { id: string; full_name: string } | { id: string; full_name: string }[] | null }>)
  .map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return profile && profile.id && profile.full_name
      ? { id: profile.id, full_name: profile.full_name }
      : null;
  })
  .filter((p): p is { id: string; full_name: string } => p !== null)
  .sort((a, b) => a.full_name.localeCompare(b.full_name)),
```

**Note re: PostgREST `assigned_pm:assigned_pm_id (id, full_name, role)` at line 78:** This relationship hint in the GET handler's main invoice query also resolves via the FK retarget. Note the hint requests `role` — `profiles.role` exists (00007:19 — `TEXT CHECK (role IN ('admin', 'pm', 'accounting'))`), so the select hint works post-FK-retarget. Smoke verify.

**Verify:**
- `grep -n 'from("users")\|from("org_members")' src/app/api/invoices/[id]/route.ts` → 0 hits for users, 1 hit for org_members
- TypeScript build passes (the result-shape mapping needs the cast to match the existing `pm_users` consumer in `src/app/invoices/[id]/page.tsx`)

### Task 8 — Refactor `src/app/api/jobs/[id]/overview/route.ts`

**Path:** `src/app/api/jobs/[id]/overview/route.ts`

**Current state:** Lines 72-73 do a PM list query inside the existing Promise.all batch.

```typescript
// Current (lines 72-73):
timed("job-overview", "users.pm_admin", false,
  supabase.from("users").select("id, full_name").in("role", ["pm", "admin"]).is("deleted_at", null).order("full_name")),
```

The result is the second entry in the Promise.all destructure at line 58: `usersRes`. Used at line 197: `pms: usersRes.data ?? []`.

**Refactor target:** Same pattern. Server-side route with `orgId = membership.org_id` already in scope (line 50). Already has a second `org_members` join elsewhere in the batch (lines 108-111 for activity-feed name resolution) — pattern is already established in this file.

**Note re: existing org_members query at lines 108-111:** This existing query returns `org_members + profiles:user_id (id, full_name)` scoped to `org_id` for ALL active members (no role filter). The PM list at lines 72-73 needs the `role IN ('pm','admin')` filter. Two implementation options:

- **Option A:** Add a new `org_members` query with the role filter (effectively the same query the queue/list pages use, just server-side).
- **Option B:** Reuse the existing query result (`orgProfilesRes` at line 65/108) and filter in TypeScript for `role IN ('pm','admin')` — but the existing query doesn't select `role` on org_members.

**Decision: Option A.** Rationale:
1. Adding a new Promise.all entry preserves the parallelism profile (no waterfall).
2. Reusing the existing query requires extending its select to also fetch role, plus a TS-side filter — added complexity for no parallelism benefit since both queries run in the same batch.
3. The `timed` wrapper for perf-logging is preserved.

**Action:**

1. Replace the `from("users")` query inside `timed(...)` with the org_members + profiles pattern, scoped by orgId with role filter
2. Map the result-shape at line 197

**Diff preview:**

```typescript
// BEFORE (lines 72-73):
timed("job-overview", "users.pm_admin", false,
  supabase.from("users").select("id, full_name").in("role", ["pm", "admin"]).is("deleted_at", null).order("full_name")),


// AFTER:
// PM list sourced from org_members + profiles (Plan C-1 — public.users
// retirement; see .planning/audits/2026-05-12-migration-inventory.md GAP item 20).
timed("job-overview", "org_members.pm_admin", false,
  supabase.from("org_members")
    .select("user_id, profiles:user_id (id, full_name)")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .in("role", ["pm", "admin"])),
```

**And the result-shape mapping at line 197:**

```typescript
// BEFORE (line 197):
pms: usersRes.data ?? [],


// AFTER:
pms: ((usersRes.data ?? []) as Array<{ user_id: string; profiles: { id: string; full_name: string } | { id: string; full_name: string }[] | null }>)
  .map((m) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return profile && profile.id && profile.full_name
      ? { id: profile.id, full_name: profile.full_name }
      : null;
  })
  .filter((p): p is { id: string; full_name: string } => p !== null)
  .sort((a, b) => a.full_name.localeCompare(b.full_name)),
```

**Optional rename:** The destructured variable name `usersRes` at line 58 is now semantically inaccurate (no longer reading from users). Executor MAY rename to `pmsRes` for clarity; not required.

**Verify:**
- `grep -n 'from("users")\|from("org_members")' src/app/api/jobs/[id]/overview/route.ts` → 0 hits for users, 2 hits for org_members (the new PM query + the existing activity-feed query at line 109)
- Endpoint returns the same `pms: [{id, full_name}]` shape so the consumer at `src/app/jobs/[id]/page.tsx` (verified at planner-time: does NOT need changes — already consumes a flat array)

---

## Acceptance criteria

| ID | Acceptance criterion |
|---|---|
| AC-C1-01 | Pre-flight grep at execute start (`grep -rnE 'from\("users"\)\|public\.users' src/ --include="*.ts" --include="*.tsx"`) enumerates the exact 5-file consumer set documented in §Pre-flight grep. If output differs, executor HALTs for Jake. |
| AC-C1-02 | Pre-flight FK enumeration (information_schema query in §Pre-flight FK enumeration) returns exactly 2 FKs targeting `public.users`: `invoices.assigned_pm_id` + `org_workflow_settings.import_default_pm_id`. If a 3rd FK surfaces, executor HALTs for Jake. |
| AC-C1-03 | Migration 00097 applied successfully: `\dt public.users` returns no relation; `\d public.invoices` shows `assigned_pm_id REFERENCES public.profiles(id)`; `\d public.org_workflow_settings` shows `import_default_pm_id REFERENCES public.profiles(id) ON DELETE SET NULL`. |
| AC-C1-04 | All 5 src consumers refactored: `grep -rnE 'from\("users"\)\|public\.users' src/ --include="*.ts" --include="*.tsx"` returns 0 hits post-refactor. |
| AC-C1-05 | Smoke tests pass on all 5 refactored UI surfaces against Drummond reference data (PM names render correctly; dropdowns + filters list expected PMs; assigned_pm name shown in queue + invoices list + detail page). If Chrome MCP unavailable, smoke deferral documented in SUMMARY.md with grep-level evidence. |
| AC-C1-06 | Pre-flight `SELECT count(*) FROM public.users` rowcount documented in SUMMARY.md. Documented alongside `SELECT count(*) FROM profiles` + `SELECT count(*) FROM org_members WHERE is_active=true` for posterity comparison. |
| AC-C1-07 | `npm run build` + `npx tsc --noEmit` pass with zero errors. Drummond grep gate (.githooks/pre-commit) silent on the committed diff. |
| AC-C1-08 | Harness Layer 1 (DB integrity + RLS coverage) PASS post-migration — no advisor flag re: orphan FK on `invoices.assigned_pm_id` or `org_workflow_settings.import_default_pm_id`; Drummond gate (full E2E walk) PASS. |

---

## Verification commands

Run all in repo root after executor completes the 8 tasks above.

```bash
# 1. TypeScript clean.
npx tsc --noEmit
# Expect: 0 errors. If profile-mapping result-shape mismatches PmUser type, here.

# 2. Build clean.
npm run build
# Expect: success.

# 3. Migration applies cleanly on a fresh dev db.
# (Migration apply is orchestrator-side per CONTEXT.md execution_envelope — gsd-executor
# does NOT have mcp__supabase__apply_migration; migration apply is batched at GATE-C halt
# or done by orchestrator after plan execute clean.)

# Once applied, verify:
psql "$DATABASE_URL" -c "\dt public.users"
# Expect: no relation
psql "$DATABASE_URL" -c "\d public.invoices" | grep assigned_pm_id
# Expect: line shows REFERENCES profiles(id)
psql "$DATABASE_URL" -c "\d public.org_workflow_settings" | grep import_default_pm_id
# Expect: line shows REFERENCES profiles(id), ON DELETE SET NULL

# 4. No residual code refs to public.users table.
grep -rnE 'from\("users"\)|public\.users' src/ --include="*.ts" --include="*.tsx"
# Expect: 0 hits.

# 5. Pre-flight rowcount (documented in SUMMARY.md).
psql "$DATABASE_URL" -c "SELECT count(*) FROM public.users;"
# Expect: 8-10 rows historically. Compare against:
psql "$DATABASE_URL" -c "SELECT count(*) FROM public.profiles;"
psql "$DATABASE_URL" -c "SELECT count(*) FROM public.org_members WHERE is_active=true;"

# 6. Harness Layer 1.
npm run harness:layer-1
# Expect: PASS. No advisor regression re: orphan FK.

# 7. Drummond gate.
npm run harness:drummond-gate
# Expect: full Drummond walk passes. PM names render correctly across all 5
# refactored surfaces.

# 8. Spot-check: 5 UI surfaces (Chrome MCP if available).
#    - /jobs/new → PM dropdown lists Drummond org PMs + admins
#    - /invoices/queue → PM filter dropdown + assigned_pm names per row
#    - /invoices → PM filter dropdown + assigned_pm names per row
#    - /invoices/[id] (detail) → assigned_pm name + role rendered
#    - /jobs/[id] (overview) → financial-bar + pms list intact
```

---

## Dependencies

- **After Wave-A** (migrations 00094 + 00095 + 00096 applied) — confirmed by Wave-A A-1 SUMMARY status: complete, executed 2026-05-12.
- **Before Wave-B** — per nwrp116 Option A sequencing. Wave-B Plan B-1a (Clients entity + jobs.client_id FK) does NOT need to coordinate with `public.users` retirement; the drop happens first.
- **Single-plan wave; no intra-wave dependencies.** All 5 file refactors land together with the migration; typecheck only passes once the FK retargets + code refactors are atomic.

---

## Rollback strategy

### Quick rollback (PR not yet merged)

`git revert <commit-sha>`. No DB state to recover — migration not yet applied.

### Mid-flight rollback (migration applied; PR not yet shipped)

```bash
# Reverse the migration.
psql "$DATABASE_URL" -f supabase/migrations/00097_drop_public_users.down.sql

# Revert the src commits.
git revert <C-1-refactor-commit-sha>

# Verify schema restored.
psql "$DATABASE_URL" -c "\dt public.users"   # → present
psql "$DATABASE_URL" -c "\d public.invoices" | grep assigned_pm_id   # → REFERENCES users(id)

# Rebuild + harness.
npm run build && npm run harness:layer-1
```

### Post-ship rollback (PR merged, deployed to production)

Same as mid-flight, coordinated via Jake. The `.down.sql` restores SCHEMA only; the 9-row legacy data is NOT reseeded (data is redundant with profiles + auth.users which are unaffected). If a hard restore of public.users data is needed, hand-restore from 00004:17-26 + 00007:88 seed SQL.

**The most likely rollback trigger** is a downstream consumer that we missed during planning. The pre-commit grep gate at step (4) of §Verification commands is the first line of defense. Harness Layer 1 + Drummond gate are the second. If a 6th `from("users")` consumer surfaces post-deploy, file a hotfix.

---

## Risk register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| C1-R1 | A 6th src consumer of `public.users` exists that grep missed (e.g. dynamic SQL via .rpc(), non-standard quoting, file outside src/). | Low | Medium (build fail post-migration or runtime PostgREST failure) | Pre-flight grep at execute start uses exact same regex as planner-time grep; result documented. Step (4) of §Verification commands greps post-refactor. If a 6th file surfaces between plan-author and execute time, executor HALTs per AC-C1-01. |
| C1-R2 | The PostgREST relationship `assigned_pm:assigned_pm_id (id, full_name)` doesn't auto-resolve to `profiles` post-FK-retarget (Supabase caches FK metadata; some environments may need a relationship-cache nudge). | Low | High (3 src surfaces render Unassigned for every invoice) | Smoke test on Drummond invoice list verifies the relationship resolves. If broken, Supabase Studio API Settings → "Reload schema cache" + redeploy. Documented in T-C-1-02 mitigation. |
| C1-R3 | The PostgREST `(id, full_name, role)` hint in api/invoices/[id]/route.ts line 78 fails because the FK now points at profiles, but `profiles.role` has a stricter CHECK constraint than `users.role` (00004: `'admin', 'pm', 'accounting', 'owner'`; 00007: `'admin', 'pm', 'accounting'` — `'owner'` MISSING). | Low | Low | Existing assigned_pm_id values point at users with role 'admin'/'pm' typically. Smoke verify the invoice detail page renders the role correctly. If `owner` PMs exist in the database, the join still works (PostgREST returns the row even though `profiles.role` is constrained — only INSERTS/UPDATES enforce the check). Wave-B may revisit. |
| C1-R4 | Row-shape mapping `Array.isArray(m.profiles) ? m.profiles[0] : m.profiles` returns null for some rows because PostgREST relationship resolution failed for that row (e.g. orphan org_members row with no matching profile). | Low | Low (graceful — null profiles filtered out, dropdown is shorter but functional) | The `.filter((p): p is PmUser => p !== null)` skip handles this. No runtime error. Profile-less org_members rows are operational anomalies anyway; logged for future cleanup. |
| C1-R5 | `.down.sql` overshoots when applied on a pre-00049 environment. | Very Low | Negligible | Same as Wave-A Plan A-3 .down.sql risk A3-R4. All Nightwork environments are well past 00094. Documented in T-C-1-05 mitigation. |
| C1-R6 | An RLS regression: the new `org_members + profiles:user_id` join in client-side surfaces fails due to RLS policy interaction. | Very Low | Medium (PM dropdowns render empty) | Existing pattern (verified in src/lib/notifications.ts and platform-admin/users/page.tsx) confirms the join works against current RLS policies. Harness Layer 1 RLS-coverage check verifies post-merge. |
| C1-R7 | The decision to use Option B (RLS-trust) in Task 6 invoices/page.tsx vs Option A (explicit org_id filter) in Tasks 5+7+8 introduces a defense-in-depth inconsistency. | Low | Low (architectural smell, not a leak) | Documented in Task 6 §Decision. Plan-review may promote to Option A for strict consistency; planner default is Option B per "least-change-from-existing-pattern" rule. If plan-review overrides, Task 6 absorbs the additional pre-flight membership query. |

---

## Open questions

> Surfaced for plan-review. Each carries a default resolution that the
> executor is authorized to apply unless plan-review overrides.

**OPEN-QUESTION-1 — Audit-vs-grep divergence: was `platform-admin/users/page.tsx` ever a consumer?**

The audit (`.planning/audits/2026-05-12-migration-inventory.md` GAP item 20 + Wave-C EXPANDED-SCOPE.md preliminary file list) explicitly lists `src/app/platform-admin/users/page.tsx` as one of the 5 consumers. Planner-time grep finds 0 `from("users")` calls in that file; it reads from `profiles` (line 22) + `org_members` (line 41) only.

**Hypothesis:** The audit was authored at a snapshot where the file still read `users`; subsequent Stage 1.5c IA work refactored it (the Stage 1.5c additions in CLAUDE.md mention `/admin/platform/users` routes specifically).

**Default resolution:** Document in SUMMARY.md that the audit-expected set divergged from execute-time grep by 1 file (platform-admin/users.tsx already done; api/jobs/[id]/overview added). Proceed with the actual 5-file set. The wave's `provides:` clause + AC-C1-04 (grep-clean post-refactor) still satisfies the intent of GAP item 20.

**OPEN-QUESTION-2 — Should we keep the `assigned_pm:assigned_pm_id (id, full_name)` PostgREST relationship hint, or refactor to an explicit second-query join?**

Three src files use this relationship hint (queue, invoices, api/invoices/[id]). The FK retarget (Task 2 step 1) makes the hint resolve via `profiles` instead of `users`. Two concerns:

1. PostgREST schema-cache may need a nudge post-FK-retarget for the relationship to resolve cleanly. (Mitigation: T-C-1-02; smoke test verifies.)
2. The hint relies on a runtime-resolved relationship name, which is brittle. An explicit second-query join (fetch invoices, then fetch profiles by assigned_pm_id UUIDs) is more explicit but more code.

**Default resolution:** Keep the relationship hint as-is (minimal-change-from-existing). The hint shape `(id, full_name)` is preserved; PostgREST resolves the relationship via FK metadata which we explicitly retarget. If smoke test reveals the relationship doesn't resolve post-FK-retarget, executor falls back to explicit two-query join (documented as a follow-up in SUMMARY.md). Wave-B may revisit the brittleness concern.

**OPEN-QUESTION-3 — Should we keep `"user"` in the `ActivityEntityType` TS union?**

The audit + Wave-C EXPANDED-SCOPE.md do NOT direct the planner to touch `ActivityEntityType`. Plan-author confirms (via grep at line 35 of `src/lib/activity-log.ts`): `"user"` is a current union member, used by callers that audit user-related events (verified: no `entity_type: "user"` writes found in src/ at planner-time, so the member is currently unused in writes — but it's defined for future use).

**Default resolution:** Do NOT touch `ActivityEntityType` in this plan. Post-drop, the union member is semantically valid: future "user" entity events would refer to `profiles + auth.users` (which are unaffected). Wave-B Plan B-4 may rewire if needed.

**OPEN-QUESTION-4 — `org_workflow_settings.import_default_pm_id` ON DELETE semantic divergence.**

Pre-retarget: `ON DELETE SET NULL` against `public.users(id)`. If a user is soft-deleted in `public.users` (sets `deleted_at`), this FK does NOT fire (`ON DELETE` triggers on actual deletion, not soft-delete).

Post-retarget: `ON DELETE SET NULL` against `profiles(id)`. Since `profiles.id` cascades from `auth.users.id ON DELETE CASCADE`, an `auth.users` deletion cascades to `profiles` deletion, which then triggers the SET NULL on `org_workflow_settings.import_default_pm_id`. This is actually MORE robust than the pre-retarget behavior (which would have left `import_default_pm_id` pointing at a soft-deleted user).

**Default resolution:** This is a semantic improvement, not a regression. Document in SUMMARY.md as a minor side-effect.

---

## Verification by reviewer agents

Per Wave-C EXPANDED-SCOPE.md §Halt gates, the following lightweight plan-review reviewers should validate C-1 post-authoring:

- **nightwork-architect** — verifies the FK-retarget-before-drop strategy is sound; verifies no Wave-B blast radius spillover.
- **database-reviewer** — verifies migration 00097 is clean: FK retargets are well-formed (preserve ON DELETE semantics); CASCADE is well-scoped; no orphan FK post-apply; .down.sql faithfulness vs. parallel-environment risk.
- **security-reviewer** — verifies tenant boundary preserved on all 5 refactored read paths; verifies T-C-1-03 (assigned_pm dropdown does not leak cross-org PMs); verifies T-C-1-04 (legacy activity_log rows remain resolvable via profiles).
- **nightwork-data-migration-safety** — verifies forward + backward idempotent; verifies pre-flight rowcount + FK enumeration gates; validates the schema-only restore policy in .down.sql.

Wave-C QA scope (post-execute) — same reviewers as above, plus:
- **nightwork-spec-checker** — verifies all 8 acceptance criteria met
- **nightwork-custodian** — sweeps for .planning/ drift (e.g., ENTITY-INVENTORY.md should not list `public.users` as a standalone entity post-merge; audit's "actively read by 5 src files" claim is now stale + can be retired)

---

## Notes for executor

1. **Pre-flight first.** Tasks 1A + 1B + 1C MUST complete before any other task. If pre-flight reveals divergence from planner expectation (different file count, novel FK), HALT for Jake per AC-C1-01 / AC-C1-02.

2. **Single PR.** Author the SQL migration + 5 src-file refactors as a single PR. Do NOT split into multiple PRs — the typecheck only passes once the FK retargets + code refactors are atomic. If split, the post-migration build against `from("users")` reads would 500 (table missing); the post-refactor build against the old FK would also fail.

3. **Migration apply timing.** Per CONTEXT.md execution_envelope: gsd-executor does NOT have `mcp__supabase__apply_migration` exposed. Migration apply will be done by orchestrator after plan execute clean (or batched at GATE-C halt). Executor commits the migration files; orchestrator applies. Do NOT block on apply in the executor session.

4. **Commit message structure.** Use one commit per logical change:
   - `feat(stage-f1-wave-c): migration 00097 retire public.users + retarget 2 FKs`
   - `refactor(stage-f1-wave-c): jobs/new PM dropdown → org_members + profiles`
   - `refactor(stage-f1-wave-c): invoices/queue PM filter → org_members + profiles`
   - `refactor(stage-f1-wave-c): invoices PM filter → org_members + profiles`
   - `refactor(stage-f1-wave-c): api/invoices/[id] pm_users → org_members + profiles`
   - `refactor(stage-f1-wave-c): api/jobs/[id]/overview pms → org_members + profiles`

   This sequencing keeps `git bisect` useful if a later regression traces back to C-1. (Note: the commit template in the kickoff brief shows a single combined commit; the multi-commit approach above is the planner's recommendation for bisect-friendliness. If executor prefers single commit per nwrp116 atomic-commit posture, that is acceptable.)

5. **Post-merge audit-log spot check.** After deploy, query `SELECT count(*) FROM activity_log WHERE entity_type = 'user'` once. Document the count in OVERNIGHT-LOG.md. (Non-blocking; informational; relates to T-C-1-04.)

6. **Sentry / log monitoring.** Tail Sentry for 24h post-deploy for any caller invoking the 5 refactored surfaces — the refactor should be invisible to consumers, but the change touches PM-name rendering across many high-traffic pages.

7. **Pre-commit hook discipline (per CLAUDE.md updated rule).** NEVER `--no-verify` without Jake authorization. If `.githooks/pre-commit` Drummond gate fires on the committed diff, HALT for Jake. Drummond gate should be silent — no Drummond references in any modified file (verified at plan-author time: all 5 src files + 2 migration files do not contain Drummond identifiers).

---

*Authored by gsd-planner per nwrp116 Wave-C autonomous plan-authoring envelope. Awaiting plan-review halt before executor dispatch.*
