-- scripts/fixtures/smoke-seed.sql
--
-- Synthetic seed for verification harness smoke scripts. Non-Drummond UUIDs
-- to avoid embedding real client data in repo-checked-in scripts (per
-- nwrp122 decision 6 + ITER-2-PATCHES §4.4 + Plan D-4 Task 5).
--
-- Run order: AFTER schema migrations are applied. Idempotent via ON CONFLICT.
--
-- Used by:
--   - scripts/wave-d-smoke.ts (Wave-D)
--   - Future scripts/smoke-* harnesses (Wave 1.1-Full Layer 4 framework)
--
-- UUID convention (per iter-2 §4.4.1):
--   Organizations: 11111111-1111-1111-1111-111111111111
--   Users:         00000000-0000-0000-XXXX-XXXXXXXXXXXX  (X = sequential)
--   Jobs:          22222222-2222-2222-2222-XXXXXXXXXXXX
--   Invoices:      33333333-3333-3333-3333-XXXXXXXXXXXX
--   Activity log:  44444444-4444-4444-4444-XXXXXXXXXXXX
--
-- DO NOT hardcode Drummond/SmartShield/real-vendor UUIDs in this file. Per
-- CLAUDE.md → Domain rules → Drummond-vs-synthetic-fixtures exception
-- (Wave-D D-4 deliverable; iter-2 §4.4.4).
--
-- Schema alignment notes (executor at execute-time per Plan D-4):
--   - The plan skeleton in PLAN D-4 §Task5 cited table `orgs`; the actual
--     schema (migration 00016_multi_tenant_foundation.sql) names this table
--     `organizations`. Seed targets the canonical table name.
--   - `profiles.id` is FK to `auth.users(id)` (migration 00007). Synthetic
--     profiles rows require corresponding auth.users entries first; this
--     seed includes that step using the migration-00008 pattern.
--   - `activity_log` schema (migration 00026) uses `created_at` (not
--     `occurred_at`) and `details JSONB` (not `action_metadata`). Aligned.
--   - `invoices.assigned_pm_id` does not exist as a column in current schema
--     (migration 00004 introduces PM assignment via different surface); the
--     seed omits this column to keep idempotency.
--
-- Application:
--   psql -f scripts/fixtures/smoke-seed.sql  (local Supabase)
--   OR Supabase MCP execute_sql with file content (preview environment)

BEGIN;

-- ============================================================================
-- Step 1: Synthetic auth.users (bootstrap for profiles FK)
-- Mirrors migration 00008 pattern. ON CONFLICT updates email-confirmed.
-- ============================================================================
DO $$
DECLARE
  v_password TEXT := 'SmokeSeed2026!';  -- synthetic; never used at runtime
  v_user RECORD;
