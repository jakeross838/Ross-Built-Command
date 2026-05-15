---
phase: stage-f1-knowledge-graph-auth-wave-b
plan: B-D080
plan-name: fk-convention-migration
type: execute
wave: B-Slice-1
depends_on: []
autonomous: true
halt_after: false
requires_smoke: false
threat_model_severity: low
status: AUTHORED
authored: 2026-05-15
authored_by: gsd-planner subagent (claude-opus-4-7[1m])
authorization: nwrp152 dispatch + nwrp153 EXPANDED-SCOPE approval
source_decisions:
  - "D-080 (primary; codifies the FK convention matrix this migration applies — see MASTER-PLAN.md §10:256)"
  - "D-078 (parent convention; auth.users default + profiles for display embeds; PostgREST PII fence — see MASTER-PLAN.md §10:252)"
requirements: []
files_modified:
  - supabase/migrations/00099_user_identity_fk_convention.sql
  - supabase/migrations/00099_user_identity_fk_convention.down.sql
files_referenced:
  - supabase/migrations/00097_drop_public_users.sql
  - supabase/migrations/00098_add_org_members_profiles_fk.sql
  - .planning/MASTER-PLAN.md
  - .planning/decisions-resolved/2026-05-15-user-identity-fk-convention-BRIEF.md
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-b-EXPANDED-SCOPE.md
  - .planning/lessons.md
sequence:
  before: B-1a (migration 00100 — clients table needs auth.users-FK on clients.created_by per D-080 convention from creation)
  parallel_authoring_ok: true
  parallel_execute_ok: false
parallel_execute_ok: false
files_modified_intersection:
  with_B_1a: []
  with_B_1b: []
acceptance-criteria-target: 8
threat_model:
  trust_boundaries:
    - "Postgres pg_constraint catalog (DDL boundary; service-role MCP-execute crosses it)"
    - "PostgREST schema cache reload (NOTIFY pgrst; runtime boundary)"
  threats:
    - id: T-BD080-01
      category: tampering
      component: "DDL execution path (supabase MCP execute_sql)"
      disposition: mitigate
      mitigation: "Fail-loud orphan-FK assertion (DO $$ block) aborts the transaction before any ALTER TABLE ADD CONSTRAINT runs if pre-flight inventory drift surfaces orphan rows. ADD CONSTRAINT without IF NOT EXISTS is the Wave-C/Wave-D fail-loud convention — silent re-application is impossible. Compound git form on commit; .githooks/pre-commit Drummond gate runs unconditionally."
    - id: T-BD080-02
      category: information_disclosure
      component: "orphan probe SQL output (executor stdout)"
      disposition: mitigate
      mitigation: "Probe SQL returns COUNT(*) integers only — never row values or UUIDs. Plan-author-time probe ran via PostgREST select (UUID values held in JS Set; logged only as counts + first-8-char-prefix samples when count > 0). Execute-time probe (DO $$ block) RAISE EXCEPTION carries integer counts only; no UUID leakage."
    - id: T-BD080-03
      category: denial_of_service
      component: "ALTER TABLE ADD CONSTRAINT lock posture"
      disposition: accept
      mitigation: "Per 00098 lock-posture comment: ADD CONSTRAINT FOREIGN KEY takes SHARE ROW EXCLUSIVE on the source table + validates every existing row. Current scale (largest table = invoices at ~11 rows post-Wave-E) is sub-millisecond. Reconsider NOT VALID + VALIDATE pattern when any source table > 10k rows. Low risk at current Ross Built scale."
    - id: T-BD080-04
      category: repudiation
      component: "audit-trail durability (CC7.2)"
      disposition: mitigate
      mitigation: "All 11 FKs declare ON DELETE NO ACTION (NOT CASCADE / NOT SET NULL). Deletion of an auth.users row will be BLOCKED with a clear FK-violation error if any audit row references it. Production posture per CLAUDE.md is soft-delete only; this FK posture aligns with that posture and prevents silent audit-trail loss via accidental hard-delete."
must_haves:
  truths:
    - "An ALTER on auth.users to remove a user that has an audit row in any of 10 covered tables raises FK violation, never silently orphans"
    - "An ALTER on profiles to remove a user that has a jobs.pm_id reference raises FK violation, never silently orphans"
    - "B-1a (next plan, migration 00100) can declare clients.created_by REFERENCES auth.users(id) ON DELETE NO ACTION per D-080 convention with no precedent ambiguity"
    - "pg_constraint catalog has 11 new FK rows post-apply (10 confrelid=auth.users + 1 confrelid=public.profiles)"
    - "Plan-review iter-1 mechanical FK citation check (Rule 2) passes — each new constraint name is grep-able in migration body"
  artifacts:
    - path: "supabase/migrations/00099_user_identity_fk_convention.sql"
      provides: "11 ALTER TABLE ADD CONSTRAINT FOREIGN KEY statements + fail-loud orphan probe DO $$ block + NOTIFY pgrst schema reload"
      min_lines: 90
      contains: "CONSTRAINT change_orders_created_by_fkey,CONSTRAINT draws_created_by_fkey,CONSTRAINT draws_approved_by_fkey,CONSTRAINT invoices_created_by_fkey,CONSTRAINT invoices_duplicate_dismissed_by_fkey,CONSTRAINT jobs_created_by_fkey,CONSTRAINT lien_releases_created_by_fkey,CONSTRAINT parser_corrections_corrected_by_fkey,CONSTRAINT purchase_orders_created_by_fkey,CONSTRAINT vendors_created_by_fkey,CONSTRAINT jobs_pm_id_profiles_fkey,RAISE EXCEPTION,NOTIFY pgrst"
    - path: "supabase/migrations/00099_user_identity_fk_convention.down.sql"
      provides: "11 ALTER TABLE DROP CONSTRAINT IF EXISTS statements + NOTIFY pgrst"
      min_lines: 30
      contains: "DROP CONSTRAINT IF EXISTS change_orders_created_by_fkey,DROP CONSTRAINT IF EXISTS draws_created_by_fkey,DROP CONSTRAINT IF EXISTS draws_approved_by_fkey,DROP CONSTRAINT IF EXISTS invoices_created_by_fkey,DROP CONSTRAINT IF EXISTS invoices_duplicate_dismissed_by_fkey,DROP CONSTRAINT IF EXISTS jobs_created_by_fkey,DROP CONSTRAINT IF EXISTS lien_releases_created_by_fkey,DROP CONSTRAINT IF EXISTS parser_corrections_corrected_by_fkey,DROP CONSTRAINT IF EXISTS purchase_orders_created_by_fkey,DROP CONSTRAINT IF EXISTS vendors_created_by_fkey,DROP CONSTRAINT IF EXISTS jobs_pm_id_profiles_fkey"
  key_links:
    - from: "00099 forward migration"
      to: "00099 down migration"
      via: "constraint-name reversibility"
      pattern: "the 11 names declared in the forward migration MUST match the 11 names dropped in the down migration"
    - from: "D-080 decision matrix"
      to: "migration body comments"
      via: "per-column rationale citation"
      pattern: "every ALTER TABLE ADD CONSTRAINT carries a one-line comment naming the column purpose (audit / workflow-audit / functional)"
    - from: "Rule 2 (PostgREST FK citation requirement)"
      to: "must_haves.artifacts.contains list"
      via: "grep-gate mechanical assertion"
      pattern: "plan-review iter-1 greps the migration body for each of the 11 constraint names; absence = BLOCKING"
---

<objective>
Ship migration 00099 — eleven FK constraints anchoring the 11 currently-NO_FK user-identity-pattern UUID columns to their D-080-matrix targets (10 → auth.users, 1 → profiles). This is the codification step for D-080 (committed to MASTER-PLAN.md §10:256 on 2026-05-15), and the foundation for B-1a (migration 00100) which will declare clients.created_by REFERENCES auth.users(id) per the same convention.

Purpose: Close Wave-B prereq #10 by translating the locked decision matrix into pg_constraint catalog rows. Cement audit-trail durability (CC7.2) by anchoring identity at auth.users with ON DELETE NO ACTION on every audit column. Cement processing integrity (PI1.1) on jobs.pm_id by linking the column to profiles so the existing PostgREST display-embed pattern (mirrors invoices.assigned_pm_id from Wave-C 00097) resolves through a real FK relationship — unlocking a Wave 1.1-Lite polish opportunity to replace the current secondary-query pattern on jobs/[id]/page.tsx with the embed-resolution pattern Wave-D shipped on org_members.

Output: Two new files in supabase/migrations/ (00099_user_identity_fk_convention.sql + .down.sql) committed under a single atomic git commit. No source code outside supabase/migrations/ changes. No data migration (pure schema). No row updates. Pre-flight orphan probe runs at plan-author time (this plan; ran 2026-05-15 — see §4 below) AND at execute time (DO $$ block in the migration body); both gate on 0 orphans.
</objective>

