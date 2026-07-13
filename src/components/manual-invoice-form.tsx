"use client";

// 2.5 (part b) — minimal manual-entry fallback so invoice intake survives an AI
// outage. Fields: vendor, invoice #, date, job, line items (description +
// amount + optional cost code). Submits into the SAME create pipeline as an AI
// upload (/api/invoices/save) — duplicate detection, allocation, payment-date,
// cost-code derivation, and status routing all come for free. confidence 1.0
// routes it to the PM Queue (determineStatus >= 0.7 → pm_review); flagged
// "manual_entry" for provenance. Minimal by design — no file, no AI.

import { useMemo, useState } from "react";
import CostCodeCombobox, { type CostCodeOption } from "@/components/cost-code-combobox";
import NwButton from "@/components/nw/Button";
import { friendlyIngestError } from "@/lib/invoices/friendly-error";
import type { ParsedInvoice } from "@/lib/types/invoice";

type ManualLine = { description: string; amountStr: string; costCodeId: string | null };

const fieldInput =
  "w-full px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:border-[var(--nw-stone-blue)] focus:outline-none";
const fieldLabel =
  "block mb-1 text-[11px] font-medium text-[color:var(--text-secondary)] uppercase tracking-wider";

function newLine(): ManualLine {
  return { description: "", amountStr: "", costCodeId: null };
}