BEGIN
  FOR v_user IN
    SELECT * FROM (VALUES
      ('00000000-0000-0000-0001-000000000001'::uuid, 'smoke-owner@nightwork.local',      'Smoke Owner',           'admin'),
      ('00000000-0000-0000-0001-000000000002'::uuid, 'harness-fixture@nightwork.local',  'Harness Fixture Admin', 'admin'),
      ('00000000-0000-0000-0001-000000000003'::uuid, 'smoke-pm-alpha@nightwork.local',   'Smoke PM Alpha',        'pm'),
      ('00000000-0000-0000-0001-000000000004'::uuid, 'smoke-pm-beta@nightwork.local',    'Smoke PM Beta',         'pm'),
      ('00000000-0000-0000-0001-000000000005'::uuid, 'smoke-pm-gamma@nightwork.local',   'Smoke PM Gamma',        'pm'),
      ('00000000-0000-0000-0001-000000000006'::uuid, 'smoke-pm-delta@nightwork.local',   'Smoke PM Delta',        'pm'),
      ('00000000-0000-0000-0001-000000000007'::uuid, 'smoke-pm-epsilon@nightwork.local', 'Smoke PM Epsilon',      'pm'),
      ('00000000-0000-0000-0001-000000000008'::uuid, 'smoke-pm-zeta@nightwork.local',    'Smoke PM Zeta',         'pm'),
      ('00000000-0000-0000-0001-000000000009'::uuid, 'smoke-pm-eta@nightwork.local',     'Smoke PM Eta',          'pm'),
      ('00000000-0000-0000-0001-00000000000a'::uuid, 'smoke-accounting@nightwork.local', 'Smoke Accounting',      'accounting')
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
-- Step 2: Synthetic organization (table is `organizations` per migration 00016)
-- ============================================================================
INSERT INTO public.organizations (
  id, name, slug,
  default_gc_fee_percentage, default_deposit_percentage,
  payment_schedule_type,
  subscription_plan, subscription_status
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Harness Fixture Org',
  'harness-fixture',
  0.20,
  0.10,
  '5_20',
  'enterprise',
  'active'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Step 3: Synthetic profiles
-- profiles.role CHECK constraint: ('admin', 'pm', 'accounting'); 'owner'
-- maps to admin at profiles level — org-level ownership lives in org_members.
-- ============================================================================
INSERT INTO public.profiles (id, full_name, email, role, org_id) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Smoke Owner',           'smoke-owner@nightwork.local',      'admin',      '11111111-1111-1111-1111-111111111111'),
  ('00000000-0000-0000-0001-000000000002', 'Harness Fixture Admin', 'harness-fixture@nightwork.local',  'admin',      '11111111-1111-1111-1111-111111111111'),
  ('00000000-0000-0000-0001-000000000003', 'Smoke PM Alpha',        'smoke-pm-alpha@nightwork.local',   'pm',         '11111111-1111-1111-1111-111111111111'),
  ('00000000-0000-0000-0001-000000000004', 'Smoke PM Beta',         'smoke-pm-beta@nightwork.local',    'pm',         '11111111-1111-1111-1111-111111111111'),
  ('00000000-0000-0000-0001-000000000005', 'Smoke PM Gamma',        'smoke-pm-gamma@nightwork.local',   'pm',         '11111111-1111-1111-1111-111111111111'),
  ('00000000-0000-0000-0001-000000000006', 'Smoke PM Delta',        'smoke-pm-delta@nightwork.local',   'pm',         '11111111-1111-1111-1111-111111111111'),
  ('00000000-0000-0000-0001-000000000007', 'Smoke PM Epsilon',      'smoke-pm-epsilon@nightwork.local', 'pm',         '11111111-1111-1111-1111-111111111111'),
  ('00000000-0000-0000-0001-000000000008', 'Smoke PM Zeta',         'smoke-pm-zeta@nightwork.local',    'pm',         '11111111-1111-1111-1111-111111111111'),
  ('00000000-0000-0000-0001-000000000009', 'Smoke PM Eta',          'smoke-pm-eta@nightwork.local',     'pm',         '11111111-1111-1111-1111-111111111111'),
  ('00000000-0000-0000-0001-00000000000a', 'Smoke Accounting',      'smoke-accounting@nightwork.local', 'accounting', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Step 4: Synthetic org_members
-- org_members.role CHECK constraint: ('owner','admin','pm','accounting').
-- ============================================================================
INSERT INTO public.org_members (org_id, user_id, role, is_active, accepted_at) VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000001', 'owner',      true, NOW()),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000002', 'admin',      true, NOW()),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000003', 'pm',         true, NOW()),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000004', 'pm',         true, NOW()),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000005', 'pm',         true, NOW()),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000006', 'pm',         true, NOW()),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000007', 'pm',         true, NOW()),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000008', 'pm',         true, NOW()),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000009', 'pm',         true, NOW()),
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-00000000000a', 'accounting', true, NOW())
ON CONFLICT (org_id, user_id) DO NOTHING;

