# Plan-Review B-2a QA — AI Logic Tester (LIVE-DB EXECUTION)

**Captured 2026-05-21 (post-execute B-2a QA per nwrp207).** Source: nightwork-ai-logic-tester agent return content. AC-B2a-06 Queries 1 + 2 + 3 executed against LIVE Supabase via Management API (`/v1/projects/{ref}/database/query`). NOT plan-text confirmation. Actual query output captured verbatim.

## Verdict

**PASS** — Migration 00104 (`b2a_token_issuance_security_model`) is applied to live DB; Q1 backfill completeness re-confirmed at 0; Q2 RPC produces non-NULL client_id scoped to inviting org; Q3 cross-org attack RAISES `unauthorized` with **zero leakage row created** (Jake's "real protection" catastrophic-leak proof clause per nwrp207 §7).

## Q1 — Backfill completeness (re-confirmation)

Query (Supabase Management API):

    SELECT COUNT(*) AS active_null_client_count
      FROM public.client_portal_access
     WHERE client_id IS NULL
       AND revoked_at IS NULL
       AND expires_at > NOW();

Actual output:

    [{"active_null_client_count":0}]

**Match**: YES. Zero active token rows with NULL client_id. Every active row in `client_portal_access` has a populated `client_id`. (Note: live DB currently has 0 rows total in the table per final-state check, so this query is vacuously true alongside the active probe via Q2.)

## Q2 — RPC produces non-NULL client_id scoped to inviting org (6 arguments per BLK-2)

### Q2 Step 1: identify test job

Query:

    SELECT j.id AS test_job_id, j.org_id AS test_org_id, j.client_id, j.name
      FROM public.jobs j
     WHERE j.client_id IS NOT NULL
       AND j.deleted_at IS NULL
     LIMIT 1;

Actual output:

    [{"test_job_id":"27ac3239-7514-4e8c-ae91-c1169bf36ae9",
      "test_org_id":"00000000-0000-0000-0000-000000000001",
      "client_id":"0192f37b-e5d6-47f5-8a5d-ea189fad02ea",
      "name":"Pou-109 Seagrape Ln"}]

### Q2 Step 2: invoke RPC via service-role with 6 arguments

Query:

    SELECT * FROM public.create_client_portal_invite(
      '00000000-0000-0000-0000-000000000001'::uuid,
      '27ac3239-7514-4e8c-ae91-c1169bf36ae9'::uuid,
      'qa+b2a-06-q2@example.com',
      'QA B2a Q2 Probe',
      '{}'::jsonb,
      NULL
    );

Actual output:

    [{"portal_access_id":"941a589d-a7db-49d1-bc33-8dd899053a47",
      "plaintext_token":"29c9a6407ce41a8f42c530d3119856192ade2d1d934f55153521fb525acc7be6"}]

RPC succeeded under Management API context (postgres superuser; auth.uid()=NULL; app_private.user_org_id()=NULL). See "Test-fixture limitation note" below for service-role auth-check semantics.

### Q2 Step 3: verify inserted row has non-NULL client_id matching jobs.client_id

Query:

    SELECT cpa.client_id, cpa.org_id, j.client_id AS jobs_client_id,
           j.org_id AS jobs_org_id, cpa.expires_at, cpa.revoked_at
      FROM public.client_portal_access cpa
      JOIN public.jobs j ON j.id = cpa.job_id
     WHERE cpa.email = 'qa+b2a-06-q2@example.com'
     ORDER BY cpa.created_at DESC LIMIT 1;

Actual output:

    [{"client_id":"0192f37b-e5d6-47f5-8a5d-ea189fad02ea",
      "org_id":"00000000-0000-0000-0000-000000000001",
      "jobs_client_id":"0192f37b-e5d6-47f5-8a5d-ea189fad02ea",
      "jobs_org_id":"00000000-0000-0000-0000-000000000001",
      "expires_at":"2027-05-21 19:51:42.123789+00",
      "revoked_at":null}]

**Assertions ALL TRUE:**

- `cpa.client_id IS NOT NULL` ✓ (= `0192f37b-e5d6-47f5-8a5d-ea189fad02ea`)
- `cpa.client_id = j.client_id` ✓ (both `0192f37b-e5d6-47f5-8a5d-ea189fad02ea`)
- `cpa.org_id = j.org_id` ✓ (both `00000000-0000-0000-0000-000000000001`)
- `expires_at = 2027-05-21` ✓ (one year from issuance — confirms 1-year default per AC-B2a-07 + nwrp200 1-year LOCK + L-4 sliding-window flip)
- `revoked_at IS NULL` ✓ (fresh token)

### Q2 Step 4: cleanup

Query:

    DELETE FROM public.client_portal_access
     WHERE email = 'qa+b2a-06-q2@example.com'
     RETURNING id;

Actual output:

    [{"id":"941a589d-a7db-49d1-bc33-8dd899053a47"}]

## Q3 — Cross-org rejection WITH zero-leakage-row clause (CATASTROPHIC-LEAK PROOF)

### Q3 Step 1: identify two orgs

Query:

    SELECT m.org_id, COUNT(DISTINCT j.id) AS jobs_count
      FROM public.org_members m
      JOIN public.jobs j ON j.org_id = m.org_id
     WHERE j.deleted_at IS NULL AND j.client_id IS NOT NULL
     GROUP BY m.org_id
    HAVING COUNT(DISTINCT j.id) >= 1
     LIMIT 5;

Actual output:

    [{"org_id":"00000000-0000-0000-0000-000000000001","jobs_count":15},
     {"org_id":"00000000-0000-0000-0000-fb1ce0a55e55","jobs_count":10}]

- **org_A** = `00000000-0000-0000-0000-000000000001` (Ross Built; 15 jobs with client_id)
- **org_B** = `00000000-0000-0000-0000-fb1ce0a55e55` (10 jobs with client_id)

### Q3 Step 2: identify org_A job

Actual output:

    [{"org_a_job_id":"27ac3239-7514-4e8c-ae91-c1169bf36ae9",
      "name":"Pou-109 Seagrape Ln"}]

### Q3 Step 3: baseline leakage-row count

Query:

    SELECT COUNT(*) AS baseline_count FROM public.client_portal_access
     WHERE org_id = '00000000-0000-0000-0000-000000000001'
       AND email = 'qa+b2a-06-q3-xorg@example.com';

Actual output:

    [{"baseline_count":0}]

### Q3 Step 4: identify org_B admin user for JWT impersonation

Actual output:

    [{"user_id":"00000000-0000-0000-0002-000000000009","org_id":"00000000-0000-0000-0000-fb1ce0a55e55","role":"accounting"},
     {"user_id":"5eb26edc-5989-477f-ac42-d1e9264db0e2","org_id":"00000000-0000-0000-0000-fb1ce0a55e55","role":"admin"},
     {"user_id":"00000000-0000-0000-0002-000000000001","org_id":"00000000-0000-0000-0000-fb1ce0a55e55","role":"owner"}]

Selected org_B admin: `5eb26edc-5989-477f-ac42-d1e9264db0e2`.

### Q3 Step 5: cross-org attack — org_B admin attempts to invite for org_A job

Query (DO block with JWT claims impersonation + final RAISE for outcome capture):

    DO $$
    DECLARE
      result RECORD;
      v_sqlstate TEXT;
      v_sqlerrm TEXT;
      v_outcome TEXT;
    BEGIN
      PERFORM set_config('request.jwt.claims',
        '{"sub":"5eb26edc-5989-477f-ac42-d1e9264db0e2","role":"authenticated","aud":"authenticated"}',
        true);
      PERFORM set_config('role', 'authenticated', true);

      BEGIN
        SELECT * INTO result FROM public.create_client_portal_invite(
          '00000000-0000-0000-0000-000000000001'::uuid,  -- p_org_id = org_A
          '27ac3239-7514-4e8c-ae91-c1169bf36ae9'::uuid,  -- p_job_id = org_A job
          'qa+b2a-06-q3-xorg@example.com',
          'Cross-Org Attack Probe',
          '{}'::jsonb,
          NULL
        );
        v_outcome := 'FAIL_RPC_SUCCEEDED: portal_access_id=' || result.portal_access_id::text;
      EXCEPTION
        WHEN OTHERS THEN
          GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE, v_sqlerrm = MESSAGE_TEXT;
          v_outcome := 'RAISED_EXPECTED: SQLSTATE=' || v_sqlstate || ', MSG=' || v_sqlerrm;
      END;

      RAISE EXCEPTION '%', v_outcome;
    END $$;

Actual output (HTTP 400 response from Management API; the final RAISE EXCEPTION is the outcome carrier):

    {"message":"Failed to run sql query: ERROR:  P0001: RAISED_EXPECTED: SQLSTATE=P0001, MSG=unauthorized
    CONTEXT:  PL/pgSQL function inline_code_block line 27 at RAISE
    "}

**Decoded:**

- The inner BEGIN..EXCEPTION block caught the RPC's RAISE.
- The captured SQLSTATE = `P0001` (PL/pgSQL `RAISE EXCEPTION` default code).
- The captured MSG = `unauthorized` — verbatim text from migration 00104:221 (`RAISE EXCEPTION 'unauthorized';`).
- The final outer RAISE bubbled the outcome string as `RAISED_EXPECTED: SQLSTATE=P0001, MSG=unauthorized`.

**Cross-org RPC invocation was REJECTED at the auth check.** Migration 00104:211-222 auth check `IF NOT (p_org_id = app_private.user_org_id() AND ...)` evaluated to TRUE (org_A != org_B), so the RAISE fired BEFORE the SELECT...INTO _client_id step and BEFORE the INSERT.

### Q3 Step 6: ZERO LEAKAGE ROW VERIFICATION

Query:

    SELECT COUNT(*) AS post_attack_count FROM public.client_portal_access
     WHERE org_id = '00000000-0000-0000-0000-000000000001'
       AND email = 'qa+b2a-06-q3-xorg@example.com';

Actual output:

    [{"post_attack_count":0}]

**ASSERT TRUE: post_attack_count = 0 = baseline_count = 0.** Zero rows created. RPC raised before INSERT; no partial write. Catastrophic-leak proof verified.

### Q3 Step 7: Defense-in-depth — any row with attack email across ALL orgs

Query:

    SELECT COUNT(*) AS any_email_count FROM public.client_portal_access
     WHERE email = 'qa+b2a-06-q3-xorg@example.com';

Actual output:

    [{"any_email_count":0}]

Zero rows with the attack email across the entire table.

### Q3 Sanity Check - same-org call by same impersonated user SUCCEEDS

Concern: did JWT impersonation actually flip the auth context? To prove the JWT claims path is real, the same 5eb26edc-... org_B admin invoked the RPC against an org_B job (22222222-2222-2222-2222-200000000001 = Smoke Job Alpha). If JWT impersonation is real, this same-org call should SUCCEED.

Same-org query (org_B admin, same JWT claims as Q3 Step 5, but p_org_id=org_B and p_job_id=org_B job):

    DO $$
    DECLARE
      result RECORD; v_outcome TEXT;
    BEGIN
      PERFORM set_config('request.jwt.claims',
        json with sub=5eb26edc-..., role=authenticated, aud=authenticated,
        true);
      PERFORM set_config('role', 'authenticated', true);
      SELECT * INTO result FROM public.create_client_portal_invite(
        '00000000-0000-0000-0000-fb1ce0a55e55'::uuid,
        '22222222-2222-2222-2222-200000000001'::uuid,
        'qa+b2a-06-q3-sanity@example.com',
        'Same-Org Sanity Probe',
        '{}'::jsonb,
        NULL);
      v_outcome := 'RPC_SUCCEEDED: portal_access_id=' || result.portal_access_id::text;
      RAISE EXCEPTION '%', v_outcome;
    END $$;

Actual output:

    {"message":"Failed to run sql query: ERROR:  P0001: RPC_SUCCEEDED: portal_access_id=0d6c4dd2-0e07-4df2-9cb9-1cdf2ce44968
    CONTEXT:  PL/pgSQL function inline_code_block line 27 at RAISE
    "}

**Decoded**: Same impersonated user (org_B admin), same JWT claims, same RPC, but with same-org p_org_id/p_job_id -> RPC_SUCCEEDED: portal_access_id=0d6c4dd2-... . This proves JWT impersonation is real (not a stub) and the auth check at 00104:211-222 is genuinely org-scoped.

(The sanity row was never committed because the outer RAISE rolled back the transaction. Final state check confirms SELECT COUNT(*) FROM client_portal_access = 0.)

## Test-fixture limitation note (Q3 test pattern caveat)

The Supabase Management API (/v1/projects/{ref}/database/query) runs as postgres superuser. Under this default context:

- current_user = postgres / session_user = postgres
- auth.uid() = NULL
- app_private.user_org_id() = NULL

Migration 00104 RPC auth check at lines 211-222:

    IF NOT (
      p_org_id = app_private.user_org_id()
      AND app_private.user_role() IN ('owner','admin','pm')
      AND (
        app_private.user_role() IN ('owner','admin')
        OR EXISTS (
          SELECT 1 FROM public.jobs j WHERE j.id = p_job_id AND j.pm_id = auth.uid()
        )
      )
    ) THEN
      RAISE EXCEPTION 'unauthorized';
    END IF;

Under postgres-superuser context, p_org_id = NULL evaluates to NULL, NULL AND ... evaluates to NULL, NOT NULL evaluates to NULL, and IF NULL THEN does NOT execute the THEN branch (PL/pgSQL three-valued logic). So service-role calls bypass the auth check. This is expected - the auth check is for authenticated user sessions (PostgREST), not service-role connections (where the application code is trusted).

To exercise the cross-org auth check, JWT claims were set via:

    PERFORM set_config('request.jwt.claims', JSON with sub=user_id role=authenticated aud=authenticated, true);
    PERFORM set_config('role', 'authenticated', true);

This flips the runtime context so auth.uid() and app_private.user_org_id() return values derived from the JWT payload. Sanity-check (same-org call succeeding) confirms this impersonation works against the live RPC.

**Implication for testing scope:** The Management API JWT-impersonation pattern is sufficient for the AC-B2a-06 Query 3 cross-org rejection assertion. A follow-up E2E test via Playwright against a real authenticated session (logged-in browser -> fetch to /api/owner-portal/* route -> RPC) would add defense-in-depth coverage of:

1. Middleware-layer rejection before reaching the RPC
2. Browser-level CSRF Origin check (H-2 iter-1 SYNTHESIS)
3. PostgREST role gate before RPC invocation

These are tested at AC-B2a-08/AC-B2a-09 layer separately. The Management API path confirms the **RPC body own auth-check** is genuinely org-scoped and produces zero leakage row on cross-org attempt.

## RPC body live verification (defense-in-depth)

Query:

    SELECT position('B-2a invariant FAILED' in pg_get_functiondef(p.oid)) AS b2a_invariant_pos,
           position('1 year' in pg_get_functiondef(p.oid)) AS one_year_pos,
           position('90 days' in pg_get_functiondef(p.oid)) AS ninety_days_pos
      FROM pg_proc p
     WHERE p.proname = 'create_client_portal_invite'
       AND p.pronamespace = 'public'::regnamespace;

Actual output:

    [{"b2a_invariant_pos":1050,"one_year_pos":1634,"ninety_days_pos":0}]

**Confirms migration 00104 forward changes are LIVE:**

- 'B-2a invariant FAILED' string present at position 1050 -> §3 D-05 NULL-leak fix shipped
- '1 year' string present at position 1634 -> 1-year default shipped (per nwrp200 + L-4)
- '90 days' string ABSENT (position 0) -> old 90-day form fully replaced

Migration version check:

    SELECT name FROM supabase_migrations.schema_migrations
     ORDER BY version DESC LIMIT 10;

Actual output (top row):

    [{"name":"b2a_token_issuance_security_model"}, ...]

Migration 00104 is the most recent applied migration on the live DB.

## Runtime evidence anchors

- **Query route**: Supabase Management API /v1/projects/{ref}/database/query
- **Auth**: SUPABASE_ACCESS_TOKEN (sourced from .env.local; presence verified via if-bracket-dash-n-VAR pattern per nwrp139 leak rule)
- **Project ref**: egxkffodxcefwpqmwrur (Nightwork primary)
- **Date**: 2026-05-21
- **Read-only-vs-mutating posture**: Q1 (SELECT), Q2 invocation (INSERT via RPC; cleaned up via DELETE), Q3 (DO block with RPC + final RAISE - rolled back), Q3 Sanity (DO block with RPC + final RAISE - rolled back). Final state check confirms zero residual QA test rows; final client_portal_access row count = 0.
- **Mutations performed and reverted**: Q2 inserted 1 row (cleaned up via DELETE returning id 941a589d-a7db-49d1-bc33-8dd899053a47). Q3 + Q3 Sanity attempted INSERTs via RPC; either RPC raised (Q3 - no INSERT executed) or DO-block outer RAISE rolled back the wrapping transaction (Q3 Sanity). No persistent state changes.

## Cross-reviewer alignment (Rule 9)

No Rule 9 factual disagreement surfaced. The iter-2 ai-logic PASS verdict + the 6 other iter-2 PASS verdicts continue to align. This live-DB execution **re-affirms** iter-2 ai-logic baseline evidence (Q3 90->1-year flip; Q1 0-row vacuous-truth) and **adds** the new active-probe runtime evidence per AC-B2a-06 sub-items 2 + 3.

## Newly-surfaced findings vs iter-1 / iter-2

**None.** No new BLOCKING, WARNING, or NOTE findings. The execute artifact (commit 4780007 migration 00104 applied) shipped to the live DB matches the iter-2 PLAN body assertions verbatim:

- BLK-3 timing-oracle non-partial token-hash index - verified live (separate runtime probe per AC-B2a-14 / iter-2 ai-logic baseline Q1)
- BLK-4 RPC NULL-leak fix - verified live via AC-B2a-06 Q2 active probe (this report)
- L-4 1-year sliding-window - verified live via Q2 expires_at = 2027-05-21 (one year from 2026-05-21)
- L-3 revoked_seq Option A - not exercised in this report (covered by AC-B2a-08 revocation tests)

## Verdict (final)

**PASS** - AC-B2a-06 catastrophic-leak proof verified end-to-end:

1. **Q1** re-confirms zero active rows with NULL client_id (vacuously true on current 0-row state; alongside Q2 active probe per N-2 disposition).
2. **Q2** confirms RPC body produces non-NULL client_id matching jobs.client_id AND org_id matching jobs.org_id, with 1-year expiry; 6 arguments verified per BLK-2 fix.
3. **Q3** confirms cross-org RPC invocation (org_B admin -> org_A job, via JWT-claims impersonation) RAISES 'unauthorized' with **zero leakage row** committed; sanity-check (same user -> same-org job succeeds) confirms impersonation pattern is real.

Migration 00104 is applied to the live DB; RPC body verified at runtime to contain B-2a invariant + 1-year default + zero 90-day strings; auth check is genuinely org-scoped; no partial-write leak path exists.

Recommend: **CLEAR for GATE B-2a sign-off + B-2b dispatch.** No HALT triggers fired.

