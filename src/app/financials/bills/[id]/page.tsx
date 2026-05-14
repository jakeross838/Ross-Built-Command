// src/app/financials/bills/[id]/page.tsx
//
// Production route — Bill review (Stage 1.5c Plan 3 thin wrapper, F1-wired
// to public.invoices via Wave-E Plan E-3).
//
// Mounts InvoiceReviewView from src/components/prototypes/ with REAL invoice
// data from public.invoices (E-3 replaced the Caldwell-fixture lookup with
// a Supabase query; the View is unchanged per Wave-E EXPANDED-SCOPE).
//
// Per CONTEXT D-19 + iter-3 Q-iter2-1=a: outer container wraps in
// data-direction="C" data-palette="B" className="design-system-scope" so
// Site Office direction-aware CSS rules from
// src/app/design-system/design-system.css activate (the file is already
// bundled into production via root layout import per Plan 1 / D-23).
//
// Per CONTEXT D-01 (Bills/Pay Apps rename): UI labels say "Bill" not
// "Invoice". InvoiceReviewView preserves the internal name for
// code-search continuity per D-01 scope clarification.
//
// Auth posture: middleware enforces authenticated-org-member gate before
// this route renders. Page defense-in-depth: calls getCurrentMembership()
// and notFound() if null. Query is scoped to membership.org_id (RLS is
// belt-AND-suspenders, not in conflict).
//
// Vendor embed shape: (id, name, address).
//
// Intentionally narrower than /api/invoices/[id] route handler's vendor embed
// (id, name, phone, email, address) per D-079 vendor B2B contact posture +
// E-1 Path C decision. The page-side narrowing is defense-in-depth: this
// surface only renders vendor identity (name) and location (address); phone/
// email are accessible via the canonical /api/invoices/[id] response for
// the VendorContactPopover prefetch posture (per vendor-contact-popover.tsx:18
// comment). If a future plan-author needs phone/email on this page, fetch
// via the API route OR widen the embed here AFTER review of D-079 sole-prop
// edge case.
//
// Vendor null-guard (per Wave-E ITER-2-PATCHES.md §3.1): unmatched invoices
// have vendor_id NULL pending PM review. The shim falls back to
// vendor_name_raw so the matching workflow renders (notFound() on missing
// vendor would break the PM matching workflow on real unmatched invoices).
// Job is REQUIRED (job_id NOT NULL FK on public.invoices) — notFound() if
// the embed is null.
//
// Field-mapping shim: page constructs a CaldwellInvoice-shaped object
// from DB row + safe defaults to preserve the InvoiceReviewView contract.
// Real Drummond / Caldwell invoices populated by future invoice-upload
// pipelines will populate the sparse columns (confidence_score,
// confidence_details, line_items, etc.); shim defaults handle synthetic
// seed rows. See .planning/phases/stage-f1-knowledge-graph-auth-wave-e/
// E-3-bills-id-db-wire-PLAN.md §Field mapping concern for the full table.

import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org/session";
import type { CaldwellInvoice } from "@/app/design-system/_fixtures/drummond/types";
import InvoiceReviewView from "@/components/prototypes/InvoiceReviewView";

