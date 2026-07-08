// src/app/financials/pay-apps/[id]/print/page.tsx
//
// Production route — Pay App print preview (Stage 1.5c Plan 3 thin
// wrapper, F10-wired to public.draws per nwrp271, 2026-06-11).
//
// PRIOR IMPLEMENTATION: Caldwell fixture thin-wrapper (same F10 defect
// as the sibling detail route — see F-INV-1-RETRO-SWEEP.md Part C). Now
// mounts DrawPrintView with REAL recomputed G702/G703 data via the
// shared loader (_data.ts — E-3 pattern, full posture + FK citations
// documented there).
//
// Per CONTEXT D-15 (Q7 override): print fidelity is tiered (G702 cover
// pixel-perfect attempt against AIA G702-1992; G703 detail at 80%
// fidelity). Per CONTEXT D-19: outer wraps in .design-system-scope for
// the chrome (back link, action button); DrawPrintView's scoped
// <style jsx global> overrides body styling at @media print regardless.
//
// Owner block PII posture: job shim carries client full_name + job
// address only (client email/phone intentionally empty per D-078/D-079
// fence — the G702 owner block renders name + address).

import { notFound } from "next/navigation";
import DrawPrintView from "@/components/prototypes/DrawPrintView";
import CostPlusStatementPrintView from "@/components/prototypes/CostPlusStatementPrintView";
import { loadPayAppViewData } from "../_data";

export default async function PayAppPrintPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await loadPayAppViewData(params.id);
  if (!data) return notFound();

  const backHref = `/financials/pay-apps/${data.draw.id}`;

  return (
    <div data-direction="C" data-palette="B" className="design-system-scope">
      {data.billingMethod === "cost_plus_statement" && data.statement ? (
        <CostPlusStatementPrintView
          jobName={data.job.name}
          statement={data.statement}
          backHref={backHref}
        />
      ) : (
        <DrawPrintView
          draw={data.draw}
          job={data.job}
          lineItems={data.lineItems}
          costCodes={data.costCodes}
          changeOrdersThroughThisDraw={data.changeOrdersThroughThisDraw}
          backHref={backHref}
        />
      )}
    </div>
  );
}
