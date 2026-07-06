import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentMembership, getMembershipFromRequest } from "@/lib/org/session";

export const dynamic = "force-dynamic";

// Invoices-list data for the Bills page, computed SERVER-SIDE.
//
// WHY THIS EXISTS (root cause of the ~15s list hang): the page used to load
// this data with the client-side supabase-js SDK, whose auth init
// (getSession -> initialize -> token refresh) can strand and never resolve —
// which blocks every RLS query behind it, so the list only rendered via its
// 15s safety timeout. Confirmed on RB: fetchData never got past
// `await supabase.auth.getSession()`. Server routes use per-request cookie
// auth (refreshed by middleware) and don't touch the client's stuck auth
// singleton, so this always resolves fast. Mirrors /api/setup-status.
//
// Tenant safety: every query filters on membership.org_id (CLAUDE.md
// "Filter every query by membership.org_id"); RLS is the backstop.

// Column set with the partial-approval columns (migration 00015).
const INVOICES_FULL =
  "id, vendor_name_raw, vendor_id, invoice_number, invoice_date, total_amount, confidence_score, received_date, payment_date, status, check_number, picked_up, mailed_date, document_category, document_type, is_change_order, parent_invoice_id, partial_approval_note, payment_status, draw_id, draws:draw_id (draw_number, status), jobs:job_id (id, name), cost_codes:cost_code_id (code, description), assigned_pm:assigned_pm_id (id, full_name)";
// Fallback for orgs whose schema predates those columns.
const INVOICES_MINIMAL =
  "id, vendor_name_raw, vendor_id, invoice_number, invoice_date, total_amount, confidence_score, received_date, payment_date, status, check_number, picked_up, mailed_date, document_category, document_type, is_change_order, payment_status, draw_id, draws:draw_id (draw_number, status), jobs:job_id (id, name), cost_codes:cost_code_id (code, description), assigned_pm:assigned_pm_id (id, full_name)";

export async function GET(request: NextRequest) {
  // Fast path: read org from middleware-set headers (skips a redundant
  // auth.getUser() round-trip, ~250-300ms). Fall back to the full lookup if
  // the headers aren't present.
  const membership = getMembershipFromRequest(request) ?? (await getCurrentMembership());
  if (!membership) {
    return NextResponse.json({ invoices: [], pmUsers: [] });
  }
  const supabase = createServerClient();
  const org = membership.org_id;

  // Invoices + PM dropdown in parallel.
  const [invResult, pmResult] = await Promise.all([
    supabase
      .from("invoices")
      .select(INVOICES_FULL)
      .eq("org_id", org)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(2000)
      .then(async (r) => {
        if (r.error && /parent_invoice_id|partial_approval_note/i.test(r.error.message)) {
          return await supabase
            .from("invoices")
            .select(INVOICES_MINIMAL)
            .eq("org_id", org)
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .limit(2000);
        }
        return r;
      }),
    supabase
      .from("org_members")
      .select("user_id, profile:profiles (id, full_name)")
      .eq("org_id", org)
      .eq("is_active", true)
      .in("role", ["pm", "admin"]),
  ]);

  const invoices = (invResult.data as unknown as Array<{ id: string }> | null) ?? [];

  // Per-invoice unique cost-code strings — only for the invoices we return.
  const lineItemCodesByInvoice = new Map<string, Set<string>>();
  const invoiceIds = invoices.map((i) => i.id);
  if (invoiceIds.length > 0) {
    const { data: lineItems } = await supabase
      .from("invoice_line_items")
      .select("invoice_id, cost_code_id, cost_codes:cost_code_id(code)")
      .in("invoice_id", invoiceIds)
      .is("deleted_at", null);
    for (const li of lineItems ?? []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cc = (li as any).cost_codes;
      const code = Array.isArray(cc) ? cc[0]?.code : cc?.code;
      if (!code) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invId = (li as any).invoice_id as string;
      if (!lineItemCodesByInvoice.has(invId)) lineItemCodesByInvoice.set(invId, new Set());
      lineItemCodesByInvoice.get(invId)!.add(code);
    }
  }

  const enriched = invoices.map((inv) => ({
    ...inv,
    line_item_cost_codes: Array.from(lineItemCodesByInvoice.get(inv.id) ?? []),
  }));

  const pmUsers = (
    (pmResult.data as Array<{
      user_id: string;
      profile: { id: string; full_name: string } | { id: string; full_name: string }[] | null;
    }> | null) ?? []
  )
    .map((m) => {
      const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
      return profile && profile.id && profile.full_name
        ? { id: profile.id, full_name: profile.full_name }
        : null;
    })
    .filter((p): p is { id: string; full_name: string } => p !== null)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  return NextResponse.json({ invoices: enriched, pmUsers });
}
