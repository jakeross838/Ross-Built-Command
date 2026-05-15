-- ============================================================================
-- 00100_clients_schema_foundation.sql
-- ============================================================================
--
-- F1-Wave-B-Slice-1 Plan B-1a: Create `clients` entity (homeowners + commercial
-- owners), backfill from embedded jobs.client_name/email/phone, and point
-- jobs.client_id at the new entity via FK.
--
-- !! PATH A SCOPE SPLIT (per nwrp154 Path A) !!
-- This migration DOES NOT DROP the embedded jobs.client_name/email/phone
-- columns. The DROP is owned by Plan B-1a-bis (consumer refactor + DROP
-- atomic transaction, migration 00101), which executes AFTER this migration.
-- See B-1a-bis-clients-consumer-refactor-PLAN.md. Q2 A1 "one source of truth
-- from day one" is honored: the source of truth IS the `clients` table;
-- embedded columns are a transitional denormalized cache that exits at
-- B-1a-bis ship.
--
-- Source decisions:
--   D-080 (MASTER-PLAN.md §10:256) -- clients.created_by FK to auth.users from
--     creation per the parent FK convention codification (Plan B-D080 landed
--     migration 00099 with the convention; this migration honors it natively).
--   D-078 (MASTER-PLAN.md §10:252) -- PostgREST embedding hint scope (PII fence):
--     clients.email + clients.phone MUST NEVER appear in a PostgREST embed.
--     Plan-review iter-1 grep gate blocks `client:clients(*)` and any embed
--     referencing email/phone -- BLOCKING. Future legitimate display-of-email
--     use case routes through an /api/clients/[id] GET endpoint, NOT an embed.
--   D-079 (MASTER-PLAN.md §10:254) -- PII fence scope clarification. Customer
--     PII (homeowner identity) is in scope; vendor B2B contact is out of scope.
--     clients.email + phone are customer PII -> fenced.
--   Q1 nwrp153 APPROVED -- apply PII fence to clients.email + clients.phone
--     from creation.
--   Q2 A1 (umbrella) + Q2 nwrp153 amendment -- normalize from one source of
--     truth. nwrp154 Path A: B-1a does forward-probe backfill (this migration);
--     B-1a-bis does forward+reverse probe + DROP COLUMN atomic transaction.
--   Q7 nwrp153 APPROVED -- obviously-synthetic fixture client name pattern.
--   Q9 D (umbrella) -- >=1 fixture client row in fixture-harness-org.
--   Q10b (umbrella) -- clients is an ORG-scoped tenant table with direct-filter
--     RLS on org_id, NOT join-based.
--   Q12 (umbrella) -- uniform versioning via status_history JSONB.
--   nwrp155 D1 (GATE 1 adjudication) -- MANDATE helper-form RLS via
--     `org_id = (SELECT app_private.user_org_id())` + role gate via
--     `(SELECT app_private.user_org_role())`.
--   nwrp156 iter-2.5 amendment -- B-1a migration MUST create
--     `app_private.user_org_role()` BEFORE the policies that reference it
--     (function does not exist in any prior migration; closest precedent
--     `app_private.user_role()` from 00039 is NOT org-scoped, latent
--     multi-tenant bug).
--
-- Iter-2 patches applied verbatim from ITER-2-PATCHES.md §2:
--   §2.1 BLK-1 -- partial unique index + ON CONFLICT DO NOTHING on backfill
--                  INSERT + `AND c.deleted_at IS NULL` on the UPDATE.
--   §2.2 BLK-2 -- helper-form RLS via (SELECT app_private.user_org_id()) and
--                  (SELECT app_private.user_org_role()) (iter-2.5 amendment:
--                  function created in this migration).
--   §2.3 HIGH-2 -- remove `accounting` role from RLS INSERT + UPDATE write
--                   policies. Role set = ('owner', 'admin', 'pm').
--   §2.5 W-2 -- keep BOTH partial-unique-name+email index AND the lookup
--                idx_clients_full_name_lower index.
--   §2.6 W-3 -- ON DELETE CASCADE retention caveat comment.
--   §2.7 W-2 -- C1.1 SOC2 confidentiality mapping noted in plan §11.
--   §2.8 NOTE -- NULL-grouping semantics documented in commit body.
--   §2.9 NOTE -- fixture-row created_by precedence note for harness-fixture UUID.
--   §2.10 W-4 -- rollback chain ordering comment (in .down.sql).
--
-- V.2 export schema sketch (one-pager per Wave-B-Slice-1 EXPANDED-SCOPE §4):
--   {
--     "id": uuid, "org_id": uuid, "full_name": text,
--     "email": text|null,  // SENSITIVE -- exclude from JSON exports by default
--     "phone": text|null,  // SENSITIVE -- same as email
--     "status_history": jsonb, "created_at": iso, "updated_at": iso,
--     "created_by": uuid, "deleted_at": iso|null
--   }
--
-- BEFORE this migration:
--   * No `clients` table. Owner-identity data is denormalized in
--     jobs.client_name (TEXT) + jobs.client_email (TEXT) + jobs.client_phone
--     (TEXT) -- see migration 00001 (initial_schema.sql) lines 15-17.
--   * Embedded columns are READ by 16 load-bearing src consumers. The
--     consumer-refactor is owned by B-1a-bis (separate plan; runs AFTER
--     this one).
--
-- AFTER this migration:
--   * `clients` table exists with V.1 envelope + status_history JSONB +
--     direct-filter RLS on org_id (3 policies; R.23 shape; helper-form per
--     nwrp155 D1).
--   * `app_private.user_org_role()` SECURITY DEFINER helper function exists
--     (org-scoped role lookup; required by INSERT + UPDATE policies; nwrp156).
--   * jobs.client_id FK to clients(id) ON DELETE SET NULL exists.
--   * jobs.client_name / client_email / client_phone columns **STILL PRESENT**
--     (B-1a-bis owns the DROP).
--   * 1 obviously-synthetic fixture client row in fixture-harness-org seeded
--     ('Harness Fixture Client Alpha', harness-client-alpha@nightwork.local,
--     +15555550100).
--   * 25 backfilled clients rows (per probe (a) results 2026-05-14) plus the
--     1 fixture row = 26 total `clients` rows post-apply (the fixture row
--     happens to also be one of the 10 fixture-harness-org Smoke Clients
--     in different shape -- see §2.9 precedence note).
--   * Forward probe verified atomically inside the transaction; ROLLBACK on
--     probe failure preserves pre-migration state.
--
-- PII fence enforcement contract (per D-078 + D-079 + Q1):
--   * clients.email + clients.phone MUST NEVER appear in a PostgREST embed
--     hint string. The grep patterns (per Plan D-4 Rule 2 codification +
--     ITER-2 §3.7 aliased-form generalization):
--       grep -rE "(\w+:\s*)?clients?\(.*\*.*\)" src/ scripts/
--       grep -rE "(\w+:\s*)?clients?\([^)]*(\bemail\b|\bphone\b)" src/ scripts/
--     Both patterns BLOCK plan-review iter-1 if matched. Future legitimate
--     display-of-email use case (e.g., owner-portal account-recovery flow)
--     routes through an explicit GET /api/clients/[id] endpoint with explicit
--     role check, NOT an embed.
--
-- Pre-flight orphan probes (run BEFORE migration apply; results in
-- .planning/phases/stage-f1-knowledge-graph-auth-wave-b/00100-PROBE-RESULTS.md):
--   probe (a) = 25 distinct (org_id, name, email) clients from 26 raw jobs
--              (Michael Harllee 2-job collapse expected; informed §2.1 BLK-1)
--   probe (b) = 26 jobs with NON-NULL client_*
--   probe (c) = 0 ambiguous rows (no (name,email) -> multiple phones)
--   probe (d) = 10 fixture-harness-org jobs (Wave-E baseline maintained)
--
-- NULL-grouping semantics (§2.8): Postgres treats NULLs as equal in GROUP BY.
-- Multiple jobs sharing the same `client_name` + NULL `client_email` collapse
-- to one canonical clients row. The `coalesce(email, '')` in the §2.1 partial
-- unique index mirrors this semantic. Probe (c) returning N rows means N
-- distinct (name, email) groupings, NOT N ambiguous data points.
--
-- SECURITY DEFINER + search_path discipline (per nwrp156 codification): all
-- new SECURITY DEFINER functions MUST include `SET search_path = public`
-- (or equivalent explicit schema list). Closes CWE-426 Untrusted Search
-- Path injection vector. `app_private.user_org_role()` below is the
-- canonical reference for this convention.
--
-- Lock posture: CREATE TABLE + ALTER TABLE on jobs (single ADD COLUMN) +
-- UPDATE on jobs (~26 rows at current scale) -- sub-millisecond. Acceptable.
--
-- Reversibility: `00100_clients_schema_foundation.down.sql` removes
-- jobs.client_id column + drops clients table. Backfilled clients rows are
-- LOST on down; original jobs.client_* columns remain populated as before
-- (since up migration didn't touch them). Emergency rollback only.
-- ============================================================================

BEGIN;


-- ===========================================================================
-- 0. PRE-FLIGHT -- verify fixture-harness-org baseline.
--    HF-A4-2 + HF-C1-2 pattern (fail-loud abort if baseline diverges).
--    Mirrors plan-author-time probe (d) inside the transaction as belt +
--    suspenders.
-- ===========================================================================
DO $$
DECLARE
  v_fixture_jobs INT;
BEGIN
  SELECT COUNT(*) INTO v_fixture_jobs
    FROM public.jobs
   WHERE org_id = '00000000-0000-0000-0000-fb1ce0a55e55';
  IF v_fixture_jobs <> 10 THEN
    RAISE EXCEPTION 'Pre-flight: fixture-harness-org has % jobs (expected 10 per Wave-E baseline). Aborting before clients schema migration.', v_fixture_jobs;
  END IF;
END $$;


-- ===========================================================================
-- 1. CREATE app_private.user_org_role() helper (per iter-2 §2.2 nwrp156
--    amendment). Required by clients_org_insert + clients_org_update policies
--    below. Function does NOT currently exist in any migration (database-
--    reviewer exhaustive grep across 40+ migrations confirmed); B-1a is the
--    first migration to need org-scoped role resolution in RLS.
--
--    Properties (per nwrp156 verification):
--      * SECURITY DEFINER -- bypasses RLS for the org_members lookup so any
--        authenticated user (incl. non-owner roles) can resolve their own role
--        without RLS recursion.
--      * SET search_path = public -- closes CWE-426 Untrusted Search Path
--        injection vector (new convention; codified 2026-05-15 per nwrp156).
--        Future SECURITY DEFINER functions MUST adopt the same.
--      * STABLE -- consistent results within a single transaction; planner
--        can cache the result (combined with the (SELECT ...) wrap in RLS
--        policies, evaluates once per statement).
--      * LIMIT 1 -- defensive; one role per (user, org) pair anyway via
--        existing org_members uniqueness, but explicit.
--      * GRANT EXECUTE TO authenticated -- NOT to anon (internal-user helper;
--        anon never has an org role).
--      * Joins on om.org_id = (SELECT app_private.user_org_id()) -- confirms
--        org-scoped, NOT user-global; closes the multi-tenant bug that bare
--        app_private.user_role() carries.
--      * CREATE OR REPLACE -- idempotent on re-apply; if migration runs again
--        (e.g., post-rollback re-apply), function definition stays consistent.
-- ===========================================================================
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


-- ===========================================================================
-- 2. CREATE public.clients with V.1 universal envelope.
--    ON DELETE CASCADE on org_id is the canonical org-deletion lifecycle (per
--    Q10b + CLAUDE.md "Retention class: tenant-deletion-lifecycle"). The
--    `forever` retention class refers to retention WITHIN active org lifetime,
--    NOT survival across org deletion. Org deletion is the boundary; within
--    that boundary, soft-delete via `deleted_at` preserves audit trail per
--    CLAUDE.md "Never delete records -- soft delete only." (§2.6 W-3)
--    ON DELETE NO ACTION on created_by per D-080 forward-compat clause (00099
--    header) -- audit-trail durability blocks auth.users hard delete.
-- ===========================================================================
CREATE TABLE public.clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  status_history  JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES auth.users(id) ON DELETE NO ACTION,
  deleted_at      TIMESTAMPTZ
);


