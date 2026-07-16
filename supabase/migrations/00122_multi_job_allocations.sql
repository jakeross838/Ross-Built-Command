-- 00122: Multi-job invoice split — per-allocation job identity + per-portion
-- draw membership (B1 of the massive run; Jake's GO 2026-07-16 with rulings
-- Q1=primary-header, Q2=junction, Q6=whole-invoice status / manual payment /
-- per-portion liens, Q7=PM policy folded in, Q9=credits stay mono-job).
--
-- Design doc: .planning/coherence/multi-job-split-proposal.md
-- WI rule: .planning/architecture/WORKFLOW-INTELLIGENCE.md §WI-013 (the
-- dormant wi-013 validator modeled this schema before it existed).
--
-- Contents:
--   A. invoice_allocations.job_id — backfilled = header job, NOT NULL
--      (pre-flight verified: zero live allocations reference jobless
--      invoices, org-wide), + indexes.
--   B. Header-job-change sync trigger: when invoices.job_id changes,
--      mono-job allocations follow (rows already split to OTHER jobs keep
--      their explicit job).
--   C. Split-invariant trigger on invoice_allocations (the "split ⇒ fully
--      allocated" DB gate): whenever an invoice has any live allocation
--      whose job differs from the header, the live allocations MUST sum
--      exactly to invoices.total_amount. AFTER-ROW triggers in Postgres
--      run after the whole statement, so the allocations PUT's
--      soft-delete-all → insert-all sequence validates each statement's
--      END state (empty set = not split = valid; full set = validated).
--      Negative amounts stay impossible via 00038's CHECK
--      (amount_cents >= 0) — credits cannot split (Q9).
--   D. PM write policy on invoice_allocations (Q7 fold-in): the PUT route
--      has accepted role 'pm' since Phase 3a but RLS only allowed
--      admin/owner/accounting (00043) — PM saves no-oped. Mirrors 00013's
--      "pm write invoice_line_items on own jobs" predicate (header-job PM
--      per Q7 ruling; org isolation via the 00016/00049 RESTRICTIVE
--      policies + 00096 direct-filter stack).
--   E. invoice_draw_links — per-(invoice, job) draw membership junction +
--      backfill from invoices.draw_id (header portion). invoices.draw_id
--      REMAINS and stays in sync for the header-job portion (Q2) so every
--      existing reader keeps working; the junction is canonical for
--      split-portion membership.
--   F. draw_submit_rpc re-issue: invoice set via junction; whole-invoice
--      status flip (Q6); lien-release vendor sums = THIS JOB'S portion
--      (allocations on draw.job_id; header-job total only when the
--      invoice has no allocations at all).
--   G. draw_void_rpc re-issue: releases THIS draw's junction links;
--      invoices.draw_id cleared only where it pointed at this draw;
--      status reverts in_draw→qa_approved ONLY when no other draw still
--      holds a portion; paid gate junction-scoped. Preserves 00110's
--      F2E-3 release-all-statuses semantics.
--   H. draw_approve_rpc re-issue: payment auto-schedule select via
--      junction. Payment semantics UNCHANGED (whole-invoice; the
--      scheduled_payment_date IS NULL guard already makes later-portion
--      approvals a no-op — "no auto-flip" per Q6).

-- ══ A. invoice_allocations.job_id ═══════════════════════════════════════

ALTER TABLE public.invoice_allocations
  ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES public.jobs(id);

UPDATE public.invoice_allocations a
   SET job_id = i.job_id
  FROM public.invoices i
 WHERE i.id = a.invoice_id
   AND a.job_id IS NULL;

ALTER TABLE public.invoice_allocations
  ALTER COLUMN job_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_allocations_job_code
  ON public.invoice_allocations (job_id, cost_code_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_allocations_invoice_job
  ON public.invoice_allocations (invoice_id, job_id)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.invoice_allocations.job_id IS
  'The job this allocation portion bills to. Defaults to the invoice''s '
  'header job (invoices.job_id = PRIMARY job per Q1); differs only on a '
  'split invoice (WI-013). Draws pull per-portion by this column.';

-- ══ B. Header-job-change sync ═══════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_allocation_jobs_on_header_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Mono-job rows follow the header; explicit splits keep their job.
  UPDATE public.invoice_allocations
     SET job_id = NEW.job_id,
         updated_at = now()
   WHERE invoice_id = NEW.id
     AND deleted_at IS NULL
     AND job_id IS NOT DISTINCT FROM OLD.job_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_allocation_jobs ON public.invoices;
CREATE TRIGGER trg_sync_allocation_jobs
  AFTER UPDATE OF job_id ON public.invoices
  FOR EACH ROW
  WHEN (OLD.job_id IS DISTINCT FROM NEW.job_id AND NEW.job_id IS NOT NULL)
  EXECUTE FUNCTION public.sync_allocation_jobs_on_header_change();

-- ══ C. Split-invariant gate ═════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.enforce_split_fully_allocated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _invoice_id uuid := COALESCE(NEW.invoice_id, OLD.invoice_id);
  _header_job uuid;
  _total bigint;
  _sum bigint;
  _is_split boolean;
BEGIN
  SELECT i.job_id, i.total_amount INTO _header_job, _total
    FROM public.invoices i
   WHERE i.id = _invoice_id;
  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    bool_or(a.job_id IS DISTINCT FROM _header_job),
    COALESCE(sum(a.amount_cents), 0)
    INTO _is_split, _sum
    FROM public.invoice_allocations a
   WHERE a.invoice_id = _invoice_id
     AND a.deleted_at IS NULL;

  IF COALESCE(_is_split, false) AND _sum IS DISTINCT FROM _total THEN
    RAISE EXCEPTION
      'split_invoice_not_fully_allocated: invoice % is split across jobs but live allocations sum to % cents vs total %',
      _invoice_id, _sum, _total
      USING ERRCODE = '23514';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_split_fully_allocated ON public.invoice_allocations;
CREATE TRIGGER trg_split_fully_allocated
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_split_fully_allocated();

-- ══ D. PM write policy (Q7 fold-in; latent-bug fix) ═════════════════════

DROP POLICY IF EXISTS "pm write invoice_allocations on own jobs" ON public.invoice_allocations;
CREATE POLICY "pm write invoice_allocations on own jobs"
  ON public.invoice_allocations FOR ALL TO authenticated
  USING (
    app_private.user_role() = 'pm'
    AND EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_allocations.invoice_id
        AND (
          i.assigned_pm_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = i.job_id AND j.pm_id = auth.uid())
        )
    )
  )
  WITH CHECK (
    app_private.user_role() = 'pm'
    AND EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_allocations.invoice_id
        AND (
          i.assigned_pm_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = i.job_id AND j.pm_id = auth.uid())
        )
    )
  );

