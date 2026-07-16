"use client";

/**
 * Balance-impact strip (Stage-2 review redesign; 00122 multi-job aware). One
 * row per distinct (job, cost code) the invoice touches: code · scope
 * (PO {number} | Budget) · after-value. Ink when comfortable, amber when tight
 * (≤12% of scope), red "$X over" when negative — the same red the over-budget
 * confirm dialog uses. Prior balance ("Was $X before this invoice") +
 * committed-cost note surface on hover only. When the live rows span >1 job
 * the rows group under a job-name eyebrow (Jake's B1 spec: "strip groups by
 * job+code").
 *
 * READ-ONLY DISPLAY. Math is the unit-tested pure functions in
 * src/lib/invoices/balance-impact.ts (keys are opaque `${job}::${code}`
 * composites); baselines come from GET /api/invoices/[id]/balance-impact
 * (reviewed-invoice-EXCLUDED).
 */
import { useMemo } from "react";
import {
  computeImpactRows,
  codeOrderFromRows,
  liveSumByCode,
  scopeKey,
  parseScopeKey,
  type CodeBaseline,
} from "@/lib/invoices/balance-impact";

type GridRow = { cost_code_id: string | null; amount_cents: number; job_id?: string | null };

export default function BalanceImpactStrip({
  rows,
  baselines,
  codeLabelById,
  headerJobId,
  jobNames,
}: {
  rows: GridRow[];
  /** keyed `${jobId}::${costCodeId}` — from the balance-impact route. */
  baselines: Record<string, CodeBaseline>;
  /** cost_code_id → display code, e.g. "15-410". */
  codeLabelById: Record<string, string>;
  /** The invoice's header job — rows without an explicit job default here. */
  headerJobId?: string | null;
  /** job id → display name (from the balance-impact route). */
  jobNames?: Record<string, string>;
}) {
  const impacts = useMemo(() => {
    const keyRows = rows.map((r) => {
      const job = r.job_id ?? headerJobId ?? "";
      return {
        cost_code: r.cost_code_id ? scopeKey(job, r.cost_code_id) : null,
        amount_cents: r.amount_cents,
      };
    });
    const order = codeOrderFromRows(keyRows);
    const sums = liveSumByCode(keyRows);
    return computeImpactRows(order, sums, baselines);
  }, [rows, baselines, headerJobId]);

  const multiJob = useMemo(
    () => new Set(impacts.map((im) => parseScopeKey(im.code).jobId)).size > 1,
    [impacts]
  );

  if (impacts.length === 0) return null;

  let lastJob: string | null = null;

  return (
    <div className="nw-impact-strip" aria-label="Balance impact if approved">
      <div className="nw-impact-eyebrow">Balance impact · if approved</div>
      {impacts.map((im) => {
        const { jobId, costCodeId } = parseScopeKey(im.code);
        const showJobHead = multiJob && jobId !== lastJob;
        lastJob = jobId;
        return (
          <div key={im.code}>
            {showJobHead ? (
              <div className="nw-impact-jobhead">{jobNames?.[jobId] ?? "—"}</div>
            ) : null}
            <div className="nw-impact-row" title={im.wasLabel}>
              <span className="nw-impact-code">{codeLabelById[costCodeId] ?? costCodeId}</span>
              <span className="nw-impact-scope">{im.scopeLabel}</span>
              <span
                className={
                  "nw-impact-after " +
                  (im.tone === "over" ? "is-over" : im.tone === "tight" ? "is-tight" : "is-ink")
                }
              >
                {im.afterLabel}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