-- ===========================================================================
-- 3. INDEXES (per iter-2 §2.1 + §2.5 amendments).
--    Partial unique index serves DUAL purpose:
--      (a) idempotency anchor for backfill INSERT (ON CONFLICT DO NOTHING)
--      (b) prevents future duplicate-client-rows-per-org via the (org_id,
--          lower(trim(full_name)), lower(trim(coalesce(email, '')))) key.
--    The coalesce(email, '') treats NULL emails as a single bucket per org,
--    matching the backfill semantic (multiple Drummond jobs with client_name=
--    'Drummond' + email=NULL collapse to ONE canonical Drummond client).
--    Partial-on-deleted_at allows reactivation/duplicate after soft-delete.
--
--    Lookup index supports the B-1a-bis Combobox /api/clients?search= endpoint
--    via prefix-LIKE on lower(trim(full_name)). Kept separate from the unique
--    index for clarity; both reuse the same partial predicate.
-- ===========================================================================
CREATE UNIQUE INDEX idx_clients_org_name_email_unique
  ON public.clients (org_id, lower(trim(full_name)), lower(trim(coalesce(email, ''))))
  WHERE deleted_at IS NULL;

CREATE INDEX idx_clients_full_name_lower
  ON public.clients (org_id, lower(trim(full_name)))
  WHERE deleted_at IS NULL;