-- ============================================================================
-- Step 5: Synthetic jobs (10 — diverse status + PM assignment)
-- ============================================================================
INSERT INTO public.jobs (
  id, org_id, name, address, status, pm_id, client_name,
  original_contract_amount, current_contract_amount,
  deposit_percentage, gc_fee_percentage
) VALUES
  ('22222222-2222-2222-2222-200000000001', '11111111-1111-1111-1111-111111111111', 'Smoke Job Alpha',   '101 Test Lane', 'active',   '00000000-0000-0000-0001-000000000003', 'Smoke Client A', 250000000, 250000000, 0.10, 0.20),
  ('22222222-2222-2222-2222-200000000002', '11111111-1111-1111-1111-111111111111', 'Smoke Job Beta',    '202 Test Lane', 'active',   '00000000-0000-0000-0001-000000000004', 'Smoke Client B', 350000000, 350000000, 0.10, 0.20),
  ('22222222-2222-2222-2222-200000000003', '11111111-1111-1111-1111-111111111111', 'Smoke Job Gamma',   '303 Test Lane', 'active',   '00000000-0000-0000-0001-000000000005', 'Smoke Client C', 450000000, 450000000, 0.10, 0.20),
  ('22222222-2222-2222-2222-200000000004', '11111111-1111-1111-1111-111111111111', 'Smoke Job Delta',   '404 Test Lane', 'complete', '00000000-0000-0000-0001-000000000006', 'Smoke Client D', 200000000, 200000000, 0.10, 0.20),
  ('22222222-2222-2222-2222-200000000005', '11111111-1111-1111-1111-111111111111', 'Smoke Job Epsilon', '505 Test Lane', 'active',   '00000000-0000-0000-0001-000000000007', 'Smoke Client E', 550000000, 550000000, 0.10, 0.20),
  ('22222222-2222-2222-2222-200000000006', '11111111-1111-1111-1111-111111111111', 'Smoke Job Zeta',    '606 Test Lane', 'active',   '00000000-0000-0000-0001-000000000008', 'Smoke Client F', 650000000, 650000000, 0.10, 0.20),
  ('22222222-2222-2222-2222-200000000007', '11111111-1111-1111-1111-111111111111', 'Smoke Job Eta',     '707 Test Lane', 'active',   '00000000-0000-0000-0001-000000000009', 'Smoke Client G', 750000000, 750000000, 0.10, 0.20),
  ('22222222-2222-2222-2222-200000000008', '11111111-1111-1111-1111-111111111111', 'Smoke Job Theta',   '808 Test Lane', 'active',   '00000000-0000-0000-0001-000000000003', 'Smoke Client H', 850000000, 850000000, 0.10, 0.20),
  ('22222222-2222-2222-2222-200000000009', '11111111-1111-1111-1111-111111111111', 'Smoke Job Iota',    '909 Test Lane', 'warranty', '00000000-0000-0000-0001-000000000004', 'Smoke Client I', 300000000, 300000000, 0.10, 0.20),
  ('22222222-2222-2222-2222-20000000000a', '11111111-1111-1111-1111-111111111111', 'Smoke Job Kappa',   '110 Test Lane', 'active',   '00000000-0000-0000-0001-000000000005', 'Smoke Client J', 400000000, 400000000, 0.10, 0.20)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Step 6: Synthetic invoices (5 — diverse statuses)
