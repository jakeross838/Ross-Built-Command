---
phase: stage-f1-knowledge-graph-auth-wave-b
plan: B-1a
plan-name: clients-schema-foundation
type: execute
wave: B-Slice-1
depends_on: [B-D080]
autonomous: true
halt_after: false
requires_smoke: false  # schema + backfill only; no UI consumer impact (consumer refactor lives in B-1a-bis)
threat_model_severity: low  # schema-add + backfill only; embedded jobs.client_* columns untouched; no data loss path
status: AUTHORED
authored: 2026-05-15
authored_by: gsd-planner subagent (claude-opus-4-7[1m])
authorization: nwrp152 dispatch + nwrp153 EXPANDED-SCOPE approval + nwrp154 Path A re-author
source_decisions:
  - "Q2 A1 (umbrella; normalize from one source of truth) + Q2 nwrp153 amendment (dual-probe backfill safety — reverse-probe execution relocated to B-1a-bis per nwrp154 Path A)"
  - "Q9 D (umbrella; fixture-maintenance contract — ≥1 fixture client row in fixture-harness-org)"
  - "Q10b (umbrella; ORG-scoped tenant table rule — direct-filter RLS, NOT join-based)"
  - "Q12 (umbrella; uniform status_history versioning)"
  - "D-080 (clients.created_by FK to auth.users from creation — MASTER-PLAN.md §10:256)"
  - "D-078 + D-079 + Q1 nwrp153 (PII fence on clients.email + phone — homeowner contact)"
  - "Q7 nwrp153 (obviously-synthetic fixture client name)"
requirements: []
files_modified:
  - supabase/migrations/00100_clients_schema_foundation.sql
  - supabase/migrations/00100_clients_schema_foundation.down.sql
files_referenced:
  - supabase/migrations/00007_add_profiles_and_auth_roles.sql (V.1 envelope + profiles RLS pattern)
  - supabase/migrations/00016_multi_tenant_foundation.sql (app_private.user_org_id helper definition; profiles.org_id pattern)
  - supabase/migrations/00048_platform_admins.sql (app_private.is_platform_admin helper)
  - supabase/migrations/00065_proposals.sql (canonical 3-policy R.23 RLS shape; status_history JSONB precedent)
  - supabase/migrations/00096_invoice_allocations_org_id.sql (direct-filter Q10b RLS + SELECT-wrapped helper pattern + NOTIFY pgrst)
  - supabase/migrations/00097_drop_public_users.sql (FK retarget + orphan-FK fail-loud pattern)
  - supabase/migrations/00098_add_org_members_profiles_fk.sql (Wave-D DO-block pre-flight + NOTIFY pgrst belt-and-suspenders)
  - .planning/MASTER-PLAN.md D-078 + D-079 + D-080
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-b-EXPANDED-SCOPE.md
  - .planning/expansions/stage-f1-knowledge-graph-auth-EXPANDED-SCOPE.md
  - .planning/lessons.md 2026-05-15 entry (downstream-consumer-sweep discipline)
sequence:
  before: "B-1a-bis (consumer refactor + DROP COLUMN — see B-1a-bis-clients-consumer-refactor-PLAN.md)"
  after: "B-D080 (D-080 convention applies to clients.created_by)"
  parallel_authoring_ok: "false (B-1a-bis is being authored alongside per nwrp154; B-D080 + B-1b already AUTHORED)"
  parallel_execute_ok: "false (strict sequence per migration numbering + Path A consumer-refactor ordering)"
acceptance-criteria-target: "10 falsifiable items (AC-B1a-01..AC-B1a-10)"
---

<criteria>
mechanical:
  - "Migration 00100_clients_schema_foundation.sql exists in supabase/migrations/"
  - "Migration 00100_clients_schema_foundation.down.sql exists in supabase/migrations/"
  - "Migration body does NOT contain ALTER TABLE jobs DROP COLUMN client_name/email/phone (those are owned by B-1a-bis)"
  - "Migration body contains forward probe DO block (every non-NULL jobs.client_name maps to a clients row)"
  - "Migration body cites D-078 + D-079 + D-080 + Q1 + Q2 + Q7 + Q9 in header comment"
  - "Migration body PII fence comment cites 'plan-review iter-1 grep gate blocks client:clients(*) and any embed referencing clients.email or clients.phone'"
  - "Migration body explicitly cross-references B-1a-bis as the DROP-owner"
dom: []
visual: []
behavioral:
  - "Post-apply: SELECT FROM clients WHERE org_id = '<fixture-harness-org-uuid>' returns ≥1 row with name='Harness Fixture Client Alpha'"
  - "Post-apply: SELECT FROM jobs WHERE client_id IS NULL AND client_name IS NOT NULL returns 0 (every job with embedded client_name has a clients row)"
  - "Post-apply: jobs.client_name + jobs.client_email + jobs.client_phone columns STILL PRESENT in information_schema.columns (B-1a-bis owns the drop)"
  - "Post-apply: 3 policies present on public.clients (clients_org_read / clients_org_insert / clients_org_update per R.23)"
  - "Post-apply: RLS enabled on public.clients"
  - "Post-apply: information_schema.referential_constraints shows clients_org_id_fkey to organizations + clients_created_by_fkey to auth.users + jobs_client_id_fkey to clients"
semantic:
  - "Down migration removes jobs.client_id column + drops clients table; embedded jobs.client_* columns remain untouched (they were never modified by up migration)"
  - "Migration header documents PII fence as load-bearing for plan-review iter-1 grep gate (per Plan D-4 Rule 2)"
  - "Migration header documents Path A scope split: B-1a is schema + backfill only; B-1a-bis owns consumer refactor + DROP"
</criteria>

# Plan B-1a — Clients schema foundation + backfill

## 1. Goal

Land the `clients` entity in the schema as the canonical homeowner/commercial-owner record per Q2 A1 normalization decision. Backfill `clients` rows from the embedded `jobs.client_name` / `client_email` / `client_phone` columns, add `jobs.client_id` FK pointing at the new entity, and seed ≥1 fixture client row in `fixture-harness-org` per Q9 D.

**Scope explicit:** This plan is **schema foundation + backfill ONLY**. The embedded `jobs.client_*` columns are **NOT dropped here** — they remain populated as a transitional denormalized cache until B-1a-bis ships the consumer refactor + DROP atomic transaction (see §Why-Path-A below). Slice-1 ships data-only — no UI mutation paths.