export default async function BillReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const membership = await getCurrentMembership();
  if (!membership) return notFound();

  const supabase = createServerClient();

  const { data: row, error } = await supabase
    .from("invoices")
    .select(`
      id, job_id, vendor_id, cost_code_id, po_id, co_id,
      invoice_number, invoice_date, vendor_name_raw, description,
      line_items, total_amount, invoice_type,
      confidence_score, confidence_details,
      status, received_date, payment_date, draw_id,
      original_file_url, org_id,
      vendors:vendor_id (id, name, address),
      jobs:job_id (id, name),
      cost_codes:cost_code_id (id, code, description)
    `)
    .eq("id", params.id)
    .eq("org_id", membership.org_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    // Treat any query error as 404 (avoid leaking error detail to user).
    // Server logs capture the error for ops debugging.
    console.error("[bills/[id]] invoice query error:", error);
    return notFound();
  }
  if (!row) return notFound();

  // PostgREST embeds may arrive as object OR array depending on FK
  // cardinality. The current FKs (vendor_id, job_id, cost_code_id) are
  // single-row joins, so each embed is a singleton or null. Normalize to
  // object | null defensively (matches the pattern in
  // src/app/api/invoices/[id]/route.ts).
  const vendorEmbed = Array.isArray(row.vendors)
    ? row.vendors[0] ?? null
    : (row.vendors as { id: string; name: string; address: string | null } | null);
  const jobEmbed = Array.isArray(row.jobs)
    ? row.jobs[0] ?? null
    : (row.jobs as { id: string; name: string } | null);
  const costCodeEmbed = Array.isArray(row.cost_codes)
    ? row.cost_codes[0] ?? null
    : (row.cost_codes as { id: string; code: string; description: string } | null);

  // Job is REQUIRED (every invoice scoped to a job via job_id NOT NULL FK
  // on public.invoices). If the embed is null (FK pointing at a deleted
  // row, or embed RLS-hidden), notFound() — the invoice is structurally
  // broken and surfacing it invites confusion.
  if (!jobEmbed) {
    console.error("[bills/[id]] invoice query returned null job embed:", {
      id: row.id,
      job_id: row.job_id,
    });
    return notFound();
  }

  // Construct CaldwellInvoice-shaped shim from DB row + safe defaults.
  // The InvoiceReviewView contract is locked-shape (CaldwellInvoice); see
  // §Field mapping concern in PLAN.md for the full mapping rationale.
  // Fields the seed populates: id, job_id, vendor_name_raw, total_amount,
  // invoice_type, status, received_date. Fields the seed omits: vendor_id,
  // cost_code_id, po_id, co_id, invoice_number, invoice_date, description,
  // confidence_score, confidence_details, line_items, payment_date,
  // draw_id, original_file_url. The `flags` field is Caldwell-only (no DB
  // column) — defaults to []. F1-Wave-B or Wave 1.1 may extend.
  const invoice: CaldwellInvoice = {
    id: row.id as string,
    vendor_id: (row.vendor_id as string | null) ?? "",
    job_id: (row.job_id as string | null) ?? "",
    cost_code_id: (row.cost_code_id as string | null) ?? null,
    po_id: (row.po_id as string | null) ?? null,
    co_id: (row.co_id as string | null) ?? null,
    invoice_number: (row.invoice_number as string | null) ?? null,
    invoice_date: (row.invoice_date as string | null) ?? null,
    description: (row.description as string | null) ?? "",
    invoice_type: (row.invoice_type as CaldwellInvoice["invoice_type"]) ?? "progress",
    total_amount: Number(row.total_amount ?? 0),
    confidence_score: Number(row.confidence_score ?? 0),
    confidence_details: (row.confidence_details as CaldwellInvoice["confidence_details"]) ?? {
      vendor_name: 0,
      invoice_number: 0,
      total_amount: 0,
      job_reference: 0,
      cost_code_suggestion: 0,
    },
    status: row.status as CaldwellInvoice["status"],
    received_date: (row.received_date as string | null) ?? "",
    payment_date: (row.payment_date as string | null) ?? null,
    draw_id: (row.draw_id as string | null) ?? null,
    line_items: Array.isArray(row.line_items)
      ? (row.line_items as CaldwellInvoice["line_items"])
      : [],
    flags: [], // Caldwell-only field; no DB column. F1-Wave-B may add.
    original_file_url: (row.original_file_url as string | null) ?? null,
  };

  // Vendor prop: View signature accepts { id, name }. Per Wave-E
  // ITER-2-PATCHES.md §3.1: vendor is OPTIONAL on real invoices
  // (unmatched-state invoice has vendor_id NULL pending PM review). The
  // narrowed embed (id, name, address) satisfies View when vendor exists;
  // when vendor_id is NULL, fall back to vendor_name_raw so the matching
  // workflow can render. Per E-1 PII fence, phone + email are
  // intentionally NOT included.
  const vendor = vendorEmbed
    ? { id: vendorEmbed.id, name: vendorEmbed.name }
    : {
        id: "",
        name: (row.vendor_name_raw as string | null) ?? "Unknown Vendor",
      };

  // Job prop: View signature accepts { id, name }.
  const job = { id: jobEmbed.id, name: jobEmbed.name };

  // CostCode prop: View signature accepts { id, code, description } | null.
  const costCode = costCodeEmbed
    ? {
        id: costCodeEmbed.id,
        code: costCodeEmbed.code,
        description: costCodeEmbed.description,
      }
    : null;

  return (
    <div data-direction="C" data-palette="B" className="design-system-scope">
      <InvoiceReviewView
        invoice={invoice}
        vendor={vendor}
        job={job}
        costCode={costCode}
        breadcrumbRoot={{ href: "/financials/bills", label: "Bills" }}
      />
    </div>
  );
}