<execution_context>
@C:/Users/Jake/nightwork-platform/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Jake/nightwork-platform/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/MASTER-PLAN.md
@.planning/decisions-resolved/2026-05-15-user-identity-fk-convention-BRIEF.md
@.planning/expansions/stage-f1-knowledge-graph-auth-wave-b-EXPANDED-SCOPE.md
@.planning/lessons.md
@supabase/migrations/00097_drop_public_users.sql
@supabase/migrations/00098_add_org_members_profiles_fk.sql
@supabase/migrations/00098_add_org_members_profiles_fk.down.sql
@CLAUDE.md

<interfaces>
<!-- D-080 matrix (CANONICAL per MASTER-PLAN.md §10:256). The 11 column → target rows below are normative; the migration body adds exactly these 11 FK constraints. -->

D-080 FK matrix:

```
# Target: auth.users(id) ON DELETE NO ACTION (10 columns)
change_orders.created_by
draws.created_by
draws.approved_by              -- carved out from dual-FK speculation; F6 may add parallel profiles FK later
invoices.created_by
invoices.duplicate_dismissed_by
jobs.created_by
lien_releases.created_by
parser_corrections.corrected_by  -- NOT NULL column; orphans (if any) would require backfill from auth.users or audit-aware row delete (HALT path)
purchase_orders.created_by
vendors.created_by

# Target: profiles(id) ON DELETE NO ACTION (1 column)
jobs.pm_id                     -- mirrors invoices.assigned_pm_id Wave-C 00097 pattern; display-embedded on jobs/[id]/page.tsx
```

FK naming convention (per Wave-C 00097 + Wave-D 00098 precedent):
- auth.users target → `<source_table>_<source_column>_fkey` (e.g. `invoices_created_by_fkey`)
- profiles target → `<source_table>_<source_column>_profiles_fkey` (e.g. `jobs_pm_id_profiles_fkey`)

The single profiles FK (`jobs_pm_id_profiles_fkey`) uses the distinct-target suffix per Wave-D 00098 precedent (`org_members_user_id_profiles_fkey`); this disambiguates from any future hypothetical `jobs_pm_id_fkey` that might be added against auth.users.

Pre-flight orphan probe basis: profile-not-found surrogate via PostgREST + service role. Valid because D-078 §1 documents the 1:1 invariant `profiles.id === auth.users.id` (migration 00007 ON DELETE CASCADE from auth.users; signup-trigger populates profiles synchronously). Plan-author-time probe ran 2026-05-15 against production Supabase project egxkffodxcefwpqmwrur; result in §4.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Re-run orphan probe via Supabase MCP at execute time</name>
  <files>(none — read-only probe via mcp__supabase__execute_sql)</files>
  <action>
Run the 11-row UNION ALL orphan probe (SQL below) via mcp__supabase__execute_sql BEFORE writing the migration files. The probe is identical to the body's pre-flight DO $$ block but returns count rows for inspection rather than raising. Execute-time probe MUST return 0 for every row.

Probe SQL (run as a single execute_sql call):

```sql
SELECT 'change_orders.created_by' AS col, COUNT(*) AS orphan_count
FROM public.change_orders t
WHERE t.created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.created_by)
UNION ALL
SELECT 'draws.created_by', COUNT(*) FROM public.draws t
WHERE t.created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.created_by)
UNION ALL
SELECT 'draws.approved_by', COUNT(*) FROM public.draws t
WHERE t.approved_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.approved_by)
UNION ALL
SELECT 'invoices.created_by', COUNT(*) FROM public.invoices t
WHERE t.created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.created_by)
UNION ALL
SELECT 'invoices.duplicate_dismissed_by', COUNT(*) FROM public.invoices t
WHERE t.duplicate_dismissed_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.duplicate_dismissed_by)
UNION ALL
SELECT 'jobs.created_by', COUNT(*) FROM public.jobs t
WHERE t.created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.created_by)
UNION ALL
SELECT 'jobs.pm_id', COUNT(*) FROM public.jobs t
WHERE t.pm_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = t.pm_id)
UNION ALL
SELECT 'lien_releases.created_by', COUNT(*) FROM public.lien_releases t
WHERE t.created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.created_by)
UNION ALL
SELECT 'parser_corrections.corrected_by', COUNT(*) FROM public.parser_corrections t
WHERE t.corrected_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.corrected_by)
UNION ALL
SELECT 'purchase_orders.created_by', COUNT(*) FROM public.purchase_orders t
WHERE t.created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.created_by)
UNION ALL
SELECT 'vendors.created_by', COUNT(*) FROM public.vendors t
WHERE t.created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.created_by)
ORDER BY 1;
```

HALT conditions:
- Any row returns orphan_count > 0 — escalate to Jake. Decision per-column: NULL-out (for nullable columns) OR audit-aware backfill from auth.users (for parser_corrections.corrected_by which is NOT NULL — cannot NULL-out). DO NOT proceed with migration body authoring until Jake resolves.
- Probe fails to execute at all (MCP error, schema unreachable) — HALT, surface to Jake.
- Counts diverge from plan-author-time probe result by more than what could be explained by ~minutes of activity (any non-zero count when plan-author probe showed 0).

If probe returns 11 rows all with orphan_count = 0 — log the result to commit body, proceed to Task 2.
  </action>
  <verify>
    <automated>Probe returns exactly 11 rows; SUM of orphan_count across all 11 rows == 0. JSON-shape check: jq '[.[] | .orphan_count // 0] | add' &lt;&lt;&lt; "$mcp_response" returns "0".</automated>
  </verify>
  <done>Execute-time orphan probe result captured in working memory; sum == 0; ready to author migration body.</done>
</task>

<task type="auto">
  <name>Task 2: Author 00099_user_identity_fk_convention.sql (forward migration)</name>
  <files>supabase/migrations/00099_user_identity_fk_convention.sql</files>
  <action>
Author the forward migration as a single atomic BEGIN/COMMIT transaction. Style + structure mirrors migration 00098 (Wave-D extension). Components in order:

1. **Header comment block** (~60 lines) — cite:
   - Source decisions: D-080 (primary; codification matrix), D-078 (parent convention)
   - Decision brief: .planning/decisions-resolved/2026-05-15-user-identity-fk-convention-BRIEF.md
   - EXPANDED-SCOPE: stage-f1-knowledge-graph-auth-wave-b-EXPANDED-SCOPE.md
   - Wave-C origin migration 00097 (split convention introduction)
   - Wave-D extension migration 00098 (org_members.user_id dual-FK precedent)
   - SOC2 mapping: CC6.1 / CC7.2 / PI1.1 (inherited from D-078; restate explicitly here)
   - draws.approved_by carve-out: auth.users-only for now; F6 may add parallel profiles FK if G702 signature block needs PostgREST display embed
   - jobs.pm_id PostgREST embed refactor opportunity: documented for Wave 1.1-Lite polish (NOT done in slice — out of scope)
   - Pre-flight executor-verification comments (post-apply): `SELECT conname, conrelid::regclass, confrelid::regclass FROM pg_constraint WHERE conname LIKE '%_created_by_fkey' OR conname IN ('draws_approved_by_fkey', 'invoices_duplicate_dismissed_by_fkey', 'parser_corrections_corrected_by_fkey', 'jobs_pm_id_profiles_fkey');` (expect 11 rows)
   - Lock-posture note (mirror 00098 header): ADD CONSTRAINT FOREIGN KEY takes SHARE ROW EXCLUSIVE on each source table + validates every existing row; at Ross Built scale (largest source = invoices at ~11 rows post-Wave-E) sub-millisecond; reconsider NOT VALID + VALIDATE pattern if any source > 10k rows
   - Index posture: no new indexes; all 11 source columns either already indexed OR cardinality too low to matter at current scale; PK on auth.users.id + profiles.id provides referenced-side coverage
   - Constraint-naming convention: `<source_table>_<source_column>_fkey` for auth.users target (Postgres auto-naming convention; mirrors invoices_created_by_fkey-style precedent); `<source_table>_<source_column>_profiles_fkey` for the single profiles target (mirrors org_members_user_id_profiles_fkey from 00098)
   - ON DELETE NO ACTION rationale: defensive guard against accidental hard-delete; production posture per CLAUDE.md is soft-delete only; this FK posture aligns; matches 00098 rationale verbatim

2. **BEGIN;**

3. **Fail-loud orphan-FK assertion (DO $$ block)** — mirrors 00097 Step 0 + 00098 Step 0. Counts orphans across all 11 columns; RAISE EXCEPTION with per-column counts if any > 0. Implementation: 11 SELECT COUNT(*) INTO v_orphan_<col> statements followed by IF (any > 0) THEN RAISE EXCEPTION with a single formatted message naming each column's count. Format: `Pre-flight: orphan FK values detected: change_orders.created_by=%, draws.created_by=%, ... jobs.pm_id=%. Aborting before FK add.`. Use `auth.users` for the 10 auth.users-target columns, `public.profiles` for jobs.pm_id.

