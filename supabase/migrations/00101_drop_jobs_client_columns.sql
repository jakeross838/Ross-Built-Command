-- ============================================================================
-- 00101_drop_jobs_client_columns.sql
-- ============================================================================
--
-- F1-Wave-B-Slice-1 Plan B-1a-bis: DROP the 3 embedded client identity columns
-- (client_name, client_email, client_phone) from public.jobs after the
-- consumer refactor in B-1a-bis lands and Wave-B prereq #12 smoke gate is
-- maintained at 11/13 PASS minimum.
--
-- Source decisions:
--   nwrp154 Path A adjudication (slice grows 3 -> 4 plans; B-1a-bis carries
--     DROP COLUMN; ITER-2-PATCHES §3.9).
--   D-078 (MASTER-PLAN.md §10) — PII fence; embedded columns must not survive
--     beyond consumer refactor; otherwise dual-source dataset perpetuates a
--     leak surface.
--   D-079 (MASTER-PLAN.md §10) — PII fence scope clarification. Customer PII
--     (homeowner identity) is in scope; vendor B2B is out of scope.
--   Q1 nwrp153 — apply PII fence to clients.email + clients.phone; DROP
--     removes the denormalized cache that bypasses the fence.
--   Q2 nwrp153 dual-probe amendment — forward grep (code-level, executor)
--     + reverse DB probe (inside transaction) before DROP.
--
-- ============================================================================
-- PRECONDITIONS (executor MUST verify before applying this migration):
--
-- 1. CODE-LEVEL FORWARD GREP (run via bash, NOT inside transaction):
--    grep -rE 'client_name|client_email|client_phone' src/ scripts/ \
--      --include='*.ts' --include='*.tsx' \
--      | grep -v 'fixtures/' | grep -v 'design-system/' | grep -v 'prototypes/'
--    Expected: 0 hits in active code (excluding fixtures + prototypes which
--    are sample-data-decoupled per B-1a-bis §3.2 row 17-23, and excluding
--    comment-only hits documenting the refactor).
--    HALT if hits > 0; complete B-1a-bis consumer refactor before re-applying.
--
-- 2. CODE-LEVEL HOOK GATE: smoke harness post-refactor run must show
--    <=2 failures matching TD-WE-03 baseline (Wave-B prereq #12).
--
-- 3. DB-LEVEL REVERSE PROBE (runs INSIDE the transaction below; ROLLBACK on
--    fail). This is the FINAL gate; the code-level checks above are the
--    executor's responsibility.
-- ============================================================================
--
-- BEFORE this migration:
--   * public.jobs has columns: ..., client_name TEXT, client_email TEXT,
--     client_phone TEXT, client_id UUID (FK to public.clients) ...
--   * jobs.client_id is populated for every job that had any client identity
--     data (per B-1a backfill); jobs.client_name etc. ALSO still populated
--     (dual-source state).
--
-- AFTER this migration:
--   * public.jobs has client_id UUID (FK to public.clients) only; the 3
--     embedded columns are DROPPED.
--   * Reverse probe inside transaction verifies no asymmetric data (no row
--     where client_id IS NULL while ANY of client_name/email/phone is
--     non-NULL) — if such a row exists, DROP would orphan that identity
--     data; transaction ROLLBACKs and HALTs.
--
-- Reversibility: 00101_drop_jobs_client_columns.down.sql re-adds the 3
-- columns as nullable TEXT (data NOT restored on rollback — see down
-- migration header + coordinated-rollback procedure documented in
-- B-1a-bis-clients-consumer-refactor-PLAN.md §11.3).
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. DB-LEVEL REVERSE PROBE (Q2 nwrp153 amendment).
--    Catches asymmetric data — rows with client_id NULL but any of
--    client_name/email/phone non-NULL. DROP would orphan such identity data.
--    HF-A4-2 fail-loud pattern (mirrors B-1a's §10 reverse probe).
-- ============================================================================
DO $$
DECLARE v_orphan_risk BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_orphan_risk
    FROM public.jobs
   WHERE client_id IS NULL
     AND (client_name IS NOT NULL
       OR client_email IS NOT NULL
       OR client_phone IS NOT NULL);
  IF v_orphan_risk > 0 THEN
    RAISE EXCEPTION 'B-1a-bis 00101 reverse probe FAIL: % jobs have client identity data (client_name/email/phone) but NULL client_id. DROP would orphan this data. Investigate before retry. (Likely cause: a write path missed in B-1a-bis consumer refactor.)', v_orphan_risk;
  END IF;
END $$;

-- ============================================================================
-- 2. DROP the embedded columns.
-- ============================================================================
ALTER TABLE public.jobs DROP COLUMN client_name;
ALTER TABLE public.jobs DROP COLUMN client_email;
ALTER TABLE public.jobs DROP COLUMN client_phone;

-- ============================================================================
-- 3. NOTIFY PostgREST schema cache reload (Wave-D 00098 §1.1 decision 8
--    belt-and-suspenders pattern; Supabase auto-reloads via DDL trigger but
--    Wave-C taught us schema verification != runtime verification).
-- ============================================================================
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- POST-APPLY VERIFICATION QUERIES (see §10 of B-1a-bis PLAN.md)
-- ============================================================================
-- 1. SELECT column_name FROM information_schema.columns
--      WHERE table_name='jobs' AND table_schema='public'
--      AND column_name IN ('client_name','client_email','client_phone');
--    expect: 0 rows
-- 2. SELECT COUNT(*) FROM public.jobs WHERE client_id IS NOT NULL;
--    expect: number of jobs with backfilled clients (consistent with B-1a
--            post-apply baseline; not changed by THIS migration)
-- 3. Sample PostgREST embed query via REST API to verify client:clients(id, full_name)
--    resolves correctly post-DROP (no schema-cache PGRST204 errors).
-- ============================================================================
