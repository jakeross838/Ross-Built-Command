// BASE CALCULATION:
// Percentage billings (like the 18% Contractor Fee) are a
// fraction of everything else on the draw. The "base" is:
//
//   base = sum(invoices.total_amount on this draw)
//        + sum(draw_line_items.this_period for non-percentage lines)
//
// We exclude percentage-sourced lines from their own base to
// prevent self-amplification (a percentage can't be a percentage
// of itself + others).
//
// Locked draws (status != draft/pm_review) are immutable and
// return early.

import { createServiceRoleClient } from "@/lib/supabase/service";
import { recalcDraftDrawsForJob } from "@/lib/draw-calc";

interface DrawLineRow {
  id: string;
  this_period: number;
  internal_billing_id: string | null;
}

interface BillingRow {
  id: string;
  percentage: number | null;
  draw_line_item_id: string | null;
  internal_billing_types: { calculation_method: string | null } | null;
}

export async function recomputePercentageBillings(drawId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: draw } = await supabase
    .from("draws")
    .select("id, job_id, status")
    .eq("id", drawId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!draw) return;
  if (!["draft", "pm_review"].includes(draw.status as string)) return;

  const { data: lines } = await supabase
    .from("draw_line_items")
    .select("id, this_period, internal_billing_id")
    .eq("draw_id", drawId)
    .is("deleted_at", null);
  const allLines = (lines ?? []) as DrawLineRow[];

  // 00122: fee base = THIS-JOB portions of the junction-linked invoices,
  // not full invoice totals (a split invoice's other-job dollars must not
  // inflate this job's percentage fee).
  const { data: linkRows } = await supabase
    .from("invoice_draw_links")
    .select("invoice_id")
    .eq("draw_id", drawId)
    .is("deleted_at", null);
  const linkedIds = Array.from(
    new Set((linkRows ?? []).map((l) => (l as { invoice_id: string }).invoice_id))
  );
  let invoiceTotal = 0;
  if (linkedIds.length > 0) {
    const [{ data: invRows }, { data: allocRows }] = await Promise.all([
      supabase
        .from("invoices")
        .select("id, total_amount, job_id")
        .in("id", linkedIds)
        .is("deleted_at", null),
      supabase
        .from("invoice_allocations")
        .select("invoice_id, amount_cents, job_id")
        .in("invoice_id", linkedIds)
        .is("deleted_at", null),
    ]);
    const hasAllocs = new Set((allocRows ?? []).map((a) => a.invoice_id as string));
    for (const a of allocRows ?? []) {
      if ((a as { job_id: string }).job_id === (draw.job_id as string)) {
        invoiceTotal += (a as { amount_cents: number }).amount_cents ?? 0;
      }
    }
    for (const i of invRows ?? []) {
      if (
        !hasAllocs.has(i.id as string) &&
        (i as { job_id: string | null }).job_id === (draw.job_id as string)
      ) {
        invoiceTotal += (i as { total_amount: number }).total_amount ?? 0;
      }
    }
  }

  const billingIds = allLines
    .map((l) => l.internal_billing_id)
    .filter((x): x is string => !!x);

  let billings: BillingRow[] = [];
  if (billingIds.length > 0) {
    const { data: bs } = await supabase
      .from("internal_billings")
      .select(
        "id, percentage, draw_line_item_id, " +
          "internal_billing_types:billing_type_id (calculation_method)"
      )
      .in("id", billingIds)
      .is("deleted_at", null);
    billings = (bs ?? []) as unknown as BillingRow[];
  }

  const pctBillings = billings.filter(
    (b) => b.internal_billing_types?.calculation_method === "percentage"
  );
  const pctLineIds = new Set(
    pctBillings.map((b) => b.draw_line_item_id).filter((x): x is string => !!x)
  );

  const nonPctLineTotal = allLines
    .filter((l) => !pctLineIds.has(l.id))
    .reduce((s, l) => s + (l.this_period ?? 0), 0);
  const baseCents = invoiceTotal + nonPctLineTotal;

  for (const b of pctBillings) {
    if (!b.draw_line_item_id) continue;

    const pct = Number(b.percentage ?? 0);
    const newAmount = Math.round(baseCents * pct);

    await supabase
      .from("draw_line_items")
      .update({ this_period: newAmount, total_to_date: newAmount })
      .eq("id", b.draw_line_item_id);

    await supabase
      .from("internal_billings")
      .update({ amount_cents: newAmount })
      .eq("id", b.id);
  }

  await recalcDraftDrawsForJob(draw.job_id as string);
}
