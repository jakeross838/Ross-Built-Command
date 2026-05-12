// src/app/design-system/prototypes/invoices/[id]/page.tsx
//
// Thin wrapper for the invoice approval prototype (Stage 1.5c Plan 2).
//
// Per CONTEXT D-03: this wrapper does fixture lookup + passes resolved
// entities into InvoiceReviewView. Production routes at
// /financials/bills/[id] (Plan 3) re-import the SAME InvoiceReviewView
// with different fixture lookups (or real Supabase queries at F1).
//
// Site Office direction inherited from prototypes/layout.tsx
// (data-direction="C" data-palette="B" + .design-system-scope wrap).
//
// Hook T10c — wrapper imports fixtures freely (per AUDIT-LOG-STRATEGY.md
// T10c posture finding: production-route fixture imports verified silent).

import { notFound } from "next/navigation";
import {
  CALDWELL_INVOICES,
  CALDWELL_VENDORS,
  CALDWELL_JOBS,
  CALDWELL_COST_CODES,
} from "@/app/design-system/_fixtures/drummond";
import InvoiceReviewView from "@/components/prototypes/InvoiceReviewView";

export default function InvoicePrototypePage({
  params,
}: {
  params: { id: string };
}) {
  const inv = CALDWELL_INVOICES.find((i) => i.id === params.id);
  if (!inv) return notFound();

  const vendor = CALDWELL_VENDORS.find((v) => v.id === inv.vendor_id);
  const job = CALDWELL_JOBS.find((j) => j.id === inv.job_id);
  const costCode = inv.cost_code_id
    ? CALDWELL_COST_CODES.find((c) => c.id === inv.cost_code_id) ?? null
    : null;

  if (!vendor || !job) return notFound();

  return (
    <InvoiceReviewView
      invoice={inv}
      vendor={vendor}
      job={job}
      costCode={costCode}
      breadcrumbRoot={{
        href: "/design-system/prototypes/",
        label: "Prototypes",
      }}
    />
  );
}
