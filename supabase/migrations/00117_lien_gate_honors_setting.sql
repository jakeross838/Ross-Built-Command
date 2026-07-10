-- 00117: Draw-approval lien gate honors require_lien_release_for_draw (audit #6 / Q6).
--
-- Bug: draw_approve_rpc raised 'pending_lien_releases' UNCONDITIONALLY whenever
-- a draw had any pending lien_releases, even when the org had
-- org_workflow_settings.require_lien_release_for_draw = false. So a draw could
-- never be approved while auto-created lien releases sat pending, regardless of
-- the setting.
--
-- Fix: resolve _require_lien_doc first, then run BOTH lien gates (pending
-- releases + missing documents) only inside `IF _require_lien_doc`. Everything
-- else in the function is reproduced verbatim from the current definition
-- (pg_get_functiondef). SECURITY DEFINER + explicit search_path preserved.

CREATE OR REPLACE FUNCTION public.draw_approve_rpc(
  _draw_id uuid,
  _actor_user_id uuid,
  _reason text DEFAULT NULL::text,
  _expected_updated_at timestamp with time zone DEFAULT NULL::timestamp with time zone,
  _force_fail text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _draw record;
  _pending_count int := 0;
  _missing_docs int := 0;
  _schedule text;
  _require_lien_doc boolean;
  _scheduled_count int := 0;
  _now timestamptz := now();
  _status_entry jsonb;
BEGIN
  SELECT id, org_id, job_id, status, status_history, draw_number,
         created_by, updated_at
    INTO _draw
    FROM draws
   WHERE id = _draw_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'draw not found: %', _draw_id USING ERRCODE = 'P0002';
  END IF;

  IF _draw.status NOT IN ('submitted', 'pm_review') THEN
    RAISE EXCEPTION 'cannot approve a % draw (allowed: submitted, pm_review)', _draw.status
      USING ERRCODE = 'P0001';
  END IF;

  IF _expected_updated_at IS NOT NULL
     AND _draw.updated_at IS DISTINCT FROM _expected_updated_at THEN
    RAISE EXCEPTION 'optimistic_lock_conflict' USING ERRCODE = '40001';
  END IF;

  -- Resolve whether this org gates draw approval on lien releases.
  SELECT COALESCE(ows.require_lien_release_for_draw, false)
    INTO _require_lien_doc
    FROM org_workflow_settings ows
   WHERE ows.org_id = _draw.org_id
   LIMIT 1;

  -- Lien-release gates (pending releases + missing documents) fire ONLY when the
  -- org requires lien releases for draws. Previously the pending-releases gate
  -- fired unconditionally (audit #6 / Q6).
  IF _require_lien_doc THEN
    SELECT count(*)::int INTO _pending_count
      FROM lien_releases
     WHERE draw_id = _draw_id
       AND status = 'pending'
       AND deleted_at IS NULL;
    IF _pending_count > 0 THEN
      RAISE EXCEPTION 'pending_lien_releases:%', _pending_count USING ERRCODE = 'P0001';
    END IF;

    SELECT count(*)::int INTO _missing_docs
      FROM lien_releases
     WHERE draw_id = _draw_id
       AND deleted_at IS NULL
       AND status NOT IN ('waived', 'not_required')
       AND (document_url IS NULL OR document_url = '');
    IF _missing_docs > 0 THEN
      RAISE EXCEPTION 'missing_lien_documents:%', _missing_docs USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF _force_fail IN ('approve', 'FORCE_APPROVE_FAIL') THEN
    RAISE EXCEPTION 'injected failure: approve' USING ERRCODE = 'P0001';
  END IF;

  _status_entry := jsonb_build_object(
    'who', COALESCE(_actor_user_id::text, 'system'),
    'when', _now,
    'old_status', _draw.status,
    'new_status', 'approved',
    'note', COALESCE(_reason, 'Draw approved')
  );

  UPDATE draws
     SET status = 'approved',
         approved_at = _now,
         status_history = COALESCE(status_history, '[]'::jsonb) || jsonb_build_array(_status_entry),
         updated_at = _now
   WHERE id = _draw_id;

  SELECT COALESCE(payment_schedule_type, '5_20') INTO _schedule
    FROM organizations WHERE id = _draw.org_id;

  WITH scheduled AS (
    UPDATE invoices
       SET scheduled_payment_date = public._compute_scheduled_payment_date(received_date, _schedule),
           payment_status = CASE WHEN payment_status = 'unpaid' THEN 'scheduled' ELSE payment_status END,
           updated_at = _now
     WHERE draw_id = _draw_id
       AND deleted_at IS NULL
       AND payment_status <> 'paid'
       AND scheduled_payment_date IS NULL
       AND public._compute_scheduled_payment_date(received_date, _schedule) IS NOT NULL
    RETURNING id
  )
  SELECT count(*)::int INTO _scheduled_count FROM scheduled;

  IF _draw.created_by IS NOT NULL THEN
    INSERT INTO notifications (org_id, user_id, type, title, body, action_url)
    VALUES (
      _draw.org_id, _draw.created_by, 'draw_approved',
      format('Draw #%s approved', _draw.draw_number),
      'Your draw submission has been approved.',
      format('/draws/%s', _draw_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'approved',
    'draw_number', _draw.draw_number,
    'job_id', _draw.job_id,
    'scheduled_payment_count', _scheduled_count
  );
END $function$;
