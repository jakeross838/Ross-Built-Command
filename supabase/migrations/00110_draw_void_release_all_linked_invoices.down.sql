-- Down for 00110 — restore the pre-F2E-3 release block (in_draw-only filter).

CREATE OR REPLACE FUNCTION public.draw_void_rpc(_draw_id uuid, _actor_user_id uuid, _reason text DEFAULT NULL::text, _expected_updated_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _force_fail text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  _draw record;
  _paid_count int;
  _invoice_ids uuid[];
  _release_count int := 0;
  _now timestamptz := now();
  _status_entry jsonb;
BEGIN
  SELECT id, org_id, job_id, status, status_history, draw_number, updated_at
    INTO _draw
    FROM draws
   WHERE id = _draw_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'draw not found: %', _draw_id USING ERRCODE = 'P0002';
  END IF;

  IF _draw.status NOT IN ('draft', 'pm_review', 'submitted', 'approved', 'locked') THEN
    RAISE EXCEPTION 'cannot void a % draw', _draw.status USING ERRCODE = 'P0001';
  END IF;

  IF _expected_updated_at IS NOT NULL
     AND _draw.updated_at IS DISTINCT FROM _expected_updated_at THEN
    RAISE EXCEPTION 'optimistic_lock_conflict' USING ERRCODE = '40001';
  END IF;

  SELECT count(*)::int INTO _paid_count
    FROM invoices
   WHERE draw_id = _draw_id
     AND payment_status = 'paid'
     AND deleted_at IS NULL;
  IF _paid_count > 0 THEN
    RAISE EXCEPTION 'paid_invoices_in_draw:%', _paid_count USING ERRCODE = 'P0001';
  END IF;

  IF _force_fail = 'void' THEN
    RAISE EXCEPTION 'injected failure: void' USING ERRCODE = 'P0001';
  END IF;

  _status_entry := jsonb_build_object(
    'who', COALESCE(_actor_user_id::text, 'system'),
    'when', _now,
    'old_status', _draw.status,
    'new_status', 'void',
    'note', COALESCE(_reason, 'Draw voided')
  );

  UPDATE draws
     SET status = 'void',
         status_history = COALESCE(status_history, '[]'::jsonb) || jsonb_build_array(_status_entry),
         updated_at = _now
   WHERE id = _draw_id;

  WITH unlinked AS (
    UPDATE invoices
       SET status = 'qa_approved',
           draw_id = NULL,
           status_history = COALESCE(status_history, '[]'::jsonb) || jsonb_build_array(
             jsonb_build_object(
               'who', COALESCE(_actor_user_id::text, 'system'),
               'when', _now,
               'old_status', 'in_draw',
               'new_status', 'qa_approved',
               'note', format('Draw #%s voided', _draw.draw_number)
             )
           ),
           updated_at = _now
     WHERE draw_id = _draw_id
       AND deleted_at IS NULL
       AND status = 'in_draw'
    RETURNING id
  )
  SELECT array_agg(id) INTO _invoice_ids FROM unlinked;

  WITH released AS (
    UPDATE lien_releases
       SET status = 'not_required',
           updated_at = _now
     WHERE draw_id = _draw_id
       AND status = 'pending'
       AND deleted_at IS NULL
    RETURNING id
  )
  SELECT count(*)::int INTO _release_count FROM released;

  RETURN jsonb_build_object(
    'status', 'void',
    'draw_number', _draw.draw_number,
    'job_id', _draw.job_id,
    'invoice_ids', COALESCE(to_jsonb(_invoice_ids), '[]'::jsonb),
    'releases_marked_not_required', _release_count
  );
END $function$;
