-- 00110_draw_void_release_all_linked_invoices.sql
--
-- F2E-3 fix (per nwrp281 §C1): draw_void_rpc released ONLY invoices in
-- status='in_draw', but invoices link to a draw at CREATE time while still
-- carrying earlier statuses (e.g. qa_review) — those slipped the filter and
-- stayed pointed at the void draw, making them un-selectable for future
-- draws (PART-2E F2E-3; proven live in the 2E lifecycle run on Smoke Job
-- Gamma). Amended: the unlink CTE releases EVERY non-deleted invoice on the
-- draw; the status flip to 'qa_approved' applies ONLY where status was
-- 'in_draw' (others keep their workflow status — just unlinked); a
-- status_history entry is appended for every released invoice either way
-- (Q12 audit: the unlink itself is the event). Everything else in the
-- function is byte-identical to the prior definition (paid-invoice guard,
-- optimistic lock, lien pending→not_required, return shape).

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

  -- F2E-3 (00110): release EVERY invoice linked to this draw, not just the
  -- in_draw ones. SET expressions read the OLD row, so the CASE arms and
  -- the audit entry's old/new statuses are computed from pre-update state.
  WITH unlinked AS (
    UPDATE invoices
       SET status = CASE WHEN status = 'in_draw' THEN 'qa_approved' ELSE status END,
           draw_id = NULL,
           status_history = COALESCE(status_history, '[]'::jsonb) || jsonb_build_array(
             jsonb_build_object(
               'who', COALESCE(_actor_user_id::text, 'system'),
               'when', _now,
               'old_status', status,
               'new_status', CASE WHEN status = 'in_draw' THEN 'qa_approved' ELSE status END,
               'note', format('Draw #%s voided — invoice released from draw', _draw.draw_number)
             )
           ),
           updated_at = _now
     WHERE draw_id = _draw_id
       AND deleted_at IS NULL
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
