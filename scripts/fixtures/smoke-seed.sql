-- scripts/fixtures/smoke-seed.sql
--
-- Synthetic seed for verification harness smoke scripts. Reuses the canonical
-- fixture-harness-org infrastructure created by migrations 00092 + 00093
-- (stage-1.5c-verification-harness Layer 3) per nwrp135 Option A merge decision.
--
-- Run order: AFTER schema migrations are applied. Idempotent via ON CONFLICT.
--
-- Used by:
--   - scripts/wave-d-smoke.ts (Wave-D Layer 4 behavioral testing)
--   - Future scripts/smoke-* harnesses (Wave 1.1-Full Layer 4 framework)
--
-- Architecture (per nwrp135 Option A — merge into existing fixture-harness-org):
--
--   - The canonical harness fixture org + user already exist from migration
--     00092 + 00093 (Verification Harness Fixture Org). The smoke seed REUSES
--     them rather than creating parallel synthetic infrastructure (which would
--     collide on auth.users.email uniqueness — see nwrp135 finding for the
--     specific collision that surfaced this architectural mismatch).
--
--   - Existing canonical IDs (NOT inserted by this seed; verified pre-flight):
--       Organization: 00000000-0000-0000-0000-fb1ce0a55e55 (slug: fixture-harness-org)
--       User:         5eb26edc-5989-477f-ac42-d1e9264db0e2 (harness-fixture@nightwork.local)
--
--   - This seed ADDS 9 new supporting users (smoke-owner + 7 PMs + accounting)
--     + 10 jobs + 5 invoices + 10 activity_log rows INTO the existing org.
--
-- UUID convention for new supporting users (per nwrp135 predictable pattern):
--   00000000-0000-0000-0002-00000000000N where N = 1..9
--
-- UUID convention for jobs / invoices / activity_log (per iter-2 §4.4.1):
--   Jobs:          22222222-2222-2222-2222-XXXXXXXXXXXX
--   Invoices:      33333333-3333-3333-3333-XXXXXXXXXXXX
--   Activity log:  44444444-4444-4444-4444-XXXXXXXXXXXX
--
-- DO NOT hardcode Drummond/SmartShield/real-vendor UUIDs in this file. Per
-- CLAUDE.md → Domain rules → Drummond-vs-synthetic-fixtures exception
-- (Wave-D D-4 deliverable; iter-2 §4.4.4).
--
-- Schema alignment notes:
--   - `profiles.id` is FK to `auth.users(id)` (migration 00007). Synthetic
--     profiles rows require corresponding auth.users entries first.
--   - `activity_log` schema (migration 00026) uses `created_at` (not
--     `occurred_at`) and `details JSONB` (not `action_metadata`).
--   - `invoices.assigned_pm_id` does not exist as a column; omitted.
--
-- Application:
--   psql -f scripts/fixtures/smoke-seed.sql  (local Supabase)
--   OR Supabase MCP execute_sql with file content (preview environment)

BEGIN;

-- ============================================================================
-- Step 1: 9 NEW synthetic auth.users (supporting users for smoke harness).
--
-- SKIPS the harness-fixture@nightwork.local user — that user already exists
-- with UUID 5eb26edc-5989-477f-ac42-d1e9264db0e2 from migration 00092/00093
-- (Layer 3 verification harness). Reinserting it would collide on the
-- auth.users.email uniqueness constraint (nwrp135 finding).
--
-- ON CONFLICT (id) DO UPDATE preserves idempotency for the 9 new users.
-- ============================================================================
DO $$
DECLARE
  v_password TEXT := 'SmokeSeed2026!';  -- synthetic; never used at runtime
  v_user RECORD;
