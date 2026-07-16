"use client";

/**
 * AllocationGrid — Stage-2 review redesign. Drop-in replacement for
 * InvoiceAllocationsEditor: SAME props + imperative ref (isDirty/save) so the
 * review page wiring is unchanged, but the table is the Excel-pure
 * SpreadsheetGrid (Description · Cost code · Amount) with the balance-impact
 * strip below it. Data contract is identical — GET/PUT
 * /api/invoices/[id]/allocations — so approval + persistence behaviour is
 * untouched (firewalls F1/F2). Baselines for the strip come from the read-only
 * GET /api/invoices/[id]/balance-impact.
 */
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { formatCents } from "@/lib/utils/format";
import NwButton from "@/components/nw/Button";
import CostCodeCombobox, { type CostCodeOption } from "@/components/cost-code-combobox";
import SpreadsheetGrid, { type GridColumn } from "@/components/nw/SpreadsheetGrid";
import BalanceImpactStrip from "@/components/invoices/BalanceImpactStrip";
import type { CodeBaseline } from "@/lib/invoices/balance-impact";

type Allocation = {
  id?: string;
  cost_code_id: string | null;
  amount_cents: number;
  description: string | null;
  /** 00122 multi-job split — the job this portion bills to (null = header). */
  job_id?: string | null;
};

export type AllocationJobOption = { id: string; name: string };

export type AllocationGridHandle = {
  isDirty: () => boolean;
  save: () => Promise<boolean>;
};