4. **10 × auth.users ALTER TABLE ADD CONSTRAINT statements** — one per row of the D-080 matrix, in alphabetical-by-table order:
   - `ALTER TABLE public.change_orders ADD CONSTRAINT change_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;`
   - `ALTER TABLE public.draws ADD CONSTRAINT draws_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE NO ACTION;`
   - `ALTER TABLE public.draws ADD CONSTRAINT draws_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;`
   - `ALTER TABLE public.invoices ADD CONSTRAINT invoices_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;`
   - `ALTER TABLE public.invoices ADD CONSTRAINT invoices_duplicate_dismissed_by_fkey FOREIGN KEY (duplicate_dismissed_by) REFERENCES auth.users(id) ON DELETE NO ACTION;`
   - `ALTER TABLE public.jobs ADD CONSTRAINT jobs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;`
   - `ALTER TABLE public.lien_releases ADD CONSTRAINT lien_releases_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;`
   - `ALTER TABLE public.parser_corrections ADD CONSTRAINT parser_corrections_corrected_by_fkey FOREIGN KEY (corrected_by) REFERENCES auth.users(id) ON DELETE NO ACTION;`
   - `ALTER TABLE public.purchase_orders ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;`
   - `ALTER TABLE public.vendors ADD CONSTRAINT vendors_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;`

   Each statement preceded by a one-line `-- <table>.<column>: <purpose>` comment (audit / workflow-audit / AI-learning audit / etc. per brief §2 purposes column).

5. **1 × profiles ALTER TABLE ADD CONSTRAINT statement** — at end of the 11-block list:
   - `ALTER TABLE public.jobs ADD CONSTRAINT jobs_pm_id_profiles_fkey FOREIGN KEY (pm_id) REFERENCES public.profiles(id) ON DELETE NO ACTION;`

   Preceded by an extended comment explaining: PostgREST display-embed target (jobs/[id]/page.tsx renders PM full_name); mirrors invoices.assigned_pm_id pattern (00097); jobs.pm_id consumer refactor opportunity for Wave 1.1-Lite (currently uses secondary query).

6. **NOTIFY pgrst, 'reload schema';** — mirrors 00098 belt-and-suspenders posture. Eliminates the race-window between DDL commit and PostgREST cache pickup. Particularly important for jobs_pm_id_profiles_fkey (the FK that enables future embed-resolution).

7. **COMMIT;**

8. **Post-apply executor-verification comments** (mirror 00097 + 00098 trailing block) — listing the 11 expected pg_constraint rows + a sample PostgREST query against the profiles-FK to verify embed-resolution works.

NO ON DELETE clause variations between the 11 statements — all NO ACTION. (Per D-080 matrix § "all use ON DELETE NO ACTION".)

NO IF NOT EXISTS guards on ADD CONSTRAINT — Wave-C/Wave-D fail-loud convention (per 00097 iter-2 MED-C1-5: name mismatch fails loudly rather than silently).

Constraint-existence sanity check INSIDE the DO $$ block (defense-in-depth): before the orphan check, query pg_constraint for each of the 11 names; RAISE EXCEPTION if ANY already exists. This catches the case where the migration is partially applied (e.g. crash mid-transaction in a prior aborted run leaves a constraint behind — unlikely but defensive).

Target line count: 130-160 lines.
  </action>
  <verify>
    <automated>cat supabase/migrations/00099_user_identity_fk_convention.sql | grep -c "ADD CONSTRAINT" returns 11; grep -c "DROP CONSTRAINT" returns 0; grep -c "ON DELETE NO ACTION" returns 11; grep -c "RAISE EXCEPTION" returns &gt;= 1; grep -c "NOTIFY pgrst" returns 1.</automated>
  </verify>
  <done>Forward migration file exists with 11 ADD CONSTRAINT statements (10 auth.users + 1 profiles), pre-flight DO $$ orphan probe, NOTIFY pgrst, BEGIN/COMMIT wrapper, full header + post-apply verification comments.</done>
</task>

<task type="auto">
  <name>Task 3: Author 00099_user_identity_fk_convention.down.sql (reverse migration)</name>
  <files>supabase/migrations/00099_user_identity_fk_convention.down.sql</files>
  <action>
Author the down migration. Style mirrors 00098.down.sql (single DROP CONSTRAINT IF EXISTS per constraint).

Structure:

1. **Header comment** — explain: reverses 00099; idempotent (IF EXISTS guards); WARNING that applying the down without coordinated revert of any consumer code paths that rely on the FK (none today — jobs.pm_id PostgREST embed refactor was deferred to Wave 1.1-Lite, so no production consumer currently relies on these FKs — but document for future).

2. **BEGIN;**

3. **11 × ALTER TABLE DROP CONSTRAINT IF EXISTS** statements — one per forward-migration constraint, same alphabetical-by-table order:
   - `ALTER TABLE public.change_orders DROP CONSTRAINT IF EXISTS change_orders_created_by_fkey;`
   - `ALTER TABLE public.draws DROP CONSTRAINT IF EXISTS draws_approved_by_fkey;`
   - `ALTER TABLE public.draws DROP CONSTRAINT IF EXISTS draws_created_by_fkey;`
   - `ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_created_by_fkey;`
   - `ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_duplicate_dismissed_by_fkey;`
   - `ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_created_by_fkey;`
   - `ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_pm_id_profiles_fkey;`
   - `ALTER TABLE public.lien_releases DROP CONSTRAINT IF EXISTS lien_releases_created_by_fkey;`
   - `ALTER TABLE public.parser_corrections DROP CONSTRAINT IF EXISTS parser_corrections_corrected_by_fkey;`
   - `ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_created_by_fkey;`
   - `ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS vendors_created_by_fkey;`

4. **NOTIFY pgrst, 'reload schema';** — match forward migration's belt-and-suspenders posture.

5. **COMMIT;**

Target line count: 40-60 lines.
  </action>
  <verify>
    <automated>cat supabase/migrations/00099_user_identity_fk_convention.down.sql | grep -c "DROP CONSTRAINT IF EXISTS" returns 11; grep -c "ADD CONSTRAINT" returns 0; grep -c "NOTIFY pgrst" returns 1.</automated>
  </verify>
  <done>Down migration file exists with 11 DROP CONSTRAINT IF EXISTS statements, NOTIFY pgrst, BEGIN/COMMIT wrapper, header warning.</done>
</task>

<task type="auto">
  <name>Task 4: Apply migration 00099 via Supabase MCP execute_sql + verify post-apply</name>
  <files>(none — DDL execution + verification queries via mcp__supabase__execute_sql)</files>
  <action>
Apply the forward migration by running its body via mcp__supabase__execute_sql. The MCP execute path takes raw SQL — pass the body of 00099_user_identity_fk_convention.sql (everything between BEGIN; and COMMIT; inclusive, OR run as a single string starting at BEGIN).

After apply, run the post-apply verification queries:

1. **Constraint inventory query** (asserts 11 FKs exist):
   ```sql
   SELECT conname, conrelid::regclass::text AS source_table, confrelid::regclass::text AS target_table
   FROM pg_constraint
   WHERE conname IN (
     'change_orders_created_by_fkey',
     'draws_approved_by_fkey',
     'draws_created_by_fkey',
     'invoices_created_by_fkey',
     'invoices_duplicate_dismissed_by_fkey',
     'jobs_created_by_fkey',
     'jobs_pm_id_profiles_fkey',
     'lien_releases_created_by_fkey',
     'parser_corrections_corrected_by_fkey',
     'purchase_orders_created_by_fkey',
     'vendors_created_by_fkey'
   )
   ORDER BY conname;
   ```
   Expected: 11 rows; 10 have `target_table='users'` (with `confnamespace='auth'` — surface in `\d` form via `confrelid::regclass::text` includes schema like `auth.users`); 1 has `target_table='profiles'` (`jobs_pm_id_profiles_fkey`).

2. **ON DELETE NO ACTION assertion** (asserts FK behavior per D-080):
   ```sql
   SELECT conname, confdeltype
   FROM pg_constraint
   WHERE conname IN (... 11 names ...);
   ```
   Expected: 11 rows, all confdeltype='a' ('a' = NO ACTION; 'c' = CASCADE; 'n' = SET NULL; 'r' = RESTRICT; 'd' = SET DEFAULT).

3. **jobs.pm_id PostgREST embed sanity check** (Rule 1 — runtime verification ≠ schema verification):
   ```sql
   -- Verify the new jobs_pm_id_profiles_fkey is in pg_constraint (already covered in query 1)
   -- THEN re-confirm PostgREST schema cache has reloaded by issuing a REST call
   -- (separate from execute_sql; surface via curl in the verification commands block below)
   ```

If any of the 3 queries returns unexpected results, HALT and roll back via Supabase MCP apply of 00099_user_identity_fk_convention.down.sql.
  </action>
  <verify>
    <automated>Query 1 returns exactly 11 rows; 10 with target_table='auth.users' + 1 with target_table='public.profiles' (jobs_pm_id_profiles_fkey). Query 2 returns 11 rows, all confdeltype='a'. SQL execution exits cleanly with no errors.</automated>
  </verify>
  <done>Migration 00099 applied; pg_constraint shows 11 new rows; all confdeltype='a'; ready for git commit.</done>