BEGIN
  FOR v_user IN
    SELECT * FROM (VALUES
      ('00000000-0000-0000-0002-000000000001'::uuid, 'smoke-owner@nightwork.local',      'Smoke Owner',      'admin'),
      ('00000000-0000-0000-0002-000000000002'::uuid, 'smoke-pm-alpha@nightwork.local',   'Smoke PM Alpha',   'pm'),
      ('00000000-0000-0000-0002-000000000003'::uuid, 'smoke-pm-beta@nightwork.local',    'Smoke PM Beta',    'pm'),
      ('00000000-0000-0000-0002-000000000004'::uuid, 'smoke-pm-gamma@nightwork.local',   'Smoke PM Gamma',   'pm'),
      ('00000000-0000-0000-0002-000000000005'::uuid, 'smoke-pm-delta@nightwork.local',   'Smoke PM Delta',   'pm'),
      ('00000000-0000-0000-0002-000000000006'::uuid, 'smoke-pm-epsilon@nightwork.local', 'Smoke PM Epsilon', 'pm'),
      ('00000000-0000-0000-0002-000000000007'::uuid, 'smoke-pm-zeta@nightwork.local',    'Smoke PM Zeta',    'pm'),
      ('00000000-0000-0000-0002-000000000008'::uuid, 'smoke-pm-eta@nightwork.local',     'Smoke PM Eta',     'pm'),
      ('00000000-0000-0000-0002-000000000009'::uuid, 'smoke-accounting@nightwork.local', 'Smoke Accounting', 'accounting')
    ) AS t(id, email, full_name, role)
  LOOP
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user.id,
      'authenticated',
      'authenticated',
      v_user.email,
      crypt(v_password, gen_salt('bf')),
      NOW(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email'], 'role', v_user.role),
      jsonb_build_object('full_name', v_user.full_name),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    ON CONFLICT (id) DO UPDATE SET
      email_confirmed_at = COALESCE(auth.users.email_confirmed_at, NOW()),
      updated_at = NOW();

    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user.id,
      v_user.id::text,
      jsonb_build_object('sub', v_user.id::text, 'email', v_user.email, 'email_verified', true, 'phone_verified', false),
      'email',
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (provider_id, provider) DO NOTHING;
  END LOOP;
END $$;

-- ============================================================================
-- Step 2: organization INSERT SKIPPED per nwrp135 Option A.
--
-- The canonical Verification Harness Fixture Org already exists from migration
-- 00092 + 00093 (UUID 00000000-0000-0000-0000-fb1ce0a55e55, slug
-- fixture-harness-org). All subsequent inserts reference this existing org_id.
-- ============================================================================

-- ============================================================================
-- Step 3: 9 NEW synthetic profiles (supporting users).
--
-- SKIPS the harness-fixture profile — already exists with UUID
-- 5eb26edc-... from migration 00092/00093.
--
-- profiles.role CHECK constraint: ('admin', 'pm', 'accounting'); 'owner'
-- maps to admin at profiles level — org-level ownership lives in org_members.
-- ============================================================================
INSERT INTO public.profiles (id, full_name, email, role, org_id) VALUES
  ('00000000-0000-0000-0002-000000000001', 'Smoke Owner',      'smoke-owner@nightwork.local',      'admin',      '00000000-0000-0000-0000-fb1ce0a55e55'),
  ('00000000-0000-0000-0002-000000000002', 'Smoke PM Alpha',   'smoke-pm-alpha@nightwork.local',   'pm',         '00000000-0000-0000-0000-fb1ce0a55e55'),
  ('00000000-0000-0000-0002-000000000003', 'Smoke PM Beta',    'smoke-pm-beta@nightwork.local',    'pm',         '00000000-0000-0000-0000-fb1ce0a55e55'),
  ('00000000-0000-0000-0002-000000000004', 'Smoke PM Gamma',   'smoke-pm-gamma@nightwork.local',   'pm',         '00000000-0000-0000-0000-fb1ce0a55e55'),
  ('00000000-0000-0000-0002-000000000005', 'Smoke PM Delta',   'smoke-pm-delta@nightwork.local',   'pm',         '00000000-0000-0000-0000-fb1ce0a55e55'),
  ('00000000-0000-0000-0002-000000000006', 'Smoke PM Epsilon', 'smoke-pm-epsilon@nightwork.local', 'pm',         '00000000-0000-0000-0000-fb1ce0a55e55'),
  ('00000000-0000-0000-0002-000000000007', 'Smoke PM Zeta',    'smoke-pm-zeta@nightwork.local',    'pm',         '00000000-0000-0000-0000-fb1ce0a55e55'),
  ('00000000-0000-0000-0002-000000000008', 'Smoke PM Eta',     'smoke-pm-eta@nightwork.local',     'pm',         '00000000-0000-0000-0000-fb1ce0a55e55'),
  ('00000000-0000-0000-0002-000000000009', 'Smoke Accounting', 'smoke-accounting@nightwork.local', 'accounting', '00000000-0000-0000-0000-fb1ce0a55e55')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Step 4: 10 org_members in existing fixture-harness-org.
--
-- Row 1 references the EXISTING harness-fixture user (UUID 5eb26edc-...).
-- Rows 2-10 reference the 9 new supporting users.
--
-- The existing org_members row for harness-fixture (from migration 00093) is
-- preserved via ON CONFLICT (org_id, user_id) DO NOTHING — its role may
-- already be set; we don't override.
--
-- org_members.role CHECK constraint: ('owner','admin','pm','accounting').
-- ============================================================================
INSERT INTO public.org_members (org_id, user_id, role, is_active, accepted_at) VALUES
  ('00000000-0000-0000-0000-fb1ce0a55e55', '5eb26edc-5989-477f-ac42-d1e9264db0e2', 'admin',      true, NOW()),
  ('00000000-0000-0000-0000-fb1ce0a55e55', '00000000-0000-0000-0002-000000000001', 'owner',      true, NOW()),
  ('00000000-0000-0000-0000-fb1ce0a55e55', '00000000-0000-0000-0002-000000000002', 'pm',         true, NOW()),
  ('00000000-0000-0000-0000-fb1ce0a55e55', '00000000-0000-0000-0002-000000000003', 'pm',         true, NOW()),
  ('00000000-0000-0000-0000-fb1ce0a55e55', '00000000-0000-0000-0002-000000000004', 'pm',         true, NOW()),
  ('00000000-0000-0000-0000-fb1ce0a55e55', '00000000-0000-0000-0002-000000000005', 'pm',         true, NOW()),
  ('00000000-0000-0000-0000-fb1ce0a55e55', '00000000-0000-0000-0002-000000000006', 'pm',         true, NOW()),
  ('00000000-0000-0000-0000-fb1ce0a55e55', '00000000-0000-0000-0002-000000000007', 'pm',         true, NOW()),
  ('00000000-0000-0000-0000-fb1ce0a55e55', '00000000-0000-0000-0002-000000000008', 'pm',         true, NOW()),
  ('00000000-0000-0000-0000-fb1ce0a55e55', '00000000-0000-0000-0002-000000000009', 'accounting', true, NOW())
ON CONFLICT (org_id, user_id) DO NOTHING;

-- ============================================================================
-- Step 5: 10 synthetic jobs in existing fixture-harness-org.
-- pm_id references the new supporting PM users (UUIDs 0002-000000000002..0008).
-- ============================================================================
INSERT INTO public.jobs (
  id, org_id, name, address, status, pm_id, client_name,
  original_contract_amount, current_contract_amount,
  deposit_percentage, gc_fee_percentage
) VALUES
  ('22222222-2222-2222-2222-200000000001', '00000000-0000-0000-0000-fb1ce0a55e55', 'Smoke Job Alpha',   '101 Test Lane', 'active',   '00000000-0000-0000-0002-000000000002', 'Smoke Client A', 250000000, 250000000, 0.10, 0.20),
  ('22222222-2222-2222-2222-200000000002', '00000000-0000-0000-0000-fb1ce0a55e55', 'Smoke Job Beta',    '202 Test Lane', 'active',   '00000000-0000-0000-0002-000000000003', 'Smoke Client B', 350000000, 350000000, 0.10, 0.20),
  ('22222222-2222-2222-2222-200000000003', '00000000-0000-0000-0000-fb1ce0a55e55', 'Smoke Job Gamma',   '303 Test Lane', 'active',   '00000000-0000-0000-0002-000000000004', 'Smoke Client C', 450000000, 450000000, 0.10, 0.20),
  ('22222222-2222-2222-2222-200000000004', '00000000-0000-0000-0000-fb1ce0a55e55', 'Smoke Job Delta',   '404 Test Lane', 'complete', '00000000-0000-0000-0002-000000000005', 'Smoke Client D', 200000000, 200000000, 0.10, 0.20),
  ('22222222-2222-2222-2222-200000000005', '00000000-0000-0000-0000-fb1ce0a55e55', 'Smoke Job Epsilon', '505 Test Lane', 'active',   '00000000-0000-0000-0002-000000000006', 'Smoke Client E', 550000000, 550000000, 0.10, 0.20),
  ('22222222-2222-2222-2222-200000000006', '00000000-0000-0000-0000-fb1ce0a55e55', 'Smoke Job Zeta',    '606 Test Lane', 'active',   '00000000-0000-0000-0002-000000000007', 'Smoke Client F', 650000000, 650000000, 0.10, 0.20),
  ('22222222-2222-2222-2222-200000000007', '00000000-0000-0000-0000-fb1ce0a55e55', 'Smoke Job Eta',     '707 Test Lane', 'active',   '00000000-0000-0000-0002-000000000008', 'Smoke Client G', 750000000, 750000000, 0.10, 0.20),
  ('22222222-2222-2222-2222-200000000008', '00000000-0000-0000-0000-fb1ce0a55e55', 'Smoke Job Theta',   '808 Test Lane', 'active',   '00000000-0000-0000-0002-000000000002', 'Smoke Client H', 850000000, 850000000, 0.10, 0.20),
  ('22222222-2222-2222-2222-200000000009', '00000000-0000-0000-0000-fb1ce0a55e55', 'Smoke Job Iota',    '909 Test Lane', 'warranty', '00000000-0000-0000-0002-000000000003', 'Smoke Client I', 300000000, 300000000, 0.10, 0.20),
  ('22222222-2222-2222-2222-20000000000a', '00000000-0000-0000-0000-fb1ce0a55e55', 'Smoke Job Kappa',   '110 Test Lane', 'active',   '00000000-0000-0000-0002-000000000004', 'Smoke Client J', 400000000, 400000000, 0.10, 0.20)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Step 6: 5 synthetic invoices in existing fixture-harness-org.
-- invoices.invoice_type CHECK CONSTRAINT ('progress','time_and_materials','lump_sum').
-- ============================================================================
INSERT INTO public.invoices (
  id, org_id, job_id, vendor_name_raw, total_amount, invoice_type, status, received_date
) VALUES
  ('33333333-3333-3333-3333-300000000001', '00000000-0000-0000-0000-fb1ce0a55e55', '22222222-2222-2222-2222-200000000001', 'Smoke Vendor Alpha',   1500000, 'progress',           'ai_processed', CURRENT_DATE),
  ('33333333-3333-3333-3333-300000000002', '00000000-0000-0000-0000-fb1ce0a55e55', '22222222-2222-2222-2222-200000000002', 'Smoke Vendor Beta',    2500000, 'progress',           'pm_review',    CURRENT_DATE),
  ('33333333-3333-3333-3333-300000000003', '00000000-0000-0000-0000-fb1ce0a55e55', '22222222-2222-2222-2222-200000000003', 'Smoke Vendor Gamma',   3500000, 'time_and_materials', 'qa_review',    CURRENT_DATE),
  ('33333333-3333-3333-3333-300000000004', '00000000-0000-0000-0000-fb1ce0a55e55', '22222222-2222-2222-2222-200000000004', 'Smoke Vendor Delta',   4500000, 'lump_sum',           'in_draw',      CURRENT_DATE),
  ('33333333-3333-3333-3333-300000000005', '00000000-0000-0000-0000-fb1ce0a55e55', '22222222-2222-2222-2222-200000000005', 'Smoke Vendor Epsilon', 5500000, 'progress',           'paid',         CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Step 7: 10 synthetic activity_log rows in existing fixture-harness-org.
-- user_id references the new supporting PMs (UUIDs 0002-000000000002..0006).
-- activity_log schema per migration 00026: entity_type TEXT NOT NULL, entity_id UUID,
-- action TEXT NOT NULL, details JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW().
-- (No `occurred_at` column; uses created_at.)
-- ============================================================================
INSERT INTO public.activity_log (id, org_id, user_id, action, entity_type, entity_id) VALUES
  ('44444444-4444-4444-4444-400000000001', '00000000-0000-0000-0000-fb1ce0a55e55', '00000000-0000-0000-0002-000000000002', 'invoice_received',  'invoice', '33333333-3333-3333-3333-300000000001'),
  ('44444444-4444-4444-4444-400000000002', '00000000-0000-0000-0000-fb1ce0a55e55', '00000000-0000-0000-0002-000000000003', 'invoice_pm_review', 'invoice', '33333333-3333-3333-3333-300000000002'),
  ('44444444-4444-4444-4444-400000000003', '00000000-0000-0000-0000-fb1ce0a55e55', '00000000-0000-0000-0002-000000000004', 'invoice_qa_review', 'invoice', '33333333-3333-3333-3333-300000000003'),
  ('44444444-4444-4444-4444-400000000004', '00000000-0000-0000-0000-fb1ce0a55e55', '00000000-0000-0000-0002-000000000005', 'invoice_in_draw',   'invoice', '33333333-3333-3333-3333-300000000004'),
  ('44444444-4444-4444-4444-400000000005', '00000000-0000-0000-0000-fb1ce0a55e55', '00000000-0000-0000-0002-000000000006', 'invoice_paid',      'invoice', '33333333-3333-3333-3333-300000000005'),
  ('44444444-4444-4444-4444-400000000006', '00000000-0000-0000-0000-fb1ce0a55e55', '00000000-0000-0000-0002-000000000002', 'job_created',       'job',     '22222222-2222-2222-2222-200000000001'),
  ('44444444-4444-4444-4444-400000000007', '00000000-0000-0000-0000-fb1ce0a55e55', '00000000-0000-0000-0002-000000000003', 'job_created',       'job',     '22222222-2222-2222-2222-200000000002'),
  ('44444444-4444-4444-4444-400000000008', '00000000-0000-0000-0000-fb1ce0a55e55', '00000000-0000-0000-0002-000000000004', 'job_created',       'job',     '22222222-2222-2222-2222-200000000003'),
  ('44444444-4444-4444-4444-400000000009', '00000000-0000-0000-0000-fb1ce0a55e55', '00000000-0000-0000-0002-000000000005', 'job_status_change', 'job',     '22222222-2222-2222-2222-200000000004'),
  ('44444444-4444-4444-4444-40000000000a', '00000000-0000-0000-0000-fb1ce0a55e55', '00000000-0000-0000-0002-000000000002', 'job_created',       'job',     '22222222-2222-2222-2222-200000000008')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ============================================================================
-- Verification queries (run separately; not part of the seed transaction).
--
-- Expected counts post-apply (per nwrp135 Option A merge into existing org):
--   New auth.users (smoke-* only):                           9
--   profiles in org fb1ce0a55e55 (existing 1 + new 9):      10
--   org_members in org fb1ce0a55e55 (existing 1 + new 9):   10
--   jobs in org fb1ce0a55e55:                                10
--   invoices in org fb1ce0a55e55:                             5
--   activity_log in org fb1ce0a55e55:                        10
--   FK census (unchanged from D-1):  auth.users=56 / profiles=3
-- ============================================================================
--
-- SELECT 'new-auth.users'  AS t, COUNT(*) AS n FROM auth.users WHERE email LIKE 'smoke-%@nightwork.local'
-- UNION ALL SELECT 'profiles-in-org',  COUNT(*) FROM public.profiles    WHERE org_id = '00000000-0000-0000-0000-fb1ce0a55e55'
-- UNION ALL SELECT 'org_members',      COUNT(*) FROM public.org_members WHERE org_id = '00000000-0000-0000-0000-fb1ce0a55e55'
-- UNION ALL SELECT 'jobs',             COUNT(*) FROM public.jobs        WHERE org_id = '00000000-0000-0000-0000-fb1ce0a55e55'
-- UNION ALL SELECT 'invoices',         COUNT(*) FROM public.invoices    WHERE org_id = '00000000-0000-0000-0000-fb1ce0a55e55'
-- UNION ALL SELECT 'activity_log',     COUNT(*) FROM public.activity_log WHERE org_id = '00000000-0000-0000-0000-fb1ce0a55e55';