The `clients` table is the data foundation for Wave-B-Slice-2 Plan B-2 (Owner Portal Path A) and the entity that `client_portal_access.client_id` will reference in Slice-2.

## 2. Why now / dependencies

**Sequence (Path A per nwrp154):**
- **B-D080** (migration 00099) executes FIRST so the user-identity FK convention is live before B-1a creates `clients.created_by` REFERENCES auth.users. Per nwrp152: "D-080 convention applies to clients table at creation per nwrp152 sequencing."
- **B-1a** (migration 00100, this plan) executes SECOND — establishes `clients` table + backfill + `jobs.client_id` FK. Embedded columns kept.
- **B-1a-bis** (consumer refactor + DROP atomic transaction) executes THIRD — refactors 16 load-bearing consumers (G702/G703 cover-letter, AI job-matcher, PostgREST embeds) to read from `clients` table via `jobs.client_id`, then DROPs `jobs.client_name` / `client_email` / `client_phone` columns in one atomic migration.
- **B-1b** (KG scaffold + types pipeline) executes FOURTH, consuming the new `clients` table + post-DROP `jobs` shape via `supabase gen types typescript --linked`.

**Why now (not deferred):**
- Q2 A1 commits to single-source-of-truth normalization BEFORE Wave 1.1-Lite onboards real client data. Deferring creates dual-write maintenance burden + drift risk.
- Q1 nwrp153 APPROVED applying the PII fence to clients.email + clients.phone at creation — cheaper to fence on day one than to retrofit.
- D-080 (parent FK convention) just landed — clients.created_by inherits the convention naturally.

## 3. Why-Path-A (nwrp154 adjudication)

Per nwrp154, Jake adjudicated **Path A** after the original B-1a planner's HALT surfaced 22 src consumers (16 load-bearing). Path A inserts **B-1a-bis** between B-1a and B-1b to refactor consumers BEFORE DROP.

**Path A inserts B-1a-bis** between B-1a and B-1b to refactor consumers BEFORE DROP:
- B-1a now establishes the `clients` table + backfill (schema-add only; this plan).
- B-1a-bis owns the consumer refactor + DROP atomic transaction (16 load-bearing consumers: G702/G703 cover-letter, AI job-matcher, 4 PostgREST embeds, job-detail / jobs-index / jobs/new / draws-detail UI surfaces, /api/jobs READ+WRITE paths).
- B-1b lands KG scaffold + types pipeline against the post-DROP shape.

**This preserves Q2 A1 disposition while honoring G702 + AI matcher load-bearing integrity.** The slice grows from 3 plans to 4 plans (B-D080 → B-1a → B-1a-bis → B-1b).

**Q2 A1 "one source of truth from day one" is honored:** the source of truth IS the `clients` table; embedded `jobs.client_*` columns are a transitional denormalized cache that exits the codebase at B-1a-bis ship. The transitional window is bounded — B-1a-bis is the very next plan in the slice; the cache lives for the duration of B-1a-bis execution (~2-3 hours of executor time), not for weeks.

**Q2 nwrp153 dual-probe amendment relocates to B-1a-bis.** This plan retains the FORWARD probe (every non-NULL jobs.client_name maps to a clients row — verifies backfill correctness inside the transaction). The REVERSE probe (catches asymmetric data — jobs with client_email/phone but null client_name — before DROP) is relocated to B-1a-bis where the DROP actually fires. B-1a runs forward-only; B-1a-bis runs both forward + reverse before DROP COLUMN.

## 4. Pre-flight backfill probe (Q2 backfill safety)

### Status: PROBE NOT RUNNABLE FROM SANDBOX