</task>

<task type="auto">
  <name>Task 5: Commit migration files via compound git form</name>
  <files>(none — git operations only)</files>
  <action>
Commit the two new migration files in a single atomic commit using the compound `git add ... && git commit` form per nwrp133 codification (CLAUDE.md Development Rules).

Commands:

```bash
git add supabase/migrations/00099_user_identity_fk_convention.sql supabase/migrations/00099_user_identity_fk_convention.down.sql && git commit -m "$(cat <<'EOF'
feat(stage-f1-wave-b): B-D080 — migration 00099 user-identity FK convention codification

Adds 11 FK constraints per D-080 matrix (MASTER-PLAN.md §10:256):
- 10 columns → auth.users(id) ON DELETE NO ACTION (audit + workflow-audit + AI-learning audit)
- 1 column → profiles(id) ON DELETE NO ACTION (jobs.pm_id; mirrors invoices.assigned_pm_id Wave-C 00097 pattern)

Pre-flight orphan probe at plan-author time AND execute time: 0 orphans across all 11
columns (PASS). Compound git form per CLAUDE.md "Commit mechanism transparency" rule.
Hook gates honored (Drummond pre-commit + Claude-Bash pre-commit).

source_decisions: D-080 (primary), D-078 (parent convention)
SOC2: CC6.1 (access controls) + CC7.2 (audit-trail durability) + PI1.1 (PostgREST display embed)
Wave-B prereq #10 SATISFIED by this commit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

DO NOT use `--no-verify`. If a hook fails (Drummond grep gate OR Claude-Bash hook), HALT per CLAUDE.md "Never `--no-verify` without Jake's explicit authorization" rule. Investigate the failure; fix the root cause; re-commit with a NEW commit (NOT --amend).

Verify clean commit via `git status` — expect "nothing to commit, working tree clean" + the new commit appears in `git log -1 --format='%H %s'`.

DO NOT push to origin/main. Push is a separate authorization (per CLAUDE.md "Never push to the remote repository unless the user explicitly asks").
  </action>
  <verify>
    <automated>git log -1 --format='%H %s' | grep -E "^[a-f0-9]{40} feat\(stage-f1-wave-b\): B-D080" returns 1 line; git status --short returns empty; git diff HEAD~1 HEAD --name-only returns exactly the two migration file paths.</automated>
  </verify>
  <done>Single atomic commit on local main branch with both migration files; working tree clean; ready for plan-review iter-1 + downstream B-1a dispatch.</done>
</task>

</tasks>

<!-- ====================================================================== -->
<!-- DETAILED CONTEXT SECTIONS (per nwrp152 plan-author contract)            -->
<!-- ====================================================================== -->

<why_now_and_dependencies>

**Why first in slice.** D-080 codifies the FK convention matrix for the 11 NO_FK user-identity-pattern UUID columns enumerated in the decision brief. B-1a (the next plan in Wave-B-Slice-1) will introduce a new `clients` table with `clients.created_by` REFERENCES auth.users(id) ON DELETE NO ACTION applied AT CREATION TIME — meaning B-1a's migration 00100 incorporates D-080 convention directly into its CREATE TABLE statement. For that convention to be unambiguous when B-1a authors run their migration, D-080 must already be visible in the migration catalog: by 00099 establishing the precedent in pg_constraint, B-1a's clients.created_by FK is simply "following the established pattern" rather than "introducing the pattern alongside a new table." This sequencing eliminates an entire class of review ambiguity ("is clients.created_by the *first* application of D-080, or is it conforming to D-080?").

**Why DB-only and no smoke.** This plan touches zero source code outside `supabase/migrations/`. No route shape, no content section, no H1 text, no PostgREST hint adoption (the jobs.pm_id embed-refactor opportunity is documented for Wave 1.1-Lite, NOT executed here). Per `requires_smoke: false` posture: smoke harness baseline (Wave-B prereq #12) is unchanged by this migration. The plan-review iter-1 mechanical smoke-gate check will verify that the harness baseline at the post-commit state matches the TD-WE-03 baseline set (≤2 failures).

**Why parallel-authoring OK, parallel-execute NOT OK.** Per nwrp152 sequencing: B-D080 authors at the same time as B-1a + B-1b (all 3 in parallel by sibling subagents in this dispatch). Execute is strictly sequential: B-D080 commits first (this migration 00099); B-1a executes second (migration 00100; clients schema needs the FK convention established); B-1b executes third (KG scaffold depends on B-1a's clients table existing for types generation). Plan-author-time files_modified intersection check confirms zero overlap between B-D080 (migrations 00099) + B-1a (migration 00100 + fixture insert) + B-1b (scaffold + types + harness extensions, NO migrations).

**Codified dependencies in frontmatter:**
- `depends_on: []` — B-D080 has no in-slice predecessors (first plan in Slice-1).
- `sequence.before: B-1a` — informs the orchestrator that B-1a's execute must wait for B-D080's commit.
- `parallel_execute_ok: false` — explicit per Rule 5 (files_modified intersection check): even though the file-set is disjoint from B-1a, the SEMANTIC dependency (clients.created_by FK convention precedent) forces sequential execute.

</why_now_and_dependencies>

<pre_flight_downstream_consumer_sweep>

Per `.planning/lessons.md` 2026-05-15 entry — "Architectural decisions changing route shape require downstream consumer sweep at plan-author time." The sweep is mandatory in pre-flight verification.

**Sweep target categories (per lessons.md mechanical procedure):**

1. **Route surface changes:** N/A. This migration changes zero route paths. No `src/middleware.ts` impact. No `next.config.*` impact. No `scripts/wave-d-smoke.ts` impact.

2. **Content section changes:** N/A. No JSX, no HTML, no h1/h2/section markup changes.

3. **H1 text changes:** N/A.

4. **PostgREST embed surface adoption** (additional sweep for FK-introducing migrations): The migration creates `jobs_pm_id_profiles_fkey` which would *enable* the embed `select=...,pm:profiles(id, full_name)` on jobs queries — but this plan does NOT add or modify any embed adoption. Documented as a Wave 1.1-Lite TD opportunity (per nwrp153 Q6 decision: DEFER consumer refactor). Sweep result: no current consumer relies on this embed; introducing it here would activate a no-consumer FK. Acceptable per D-080 convention (precedent: org_members_user_id_profiles_fkey from 00098 had no consumer at apply time; D-1 consumer refactor followed in the same wave).

5. **Documentation pin sweep** (CLAUDE.md, MASTER-PLAN.md, ARCHITECTURE.md):
   - `CLAUDE.md` line 95 (Architecture Rules "User-identity FK convention split") cites the 56/3 post-Wave-D census. This migration shifts census to 66/4 (10 new auth.users + 1 new profiles). Per nwrp152 closing line — "the brief's §10 D-080 entry already documents 66/4 census post-codification" — CLAUDE.md update is NOT in this plan's scope (sweep result: documentation pin will be addressed by `nightwork-custodian` post-ship sweep OR by a follow-up TD entry). Plan-review iter-1 may flag this as a known-and-deferred discrepancy with explicit rationale.
   - `MASTER-PLAN.md §10:256` (D-080 entry itself) — already documents 66/4 census. No update needed.
   - `.planning/architecture/ARCHITECTURE.md` §SOC2 control mapping — references CC6.1/CC7.2/PI1.1 mapping for D-078; D-080 inherits the mapping (per MASTER-PLAN.md §10:256 explicit "inherited from D-078" wording). No mapping update needed.

6. **Agent prompt references** (`.claude/agents/*.md`): grep for `created_by` and `pm_id` references that pin to "no FK" or "NO_FK" state.
   - Plan-author-time grep: `grep -r "NO_FK" .claude/agents/ 2>/dev/null` — expect zero hits at plan-author time (the brief authored 2026-05-14 was committed but agents don't reference the brief verbatim).

**Sweep RESULT:** N/A across all 6 categories. DB-only migration; no route / content / H1 / consumer-embed / documentation / agent-prompt impact in this slice. Sweep is documented here per nwrp152 discipline contract (the result is explicitly "no impact" rather than implicit silence — establishing the pattern for future plan-authors per the lessons.md reinforcement directive).

Plan-review iter-1 MAY mechanically re-run categories 1-6 against the committed migration files; expectation: same N/A result.

</pre_flight_downstream_consumer_sweep>

<pre_flight_orphan_probe_result>

**Plan-author-time orphan probe run: 2026-05-15 — RESULT: 0 orphans across all 11 columns. GATE: PASS.**

Probe ran via Node + PostgREST service-role against production Supabase project `egxkffodxcefwpqmwrur`. Probe basis: profile-not-found surrogate (valid per D-078 §1 documented 1:1 invariant `profiles.id === auth.users.id`).

| # | Column | FK target | Rows with value | Distinct FK UUIDs | Orphans |
|---|--------|-----------|-----------------|-------------------|---------|
| 1 | change_orders.created_by | auth.users | 0 | 0 | 0 |
| 2 | draws.created_by | auth.users | 0 | 0 | 0 |
| 3 | draws.approved_by | auth.users | 0 | 0 | 0 |
| 4 | invoices.created_by | auth.users | 11 | 1 | 0 |
| 5 | invoices.duplicate_dismissed_by | auth.users | 1 | 1 | 0 |
| 6 | jobs.created_by | auth.users | 3 | 1 | 0 |
| 7 | jobs.pm_id | profiles | 26 | 14 | 0 |
| 8 | lien_releases.created_by | auth.users | 0 | 0 | 0 |
| 9 | parser_corrections.corrected_by | auth.users | 5 | 2 | 0 |
| 10 | purchase_orders.created_by | auth.users | 0 | 0 | 0 |
| 11 | vendors.created_by | auth.users | 0 | 0 | 0 |

**Total orphans across 11 columns: 0**
**Total profiles rows queried: 21**
**Total rows with non-NULL FK value: 46**
**Total distinct FK UUIDs across all columns: 20** (substantial overlap — same auth.users IDs appear across `created_by` columns; PM full_name pool surfaces 14 distinct PMs on jobs.pm_id)

**Notable observation:** `parser_corrections.corrected_by` (NOT NULL — the column the brief flagged as the highest-risk orphan case) has 5 rows with 2 distinct UUIDs, all resolving in profiles. No HALT required.

**Notable observation:** `jobs.pm_id` has 14 distinct values across 26 rows — meaning multiple jobs share PMs (expected per Drummond + fixture-harness-org seed shape). Profiles FK resolution at 100%.

**Execute-time re-probe (Task 1) MUST return matching counts (0 orphans).** Per nwrp152 design contract: counts may legitimately drift by minutes-of-activity (a new auth.users row could appear between plan-author time and execute time); the GATE check is `sum(orphans) == 0`, NOT `counts match plan-author result row-for-row`.

**Edge case acknowledged:** plan-author-time probe used profile-not-found as auth.users-not-found surrogate. The 1:1 invariant `profiles.id === auth.users.id` holds for all signup-trigger-created rows; a hypothetical service-role manual auth.users insert that bypassed the profile trigger would NOT be caught by the surrogate probe. Execute-time DO $$ probe (Task 1 + migration body) queries `auth.users` directly — that's the authoritative check. Confidence rationale: production-pattern auth-flow goes through signup → trigger → profile creation; no migration in this repo writes to auth.users directly; D-078 documents the invariant as architectural commitment. Probe surrogate is acceptable evidence at plan-author time per nwrp152 prereq #12 design contract.

</pre_flight_orphan_probe_result>

<migration_body_sketch>

```sql
-- Migration 00099: User-identity FK convention codification (D-080).
--
-- Source decision: D-080 (MASTER-PLAN.md §10:256, codified 2026-05-15)
-- Parent convention: D-078 (auth.users default; profiles for PostgREST display embeds)
-- Decision brief: .planning/decisions-resolved/2026-05-15-user-identity-fk-convention-BRIEF.md
-- Expansion: stage-f1-knowledge-graph-auth-wave-b-EXPANDED-SCOPE.md (Slice 1, plan B-D080)
--
-- [...full header ~60 lines per Task 2 specification: rationale, lock posture,
--  index posture, naming convention, ON DELETE NO ACTION rationale, SOC2,
--  draws.approved_by carve-out, jobs.pm_id refactor opportunity for Wave 1.1-Lite...]
--
-- Pre-flight executor verification (run BEFORE applying):
--   See pre-flight orphan probe in §6 of decision brief; matching query in DO $$ block below.
--   Plan-author-time result 2026-05-15: 0 orphans across all 11 columns.

BEGIN;

-- 0. FAIL-LOUD ORPHAN-FK ASSERTION (mirrors 00097 Step 0 + 00098 Step 0).
--    Aborts cleanly if any of the 11 columns has FK values not resolving
--    in target table. Plan-author-time probe 2026-05-15 returned 0 orphans;
--    this DO block confirms at execute time.
DO $$
DECLARE
  v_orphan_change_orders_created_by INT;
  v_orphan_draws_approved_by INT;
  v_orphan_draws_created_by INT;
  v_orphan_invoices_created_by INT;
  v_orphan_invoices_duplicate_dismissed_by INT;
  v_orphan_jobs_created_by INT;
  v_orphan_jobs_pm_id INT;
  v_orphan_lien_releases_created_by INT;
  v_orphan_parser_corrections_corrected_by INT;
  v_orphan_purchase_orders_created_by INT;
  v_orphan_vendors_created_by INT;
  v_total INT;
BEGIN
  SELECT COUNT(*) INTO v_orphan_change_orders_created_by
    FROM public.change_orders t WHERE t.created_by IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.created_by);
  -- [... 10 more SELECT COUNT INTO ... blocks, one per column ...]

  v_total := v_orphan_change_orders_created_by + v_orphan_draws_approved_by
    + v_orphan_draws_created_by + v_orphan_invoices_created_by
    + v_orphan_invoices_duplicate_dismissed_by + v_orphan_jobs_created_by
    + v_orphan_jobs_pm_id + v_orphan_lien_releases_created_by
    + v_orphan_parser_corrections_corrected_by + v_orphan_purchase_orders_created_by
    + v_orphan_vendors_created_by;

  IF v_total > 0 THEN
    RAISE EXCEPTION 'Pre-flight orphan FK detection: change_orders.created_by=%, draws.approved_by=%, draws.created_by=%, invoices.created_by=%, invoices.duplicate_dismissed_by=%, jobs.created_by=%, jobs.pm_id=%, lien_releases.created_by=%, parser_corrections.corrected_by=%, purchase_orders.created_by=%, vendors.created_by=%. Aborting before FK add.',
      v_orphan_change_orders_created_by, v_orphan_draws_approved_by,
      v_orphan_draws_created_by, v_orphan_invoices_created_by,
      v_orphan_invoices_duplicate_dismissed_by, v_orphan_jobs_created_by,
      v_orphan_jobs_pm_id, v_orphan_lien_releases_created_by,
      v_orphan_parser_corrections_corrected_by, v_orphan_purchase_orders_created_by,
      v_orphan_vendors_created_by;
  END IF;
END $$;

-- 1. change_orders.created_by — audit trail (creator).
ALTER TABLE public.change_orders
  ADD CONSTRAINT change_orders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- 2. draws.approved_by — workflow audit (draw approval signer).
--    Carved out from dual-FK speculation per D-080 §4: auth.users-only for now.
--    F6 Pay App engine may add a parallel profiles FK if G702 signature
--    block needs PostgREST display embed for the approver's full_name.
ALTER TABLE public.draws
  ADD CONSTRAINT draws_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- 3. draws.created_by — audit trail (creator).
ALTER TABLE public.draws
  ADD CONSTRAINT draws_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- 4. invoices.created_by — audit trail (creator).
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- 5. invoices.duplicate_dismissed_by — workflow audit (PM dismissed a duplicate-flag).
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_duplicate_dismissed_by_fkey
  FOREIGN KEY (duplicate_dismissed_by) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- 6. jobs.created_by — audit trail (creator).
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- 7. lien_releases.created_by — audit trail (creator).
ALTER TABLE public.lien_releases
  ADD CONSTRAINT lien_releases_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- 8. parser_corrections.corrected_by — AI learning audit (NOT NULL column;
--    orphans would have required backfill from auth.users or audit-aware
--    row delete; pre-flight 2026-05-15 + Task 1 execute-time both return 0).
ALTER TABLE public.parser_corrections
  ADD CONSTRAINT parser_corrections_corrected_by_fkey
  FOREIGN KEY (corrected_by) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- 9. purchase_orders.created_by — audit trail (creator).
ALTER TABLE public.purchase_orders
  ADD CONSTRAINT purchase_orders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- 10. vendors.created_by — audit trail (creator).
ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- 11. jobs.pm_id — functional FK (PM assignment); display-embedded.
--     Mirrors invoices.assigned_pm_id Wave-C 00097 pattern. Profiles target
--     enables PostgREST embed `pm:profiles(id, full_name)` resolution
--     without secondary query. Current code uses secondary query at
--     src/app/jobs/[id]/page.tsx — REFACTOR OPPORTUNITY documented for
--     Wave 1.1-Lite polish (per nwrp153 Q6 decision: DEFER consumer
--     refactor; out of slice scope). Constraint name uses _profiles_fkey
--     suffix per Wave-D 00098 precedent (org_members_user_id_profiles_fkey).
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_pm_id_profiles_fkey
  FOREIGN KEY (pm_id) REFERENCES public.profiles(id) ON DELETE NO ACTION;

-- 12. Belt-and-suspenders: explicitly notify PostgREST schema cache to reload.
--     Particularly important for jobs_pm_id_profiles_fkey (FK enabling
--     future embed-resolution). Wave-C taught us schema verification !=
--     runtime verification; eliminate the race-window.
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Post-apply executor verification:
--   SELECT conname, conrelid::regclass::text AS source, confrelid::regclass::text AS target,
--          confdeltype  -- expect 'a' (NO ACTION) for all 11
--   FROM pg_constraint
--   WHERE conname IN (... 11 names ...)
--   ORDER BY conname;
--   -- expect: 11 rows; 10 target='auth.users'; 1 target='public.profiles' (jobs_pm_id_profiles_fkey)
--
--   -- Optional: confirm PostgREST embed resolution for jobs.pm_id → profiles
--   -- (NOT required for slice; embed adoption deferred to Wave 1.1-Lite):
--   curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/jobs?\
--     select=id,name,pm:profiles(id,full_name)&limit=1" \
--     -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
--     -H "Authorization: Bearer $TEST_USER_JWT"
--   -- expect: HTTP 200; pm key resolves to {id, full_name} object (NOT pgrst200 error)
```

</migration_body_sketch>

<down_migration_sketch>

```sql
-- Reverse migration 00099: Drop the 11 FK constraints added by 00099 forward.
--
-- All 11 DROP CONSTRAINT statements use IF EXISTS — idempotent.
--
-- WARNING: applying this .down.sql removes the structural enforcement of the
-- D-080 convention. Audit-trail durability (CC7.2) reverts to pre-codification
-- posture (auth.users-row deletion would silently orphan audit rows). Acceptable
-- only as an emergency rollback within hours of 00099 apply, BEFORE any
-- production traffic depends on the FK enforcement.
--
-- jobs.pm_id PostgREST embed-resolution depends on jobs_pm_id_profiles_fkey.
-- IF Wave 1.1-Lite has already refactored jobs/[id]/page.tsx to use the embed
-- pattern before this .down is applied, the embed will return PGRST200 — same
-- regression Wave-D Issue 1 fixed. As of slice ship (2026-05-15-ish), no
-- consumer uses the embed, so .down is safe at slice ship time.

BEGIN;

ALTER TABLE public.change_orders DROP CONSTRAINT IF EXISTS change_orders_created_by_fkey;
ALTER TABLE public.draws DROP CONSTRAINT IF EXISTS draws_approved_by_fkey;
ALTER TABLE public.draws DROP CONSTRAINT IF EXISTS draws_created_by_fkey;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_created_by_fkey;
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_duplicate_dismissed_by_fkey;
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_created_by_fkey;
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_pm_id_profiles_fkey;
ALTER TABLE public.lien_releases DROP CONSTRAINT IF EXISTS lien_releases_created_by_fkey;
ALTER TABLE public.parser_corrections DROP CONSTRAINT IF EXISTS parser_corrections_corrected_by_fkey;
ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_created_by_fkey;
ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS vendors_created_by_fkey;

NOTIFY pgrst, 'reload schema';

COMMIT;
```

</down_migration_sketch>

<acceptance_criteria>

Eight falsifiable acceptance criteria (AC-BD080-01 through AC-BD080-08):

**AC-BD080-01 — File existence + git tracking**
```bash
test -f supabase/migrations/00099_user_identity_fk_convention.sql && \
test -f supabase/migrations/00099_user_identity_fk_convention.down.sql && \
git ls-files supabase/migrations/00099_user_identity_fk_convention.sql supabase/migrations/00099_user_identity_fk_convention.down.sql | wc -l | grep -q '^2$'
```
PASS: both files exist on disk AND are git-tracked.

**AC-BD080-02 — 11 ADD CONSTRAINT statements present in forward migration with exact constraint names**
```bash
grep -E "ADD CONSTRAINT (change_orders_created_by_fkey|draws_approved_by_fkey|draws_created_by_fkey|invoices_created_by_fkey|invoices_duplicate_dismissed_by_fkey|jobs_created_by_fkey|jobs_pm_id_profiles_fkey|lien_releases_created_by_fkey|parser_corrections_corrected_by_fkey|purchase_orders_created_by_fkey|vendors_created_by_fkey)\b" supabase/migrations/00099_user_identity_fk_convention.sql | wc -l | grep -q '^11$'
```
PASS: exactly 11 lines match. Plan-review iter-1 Rule 2 (FK citation requirement) verified.

**AC-BD080-03 — All 11 FKs declare ON DELETE NO ACTION**
```bash
grep -c "REFERENCES auth.users(id) ON DELETE NO ACTION\|REFERENCES public.profiles(id) ON DELETE NO ACTION" supabase/migrations/00099_user_identity_fk_convention.sql | grep -q '^11$'
```
PASS: exactly 11 lines match the ON DELETE NO ACTION pattern (10 auth.users + 1 profiles target).

**AC-BD080-04 — Down migration has 11 DROP CONSTRAINT IF EXISTS statements**
```bash
grep -c "DROP CONSTRAINT IF EXISTS" supabase/migrations/00099_user_identity_fk_convention.down.sql | grep -q '^11$'
```
PASS: exactly 11 DROP statements; matches forward-migration constraint count.

**AC-BD080-05 — Post-apply pg_constraint inventory shows 11 new FK rows (10 auth.users + 1 profiles)**
```sql
-- via mcp__supabase__execute_sql
SELECT
  COUNT(*) FILTER (WHERE confrelid::regclass::text = 'auth.users') AS auth_users_count,
  COUNT(*) FILTER (WHERE confrelid::regclass::text = 'profiles') AS profiles_count
FROM pg_constraint
WHERE conname IN (
  'change_orders_created_by_fkey', 'draws_approved_by_fkey', 'draws_created_by_fkey',
  'invoices_created_by_fkey', 'invoices_duplicate_dismissed_by_fkey',
  'jobs_created_by_fkey', 'jobs_pm_id_profiles_fkey',
  'lien_releases_created_by_fkey', 'parser_corrections_corrected_by_fkey',
  'purchase_orders_created_by_fkey', 'vendors_created_by_fkey'
);
```
PASS: returns 1 row with `auth_users_count=10`, `profiles_count=1`.

**AC-BD080-06 — All 11 FKs use NO ACTION (confdeltype='a') in pg_constraint**
```sql
-- via mcp__supabase__execute_sql
SELECT COUNT(*) AS noaction_count FROM pg_constraint
WHERE conname IN (
  'change_orders_created_by_fkey', 'draws_approved_by_fkey', 'draws_created_by_fkey',
  'invoices_created_by_fkey', 'invoices_duplicate_dismissed_by_fkey',
  'jobs_created_by_fkey', 'jobs_pm_id_profiles_fkey',
  'lien_releases_created_by_fkey', 'parser_corrections_corrected_by_fkey',
  'purchase_orders_created_by_fkey', 'vendors_created_by_fkey'
)
AND confdeltype = 'a';
```
PASS: returns `noaction_count=11`.

**AC-BD080-07 — Single atomic git commit on local main branch; both migration files included**
```bash
LATEST_COMMIT_FILES=$(git diff HEAD~1 HEAD --name-only)
echo "$LATEST_COMMIT_FILES" | sort | tr '\n' ',' | \
  grep -qE "^supabase/migrations/00099_user_identity_fk_convention.down.sql,supabase/migrations/00099_user_identity_fk_convention.sql,$"
git log -1 --format='%s' | grep -qE "^feat\(stage-f1-wave-b\): B-D080"
```
PASS: HEAD~1..HEAD diff includes exactly the two migration files; commit subject begins with `feat(stage-f1-wave-b): B-D080`.

**AC-BD080-08 — Smoke harness baseline unchanged (Wave-B prereq #12 maintained); plan-review iter-1 mechanical smoke-gate check passes**
```bash
# Run smoke harness against the post-commit state.
# Baseline (TD-WE-03 set): ≤2 failures.
# Expected: smoke result matches the pre-B-D080 baseline (no new failures introduced).
node scripts/wave-d-smoke.ts --report-path=./qa-reports/post-bd080-smoke-results.json
# Assert
node -e "const r = require('./qa-reports/post-bd080-smoke-results.json'); const failures = r.routes.filter(x => x.status !== 'PASS').length; process.exit(failures <= 2 ? 0 : 1);"
```
PASS: ≤2 failures in smoke results; result matches TD-WE-03 baseline set; no new failures introduced by 00099 apply.

</acceptance_criteria>

<verification_commands>

**Pre-apply (Task 1 → DB):**
```sql
-- Run via mcp__supabase__execute_sql:
SELECT 'change_orders.created_by' AS col, COUNT(*) AS orphan_count
FROM public.change_orders t WHERE t.created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = t.created_by)
UNION ALL
-- [10 more rows per Task 1 specification]
ORDER BY 1;
```
Expected: 11 rows, all `orphan_count=0`. Run again immediately before the migration apply (Task 4).

**Post-apply (Task 4 → DB):**
```sql
-- Constraint inventory query
SELECT conname, conrelid::regclass::text AS source_table, confrelid::regclass::text AS target_table, confdeltype
FROM pg_constraint
WHERE conname IN ( /* 11 names */ )
ORDER BY conname;
```
Expected: 11 rows; 10 with target_table='auth.users'; 1 with target_table='profiles' (jobs_pm_id_profiles_fkey); all confdeltype='a'.

**Post-commit (Task 5 → shell):**
```bash
git log -1 --format='%H %s'   # expect: <40-char-sha> feat(stage-f1-wave-b): B-D080 ...
git diff HEAD~1 HEAD --name-only | sort   # expect: exactly the two migration paths
git status --short            # expect: empty (working tree clean)
```

**Plan-review iter-1 mechanical checks:**
```bash
# Rule 2 FK citation requirement
for name in change_orders_created_by_fkey draws_approved_by_fkey draws_created_by_fkey \
            invoices_created_by_fkey invoices_duplicate_dismissed_by_fkey \
            jobs_created_by_fkey jobs_pm_id_profiles_fkey \
            lien_releases_created_by_fkey parser_corrections_corrected_by_fkey \
            purchase_orders_created_by_fkey vendors_created_by_fkey; do
  grep -q "$name" .planning/phases/stage-f1-knowledge-graph-auth-wave-b/B-D080-fk-convention-migration-PLAN.md || \
    echo "MISSING citation: $name"
