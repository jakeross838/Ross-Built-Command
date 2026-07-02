-- 00113_one_screen_signup.sql
--
-- Replace the 5-step /onboard wizard with a single signup screen.
-- (1) Add two segmenting columns collected at signup (nothing keys off them
--     yet — persist only).
-- (2) Extend create_signup to persist the company address/phone/type/revenue
--     AND set onboarding_complete = TRUE (the one-screen signup IS the
--     onboarding; the wizard is retired). Everything else (cost codes, first
--     job, financial defaults, team) moves to guided in-app setup.
--
-- create_signup is a SECURITY DEFINER RPC called pre-auth from the signup
-- server action, so anon needs EXECUTE. We DROP the 4-arg version and CREATE
-- an 8-arg version (the 4 new params default NULL) to avoid an overload-
-- ambiguity when called with 4 named args.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS company_type text,
  ADD COLUMN IF NOT EXISTS revenue_band text;

COMMENT ON COLUMN public.organizations.company_type IS
  'Segmenting (collected at signup): Custom Homes / Remodeler / Production Builder / General Contractor. Nothing keys off it yet — persist only.';
COMMENT ON COLUMN public.organizations.revenue_band IS
  'Segmenting band (optional at signup): <$5M / $5-20M / $20M+. Nothing keys off it yet — persist only.';

DROP FUNCTION IF EXISTS public.create_signup(text, text, text, text);

CREATE FUNCTION public.create_signup(
  p_email           text,
  p_password        text,
  p_full_name       text,
  p_company_name    text,
  p_company_address text DEFAULT NULL,
  p_company_phone   text DEFAULT NULL,
  p_company_type    text DEFAULT NULL,
  p_revenue_band    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'
AS $function$
DECLARE
  v_email   TEXT := LOWER(p_email);
  v_user_id UUID := gen_random_uuid();
  v_org_id  UUID;
  v_slug    TEXT;
  v_suffix  INT := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = v_email) THEN
    RAISE EXCEPTION 'An account with that email already exists.'
      USING ERRCODE = 'unique_violation';
  END IF;

  v_slug := regexp_replace(lower(p_company_name), '[^a-z0-9]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '^-+|-+$', '', 'g');
  IF v_slug = '' THEN v_slug := 'org'; END IF;
  v_slug := substr(v_slug, 1, 40);
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := substr(regexp_replace(lower(p_company_name), '[^a-z0-9]+', '-', 'g'), 1, 35) || '-' || v_suffix::text;
  END LOOP;

  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    raw_user_meta_data, raw_app_meta_data,
    is_sso_user, is_anonymous,
    created_at, updated_at
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    NOW(),
    '', '', '', '',
    jsonb_build_object('full_name', p_full_name, 'email', v_email, 'email_verified', true),
    jsonb_build_object('provider', 'email', 'providers', array['email']),
    false, false,
    NOW(), NOW()
  );

  INSERT INTO auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_user_id::text,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
    'email',
    NOW(), NOW(), NOW()
  );

  INSERT INTO public.organizations (
    name, slug, onboarding_complete,
    subscription_plan, subscription_status, trial_ends_at,
    company_address, company_phone, company_type, revenue_band
  )
  VALUES (
    p_company_name, v_slug, TRUE,   -- one-screen signup completes onboarding
    'free_trial', 'trialing', NOW() + INTERVAL '14 days',
    p_company_address, p_company_phone, p_company_type, p_revenue_band
  )
  RETURNING id INTO v_org_id;

  INSERT INTO public.profiles (id, full_name, email, role, org_id)
  VALUES (v_user_id, p_full_name, v_email, 'owner', v_org_id);

  INSERT INTO public.org_members (org_id, user_id, role, accepted_at, is_active)
  VALUES (v_org_id, v_user_id, 'owner', NOW(), TRUE);

  RETURN jsonb_build_object('user_id', v_user_id, 'org_id', v_org_id);
END;
$function$;

-- Pre-auth signup entry point: anon must execute. authenticated included for
-- parity with the prior grant posture.
GRANT EXECUTE ON FUNCTION public.create_signup(text,text,text,text,text,text,text,text) TO anon, authenticated;
