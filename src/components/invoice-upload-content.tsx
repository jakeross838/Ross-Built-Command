"use client";

import { useState, useCallback, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import DOMPurify from "isomorphic-dompurify";
import type { ParseResult, ParsedInvoice } from "@/lib/types/invoice";
import {
 formatDollars, confidenceColor, confidenceLabel,
 formatInvoiceType, formatFlag, formatDocumentType, formatDate,
} from "@/lib/utils/format";
import NwButton from "@/components/nw/Button";
import CostCodeCombobox, { type CostCodeOption } from "@/components/cost-code-combobox";
import { useJobFilter } from "@/components/job-filter/JobFilterProvider";
import { friendlyIngestError } from "@/lib/invoices/friendly-error";
import ManualInvoiceForm from "@/components/manual-invoice-form";
import ImportPageContent from "@/components/invoice-import-content";


type ParseStep = "uploading" | "analyzing" | "extracting" | "matching" | "complete";

const PARSE_STEPS: { key: ParseStep; label: string }[] = [
 { key: "uploading", label: "Uploading file..." },
 { key: "analyzing", label: "Analyzing document..." },
 { key: "extracting", label: "Extracting invoice data..." },
 { key: "matching", label: "Matching vendor and job..." },
 { key: "complete", label: "Complete" },
];

/** Per-file edits the user makes in the review card before Save & Route.
 *  undefined on a key = untouched; the card falls back to the parsed value. */
type FileEdits = {
 /** Job resolution override. undefined = untouched (use parsed.job_resolution);
  *  a job = assigned/created; null = explicitly cleared (NO job). */
 job?: { id: string; name: string } | null;
 /** Invoice-level cost-code correction (id + code). */
 costCode?: { id: string; code: string } | null;
 vendor?: string;
 invoiceNumber?: string;
 invoiceDate?: string;
 /** CO badge dismissed by the user. */
 coDismissed?: boolean;
 /** Per-line-item cost-code overrides, keyed by line index. */
 lineCodes?: Record<number, { id: string; code: string }>;
};

type FileStatus = {
 file: File;
 objectUrl: string;
 status: "uploading" | "done" | "error";
 parseStep: ParseStep;
 startedAt: number;
 result?: ParseResult;
 error?: string;
 saved?: boolean;
 saving?: boolean;
 edits?: FileEdits;
};

type DuplicateInfo = {
 fileIndex: number;
 existing: {
 id: string;
 vendor_name_raw: string;
 total_amount: number;
 status: string;
 };
};

const ACCEPTED_EXTENSIONS = ".pdf,.docx,.xlsx,.jpg,.jpeg,.png";
const ACCEPTED_MIME_TYPES = [
 "application/pdf", "image/jpeg", "image/png",
 "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
 "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function isAcceptedFile(file: File): boolean {
 if (ACCEPTED_MIME_TYPES.includes(file.type)) return true;
 const ext = file.name.split(".").pop()?.toLowerCase();
 return ["pdf", "docx", "xlsx", "jpg", "jpeg", "png"].includes(ext ?? "");
}

function ProgressSteps({ currentStep, startedAt, error }: { currentStep: ParseStep; startedAt: number; error?: string }) {
 const [elapsed, setElapsed] = useState(0);

 useEffect(() => {
 if (currentStep === "complete" || error) return;
 const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
 return () => clearInterval(interval);
 }, [currentStep, startedAt, error]);

 const currentIdx = PARSE_STEPS.findIndex(s => s.key === currentStep);

 return (
 <div className="px-6 py-5">
 <div className="space-y-2.5">
 {PARSE_STEPS.map((step, i) => {
 const isDone = i < currentIdx || currentStep === "complete";
 const isActive = i === currentIdx && currentStep !== "complete";
 const isPending = i > currentIdx && currentStep !== "complete";

 return (
 <div key={step.key} className={`flex items-center gap-3 transition-opacity duration-300 ${isPending ? "opacity-30" : "opacity-100"}`}>
 {/* Icon */}
 {isDone ? (
 <div className="w-5 h-5 bg-[rgba(74,138,111,0.24)] flex items-center justify-center flex-shrink-0">
 <svg className="w-3 h-3 text-[color:var(--nw-success)]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
 </div>
 ) : isActive ? (
 <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
 <div className="w-2.5 h-2.5 bg-[var(--nw-stone-blue)] animate-pulse" />
 </div>
 ) : (
 <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
 <div className="w-2 h-2 bg-[var(--border-default)]" />
 </div>
 )}
 {/* Label */}
 <span className={`text-sm ${isDone ? "text-[color:var(--text-secondary)]" : isActive ? "text-[color:var(--text-primary)] font-medium" : "text-[color:var(--text-secondary)]"}`}>
 {step.label}
 </span>
 </div>
 );
 })}
 </div>
 {/* Slow parse warning */}
 {elapsed >= 15 && currentStep !== "complete" && !error && (
 <p className="mt-3 text-xs text-[color:var(--text-secondary)] animate-fade-up">
 Complex documents take a bit longer — still working...
 </p>
 )}
 </div>
 );
}

function FilePreview({ fileStatus }: { fileStatus: FileStatus }) {
 const { file, objectUrl, result } = fileStatus;

 // PDF → iframe
 if (file.type === "application/pdf") {
 return <iframe src={objectUrl} className="w-full h-full min-h-[500px] border border-[var(--border-default)]" title={file.name} />;
 }

 // Image → img (click-to-zoom handled by InvoiceFilePreview in the detail view;
 // keeping the upload flow simple with a flat render)
 if (file.type.startsWith("image/")) {
 // eslint-disable-next-line @next/next/no-img-element
 return <img src={objectUrl} alt={file.name} className="w-full h-auto max-h-[600px] object-contain border border-[var(--border-default)]" />;
 }

 // DOCX → render mammoth HTML (included in the parse response)
 const isDocx =
 file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
 file.name.toLowerCase().endsWith(".docx");
 if (isDocx) {
 return (
 // DOCX preview surface stays white — paper metaphor, intentional across themes.
 <div className="border border-[var(--border-default)] bg-white">
 <div className="flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2">
 <span className="text-[11px] tracking-[0.08em] uppercase text-[color:var(--text-secondary)]">
 DOCX · {file.name}
 </span>
 <a
 href={objectUrl}
 download={file.name}
 className="inline-flex items-center gap-1 text-[11px] px-2 py-1 border border-[var(--nw-stone-blue)] text-[color:var(--nw-stone-blue)] hover:bg-[var(--nw-stone-blue)] hover:text-[color:var(--nw-white-sand)] transition-colors"
 >
 Download Original
 </a>
 </div>
 <div className="max-h-[600px] overflow-auto p-6 text-sm text-[color:var(--text-primary)] leading-relaxed docx-html">
 {result?.docx_html ? (
 // XSS guard: DOMPurify strips <script>, on*= handlers, and javascript: URLs.
 // Mammoth output is otherwise treated as untrusted (vendor-supplied DOCX).
 <div
 dangerouslySetInnerHTML={{
 __html: DOMPurify.sanitize(result.docx_html, { USE_PROFILES: { html: true } }),
 }}
 />
 ) : (
 <p className="text-[color:var(--text-secondary)] text-sm">
 DOCX preview will render after parsing completes.
 </p>
 )}
 </div>
 </div>
 );
 }

 // Unknown → download fallback
 return (
 <div className="flex items-center justify-center h-64 border border-[var(--border-default)] bg-[var(--bg-subtle)]">
 <div className="text-center">
 <svg className="mx-auto h-12 w-12 text-[color:var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
 </svg>
 <p className="mt-2 text-sm text-[color:var(--text-secondary)]">{file.name}</p>
 <a
 href={objectUrl}
 download={file.name}
 className="inline-flex items-center gap-1 mt-3 text-[12px] px-3 py-1.5 border border-[var(--nw-stone-blue)] text-[color:var(--nw-stone-blue)] hover:bg-[var(--nw-stone-blue)] hover:text-[color:var(--nw-white-sand)] transition-colors"
 >
 Download {file.name}
 </a>
 </div>
 </div>
 );
}

/** Effective (edited-or-parsed) cost code per line, grouped by code with summed
 *  amount + line count. The invoice-level cost code is DERIVED from this — there
 *  is no separate header picker. Dominant = the code with the largest amount. */
function summarizeLineCodes(
 parsed: ParsedInvoice,
 edits: FileEdits,
 options: CostCodeOption[]
) {
 const byCode = new Map<string, { id: string; code: string; description: string; amount: number; count: number }>();
 parsed.line_items.forEach((li, i) => {
 const edited = edits.lineCodes?.[i];
 const code = edited?.code ?? li.cost_code_suggestion?.code ?? null;
 if (!code) return;
 const opt = options.find((o) => o.code === code);
 const amt = li.amount ?? 0;
 const prev = byCode.get(code);
 if (prev) { prev.amount += amt; prev.count += 1; }
 else byCode.set(code, { id: edited?.id ?? opt?.id ?? "", code, description: opt?.description ?? "", amount: amt, count: 1 });
 });
 const allCodes = Array.from(byCode.values());
 // Line-coding completeness ("N lines" / "unassigned") counts every coded line,
 // any amount.
 const withCode = allCodes.reduce((s, c) => s + c.count, 0);
 // 2.3 determinism (#20): the count/summary shows ONLY codes that will persist
 // as allocations — those with amount > 0. This is the same rule the server
 // uses (save.ts codedByCode filters amount_cents > 0) and the invoices-list
 // "Multiple (N)" badge, so card == persisted == list. A $0-amount coded line
 // produces no allocation, so it must not inflate the code count.
 const codes = allCodes.filter((c) => c.amount > 0);
 const dominant = codes.slice().sort((a, b) => b.amount - a.amount)[0] ?? null;
 return { codes, dominant, distinct: codes.length, withCode, totalLines: parsed.line_items.length };
}

function ParsedDataCard({
 parsed,
 edits,
 onEdit,
 costCodeOptions,
 jobOptions,
 fileName,
}: {
 parsed: ParsedInvoice;
 edits: FileEdits;
 onEdit: (patch: Partial<FileEdits>) => void;
 costCodeOptions: CostCodeOption[];
 jobOptions: { id: string; name: string }[];
 fileName: string;
}) {
 const isNotInvoice = parsed.document_type && parsed.document_type !== "invoice";
 const allLineItemsZero = parsed.line_items.length > 0 && parsed.line_items.every(i => !i.amount || i.amount === 0);

 // Effective (edited-or-parsed) values used throughout the card.
 const effJob = edits.job !== undefined ? edits.job : (parsed.job_resolution ?? null);
 const isCO = !edits.coDismissed && (!!parsed.is_change_order || !!parsed.co_reference);

 // ONE cost-code model. When the AI (or the user) has coded the LINES, the
 // invoice code is DERIVED from them (read-only summary; edit on the lines).
 // When NO line carries a code — scope-only lump sums AND real invoices where
 // the AI only suggested an invoice-level code (e.g. 01103 on a deposit + fee) —
 // fall back to a single whole-invoice picker so the AI suggestion is visible
 // and correctable (and the from-history label shows). Never both pickers.
 const codeSummary = summarizeLineCodes(parsed, edits, costCodeOptions);
 const anyLineCoded = parsed.line_items.some((li, i) => !!(edits.lineCodes?.[i]?.code ?? li.cost_code_suggestion?.code));

 // Item 7 (visible) — the code(s) that uncoded fee lines + tax allocate to,
 // pro-rata. Coded-line invoices: the distinct line codes. Single-code
 // invoices: the invoice-level (edited-or-AI) code. Shown on every uncoded line
 // and on tax so no dollar is left with an invisible destination.
 const invoiceLevelCode = edits.costCode !== undefined ? (edits.costCode?.code ?? null) : (parsed.cost_code_suggestion?.code ?? null);
 const allocTargets = anyLineCoded ? codeSummary.codes.map((c) => c.code) : (invoiceLevelCode ? [invoiceLevelCode] : []);
 const followsLabel = allocTargets.length === 0 ? null : allocTargets.length === 1 ? `follows ${allocTargets[0]} (pro-rata)` : `pro-rata: ${allocTargets.join(", ")}`;

 // Math validation (client-side, tax-aware). Line items sum to the SUBTOTAL
 // (pre-tax); SUBTOTAL + TAX must equal the TOTAL. A taxed invoice is NOT a
 // mismatch just because the line items (pre-tax) are less than the total — we
 // only flag when the arithmetic genuinely fails.
 const lineItemsSum = parsed.line_items.reduce((sum, item) => sum + (item.amount ?? 0), 0);
 const mathMismatchInfo = (() => {
 const tax = parsed.tax ?? 0;
 const total = parsed.total_amount ?? null;
 const subtotal = parsed.subtotal && parsed.subtotal > 0 ? parsed.subtotal : null;

 // 1) Line items should sum to the subtotal (pre-tax). If no subtotal is
 //    stated, derive the pre-tax basis as total − tax.
 const preTaxBasis = subtotal ?? (total != null ? total - tax : null);
 if (parsed.line_items.length > 0 && preTaxBasis != null) {
 const diff = Math.abs(lineItemsSum - preTaxBasis);
 if (diff > 0.01) {
 return {
 message: `Line items sum to ${formatDollars(lineItemsSum)} but the ${subtotal != null ? "subtotal" : "pre-tax total"} is ${formatDollars(preTaxBasis)} — off by ${formatDollars(diff)}`,
 };
 }
 }
 // 2) Subtotal + tax must equal the total.
 if (subtotal != null && total != null) {
 const diff = Math.abs(subtotal + tax - total);
 if (diff > 0.01) {
 return {
 message: `Subtotal ${formatDollars(subtotal)} + tax ${formatDollars(tax)} = ${formatDollars(subtotal + tax)}, but the stated total is ${formatDollars(total)} — off by ${formatDollars(diff)}`,
 };
 }
 }
 return null;
 })();

 return (
 <div className="space-y-4">
 {/* Badges row */}
 <div className="flex items-center gap-2 flex-wrap">
 <span className={`inline-flex items-center px-3 py-1 text-sm font-medium border ${confidenceColor(parsed.confidence_score)}`}>
 {Math.round(parsed.confidence_score * 100)}% — {confidenceLabel(parsed.confidence_score)}
 </span>

 {/* Document type warning */}
 {isNotInvoice && (
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[rgba(201,138,59,0.12)] text-[color:var(--nw-warn)] border border-[rgba(201,138,59,0.25)]">
 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
 </svg>
 This appears to be a {formatDocumentType(parsed.document_type!)}, not an Invoice
 </span>
 )}

 {/* Math mismatch — only when the tax-aware arithmetic genuinely fails.
     Driven by the client re-check (authoritative from the extracted
     subtotal/tax/total), NOT the raw parser flag, which historically
     red-flagged every taxed invoice. */}
 {mathMismatchInfo && (
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[rgba(176,85,78,0.12)] text-[color:var(--nw-danger)] border border-[rgba(176,85,78,0.25)]">
 Math Mismatch: {mathMismatchInfo.message}
 </span>
 )}

 {/* CO badge — dismissible (Item 3). Only shows on explicit CO language. */}
 {isCO && (
 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[rgba(201,138,59,0.12)] text-[color:var(--nw-warn)] border border-[rgba(201,138,59,0.25)]">
 Change Order{parsed.co_reference ? ` — ${parsed.co_reference}` : ""}
 <button type="button" onClick={() => onEdit({ coDismissed: true })} aria-label="Dismiss change-order flag" className="ml-0.5 hover:opacity-70">
 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
 </button>
 </span>
 )}

 {/* Other flags */}
 {parsed.flags.filter(f => f !== "math_mismatch" && f !== "not_an_invoice" && f !== "change_order").map((flag) => (
 <span key={flag} className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium bg-[rgba(201,138,59,0.12)] text-[color:var(--nw-warn)] border border-[rgba(201,138,59,0.25)]">
 {formatFlag(flag)}
 </span>
 ))}
 </div>

 {/* Parse-time duplicate early-warning. A soft heads-up (the save-time guard
     is the hard block); links to the existing invoice. */}
 {parsed.possible_duplicate && (
 <div className="flex items-start gap-2 border border-[rgba(201,138,59,0.4)] bg-[rgba(201,138,59,0.08)] px-3 py-2.5">
 <svg className="w-4 h-4 flex-shrink-0 mt-0.5 text-[color:var(--nw-warn)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
 </svg>
 <div className="min-w-0 flex-1">
 <p className="text-sm font-medium text-[color:var(--nw-warn)]">Possibly already in the system</p>
 <p className="text-[11px] text-[color:var(--text-muted)] mt-0.5">
 {parsed.possible_duplicate.invoice_number ? `#${parsed.possible_duplicate.invoice_number} ` : ""}
 from {parsed.vendor_name}
 {parsed.possible_duplicate.invoice_date ? ` · saved ${formatDate(parsed.possible_duplicate.invoice_date)}` : ""}
 {" · "}{parsed.possible_duplicate.status.replace(/_/g, " ")}
 </p>
 </div>
 <a href={`/invoices/${parsed.possible_duplicate.id}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-[11px] uppercase tracking-wider text-nw-stone-blue hover:underline mt-0.5">View &rarr;</a>
 </div>
 )}

 {/* Job resolution (Item 1) — resolved real job or NO MATCH + picker. Never
     shows the raw reference text as if it were an assigned job. */}
 <JobResolver
 rawReference={parsed.job_reference}
 signals={{ job_reference: parsed.job_reference, vendor_name: parsed.vendor_name, description: parsed.description, filename: fileName }}
 job={effJob}
 untouched={edits.job === undefined}
 jobOptions={jobOptions}
 onChange={(job) => onEdit({ job })}
 />

 {/* Core Fields — vendor / # / date are click-to-edit (Item 4). */}
 <div className="grid grid-cols-2 gap-x-4 gap-y-3">
 <EditableField label="Vendor" value={edits.vendor ?? parsed.vendor_name} onSave={(v) => onEdit({ vendor: v })} />
 <EditableField label="Invoice #" value={edits.invoiceNumber ?? parsed.invoice_number} onSave={(v) => onEdit({ invoiceNumber: v })} />
 <EditableField label="Date" type="date" value={edits.invoiceDate ?? parsed.invoice_date} display={formatDate(edits.invoiceDate ?? parsed.invoice_date)} onSave={(v) => onEdit({ invoiceDate: v })} />
 <Field label="Type" value={formatInvoiceType(parsed.invoice_type)} />
 <Field label="PO Reference" value={parsed.po_reference} />
 {parsed.vendor_address && <Field label="Vendor Address" value={parsed.vendor_address} />}
 </div>

 {/* Cost code — ONE model (Item 1). Coded lines → read-only summary derived
     from the lines (edit on the lines below). No line coded (incl. AI
     invoice-level-only) → a single whole-invoice picker so the suggestion is
     visible + correctable. Never a header picker alongside line pickers. */}
 {anyLineCoded ? (
 <CostCodeSummary summary={codeSummary} />
 ) : (
 <CostCodeField
 parsed={parsed}
 edited={edits.costCode}
 options={costCodeOptions}
 onChange={(cc) => onEdit({ costCode: cc })}
 />
 )}


 {/* Description */}
 {parsed.description && (
 <div>
 <p className="text-[11px] font-medium text-[color:var(--text-secondary)] uppercase tracking-wider mb-1">Description</p>
 <p className="text-sm text-[color:var(--text-muted)]">{parsed.description}</p>
 </div>
 )}

 {/* Line Items — smart display */}
 {parsed.line_items.length > 0 && (
 <div>
 <p className="text-[11px] font-medium text-[color:var(--text-secondary)] uppercase tracking-wider mb-2">
 {allLineItemsZero ? "Scope Items" : "Line Items"}
 </p>
 {allLineItemsZero ? (
 // Scope-only display: just descriptions, no $0 columns
 <div className=" border border-[var(--border-default)] overflow-hidden">
 {parsed.line_items.map((item, i) => (
 <div key={i} className={`px-3 py-2 text-sm text-[color:var(--text-muted)] ${i > 0 ? "border-t border-[var(--border-default)]" : ""}`}>
 {item.description}
 </div>
 ))}
 </div>
 ) : (
 // Stacked line items — one block per line so nothing scrolls off the narrow
 // review panel (Item 6). Description + Amount on top; qty/unit/rate as a
 // compact meta line only when present; the cost-code picker full-width below.
 <div className="border border-[var(--border-default)] divide-y divide-[var(--border-default)]">
 {parsed.line_items.map((item, i) => {
 const lineCode = item.cost_code_suggestion?.code ?? null;
 const editedLine = edits.lineCodes?.[i];
 const initialOpt = lineCode ? costCodeOptions.find(o => o.code === lineCode) : undefined;
 const lineValue = editedLine?.id ?? initialOpt?.id ?? null;
 const hasMeta = item.qty != null || !!item.unit || item.rate != null;
 return (
 <div key={i} className="p-3 space-y-2">
 <div className="flex items-start justify-between gap-3">
 <p className="text-sm text-[color:var(--text-primary)] flex-1 min-w-0">{item.description}</p>
 <span className="text-sm font-medium text-[color:var(--text-primary)] flex-shrink-0 tabular-nums">{formatDollars(item.amount)}</span>
 </div>
 {hasMeta && (
 <p className="text-[11px] text-[color:var(--text-tertiary)] tabular-nums">
 {item.qty != null ? `${item.qty} ` : ""}{item.unit ?? ""}{item.rate != null ? ` @ ${formatDollars(item.rate)}` : ""}
 </p>
 )}
 <CostCodeCombobox
 size="sm"
 value={lineValue}
 options={costCodeOptions}
 placeholder={!lineValue && followsLabel ? "Override, or leave to follow…" : "Assign cost code…"}
 onChange={(id) => {
 const next = { ...(edits.lineCodes ?? {}) };
 if (id) { const opt = costCodeOptions.find(o => o.id === id); if (opt) next[i] = { id: opt.id, code: opt.code }; }
 else delete next[i];
 onEdit({ lineCodes: next });
 }}
 />
 {/* Item 7 visible — an uncoded line allocates pro-rata to the coded /
     invoice-level code(s); never a silent destination. Overridable above. */}
 {!lineValue && followsLabel && (
 <p className="text-[11px] text-[color:var(--nw-stone-blue)]">&rarr; {followsLabel}</p>
 )}
 </div>
 );
 })}
 </div>
 )}
 </div>
 )}

 {/* Totals */}
 <div className="border-t border-[var(--border-default)] pt-3 space-y-1.5">
 {parsed.subtotal > 0 && (
 <div className="flex justify-between text-sm">
 <span className="text-[color:var(--text-secondary)]">Subtotal</span>
 <span className="text-[color:var(--text-muted)]">{formatDollars(parsed.subtotal)}</span>
 </div>
 )}
 {parsed.tax != null && parsed.tax > 0 && (
 <div className="flex justify-between text-sm items-baseline gap-2">
 <span className="text-[color:var(--text-secondary)] min-w-0">
 Tax
 {/* Item 7 visible — tax allocates pro-rata to the coded / invoice-level
     code(s), same as the uncoded lines; never a silent destination. */}
 {followsLabel && <span className="ml-2 text-[11px] text-[color:var(--nw-stone-blue)]">&rarr; {followsLabel}</span>}
 </span>
 <span className="text-[color:var(--text-muted)] flex-shrink-0">{formatDollars(parsed.tax)}</span>
 </div>
 )}
 <div className="flex justify-between text-base font-semibold pt-1">
 <span className="text-[color:var(--text-primary)]">Total</span>
 <span className="text-[color:var(--nw-warn)] font-display text-lg">{formatDollars(parsed.total_amount)}</span>
 </div>
 </div>

 {/* Field Confidence */}
 {parsed.confidence_details && (
 <div className="pt-2">
 <p className="text-[11px] font-medium text-[color:var(--text-secondary)] uppercase tracking-wider mb-2">Field Confidence</p>
 <div className="grid grid-cols-2 gap-2">
 {Object.entries(parsed.confidence_details).map(([field, score]) => (
 <div key={field} className="flex items-center justify-between text-xs">
 <span className="text-[color:var(--text-secondary)]">{formatFlag(field)}</span>
 <span className={`px-1.5 py-0.5 ${confidenceColor(score)}`}>
 {Math.round(score * 100)}%
 </span>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
 return (
 <div>
 <p className="text-[11px] font-medium text-[color:var(--text-secondary)] uppercase tracking-wider">{label}</p>
 <p className="text-sm text-[color:var(--text-primary)] mt-0.5">{value || "—"}</p>
 </div>
 );
}

// Click-to-edit field (Item 4). Click the value → inline input; Enter/blur saves.
function EditableField({ label, value, onSave, type = "text", display }: {
 label: string;
 value: string | null | undefined;
 onSave: (v: string) => void;
 type?: string;
 display?: string | null;
}) {
 const [editing, setEditing] = useState(false);
 const [draft, setDraft] = useState(value ?? "");
 useEffect(() => { setDraft(value ?? ""); }, [value]);
 if (editing) {
 return (
 <div>
 <p className="text-[11px] font-medium text-[color:var(--text-secondary)] uppercase tracking-wider">{label}</p>
 <input
 autoFocus
 type={type}
 value={draft}
 onChange={(e) => setDraft(e.target.value)}
 onBlur={() => { setEditing(false); if (draft !== (value ?? "")) onSave(draft); }}
 onKeyDown={(e) => {
 if (e.key === "Enter") e.currentTarget.blur();
 if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false); }
 }}
 className="mt-0.5 w-full px-2 py-1 bg-[var(--bg-subtle)] border border-nw-stone-blue text-sm text-[color:var(--text-primary)] focus:outline-none"
 />
 </div>
 );
 }
 return (
 <button type="button" onClick={() => setEditing(true)} className="group text-left w-full">
 <p className="text-[11px] font-medium text-[color:var(--text-secondary)] uppercase tracking-wider">{label}</p>
 <p className="text-sm text-[color:var(--text-primary)] mt-0.5 border-b border-dashed border-transparent group-hover:border-[var(--border-strong)]">
 {(display ?? value) || <span className="text-[color:var(--text-muted)] italic">— click to add</span>}
 </p>
 </button>
 );
}

type JobSignals = { job_reference: string | null; vendor_name: string | null; description: string | null; filename: string | null };

// Item 1 + 3 — resolved job display OR NO MATCHING JOB + picker. Never presents
// raw reference text as an assigned job. Re-runs server resolution when the job
// list changes / the picker opens, so a job that didn't exist at parse time (or
// wasn't loaded yet) resolves without the user having to type.
function JobResolver({ rawReference, signals, job, untouched, jobOptions, onChange }: {
 rawReference: string | null;
 signals: JobSignals;
 job: { id: string; name: string } | null;
 untouched: boolean;
 jobOptions: { id: string; name: string }[];
 onChange: (job: { id: string; name: string } | null) => void;
}) {
 const [picking, setPicking] = useState(false);
 const [autoMatched, setAutoMatched] = useState(false);
 const triedRef = useRef("");

 // Re-resolve against the current job list when it changes (or on first mount)
 // — but only while the user hasn't touched the job and none is resolved yet.
 const reresolve = useCallback(async () => {
 if (!untouched || job) return;
 const key = jobOptions.map((j) => j.id).join(",");
 if (triedRef.current === key) return; // already tried this exact list
 triedRef.current = key;
 try {
 const res = await fetch("/api/jobs/resolve", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(signals),
 });
 const data = await res.json();
 if (data.job) { setAutoMatched(true); onChange(data.job); }
 } catch { /* silent — the manual picker remains */ }
 }, [untouched, job, jobOptions, signals, onChange]);

 const forceReresolve = useCallback(() => { triedRef.current = ""; reresolve(); }, [reresolve]);
 useEffect(() => { reresolve(); }, [reresolve]);
 useEffect(() => {
 window.addEventListener("nw:job-created", forceReresolve);
 return () => window.removeEventListener("nw:job-created", forceReresolve);
 }, [forceReresolve]);

 if (job && !picking) {
 return (
 <div className="border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2.5">
 <div className="flex items-center gap-2">
 <span className="text-[11px] font-medium text-[color:var(--text-secondary)] uppercase tracking-wider flex-shrink-0">Job</span>
 <span className="text-sm text-[color:var(--text-primary)] font-medium truncate">{job.name}</span>
 <button type="button" onClick={() => setPicking(true)} className="ml-auto text-[11px] uppercase tracking-wider text-nw-stone-blue hover:underline flex-shrink-0">Change</button>
 </div>
 {(autoMatched || rawReference) && <p className="mt-1 text-[11px] text-[color:var(--text-muted)]">Matched{rawReference ? ` from “${rawReference}”` : " automatically"}</p>}
 </div>
 );
 }
 return (
 <div className="border border-[rgba(201,138,59,0.35)] bg-[rgba(201,138,59,0.06)] px-3 py-2.5 space-y-2">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-[11px] font-semibold text-[color:var(--nw-warn)] uppercase tracking-wider">No Matching Job</span>
 {rawReference && <span className="text-[11px] text-[color:var(--text-muted)] truncate">reference: &ldquo;{rawReference}&rdquo;</span>}
 </div>
 <JobCombobox jobOptions={jobOptions} onOpen={forceReresolve} onPick={(j) => { onChange(j); setPicking(false); }} />
 </div>
 );
}

// Searchable job picker with create-in-place (POST /api/jobs). Dropdown portals
// to <body> so it escapes the card's overflow/scroll container (Item 2).
function JobCombobox({ jobOptions, onPick, onOpen }: {
 jobOptions: { id: string; name: string }[];
 onPick: (job: { id: string; name: string }) => void;
 onOpen?: () => void;
}) {
 const [search, setSearch] = useState("");
 const [open, setOpen] = useState(false);
 const [creating, setCreating] = useState(false);
 const [pos, setPos] = useState<{ left: number; width: number; maxHeight: number; top?: number; bottom?: number } | null>(null);
 const rootRef = useRef<HTMLDivElement>(null);
 const inputRef = useRef<HTMLInputElement>(null);
 const panelRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 if (!open) return;
 const h = (e: MouseEvent) => {
 const t = e.target as Node;
 if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
 setOpen(false);
 };
 document.addEventListener("mousedown", h);
 return () => document.removeEventListener("mousedown", h);
 }, [open]);

 useLayoutEffect(() => {
 if (!open || !inputRef.current) return;
 const reposition = () => {
 const el = inputRef.current;
 if (!el) return;
 const r = el.getBoundingClientRect();
 const vh = window.innerHeight, vw = window.innerWidth;
 const spaceBelow = vh - r.bottom, spaceAbove = r.top;
 const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
 const maxHeight = Math.max(160, Math.min(320, (openUp ? spaceAbove : spaceBelow) - 12));
 const width = Math.min(Math.max(r.width, 280), vw - 16);
 let left = r.left; if (left + width > vw - 8) left = Math.max(8, vw - 8 - width);
 setPos(openUp ? { left, width, maxHeight, bottom: vh - r.top + 4 } : { left, width, maxHeight, top: r.bottom + 4 });
 };
 reposition();
 window.addEventListener("scroll", reposition, true);
 window.addEventListener("resize", reposition);
 return () => { window.removeEventListener("scroll", reposition, true); window.removeEventListener("resize", reposition); };
 }, [open]);

 const q = search.trim().toLowerCase();
 const filtered = q ? jobOptions.filter(j => j.name.toLowerCase().includes(q)) : jobOptions;
 const exact = jobOptions.some(j => j.name.toLowerCase() === q);
 const showCreate = search.trim().length >= 2 && !exact;
 function openMenu() { setOpen(true); onOpen?.(); }
 async function createJob() {
 const name = search.trim();
 if (!name) return;
 setCreating(true);
 try {
 const res = await fetch("/api/jobs", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ name, client_name_for_create: name }),
 });
 const data = await res.json();
 if (res.ok && data.id) {
 window.dispatchEvent(new CustomEvent("nw:job-created", { detail: { id: data.id, name } }));
 onPick({ id: data.id, name });
 setOpen(false);
 }
 } finally {
 setCreating(false);
 }
 }
 return (
 <div ref={rootRef} className="relative">
 <input
 ref={inputRef}
 value={search}
 onChange={(e) => { setSearch(e.target.value); openMenu(); }}
 onFocus={openMenu}
 placeholder="Search jobs or type a new job name…"
 className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-default)] text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] focus:border-nw-stone-blue focus:outline-none"
 />
 {open && pos && typeof document !== "undefined" &&
 createPortal(
 <div
 ref={panelRef}
 style={{ position: "fixed", left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
 className="z-[1000] overflow-y-auto border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-panel)]"
 >
 {filtered.map((j) => (
 <button key={j.id} type="button" onClick={() => { onPick(j); setOpen(false); }} className="block w-full truncate text-left px-3 py-2 text-sm text-[color:var(--text-primary)] hover:bg-[var(--bg-subtle)]">{j.name}</button>
 ))}
 {filtered.length === 0 && !showCreate && <div className="px-3 py-2 text-xs text-[color:var(--text-tertiary)]">No jobs — type 2+ characters to create one</div>}
 {showCreate && (
 <button type="button" disabled={creating} onClick={createJob} className="block w-full text-left px-3 py-2 text-sm border-t border-[var(--border-default)] text-nw-stone-blue hover:bg-[var(--bg-subtle)] disabled:opacity-60">
 <span className="font-mono text-[10px] uppercase tracking-[0.12em] mr-1">Create</span>&ldquo;{search.trim()}&rdquo; as new job
 </button>
 )}
 </div>,
 document.body
 )}
 </div>
 );
}

// Item 1 — read-only invoice-level cost code, DERIVED from the line codes. Shows
// the single code (+ line count), or "Mixed · N codes". Edited on the lines.
function CostCodeSummary({ summary }: { summary: ReturnType<typeof summarizeLineCodes> }) {
 const { codes, dominant, distinct, withCode, totalLines } = summary;
 const unassigned = totalLines - withCode;
 return (
 <div>
 <div className="flex items-center gap-2 mb-1.5">
 <span className="text-[11px] font-medium text-[color:var(--text-secondary)] uppercase tracking-wider">Cost Code</span>
 <span className="text-[10px] text-[color:var(--text-tertiary)] normal-case tracking-normal">derived from lines — edit below</span>
 </div>
 {distinct === 0 ? (
 <div className="border border-[rgba(201,138,59,0.35)] bg-[rgba(201,138,59,0.06)] px-3 py-2 text-sm text-[color:var(--nw-warn)]">
 No cost code assigned — set one on each line below.
 </div>
 ) : distinct === 1 && dominant ? (
 <div className="border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-sm flex items-baseline gap-2">
 <span className="font-mono text-[13px] text-[color:var(--text-primary)]">{dominant.code}</span>
 {dominant.description && <span className="text-[color:var(--text-secondary)] truncate">— {dominant.description}</span>}
 <span className="text-[color:var(--text-tertiary)] ml-auto flex-shrink-0">{withCode} {withCode === 1 ? "line" : "lines"}</span>
 </div>
 ) : (
 <div className="border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2 text-sm">
 <span className="font-medium text-[color:var(--text-primary)]">Mixed · {distinct} codes</span>
 <span className="text-[color:var(--text-secondary)] font-mono text-[12px]"> ({codes.map((c) => c.code).join(", ")})</span>
 </div>
 )}
 {unassigned > 0 && distinct > 0 && (
 <p className="mt-1 text-[11px] text-[color:var(--nw-warn)]">{unassigned} {unassigned === 1 ? "line" : "lines"} without a cost code</p>
 )}
 </div>
 );
}

// Item 2 + 4 — editable primary cost code; labels a learned code "from your history".
function CostCodeField({ parsed, edited, options, onChange }: {
 parsed: ParsedInvoice;
 edited: { id: string; code: string } | null | undefined;
 options: CostCodeOption[];
 onChange: (cc: { id: string; code: string } | null) => void;
}) {
 const sug = parsed.cost_code_suggestion;
 const fromHistory = sug?.source === "history";
 const suggestionOpt = sug?.code ? options.find(o => o.code === sug.code) : undefined;
 const value = edited !== undefined ? (edited?.id ?? null) : (suggestionOpt?.id ?? null);
 return (
 <div>
 <div className="flex items-center gap-2 mb-1.5">
 <span className="text-[11px] font-medium text-[color:var(--text-secondary)] uppercase tracking-wider">Cost Code</span>
 {edited === undefined && fromHistory && sug && (
 <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-nw-stone-blue border border-nw-stone-blue uppercase tracking-wider">from your history &middot; {sug.code}</span>
 )}
 {edited === undefined && !fromHistory && sug && (
 <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--text-secondary)] border border-[var(--border-default)] uppercase tracking-wider">AI {Math.round((sug.confidence ?? 0) * 100)}%</span>
 )}
 </div>
 <CostCodeCombobox
 value={value}
 options={options}
 placeholder="Select cost code…"
 onChange={(id) => {
 if (id) { const opt = options.find(o => o.id === id); onChange(opt ? { id: opt.id, code: opt.code } : null); }
 else onChange(null);
 }}
 />
 </div>
 );
}

function DuplicateModal({
 duplicate,
 onSaveAnyway,
 onCancel,
 saving,
}: {
 duplicate: DuplicateInfo;
 onSaveAnyway: () => void;
 onCancel: () => void;
 saving: boolean;
}) {
 const amountDollars = duplicate.existing.total_amount / 100;
 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
 <div className="bg-[var(--bg-card)] border border-[var(--border-default)] shadow-2xl max-w-md w-full mx-4 p-6">
 {/* Warning icon */}
 <div className="flex items-center gap-3 mb-4">
 <div className="w-10 h-10 bg-[rgba(201,138,59,0.12)] flex items-center justify-center flex-shrink-0">
 <svg className="w-5 h-5 text-[color:var(--nw-warn)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
 </svg>
 </div>
 <h3 className="text-lg font-display text-[color:var(--text-primary)]">Possible Duplicate Detected</h3>
 </div>

 <p className="text-sm text-[color:var(--text-muted)] mb-4">
 An invoice from <span className="font-medium text-[color:var(--text-primary)]">{duplicate.existing.vendor_name_raw}</span> for{" "}
 <span className="font-medium text-[color:var(--nw-warn)]">{formatDollars(amountDollars)}</span> already
 exists in the system.
 </p>

 <div className="bg-[var(--bg-subtle)] border border-[var(--border-default)] px-4 py-3 mb-5">
 <div className="flex items-center justify-between text-sm">
 <span className="text-[color:var(--text-secondary)]">Status</span>
 <span className="text-[color:var(--text-primary)] font-medium capitalize">{duplicate.existing.status.replace(/_/g, " ")}</span>
 </div>
 </div>

 <a
 href={`/invoices/${duplicate.existing.id}`}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1.5 text-sm text-[color:var(--nw-stone-blue)] hover:text-[color:var(--nw-stone-blue)]-hover transition-colors mb-5"
 >
 View existing invoice
 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
 </svg>
 </a>

 <div className="flex gap-3">
 <button
 onClick={onCancel}
 className="flex-1 px-4 py-2.5 border border-[var(--border-default)] text-[color:var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-subtle)] transition-colors"
 >
 Cancel
 </button>
 <button
 onClick={onSaveAnyway}
 disabled={saving}
 className="flex-1 px-4 py-2.5 bg-[rgba(201,138,59,0.12)] text-[color:var(--nw-warn)] text-sm font-medium hover:brightness-110 disabled:opacity-50 transition-all"
 >
 {saving ? "Saving..." : "Save Anyway"}
 </button>
 </div>
 </div>
 </div>
 );
}

/**
 * Core upload UI — used both by the standalone /invoices/upload page
 * and by InvoiceUploadModal (full-screen overlay from the invoices list).
 * When `onSaved` is provided, it's called after each successful save
 * so the caller can close the modal / refresh a list.
 */
export default function UploadContent({
 onSaved,
 initialMode = "upload",
}: {
 onSaved?: (count: number) => void;
 // 3.1 ONE DOOR — the upload surface hosts three modes; ?action=import deep-links
 // straight to "import" so there's no separate Import CSV door.
 initialMode?: "upload" | "manual" | "import";
} = {}) {
 const [files, setFiles] = useState<FileStatus[]>([]);
 const [isDragging, setIsDragging] = useState(false);
 const [savingAll, setSavingAll] = useState(false);
 const [duplicateModal, setDuplicateModal] = useState<DuplicateInfo | null>(null);
 const [duplicateSaving, setDuplicateSaving] = useState(false);
 const [documentType, setDocumentType] = useState<"invoice" | "receipt">("invoice");
 // 2.5(b) Upload (AI) / Manual entry (AI-outage fallback) + 3.1 Import CSV (batch).
 const [mode, setMode] = useState<"upload" | "manual" | "import">(initialMode);
 const duplicateHitRef = useRef(false);
 // Suppresses the per-file onSaved close while Save-All is looping — we fire
 // onSaved once at the end of the batch instead.
 const batchRef = useRef(false);
 const inputRef = useRef<HTMLInputElement>(null);

 // Item 1/4 — cost-code options for the editable cost-code comboboxes + the org
 // jobs list for the NO-MATCH job picker. Server route + provider (standing
 // pattern — no client-auth mount fetch here).
 const [costCodeOptions, setCostCodeOptions] = useState<CostCodeOption[]>([]);
 const { jobs: jobOptions, ensureLoaded: ensureJobsLoaded } = useJobFilter();
 useEffect(() => {
 ensureJobsLoaded();
 let cancelled = false;
 fetch("/api/cost-codes", { cache: "no-store" })
 .then((r) => (r.ok ? r.json() : null))
 .then((d: { codes?: CostCodeOption[] } | null) => {
 if (!cancelled && d?.codes) setCostCodeOptions(d.codes);
 })
 .catch(() => {});
 return () => { cancelled = true; };
 }, [ensureJobsLoaded]);

 const updateEdit = useCallback((index: number, patch: Partial<FileEdits>) => {
 setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, edits: { ...f.edits, ...patch } } : f)));
 }, []);

 const processFiles = useCallback(async (newFiles: File[]) => {
 const accepted = newFiles.filter(isAcceptedFile);
 if (accepted.length === 0) return;
 const now = Date.now();
 const newEntries: FileStatus[] = accepted.map((file) => ({
 file, objectUrl: URL.createObjectURL(file), status: "uploading" as const,
 parseStep: "uploading" as ParseStep, startedAt: now,
 }));
 setFiles((prev) => [...prev, ...newEntries]);
 await Promise.allSettled(
 newEntries.map(async (entry) => {
 // Advance through simulated steps on realistic timers
 const advanceStep = (step: ParseStep, delay: number) =>
 new Promise<void>((resolve) => setTimeout(() => {
 setFiles((prev) => prev.map((f) =>
 f.file === entry.file && f.status === "uploading" ? { ...f, parseStep: step } : f
 ));
 resolve();
 }, delay));

 const formData = new FormData();
 formData.append("file", entry.file);

 // Start the fetch and the step timers in parallel
 const fetchPromise = fetch("/api/invoices/parse", { method: "POST", body: formData });

 // Advance steps at realistic intervals (the actual fetch runs in parallel)
 advanceStep("analyzing", 1500);
 advanceStep("extracting", 4000);
 advanceStep("matching", 8000);

 try {
 const res = await fetchPromise;
 if (!res.ok) { const err = await res.json(); throw new Error(err.error || `HTTP ${res.status}`); }
 const result: ParseResult = await res.json();
 setFiles((prev) => prev.map((f) => f.file === entry.file ? { ...f, status: "done" as const, parseStep: "complete" as ParseStep, result } : f));
 } catch (err) {
 const message = err instanceof Error ? err.message : "Unknown error";
 setFiles((prev) => prev.map((f) => f.file === entry.file ? { ...f, status: "error" as const, error: message } : f));
 }
 })
 );
 }, []);

 const saveOne = async (index: number, forceSave = false) => {
 const fs = files[index];
 if (!fs.result || fs.saved) return;
 setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, saving: true } : f)));
 try {
 const edits = fs.edits ?? {};
 const parsed = fs.result.parsed;

 // Effective job: an explicit card edit wins; else the parse-time resolution.
 const effectiveJob = edits.job !== undefined ? edits.job : (parsed.job_resolution ?? null);

 // Per-line cost-code overrides fold into the line_items sent to save (line
 // codes are stored at save; they are not tracked corrections).
 const lineItems = parsed.line_items.map((li, i) => {
 const override = edits.lineCodes?.[i];
 return override
 ? { ...li, cost_code_suggestion: { code: override.code, description: null, confidence: 1 } }
 : li;
 });

 // Human header/cost-code edits → field_overrides. The save route stores these
 // as the invoice's FINAL values AND records them as corrections in the SAME
 // request (ai_raw_response keeps the AI baseline, so the delta is captured and
 // the vendor→code default is learned — item 2). Folding this in removes the
 // second PATCH round-trip that made the Save button hang.
 const fieldOverrides: Record<string, unknown> = {};
 // Cost code is line-derived (Item 1). When the user edits a line code, the
 // dominant line code (by amount) is the invoice-level correction that feeds
 // vendor→code learning. No-line / scope-only lump sums use the single whole-
 // invoice picker (edits.costCode). The server also derives the stored invoice
 // cost code from the lines, so a no-edit save still records the dominant.
 const anyLineCoded = parsed.line_items.some((li, i) => !!(edits.lineCodes?.[i]?.code ?? li.cost_code_suggestion?.code));
 if (anyLineCoded) {
 if (edits.lineCodes && Object.keys(edits.lineCodes).length > 0) {
 const summary = summarizeLineCodes(parsed, edits, costCodeOptions);
 if (summary.dominant?.id) fieldOverrides.cost_code_id = summary.dominant.id;
 }
 } else if (edits.costCode !== undefined) {
 fieldOverrides.cost_code_id = edits.costCode?.id ?? null;
 }
 if (edits.vendor !== undefined && edits.vendor !== parsed.vendor_name) fieldOverrides.vendor_name_raw = edits.vendor;
 if (edits.invoiceNumber !== undefined && edits.invoiceNumber !== parsed.invoice_number) fieldOverrides.invoice_number = edits.invoiceNumber;
 if (edits.invoiceDate !== undefined && edits.invoiceDate !== parsed.invoice_date) fieldOverrides.invoice_date = edits.invoiceDate;

 const payload = {
 ...fs.result,
 parsed: { ...parsed, job_resolution: effectiveJob, line_items: lineItems },
 ...(Object.keys(fieldOverrides).length > 0 ? { field_overrides: fieldOverrides } : {}),
 ...(forceSave ? { force_save: true } : {}),
 document_type: documentType,
 };
 const res = await fetch("/api/invoices/save", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(payload),
 });
 const data = await res.json();
 if (!res.ok) throw new Error(data.error);

 // Duplicate → surface the modal, don't mark saved.
 if (data.duplicate && data.existing) {
 setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, saving: false } : f)));
 duplicateHitRef.current = true;
 setDuplicateModal({ fileIndex: index, existing: data.existing });
 return;
 }

 setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, saving: false, saved: true } : f)));
 // Save & Route on a single card must NOT strand the user on the upload
 // screen — hand back to the host to close the modal + flash the list.
 // Suppressed during a Save-All batch (fired once at the end instead).
 if (!batchRef.current) onSaved?.(1);
 } catch (err) {
 const message = err instanceof Error ? err.message : "Save failed";
 setFiles((prev) => prev.map((f, i) => (i === index ? { ...f, saving: false, error: message } : f)));
 }
 };

 const saveAll = async () => {
 setSavingAll(true);
 duplicateHitRef.current = false;
 batchRef.current = true;
 // Save one at a time so duplicates can be resolved individually
 let savedCount = 0;
 for (let i = 0; i < files.length; i++) {
 const f = files[i];
 if (f.status === "done" && f.result && !f.saved && !f.saving) {
 await saveOne(i);
 // If a duplicate was detected, stop batch so user can resolve it
 if (duplicateHitRef.current) break;
 savedCount += 1;
 }
 }
 batchRef.current = false;
 setSavingAll(false);
 if (savedCount > 0 && !duplicateHitRef.current) onSaved?.(savedCount);
 };

 const handleDuplicateSaveAnyway = async () => {
 if (!duplicateModal) return;
 setDuplicateSaving(true);
 await saveOne(duplicateModal.fileIndex, true);
 setDuplicateSaving(false);
 setDuplicateModal(null);
 };

 const handleDuplicateCancel = () => {
 setDuplicateModal(null);
 };

 const parsedUnsaved = files.filter((f) => f.status === "done" && f.result && !f.saved);

 return (
 <>
 {/* Sub-header with Save All */}
 {parsedUnsaved.length > 1 && (
 <div className="border-b border-[var(--border-default)] bg-[rgba(91,134,153,0.04)] px-6 py-3">
 <div className="max-w-7xl mx-auto flex items-center justify-end">
 <NwButton variant="primary" size="md" onClick={saveAll} disabled={savingAll} loading={savingAll}>
 {savingAll ? "Saving" : `Save All & Route (${parsedUnsaved.length})`}
 </NwButton>
 </div>
 </div>
 )}

 <div>
 {/* 2.5(b) Upload / Manual entry + 3.1 Import CSV — one door, three modes.
     Thin toggle header; Import brings its own <main>, so it renders as a
     sibling (no nested <main>, no double padding). */}
 <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8">
 <div className="inline-flex border border-[var(--border-default)]">
 {([
  ["upload", "Upload Document"],
  ["manual", "Manual Entry"],
  ["import", "Import CSV"],
 ] as ["upload" | "manual" | "import", string][]).map(([m, label]) => (
 <button
  key={m}
  onClick={() => setMode(m)}
  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
  mode === m
   ? "bg-[var(--nw-stone-blue)] text-[color:var(--bg-page)]"
   : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[var(--bg-subtle)]"
  }`}
 >{label}</button>
 ))}
 </div>
 </div>

 {mode === "import" ? (
 <ImportPageContent />
 ) : (
 <main className="max-w-7xl mx-auto px-4 md:px-6 pb-8 pt-6">
 {mode === "manual" ? (
 <ManualInvoiceForm
  jobOptions={jobOptions}
  costCodeOptions={costCodeOptions}
  onSaved={onSaved}
 />
 ) : (
 <>
 {/* Document type toggle */}
 <div className="flex items-center gap-3 mb-6">
 <span className="text-[11px] font-medium text-[color:var(--text-secondary)] uppercase tracking-wider">Document Type</span>
 <div className="inline-flex border border-[var(--border-default)]">
 <button
  onClick={() => setDocumentType("invoice")}
  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
  documentType === "invoice"
   ? "bg-[var(--nw-stone-blue)] text-[color:var(--bg-page)]"
   : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[var(--bg-subtle)]"
  }`}
 >Invoice</button>
 <button
  onClick={() => setDocumentType("receipt")}
  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
  documentType === "receipt"
   ? "bg-[var(--nw-stone-blue)] text-[color:var(--bg-page)]"
   : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[var(--bg-subtle)]"
  }`}
 >Receipt</button>
 </div>
 {documentType === "receipt" && (
 <span className="text-xs text-[color:var(--text-secondary)]">
  Hardware runs, permits, dump fees, card charges, petty cash
 </span>
 )}
 </div>

 {/* Drop Zone */}
 <div
 onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
 onDragLeave={() => setIsDragging(false)}
 onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFiles(Array.from(e.dataTransfer.files)); }}
 onClick={() => inputRef.current?.click()}
 className={`relative border border-dashed p-8 md:p-16 text-center cursor-pointer transition-all duration-300 ${
 isDragging ? "border-[var(--nw-stone-blue)] bg-[rgba(91,134,153,0.08)] shadow-[0_0_40px_-10px_rgba(74,155,142,0.2)]" : "border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[rgba(91,134,153,0.02)]"
 }`}
 >
 <input ref={inputRef} type="file" multiple accept={ACCEPTED_EXTENSIONS}
 onChange={(e) => { if (e.target.files) { processFiles(Array.from(e.target.files)); e.target.value = ""; } }}
 className="hidden" />
 <div className="inline-flex items-center justify-center w-14 h-14 bg-[var(--bg-subtle)] border border-[var(--border-default)] mb-5">
 <svg className={`w-6 h-6 transition-colors ${isDragging ? "text-[color:var(--nw-stone-blue)]" : "text-[color:var(--text-secondary)]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
 </svg>
 </div>
 <p className="text-lg text-[color:var(--text-primary)] font-display">{isDragging ? "Drop files here" : <><span className="hidden md:inline">Drag & drop {documentType === "receipt" ? "receipts" : "invoices"} &mdash; one or many</span><span className="md:hidden">Upload {documentType === "receipt" ? "Receipts" : "Invoices"}</span></>}</p>
 <p className="mt-1.5 text-sm text-[color:var(--text-secondary)] hidden md:block">Select or drop multiple files to upload a batch &mdash; each gets its own review card. Click to browse &mdash; PDF, DOCX, XLSX, JPG, PNG</p>
 <div className="mt-4 md:hidden">
 <NwButton variant="primary" size="md">Browse Files</NwButton>
 </div>
 </div>

 {/* Results */}
 {files.length > 0 && (
 <div className="mt-8 space-y-6">
 {files.map((fileStatus, index) => (
 <div key={`${fileStatus.file.name}-${index}`}
 className="bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden animate-fade-up"
 style={{ animationDelay: `${index * 0.05}s` }}>
 {/* Card Header */}
 <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center gap-3">
 {fileStatus.status === "uploading" && (
 <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
 <div className="w-2.5 h-2.5 bg-[var(--nw-stone-blue)] animate-pulse" />
 </div>
 )}
 {fileStatus.status === "done" && !fileStatus.saved && (
 <div className="w-5 h-5 bg-[rgba(74,138,111,0.24)] flex items-center justify-center flex-shrink-0">
 <svg className="w-3 h-3 text-[color:var(--nw-success)]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
 </div>
 )}
 {fileStatus.saved && (
 <div className="w-5 h-5 bg-[rgba(91,134,153,0.24)] flex items-center justify-center flex-shrink-0">
 <svg className="w-3 h-3 text-[color:var(--nw-stone-blue)]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
 </div>
 )}
 {fileStatus.status === "error" && (
 <div className="w-5 h-5 bg-[rgba(176,85,78,0.24)] flex items-center justify-center flex-shrink-0">
 <svg className="w-3 h-3 text-[color:var(--nw-danger)]" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
 </div>
 )}
 <div className="flex-1 min-w-0">
 <span className="text-sm font-medium text-[color:var(--text-primary)]">{fileStatus.file.name}</span>
 <span className="text-xs text-[color:var(--text-secondary)] ml-2">{(fileStatus.file.size / 1024).toFixed(0)} KB</span>
 </div>
 {fileStatus.saved && <span className="text-xs text-[color:var(--nw-stone-blue)] flex-shrink-0">Saved &amp; Routed</span>}
 {fileStatus.status === "done" && fileStatus.result && !fileStatus.saved && (
 <NwButton variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); saveOne(index); }} disabled={fileStatus.saving} loading={fileStatus.saving}>
 {fileStatus.saving ? "Saving" : "Save & Route"}
 </NwButton>
 )}
 </div>

 {/* Progress steps while parsing */}
 {fileStatus.status === "uploading" && (
 <ProgressSteps currentStep={fileStatus.parseStep} startedAt={fileStatus.startedAt} />
 )}

 {/* Error with retry — file stays in the list so user can retry or remove */}
 {fileStatus.status === "error" && (
 <div className="px-6 py-4 flex items-start gap-3 bg-[rgba(176,85,78,0.08)] border-t border-[rgba(176,85,78,0.25)]">
 <div className="flex-1">
 <p className="text-sm font-medium text-[color:var(--nw-danger)]">AI parsing failed — try again or upload manually</p>
 <p className="text-xs text-[color:var(--nw-danger)]/80 mt-1">{friendlyIngestError(fileStatus.error)}</p>
 <p className="text-[11px] text-[color:var(--text-secondary)] mt-2">
 The file is still attached. Click Retry to parse again, or remove it from the batch.
 </p>
 </div>
 <button
 onClick={(e) => {
 e.stopPropagation();
 // Reset this file to uploading and retry
 setFiles((prev) => prev.map((f, i) => i === index ? { ...f, status: "uploading" as const, parseStep: "uploading" as ParseStep, startedAt: Date.now(), error: undefined } : f));
 const formData = new FormData();
 formData.append("file", fileStatus.file);
 const advanceStep = (step: ParseStep, delay: number) =>
 setTimeout(() => {
 setFiles((prev) => prev.map((f, i) =>
 i === index && f.status === "uploading" ? { ...f, parseStep: step } : f
 ));
 }, delay);
 advanceStep("analyzing", 1500);
 advanceStep("extracting", 4000);
 advanceStep("matching", 8000);
 fetch("/api/invoices/parse", { method: "POST", body: formData })
 .then(async (res) => {
 if (!res.ok) { const err = await res.json(); throw new Error(err.error || `HTTP ${res.status}`); }
 const result: ParseResult = await res.json();
 setFiles((prev) => prev.map((f, i) => i === index ? { ...f, status: "done" as const, parseStep: "complete" as ParseStep, result } : f));
 })
 .catch((err) => {
 const message = err instanceof Error ? err.message : "Unknown error";
 setFiles((prev) => prev.map((f, i) => i === index ? { ...f, status: "error" as const, error: message } : f));
 });
 }}
 className="flex-shrink-0 px-4 py-2 bg-[var(--nw-danger)] hover:brightness-110 text-nw-white-sand text-xs font-medium transition-all"
 >
 Retry
 </button>
 </div>
 )}

 {/* Side-by-side: balanced 50/50 */}
 {fileStatus.status === "done" && fileStatus.result && (
 <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-default)]">
 <div className="p-5">
 <p className="text-[11px] font-medium text-[color:var(--text-secondary)] uppercase tracking-wider mb-3">Original Document</p>
 <FilePreview fileStatus={fileStatus} />
 </div>
 <div className="p-5">
 <p className="text-[11px] font-medium text-[color:var(--text-secondary)] uppercase tracking-wider mb-3">AI Extracted Data</p>
 <ParsedDataCard
 parsed={fileStatus.result.parsed}
 edits={fileStatus.edits ?? {}}
 onEdit={(patch) => updateEdit(index, patch)}
 costCodeOptions={costCodeOptions}
 jobOptions={jobOptions}
 fileName={fileStatus.file.name}
 />
 </div>
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </>
 )}
 </main>
 )}
 </div>

 {/* Duplicate invoice warning modal */}
 {duplicateModal && (
 <DuplicateModal
 duplicate={duplicateModal}
 onSaveAnyway={handleDuplicateSaveAnyway}
 onCancel={handleDuplicateCancel}
 saving={duplicateSaving}
 />
 )}
 </>
 );
}
