---
phase: stage-f1-knowledge-graph-auth-wave-b
type: iter-2-patches
authored: 2026-05-15
authored_by: orchestrator (claude-opus-4-7[1m]) under nwrp155 GATE 1 adjudication
authorization: /nightwork-plan-review iter-1 (10 reviewers; all returned) + nwrp155 Jake adjudication on D1/D2/B5/C5/C6/C7
status: AUTHORITATIVE — executors apply these patches alongside PLAN.md bodies; addendum supersedes plan body where conflicts exist
re_verification_targets:
  - database-reviewer (BLK-1, BLK-2, CRT-1, CRT-3, WARN-4)
  - nightwork-multi-tenant-architect (W-1 RLS pattern resolution, C-1 client_id orphan check)
  - nightwork-design-pushback-agent (C-1 Combobox, C-2 /api/clients endpoint, C-3 wizard regression, C-7 mailto)
skipped_re_verification:
  - architect (CRITICAL-1 + CRITICAL-2 are mechanical frontmatter fixes verified inline)
  - planner (CRITICAL-1 super-set covered by D2 trim-scope decision; CRITICAL-2 covered by inline AC addition)
  - security (CRIT-1 cross-plan regex generalize verified by code+grep at execute time)
  - enterprise-readiness (W-1 audit_log gap resolved by B5 advance decision; remaining WARNINGs addressed inline)
  - compliance (W-1 same gap; W-2/W-3 addressed inline)
  - nightwork-data-migration-safety (all WARNINGs addressed inline)
  - nightwork-ai-logic-tester (NOTE-only findings; verified inline)
---

# Wave-B-Slice-1 — Iter-2 Patches