-- ===========================================================================
-- 4. UPDATED_AT TRIGGER (reuses project-wide public.update_updated_at from
--    migration 00001:265). Function name is bare `update_updated_at` (no
--    schema qualifier) per existing convention across 00007 + 00026 + 00065
--    + others.
-- ===========================================================================
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();


-- ===========================================================================
-- 5. RLS -- Q10b ORG-scoped direct-filter; R.23 3-policy shape per iter-2
--    §2.2 + §2.3 patches + nwrp155 D1 helper-form mandate.
--
--    SELECT policy: org-scoped OR platform-admin (cross-tenant debug per CC6.7).
--    INSERT/UPDATE policies: org-scoped AND role IN ('owner','admin','pm').
--    `accounting` role REMOVED from write policies per §2.3 HIGH-2 (Diane has
--    no business need to create/modify homeowner records; PM/admin function).
--
--    Helper-form wrapping `(SELECT app_private.user_org_id())` and
--    `(SELECT app_private.user_org_role())` per Wave-C 00097 + Wave-D 00098
--    + nwrp155 D1 -- once-per-statement evaluation via Postgres planner
--    initplan caching. Bare `org_id IN (SELECT ... FROM org_members ...)`
--    would evaluate per-row.
--
--    No DELETE policy -- soft-delete via `deleted_at` per codebase convention
--    (CLAUDE.md "Never delete records").
-- ===========================================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_org_select ON public.clients
  FOR SELECT
  USING (
    org_id = (SELECT app_private.user_org_id())
    OR (SELECT app_private.is_platform_admin())
  );