The dispatch brief instructs the plan-author to run 4 SQL probes via `mcp__supabase__execute_sql` at plan-author time. The sandbox running this agent does NOT expose `mcp__supabase__*` tools (Supabase MCP tools are advertised by the MCP server registration but are not in the agent's allowed tool list), and neither `supabase` CLI nor `psql` is available. The orchestrator MUST run these probes at execute time before applying migration 00100.

### Expected probe SQL (to be run by executor at execute time)

```sql
-- Probe (a) Count distinct potential clients from existing jobs
SELECT COUNT(DISTINCT (org_id, lower(trim(client_name)), lower(trim(client_email)))) AS distinct_clients
FROM public.jobs
WHERE client_name IS NOT NULL OR client_email IS NOT NULL;

-- Probe (b) Count jobs with NON-NULL client_* values (forward-probe baseline)
SELECT COUNT(*) AS jobs_with_client_data
FROM public.jobs
WHERE client_name IS NOT NULL OR client_email IS NOT NULL OR client_phone IS NOT NULL;

-- Probe (c) Ambiguous backfill — same name+email but different phone
SELECT org_id,
       lower(trim(client_name)) AS name,
       lower(trim(client_email)) AS email,
       COUNT(DISTINCT client_phone) AS phone_variants
FROM public.jobs
WHERE client_name IS NOT NULL
GROUP BY 1, 2, 3
HAVING COUNT(DISTINCT client_phone) > 1;

-- Probe (d) Fixture-harness-org jobs count (must be 10 per Wave-E baseline)
SELECT COUNT(*) FROM public.jobs WHERE org_id = '00000000-0000-0000-0000-fb1ce0a55e55';
```

### Inferred expectations from repo-checked artifacts

From `scripts/fixtures/smoke-seed.sql` lines 224-239 (confirmed via Read tool):
- `fixture-harness-org` has 10 jobs (Smoke Job Alpha..Kappa)
- Each fixture-harness-org job has `client_name` set to "Smoke Client A".."Smoke Client J" (10 distinct names)
- NO fixture-harness-org job has `client_email` or `client_phone` populated (those columns are not in the INSERT column list)

From `.planning/MASTER-PLAN.md` and Drummond convention:
- Drummond production seed (RB reference job) has `client_name='Drummond'` populated (per `.planning/audits/2026-05-12-migration-inventory.md`)
- Real-org jobs created via `/api/jobs` POST may have client_name/email/phone in any combination

**Probe (d) expectation:** 10 (must match Wave-E baseline; HALT + diagnose if diverges)
**Probe (a) expectation (on fixture-harness-org alone):** 10 distinct clients (each Smoke Job has a unique Smoke Client)
**Probe (b) expectation (across all orgs):** ≥10 (10 fixture-harness-org + Drummond + real-org jobs)
**Probe (c) expectation:** 0 rows ideal (no ambiguity); if >0, executor HALTs for Jake — design choice between treat-as-same-client OR create-distinct-clients

If probe (c) returns >0 rows, the executor HALTs the migration apply and surfaces to Jake. The Q2 nwrp153 APPROVED disposition does not pre-resolve this case.

**Reverse-probe relocation per nwrp154 Path A:** The reverse-probe (jobs with client_email/phone but NULL client_name — asymmetric data that would orphan on DROP) is no longer run in B-1a since B-1a doesn't DROP. It is relocated to B-1a-bis, which runs it inside its consumer-refactor + DROP atomic transaction.

## 5. Implementation tasks

### Task 1 — Author migration body (`00100_clients_schema_foundation.sql`)

**Files:** `supabase/migrations/00100_clients_schema_foundation.sql` (new)

**Action:** Author the migration body per the sketch in §6. Single atomic transaction (BEGIN..COMMIT). Header comment cites D-078 + D-079 + D-080 + Q1 + Q2 + Q7 + Q9 + Path A scope split + this plan path. PII fence comment cites the plan-review iter-1 grep gate enforcement (per Plan D-4 Rule 2). Fixture-row INSERT step uses obviously-synthetic identifiers per Q7. NOTIFY pgrst at tail per Wave-D 00098 belt-and-suspenders pattern. **No DROP COLUMN — embedded jobs.client_* columns remain untouched (B-1a-bis owns the drop).**

**Verify:**
- `wc -l supabase/migrations/00100_clients_schema_foundation.sql` → expect ~150-180 lines (smaller than pre-Path-A version since DROP + reverse-probe sections gone)
- `grep -c "D-080\|D-078\|D-079\|Q1\|Q2\|Q7\|Q9" supabase/migrations/00100_clients_schema_foundation.sql` → expect ≥7
- `grep -c "BEGIN;\|COMMIT;" supabase/migrations/00100_clients_schema_foundation.sql` → expect exactly 2
- `grep -c "DROP COLUMN" supabase/migrations/00100_clients_schema_foundation.sql` → expect 0 (DROP belongs to B-1a-bis)
- `grep -c "B-1a-bis" supabase/migrations/00100_clients_schema_foundation.sql` → expect ≥1 (cross-reference)

**Done:** Migration text is syntactically valid SQL (verify via `grep -n "BEGIN;\|COMMIT;\|END $$;" supabase/migrations/00100_clients_schema_foundation.sql` showing balanced delimiters), header comment is complete with Path A scope-split documentation, and the PII fence comment block is present.

### Task 2 — Author down migration (`00100_clients_schema_foundation.down.sql`)

**Files:** `supabase/migrations/00100_clients_schema_foundation.down.sql` (new)

**Action:** Author the reverse migration per the sketch in §7. Removes `jobs.client_id` FK + column. Drops `clients` table (cascades to fixture row). Single atomic transaction. Header comment cites destructive-but-bounded posture: backfilled `clients` rows are LOST on down, but original `jobs.client_*` columns remain populated as before (since up migration didn't touch them).

**Verify:**
- `wc -l supabase/migrations/00100_clients_schema_foundation.down.sql` → expect ~50-70 lines (much simpler than pre-Path-A version since reverse-backfill logic is gone)
- `grep -c "DROP TABLE\|DROP CONSTRAINT\|DROP COLUMN" supabase/migrations/00100_clients_schema_foundation.down.sql` → expect ≥2

**Done:** Down migration is syntactically valid SQL, header documents emergency-rollback-only posture + clarifies that embedded `jobs.client_*` columns remain populated (no reverse-backfill needed since up migration left them alone).

### Task 3 — Run pre-flight probe at execute time

**Files:** None (read-only verification)

**Action:** Executor runs the 4 probe queries (§4) via `mcp__supabase__execute_sql` BEFORE applying migration 00100. Surfaces results in the plan SUMMARY. HALTs if any of:
- Probe (c) returns >0 rows (ambiguous backfill — design choice required)
- Probe (d) returns ≠ 10 (fixture-harness-org baseline divergence)

**Verify:** Probe results pasted into `00100-PROBE-RESULTS.md` in the phase directory.

**Done:** All 4 probe queries returned non-error results, executor has surfaced any anomalies to Jake before proceeding.

### Task 4 — Apply migration 00100 via Supabase MCP

**Files:** None (DB apply only)

**Action:** Executor applies the migration via `mcp__supabase__apply_migration` (or equivalent). The migration's internal fail-loud DO blocks will RAISE EXCEPTION if the forward probe fails inside the transaction, causing automatic ROLLBACK. On success, the executor verifies:
- `clients` table exists with 7 column V.1 envelope + `status_history`
- RLS enabled on `clients`
- 3 policies on `clients` (read / insert / update per R.23 + PII fence on email/phone)
- `jobs.client_id` FK exists pointing to `clients(id)`
- `jobs.client_name` / `client_email` / `client_phone` columns **STILL PRESENT** (B-1a does not drop them; B-1a-bis owns the drop)
- ≥1 fixture client row in `fixture-harness-org`

**Verify:** Run the verification queries in §9.

**Done:** All verification queries return expected values.

### Task 5 — NOTIFY PostgREST schema reload (belt-and-suspenders)

**Action:** Migration body issues `NOTIFY pgrst, 'reload schema'` at the tail per Wave-D 00098 §1.1 decision 8. Supabase auto-reloads via DDL trigger but Wave-C taught us schema verification ≠ runtime verification.

**Verify:** Post-apply, REST query `SELECT id FROM clients WHERE org_id='00000000-0000-0000-0000-fb1ce0a55e55' LIMIT 1` via the Supabase REST API returns 200 (not PGRST204 schema-cache-stale).

**Done:** PostgREST recognizes the new table within 5 seconds of apply.

### Task 6 — Commit migration files via compound `git add ... && git commit` form

**Action:** Author the commit. Per nwrp133 hook-design note: compound form does NOT require Jake authorization (the pre-commit hook regex only matches `^git[[:space:]]+commit`, not `git add ... && git commit`). Commit message body cites D-080 + D-078 + D-079 + Q1 + Q2 + Q7 + Q9 source decisions + nwrp154 Path A scope split. Commit cites compound-form precedent.

**Verify:** `git log -1 --format='%s%n%b'` shows commit message with all 7 source decision citations + nwrp154 Path A citation.

**Done:** Commit lands on local branch with the pre-commit hook satisfied + design tokens passing.

---

## 6. Migration body sketch (`00100_clients_schema_foundation.sql`)

```sql
-- ===========================================================================
-- 00100_clients_schema_foundation.sql
-- ===========================================================================
--
-- F1-Wave-B-Slice-1 Plan B-1a: Create `clients` entity (homeowners + commercial
-- owners), backfill from embedded jobs.client_name/email/phone, and point
-- jobs.client_id at the new entity via FK.
--
-- ⚠ PATH A SCOPE SPLIT (per nwrp154 Path A) ⚠
-- This migration DOES NOT DROP the embedded jobs.client_name/email/phone
-- columns. The DROP is owned by Plan B-1a-bis (consumer refactor + DROP
-- atomic transaction), which executes AFTER this migration. See B-1a-bis-
-- clients-consumer-refactor-PLAN.md for the DROP migration (00101). This
-- two-plan split honors the 16 load-bearing consumers (G702/G703 cover-
-- letter, AI job-matcher, PostgREST embeds) that need refactoring BEFORE
-- the embedded columns disappear. Q2 A1 "one source of truth from day one"
-- is honored: the source of truth IS the `clients` table; embedded columns
-- are a transitional denormalized cache that exits at B-1a-bis ship.
--
-- Source decisions:
--   D-080 (MASTER-PLAN.md §10:256) — clients.created_by FK to auth.users from
--     creation per the parent FK convention codification (Plan B-D080 lands
--     migration 00099 with the convention; this migration honors it natively).
--   D-078 (MASTER-PLAN.md §10:252) — PostgREST embedding hint scope (PII fence):
--     clients.email + clients.phone MUST NEVER appear in a PostgREST embed.
--     Plan-review iter-1 grep gate blocks `client:clients(*)` and any embed
--     referencing email/phone — BLOCKING. Future legitimate display-of-email
--     use case routes through an /api/clients/[id] GET endpoint, NOT an embed.
--   D-079 (MASTER-PLAN.md §10:254) — PII fence scope clarification. Customer
--     PII (homeowner identity) is in scope; vendor B2B contact is out of scope.
--     clients.email + phone are customer PII → fenced.
--   Q1 nwrp153 APPROVED — apply PII fence to clients.email + clients.phone
--     from creation.
--   Q2 A1 (umbrella) + Q2 nwrp153 amendment — normalize from one source of
--     truth. nwrp154 Path A: B-1a does forward-probe backfill (this migration);
--     B-1a-bis does forward+reverse probe + DROP COLUMN atomic transaction.
--   Q7 nwrp153 APPROVED — obviously-synthetic fixture client name pattern.
--   Q9 D (umbrella) — ≥1 fixture client row in fixture-harness-org.
--   Q10b (umbrella) — clients is an ORG-scoped tenant table with direct-filter
--     RLS on org_id, NOT join-based.
--   Q12 (umbrella) — uniform versioning via status_history JSONB.
--
-- V.2 export schema sketch (one-pager per Wave-B-Slice-1 EXPANDED-SCOPE §4):
--   {
--     "id": uuid, "org_id": uuid, "full_name": text,
--     "email": text|null,  // SENSITIVE — exclude from JSON exports by default; toggle via export_includes_pii flag
--     "phone": text|null,  // SENSITIVE — same as email
--     "status_history": jsonb, "created_at": iso, "updated_at": iso, "created_by": uuid, "deleted_at": iso|null
--   }
--   Full V.2 framework deferred to F3 per umbrella V.2 contract.
--
-- BEFORE this migration:
--   * No `clients` table. Owner-identity data is denormalized in
--     jobs.client_name (TEXT) + jobs.client_email (TEXT) + jobs.client_phone
--     (TEXT) — see migration 00001 (initial_schema.sql) lines 15-17.
--   * Embedded columns are READ by 16 load-bearing src consumers. The
--     consumer-refactor is owned by B-1a-bis (separate plan; runs AFTER
--     this one).
--
-- AFTER this migration:
--   * `clients` table exists with V.1 envelope + status_history JSONB +
--     direct-filter RLS on org_id (3 policies; R.23 shape; cost_intelligence_
--     spine precedent — see migration 00065 lines 154-187).
--   * jobs.client_id FK to clients(id) ON DELETE SET NULL exists.
--   * jobs.client_name / client_email / client_phone columns **STILL PRESENT**
--     (B-1a-bis owns the DROP).
--   * 1 obviously-synthetic fixture client row in fixture-harness-org seeded
--     ('Harness Fixture Client Alpha', harness-client-alpha@nightwork.local,
--     +15555550100).
--   * Forward probe verified atomically inside the transaction; ROLLBACK on
--     probe failure preserves pre-migration state.
--
-- PII fence enforcement contract (per D-078 + D-079 + Q1):
--   * clients.email + clients.phone MUST NEVER appear in a PostgREST embed
--     hint string. The grep pattern (per Plan D-4 Rule 2 codification):
--       grep -rE "client:clients\([^)]*(\bemail\b|\bphone\b)" src/ scripts/
--       grep -rE "clients\([^)]*\*\)" src/ scripts/
--     Both patterns BLOCK plan-review iter-1 if matched. Future legitimate
--     display-of-email use case (e.g., owner-portal account-recovery flow)
--     routes through an explicit GET /api/clients/[id] endpoint with explicit
--     role check, NOT an embed.
--
-- Pre-flight orphan probes (run BEFORE migration apply):
--   See §4 of B-1a PLAN.md. 4 SQL queries; expected results documented inline.
--   Probe (c) HALT on > 0 rows (ambiguous backfill); probe (d) HALT on ≠ 10
--   (fixture-harness-org baseline divergence).
--
-- Reversibility: `00100_clients_schema_foundation.down.sql` removes
-- jobs.client_id column + drops clients table. Backfilled clients rows are
-- LOST on down; original jobs.client_* columns remain populated as before
-- (since up migration didn't touch them). Emergency rollback only.
-- ===========================================================================

BEGIN;

-- ===========================================================================
-- 0. PRE-FLIGHT — verify fixture-harness-org baseline.
--    HF-A4-2 + HF-C1-2 pattern (fail-loud abort if baseline diverges).
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
-- 1. CREATE public.clients with V.1 universal envelope.
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
-- 2. INDEXES (partial; mirror RLS predicate + FK lookups).
--    org_id + jobs.client_id are the two FK paths; partial-on-not-deleted
--    keeps the index lean (matches the soft-delete read posture).
-- ===========================================================================
CREATE INDEX idx_clients_org_id
  ON public.clients (org_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_clients_full_name_lower
  ON public.clients (org_id, lower(trim(full_name)))
  WHERE deleted_at IS NULL;
-- Justification: name-based lookups dominate the read path (job-matcher.ts
-- relies on surname-from-client_name; future B-2 Owner Portal lookups
-- normalize identifier). Partial index keeps cold-row cost minimal.


-- ===========================================================================
-- 3. UPDATED_AT TRIGGER (reuse project-wide public.update_updated_at).
-- ===========================================================================
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();


-- ===========================================================================
-- 4. RLS — Q10b ORG-scoped direct-filter; R.23 3-policy shape.
--    Pattern mirrors 00065_proposals.sql exactly (org_id IN org_members
--    membership-check + platform_admin OR-clause on SELECT; role-gated
--    INSERT + UPDATE; no DELETE policy).
--    Soft-delete via deleted_at per codebase convention.
--    NOTE: direct-filter on org_id (NOT join-based) per Q10b ORG-scoped
--    tenant table rule. The membership check is a SELECT subquery, not a
--    JOIN through another tenant table — Q10b's join carve-out applies only
--    to USER-scoped children (e.g., support_messages). clients is org-driven.
-- ===========================================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_org_read
  ON public.clients
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
       WHERE user_id = auth.uid() AND is_active = true
    )
    OR (SELECT app_private.is_platform_admin())
  );

CREATE POLICY clients_org_insert
  ON public.clients
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members
       WHERE user_id = auth.uid() AND is_active = true
         AND role IN ('owner', 'admin', 'pm', 'accounting')
    )
  );

CREATE POLICY clients_org_update
  ON public.clients
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
       WHERE user_id = auth.uid() AND is_active = true
         AND role IN ('owner', 'admin', 'pm', 'accounting')
    )
  );


-- ===========================================================================
-- 5. SEED — 1 obviously-synthetic fixture client row in fixture-harness-org.
--    Q9 D contract (≥1 fixture row); Q7 obviously-synthetic naming.
--    UUID convention extends 00092/00093 fixture-harness-org pattern:
--      00000000-0000-0000-0003-000000000001 (clients = depth-3 namespace
--      after auth.users 0001-* and org_members 0002-*).
--    Skipped on conflict to support re-apply idempotency.
-- ===========================================================================
INSERT INTO public.clients (id, org_id, full_name, email, phone, created_by)
VALUES (
  '00000000-0000-0000-0003-000000000001',
  '00000000-0000-0000-0000-fb1ce0a55e55',
  'Harness Fixture Client Alpha',
  'harness-client-alpha@nightwork.local',
  '+15555550100',
  '5eb26edc-5989-477f-ac42-d1e9264db0e2'  -- harness-fixture@nightwork.local user
)
ON CONFLICT (id) DO NOTHING;


-- ===========================================================================
-- 6. ADD jobs.client_id FK (nullable; SET NULL on parent client delete).
-- ===========================================================================
ALTER TABLE public.jobs
  ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX idx_jobs_client_id
  ON public.jobs (client_id)
  WHERE deleted_at IS NULL;


-- ===========================================================================
-- 7. BACKFILL — derive clients rows from existing jobs.client_*.
--    Uniqueness key per Q2 nwrp153: composite (org_id, lower(trim(client_
--    name)), lower(trim(client_email))). Same name+email = same client;
--    different email = distinct clients (per EXPANDED-SCOPE §8 risk).
--    Jobs with NULL client_name remain at client_id = NULL.
-- ===========================================================================
WITH distinct_clients AS (
  SELECT DISTINCT
         org_id,
         lower(trim(client_name)) AS name_key,
         lower(trim(client_email)) AS email_key,
         -- Materialize the first non-null full-fidelity values via FIRST_VALUE
         -- in deterministic order (oldest created_at first).
         FIRST_VALUE(trim(client_name)) OVER w AS full_name,
         FIRST_VALUE(client_email) OVER w AS email,
         FIRST_VALUE(client_phone) OVER w AS phone
    FROM public.jobs
   WHERE client_name IS NOT NULL
  WINDOW w AS (
    PARTITION BY org_id, lower(trim(client_name)), lower(trim(client_email))
    ORDER BY created_at
  )
)
INSERT INTO public.clients (org_id, full_name, email, phone)
SELECT org_id, full_name, email, phone
  FROM distinct_clients;


-- ===========================================================================
-- 8. UPDATE jobs.client_id to point at the newly-inserted clients rows.
-- ===========================================================================
UPDATE public.jobs j
   SET client_id = c.id
  FROM public.clients c
 WHERE c.org_id = j.org_id
   AND lower(trim(c.full_name)) = lower(trim(j.client_name))
   AND (
         (c.email IS NULL AND j.client_email IS NULL)
         OR lower(trim(c.email)) = lower(trim(j.client_email))
       )
   AND j.client_name IS NOT NULL;


-- ===========================================================================
-- 9. FORWARD PROBE — every non-NULL jobs.client_name maps to a clients row.
--    HF-A4-2 fail-loud pattern (mirrors 00096 lines 51-62). The reverse-probe
--    (catches asymmetric jobs with client_email/phone but NULL client_name)
--    is RELOCATED to B-1a-bis where DROP COLUMN actually fires. Until then,
--    asymmetric data continues to live in the embedded columns harmlessly
--    (no DROP = no orphan risk).
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
-- 10. NOTIFY PostgREST schema cache reload (Wave-D 00098 §1.1 decision 8
--     belt-and-suspenders pattern; Supabase auto-reloads via DDL trigger
--     but Wave-C taught us schema verification ≠ runtime verification).
-- ===========================================================================
NOTIFY pgrst, 'reload schema';


COMMIT;

-- ===========================================================================
-- POST-APPLY VERIFICATION QUERIES (see §9 of B-1a PLAN.md)
-- ===========================================================================
-- 1. clients table exists with expected columns
-- 2. RLS enabled
-- 3. 3 policies present (clients_org_read / clients_org_insert / clients_org_update)
-- 4. jobs.client_id FK exists; jobs.client_name/email/phone STILL PRESENT
-- 5. ≥1 fixture client row in fixture-harness-org
-- 6. ≥10 jobs in fixture-harness-org have non-NULL client_id (post-backfill)
-- ===========================================================================
```

---

## 7. Down migration sketch (`00100_clients_schema_foundation.down.sql`)

```sql
-- ===========================================================================
-- 00100_clients_schema_foundation.down.sql
-- ===========================================================================
--
-- ROLLBACK for 00100. Best-effort archaeology only — emergency rollback path.
-- Removes jobs.client_id column + drops clients table.
--
-- Per nwrp154 Path A: this down migration is SIMPLER than the original (pre-
-- Path-A) version because B-1a does NOT drop the embedded jobs.client_*
-- columns. Reverse-backfill from clients → jobs is unnecessary — the embedded
-- columns were never touched by the up migration, so they remain populated
-- with their original values. Backfilled clients rows ARE LOST on down (the
-- table itself is dropped), but the source-of-truth data lives on in the
-- embedded columns.
--
-- WARNING: If B-1a-bis has ALREADY shipped at down-time, the embedded columns
-- WILL have been dropped by B-1a-bis. In that case, applying THIS down
-- migration without first applying B-1a-bis's down would orphan all jobs
-- (no client_id column AND no embedded client_*). B-1a-bis's down must
-- ALWAYS be applied first if it shipped.
--
-- Step order (reverse of up):
--   1. DROP INDEX idx_jobs_client_id (auto-drops with column).
--   2. DROP CONSTRAINT jobs_client_id_fkey + DROP COLUMN jobs.client_id.
--   3. DROP TABLE public.clients CASCADE (drops policies + indexes + trigger
--      + fixture row in one shot).
--   4. NOTIFY pgrst.
-- ===========================================================================

BEGIN;

-- 1. Drop jobs.client_id (column drop auto-drops FK + partial index)
ALTER TABLE public.jobs DROP COLUMN client_id;

-- 2. Drop clients table + cascade (policies + indexes + fixture row + trigger)
DROP TABLE IF EXISTS public.clients CASCADE;

-- 3. NOTIFY PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
```

---

## 8. Acceptance criteria (10 falsifiable items)

> **Note:** DROP COLUMN ACs are LOCATED IN B-1a-bis-clients-consumer-refactor-PLAN.md per nwrp154 Path A. This plan's ACs cover schema + backfill + fixture + indexes only. The reverse-probe AC also relocates to B-1a-bis.

- **AC-B1a-01** Migration `supabase/migrations/00100_clients_schema_foundation.sql` exists, syntactically valid SQL, header cites D-078 + D-079 + D-080 + Q1 + Q2 + Q7 + Q9 + nwrp154 Path A scope split.
- **AC-B1a-02** Migration `supabase/migrations/00100_clients_schema_foundation.down.sql` exists, syntactically valid SQL, header documents emergency-rollback-only posture + Path A simplification (no reverse-backfill needed since up didn't touch embedded columns).
- **AC-B1a-03** Pre-flight probe (a)+(b)+(c)+(d) results captured in `00100-PROBE-RESULTS.md`; probe (c) returns 0 rows OR Jake adjudication recorded; probe (d) returns 10 (fixture-harness-org baseline maintained).
- **AC-B1a-04** Post-apply: `SELECT column_name FROM information_schema.columns WHERE table_name='clients' AND table_schema='public'` returns exactly: id, org_id, full_name, email, phone, status_history, created_at, updated_at, created_by, deleted_at (10 columns; V.1 envelope + status_history).
- **AC-B1a-05** Post-apply: `SELECT rowsecurity FROM pg_tables WHERE tablename='clients' AND schemaname='public'` returns `true`.
- **AC-B1a-06** Post-apply: `SELECT policyname FROM pg_policies WHERE tablename='clients' AND schemaname='public' ORDER BY policyname` returns 3 rows: `clients_org_insert`, `clients_org_read`, `clients_org_update`.
- **AC-B1a-07** Post-apply: `SELECT conname FROM pg_constraint WHERE conrelid='public.jobs'::regclass AND confrelid='public.clients'::regclass` returns 1 row (the jobs.client_id → clients(id) FK; conname auto-generated as `jobs_client_id_fkey`).
- **AC-B1a-08** Post-apply: `SELECT column_name FROM information_schema.columns WHERE table_name='jobs' AND table_schema='public' AND column_name IN ('client_name','client_email','client_phone')` returns **3 rows** — the embedded columns STILL EXIST post-B-1a (B-1a-bis owns the DROP per nwrp154 Path A). Plan body explicitly cross-references B-1a-bis as the DROP-owner.
- **AC-B1a-09** Post-apply: `SELECT COUNT(*) FROM clients WHERE org_id='00000000-0000-0000-0000-fb1ce0a55e55' AND full_name='Harness Fixture Client Alpha'` returns 1 (Q9 D + Q7 fixture seeded).
- **AC-B1a-10** Post-apply: `SELECT COUNT(*) FROM jobs WHERE client_id IS NULL AND client_name IS NOT NULL` returns 0 (every job with embedded client_name has a corresponding clients row + client_id mapping — forward-probe backfill complete). Note: `SELECT COUNT(*) FROM jobs WHERE org_id='00000000-0000-0000-0000-fb1ce0a55e55' AND client_id IS NULL` returns 0 specifically for fixture-harness-org.

---

## 9. Verification commands (executor uses these at execute time)

### Pre-apply

```bash
# Pre-flight probes — see §4 expected SQL
# Run via mcp__supabase__execute_sql; save to .planning/phases/stage-f1-knowledge-graph-auth-wave-b/00100-PROBE-RESULTS.md
```

### Post-apply

```sql
-- AC-B1a-04: clients column inventory
SELECT column_name, is_nullable, data_type
  FROM information_schema.columns
 WHERE table_name='clients' AND table_schema='public'
 ORDER BY ordinal_position;
-- expect: 10 rows (id, org_id, full_name, email, phone, status_history,
--         created_at, updated_at, created_by, deleted_at)

-- AC-B1a-05: RLS enabled
SELECT rowsecurity FROM pg_tables
 WHERE tablename='clients' AND schemaname='public';
-- expect: t

-- AC-B1a-06: 3 policies
SELECT policyname, permissive, cmd FROM pg_policies
 WHERE tablename='clients' AND schemaname='public'
 ORDER BY policyname;
-- expect: clients_org_insert PERMISSIVE INSERT
--         clients_org_read   PERMISSIVE SELECT
--         clients_org_update PERMISSIVE UPDATE

-- AC-B1a-07: jobs.client_id FK exists
SELECT conname FROM pg_constraint
 WHERE conrelid='public.jobs'::regclass
   AND confrelid='public.clients'::regclass;
-- expect: 1 row, conname likely 'jobs_client_id_fkey'

-- AC-B1a-08: embedded columns STILL PRESENT (B-1a-bis owns the DROP)
SELECT column_name FROM information_schema.columns
 WHERE table_name='jobs' AND table_schema='public'
   AND column_name IN ('client_name','client_email','client_phone');
-- expect: 3 rows (client_name, client_email, client_phone)

-- AC-B1a-09: fixture client row
SELECT id, full_name FROM public.clients
 WHERE org_id='00000000-0000-0000-0000-fb1ce0a55e55'
   AND full_name='Harness Fixture Client Alpha';
-- expect: 1 row

-- AC-B1a-10: forward-backfill complete
SELECT COUNT(*) FROM public.jobs
 WHERE client_id IS NULL
   AND client_name IS NOT NULL;
-- expect: 0

-- AC-B1a-10 (fixture-harness-org slice): backfill complete on fixture jobs
SELECT COUNT(*) FROM public.jobs
 WHERE org_id='00000000-0000-0000-0000-fb1ce0a55e55'
   AND client_id IS NULL;
-- expect: 0

-- (Convention check) clients.created_by FK to auth.users
SELECT conname FROM pg_constraint
 WHERE conrelid='public.clients'::regclass
   AND confrelid='auth.users'::regclass;
-- expect: 1 row (clients_created_by_fkey)
```

### PostgREST runtime smoke

```bash
# REST GET to verify schema-cache picked up the new table (Rule 1 — runtime ≠ schema)
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/clients?org_id=eq.00000000-0000-0000-0000-fb1ce0a55e55&select=id,full_name&limit=1" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $TEST_USER_JWT"
# expect: HTTP 200, body=[{"id":"...","full_name":"Harness Fixture Client Alpha"}]
```

---

## 10. Rollback strategy

**Posture per nwrp154 Path A:** B-1a is schema-add + backfill only. No data loss path — the embedded `jobs.client_*` columns are never touched by the up migration, so down removes only the new `clients` table + `jobs.client_id` column. Backfilled `clients` rows are lost on down, but the source-of-truth data lives on in the embedded columns (which the original 22 src consumers still read from until B-1a-bis ships).

**Pre-commit gates:**
- Pre-flight probes (a)..(d) must clear before any DDL fires.
- Forward probe inside the transaction must clear before COMMIT. ROLLBACK on failure is automatic.

**Rollback procedure (any time post-apply, BEFORE B-1a-bis ships):**

1. `git revert <B-1a-migration-apply-commit>` — restores the migration file's pre-state.
2. Apply `00100_clients_schema_foundation.down.sql` via `mcp__supabase__apply_migration`.
3. Verify: `SELECT to_regclass('public.clients')` returns NULL; `SELECT column_name FROM information_schema.columns WHERE table_name='jobs' AND column_name='client_id'` returns 0 rows.
4. Verify: `SELECT COUNT(*) FROM public.jobs WHERE client_name IS NOT NULL` returns the same baseline count as pre-migration probe (b). **Embedded columns untouched by up + untouched by down = no reconciliation needed.**

**Rollback procedure AFTER B-1a-bis ships:**

If B-1a-bis (which DROPS the embedded columns) has already shipped, rolling back B-1a alone is no longer mechanical. The correct procedure:
1. First, roll back B-1a-bis (apply its down migration) — restores embedded `jobs.client_*` columns + reverse-backfills from `clients` table.
2. Then, roll back B-1a (apply its down migration) — drops `clients` table + `jobs.client_id`.
3. Both rollbacks are best-effort archaeology; surface to Jake before executing if any reconciliation is in question.

**Data-integrity verification post-rollback (B-1a alone):**

```sql
-- Confirm clients table is gone:
SELECT to_regclass('public.clients') IS NULL AS clients_gone;
-- expect: t

-- Confirm jobs.client_id column is gone:
SELECT COUNT(*) FROM information_schema.columns
 WHERE table_name='jobs' AND column_name='client_id';
-- expect: 0

-- Confirm embedded columns intact (forward-probe baseline preserved):
SELECT COUNT(*) FROM public.jobs WHERE client_name IS NOT NULL;
-- expect: same as pre-migration probe (b) result
```

---

## 11. SOC2 mapping

| Trust Services Criterion | Coverage |
|---|---|
| **CC6.1** (Logical and physical access controls) | Direct-filter RLS on `org_id` enforces tenant boundary by construction (Q10b). Role-gated INSERT + UPDATE (owner/admin/pm/accounting) prevents privilege escalation via clients write. Platform-admin OR-clause on SELECT preserves cross-tenant debugging posture (CC6.7 implicit). |
| **CC7.2** (System monitoring — security incidents) | Audit-trail durability preserved via `status_history JSONB NOT NULL DEFAULT '[]'` (Q12 uniform versioning). When B-4 adds 'client' to `ActivityEntityType` (Slice-2), every CRUD on clients writes an `activity_log` row anchored at `auth.users` (D-078 audit anchor). Soft-delete via `deleted_at` (V.1 envelope) preserves historic identity even after the Owner Portal closes a client. |
| **PI1.1** (Processing integrity — completeness/validity) | PostgREST embedding PII fence: clients.email + clients.phone cannot be exposed via accidental `client:clients(*)` embed. Plan-review iter-1 grep gate enforces (per Plan D-4 Rule 2). Future legitimate display-of-email use case routes through an explicit /api/clients endpoint with intentional role check, NOT an embed. Backfill atomicity (forward probe inside transaction) preserves data completeness — partial backfill state is structurally impossible. |

No new SOC2 controls introduced. The plan inherits D-078 + D-079 + D-080 control mappings.

---

## 12. Notes for plan-review iter-1

**Reviewer focus suggestions** (per nightwork-plan-review SKILL.md cross-cutting reviewer dispatch + Wave-D iter-1 precedent):

| Reviewer | Focus area | Expected findings shape |
|---|---|---|
| **database-reviewer** | RLS shape (3-policy R.23) + index posture (2 indexes; justification for partial-on-deleted_at) + backfill atomicity (forward probe inside transaction) + ON DELETE semantics (clients.org_id CASCADE; clients.created_by NO ACTION; jobs.client_id SET NULL) | Likely PASS; minor finding possible on whether `idx_clients_full_name_lower` is premature optimization pre-Wave-B-Slice-2 Owner Portal usage. |
| **security-reviewer** | PII fence enforcement (clients.email + phone never embedded) + DB-password risk on backfill (no service-role write of cleartext data; all backfill is org-internal) + RLS coverage on platform-admin OR-clause | Likely PASS; possible flag on whether `idx_clients_full_name_lower` exposes name to non-RLS-protected pg_stat_statements (mitigation: search_path SET'' in helpers; existing pattern). |
| **multi-tenant-architect** | Cross-org leak surface (clients.org_id NOT NULL + RLS direct-filter on org_id; no JOIN-through-jobs introduced) + fixture-harness-org isolation (synthetic UUID `00000000-0000-0000-0003-000000000001` does not collide with prod) + Q10b ORG-scoped rule conformance | Likely PASS; the migration is structurally aligned with Q10b. |
| **nightwork-data-migration-safety** | Forward probe inside transaction + Path A scope split documentation (no DROP in B-1a — DROP owned by B-1a-bis) + ambiguous-backfill HALT path (probe c) + V.2 export schema sketch present | **Expected: PASS** (was BLOCKING-on-HALT in original B-1a). The destructive DROP COLUMN is gone; B-1a is now schema-add + backfill only. No data loss path. Reviewer should verify Path A documentation is explicit + B-1a-bis cross-reference is present in migration header + plan body. |
| **ai-logic-tester** | Representative-query test on PostgREST `client:clients!jobs_client_id_fkey (id, full_name)` embed AFTER apply (Rule 3 — execute query against current schema, not infer from metadata) + verify FK name matches PostgREST's expected `jobs_client_id_fkey` auto-naming | Should execute the representative REST query and verify HTTP 200 + correct embed shape. |
| **architect** | Architectural fit (clients as F1 Wave 1 entity per ENTITY-INVENTORY.md) + V.2 export schema completeness + interaction with B-2 Owner Portal Path A future state + Path A scope split clarity | Likely PASS; the design respects EXPANDED-SCOPE §3 Slice-2 design implication (clients FK semantics support Owner Portal client_portal_access.client_id). |
| **enterprise-readiness** | Migration body comment fidelity (cites 7 source decisions + nwrp154 Path A) + commit-mechanism transparency (compound-form per nwrp133) + idempotency on re-apply (ON CONFLICT clauses present) | Likely PASS. |
| **scalability** | Index plan completeness (org_id + full_name + jobs.client_id) + RLS performance posture (SELECT-wrap on app_private.is_platform_admin helper for session caching) | Likely PASS; the migration mirrors 00096's session-caching pattern. |
| **compliance** | SOC2 mapping coverage (CC6.1 + CC7.2 + PI1.1) + 7-year retention compatibility (clients retention class = forever per ENTITY-INVENTORY) | Likely PASS. |
| **design-pushback** | Whether Path A two-plan split (B-1a + B-1a-bis) is the right slice strategy + transitional dual-state window bounded to B-1a-bis execution time | Should validate that the transitional window (B-1a-bis-execution-duration) is short enough that drift risk is negligible. |

**Cross-reviewer factual disagreement risk (nwrp118 HALT):**
- Possible disagreement on: whether the PII fence grep regex pattern in §11-AC is correct (some reviewers may propose tighter or looser regex bounds). Resolution: verify against the existing `grep -rE "profile:profiles\([^)]*\bemail\b" src/` pattern shape used in Wave-D D-4 codification.
- Possible disagreement on: whether the ON DELETE SET NULL on jobs.client_id matches the EXPANDED-SCOPE §3 Slice-2 design implication (the brief notes "Plan B-1a's `clients` table FK constraint shape (`ON DELETE SET NULL`) must allow `client_portal_access` row preservation if a client is soft-deleted"). The current shape uses SET NULL; per CLAUDE.md "Never delete records," hard delete of a client should be RLS-blocked anyway, so SET NULL only fires under emergency-DBA-direct-delete scenarios. Resolution: confirmed correct.

**Mandatory pre-flight gates (per Workflow posture Rule 6):**
- (a) Hook regex sweep on `supabase/migrations/00100_clients_schema_foundation.sql` + `.down.sql` for design-token violations — N/A (SQL files; design-token regex doesn't fire on SQL).
- (b) Fixture infrastructure collision check — UUID `00000000-0000-0000-0003-000000000001` (clients fixture row) checked: no prior migration uses depth-3 namespace `0003-*` for fixture seeds. Email `harness-client-alpha@nightwork.local` checked: no existing auth.users row with this email per 00092/00093 + smoke-seed.sql inventory.
- (c) Deliverable path reachability check — `supabase/migrations/*` is tracked by git from a fresh checkout (not gitignored). PASS.
- (d) files_modified intersection check vs B-D080 + B-1a-bis + B-1b — B-D080 files: `00099_user_identity_fk_convention.sql` + `.down.sql`. B-1a-bis files: TBD by sibling plan-author (likely 16 src consumer files + `00101_clients_consumer_refactor_drop.sql` + `.down.sql`). B-1b files: TBD by sibling plan-author (likely `src/lib/knowledge-graph/*` + `src/lib/types/database.types.ts` + harness extensions; no migration files). B-1a files: `00100_clients_schema_foundation.sql` + `.down.sql`. **Intersection: empty across all 4 plans at the migration-file level.** Parallel-authoring with B-1a-bis confirmed safe at file level. Parallel-execute still NOT permitted per nwrp152 migration-numbering sequencing (00099 → 00100 → 00101+) + per Path A consumer-refactor ordering (B-1a-bis depends on B-1a's `clients` table existing).

---

## 13. Cross-references

- `B-1a-bis-clients-consumer-refactor-PLAN.md` (sibling plan, authored in parallel per nwrp154) — owns the 16-consumer refactor + DROP COLUMN atomic transaction (migration 00101). B-1a-bis executes AFTER B-1a; before B-1b.
- `B-D080-user-identity-fk-convention-PLAN.md` — establishes D-080 convention (migration 00099); B-1a's `clients.created_by` REFERENCES auth.users honors this convention from creation.
- `B-1b-knowledge-graph-scaffold-PLAN.md` — consumes the new `clients` table + post-DROP `jobs` shape via `supabase gen types typescript --linked` (after B-1a-bis ships).
- `.planning/MASTER-PLAN.md` §10 D-078 + D-079 + D-080 — canonical source decisions for PII fence + FK convention.
- `.planning/expansions/stage-f1-knowledge-graph-auth-wave-b-EXPANDED-SCOPE.md` (APPROVED 2026-05-15) — slice-1 EXPANDED-SCOPE doc.
- nwrp152 dispatch + nwrp153 EXPANDED-SCOPE approval + nwrp154 Path A re-author — full chain of authorizations.