iter-1 plan-review dispatched 10 reviewers in parallel. Aggregate verdict: **BLOCKING** via cross-reviewer escalation (synthesis rule: 2+ reviewers WARNING on same surface → BLOCKING, plus database-reviewer's 2 explicit BLOCKING findings). Slice is execute-ready post-patches; no plan needs re-author.

Per **nwrp155 Jake GATE 1 adjudication**:
- **D1** RLS pattern: MANDATE helper-form `org_id = (SELECT app_private.user_org_id())`. BLK-2 stands.
- **D2** B-1b complexity: TRIM SCOPE — defer `fixture-coverage.ts` to Slice-2; lock hook-integration option (b) Claude-Bash-only. Brings B-1b to 2.6d ≤ 2.5d threshold. Jake-decision attribution explicit; plan-authors cannot self-resolve Jake-locked HALT gates.
- **B5** audit_log gap: ADVANCE `'client'` ActivityEntityType extension into B-1a-bis (partial pull; NOT full B-4). Slice-2 B-4 retains lien_releases/proposals/client_portal_access extensions.
- **C5** Combobox: PIN; ship `/api/clients?search=` GET endpoint in B-1a-bis scope.
- **C6** /api/clients endpoint: scope expansion confirmed; add to files_modified.
- **C7** OnboardWizard regression: NAME AS DELIBERATE in §12 + TD entry; wizard is org-onboarding scope (no production impact — Ross Built doesn't use Owner Portal magic-links currently).

Patches authoritative. Plan bodies remain canonical for sections NOT touched by these patches. Where plan body conflicts with this addendum, this addendum wins.

## Patch summary

| Plan | BLOCKING | CRITICAL | HIGH | WARNING | NOTE | Total |
|------|----------|----------|------|---------|------|-------|
| B-D080 | 0 | 0 | 0 | 4 | 1 | 5 |
| B-1a | 2 | 0 | 1 | 6 | 1 | 10 |
| B-1a-bis | 2 | 4 | 0 | 9 | 1 | 16 |
| B-1b | 1 | 1 | 1 | 4 | 3 | 10 |
| **Total** | **5** | **5** | **2** | **23** | **6** | **41** |

---

## §1 — B-D080 patches (5)

### §1.1 — Remove pre-existence constraint check inside DO block (database CRT-1; WARNING)

**Original plan (B-D080 Task 2 step 3):** Migration body includes a `DO $$ BEGIN ... IF NOT EXISTS (...) THEN ... END IF; END $$;` guard around each ADD CONSTRAINT to provide a friendlier error message than Postgres's native duplicate-constraint error.

**Issue (database-reviewer CRT-1):** The wrapper makes the migration non-idempotent in a worse way than the native error. If the migration partially applies, the guard allows the DO block to silently skip already-present constraints — masking partial-state on re-run. Wave-C 00097 + Wave-D 00098 precedent migrations use bare `ALTER TABLE ... ADD CONSTRAINT` and rely on native error.

**Patch:** Remove the IF NOT EXISTS guard. Use bare `ALTER TABLE ... ADD CONSTRAINT` for all 11 FKs. Native error fires on duplicate, which is the correct posture (migration apply assumes clean pre-state; orphan probe gates the pre-condition).

**Verification (new AC-BD080-09):**
```bash
grep -nE 'IF NOT EXISTS.*pg_constraint' supabase/migrations/00099_user_identity_fk_convention.sql
# Expected: 0 hits
```

### §1.2 — Standardize AC-BD080-05 regclass namespace-resolution (planner W-1; WARNING)

**Original plan:** AC-BD080-05 query uses `WHERE confrelid::regclass::text = 'auth.users'` and `= 'profiles'` (mixed schema-qualified + bare). Task 4 §1 expected output references `target_table='users'` with `confnamespace='auth'` — representation mismatch.

**Patch:** Standardize on schema-qualified output. Both AC-BD080-05 WHERE clauses and Task 4 expected output use `confrelid::regclass::text` format → `auth.users` and `public.profiles` consistently.

**Verification:** AC-BD080-05 query as-amended returns 10 rows matching `'auth.users'` + 1 row matching `'public.profiles'`.

### §1.3 — Add D-080 forward-compat clause to migration header (architect W-3; WARNING)

**Original D-080 (MASTER-PLAN.md §10:256):** Codifies retrofit of 11 existing NO_FK columns. Doesn't explicitly state "new tables created post-D-080 inherit the convention."

**Issue (architect WARNING-3):** B-1a creates `clients.created_by` REFERENCES auth.users(id) — first new-table application. Future F2-F5 plans may drift without explicit forward-compat rule.

**Patch:** Add migration header comment block at top of `00099_user_identity_fk_convention.sql`:

```sql
-- ============================================================================
-- D-080 FORWARD-COMPAT CLAUSE (per architect iter-1 WARNING-3 + nwrp155):
-- ============================================================================
-- This migration codifies the FK convention by RETROFITTING 11 existing
-- NO_FK columns. Forward-compat: new user-identity FK columns on NEW tables
-- created after migration 00099 default to:
--   REFERENCES auth.users(id) ON DELETE NO ACTION
-- UNLESS the column is referenced in PostgREST display embedding hints, in
-- which case:
--   REFERENCES profiles(id) ON DELETE NO ACTION
--
-- B-1a (migration 00100) is the first new-table application:
--   - clients.created_by → auth.users(id) (no display embed needed)
--
-- Plan-authors writing new tables in F2-F5 inherit this convention from
-- D-080 + this header. Departing requires explicit D-### entry.
-- ============================================================================
```

**Verification (new AC-BD080-10):**
```bash
grep -nE 'D-080 FORWARD-COMPAT CLAUSE' supabase/migrations/00099_user_identity_fk_convention.sql
# Expected: 1 hit
```

### §1.4 — Down migration cross-reference rollback chain ordering (data-migration CP-4; WARNING)

**Issue (data-migration CP-4):** B-1a's down migration documents the rollback chain order; B-D080's down migration doesn't. Asymmetry — operator rolling back from B-D080's down has no context on B-1a/B-1a-bis dependencies.

**Patch:** Add header comment to `00099_user_identity_fk_convention.down.sql`:

```sql
-- ============================================================================
-- ROLLBACK CHAIN ORDERING (per data-migration CP-4 + nwrp155):
-- ============================================================================
-- This down migration drops 11 FK constraints added in 00099.up. If executing
-- a multi-migration rollback after Slice-1 has shipped, execute in this order:
--
--   1. 00101.down — re-add jobs.client_name/email/phone (data NOT restored;
--                   coordinated with B-1a-bis source-code revert)
--   2. 00100.down — drop jobs.client_id + drop clients table
--   3. 00099.down — drop 11 FK constraints (this migration)
--
-- Single-migration rollback of 00099 alone is safe (no downstream FK
-- dependency on the constraints being dropped here). The chain ordering
-- matters only if 00100/00101 were applied and need rolling back too.
-- ============================================================================
```

### §1.5 — Orphan probe HALT path forbids logging UUID values (security; NOTE)

**Issue (security cross-plan concern):** Per nwrp139 discipline (HARNESS_FIXTURE_PASSWORD leak codification), bash secret-presence checks must use `if [ -n ... ]; then ... else ... fi` form. The orphan probe's HALT path may surface UUID values when reporting >0 orphans — UUIDs aren't secrets but the nwrp139 discipline extends to "never log identifier values in probe output."

**Patch:** Probe HALT path uses `COUNT(*) > 0` checks only; if HALT triggers, surface COLUMN NAME + COUNT, NOT the UUID values themselves. Add explicit instruction to plan-author-time + execute-time probe runners:

> "On HALT (any column with orphan_count > 0): surface ONLY the column name + orphan_count integer. DO NOT log or surface the specific UUID values that are orphan. UUID values may be queryable separately via a follow-up admin SQL but MUST NOT appear in plan-review, QA, or commit-body output per nwrp139 codification."

---

## §2 — B-1a patches (10)

### §2.1 — BLK-1: Backfill idempotency via partial unique index + ON CONFLICT (database BLK-1 + enterprise-readiness W-4; BLOCKING)

**Original plan (B-1a Task 7):** Backfill uses `SELECT DISTINCT (org_id, lower(trim(client_name)), lower(trim(client_email))) ...` CTE + plain `INSERT INTO public.clients SELECT FROM distinct_clients` (no ON CONFLICT).

**Issue (database BLK-1):** `SELECT DISTINCT` with window functions (`FIRST_VALUE`) deduplicates AFTER window runs per-row. For multi-job clients with case/whitespace variants ("Michael Harllee" vs "MICHAEL HARLLEE"), the DISTINCT on the 6-column output does NOT collapse them. Live DB confirmed real multi-job client (Michael Harllee, 2 jobs). Two rows insert → subsequent UPDATE non-deterministic.

**Patch:**

1. Add partial unique index AS PART OF CLIENTS TABLE CREATION (`CREATE TABLE clients ...` block):

```sql
CREATE UNIQUE INDEX idx_clients_org_name_email_unique
  ON public.clients (org_id, lower(trim(full_name)), lower(trim(coalesce(email, ''))))
  WHERE deleted_at IS NULL;
```

Note: `coalesce(email, '')` handles NULL emails (Postgres treats NULLs as distinct in unique indexes by default; coalesce makes NULL-vs-NULL collapse to one row, which matches the backfill semantic).

2. Update backfill INSERT to add ON CONFLICT clause:

```sql
INSERT INTO public.clients (id, org_id, created_by, full_name, email, phone)
SELECT
  gen_random_uuid(),
  d.org_id,
  '5eb26edc-5989-477f-ac42-d1e9264db0e2'::uuid,  -- backfill attribution: harness-fixture user; see §2.8 fixture precedence note
  d.full_name,
  d.email,
  d.phone
FROM distinct_clients d
ON CONFLICT (org_id, lower(trim(full_name)), lower(trim(coalesce(email, ''))))
  WHERE deleted_at IS NULL
DO NOTHING;
```

3. Update Step 8 UPDATE to add `AND c.deleted_at IS NULL`:

```sql
UPDATE public.jobs j
SET client_id = c.id
FROM public.clients c
WHERE j.org_id = c.org_id
  AND lower(trim(coalesce(j.client_name, ''))) = lower(trim(coalesce(c.full_name, '')))
  AND lower(trim(coalesce(j.client_email, ''))) = lower(trim(coalesce(c.email, '')))
  AND c.deleted_at IS NULL  -- ITER-2 §2.1 BLK-1 patch
  AND j.client_id IS NULL;
```

**Verification (new AC-B1a-11):**
```sql
-- Post-backfill: every job's client_id resolves to exactly one clients row
SELECT j.id AS job_id, COUNT(c.id) AS matched_clients_count
FROM public.jobs j
LEFT JOIN public.clients c ON c.id = j.client_id AND c.deleted_at IS NULL
WHERE j.client_id IS NOT NULL
GROUP BY j.id
HAVING COUNT(c.id) <> 1;
-- Expected: 0 rows
```

### §2.2 — BLK-2: RLS rewrites to helper-form (multi-tenant W-1 + database BLK-2 + nwrp155 D1; BLOCKING)

**Original plan (B-1a Task 9):** RLS policies use bare `org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid() AND is_active = true)` subquery.

**Issue (cross-reviewer 2+ agreement + nwrp155 D1):** EXPANDED-SCOPE §4 explicitly mandates Wave-C 00097 session-cache pattern (wrapped helper for once-per-statement evaluation). Bare subquery diverges and creates drift precedent. Per nwrp155 D1: MANDATE helper-form. BLK-2 stands.

**Patch (3-policy R.23 shape using `app_private.user_org_id()` helper):**

```sql
-- SELECT policy (org-scoped + platform-admin OR-clause)
CREATE POLICY clients_org_select ON public.clients
  FOR SELECT
  USING (
    org_id = (SELECT app_private.user_org_id())
    OR (SELECT app_private.is_platform_admin())
  );

-- INSERT policy (org-scoped + role-gated, NO platform-admin write)
CREATE POLICY clients_org_insert ON public.clients
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT app_private.user_org_id())
    AND (SELECT app_private.user_org_role()) IN ('owner', 'admin', 'pm')
  );

-- UPDATE policy (org-scoped + role-gated; same role set)
CREATE POLICY clients_org_update ON public.clients
  FOR UPDATE
  USING (
    org_id = (SELECT app_private.user_org_id())
    AND (SELECT app_private.user_org_role()) IN ('owner', 'admin', 'pm')
  )
  WITH CHECK (
    org_id = (SELECT app_private.user_org_id())
    AND (SELECT app_private.user_org_role()) IN ('owner', 'admin', 'pm')
  );
```

**Iter-2.5 amendment (nwrp156 + database-reviewer re-verification GATE 1.5):** `app_private.user_org_role()` does NOT exist in any migration (database-reviewer exhaustive grep across 40+ migration files confirmed). The closest existing helper `app_private.user_role()` (migration 00039) is NOT org-scoped — bare `LIMIT 1` without org filter is a latent multi-tenant bug for users belonging to multiple orgs.

B-1a migration 00100 MUST create the helper BEFORE the policies that reference it. The function body (database-reviewer-supplied; nwrp156 verified):

```sql
-- ============================================================================
-- Helper: app_private.user_org_role()
-- Returns the caller's role in their current org (resolved via user_org_id()).
-- Required by clients_org_insert + clients_org_update policies below.
-- ============================================================================
CREATE OR REPLACE FUNCTION app_private.user_org_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT om.role
  FROM public.org_members om
  WHERE om.user_id = auth.uid()
    AND om.org_id = (SELECT app_private.user_org_id())
    AND om.is_active = true
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION app_private.user_org_role() TO authenticated;
```

**Verified properties per nwrp156:**
- ✓ `SECURITY DEFINER` — bypasses RLS for `org_members` lookup (required so non-owner roles can still resolve their own role without RLS recursion)
- ✓ `SET search_path = public` — closes SECURITY DEFINER `search_path` injection vector per Wave-A iter-1 standards-research; required for ALL future SECURITY DEFINER functions (see future-discipline note below)
- ✓ `STABLE` volatility — consistent results within a single transaction; planner can cache
- ✓ `LIMIT 1` — defensive; one role per (user, org) pair anyway via existing `org_members` uniqueness, but explicit
- ✓ `GRANT EXECUTE ... TO authenticated` — NOT to anon (internal-user helper; anon never has an org role)
- ✓ Joins on `om.org_id = (SELECT app_private.user_org_id())` — confirms org-scoped, not user-global; closes the multi-tenant bug that bare `app_private.user_role()` carries
- ✓ `CREATE OR REPLACE` — idempotent on re-apply; if migration runs again (e.g., post-rollback re-apply), function definition stays consistent

**Migration body placement:** B-1a `00100_clients_schema_foundation.sql` creates the function BEFORE the `CREATE TABLE clients` + `CREATE POLICY` blocks. Ordering:

1. `CREATE OR REPLACE FUNCTION app_private.user_org_role()` (this function)
2. `CREATE TABLE public.clients (...)` (the table)
3. `ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY`
4. `CREATE POLICY clients_org_select` (uses user_org_id + is_platform_admin — already-existing helpers)
5. `CREATE POLICY clients_org_insert` (uses user_org_id + user_org_role — the NEW helper)
6. `CREATE POLICY clients_org_update` (uses user_org_id + user_org_role)
7. Backfill DO block + ON CONFLICT INSERT (per §2.1)
8. Fixture INSERT (per §2.9 precedence note)

**New verification AC (AC-B1a-14 added to B-1a):**

```sql
-- Post-migration: verify helper function exists
SELECT proname, pronamespace::regnamespace::text AS schema
FROM pg_proc
WHERE pronamespace = 'app_private'::regnamespace
  AND proname = 'user_org_role';
-- Expected: 1 row with proname='user_org_role' + schema='app_private'
```

Plus runtime sanity check (verify the function resolves correctly):

```sql
-- As an authenticated user with a known org membership:
SELECT app_private.user_org_role();
-- Expected: returns the user's role string (e.g., 'admin', 'pm', 'owner', 'accounting')
-- Expected: NOT NULL for any user with an active org_members row
```

**Future-discipline note (added to CLAUDE.md or as a TD entry per nwrp156 item 4):**

> **SECURITY DEFINER + search_path = public rule (new convention; codified 2026-05-15 per nwrp156):**
>
> Any new SECURITY DEFINER PostgreSQL function added in any plan MUST include `SET search_path = public` (or an equivalent explicit schema list) in its declaration. This closes the SECURITY DEFINER `search_path` injection vector (a CWE-426 Untrusted Search Path class issue). The function `app_private.user_org_role()` added in B-1a is the canonical reference.
>
> Source migrations that exemplify the rule (post-codification):
> - `supabase/migrations/00100_clients_schema_foundation.sql` (B-1a — first explicit instance)
>
> Pre-codification SECURITY DEFINER functions in the codebase may or may not have this property; not a back-port priority unless surfaced via Wave-A iter-1 standards-research findings. Plan-review iter-1 enforces forward-going via grep:
>
> ```bash
> # Plan-review iter-1 check (any plan that adds CREATE FUNCTION):
> grep -A 5 'CREATE OR REPLACE FUNCTION\|CREATE FUNCTION' <migration-file> | grep -E 'SECURITY DEFINER' && \
>   grep -A 5 'CREATE OR REPLACE FUNCTION\|CREATE FUNCTION' <migration-file> | grep -E 'SET search_path' || \
>   echo "VIOLATION: SECURITY DEFINER without SET search_path"
> ```

This codification will be added to `CLAUDE.md` Standing Rules → Architecture posture at slice ship time (B-1b post-execute custodian sweep handles the CLAUDE.md update; aligns with the type-generation rule that B-1b §10 already adds).

**Note on `accounting` removal:** per security HIGH-2 (§2.3 below), `accounting` role removed from INSERT + UPDATE policies. Diane has no documented business need to create/modify homeowner records (PM/admin function).

**Verification (new AC-B1a-12):**
```sql
-- All 3 clients policies use helper-form
SELECT polname, qual::text AS using_clause, with_check::text AS check_clause
FROM pg_policy
WHERE polrelid = 'public.clients'::regclass
ORDER BY polname;
-- Expected: 3 rows; all using/with_check clauses contain '(SELECT app_private.user_org_id())'
```

### §2.3 — Remove `accounting` role from RLS INSERT + UPDATE (security HIGH-2; HIGH)

**Issue (security HIGH-2):** Original RLS grants INSERT + UPDATE to `role IN ('owner', 'admin', 'pm', 'accounting')`. Diane (accounting) has no documented business need to create/modify homeowner client records — PM/admin function during job onboarding. POLP violation on PII table with `forever` retention.

**Patch:** Already incorporated in §2.2 above — role set is `('owner', 'admin', 'pm')`. Accounting role can SELECT (read for accounting workflows) but not write.

**Verification (new AC-B1a-13):**
```sql
-- accounting role NOT in clients write policies
SELECT polname FROM pg_policy
WHERE polrelid = 'public.clients'::regclass
  AND with_check::text ILIKE '%accounting%';
-- Expected: 0 rows
```

### §2.4 — Acknowledge sandbox probe gap during plan-author (planner W-2; WARNING)

**Issue (planner W-2):** B-1a planner could not run the 4 backfill probes at plan-author time because Supabase MCP tools weren't in the agent's tool list. B-D080 planner ran probes successfully via Node + service-role + PostgREST. Asymmetric discipline.

**Patch:** Add §4 acknowledgment block to B-1a plan body OR in this addendum:

> **Sandbox probe gap acknowledgment (nwrp155 ack per planner W-2):**
> B-1a planner ran into a Supabase MCP tool-availability gap at plan-author time. B-D080 planner used Node + service-role + PostgREST to bypass the gap; B-1a planner did not. This is a one-time discipline gap, NOT a process bug. Going-forward: gsd-planner briefs must explicitly list the Node + service-role fallback path when probes are required. The actual probes run at execute time per existing Task 3 gate (orphan probe pre-DDL). Jake explicitly acknowledges this gap.

**Verification:** acknowledgment present in plan body OR addendum §2.4 (this entry).

### §2.5 — Extend `idx_clients_full_name_lower` to include email (database W-2; WARNING)

**Issue (database W-2):** `idx_clients_full_name_lower` partial index covers `(org_id, lower(trim(full_name)))` but the uniqueness key needs all three columns including `lower(trim(email))`. The unique index from §2.1 covers this, but the lookup index for client search (e.g., the new `/api/clients?search=` endpoint per §3 below) benefits from the broader cover.

**Patch:** Drop `idx_clients_full_name_lower` (if present) and replace with the partial unique index from §2.1. The unique index doubles as a lookup index. Alternative: keep both — partial unique for backfill safety + lookup index for search performance. Recommend the alternative since the search endpoint will benefit.

```sql
-- Keep both:
CREATE UNIQUE INDEX idx_clients_org_name_email_unique
  ON public.clients (org_id, lower(trim(full_name)), lower(trim(coalesce(email, ''))))
  WHERE deleted_at IS NULL;

CREATE INDEX idx_clients_full_name_lower
  ON public.clients (org_id, lower(trim(full_name)))
  WHERE deleted_at IS NULL;
```

The lookup index supports prefix-search via `lower(trim(full_name)) LIKE 'query%'`.

### §2.6 — ON DELETE CASCADE retention caveat (compliance W-3; WARNING)

**Issue (compliance W-3):** `clients.org_id REFERENCES organizations(id) ON DELETE CASCADE` contradicts the `forever` retention class claim. If an org is deleted, all clients rows CASCADE-delete — destroys `forever`-class data.

**Patch:** Add comment to migration body explaining the convention:

```sql
-- ON DELETE CASCADE on clients.org_id is the canonical org-deletion lifecycle
-- (per Q10b + CLAUDE.md "Retention class: tenant-deletion-lifecycle"). 
-- The `forever` retention class refers to retention WITHIN active org lifetime,
-- NOT survival across org deletion. Org deletion is the boundary; within that
-- boundary, soft-delete via `deleted_at` preserves audit trail per
-- CLAUDE.md "Never delete records — soft delete only."
-- This semantic matches the tenant-deletion-lifecycle entries in
-- .planning/architecture/ENTITY-INVENTORY.md.
```

### §2.7 — C1.1 confidentiality mapping in §11 (compliance W-2; WARNING)

**Issue (compliance W-2):** B-1a §11 maps CC6.1 + CC7.2 + PI1.1 but skips C1.1 (Confidentiality) even though `clients` is the first PII-heavy entity since C1.1 was added to ARCHITECTURE.md §7.

**Patch:** Add C1.1 row to B-1a §11 SOC2 mapping:

> **C1.1 (Confidentiality)** — `clients.email` + `clients.phone` classified PII?=yes per ENTITY-INVENTORY.md row 22; PII fence narrows PostgREST embed surface; future legitimate display routes through explicit `/api/clients/[id]` GET endpoint (deferred to F3 magic-link work per design-pushback W-1). Plan-review iter-1 grep gate + `client-pii-not-embedded` validator (B-1b §7.3) enforce the fence at two mechanical layers.

### §2.8 — Document NULL-grouping semantics in probe (c) commit body (ai-logic NOTE; NOTE)

**Issue (ai-logic-tester NOTE):** Probe (c) groups by `(org_id, lower(trim(client_name)), lower(trim(client_email)))`. Postgres GROUP BY treats NULLs as equal. Multiple Drummond jobs with `client_name = 'Drummond'` + `email = NULL` collapse to one canonical client. Without explicit note, reviewer panics on probe returning 1 row for Drummond.

**Patch:** Add commit body footnote at B-1a execute time:

> "Probe (c) GROUP BY semantics: Postgres treats NULL emails as equal in GROUP BY. Multiple Drummond jobs sharing `client_name='Drummond'` + `email=NULL` collapse to one canonical client (the desired behavior — one Drummond entity in clients table). The `coalesce(email, '')` in the unique index from §2.1 mirrors this semantic. Probe (c) returning N rows means N distinct (name, email) groupings, NOT N ambiguous data points."

### §2.9 — Fixture client created_by harness-fixture UUID precedence note (architect WARN-5; NOTE)

**Issue (architect WARN-5):** B-1a §6 line 458 inserts fixture client with `created_by = '5eb26edc-5989-477f-ac42-d1e9264db0e2'` (harness-fixture@nightwork.local UUID). The UUID exists per smoke-seed.sql line 23 + 208. Migration order matters: B-1a applies via Supabase MCP execute; if it runs BEFORE smoke-seed.sql re-apply, the auth.users row must already exist from 00092/00093.

**Patch:** Add precedence note to B-1a migration body (before the fixture INSERT block):

```sql
-- Fixture client created_by = '5eb26edc-5989-477f-ac42-d1e9264db0e2'
-- (harness-fixture@nightwork.local). This UUID is established by migrations
-- 00092 + 00093 (Verification Harness Fixture Org / Layer 3 verification
-- harness) and is preserved across smoke-seed.sql re-applies via
-- ON CONFLICT (id) DO UPDATE per Wave-E E-2 + nwrp145 codification.
-- Pre-condition: auth.users row with id = '5eb26edc-...' exists. Verified at
-- migration apply time; HALT if missing.
INSERT INTO public.clients (...) VALUES (...);
```

### §2.10 — Cross-reference 00099.down chain (data-migration CP-4; WARNING)

**Note:** This is the corresponding addition to B-1a.down — symmetric to §1.4 above. B-1a down migration adds equivalent rollback-chain comment.

```sql
-- ============================================================================
-- ROLLBACK CHAIN ORDERING (per data-migration CP-4 + nwrp155):
-- ============================================================================
-- This down migration drops clients table + jobs.client_id column. If
-- executing multi-migration rollback after Slice-1 has shipped:
--
--   1. 00101.down — re-add jobs.client_name/email/phone (data NOT restored)
--   2. 00100.down — this migration (drop clients + jobs.client_id)
--   3. 00099.down — drop 11 FK constraints (optional; not strictly required
--                    if rollback is targeted at Slice-1 only)
--
-- Standalone rollback of 00100 (after 00101 ran): SAFE. The clients table
-- is gone; backfilled data lost; original jobs.client_* columns restored
-- (nullable; data not restored per 00101.down contract).
-- ============================================================================
```

---

## §3 — B-1a-bis patches (16)

### §3.1 — BLK-4 / B4: `clients.name` → `clients.full_name` across §4 refactor map (database CRITICAL — escalated to BLOCKING; BLOCKING)

**Issue (database-reviewer CRITICAL, elevated to BLOCKING by impact):** B-1a creates `clients` table with column `full_name TEXT NOT NULL`. B-1a-bis §4 refactor map uses `client:clients(id, name)` in 14 of 16 consumer embed strings. PostgREST returns PGRST204 at runtime on every embed. Job-matcher.ts row correctly uses `full_name` (so author knew the real name); rest of refactor map uses shorthand.

**Patch:** Find/replace in B-1a-bis §4 refactor map (and in ACs B1a-bis-04 + B1a-bis-05 grep patterns):

```
client:clients(id, name)         →  client:clients(id, full_name)
client:clients(id, name, address) →  client:clients(id, full_name, address)
```

All 14 affected rows in §4 refactor map. Plus the 2 already-correct rows (job-matcher + 1 other) verified to use `full_name` already.

**Patch also affects ValidatorContext + WI-001/WI-013 if they reference clients display:**
- B-1b §7.3 `client-pii-not-embedded` validator regex must catch the corrected form. Already covered by §6.1 regex generalization (`(:\s*)?clients?`).

**Verification (new AC-B1a-bis-15a; renumber existing AC-B1a-bis-15 to AC-B1a-bis-16 per §3.4 patch):**
```bash
grep -nE 'client:clients\(id, name(\s|,|\))' .planning/phases/stage-f1-knowledge-graph-auth-wave-b/B-1a-bis-clients-consumer-refactor-PLAN.md
# Expected: 0 hits (all replaced with full_name)
```

### §3.2 — B5: Advance `'client'` ActivityEntityType extension into B-1a-bis (nwrp155 B5; BLOCKING — escalated from 2-reviewer WARNING)

**Issue (enterprise-readiness W-1 + compliance W-1; 2-reviewer agreement → BLOCKING per synthesis rule):** `/api/jobs` POST/PATCH find-or-create writes new `clients` rows. `'client'` is NOT in `ActivityEntityType` enum until B-4 in Slice-2. SOC2 CC7.2 evidence gap during B-1a-bis → B-4 window.

**Patch (per nwrp155 B5 decision — partial pull; NOT full B-4):**

1. **Extend `ActivityEntityType` enum in `src/lib/activity-log.ts:20-49`** to add `'client'`:

```typescript
export type ActivityEntityType =
  | 'invoice'        // existing
  | 'draw'           // existing
  | 'job'            // existing
  | 'vendor'         // existing
  // ... existing entries unchanged ...
  | 'client';        // NEW per nwrp155 B5 — partial pull from Slice-2 B-4
```

2. **Add activity-log helper invocation** in `/api/jobs/route.ts` POST + PATCH handlers, in the find-or-create branch when a NEW clients row is INSERTed:

```typescript
if (createdNewClient) {
  await logActivity({
    org_id: membership.org_id,
    user_id: membership.user_id,
    entity_type: 'client',
    entity_id: newClient.id,
    action: 'client.created',
    details: {
      source: 'jobs_find_or_create',
      full_name: newClient.full_name,
      // NB: email/phone NOT logged per Q1 PII fence — even in audit_log details
    },
  });
}
```

3. **Add cross-reference note** in B-1a-bis frontmatter `files_modified`:

```yaml
files_modified:
  # ... existing entries ...
  - src/lib/activity-log.ts  # NEW: extend ActivityEntityType per nwrp155 B5 partial pull from Slice-2 B-4
```

4. **Slice-2 B-4 plan-author note:** B-4 should NOT re-add `'client'` (already done in B-1a-bis). B-4 extends `lien_releases`, `proposals`, `client_portal_access` enum values only. Document in B-4 plan-author brief once Slice-2 dispatches.

**Verification (new AC-B1a-bis-17):**
```bash
grep -nE "^\s*\|\s*'client'\s*$" src/lib/activity-log.ts
# Expected: 1 hit (the new enum entry)

grep -nE "entity_type:\s*'client'" src/app/api/jobs/route.ts
# Expected: ≥1 hit (the helper invocation in find-or-create branch)
```

### §3.3 — C3: Add `scripts/e2e-dewberry-setup.mjs` to files_modified (architect CRITICAL-1; CRITICAL)

**Patch:** B-1a-bis frontmatter `files_modified` adds the missing entry between existing script entries.

```yaml
files_modified:
  # ... migration + 16 src files ...
  - scripts/fixtures/smoke-seed.sql
  - scripts/rematch-jobs.ts
  - scripts/e2e-dewberry-setup.mjs  # ITER-2 §3.3 — missing entry per architect CRITICAL-1
  - src/app/api/clients/route.ts  # NEW per §3.5 C5/C6 Combobox scope expansion
```

Plus re-verify Rule 5 intersection check across all 4 plans (still empty — `scripts/e2e-dewberry-setup.mjs` only touched by B-1a-bis; `src/app/api/clients/route.ts` is greenfield).

### §3.4 — C4: Add AC-B1a-bis-15 for down-migration header warning (planner C-2; CRITICAL)

**Patch:** New AC.

```
AC-B1a-bis-15: `supabase/migrations/00101_drop_jobs_client_columns.down.sql` header
contains the explicit "data NOT restored on rollback" warning + cross-reference to
the coordinated-rollback procedure documented in B-1a-bis §11.3.

Verification:
grep -nE 'data NOT restored on rollback' supabase/migrations/00101_drop_jobs_client_columns.down.sql
# Expected: 1 hit

grep -nE 'coordinated-rollback procedure' supabase/migrations/00101_drop_jobs_client_columns.down.sql
# Expected: 1 hit (cross-reference to plan §11.3)
```

Renumber subsequent ACs (existing AC-B1a-bis-15 stays at 15 — there isn't one yet; this becomes the new 15. AC-B1a-bis-15a from §3.1 becomes 16; AC-B1a-bis-17 from §3.2 stays 17 OR renumber as 16/17/18 depending on final count).

**Final AC count: 17** (was 14; +1 from §3.1 + 1 from §3.2 + 1 from §3.4).

### §3.5 — C5 + C6: Pin Combobox + ship `/api/clients?search=` GET endpoint (design-pushback C-1 + C-2 + nwrp155 C5/C6; CRITICAL)

**Patch part A — Pin Combobox in §4 refactor map:**

Replace plan §4 line 282 ("single 'Client' combobox (autocomplete on /api/clients?search= OR plain text input with find-or-create on save)") with:

> "Replace 3 inputs (`client_name` + `client_email` + `client_phone`) with single **Combobox** primitive per COMPONENTS.md §1.4 (Ross Built ~14 clients = Combobox territory). The Combobox is fed by `/api/clients?search=<query>` GET endpoint (NEW per nwrp155 C5/C6 scope expansion — see §3.5 part B below). Combobox value is `client_id` (UUID); selection writes to `jobs.client_id` directly. **Find-or-create fallback:** the Combobox supports a "Create new client: <typed text>" option at the bottom of the dropdown. Selecting it triggers `/api/jobs` POST with `client_name_for_create: <typed text>` body field; server-side find-or-create then resolves to a clients row and writes activity_log entry per §3.2 B5 patch. **No plain text input fallback.** Free-text would bypass the dedup signal locked by §2.1 BLK-1 partial unique index."

**Patch part B — Ship `/api/clients?search=` GET endpoint:**

New file `src/app/api/clients/route.ts` (greenfield):

```typescript
import { NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/auth/membership";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { membership } = await getCurrentMembership();
  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("search") ?? "";
  if (query.length < 2) {
    return NextResponse.json({ clients: [] });
  }

  const supabase = await createServerSupabaseClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, full_name")  // NB: id + full_name ONLY — PII fence per Q1
    .eq("org_id", membership.org_id)
    .is("deleted_at", null)
    .ilike("full_name", `%${query}%`)
    .order("full_name", { ascending: true })
    .limit(20);

  if (error) {
    console.error("[api/clients] search query error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  return NextResponse.json({ clients: clients ?? [] });
}
```

**Note:** GET endpoint returns `{id, full_name}` ONLY (NOT email/phone) per PII fence Q1. Combobox doesn't need email/phone for selection display. The endpoint inherits RLS via the org-scoped `eq("org_id", ...)` filter (defense-in-depth + RLS at DB layer).

**Patch part C — files_modified addition (covered in §3.3 above):**

```yaml
- src/app/api/clients/route.ts  # NEW
```

**Verification (new AC-B1a-bis-18):**
```bash
ls src/app/api/clients/route.ts
# Expected: exists

grep -nE 'export async function GET' src/app/api/clients/route.ts
# Expected: 1 hit

curl -sI 'https://nightwork-platform.vercel.app/api/clients?search=Smoke' -H "Cookie: <harness-fixture session cookie>"
# Expected at execute time: HTTP 200 + JSON {clients: [...]}
```

### §3.6 — C7: Name OnboardWizard email/phone removal as DELIBERATE regression (design-pushback C-3 + nwrp155 C7; CRITICAL)

**Patch:** Replace B-1a-bis §12 cosmetic-only OnboardWizard refactor description with explicit "DELIBERATE REGRESSION" subsection:

> **DELIBERATE REGRESSION (per nwrp155 C7):**
>
> OnboardWizard Step 5 originally collected `client_name + client_email + client_phone`. Post-B-1a-bis, Step 5 collects `client_name` only. Email + phone fields are REMOVED from the wizard form per Q1 PII fence + Q2 A1 normalization.
>
> **Why this is acceptable (per nwrp155 C7 disposition):**
> 1. Wizard is **org-onboarding** scope (org admin creates the org's first job), NOT **client-onboarding** scope. Client contact details are managed elsewhere (Slice-2 Owner Portal Path A's client invite flow OR an explicit `/api/clients/[id]` PATCH endpoint, both deferred to F3 magic-link work).
> 2. **No production impact today.** Ross Built does NOT currently use Owner Portal magic-link invites (Path A scope deferred to F3). The email/phone fields in the wizard write to `jobs.client_email/phone` columns which B-1a-bis is REMOVING anyway. The fields would be dead-data even if retained.
> 3. **2-week regression window bounded.** Slice-2 Plan B-2 ships Owner Portal Path A; B-2 plan-author MUST add the client-contact-collection flow at that time. If Slice-2 ships >2 weeks after Slice-1, that's still inside the Owner Portal feature being unbuilt today — no production user is affected.
>
> **Restoration path (Slice-2 / F3):** Slice-2 Plan B-2 (Owner Portal Path A) adds client-contact-collection via explicit `/api/clients/[id]` PATCH endpoint (admin-gated; sends to clients.email/phone for magic-link delivery). Field re-appears in the appropriate UX surface (NOT the org-onboarding wizard).

**TD entry added to MASTER-PLAN.md §11 (or via B-1a-bis commit at execute time):**

> **TD-WB-WIZARD-CLIENT-CONTACT** (LOW): OnboardWizard Step 5 collects `client_name` only post-B-1a-bis. Email + phone collection deferred to Slice-2 Plan B-2 (Owner Portal Path A) via `/api/clients/[id]` PATCH endpoint. Restoration ship requirement: Slice-2 B-2 commit. Until then: org-onboarding flow ships without client contact details (acceptable because Ross Built doesn't use Owner Portal magic-links currently). Source: nwrp155 C7 disposition.

### §3.7 — C1 partial: PII fence regex generalize to aliased embeds (security CRIT-1; CRITICAL — partial; B-1b portion covered in §4.6)

**Issue (security CRIT-1):** Both validator regex AND plan-review grep gates only match literal `client:clients(...)` alias. Aliased forms (`homeowner:clients(id,email)`, `owner:clients(id,phone)`) bypass both layers.

**Patch (B-1a-bis portion):** Update §5.2 plan-review grep + AC-B1a-bis-04 + AC-B1a-bis-05 grep patterns:

```bash
# Old (literal alias):
grep -rE "client:clients\(.*\*.*\)" src/
grep -rE "client:clients\([^)]*(\bemail\b|\bphone\b)" src/

# New (aliased forms):
grep -rE "(\w+:\s*)?clients?\(.*\*.*\)" src/
grep -rE "(\w+:\s*)?clients?\([^)]*(\bemail\b|\bphone\b)" src/
```

The `(\w+:\s*)?clients?` prefix matches: literal `clients(`, `client:clients(`, `homeowner:clients(`, `owner:clients(`, etc. — ANY alias word followed by `:` then `clients`. Also matches the bare `clients(` form for completeness.

**Verification (revised AC-B1a-bis-04):**
```bash
grep -rE "(\w+:\s*)?clients?\(.*\*.*\)" src/
# Expected: 0 hits

grep -rE "(\w+:\s*)?clients?\([^)]*(\bemail\b|\bphone\b)" src/
# Expected: 0 hits
```

### §3.8 — Files-modified intersection check across all 4 plans (planner W-3; WARNING)

**Issue (planner W-3):** B-1a-bis §14.3(d) only addresses intersection vs B-1a. Should mechanically check vs B-D080 + B-1b too.

**Patch:** Replace §14.3(d) with comprehensive table:

> **Rule 5 (files_modified intersection check across all 4 plans):**
> | Plan pair | Intersection | Status |
> |-----------|--------------|--------|
> | B-D080 ∩ B-1a-bis | ∅ | PASS — B-D080 only touches migration 00099 |
> | B-1a ∩ B-1a-bis | {} → all B-1a's are 00100 migration; B-1a-bis is 00101 + src refactors | PASS — disjoint at file-path level |
> | B-1b ∩ B-1a-bis | ∅ — B-1b touches `src/lib/knowledge-graph/`, `src/lib/types/`, `src/lib/verification/layer2/`, hooks, harness; B-1a-bis touches `src/app/api/jobs/`, `src/app/api/clients/`, `src/components/job-sidebar.tsx`, UI pages, scripts, migration 00101 | PASS — disjoint |
> | Sequential execute required | YES per migration numbering 00099 → 00100 → 00101 + post-B-1a-bis types regen for B-1b | enforced via `parallel_execute_ok: false` on all 4 plan frontmatters |

### §3.9 — Migration header clarify code-level vs DB-level probe (database CRT-3; WARNING)

**Issue (database CRT-3):** B-1a-bis migration 00101 header conflates code-level forward grep with DB-level reverse probe. Executor could skip the grep.

**Patch:** Restructure 00101 migration header:

```sql
-- ============================================================================
-- B-1a-bis Migration 00101: DROP jobs.client_name/email/phone columns
-- ============================================================================
-- PRECONDITIONS (executor MUST verify before applying):
--
-- 1. CODE-LEVEL FORWARD GREP (run via bash, NOT inside transaction):
--    grep -rE 'client_name|client_email|client_phone' src/ scripts/ \
--      --include='*.ts' --include='*.tsx' \
--      | grep -v 'fixtures/' | grep -v 'design-system/' | grep -v 'prototypes/'
--    Expected: 0 hits in active code (excluding fixtures + prototypes which
--    are sample-data-decoupled per §3.2 row 17-23).
--    HALT if hits > 0; complete B-1a-bis consumer refactor before re-applying.
--
-- 2. CODE-LEVEL HOOK GATE: smoke harness post-refactor run must show
--    ≤2 failures matching TD-WE-03 baseline (Wave-B prereq #12).
--
-- 3. DB-LEVEL REVERSE PROBE (runs INSIDE the transaction below; ROLLBACK on
--    fail). This is the FINAL gate; the code-level checks above are
--    executor's responsibility.
-- ============================================================================
BEGIN;

-- DB-level reverse probe + RAISE EXCEPTION on > 0 result
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM public.jobs
  WHERE client_id IS NULL
    AND (client_name IS NOT NULL OR client_email IS NOT NULL OR client_phone IS NOT NULL);

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'B-1a-bis 00101 reverse probe FAIL: % jobs have non-NULL embedded data but NULL client_id. HALT before DROP.', orphan_count;
  END IF;
END $$;

-- (DROP COLUMN statements follow)
ALTER TABLE public.jobs DROP COLUMN client_name;
ALTER TABLE public.jobs DROP COLUMN client_email;
ALTER TABLE public.jobs DROP COLUMN client_phone;

COMMIT;
```

### §3.10 — 00101.down operator opt-in runbook entry (data-migration WARN-2/5; MEDIUM)

**Issue (data-migration WARN-2/5):** 00101.down re-adds columns as nullable TEXT but does NOT restore data. Plan ships commented-out reverse-backfill UPDATE for operator opt-in. Needs runbook entry codifying the path.

**Patch:** Add runbook stub at `.planning/runbooks/wave-b-slice-1-rollback.md` (NEW; gitignored under .planning/runbooks/ if applicable, or tracked if whitelisted):

```markdown
# Wave-B-Slice-1 Rollback Runbook

## Scenario A: rollback after B-1a-bis ships but before B-1b ships

1. Revert B-1b commit(s) — restores pre-B-1b types + harness state.
2. Revert B-1a-bis commit(s) — restores pre-refactor source code in 16 consumers.
3. Apply 00101.down via Supabase MCP — re-adds jobs.client_name/email/phone as nullable TEXT.
4. **Operator decision: backfill embedded columns from clients table?**
   - YES path: uncomment the reverse-backfill UPDATE in 00101.down + run:
     ```sql
     UPDATE public.jobs j
     SET client_name = c.full_name,
         client_email = c.email,
         client_phone = c.phone
     FROM public.clients c
     WHERE j.client_id = c.id
       AND c.deleted_at IS NULL;
     ```
   - NO path: leave embedded columns NULL (operator accepts data loss).
5. Apply 00100.down — drops clients table + jobs.client_id column.
6. (Optional) Apply 00099.down — drops 11 FK constraints from B-D080.

## Scenario B: rollback after Slice-1 fully shipped but before Slice-2 starts

Same as Scenario A but skip step 1 (no B-1b revert needed; B-1b is application-layer + harness, not schema-bound to clients table).

## Scenario C: emergency rollback (clients table has been written to in production with non-fixture data)

HALT. Manual data export of clients table required BEFORE step 5. Engage Jake.
```

### §3.11 — job-sidebar mailto interim affordance gap (design-pushback W-1; WARNING)

**Issue (design-pushback W-1):** B-1a-bis removes `job-sidebar.tsx` mailto link to `selectedJob.client_email` at line 366. TD-B1abis-01 covers F3 restoration but interim gap is 6-12 weeks where PMs lose one-click email-to-client.

**Patch (interim affordance):** Replace mailto link with a "Copy email to clipboard" button that fetches `clients.email` via the new `/api/clients/[id]` GET endpoint (which DOES return email per role-gated auth — see Slice-2 B-2 for full endpoint). For Slice-1 interim, add a tooltip placeholder:

```tsx
{/* Interim affordance: client contact details unavailable in Slice-1 per
    nwrp155 C7 + design-pushback W-1 disposition. Restored in Slice-2 Plan
    B-2 via /api/clients/[id] GET (admin-gated) — see TD-B1abis-01. */}
<span className="text-nw-gulf-blue opacity-50 cursor-not-allowed" title="Client contact details unavailable — restored in next slice">
  Email (Slice-2)
</span>
```

OR (cleaner): remove the mailto element entirely; add a placeholder "Client contact details available in Slice-2" tooltip elsewhere in the sidebar. Plan-author picks at execute time.

**TD entry update:** TD-B1abis-01 already captures the F3 restoration plan. Append: "Interim Slice-1 affordance: 'Email' label disabled + tooltip; OR removed entirely + sidebar shows placeholder. Plan-author picks at B-1a-bis execute time."

### §3.12 — Find-or-create write-path question (design-pushback W-3; WARNING)

**Issue (design-pushback W-3):** Does `client_name_for_create` find-or-create path write `clients.email`/`phone` or strictly name-only?

**Patch:** Document in B-1a-bis §4 refactor map for `/api/jobs/route.ts` POST/PATCH:

> **`client_name_for_create` body field is NAME-ONLY.** Find-or-create writes `clients.full_name = <typed text>` + `clients.email = NULL` + `clients.phone = NULL`. Email/phone collection deferred to Slice-2 B-2 (Owner Portal Path A) via `/api/clients/[id]` PATCH endpoint per §3.6 C7 disposition.
>
> Server-side find-or-create logic:
> 1. Resolve `org_id` via `getCurrentMembership()`.
> 2. Search clients table for existing row matching `(org_id, lower(trim(<typed text>)), '')` (empty-string email per coalesce semantic from §2.1 unique index).
> 3. If found: use existing `clients.id` for `jobs.client_id`.
> 4. If not found: INSERT new clients row with `full_name = <typed text>`, `email = NULL`, `phone = NULL`. Write activity_log entry per §3.2 B5 patch. Return new id.
> 5. Set `jobs.client_id` to resolved id.

### §3.13 — /api/jobs clients.org_id explicit cross-org check (multi-tenant C-1; WARNING)

**Issue (multi-tenant C-1):** Plan §4 says "RLS blocks cross-org" but a POST that supplies a valid tenant-B `client_id` (UUID guessed/leaked) would succeed at jobs INSERT (FK validates row exists, no org check at FK level). Subsequent reads fail RLS but post-INSERT state is anomalous (jobs.client_id pointing at cross-org clients row).

**Patch:** Add explicit `clients.org_id == membership.org_id` check in `/api/jobs/route.ts` POST + PATCH:

```typescript
// /api/jobs/route.ts POST handler (around line 42-44 per original plan §4)

if (body.client_id) {
  // Verify the client_id belongs to the caller's org BEFORE inserting jobs
  const { data: clientCheck } = await supabase
    .from("clients")
    .select("id")  // NB: SELECT only via RLS-fenced query; cross-org client returns null
    .eq("id", body.client_id)
    .eq("org_id", membership.org_id)  // belt-and-suspenders explicit check
    .is("deleted_at", null)
    .maybeSingle();

  if (!clientCheck) {
    return NextResponse.json(
      { error: "Invalid client_id" },
      { status: 400 }
    );
  }
}
// Proceed with jobs INSERT...
```

Same pattern in PATCH handler (around line 185-187).

### §3.14 — Grep exclusion verification (planner W-5; WARNING)

**Issue (planner W-5):** AC-B1a-bis-04 grep excludes `_fixtures/`, `design-system/`, `prototypes/` but not mechanically verified that ALL 7 NO-CHANGE files match these patterns.

**Patch:** Add mechanical verification step to AC-B1a-bis-04:

```bash
# Verify the 7 NO-CHANGE fixture files are captured by the 3 exclusion patterns:
for f in \
  'src/components/prototypes/DrawPrintView.tsx' \
  'src/components/prototypes/OwnerDashboardView.tsx' \
  'src/components/prototypes/DocumentReviewView.tsx' \
  'src/app/design-system/_fixtures/drummond/types.ts' \
  'src/app/design-system/_fixtures/drummond/jobs.ts' \
  'src/app/design-system/_fixtures/jobs.ts' \
  '.planning/architecture/CURRENT-STATE.md'; do
  echo "$f" | grep -qE '(_fixtures/|design-system/|prototypes/|\.planning/)' && echo "EXCLUDED: $f" || echo "NOT EXCLUDED: $f"
done
# Expected: all 7 lines start with "EXCLUDED:"
```

### §3.15 — nw-gulf-blue token verification on surviving Map link (design-pushback W-2; WARNING)

**Issue (design-pushback W-2):** `job-sidebar.tsx:367, 378` use `text-nw-gulf-blue` token. After mailto removal (§3.11), Map link survives at line 378. Confirm post-edit hook doesn't flag the surviving `text-nw-gulf-blue` (it's a valid Slate token per SYSTEM.md §1i; AA-normal at #436A7A; should not trigger any hook).

**Patch:** Verify at execute time. No plan-text amendment needed — this is an execute-time post-commit hook validation.

```bash
# Post-edit hook validation at B-1a-bis execute time:
.claude/hooks/nightwork-post-edit.sh src/components/job-sidebar.tsx
# Expected: 0 NAMED_HITS, 0 PURE_HITS (text-nw-gulf-blue is whitelisted)
```

### §3.16 — Misc inline notes (NOTE)

- AC-B1a-bis-13 unit-test artifact requirement (ai-logic NOTE): plan-author must produce a concrete test file under `__tests__/.scratch/` (or similar) exercising job-matcher.ts pre/post equivalence on Smoke Client A..J + null + single-word edge cases. NOT "test OR representative-input test" — must be a test file.
- AC-B1a-bis-13 verification: `ls __tests__/.scratch/job-matcher-equivalence.test.ts` returns the file.

---

## §4 — B-1b patches (10)

### §4.1 — B3: depends_on change `[B-1a]` → `[B-1a-bis]` (architect + security 2-reviewer agreement; BLOCKING)

**Patch:** B-1b frontmatter line — change `depends_on: [B-1a]` to `depends_on: [B-1a-bis]`. Update §2 "Why now / dependencies" first bullet:

> **Before:** "Depends on B-1a applied (clients table exists)."
> **After:** "Depends on **B-1a-bis** applied (post-DROP shape). `supabase gen types --linked` reads live schema; if B-1b ran after B-1a but before B-1a-bis, generated `database.types.ts` would include pre-DROP `client_name/email/phone` columns. Sequencing post-DROP ensures generated types reflect the final canonical schema."

### §4.2 — D2 / C2: Trim scope — defer `fixture-coverage.ts` + lock hook-integration option (b) (planner C-1 + nwrp155 D2; CRITICAL)

**Patch (D2 per Jake adjudication):**

1. **Defer `fixture-coverage.ts` Layer 2 standard to Slice-2.** Remove from B-1b scope. Remove from `files_modified`:

```yaml
files_modified:
  # ... existing ...
  - src/lib/verification/layer2/standards/audit-conservation.ts
  - src/lib/verification/layer2/standards/rls-coverage.ts
  - src/lib/verification/layer2/standards/role-permission-integrity.ts
  # REMOVED per nwrp155 D2: src/lib/verification/layer2/standards/fixture-coverage.ts
  # Slice-2 dispatch — TD entry below
```

2. **Lock hook-integration to option (b) Claude-Bash-only.** Remove option (a) `.githooks/pre-commit` extension from §3 step 4. Plan-author at execute time MUST commit to option (b). Document in B-1b §3 step 4:

> "Per nwrp155 D2 + plan-author cannot self-resolve Jake-locked HALT gates: hook-integration is **option (b) only** — Claude-Bash hook at `.claude/hooks/nightwork-type-regen.sh`. NO `.githooks/pre-commit` extension. Jake commits primarily via Claude on this repo per existing convention; the theoretical gap (commits via terminal bypass Claude-Bash hook) is acceptable per `.githooks/pre-commit:63-65` documented uncovered-path design (Drummond gate is at `.githooks/pre-commit`, not the type-regen hook)."

3. **Attribution language:** explicitly note "scope trimmed by Jake decision per GATE 1 adjudication" — NOT "plan-author estimated manageable." Add to B-1b plan body §4 (complexity check):

> **Scope trimmed by Jake decision per GATE 1 adjudication (nwrp155 D2):**
>
> Plan-author iter-1 estimated complexity at 22h ≈ 2.75d, exceeding the Jake-locked 2.5d HALT threshold. Plan-author proposed a "NO HALT" recommendation citing margin + escape valve — REJECTED. Plan-authors cannot self-resolve Jake-locked HALT gates per nwrp152 contract.
>
> Jake adjudication at nwrp155: TRIM SCOPE. Defer `fixture-coverage.ts` Layer 2 standard to Slice-2 (saves ~1.25h). Lock hook-integration to option (b) Claude-Bash-only (saves ~0.5h indecision time). Revised estimate: ~20.25h ≈ 2.5-2.6d. At threshold. Slice ships with 3 Layer 2 standards (audit-conservation, rls-coverage, role-permission-integrity); fixture-coverage drops to Slice-2 dispatch.
>
> **This pattern is orchestrator discipline.** Future plan-authors who attempt to self-resolve Jake-locked HALT gates will be rejected via plan-review iter-1 HALT escalation. Document for posterity.

4. **TD entry added to MASTER-PLAN.md §11 (or via B-1b commit at execute time):**

> **TD-WB-FIXTURE-COVERAGE-DEFERRAL** (LOW): Layer 2 standard `fixture-coverage.ts` deferred from B-1b to Slice-2 per nwrp155 D2 scope trim. The 4th foundational Layer 2 standard (assert every entity in ENTITY-INVENTORY.md has ≥1 row in fixture-harness-org) is more useful after B-2/B-3/B-4 ship more tenant tables. Slice-2 dispatch target: Plan B-7 (or similar Slice-2 harness extension plan). Source: nwrp155 D2 adjudication.

### §4.3 — HIGH-3: Type-regen hook emit stderr on `--no-verify` (security HIGH-3; HIGH)

**Patch:** `.claude/hooks/nightwork-type-regen.sh` MUST emit stderr warning when `--no-verify` detected, not silently exit 0:

```bash
#!/usr/bin/env bash
# .claude/hooks/nightwork-type-regen.sh
# Per security HIGH-3 + nwrp155: emit stderr on --no-verify bypass

set -euo pipefail

if echo "$ARGS" | grep -q -- '--no-verify'; then
  echo "[type-regen] WARNING: --no-verify detected; type-regen hook BYPASSED. Audit trail: commit body must cite Jake authorization per CLAUDE.md '--no-verify' rule." >&2
  exit 0
fi

# ... rest of hook body ...
```

### §4.4 — W.1 listener no timeout/abort (security MED-3; WARNING)

**Patch:** Add TD entry pre-Slice-2 env-var activation:

> **TD-WB-LISTENER-TIMEOUT** (LOW): `useCurrentRole onAuthStateChange` listener (B-1b §11.1) currently has no timeout/abort on the DB query that re-fetches role. Pre-Slice-2 env-flag activation: add `AbortController` with 5s timeout + fallback to cached role on timeout. Source: security MED-3 + nwrp155 §4.4. Track in TD register; gate Slice-2 listener activation on this fix.

### §4.5 — Layer 2 standards service-role client (database WARN-4; WARNING)

**Patch:** Add explicit service-role client comment to each Layer 2 standard:

```typescript
// src/lib/verification/layer2/standards/rls-coverage.ts (NEW per B-1b §10)
//
// Per database-reviewer WARN-4 + nwrp155 §4.5: Layer 2 integrity standards
// MUST use the service-role Supabase client for pg_policies / pg_tables
// introspection. The anon client is RLS-fenced and would return empty
// results for cross-table introspection. Service-role bypasses RLS and
// can introspect the schema state for verification.

import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function verifyRlsCoverage(): Promise<VerificationResult> {
  const supabase = createServiceRoleClient();
  // ... introspect pg_policies + pg_tables ...
}
```

Same pattern for `audit-conservation.ts` + `role-permission-integrity.ts`.

### §4.6 — C1 (B-1b portion): client-pii-not-embedded validator regex generalize (security CRIT-1; CRITICAL — paired with §3.7)

**Patch:** `src/lib/knowledge-graph/validators/client-pii-not-embedded.ts` regex must catch aliased forms:

```typescript
// Per security CRIT-1 + nwrp155 §4.6: catch aliased PostgREST embeds
// (homeowner:clients(...), owner:clients(...), etc.) NOT just literal
// client:clients(...).
const ALIAS_CLIENTS_EMBED = /(\w+:\s*)?clients?\([^)]*\)/g;
const PII_FIELDS = /\b(email|phone)\b/;

export const clientPiiNotEmbedded: Validator<ClientPiiInput> = async (input, ctx) => {
  const violations = [];
  for (const match of input.sourceText.matchAll(ALIAS_CLIENTS_EMBED)) {
    if (PII_FIELDS.test(match[0])) {
      violations.push({
        code: 'client-pii-fence-violation',
        message: `PostgREST embed references PII column: ${match[0]}`,
        evidence: { match: match[0], index: match.index },
      });
    }
  }
  return { ok: violations.length === 0, violations };
};
```

### §4.7 — Rollback strategy verification commands (planner W-4; WARNING)

**Patch:** Add §14 Rollback verification subsection mirroring B-D080's pattern:

```
Rollback verification commands (run after revert):

# 1. Verify KG scaffold removed
ls src/lib/knowledge-graph/ 2>&1 | head -3
# Expected: "No such file or directory"

# 2. Verify database.types.ts removed (or restored to pre-B-1b state)
git log -1 --pretty=format:'%H' -- src/lib/types/database.types.ts
# Expected: commit hash matches B-1b commit OR file doesn't exist

# 3. Verify type-regen hook removed
ls .claude/hooks/nightwork-type-regen.sh 2>&1 | head -3
# Expected: "No such file or directory"

# 4. Verify Layer 2 standards removed
ls src/lib/verification/layer2/standards/ 2>&1 | wc -l
# Expected: pre-B-1b file count

# 5. Verify W.1 listener reverted
grep -nE 'NEXT_PUBLIC_AUTH_STATE_LISTENER' src/hooks/use-current-role.ts
# Expected: 0 hits (env-flag wiring removed)

# 6. Smoke harness baseline still 11/13 PASS
npx tsx scripts/wave-d-smoke.ts --preview-url https://nightwork-platform.vercel.app
# Expected: passed=11 failed=2 (TD-WE-03 baseline)
```

### §4.8 — Smoke claim verifies COMBINED state (planner W-2; WARNING)

**Patch:** Update B-1b §3.4 (smoke route claim):

> **Smoke gate maintenance posture (post-iter-2 clarification):**
> B-1b is the slice's only `requires_smoke: true` plan. Smoke verifies the **COMBINED** B-1a + B-1a-bis + B-1b state — NOT just B-1b's delta. Specifically:
> - Post-B-1a-bis consumer refactor must render correctly (jobs/[id], draws/[id], OnboardWizard, etc.)
> - Post-B-1a-bis DROP COLUMN: no route returns 500 on `jobs.client_name` access
> - Post-B-1b types regen: TypeScript build passes
> - Post-B-1b W.1 listener wiring: env-flag-OFF mode is no-op (no auth state thrashing)
> - Wave-B prereq #12 baseline: 11/13 PASS unchanged
>
> If smoke surfaces NEW failure modes post-B-1b ship → halt + diagnose.

### §4.9 — ValidatorContext membership field (architect NOTE-2; NOTE)

**Patch:** Add `membership?: Membership | null` to ValidatorContext shape:

```typescript
// src/lib/knowledge-graph/types.ts (NEW per B-1b §7)
import type { Membership } from "@/lib/auth/membership";

export interface ValidatorContext {
  supabase: SupabaseClient;
  org_id: string;
  user_id: string | null;
  membership?: Membership | null;  // ITER-2 §4.9 — added per architect NOTE-2
}
```

Optional field; harness/system contexts pass `null` or omit. API-route validators pass the resolved Membership from `getCurrentMembership()`. F2-F5 validators needing role-based logic can read `ctx.membership?.role`.

### §4.10 — WI-013 evidence payload drift sign (ai-logic NOTE; NOTE)

**Patch:** B-1b §7.2 WI-013 validator implementation includes drift sign in evidence:

```typescript
// wi-013-multi-job-allocation.ts
const drift = sumOfAllocations - input.invoice_total_amount;
if (Math.abs(drift) > 1) {  // 1¢ tolerance per CLAUDE.md "What-If Handling rule 4"
  violations.push({
    code: 'wi-013-allocation-sum-drift',
    message: `Allocations sum drift from invoice total: ${drift > 0 ? '+' : ''}${drift} cents`,
    evidence: {
      sum: sumOfAllocations,
      invoice_total: input.invoice_total_amount,
      drift_cents: drift,
      drift_direction: drift > 0 ? 'over' : 'under',  // ITER-2 §4.10 — capture sign
    },
  });
}
```

---

## §5 — Cross-cutting clarifications

### §5.1 — Re-verification scope (iter-2 verification pass)

Per nwrp155 directive, lightweight re-dispatch of 3 reviewers post-iter-2:
- **database-reviewer:** re-verify BLK-1 (backfill idempotency via unique index + ON CONFLICT) + BLK-2 (RLS helper-form) + CRT-1 (pre-existence check removal) + CRT-3 (migration header restructure) + WARN-4 (Layer 2 service-role).
- **nightwork-multi-tenant-architect:** re-verify W-1 (RLS pattern resolution by §2.2 helper-form patch) + C-1 (client_id orphan check at /api/jobs by §3.13).
- **nightwork-design-pushback:** re-verify C-1 (Combobox pin by §3.5) + C-2 (`/api/clients?search=` endpoint by §3.5) + C-3 (wizard regression deliberate naming by §3.6) + W-1 (mailto interim affordance by §3.11).

**Other 7 reviewers SKIP re-verification.** Their findings (mostly WARNING/NOTE) are addressed inline in this addendum; re-running them would re-discover the same fixes.

### §5.2 — HALT GATE 1.5 (re-verification pass) per nwrp155

After 3 re-verification reviewers return, surface to Jake:
- All 3 PASS → ack and proceed to /nx dispatch
- Any reviewer escalates NEW BLOCKING → HALT again; address in iter-3 patches

Per nwrp152 contract: HALT GATEs require Jake adjudication. Plan-authors / orchestrator do NOT auto-resolve.

### §5.3 — Wave-B prereq #12 smoke gate maintenance check

Post-iter-2 + pre-execute: re-run smoke against staging URL to confirm 11/13 PASS baseline still holds:

```bash
set -a; . .env.local; set +a
npx tsx scripts/wave-d-smoke.ts --preview-url https://nightwork-platform.vercel.app
# Expected: passed=11 failed=2; remaining failures = TD-WE-03 DataGrid empty-state
```

Slice ship-readiness verifies this AT execute time post each plan's commit.

---

## §6 — Files referenced in iter-2 patches

This addendum amends the following files at execute time. Files marked NEW will be created; files marked AMEND will be modified per the patches above.

### B-D080
- AMEND `supabase/migrations/00099_user_identity_fk_convention.sql` — remove IF NOT EXISTS guard (§1.1); add D-080 forward-compat header (§1.3)
- AMEND `supabase/migrations/00099_user_identity_fk_convention.down.sql` — add rollback chain ordering comment (§1.4)
- AMEND `.planning/phases/stage-f1-knowledge-graph-auth-wave-b/B-D080-fk-convention-migration-PLAN.md` — fix AC-BD080-05 regclass (§1.2); add probe HALT-path note (§1.5)

### B-1a
- AMEND `supabase/migrations/00100_clients_schema_foundation.sql` — UNIQUE INDEX + ON CONFLICT (§2.1); helper-form RLS (§2.2); accounting removal (§2.3); CASCADE retention caveat (§2.6); fixture precedence note (§2.9); idx_clients_full_name_lower (§2.5)
- AMEND `supabase/migrations/00100_clients_schema_foundation.down.sql` — rollback chain ordering (§2.10)
- AMEND `.planning/phases/stage-f1-knowledge-graph-auth-wave-b/B-1a-clients-schema-foundation-PLAN.md` — sandbox probe gap ack (§2.4); C1.1 mapping (§2.7); NULL-grouping doc (§2.8); 2 new ACs (AC-B1a-11 + AC-B1a-12 + AC-B1a-13)

### B-1a-bis
- AMEND `supabase/migrations/00101_drop_jobs_client_columns.sql` — restructured header (§3.9)
- AMEND `supabase/migrations/00101_drop_jobs_client_columns.down.sql` — explicit "data NOT restored" warning + cross-reference (§3.4)
- NEW `src/app/api/clients/route.ts` — GET search endpoint (§3.5)
- AMEND `src/lib/activity-log.ts:20-49` — ActivityEntityType += 'client' (§3.2)
- AMEND `src/app/api/jobs/route.ts` — find-or-create with cross-org check + activity_log helper (§3.2 + §3.12 + §3.13)
- AMEND `src/components/job-sidebar.tsx` — mailto removal + interim placeholder (§3.11)
- AMEND `src/app/onboard/OnboardWizard.tsx` — email/phone removal + deliberate-regression comment (§3.6)
- NEW `.planning/runbooks/wave-b-slice-1-rollback.md` — operator runbook (§3.10)
- AMEND `.planning/phases/stage-f1-knowledge-graph-auth-wave-b/B-1a-bis-clients-consumer-refactor-PLAN.md` — clients.full_name correction (§3.1); files_modified additions (§3.3); 3 new ACs (AC-B1a-bis-15..17); §4 refactor map Combobox pin + endpoint cite (§3.5); §5.2 regex generalize (§3.7); §12 deliberate regression (§3.6); §14.3 intersection check (§3.8); §3.11 mailto affordance; §3.12 find-or-create write-path spec; §3.13 cross-org check; §3.14 grep exclusion verification

### B-1b
- AMEND `.planning/phases/stage-f1-knowledge-graph-auth-wave-b/B-1b-kg-scaffold-types-pipeline-PLAN.md` — frontmatter depends_on (§4.1); §4 scope-trim attribution (§4.2); files_modified `-fixture-coverage.ts` (§4.2); §3 step 4 hook-integration option (b) lock (§4.2); §14 rollback verification (§4.7); §3.4 smoke claim clarification (§4.8); ValidatorContext membership (§4.9); WI-013 drift sign (§4.10)
- AMEND `.claude/hooks/nightwork-type-regen.sh` — stderr warning on --no-verify (§4.3)
- AMEND `src/lib/knowledge-graph/validators/client-pii-not-embedded.ts` (NEW per B-1b §7.3) — aliased-embed regex (§4.6)
- AMEND `src/lib/verification/layer2/standards/{audit-conservation,rls-coverage,role-permission-integrity}.ts` (NEW per B-1b §10) — service-role client comment (§4.5)
- TD entries added to `.planning/MASTER-PLAN.md` §11 (or via B-1b commit) — TD-WB-FIXTURE-COVERAGE-DEFERRAL (§4.2); TD-WB-LISTENER-TIMEOUT (§4.4); TD-WB-WIZARD-CLIENT-CONTACT (§3.6)

---

## §7 — Out-of-scope clarifications

This addendum does NOT:
- Re-author any of the 4 plans (plans remain canonical; addendum supersedes where conflict)
- Move out-of-Slice-1 scope items into Slice-1 (B-2..B-7 still deferred to Slice-2+)
- Adjudicate slice-architecture decisions beyond GATE 1 (Path A is locked; B-1a-bis split stands)
- Resolve TD entries pre-existing this slice (TD-D-078, TD-WE-01..06 still tracked separately)
- Modify ENTITY-INVENTORY.md (clients entity row will be added in execute-time custodian sweep per Wave-E pattern)

## §8 — Execute readiness

Post-iter-2-commit + re-verification PASS:
- B-D080: ready to execute (8 → 10 ACs after §1.1 + §1.3 additions)
- B-1a: ready to execute (10 → **14** ACs after §2.1 + §2.2 + §2.3 + §2.2-iter-2.5 helper-function AC additions)
- B-1a-bis: ready to execute (14 → 17 ACs after §3.1 + §3.2 + §3.4 additions)
- B-1b: ready to execute (13 ACs unchanged; scope trimmed not added per D2)

Sequencing per nwrp152 + nwrp154 + nwrp155: **B-D080 → B-1a → B-1a-bis → B-1b**, strict sequential per migration numbering + types-generation dependency.

Then `/nightwork-qa` per plan + push to main + GATE 2 HALT after B-1b ships per nwrp152 contract.