export default function ManualInvoiceForm({
  jobOptions,
  costCodeOptions,
  onSaved,
}: {
  jobOptions: { id: string; name: string }[];
  costCodeOptions: CostCodeOption[];
  onSaved?: (count: number) => void;
}) {
  const [vendor, setVendor] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [jobId, setJobId] = useState("");
  const [lines, setLines] = useState<ManualLine[]>([newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const total = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.amountStr) || 0), 0),
    [lines],
  );
  const fmtUsd = (n: number) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  function patchLine(i: number, patch: Partial<ManualLine>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, newLine()]);
  }
  function removeLine(i: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  async function submit() {
    if (submitting) return;
    if (!vendor.trim()) {
      setError("Vendor is required.");
      return;
    }
    const validLines = lines.filter(
      (l) => l.description.trim() && Number(l.amountStr) > 0,
    );
    if (validLines.length === 0) {
      setError("Add at least one line with a description and an amount.");
      return;
    }
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const job = jobOptions.find((j) => j.id === jobId) ?? null;
    const parsed: ParsedInvoice = {
      vendor_name: vendor.trim(),
      vendor_address: null,
      invoice_number: invoiceNumber.trim() || null,
      invoice_date: invoiceDate || null,
      po_reference: null,
      job_reference: null,
      description: "Manually entered",
      invoice_type: "lump_sum",
      co_reference: null,
      line_items: validLines.map((l) => {
        const cc = l.costCodeId
          ? costCodeOptions.find((o) => o.id === l.costCodeId) ?? null
          : null;
        return {
          description: l.description.trim(),
          date: null,
          qty: null,
          unit: null,
          rate: null,
          amount: Number(l.amountStr),
          cost_code_suggestion: cc
            ? { code: cc.code, description: cc.description, confidence: 1, source: "ai" as const }
            : null,
        };
      }),
      subtotal: total,
      tax: null,
      total_amount: total,
      // Human-entered → full confidence so it routes to the PM Queue like a
      // clean upload (determineStatus >= 0.7 → pm_review).
      confidence_score: 1,
      confidence_details: {
        vendor_name: 1,
        invoice_number: 1,
        total_amount: 1,
        job_reference: job ? 1 : 0,
        cost_code_suggestion: 1,
      },
      flags: ["manual_entry"],
      job_resolution: job ? { id: job.id, name: job.name } : null,
      document_type: "invoice",
    };

    try {
      const res = await fetch("/api/invoices/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parsed,
          file_url: "",
          file_name: `manual-${vendor.trim().slice(0, 40)}`,
          file_type: "pdf",
          document_type: "invoice",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        duplicate?: boolean;
        existing?: { vendor_name_raw?: string };
      };
      if (!res.ok) {
        setError(friendlyIngestError(data?.error));
        return;
      }
      if (data?.duplicate) {
        setError(
          `This looks like an invoice already in the system (${data.existing?.vendor_name_raw ?? "existing"}). Not saved.`,
        );
        return;
      }
      setSuccess(`Saved — ${vendor.trim()} (${fmtUsd(total)}) is in the PM Queue.`);
      setVendor("");
      setInvoiceNumber("");
      setInvoiceDate("");
      setJobId("");
      setLines([newLine()]);
      onSaved?.(1);
    } catch {
      setError("Couldn't save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
      <p className="mb-5 text-sm text-[color:var(--text-secondary)]">
        Enter an invoice by hand — no AI needed. It enters the normal PM review
        queue like any upload.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={fieldLabel} htmlFor="mi-vendor">Vendor *</label>
          <input
            id="mi-vendor"
            type="text"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="Vendor name"
            className={fieldInput}
            disabled={submitting}
          />
        </div>
        <div>
          <label className={fieldLabel} htmlFor="mi-number">Invoice #</label>
          <input
            id="mi-number"
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Optional"
            className={fieldInput}
            disabled={submitting}
          />
        </div>
        <div>
          <label className={fieldLabel} htmlFor="mi-date">Invoice Date</label>
          <input
            id="mi-date"
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className={fieldInput}
            disabled={submitting}
          />
        </div>
        <div>
          <label className={fieldLabel} htmlFor="mi-job">Job</label>
          <select
            id="mi-job"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            className={fieldInput}
            disabled={submitting}
          >
            <option value="">— Unassigned —</option>
            {jobOptions.map((j) => (
              <option key={j.id} value={j.id}>{j.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className={fieldLabel}>Line Items</span>
          <span className="text-[11px] text-[color:var(--text-tertiary)]">
            Total <span className="font-mono text-[color:var(--text-primary)]">{fmtUsd(total)}</span>
          </span>
        </div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={l.description}
                  onChange={(e) => patchLine(i, { description: e.target.value })}
                  placeholder="Description"
                  className={fieldInput}
                  disabled={submitting}
                />
              </div>
              <div className="w-40 shrink-0">
                <CostCodeCombobox
                  value={l.costCodeId}
                  onChange={(id) => patchLine(i, { costCodeId: id })}
                  options={costCodeOptions}
                  placeholder="Cost code"
                />
              </div>
              <div className="w-32 shrink-0">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={l.amountStr}
                  onChange={(e) => patchLine(i, { amountStr: e.target.value })}
                  placeholder="0.00"
                  className={`${fieldInput} text-right`}
                  disabled={submitting}
                />
              </div>
              <button
                type="button"
                onClick={() => removeLine(i)}
                disabled={submitting || lines.length === 1}
                aria-label="Remove line"
                className="h-[38px] w-8 shrink-0 text-[color:var(--text-tertiary)] hover:text-[color:var(--nw-danger)] disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addLine}
          disabled={submitting}
          className="mt-2 text-[12px] text-[color:var(--nw-stone-blue)] hover:text-[color:var(--nw-gulf-blue)] disabled:opacity-50"
        >
          + Add line
        </button>
      </div>

      {error && (
        <p className="mt-4 border border-[rgba(176,85,78,0.35)] bg-[rgba(176,85,78,0.12)] px-3 py-2 text-[13px] text-[color:var(--nw-danger)]">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 border border-[rgba(74,138,111,0.4)] bg-[rgba(74,138,111,0.12)] px-3 py-2 text-[13px] text-[color:var(--nw-success)]">
          {success}
        </p>
      )}

      <div className="mt-6 flex justify-end">
        <NwButton variant="primary" size="md" onClick={submit} disabled={submitting} loading={submitting}>
          {submitting ? "Saving…" : "Save & Route to Queue"}
        </NwButton>
      </div>
    </div>
  );
}