done
# Expect: no output (all 11 names cited).

# Rule 6(a) hook regex sweep on files_modified
# Forward + down migration files; expect zero design-token violations
# (SQL-only files; no hex / colors / fonts / etc.)
bash .claude/hooks/nightwork-pre-commit.sh   # dry-run on the staged files

# Rule 6(d) files_modified intersection check across slice plans
# (cross-check with B-1a + B-1b plans authored in parallel)
# Expectation: empty intersection (B-D080 = 2 migration files; B-1a = different
# migration + fixture insert; B-1b = scaffold + types + harness extensions, no migrations)
```

</verification_commands>

<rollback_strategy>

**Tier 1: Pre-commit rollback (executor catches issue before push)**
- `git reset --soft HEAD~1` — removes the local commit; migration files remain staged for re-author
- `git restore --staged supabase/migrations/00099_*.sql` — unstages both files
- Apply down migration via Supabase MCP `execute_sql` with the body of 00099_user_identity_fk_convention.down.sql
- Re-run plan-review iter-1 with the corrected forward migration

**Tier 2: Post-commit / pre-push rollback (the canonical state for B-D080 since this plan does NOT push)**
- This plan's Task 5 explicitly does NOT push to origin/main.
- If a defect is discovered post-commit but pre-push: `git reset --soft HEAD~1` is safe (origin/main unaffected).
- Apply down migration via Supabase MCP as above to revert pg_constraint state to pre-00099.

**Tier 3: Post-push rollback (HALT — requires explicit Jake authorization)**
- ONLY if the orchestrator pushes the commit to origin/main after this plan (which is OUT of scope for B-D080 per CLAUDE.md "Never push to the remote repository unless the user explicitly asks").
- Per CLAUDE.md "git Safety Protocol" + "NEVER run force push to main/master" — Tier 3 rollback creates a NEW revert commit, NOT a force-push:
  ```bash
  git revert <00099-commit-sha>
  # Then apply down migration via Supabase MCP
  # Then push the revert commit per normal flow
  ```
- Document the revert in MASTER-PLAN.md §11 TECH DEBT REGISTRY with severity, source, remediation.

**Schema-state rollback regardless of git tier:**
1. Apply 00099_user_identity_fk_convention.down.sql body via Supabase MCP `execute_sql`.
2. Verify post-rollback via `SELECT COUNT(*) FROM pg_constraint WHERE conname LIKE '%_created_by_fkey' OR conname='jobs_pm_id_profiles_fkey';` — expect 0 (or whatever the pre-00099 count was, which per D-080 brief §2 inventory was 0 for these 11 constraint names).
3. PostgREST schema cache reloads automatically via the down migration's `NOTIFY pgrst, 'reload schema';`.

**No data rollback needed:** this migration adds zero rows + updates zero rows; pure schema (ALTER TABLE ADD CONSTRAINT).

</rollback_strategy>

<soc2_mapping>

D-080 inherits SOC2 mapping from D-078 (per MASTER-PLAN.md §10:256 explicit "inherited from D-078" wording). No new controls introduced; this migration crystallizes existing posture.

**CC6.1 (Logical and physical access controls)** — Adding FK constraints to auth.users enforces that user-identity claimed in any audit/ownership column refers to a real user in the auth system. Prevents data-integrity drift from arbitrary-UUID inserts (which were technically possible on these 11 NO_FK columns until this migration). FK constraint is the structural-by-construction enforcement: even with a dropped RLS policy or a service-role bypass, the FK prevents orphan-UUID inserts.

**CC7.2 (System monitoring — audit-trail durability)** — ON DELETE NO ACTION on all 11 FKs guarantees audit-trail durability across auth.users-row deletion. Deletion requires explicit handling (production posture per CLAUDE.md "Never delete records" + "soft-delete only"). The NO ACTION posture means: if a hand-crafted service-role hard-delete is attempted on an auth.users row that has any audit reference, the deletion is BLOCKED with a clear FK-violation error — the audit trail cannot be silently broken.

**PI1.1 (Processing integrity — completeness/validity)** — `jobs.pm_id → profiles(id)` FK enables PostgREST display-embed resolution consistent with the rest of the embeddings convention. The existing PostgREST hint pattern `pm:profiles(id, full_name)` on jobs queries currently returns PGRST200 (no FK to follow); post-migration, the hint resolves correctly. Wave 1.1-Lite polish (deferred per nwrp153 Q6) will refactor jobs/[id]/page.tsx to adopt this embed pattern; until then, the FK is no-consumer but structurally correct.

**No new controls** — this decision crystallizes the implicit posture explicitly; the PostgREST embedding fence (D-078 PI1.1 enforcement on `profile:profiles(*)` blocking + email/phone column blocking) remains active and is unaffected by D-080.

Cross-references: ARCHITECTURE.md §SOC2 control mapping, §11 TECH DEBT REGISTRY entry TD-D-078 (full standardization of 56+ pre-D-080 FKs to a single target — still deferred to F-phase or Wave 1.1-Full).

</soc2_mapping>

<plan_review_iter1_reviewer_focus>

Per Wave-B EXPANDED-SCOPE §9 GATE 1 contract: plan-review iter-1 runs with explicit Rule 1-6 enforcement. Notes for each reviewer focus area:

**database-reviewer (Postgres FK posture)** — confirm:
- 11 ALTER TABLE ADD CONSTRAINT FOREIGN KEY ... REFERENCES ... ON DELETE NO ACTION shape mirrors Wave-C 00097 + Wave-D 00098 precedent
- Constraint naming convention: `<table>_<column>_fkey` for auth.users target (10); `<table>_<column>_profiles_fkey` for the single profiles target — flagged because the suffix disambiguation differs from Postgres auto-naming
- Lock posture: ADD CONSTRAINT FOREIGN KEY takes SHARE ROW EXCLUSIVE on each source table + validates every existing row; verify largest table (invoices ~11 rows) is sub-millisecond at Ross Built scale; verify reconsider-threshold (10k rows) is documented in header comment
- Index posture: zero new indexes; verify acceptable per Wave-D 00098 precedent (PK on auth.users.id + profiles.id provides referenced-side coverage; source-side indexes already exist or cardinality too low at Ross Built scale)
- Fail-loud DO $$ orphan block syntax: 11 SELECT COUNT INTO blocks + IF (sum > 0) RAISE EXCEPTION; verify the formatted error message includes per-column counts

**security-reviewer (ON DELETE NO ACTION posture; CC6.1/CC7.2/PI1.1)** — confirm:
- NO ACTION (not CASCADE / NOT SET NULL) on all 11 FKs aligns with CLAUDE.md "Never delete records" + soft-delete posture
- ON DELETE behavior verified via confdeltype='a' assertion in AC-BD080-06 + post-apply executor verification
- The SOC2 inheritance from D-078 is explicit in the migration header (CC6.1 access controls; CC7.2 audit-trail durability; PI1.1 PostgREST display embed)
- PII fence (D-078 PI1.1) is unaffected — D-080 doesn't add embedding hints; `jobs.pm_id → profiles(id)` enables future `pm:profiles(id, full_name)` resolution but does NOT introduce email/phone columns into any embed

**multi-tenant-architect (cross-tenant impact assessment)** — confirm:
- Zero cross-tenant impact: FK targets are platform-level tables (auth.users; profiles is platform-level — every org's PMs are profiles rows). FK enforcement is platform-wide, not tenant-scoped.
- RLS posture on the 11 source tables is unchanged (no policy modifications in this migration). Org-isolation continues to filter via existing policies; FK adds a structural backstop only.
- Recommended verdict: NIL cross-tenant concern. Reviewer may note that FK enforcement is BY CONSTRUCTION + amplifies CC6.1 ("multi-tenant RLS is non-negotiable" per CLAUDE.md is unaffected; FK is orthogonal structural enforcement).

**ai-logic-tester (Rule 3 — representative query execution)** — required actions:
- Execute the 11-row UNION ALL orphan probe via mcp__supabase__execute_sql against current schema; assert sum(orphan_count)=0
- Execute the post-apply pg_constraint inventory query (AC-BD080-05); assert 10 auth.users + 1 profiles target
- Execute confdeltype assertion (AC-BD080-06); assert 11 rows with confdeltype='a'
- Per Rule 3 nwrp118 update: do NOT infer correctness from migration text alone; execute the queries
- Recommended verdict: PASS if all 3 queries succeed with expected results; HALT if any query returns unexpected counts

**scalability-reviewer (lock posture + future scale)** — confirm:
- Lock posture is appropriate at Ross Built scale (current largest source = 11 rows)
- 10k-row reconsider-threshold documented in header (matches 00098 precedent)
- No CREATE INDEX in this migration — acceptable per Wave-D 00098 precedent + the fact that all source-side indexes either exist or are low-cardinality
- Recommended verdict: PASS at current scale; flag the threshold-doc for future-scale review

**enterprise-readiness / compliance-reviewer (SOC2 mapping completeness)** — confirm:
- SOC2 control mapping in migration header restates CC6.1/CC7.2/PI1.1 inheritance from D-078
- ON DELETE NO ACTION posture explicitly supports CC7.2 (audit-trail durability)
- No new audit-log writes introduced (FK addition is DDL; activity_log writes are unaffected; verify in AC-BD080-08 smoke harness that audit-conservation continues to be 1:1 with mutations elsewhere in the system)

**custodian (file/path/git hygiene)** — confirm:
- Both migration files located at `supabase/migrations/`; naming pattern `00099_user_identity_fk_convention.sql` + `00099_user_identity_fk_convention.down.sql` mirrors 00097 + 00098 precedent
- Both files git-tracked (gitignore carve-out for `supabase/` is implicit; verify via `git ls-files`)
- Single atomic commit with compound `git add ... && git commit` form per nwrp133 codification
- Hook gates honored (Drummond pre-commit `.githooks/pre-commit` + Claude-Bash `.claude/hooks/nightwork-pre-commit.sh`); no `--no-verify`

**plan-pushback / design-pushback (out-of-scope tax)** — note:
- This plan does NOT refactor jobs/[id]/page.tsx to adopt the new `pm:profiles(id, full_name)` embed pattern. Deferred to Wave 1.1-Lite per nwrp153 Q6 decision. Reviewer should NOT flag this as missing scope; it's explicit deferred-by-decision.
- This plan does NOT add a parallel profiles FK on `draws.approved_by`. Deferred to F6 if G702 signature block needs PostgREST display embed. Reviewer should NOT flag this as missing scope; it's explicit carve-out per D-080 §4.
- This plan does NOT update CLAUDE.md "User-identity FK convention split" census from 56/3 to 66/4. Deferred to `nightwork-custodian` post-ship sweep OR a follow-up TD entry. Reviewer should NOT flag this as missing scope; it's explicit documentation-pin deferral per the downstream-consumer-sweep §5 finding.

**Cross-reviewer factual disagreement HALT (nwrp118)** — per CLAUDE.md Workflow posture, any factual disagreement between reviewers (especially on Rule 2 FK citation, Rule 3 query execution results, or Rule 5 intersection check) HALTS for Jake. Resolution via source verification (migration files, pg_constraint live state, plan body), NOT majority-rule.

</plan_review_iter1_reviewer_focus>

<verification>

End-to-end phase verification for this plan:

1. **Pre-flight (run before Task 1):**
   - `git status --short` clean (working tree clean before B-D080 dispatch)
   - `git rev-parse --abbrev-ref HEAD` returns `main` (or local branch tracking main)
   - Supabase MCP healthcheck: `mcp__supabase__execute_sql 'SELECT 1 AS healthcheck'` returns `[{"healthcheck": 1}]`

2. **Execute-time (Tasks 1-4):**
   - Task 1 orphan probe: 11 rows; sum(orphan_count)=0
   - Task 2 forward migration: file exists; 11 ADD CONSTRAINT statements present
   - Task 3 down migration: file exists; 11 DROP CONSTRAINT IF EXISTS statements present
   - Task 4 apply + verify: pg_constraint shows 11 new rows; 10 target auth.users + 1 target profiles; confdeltype='a' for all 11

3. **Post-commit (Task 5):**
   - `git log -1 --format='%H %s'` shows the new commit with subject `feat(stage-f1-wave-b): B-D080 — migration 00099 user-identity FK convention codification`
   - `git diff HEAD~1 HEAD --name-only` shows exactly the two migration file paths
   - `git status --short` returns empty (working tree clean)

4. **Smoke gate (AC-BD080-08):**
   - `node scripts/wave-d-smoke.ts --report-path=./qa-reports/post-bd080-smoke-results.json` runs successfully
   - Failure count in `post-bd080-smoke-results.json` is ≤2 (matches TD-WE-03 baseline)

5. **Plan-review iter-1 mechanical (Rules 1-6):**
   - Rule 1 (schema verification != runtime verification): DB-only migration; runtime verification N/A in this slice; runtime gate moves to B-1b smoke (next plan)
   - Rule 2 (PostgREST FK citation): all 11 constraint names cited in plan body + migration body; grep gate passes
   - Rule 3 (ai-logic-tester executes representative queries): orphan probe + constraint inventory + confdeltype assertion all executed via mcp__supabase__execute_sql; reviewer attaches results
   - Rule 4 (Playwright smoke pre-QA for UI-touching plans): N/A (DB-only); requires_smoke=false
   - Rule 5 (files_modified intersection check): B-D080 files_modified = [00099 forward, 00099 down]; B-1a files_modified = [00100 forward, 00100 down, fixture]; B-1b files_modified = [scaffold + types + harness + listener]; intersection across all 3 = empty; check passes
   - Rule 6 (pre-flight collision checks):
     - (a) Hook regex sweep on 00099 files: SQL-only; expect zero hex / colors / fonts / etc. violations
     - (b) Fixture infrastructure collision check: N/A (no fixture data in this plan)
     - (c) Deliverable path reachability: both files under `supabase/migrations/` which is git-tracked by default
     - (d) files_modified intersection (same as Rule 5): empty

</verification>

<success_criteria>

This plan is complete when:

- [ ] Two new files committed: `supabase/migrations/00099_user_identity_fk_convention.sql` + `.down.sql`
- [ ] Pre-flight orphan probe at plan-author time AND execute time both return 0 orphans across all 11 columns
- [ ] Migration 00099 applied via Supabase MCP; pg_constraint shows 11 new FK rows (10 target auth.users + 1 target profiles)
- [ ] All 11 FK constraints declare ON DELETE NO ACTION (confdeltype='a')
- [ ] `jobs_pm_id_profiles_fkey` (the single profiles-target FK) enables PostgREST embed-resolution for `pm:profiles(id, full_name)` on jobs queries
- [ ] Compound `git add ... && git commit` form used; no `--no-verify`; hook gates honored
- [ ] Smoke harness post-commit shows ≤2 failures matching TD-WE-03 baseline (Wave-B prereq #12 maintained)
- [ ] Plan-review iter-1 passes Rules 1-6 mechanical checks
- [ ] Plan-review iter-1 reviewer set (database / security / multi-tenant-architect / ai-logic-tester / scalability / compliance / custodian / design-pushback) reviewed without cross-reviewer factual disagreement HALT (nwrp118)
- [ ] Wave-B prereq #10 SATISFIED (D-080 codification migration applied; B-1a author can now declare `clients.created_by REFERENCES auth.users(id) ON DELETE NO ACTION` with established precedent)
- [ ] Plan-author returns post-execute summary to orchestrator

</success_criteria>

<output>
After completion, create `.planning/phases/stage-f1-knowledge-graph-auth-wave-b/B-D080-fk-convention-migration-SUMMARY.md` capturing:

- Pre-flight orphan probe result (plan-author time 2026-05-15 + execute time at apply)
- Migration 00099 commit SHA
- pg_constraint post-apply inventory (11 rows; 10 auth.users + 1 profiles)
- Smoke harness post-commit failure count vs TD-WE-03 baseline
- Plan-review iter-1 reviewer verdicts
- Notable surprises (orphans, lock contention, schema-state divergence) — expected: none, per pre-flight evidence
- Hand-off note to B-1a: D-080 precedent now in pg_constraint; `clients.created_by REFERENCES auth.users(id) ON DELETE NO ACTION` is the canonical pattern
- Wave 1.1-Lite TD entry candidate: refactor `src/app/jobs/[id]/page.tsx` to adopt `pm:profiles(id, full_name)` PostgREST embed (eliminate secondary query)
- F6 TD entry candidate: if G702 signature block needs PostgREST display embed for approver full_name, add parallel profiles FK on `draws.approved_by` (dual-FK retroactive pattern per Wave-D 00098 precedent)
</output>