function parseDollarsToCents(raw: string): number {
  const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? 0 : Math.round(n * 100);
}
function fmtAmount(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const AllocationGrid = forwardRef<
  AllocationGridHandle,
  {
    invoiceId: string;
    invoiceTotalCents: number;
    costCodes: CostCodeOption[];
    readOnly?: boolean;
    onChange?: () => void;
    /** Display-only: reports the live allocation sum so the review modal's
     *  footer can show ✓ BALANCED / $X UNALLOCATED (Stage-1 chrome). Never
     *  gates any behavior. Pass a stable (useCallback) fn. */
    onBalanceChange?: (info: { sumCents: number; balanced: boolean }) => void;
    /** 00122 multi-job split (Q4 override): org-scoped active jobs for the
     *  per-row Job column. The column is HIDDEN while all rows share one
     *  job; it auto-reveals when loaded rows span >1 job, or via the
     *  explicit "Split to another job…" affordance. */
    jobs?: AllocationJobOption[];
    /** The invoice's header job — the default for new/unsplit rows. */
    headerJobId?: string | null;
  }
>(function AllocationGrid({ invoiceId, invoiceTotalCents, costCodes, readOnly, onChange, onBalanceChange, jobs, headerJobId }, ref) {
  const [rows, setRows] = useState<Allocation[]>([]);
  const [initialSnapshot, setInitialSnapshot] = useState("[]");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const [baselines, setBaselines] = useState<Record<string, CodeBaseline>>({});
  const [jobNames, setJobNames] = useState<Record<string, string>>({});
  const [showJobColumn, setShowJobColumn] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/invoices/${invoiceId}/allocations`);
    const data = await res.json();
    const loaded: Allocation[] = data.allocations ?? [];
    setRows(loaded);
    setInitialSnapshot(JSON.stringify(loaded));
    // Q4 override: auto-reveal the Job column when the persisted rows
    // already span more than one job.
    const distinctJobs = new Set(
      loaded.map((r) => r.job_id ?? headerJobId).filter(Boolean)
    );
    if (distinctJobs.size > 1) setShowJobColumn(true);
    setLoading(false);
  }
  async function loadBaselines() {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/balance-impact`);
      if (res.ok) {
        const body = await res.json();
        setBaselines(body.baselines ?? {});
        setJobNames(body.jobNames ?? {});
      }
    } catch {
      /* strip degrades to empty — display-only, never blocks review */
    }
  }

  useEffect(() => {
    load();
    loadBaselines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const sum = useMemo(() => rows.reduce((s, r) => s + Math.round(r.amount_cents || 0), 0), [rows]);
  const balanced = sum === invoiceTotalCents;
  useEffect(() => {
    onBalanceChange?.({ sumCents: sum, balanced });
  }, [sum, balanced, onBalanceChange]);
  const anyCostCodeMissing = rows.some((r) => !r.cost_code_id);
  const isDirty = JSON.stringify(rows) !== initialSnapshot;
  const canEdit = !readOnly && !locked;

  const codeOptions = useMemo(
    () => [...costCodes].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
    [costCodes]
  );
  const codeLabelById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of costCodes) m[c.id] = c.code;
    return m;
  }, [costCodes]);

  function updateRow(i: number, patch: Partial<Allocation>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function addRow() {
    const remaining = Math.max(0, invoiceTotalCents - sum);
    setRows((prev) => [...prev, { cost_code_id: null, amount_cents: remaining, description: null }]);
  }
  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function save(): Promise<boolean> {
    if (!balanced) {
      setError(`Rows sum to ${formatCents(sum)} but invoice total is ${formatCents(invoiceTotalCents)}.`);
      return false;
    }
    if (anyCostCodeMissing) {
      setError("Every allocation must have a cost code.");
      return false;
    }
    setSaving(true);
    setError(null);
    setWarnings([]);
    setLocked(false);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/allocations`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allocations: rows.map((r) => ({
            cost_code_id: r.cost_code_id,
            amount_cents: Math.round(r.amount_cents || 0),
            description: r.description,
            // 00122: per-portion job (omit → server defaults to header).
            job_id: r.job_id ?? headerJobId ?? undefined,
          })),
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setLocked(true);
        setError(data.error ?? "Cannot edit: this invoice is on a submitted draw.");
        return false;
      }
      if (res.status === 422 && data?.error === "split_invalid") {
        setError(data.message ?? "Split allocation failed validation.");
        return false;
      }
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      // Q3 advisory: budget-line-per-(job,code) gaps surface as warnings.
      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        setWarnings(data.warnings as string[]);
      }
      await load();
      await loadBaselines();
      onChange?.();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      return false;
    } finally {
      setSaving(false);
    }
  }

  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;
  const saveRef = useRef<() => Promise<boolean>>(save);
  saveRef.current = save;
  useImperativeHandle(ref, () => ({ isDirty: () => isDirtyRef.current, save: () => saveRef.current() }), []);

  const jobOptions = jobs ?? [];
  const columns: GridColumn<Allocation>[] = useMemo(
    () => [
      {
        key: "description",
        header: "Description",
        width: "minmax(160px,1fr)",
        kind: "text",
        display: (r) => (r.description ? r.description : <span style={{ color: "var(--text-muted)" }}>—</span>),
        getValue: (r) => r.description ?? "",
        setValue: (r, raw) => ({ ...r, description: raw }),
        editable: canEdit,
      },
      // 00122 Job column (Q4 override): hidden while uniform; revealed by
      // auto-detection (load) or the "Split to another job…" affordance.
      ...(showJobColumn
        ? ([
            {
              key: "job",
              header: "Job",
              width: "150px",
              kind: "combobox",
              editable: false, // the select owns its own interaction
              display: (r: Allocation, i: number) => (
                <select
                  value={r.job_id ?? headerJobId ?? ""}
                  onChange={(e) => updateRow(i, { job_id: e.target.value || null })}
                  disabled={!canEdit}
                  className="nw-grid-jobselect"
                  aria-label="Job for this allocation"
                >
                  {jobOptions.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.name}
                    </option>
                  ))}
                </select>
              ),
            },
          ] as GridColumn<Allocation>[])
        : []),
      {
        key: "cost_code",
        header: "Cost code",
        width: "150px",
        kind: "combobox",
        editable: false, // the combobox owns its own open/type-to-filter panel
        invalid: (r) => !r.cost_code_id,
        display: (r, i) => (
          <div style={{ width: "100%", padding: "0 6px" }}>
            <CostCodeCombobox
              value={r.cost_code_id}
              onChange={(id) => updateRow(i, { cost_code_id: id })}
              options={codeOptions}
              disabled={!canEdit}
              size="sm"
              ariaLabel="Cost code"
              placeholder="Select…"
              className={!r.cost_code_id ? "border-[rgba(176,85,78,0.55)]" : ""}
            />
          </div>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        width: "120px",
        kind: "number",
        align: "right",
        display: (r) => fmtAmount(r.amount_cents),
        getValue: (r) => (r.amount_cents / 100).toFixed(2),
        setValue: (r, raw) => ({ ...r, amount_cents: parseDollarsToCents(raw) }),
        editable: canEdit,
      },
    ],
    [canEdit, codeOptions, showJobColumn, headerJobId, jobOptions] // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (loading) {
    return <div className="text-xs text-[color:var(--text-secondary)] py-2">Loading allocations…</div>;
  }

  return (
    <div className="nw-redesign flex flex-col gap-4">
      {locked && (
        <div className="text-[11px] text-[color:var(--nw-warn)] border border-[rgba(201,138,59,0.35)] bg-[rgba(201,138,59,0.08)] px-2 py-1">
          Cannot edit: this invoice is on a submitted draw.
        </div>
      )}

      <SpreadsheetGrid
        ariaLabel="Cost code allocation"
        rows={rows}
        columns={columns}
        onRowsChange={setRows}
        readOnly={!canEdit}
        onRemoveRow={removeRow}
        footer={
          <div className="nw-foot-inner">
            <span className="nw-foot-label">Allocated · of {formatCents(invoiceTotalCents)}</span>
            <span
              className="tabular"
              style={{ color: balanced ? "var(--nw-success)" : "var(--nw-danger)", fontWeight: 600, fontSize: "13px" }}
            >
              {balanced
                ? `✓ Balanced ${formatCents(sum)}`
                : sum > invoiceTotalCents
                  ? `Over-allocated ${formatCents(sum - invoiceTotalCents)}`
                  : `Unallocated ${formatCents(invoiceTotalCents - sum)}`}
            </span>
          </div>
        }
      />

      {canEdit && (
        <div className="flex items-center gap-3 flex-wrap">
          <NwButton variant="secondary" size="sm" onClick={addRow} disabled={saving}>
            + Add allocation
          </NwButton>
          {!showJobColumn && jobOptions.length > 1 && (
            <button
              type="button"
              className="nw-review-quietlink"
              onClick={() => setShowJobColumn(true)}
              title="Reveal a per-row Job column to split this invoice across jobs"
            >
              Split to another job…
            </button>
          )}
          {(isDirty || !balanced || anyCostCodeMissing) && (
            <NwButton
              variant="primary"
              size="sm"
              onClick={save}
              disabled={saving || !balanced || anyCostCodeMissing}
              loading={saving}
              title={anyCostCodeMissing ? "Every allocation needs a cost code" : !balanced ? "Allocations must sum to the invoice total" : ""}
            >
              Save allocations
            </NwButton>
          )}
        </div>
      )}

      {error && (
        <div className="border border-[rgba(176,85,78,0.35)] bg-[rgba(176,85,78,0.08)] px-2 py-1 text-xs text-[color:var(--nw-danger)]">
          {error}
        </div>
      )}
      {warnings.length > 0 && (
        <div className="border border-[rgba(201,138,59,0.35)] bg-[rgba(201,138,59,0.08)] px-2 py-1 text-xs text-[color:var(--nw-warn)]">
          {warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}

      <BalanceImpactStrip
        rows={rows}
        baselines={baselines}
        codeLabelById={codeLabelById}
        headerJobId={headerJobId}
        jobNames={jobNames}
      />
    </div>
  );
});

export default AllocationGrid;
