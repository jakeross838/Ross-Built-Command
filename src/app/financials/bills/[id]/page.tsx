// src/app/financials/bills/[id]/page.tsx
//
// Production route — Bill review (Stage 1.5c Plan 3 thin wrapper).
// Mounts InvoiceReviewView from src/components/prototypes/ with Caldwell
// fixtures; F1 swaps fixtures for real Supabase queries on this wrapper
// side, View unchanged.
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
// this route renders. F1 wires real getCurrentMembership() + Supabase
// data fetch on this wrapper; View receives same prop shape.
//
// Hook T10c — fixture import is silent in production paths per Plan 2
// architect Option A finding.

import { notFound } from "next/navigation";
import {
  CALDWELL_INVOICES,
  CALDWELL_VENDORS,
  CALDWELL_JOBS,
  CALDWELL_COST_CODES,
} from "@/app/design-system/_fixtures/drummond";
import InvoiceReviewView from "@/components/prototypes/InvoiceReviewView";

export default function BillReviewPage({
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
    <div data-direction="C" data-palette="B" className="design-system-scope">
      <InvoiceReviewView
        invoice={inv}
        vendor={vendor}
        job={job}
        costCode={costCode}
        breadcrumbRoot={{ href: "/financials/bills", label: "Bills" }}
      />
    </div>
  );
}