CREATE POLICY clients_org_insert ON public.clients
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT app_private.user_org_id())
    AND (SELECT app_private.user_org_role()) IN ('owner', 'admin', 'pm')
  );

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


-- ===========================================================================
-- 6. ADD jobs.client_id FK (nullable; SET NULL on parent client delete).
--    SET NULL preserves jobs row if a clients row is hard-deleted via
--    emergency DBA path. Soft-delete (the normal path) leaves client_id
--    pointing at a deleted_at=NOT NULL clients row, which is the correct
--    audit posture.
-- ===========================================================================
ALTER TABLE public.jobs
  ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX idx_jobs_client_id
  ON public.jobs (client_id)
  WHERE deleted_at IS NULL;


-- ===========================================================================
-- 7. BACKFILL -- derive clients rows from existing jobs.client_*.
--    Uniqueness key per Q2 nwrp153: composite (org_id, lower(trim(client_
--    name)), lower(trim(coalesce(client_email, '')))). Same name+email =
--    same client; different email = distinct clients.
--    Per iter-2 §2.1 BLK-1:
--      * ON CONFLICT (...) DO NOTHING anchors to the partial unique index
--        from step 3, achieving idempotency on re-apply.
--      * created_by attribution per §2.8/§2.9: backfill uses the harness-
--        fixture user UUID for all backfilled rows. Rationale: there is no
--        single "creator" for legacy embedded data; using the harness-
--        fixture UUID is consistent across all backfill operations and
--        identifies the source as "this migration" via auth.users.email
--        lookup. PII boundary: created_by is auth.users.id, not the human
--        who originally entered the client name into jobs (which is also
--        lost data; the embedded columns don't carry a creator audit).
--    Per iter-2 §2.8 commit-body footnote: GROUP BY treats NULLs as equal;
--    Drummond jobs sharing client_name='Drummond' + email=NULL collapse to
--    ONE canonical Drummond client. The coalesce(email, '') in the unique
--    index mirrors this. Probe (a) returned 25 distinct keys from 26 raw
--    jobs (Michael Harllee 2-job collapse expected).
-- ===========================================================================
WITH distinct_clients AS (
  SELECT
         org_id,
         lower(trim(client_name)) AS name_key,
         lower(trim(coalesce(client_email, ''))) AS email_key,
         -- Materialize first non-null full-fidelity values via window aggs in
         -- deterministic order (oldest created_at first).
         FIRST_VALUE(trim(client_name)) OVER w AS full_name,
         FIRST_VALUE(client_email)       OVER w AS email,
         FIRST_VALUE(client_phone)       OVER w AS phone
    FROM public.jobs
   WHERE client_name IS NOT NULL
  WINDOW w AS (
    PARTITION BY org_id,
                 lower(trim(client_name)),
                 lower(trim(coalesce(client_email, '')))
    ORDER BY created_at
  )
)
INSERT INTO public.clients (id, org_id, created_by, full_name, email, phone)
SELECT
  gen_random_uuid(),
  d.org_id,
  '5eb26edc-5989-477f-ac42-d1e9264db0e2'::uuid,
  d.full_name,
  NULLIF(d.email, ''),  -- preserve NULL email semantic
  d.phone
FROM distinct_clients d
ON CONFLICT (org_id, lower(trim(full_name)), lower(trim(coalesce(email, ''))))
  WHERE deleted_at IS NULL
DO NOTHING;


-- ===========================================================================
-- 8. UPDATE jobs.client_id to point at the newly-inserted clients rows.
--    Per iter-2 §2.1: added `AND c.deleted_at IS NULL` guard -- defensive
--    even though backfill INSERT writes no soft-deleted rows; future
--    re-runs against partially-soft-deleted clients table stay safe.
-- ===========================================================================
UPDATE public.jobs j
   SET client_id = c.id
  FROM public.clients c
 WHERE c.org_id = j.org_id
   AND lower(trim(c.full_name)) = lower(trim(j.client_name))
   AND lower(trim(coalesce(c.email, ''))) = lower(trim(coalesce(j.client_email, '')))
   AND c.deleted_at IS NULL  -- iter-2 §2.1 BLK-1 guard
   AND j.client_name IS NOT NULL
   AND j.client_id IS NULL;


-- ===========================================================================
-- 9. FORWARD PROBE -- every non-NULL jobs.client_name maps to a clients row.
--    HF-A4-2 fail-loud pattern (mirrors 00096 lines 51-62). RAISE EXCEPTION
--    triggers automatic ROLLBACK of the entire transaction.
--    The reverse-probe (catches asymmetric jobs with client_email/phone but
--    NULL client_name) is RELOCATED to B-1a-bis where DROP COLUMN actually
--    fires (per nwrp154 Path A). Until then, asymmetric data continues to
--    live in the embedded columns harmlessly (no DROP = no orphan risk).
--    Error message surfaces ONLY COUNT (no UUIDs) per nwrp139 discipline.
-- ===========================================================================
DO $$
DECLARE v_unmatched BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_unmatched
    FROM public.jobs j
   WHERE j.client_name IS NOT NULL
     AND j.client_id IS NULL;
  IF v_unmatched > 0 THEN
    RAISE EXCEPTION 'Forward probe FAILED: % jobs have client_name but no client_id mapping. Aborting. Investigate orphaned client identity rows.', v_unmatched;
  END IF;
END $$;


-- ===========================================================================
-- 10. SEED -- 1 obviously-synthetic fixture client row in fixture-harness-org.
--     Q9 D contract (>=1 fixture row); Q7 obviously-synthetic naming.
--     UUID convention extends 00092/00093 fixture-harness-org pattern:
--       00000000-0000-0000-0003-000000000001 (clients = depth-3 namespace
--       after auth.users 0001-* and org_members 0002-*).
--     The fixture client (Harness Fixture Client Alpha) is DISTINCT from
--     the 10 backfilled Smoke Client A..J rows -- intentional, since the
--     fixture client carries email + phone (Smoke Clients do not), giving
--     downstream harness tests a fully-populated PII row to exercise the
--     PII fence on.
--
--     Fixture-client created_by precedence note (per iter-2 §2.9):
--     created_by = '5eb26edc-5989-477f-ac42-d1e9264db0e2'::uuid
--     (harness-fixture@nightwork.local). This UUID is established by
--     migrations 00092 + 00093 (Verification Harness Fixture Org / Layer 3
--     verification harness) and is preserved across smoke-seed.sql re-applies
--     via ON CONFLICT (id) DO UPDATE per Wave-E E-2 + nwrp145 codification.
--     Pre-condition: auth.users row with id = '5eb26edc-...' exists. The
--     migration 00092 INSERT into auth.users runs before this migration in
--     numerical order; if rolled back together, ordering is preserved.
--
--     ON CONFLICT (id) DO NOTHING -- idempotent on re-apply.
-- ===========================================================================
INSERT INTO public.clients (id, org_id, full_name, email, phone, created_by)
VALUES (
  '00000000-0000-0000-0003-000000000001',
  '00000000-0000-0000-0000-fb1ce0a55e55',
  'Harness Fixture Client Alpha',
  'harness-client-alpha@nightwork.local',
  '+15555550100',
  '5eb26edc-5989-477f-ac42-d1e9264db0e2'
)
ON CONFLICT (id) DO NOTHING;


-- ===========================================================================
-- 11. NOTIFY PostgREST schema cache reload (Wave-D 00098 §1.1 decision 8
--     belt-and-suspenders pattern; Supabase auto-reloads via DDL trigger
--     but Wave-C taught us schema verification != runtime verification).
-- ===========================================================================
NOTIFY pgrst, 'reload schema';


COMMIT;

-- ============================================================================
-- POST-APPLY VERIFICATION QUERIES (see §9 of B-1a PLAN.md + iter-2 AC-11..14):
-- ============================================================================
-- AC-B1a-04: clients column inventory (10 columns)
-- AC-B1a-05: RLS enabled on public.clients
-- AC-B1a-06: 3 policies present (clients_org_select / clients_org_insert /
--            clients_org_update -- helper-form per iter-2 §2.2)
-- AC-B1a-07: jobs.client_id FK exists -> clients(id)
-- AC-B1a-08: embedded jobs.client_* columns STILL PRESENT (B-1a-bis owns DROP)
-- AC-B1a-09: >=1 fixture client row in fixture-harness-org
-- AC-B1a-10: jobs.client_id mapping = 0 orphan
-- AC-B1a-11 (iter-2 §2.1): per-job client_id resolves to exactly one clients row
-- AC-B1a-12 (iter-2 §2.2): all 3 policies use helper-form
-- AC-B1a-13 (iter-2 §2.3): accounting role NOT in write policies
-- AC-B1a-14 (iter-2.5 §2.2): app_private.user_org_role() function exists
-- ============================================================================