-- ══ E. invoice_draw_links junction ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.invoice_draw_links (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  draw_id uuid NOT NULL REFERENCES public.draws(id),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- One live draw per (invoice, job) portion.
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_draw_links_invoice_job_live
  ON public.invoice_draw_links (invoice_id, job_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_draw_links_draw
  ON public.invoice_draw_links (draw_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invoice_draw_links_org
  ON public.invoice_draw_links (org_id);

COMMENT ON TABLE public.invoice_draw_links IS
  'Per-(invoice, job) draw membership (Q2 junction). invoices.draw_id stays '
  'in sync for the HEADER job''s portion; this table is canonical for split '
  'portions. Soft-delete on draw void/detach.';

ALTER TABLE public.invoice_draw_links ENABLE ROW LEVEL SECURITY;

-- Org read for members (org isolation also stacked by RESTRICTIVE policies
-- pattern; direct filter per Q10b ORG-scoped child).
DROP POLICY IF EXISTS "org members read invoice_draw_links" ON public.invoice_draw_links;
CREATE POLICY "org members read invoice_draw_links"
  ON public.invoice_draw_links FOR SELECT TO authenticated
  USING (org_id = (SELECT app_private.user_org_id()));

DROP POLICY IF EXISTS "admin owner accounting write invoice_draw_links" ON public.invoice_draw_links;
CREATE POLICY "admin owner accounting write invoice_draw_links"
  ON public.invoice_draw_links FOR ALL TO authenticated
  USING (
    org_id = (SELECT app_private.user_org_id())
    AND app_private.user_role() IN ('admin', 'owner', 'accounting')
  )
  WITH CHECK (
    org_id = (SELECT app_private.user_org_id())
    AND app_private.user_role() IN ('admin', 'owner', 'accounting')
  );

-- Backfill: every currently-linked invoice = one header-portion link.
INSERT INTO public.invoice_draw_links (invoice_id, job_id, draw_id, org_id)
SELECT i.id, i.job_id, i.draw_id, i.org_id
  FROM public.invoices i
 WHERE i.draw_id IS NOT NULL
   AND i.deleted_at IS NULL
   AND i.job_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.invoice_draw_links l
      WHERE l.invoice_id = i.id AND l.job_id = i.job_id AND l.deleted_at IS NULL
   );

-- ══ F. draw_submit_rpc — junction invoice set + per-portion liens ═══════

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

  -- 2. Flip qa_approved invoices → in_draw. WHOLE-invoice status (Q6):
  --    in_draw means "≥1 portion on a submitted draw". Invoice set via the
  --    junction (00122) so split portions pulled by this draw are included
  --    even when the header portion lives elsewhere.
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
     WHERE id IN (SELECT l.invoice_id FROM invoice_draw_links l
                   WHERE l.draw_id = _draw_id AND l.deleted_at IS NULL)
       AND deleted_at IS NULL
       AND status = 'qa_approved'
    RETURNING id
  )
  SELECT array_agg(id) INTO _invoice_ids FROM updated;

  IF _force_fail IN ('lien_gen', 'FORCE_LIEN_GEN_FAIL') THEN
    RAISE EXCEPTION 'injected failure: lien_gen' USING ERRCODE = 'P0001';
  END IF;

  -- 4. Auto-generate lien releases — PER-PORTION amounts (Q6): each vendor's
  --    lien exposure on THIS draw = Σ allocations on THIS job; an invoice with
  --    no allocations at all (legacy mono-job) contributes its full total only
  --    when it is headered to this job. Split invoices are fully allocated by
  --    the 00122 trigger, so their portions are exact.
  _release_type := CASE WHEN _draw.is_final THEN 'unconditional_final' ELSE 'conditional_progress' END;

  WITH linked AS (
    SELECT i.id, i.vendor_id, i.total_amount, i.job_id AS header_job
      FROM invoices i
      JOIN invoice_draw_links l
        ON l.invoice_id = i.id AND l.draw_id = _draw_id AND l.deleted_at IS NULL
     WHERE i.deleted_at IS NULL
       AND i.vendor_id IS NOT NULL
  ), portions AS (
    SELECT lk.vendor_id,
           COALESCE(
             (SELECT sum(a.amount_cents)::bigint
                FROM invoice_allocations a
               WHERE a.invoice_id = lk.id
                 AND a.deleted_at IS NULL
                 AND a.job_id = _draw.job_id
              HAVING count(*) > 0),
             CASE
               WHEN lk.header_job = _draw.job_id
                AND NOT EXISTS (SELECT 1 FROM invoice_allocations a2
                                 WHERE a2.invoice_id = lk.id AND a2.deleted_at IS NULL)
               THEN lk.total_amount
               ELSE 0
             END
           )::bigint AS amount
      FROM linked lk
  ), vendor_sums AS (
    SELECT vendor_id, sum(amount)::bigint AS amount
      FROM portions
     GROUP BY vendor_id
    HAVING sum(amount) <> 0
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

COMMENT ON FUNCTION public.draw_submit_rpc IS
  'Atomic draw submit cascade. 00122: invoice set via invoice_draw_links; '
  'whole-invoice status flip (Q6); lien releases per THIS-JOB portion.';

-- ══ G. draw_void_rpc — junction-aware release ═══════════════════════════

CREATE OR REPLACE FUNCTION public.draw_void_rpc(
  _draw_id uuid,
  _actor_user_id uuid,
  _reason text DEFAULT NULL::text,
  _expected_updated_at timestamptz DEFAULT NULL::timestamptz,
  _force_fail text DEFAULT NULL::text
) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
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

  -- Paid gate — junction-scoped (any paid invoice with a portion here).
  SELECT count(*)::int INTO _paid_count
    FROM invoices i
   WHERE i.id IN (SELECT l.invoice_id FROM invoice_draw_links l
                   WHERE l.draw_id = _draw_id AND l.deleted_at IS NULL)
     AND i.payment_status = 'paid'
     AND i.deleted_at IS NULL;
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

  -- Release THIS draw's portion links (soft-delete), then per invoice:
  --   - clear invoices.draw_id only where it pointed at THIS draw (header
  --     portion sync per Q2);
  --   - revert in_draw→qa_approved ONLY when NO other draw still holds a
  --     live portion of the invoice (Q6 whole-invoice status = "≥1 portion
  --     drawn"). Preserves 00110 F2E-3: every linked invoice is released
  --     from THIS draw regardless of its current workflow status.
  WITH dropped AS (
    UPDATE invoice_draw_links
       SET deleted_at = _now,
           updated_at = _now
     WHERE draw_id = _draw_id
       AND deleted_at IS NULL
    RETURNING invoice_id
  ), affected AS (
    SELECT DISTINCT invoice_id FROM dropped
  ), unlinked AS (
    -- CTE-visibility note: the `dropped` soft-deletes are NOT visible to
    -- this sub-statement (same-snapshot rule for data-modifying CTEs), so
    -- "no other draw holds a portion" is expressed as "no live link on a
    -- DIFFERENT draw" — this draw's links are excluded explicitly.
    UPDATE invoices i
       SET status = CASE
                      WHEN i.status = 'in_draw'
                       AND NOT EXISTS (SELECT 1 FROM invoice_draw_links l2
                                        WHERE l2.invoice_id = i.id
                                          AND l2.deleted_at IS NULL
                                          AND l2.draw_id <> _draw_id)
                      THEN 'qa_approved'
                      ELSE i.status
                    END,
           draw_id = CASE WHEN i.draw_id = _draw_id THEN NULL ELSE i.draw_id END,
           status_history = COALESCE(i.status_history, '[]'::jsonb) || jsonb_build_array(
             jsonb_build_object(
               'who', COALESCE(_actor_user_id::text, 'system'),
               'when', _now,
               'old_status', i.status,
               'new_status', CASE
                               WHEN i.status = 'in_draw'
                                AND NOT EXISTS (SELECT 1 FROM invoice_draw_links l3
                                                 WHERE l3.invoice_id = i.id
                                                   AND l3.deleted_at IS NULL
                                                   AND l3.draw_id <> _draw_id)
                               THEN 'qa_approved'
                               ELSE i.status
                             END,
               'note', format('Draw #%s voided — portion released from draw', _draw.draw_number)
             )
           ),
           updated_at = _now
      FROM affected a
     WHERE i.id = a.invoice_id
       AND i.deleted_at IS NULL
    RETURNING i.id
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
END $$;

COMMENT ON FUNCTION public.draw_void_rpc IS
  'Atomic draw void cascade. 00122: releases this draw''s junction portion '
  'links; whole-invoice status reverts only when no other draw holds a '
  'portion; preserves 00110 F2E-3 all-statuses release.';

-- ══ H. draw_approve_rpc — junction payment select (semantics unchanged) ═

CREATE OR REPLACE FUNCTION public.draw_approve_rpc(
  _draw_id uuid,
  _actor_user_id uuid,
  _reason text DEFAULT NULL::text,
  _expected_updated_at timestamptz DEFAULT NULL::timestamptz,
  _force_fail text DEFAULT NULL::text
) RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
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

  -- Payment auto-schedule — SEMANTICS UNCHANGED (whole-invoice, Q6 "no
  -- auto-flip": the scheduled_payment_date IS NULL guard makes a second
  -- portion's approval a no-op). Only the invoice set moves to the junction.
  WITH scheduled AS (
    UPDATE invoices
       SET scheduled_payment_date = public._compute_scheduled_payment_date(received_date, _schedule),
           payment_status = CASE WHEN payment_status = 'unpaid' THEN 'scheduled' ELSE payment_status END,
           updated_at = _now
     WHERE id IN (SELECT l.invoice_id FROM invoice_draw_links l
                   WHERE l.draw_id = _draw_id AND l.deleted_at IS NULL)
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
END $$;

COMMENT ON FUNCTION public.draw_approve_rpc IS
  'Atomic draw approve cascade (00117 lien-gate semantics preserved). 00122: '
  'payment auto-schedule invoice set via invoice_draw_links; payment '
  'semantics unchanged (whole-invoice, idempotent).';

GRANT EXECUTE ON FUNCTION public.draw_submit_rpc(uuid, uuid, text, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.draw_approve_rpc(uuid, uuid, text, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.draw_void_rpc(uuid, uuid, text, timestamptz, text) TO authenticated;
