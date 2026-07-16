import { NextRequest, NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/org/session";
import { logActivity } from "@/lib/activity-log";
import {
  getClientForRequest,
  logImpersonatedWrite,
} from "@/lib/auth/impersonation-client";
import {
  appliedAdjustmentsForDraw,
  computeDrawLines,
  depositAppliedToDateForJob,
  lessPreviousCertificatesForJob,
  nonBudgetLineThisPeriodForDraw,
  netChangeOrdersForJob,
  rollupDrawTotals,
  uncapturedLinkedInvoicesForDraw,
} from "@/lib/draw-calc";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface UpdateDraftRequest {
  application_date?: string;
  period_start?: string;
  period_end?: string;
  invoice_ids?: string[];
  is_final?: boolean;
  deposit_applied_cents?: number;
  wizard_draft?: Record<string, unknown> | null;
}

/**
 * PUT /api/draws/[id]/update-draft
 *
 * Defect-3 fix: full editing of an existing DRAFT draw from the wizard's
 * edit mode (`/financials/pay-apps/new?edit=<drawId>`). Reconciles which
 * invoices are attached (detach removed, attach added), updates the period
 * window + application date + final flag, then recomputes the stored G702/
 * G703 snapshot from source via the shared draw-calc engine (same path the
 * create route and recalcDraftDrawsForJob use). Line amounts stay DERIVED
 * from invoice allocations — no manual per-line overrides on this route.
 *
 * Hard status guard: ONLY status='draft' is editable. Submitted / approved /
 * locked / paid draws are legally frozen (AIA revision territory) and return
 * 409. This is the "approved draws stay locked" contract.
 */
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const membership = await getCurrentMembership();
    if (!membership) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const orgId = membership.org_id;

    const ctx = await getClientForRequest();
    if (!ctx.ok) {
      return NextResponse.json(
        { error: `Impersonation rejected: ${ctx.reason}` },
        { status: 401 }
      );
    }
    const supabase = ctx.client;
    // Attribution (2.2): resolve the real acting user for status_history +
    // activity_log (membership carries org/role only).
    const {
      data: { user: actor },
    } = await supabase.auth.getUser();
    const actorId = actor?.id ?? null;
    const drawId = context.params.id;
    const body: UpdateDraftRequest = await request.json();

    // Load the target draw (org-scoped).
    const { data: draw } = await supabase
      .from("draws")
      .select(
        "id, job_id, draw_number, status, application_date, period_start, period_end, is_final, status_history, deposit_applied_cents"
      )
      .eq("id", drawId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .single();
    if (!draw) {
      return NextResponse.json({ error: "Draw not found" }, { status: 404 });
    }
    if (draw.status !== "draft") {
      return NextResponse.json(
        {
          error: `Only draft draws can be edited — this draw is '${draw.status}'. A change to a submitted or approved draw is a formal revision.`,
        },
        { status: 409 }
      );
    }

    const jobId = draw.job_id as string;
    const drawNumber = draw.draw_number as number;

    const applicationDate =
      body.application_date ?? (draw.application_date as string);
    const periodStart = body.period_start ?? (draw.period_start as string);
    const periodEnd = body.period_end ?? (draw.period_end as string);
    const isFinal =
      typeof body.is_final === "boolean"
        ? body.is_final
        : !!(draw.is_final as boolean);

    // Reconcile attached invoices when a new set is supplied.
    let invoiceIds: string[];
    if (Array.isArray(body.invoice_ids)) {
      invoiceIds = body.invoice_ids;
      if (invoiceIds.length === 0) {
        return NextResponse.json(
          { error: "At least one invoice is required to keep a draw." },
          { status: 400 }
        );
      }

      // 00122 per-portion membership: reconcile against the junction, not
      // invoices.draw_id. Detach soft-deletes this draw's link (and clears
      // the header draw_id sync when it pointed here); attach validates the
      // portion (header job OR an allocation on this job), qa_approved
      // status, and portion-uniqueness before inserting a link.
      const { data: currentLinks } = await supabase
        .from("invoice_draw_links")
        .select("invoice_id")
        .eq("draw_id", drawId)
        .is("deleted_at", null);
      const current = new Set(
        (currentLinks ?? []).map((r) => (r as { invoice_id: string }).invoice_id)
      );
      const next = new Set(invoiceIds);

      const toDetach = [...current].filter((id) => !next.has(id));
      const toAttach = invoiceIds.filter((id) => !current.has(id));

      if (toDetach.length > 0) {
        const { error: dropErr } = await supabase
          .from("invoice_draw_links")
          .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("draw_id", drawId)
          .in("invoice_id", toDetach)
          .is("deleted_at", null);
        if (dropErr) {
          return NextResponse.json(
            { error: `Failed to detach invoice portions: ${dropErr.message}` },
            { status: 500 }
          );
        }
        const { error: detachErr } = await supabase
          .from("invoices")
          .update({ draw_id: null })
          .in("id", toDetach)
          .eq("draw_id", drawId)
          .eq("org_id", orgId);
        if (detachErr) {
          return NextResponse.json(
            { error: `Failed to detach invoices: ${detachErr.message}` },
            { status: 500 }
          );
        }
      }

      if (toAttach.length > 0) {
        const { data: cands, error: candErr } = await supabase
          .from("invoices")
          .select("id, job_id, status")
          .in("id", toAttach)
          .eq("org_id", orgId)
          .is("deleted_at", null);
        if (candErr) {
          return NextResponse.json(
            { error: `Failed to load invoices to attach: ${candErr.message}` },
            { status: 500 }
          );
        }
        const notApproved = (cands ?? []).filter((c) => c.status !== "qa_approved");
        if (!cands || cands.length !== toAttach.length || notApproved.length > 0) {
          return NextResponse.json(
            {
              error: `Could not attach all invoices — ${
                toAttach.length - ((cands?.length ?? 0) - notApproved.length)
              } were missing or not QA-approved.`,
            },
            { status: 409 }
          );
        }

        const foreign = cands.filter((c) => c.job_id !== jobId);
        if (foreign.length > 0) {
          const { data: portionRows } = await supabase
            .from("invoice_allocations")
            .select("invoice_id")
            .in("invoice_id", foreign.map((c) => c.id))
            .eq("job_id", jobId)
            .is("deleted_at", null);
          const withPortion = new Set((portionRows ?? []).map((r) => r.invoice_id));
          const ineligible = foreign.filter((c) => !withPortion.has(c.id));
          if (ineligible.length > 0) {
            return NextResponse.json(
              {
                error: `${ineligible.length} invoice(s) carry no allocation portion for this job — cannot attach.`,
              },
              { status: 409 }
            );
          }
        }

        const { data: clash } = await supabase
          .from("invoice_draw_links")
          .select("invoice_id")
          .in("invoice_id", toAttach)
          .eq("job_id", jobId)
          .is("deleted_at", null);
        if ((clash ?? []).length > 0) {
          return NextResponse.json(
            {
              error: `Could not attach all invoices — ${clash!.length} portion(s) already on another draw.`,
            },
            { status: 409 }
          );
        }

        const { error: junctionErr } = await supabase
          .from("invoice_draw_links")
          .insert(
            toAttach.map((id) => ({
              invoice_id: id,
              job_id: jobId,
              draw_id: drawId,
              org_id: orgId,
            }))
          );
        if (junctionErr) {
          return NextResponse.json(
            { error: `Failed to attach invoice portions: ${junctionErr.message}` },
            { status: 500 }
          );
        }

        const headerIds = cands.filter((c) => c.job_id === jobId).map((c) => c.id);
        if (headerIds.length > 0) {
          const { error: attachErr } = await supabase
            .from("invoices")
            .update({ draw_id: drawId })
            .in("id", headerIds)
            .eq("org_id", orgId)
            .is("draw_id", null);
          if (attachErr) {
            return NextResponse.json(
              { error: `Failed to sync header draw link: ${attachErr.message}` },
              { status: 500 }
            );
          }
        }
      }
    } else {
      const { data: currentLinks } = await supabase
        .from("invoice_draw_links")
        .select("invoice_id")
        .eq("draw_id", drawId)
        .is("deleted_at", null);
      invoiceIds = Array.from(
        new Set(
          (currentLinks ?? []).map((r) => (r as { invoice_id: string }).invoice_id)
        )
      );
    }

    // Recompute the stored snapshot from source (excluding this draw's own
    // contributions from "prior applications" via excludeDrawId).
    const { data: job } = await supabase
      .from("jobs")
      .select(
        "original_contract_amount, deposit_percentage, retainage_percent, previous_co_completed_amount"
      )
      .eq("id", jobId)
      .eq("org_id", orgId)
      .single();
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const retainagePct =
      (job as { retainage_percent?: number }).retainage_percent ?? 10;
    const depositPct =
      (job as { deposit_percentage?: number }).deposit_percentage ?? 0.1;
    const originalContractSum =
      (job as { original_contract_amount?: number }).original_contract_amount ??
      0;
    const previousCoCompleted =
      (job as { previous_co_completed_amount?: number })
        .previous_co_completed_amount ?? 0;
    const netChangeOrders = await netChangeOrdersForJob(jobId);

    const { lines } = await computeDrawLines({
      jobId,
      drawNumber,
      excludeDrawId: drawId,
      periodStart,
      periodEnd,
      drawInvoiceIds: invoiceIds,
      retainagePercent: retainagePct,
      isFinalDraw: isFinal,
    });
    const lessPrevCerts = await lessPreviousCertificatesForJob(
      jobId,
      drawNumber,
      drawId
    );
    const nonBudgetLineThisPeriod = await nonBudgetLineThisPeriodForDraw(drawId);
    const appliedAdjustments = await appliedAdjustmentsForDraw(drawId);
    const { total: uncapturedLinked } = await uncapturedLinkedInvoicesForDraw(drawId);
    // BLOCK B pt2b — clamp the requested deposit application to the remaining
    // pool (exclude THIS draft from applied-to-date). If the body omits it,
    // preserve the draft's existing value.
    const depositPool = Math.round(originalContractSum * depositPct);
    const depositAppliedOnOthers = await depositAppliedToDateForJob(jobId, drawId);
    const requestedDeposit =
      body.deposit_applied_cents ?? ((draw.deposit_applied_cents as number | null) ?? 0);
    const depositApplied = Math.max(
      0,
      Math.min(requestedDeposit, Math.max(0, depositPool - depositAppliedOnOthers))
    );

    const totals = rollupDrawTotals({
      originalContractSum,
      netChangeOrders,
      depositPercentage: depositPct,
      retainagePercent: retainagePct,
      lines,
      lessPreviousCertificates: lessPrevCerts,
      isFinalDraw: isFinal,
      nonBudgetLineThisPeriod,
      previousCoCompletedAmount: previousCoCompleted,
      depositAppliedCents: depositApplied,
      appliedAdjustmentsCents: appliedAdjustments,
      uncapturedLinkedCents: uncapturedLinked,
    });

    const history = Array.isArray(draw.status_history)
      ? (draw.status_history as unknown[])
      : [];
    history.push({
      who: actorId,
      when: new Date().toISOString(),
      old_status: "draft",
      new_status: "draft",
      note: `Draft edited — ${invoiceIds.length} invoice(s), period ${periodStart} to ${periodEnd}.`,
    });

    const { error: updErr } = await supabase
      .from("draws")
      .update({
        application_date: applicationDate,
        period_start: periodStart,
        period_end: periodEnd,
        is_final: isFinal,
        original_contract_sum: totals.original_contract_sum,
        net_change_orders: totals.net_change_orders,
        contract_sum_to_date: totals.contract_sum_to_date,
        total_completed_to_date: totals.total_completed_to_date,
        retainage_on_completed: totals.retainage_on_completed,
        retainage_on_stored: totals.retainage_on_stored,
        total_retainage: totals.total_retainage,
        total_earned_less_retainage: totals.total_earned_less_retainage,
        less_previous_certificates: totals.less_previous_certificates,
        less_previous_payments: totals.less_previous_payments,
        current_payment_due: totals.current_payment_due,
        balance_to_finish: totals.balance_to_finish,
        deposit_amount: totals.deposit_amount,
        deposit_applied_cents: depositApplied,
        wizard_draft: body.wizard_draft ?? undefined,
        status_history: history,
        updated_at: new Date().toISOString(),
      })
      .eq("id", drawId)
      .eq("org_id", orgId);
    if (updErr) {
      return NextResponse.json(
        { error: `Failed to save draft: ${updErr.message}` },
        { status: 500 }
      );
    }

    await logActivity({
      org_id: orgId,
      user_id: actorId,
      entity_type: "draw",
      entity_id: drawId,
      action: "updated",
      details: {
        draw_number: drawNumber,
        invoice_count: invoiceIds.length,
        current_payment_due: totals.current_payment_due,
        is_final: isFinal,
      },
    });

    await logImpersonatedWrite(ctx, {
      target_record_type: "draw",
      target_record_id: drawId,
      details: { draw_number: drawNumber, invoice_count: invoiceIds.length },
    });

    return NextResponse.json({
      id: drawId,
      draw_number: drawNumber,
      current_payment_due: totals.current_payment_due,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 }
    );
  }
}
