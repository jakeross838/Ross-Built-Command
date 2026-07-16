-- 00122 DOWN — reverse multi-job allocation schema + restore prior RPCs.
-- Order: RPCs back to prior definitions (submit ← 00061, void ← 00110,
-- approve ← 00117), then policies/triggers/functions, then junction table,
-- then the job_id column. Data note: dropping job_id/junction loses split
-- membership (acceptable: down implies the feature is being pulled).

-- ── Restore draw_submit_rpc (00061 definition) ──────────────────────────
CREATE OR REPLACE FUNCTION public.draw_submit_rpc(
  _draw_id uuid,
  _actor_user_id uuid,
  _reason text DEFAULT NULL,
  _expected_updated_at timestamptz DEFAULT NULL,
  _force_fail text DEFAULT NULL
) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
DECLARE
  _draw record;
  _invoice_ids uuid[];
  _new_release_count int := 0;
  _release_type text;
  _now timestamptz := now();
  _status_entry jsonb;
BEGIN
  SELECT id, org_id, job_id, status, status_history, draw_number,
         revision_number, period_end, is_final, current_payment_due,
         updated_at
    INTO _draw
    FROM draws
   WHERE id = _draw_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'draw not found: %', _draw_id USING ERRCODE = 'P0002';
  END IF;

  IF _draw.status NOT IN ('draft', 'pm_review') THEN
    RAISE EXCEPTION 'cannot submit a % draw (allowed: draft, pm_review)', _draw.status
      USING ERRCODE = 'P0001';
  END IF;

  IF _expected_updated_at IS NOT NULL
     AND _draw.updated_at IS DISTINCT FROM _expected_updated_at THEN
    RAISE EXCEPTION 'optimistic_lock_conflict' USING ERRCODE = '40001';
  END IF;

  IF _force_fail = 'pre_status' THEN
    RAISE EXCEPTION 'injected failure: pre_status' USING ERRCODE = 'P0001';
  END IF;

  _status_entry := jsonb_build_object(
    'who', COALESCE(_actor_user_id::text, 'system'),
    'when', _now,
    'old_status', _draw.status,
    'new_status', 'submitted',
    'note', COALESCE(_reason, 'Draw submitted')
  );

  UPDATE draws
     SET status = 'submitted',
         submitted_at = _now,
         wizard_draft = NULL,
         status_history = COALESCE(status_history, '[]'::jsonb) || jsonb_build_array(_status_entry),
         updated_at = _now
   WHERE id = _draw_id;

  WITH updated AS (
    UPDATE invoices
       SET status = 'in_draw',
           status_history = COALESCE(status_history, '[]'::jsonb) || jsonb_build_array(
             jsonb_build_object(
               'who', COALESCE(_actor_user_id::text, 'system'),
               'when', _now,
               'old_status', 'qa_approved',
               'new_status', 'in_draw',
               'note', format('Draw #%s submitted', _draw.draw_number)
             )
           ),
           updated_at = _now
     WHERE draw_id = _draw_id
       AND deleted_at IS NULL
       AND status = 'qa_approved'
    RETURNING id
  )
  SELECT array_agg(id) INTO _invoice_ids FROM updated;

  IF _force_fail IN ('lien_gen', 'FORCE_LIEN_GEN_FAIL') THEN
    RAISE EXCEPTION 'injected failure: lien_gen' USING ERRCODE = 'P0001';
  END IF;

  _release_type := CASE WHEN _draw.is_final THEN 'unconditional_final' ELSE 'conditional_progress' END;

  WITH vendor_sums AS (
    SELECT vendor_id, SUM(total_amount)::bigint AS amount
      FROM invoices
     WHERE draw_id = _draw_id
       AND deleted_at IS NULL
       AND vendor_id IS NOT NULL
     GROUP BY vendor_id
  ), inserted AS (
    INSERT INTO lien_releases (
      org_id, job_id, vendor_id, draw_id, release_type, amount, status,
      through_date, created_by
    )
    SELECT _draw.org_id, _draw.job_id, vs.vendor_id, _draw_id, _release_type,
           vs.amount, 'pending', _draw.period_end, _actor_user_id
      FROM vendor_sums vs
     WHERE NOT EXISTS (
       SELECT 1 FROM lien_releases lr
        WHERE lr.draw_id = _draw_id
          AND lr.vendor_id = vs.vendor_id
          AND lr.deleted_at IS NULL
     )
    RETURNING id
  )
  SELECT count(*)::int INTO _new_release_count FROM inserted;

  IF _new_release_count > 0 THEN
    INSERT INTO notifications (org_id, user_id, type, title, body, action_url)
    SELECT _draw.org_id, m.user_id, 'lien_release_pending',
           format('%s lien release(s) needed — Draw #%s', _new_release_count, _draw.draw_number),
           format('Draw #%s was submitted. %s vendor lien release(s) need to be collected.',
                  _draw.draw_number, _new_release_count),
           format('/draws/%s', _draw_id)
      FROM org_members m
     WHERE m.org_id = _draw.org_id
       AND m.role IN ('accounting', 'admin')
       AND m.is_active = TRUE;
  END IF;

  INSERT INTO notifications (org_id, user_id, type, title, body, action_url)
  SELECT _draw.org_id, m.user_id, 'draw_submitted',
         format('Draw #%s submitted', _draw.draw_number),
         format('Draw #%s submitted for approval.', _draw.draw_number),
         format('/draws/%s', _draw_id)
    FROM org_members m
   WHERE m.org_id = _draw.org_id
     AND m.role IN ('owner', 'admin')
     AND m.is_active = TRUE;

  RETURN jsonb_build_object(
    'status', 'submitted',
    'draw_number', _draw.draw_number,
    'job_id', _draw.job_id,
    'invoice_ids', COALESCE(to_jsonb(_invoice_ids), '[]'::jsonb),
    'new_lien_releases', _new_release_count,
    'current_payment_due', _draw.current_payment_due
  );
END $$;

-- ── Restore draw_void_rpc (00110 definition) ────────────────────────────
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

-- ── Restore draw_approve_rpc (00117 definition) ─────────────────────────
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

  SELECT COALESCE(ows.require_lien_release_for_draw, false)
    INTO _require_lien_doc
    FROM org_workflow_settings ows
   WHERE ows.org_id = _draw.org_id
   LIMIT 1;

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

-- ── Drop 00122 objects ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "pm write invoice_allocations on own jobs" ON public.invoice_allocations;
DROP TRIGGER IF EXISTS trg_split_fully_allocated ON public.invoice_allocations;
DROP FUNCTION IF EXISTS public.enforce_split_fully_allocated();
DROP TRIGGER IF EXISTS trg_sync_allocation_jobs ON public.invoices;
DROP FUNCTION IF EXISTS public.sync_allocation_jobs_on_header_change();
-- nightwork: drop-justified — down-migration removing the junction table
-- that 00122 itself created; split-portion membership is intentionally lost
-- when the feature is rolled back (invoices.draw_id remains authoritative).
DROP TABLE IF EXISTS public.invoice_draw_links;
DROP INDEX IF EXISTS public.idx_invoice_allocations_job_code;
DROP INDEX IF EXISTS public.idx_invoice_allocations_invoice_job;
ALTER TABLE public.invoice_allocations DROP COLUMN IF EXISTS job_id;
