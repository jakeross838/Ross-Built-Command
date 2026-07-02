-- Down for 00113_one_screen_signup.sql
--
-- Restore the pre-one-screen-signup posture: the 4-arg create_signup that set
-- onboarding_complete = FALSE (so the retired /onboard wizard would run), and
-- drop the two segmenting columns. Reverting the CODE (signup form/action +
-- routing + the retired wizard) is a separate git revert — this only undoes the
-- schema/RPC half.

DROP FUNCTION IF EXISTS public.create_signup(text, text, text, text, text, text, text, text);

CREATE FUNCTION public.create_signup(
  p_email        text,
  p_password     text,
  p_full_name    text,
  p_company_name text
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
    subscription_plan, subscription_status, trial_ends_at
  )
  VALUES (
    p_company_name, v_slug, FALSE,
    'free_trial', 'trialing', NOW() + INTERVAL '14 days'
  )
  RETURNING id INTO v_org_id;

  INSERT INTO public.profiles (id, full_name, email, role, org_id)
  VALUES (v_user_id, p_full_name, v_email, 'owner', v_org_id);

  INSERT INTO public.org_members (org_id, user_id, role, accepted_at, is_active)
  VALUES (v_org_id, v_user_id, 'owner', NOW(), TRUE);

  RETURN jsonb_build_object('user_id', v_user_id, 'org_id', v_org_id);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_signup(text,text,text,text) TO anon, authenticated;

ALTER TABLE public.organizations
  DROP COLUMN IF EXISTS company_type,
  DROP COLUMN IF EXISTS revenue_band;