-- Note: invoices.invoice_type CHECK CONSTRAINT ('progress','time_and_materials','lump_sum').
-- ============================================================================
INSERT INTO public.invoices (
  id, org_id, job_id, vendor_name_raw, total_amount, invoice_type, status, received_date
) VALUES
  ('33333333-3333-3333-3333-300000000001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-200000000001', 'Smoke Vendor Alpha',   1500000, 'progress',           'ai_processed', CURRENT_DATE),
  ('33333333-3333-3333-3333-300000000002', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-200000000002', 'Smoke Vendor Beta',    2500000, 'progress',           'pm_review',    CURRENT_DATE),
  ('33333333-3333-3333-3333-300000000003', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-200000000003', 'Smoke Vendor Gamma',   3500000, 'time_and_materials', 'qa_review',    CURRENT_DATE),
  ('33333333-3333-3333-3333-300000000004', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-200000000004', 'Smoke Vendor Delta',   4500000, 'lump_sum',           'in_draw',      CURRENT_DATE),
  ('33333333-3333-3333-3333-300000000005', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-200000000005', 'Smoke Vendor Epsilon', 5500000, 'progress',           'paid',         CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Step 7: Synthetic activity_log rows (10 — exercises display-name vs UUID rendering)
-- activity_log schema per migration 00026: entity_type TEXT NOT NULL, entity_id UUID,
-- action TEXT NOT NULL, details JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW().
-- (No `occurred_at` column; uses created_at.)
-- ============================================================================
INSERT INTO public.activity_log (id, org_id, user_id, action, entity_type, entity_id) VALUES
  ('44444444-4444-4444-4444-400000000001', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000003', 'invoice_received',  'invoice', '33333333-3333-3333-3333-300000000001'),
  ('44444444-4444-4444-4444-400000000002', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000004', 'invoice_pm_review', 'invoice', '33333333-3333-3333-3333-300000000002'),
  ('44444444-4444-4444-4444-400000000003', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000005', 'invoice_qa_review', 'invoice', '33333333-3333-3333-3333-300000000003'),
  ('44444444-4444-4444-4444-400000000004', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000006', 'invoice_in_draw',   'invoice', '33333333-3333-3333-3333-300000000004'),
  ('44444444-4444-4444-4444-400000000005', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000007', 'invoice_paid',      'invoice', '33333333-3333-3333-3333-300000000005'),
  ('44444444-4444-4444-4444-400000000006', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000003', 'job_created',       'job',     '22222222-2222-2222-2222-200000000001'),
  ('44444444-4444-4444-4444-400000000007', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000004', 'job_created',       'job',     '22222222-2222-2222-2222-200000000002'),
  ('44444444-4444-4444-4444-400000000008', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000005', 'job_created',       'job',     '22222222-2222-2222-2222-200000000003'),
  ('44444444-4444-4444-4444-400000000009', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000006', 'job_status_change', 'job',     '22222222-2222-2222-2222-200000000004'),
  ('44444444-4444-4444-4444-40000000000a', '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0001-000000000003', 'job_created',       'job',     '22222222-2222-2222-2222-200000000008')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ============================================================================
-- Verification queries (run separately; not part of the seed transaction).
--
-- Expected counts (per iter-2 §4.4.1):
--   organizations:  1
--   profiles:      10
--   org_members:   10
--   jobs:          10
--   invoices:       5
--   activity_log:  10
-- ============================================================================
--
-- SELECT 'organizations' AS t, COUNT(*) AS n FROM public.organizations WHERE id = '11111111-1111-1111-1111-111111111111'
-- UNION ALL
-- SELECT 'profiles',         COUNT(*) FROM public.profiles WHERE id::text LIKE '00000000-0000-0000-0001-%'
-- UNION ALL
-- SELECT 'org_members',      COUNT(*) FROM public.org_members WHERE org_id = '11111111-1111-1111-1111-111111111111'
-- UNION ALL
-- SELECT 'jobs',             COUNT(*) FROM public.jobs WHERE org_id = '11111111-1111-1111-1111-111111111111'
-- UNION ALL
-- SELECT 'invoices',         COUNT(*) FROM public.invoices WHERE org_id = '11111111-1111-1111-1111-111111111111'
-- UNION ALL
-- SELECT 'activity_log',     COUNT(*) FROM public.activity_log WHERE org_id = '11111111-1111-1111-1111-111111111111';
