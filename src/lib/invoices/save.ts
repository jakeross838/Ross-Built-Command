import type { SupabaseClient } from "@supabase/supabase-js";
import { ANTHROPIC_MODEL } from "@/lib/ai/model";
import { computePaymentDate } from "@/lib/utils/payment-schedule";
import type { ParsedInvoice } from "@/lib/types/invoice";
import {
  detectOverhead,
  loadJobCandidates,
  matchJobForInvoice,
  type MatchResult,
} from "@/lib/invoices/job-matcher";
import {
  buildCleanFilename,
  extensionFor,
  renameStorageObject,
  storagePathFor,
} from "@/lib/invoices/file-naming";
import { notifyPmsForJob } from "@/lib/notifications";
import { findPotentialDuplicate } from "@/lib/invoices/duplicate-detection";
import { getWorkflowSettings } from "@/lib/workflow-settings";
import { extractInvoice } from "@/lib/cost-intelligence/extract-invoice";
import { captureCorrections } from "@/lib/invoices/corrections";

const INVOICES_BUCKET = "invoice-files";

export interface SaveInvoiceRequest {
  parsed: ParsedInvoice;
  file_url: string;
  file_name: string;
  file_type: string;
  force_save?: boolean;
  /** User-selected document type: 'invoice' (default) or 'receipt'. */
  document_type?: "invoice" | "receipt";
  /** Caller-resolved org_id — must be the authenticated user's membership org. */
  org_id: string;
  /** Server-resolved authenticated user id (from the x-user-id header set by
   *  middleware). Recorded as invoices.created_by so "who uploaded this" is
   *  always answerable, and used to attribute captured corrections. Never
   *  trusted from the client — the route sets it. */
  created_by?: string | null;
  /** Human field edits from the upload card, keyed by DB column
   *  (cost_code_id, vendor_name_raw, invoice_number, invoice_date). Applied as
   *  the invoice's final values while ai_raw_response keeps the AI baseline, so
   *  captureCorrections records the correction in this SAME request — no
   *  follow-up PATCH round-trip (which caused the SAVE-button hang). */
  field_overrides?: Record<string, unknown>;
}

export interface SaveInvoiceResult {
  id?: string;
  duplicate?: {
    id: string;
    vendor_name_raw: string;
    total_amount: number;
    status: string;
  };
}

const VENDOR_SUFFIXES = /\b(llc|inc|co|corp|ltd|company|enterprises|services)\b\.?/gi;

function normalizeVendorName(name: string): string {
  return name.replace(VENDOR_SUFFIXES, "").replace(/[.,]+/g, "").trim().toLowerCase();
}

/**
 * Match by strong evidence only: either full-substring containment (in
 * either direction after normalization) or a ≥2-word token overlap.
 * A single first-word match is NOT enough — e.g. "Florida Sunshine
 * Carpentry" should never bind to "M & J Florida Enterprises, LLC".
 */
export async function matchVendor(supabase: SupabaseClient, vendorName: string) {
  const normalizedNew = normalizeVendorName(vendorName);
  if (!normalizedNew) return null;

  // Pull candidates whose normalized form shares any non-trivial word with
  // the incoming name. We filter precisely in-process.
  const newTokens = new Set(
    normalizedNew.split(/\s+/).filter((w) => w.length >= 3)
  );
  if (newTokens.size === 0) return null;

  const firstToken = Array.from(newTokens)[0];
  const { data } = await supabase
    .from("vendors")
    .select("id, name, default_cost_code_id")
    .ilike("name", `%${firstToken}%`)
    .is("deleted_at", null)
    .limit(25);

  const candidates = (data ?? []) as Array<{ id: string; name: string; default_cost_code_id: string | null }>;
  if (candidates.length === 0) return null;

  for (const c of candidates) {
    const normalizedExisting = normalizeVendorName(c.name);
    if (!normalizedExisting) continue;

    // Substring containment in either direction is strong evidence.
    if (
      normalizedExisting.includes(normalizedNew) ||
      normalizedNew.includes(normalizedExisting)
    ) {
      return c;
    }

    // ≥2 shared significant-word tokens is also strong evidence.
    const existingTokens = new Set(
      normalizedExisting.split(/\s+/).filter((w) => w.length >= 3)
    );
    let overlap = 0;
    newTokens.forEach((t) => { if (existingTokens.has(t)) overlap++; });
    if (overlap >= 2) return c;
  }
  return null;
}

async function findOrCreateVendor(
  supabase: SupabaseClient,
  vendorName: string,
  orgId: string
): Promise<{ id: string; name: string }> {
  const matched = await matchVendor(supabase, vendorName);
  if (matched) return matched;

  const { data, error } = await supabase
    .from("vendors")
    .insert({ name: vendorName.trim(), org_id: orgId })
    .select("id, name")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create vendor: ${error?.message ?? "unknown"}`);
  }
  return data;
}

async function matchCostCode(supabase: SupabaseClient, code: string) {
  const { data } = await supabase
    .from("cost_codes")
    .select("id, code, description, is_change_order")
    .eq("code", code)
    .is("deleted_at", null)
    .limit(1);
  return data?.[0] ?? null;
}

/**
 * Item 1 — the invoice-level cost code is DERIVED from the line codes, not a
 * separate header pick. Returns the id of the dominant line code (the code with
 * the largest summed amount across line items), or null when no line carries a
 * code. The incoming line_items already reflect the card's per-line edits.
 */
async function resolveDominantLineCode(
  supabase: SupabaseClient,
  parsed: ParsedInvoice
): Promise<string | null> {
  if (!Array.isArray(parsed.line_items) || parsed.line_items.length === 0) return null;
  const byCode = new Map<string, number>();
  for (const li of parsed.line_items) {
    const code = li.cost_code_suggestion?.code;
    const amt = li.amount ?? 0;
    if (code && amt > 0) byCode.set(code, (byCode.get(code) ?? 0) + amt);
  }
  if (byCode.size === 0) return null;
  const domCode = Array.from(byCode.entries()).sort((a, b) => b[1] - a[1])[0][0];
  const cc = await matchCostCode(supabase, domCode);
  return (cc?.id as string) ?? null;
}

/**
 * Resolve the budget_line for a given job + cost code pair. Returns null
 * if no row exists yet — the G703 endpoint auto-creates budget lines on
 * the fly when it sees an invoice referencing a code without one.
 */
async function findBudgetLine(
  supabase: SupabaseClient,
  jobId: string | null,
  costCodeId: string | null
): Promise<string | null> {
  if (!jobId || !costCodeId) return null;
  const { data } = await supabase
    .from("budget_lines")
    .select("id")
    .eq("job_id", jobId)
    .eq("cost_code_id", costCodeId)
    .is("deleted_at", null)
    .limit(1);
  return (data?.[0]?.id as string) ?? null;
}

export type DuplicateHit = {
  id: string;
  invoice_number: string | null;
  vendor_name_raw: string | null;
  total_amount: number;
  invoice_date: string | null;
  status: string;
};

const DUP_SELECT = "id, invoice_number, vendor_name_raw, total_amount, invoice_date, status";

/**
 * Find an existing (non-deleted, non-void) invoice that duplicates the given
 * one. Shared by the save-time BLOCK and the parse-time early WARNING so both
 * use identical logic. Robust to vendor-name variation across uploads:
 *   1. fuzzy-matched vendor + invoice number   (strongest; survives name drift)
 *   2. raw-name + invoice number               (vendor didn't resolve)
 *   3. raw-name + amount + date                (numberless invoices)
 */
export async function findDuplicateInvoice(
  supabase: SupabaseClient,
  orgId: string,
  opts: { vendorName: string | null; invoiceNumber: string | null; amountCents: number | null; invoiceDate: string | null }
): Promise<DuplicateHit | null> {
  const trimmedVendor = opts.vendorName?.trim() || null;
  const trimmedNumber = opts.invoiceNumber?.trim() || null;

  if (trimmedNumber) {
    // 1) fuzzy vendor → vendor_id + invoice number.
    if (trimmedVendor) {
      const matched = await matchVendor(supabase, trimmedVendor);
      if (matched?.id) {
        const { data } = await supabase
          .from("invoices")
          .select(DUP_SELECT)
          .eq("org_id", orgId)
          .eq("vendor_id", matched.id)
          .ilike("invoice_number", trimmedNumber)
          .is("deleted_at", null)
          .neq("status", "void")
          .limit(1);
        if (data?.[0]) return data[0] as DuplicateHit;
      }
      // 2) raw vendor name + invoice number.
      const { data } = await supabase
        .from("invoices")
        .select(DUP_SELECT)
        .eq("org_id", orgId)
        .ilike("vendor_name_raw", trimmedVendor)
        .ilike("invoice_number", trimmedNumber)
        .is("deleted_at", null)
        .neq("status", "void")
        .limit(1);
      if (data?.[0]) return data[0] as DuplicateHit;
    }
  }

  // 3) raw vendor + amount + date (numberless invoices).
  if (trimmedVendor && opts.invoiceDate && opts.amountCents != null) {
    const { data } = await supabase
      .from("invoices")
      .select(DUP_SELECT)
      .eq("org_id", orgId)
      .ilike("vendor_name_raw", trimmedVendor)
      .eq("total_amount", opts.amountCents)
      .eq("invoice_date", opts.invoiceDate)
      .is("deleted_at", null)
      .neq("status", "void")
      .limit(1);
    if (data?.[0]) return data[0] as DuplicateHit;
  }

  return null;
}

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Routes high-confidence invoices to the PM queue; low-confidence ones
 * go straight to Diane (QA) per product spec.
 */
export function determineStatus(confidence: number): string {
  if (confidence < 0.7) return "qa_review";
  return "pm_review";
}

function mapFileType(type: string): "image" | "pdf" | "docx" | "xlsx" {
  if (type === "image") return "image";
  if (type === "pdf") return "pdf";
  if (type === "docx") return "docx";
  if (type === "xlsx") return "xlsx";
  return "pdf";
}

/**
 * Save a single parsed invoice. Handles duplicate detection, vendor/job/
 * cost-code matching, and status routing. If `force_save` is false and a
 * duplicate is found, returns `{ duplicate }` without inserting.
 *
 * Shared by the /api/invoices/save route and the bulk-import script.
 */
export async function saveParsedInvoice(
  supabase: SupabaseClient,
  req: SaveInvoiceRequest
): Promise<SaveInvoiceResult> {
  const {
    parsed,
    file_url,
    file_name,
    file_type,
    force_save,
    document_type,
    org_id: orgId,
    created_by: createdBy = null,
    field_overrides: fieldOverrides,
  } = req;
  if (!orgId) {
    throw new Error("saveParsedInvoice called without org_id");
  }

  const totalAmountCents = dollarsToCents(parsed.total_amount);

  // Human edits from the upload card, applied as the invoice's FINAL stored
  // values. ai_raw_response stays = parsed (the AI baseline) so captureCorrections
  // can still diff the human choice against what the model suggested.
  const overrides = fieldOverrides ?? {};
  const finalInvoiceNumber =
    "invoice_number" in overrides ? (overrides.invoice_number as string | null) : parsed.invoice_number;
  const finalInvoiceDate =
    "invoice_date" in overrides ? (overrides.invoice_date as string | null) : parsed.invoice_date;
  const finalVendorNameRaw =
    "vendor_name_raw" in overrides ? (overrides.vendor_name_raw as string | null) : parsed.vendor_name;

  const existingDuplicate = await findDuplicateInvoice(supabase, orgId, {
    vendorName: finalVendorNameRaw,
    invoiceNumber: finalInvoiceNumber,
    amountCents: totalAmountCents,
    invoiceDate: finalInvoiceDate,
  });

  if (existingDuplicate && !force_save) {
    return {
      duplicate: {
        id: existingDuplicate.id,
        vendor_name_raw: existingDuplicate.vendor_name_raw ?? "",
        total_amount: existingDuplicate.total_amount,
        status: existingDuplicate.status,
      },
    };
  }

  const today = new Date().toISOString().split("T")[0];
  const paymentDate = computePaymentDate(today);
  const status = determineStatus(parsed.confidence_score);

  let matchedVendor: { id: string; name: string } | null = null;
  if (parsed.vendor_name) {
    try {
      matchedVendor = await findOrCreateVendor(supabase, parsed.vendor_name, orgId);
    } catch (err) {
      // Log so we can track why vendor linkage fails; don't fail the save —
      // invoice still enters the review queue, just without a vendor_id.
      console.warn(
        `[save] findOrCreateVendor failed for "${parsed.vendor_name}": ${err instanceof Error ? err.message : err}`
      );
      matchedVendor = null;
    }
  }

  // ---- Job matching (improved: name, address, client, filename, description) ----
  const jobs = await loadJobCandidates(supabase);
  const match: MatchResult | null = matchJobForInvoice(jobs, {
    job_reference_raw: parsed.job_reference,
    po_reference_raw: parsed.po_reference,
    vendor_name_raw: parsed.vendor_name,
    description: parsed.description,
    filename: file_name,
  });

  // ---- Overhead detection (only when no job matched) ----
  const overhead =
    match === null
      ? detectOverhead({
          vendor_name_raw: parsed.vendor_name,
          description: parsed.description,
          job_reference_raw: parsed.job_reference,
          po_reference_raw: parsed.po_reference,
        })
      : { isOverhead: false };

  let matchedCostCode: { id: string; code: string; is_change_order?: boolean } | null = null;
  let autoFilledCostCode = false;
  if (parsed.cost_code_suggestion && parsed.cost_code_suggestion.confidence >= 0.8) {
    matchedCostCode = await matchCostCode(
      supabase,
      parsed.cost_code_suggestion.code
    );
    if (matchedCostCode) autoFilledCostCode = true;
  }

  // ---- AI change-order detection — auto-toggle invoice-level CO flag
  // when the AI flagged it OR the suggested cost code is a C-variant OR
  // the description/line items contain CO keywords. We bias toward true
  // (false positives are cheap; false negatives route real CO work onto
  // the base-contract budget). ----
  const aiFlaggedChangeOrder = !!(
    parsed.is_change_order ||
    parsed.cost_code_suggestion?.is_change_order ||
    parsed.flags?.includes("change_order")
  );
  // Item 3 — only EXPLICIT change-order language triggers a CO. Vague words
  // ("revision", "additional", "extra", "modification", "relocated", …) used to
  // false-flag ordinary invoices — "Revision 1" is not a change order. Narrowed
  // to explicit CO markers only.
  const CO_KEYWORDS = ["change order", "co #", "pcco"];
  const haystack = [
    parsed.description,
    ...parsed.line_items.map((l) => l.description ?? ""),
  ].join(" ").toLowerCase();
  const keywordHit = CO_KEYWORDS.some((kw) => haystack.includes(kw));

  const invoiceIsChangeOrder =
    aiFlaggedChangeOrder ||
    (matchedCostCode?.is_change_order ?? false) ||
    !!parsed.co_reference ||
    keywordHit;

  const autoFills: Record<string, boolean> = {};
  if (match) autoFills.job_id = true;
  if (autoFilledCostCode) autoFills.cost_code_id = true;

  // ---- Rename storage object to the clean filename convention ----
  // [job]_[vendor]_[invoice#]_[date].[ext]
  const ext = extensionFor(null, file_type, file_name ?? file_url);
  const cleanName = buildCleanFilename({
    jobName: match?.job.name ?? null,
    overhead: overhead.isOverhead,
    vendorName: parsed.vendor_name,
    invoiceNumber: parsed.invoice_number,
    invoiceDate: parsed.invoice_date,
    extension: ext,
  });
  const desiredPath = storagePathFor(cleanName, orgId);

  let finalFileUrl = file_url;
  try {
    finalFileUrl = await renameStorageObject(
      supabase,
      INVOICES_BUCKET,
      file_url,
      desiredPath
    );
  } catch (err) {
    // Rename is cosmetic — don't fail the whole save if storage chokes.
    console.warn(
      `[save] storage rename failed for ${file_url} → ${desiredPath}: ${err instanceof Error ? err.message : err}`
    );
  }

  const matchNote = match
    ? ` Job auto-matched to ${match.job.name} (score ${match.score}: ${match.reasons.join("; ")}${match.ambiguous ? "; flagged as ambiguous" : ""}).`
    : overhead.isOverhead
      ? ` Flagged as overhead expense — ${overhead.reason ?? "overhead pattern match"}.`
      : "";

  const duplicateNote =
    existingDuplicate && force_save
      ? ` Force-saved as possible duplicate of invoice ${existingDuplicate.id}.`
      : "";

  // Item 1 — honor an explicit job resolution from the upload card (a matched
  // real job OR a user-assigned/created one). Falls back to the auto-matcher
  // only when the card didn't resolve a job.
  const effectiveJobId =
    parsed.job_resolution !== undefined
      ? (parsed.job_resolution?.id ?? null)
      : (match?.job.id ?? null);
  const effectivePmId =
    effectiveJobId && effectiveJobId === match?.job.id ? (match?.job.pm_id ?? null) : null;

  // Final invoice-level cost code (Item 1 — ONE model): derived from the line
  // codes (dominant by amount). A human override from the card still wins; when
  // no line carries a code we fall back to the AI header match. The correction
  // (for vendor→code learning) is captured below against the AI baseline.
  const dominantLineCodeId = await resolveDominantLineCode(supabase, parsed);
  const finalCostCodeId =
    "cost_code_id" in overrides
      ? (overrides.cost_code_id as string | null)
      : (dominantLineCodeId ?? matchedCostCode?.id ?? null);

  const statusEntry = {
    // Attribution (2.2): this transition is genuinely automated (AI extraction),
    // so it's labeled "ai" — honest, and distinct from the dishonest "system"
    // that used to mask a real human approver. Renders as "AI extraction".
    who: "ai",
    when: new Date().toISOString(),
    old_status: "received",
    new_status: status,
    note: `AI parsed with ${Math.round(parsed.confidence_score * 100)}% confidence. Auto-routed.${matchNote}${autoFilledCostCode ? ` Cost code auto-assigned: ${matchedCostCode?.code}.` : ""}${duplicateNote}`,
  };

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      vendor_id: matchedVendor?.id ?? null,
      job_id: effectiveJobId,
      assigned_pm_id: effectivePmId,
      created_by: createdBy ?? null,
      cost_code_id: finalCostCodeId,
      invoice_number: finalInvoiceNumber,
      invoice_date: finalInvoiceDate,
      vendor_name_raw: finalVendorNameRaw,
      job_reference_raw: parsed.job_reference,
      po_reference_raw: parsed.po_reference,
      description: parsed.description,
      line_items: parsed.line_items,
      total_amount: totalAmountCents,
      ai_parsed_total_amount: totalAmountCents,
      is_change_order: invoiceIsChangeOrder,
      invoice_type: parsed.invoice_type,
      co_reference_raw: parsed.co_reference,
      confidence_score: parsed.confidence_score,
      confidence_details: {
        ...parsed.confidence_details,
        cost_code_suggestion: parsed.cost_code_suggestion?.confidence ?? 0,
        auto_fills: autoFills,
        ...(match
          ? {
              job_match: {
                score: match.score,
                reasons: match.reasons,
                ambiguous: match.ambiguous,
              },
            }
          : {}),
        ...(overhead.isOverhead ? { overhead_reason: overhead.reason } : {}),
        ...(existingDuplicate && force_save
          ? { possible_duplicate_of: existingDuplicate.id }
          : {}),
      },
      ai_model_used: ANTHROPIC_MODEL,
      ai_raw_response: parsed,
      status,
      status_history: [statusEntry],
      received_date: today,
      payment_date: paymentDate,
      original_file_url: finalFileUrl,
      original_filename: file_name,
      original_file_type: mapFileType(file_type),
      document_category: overhead.isOverhead ? "overhead" : "job_cost",
      document_type: document_type ?? "invoice",
      org_id: orgId,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to save invoice: ${error?.message ?? "unknown"}`);
  }

  const invoiceId = data.id as string;

  // ---- Capture human corrections from the upload card (item 2 learning) ----
  // The invoice already stores the human's FINAL values; here we record the
  // delta against the AI baseline (ai_raw_response) so parser_corrections logs
  // it AND the vendor→code default is learned. Awaited (not fire-and-forget) so
  // serverless can't kill the write mid-flight; a failure is surfaced, not
  // swallowed. Never fails the save — the invoice is already persisted.
  if (createdBy && Object.keys(overrides).length > 0) {
    try {
      const result = await captureCorrections(supabase, invoiceId, overrides, createdBy);
      if (!result.ok && result.error) {
        console.error(
          `[save] correction capture failed for ${invoiceId}: ${result.error}`
        );
      }
    } catch (corrErr) {
      console.error(
        `[save] correction capture threw for ${invoiceId}: ${corrErr instanceof Error ? corrErr.message : corrErr}`
      );
    }
  }

  // ---- Soft duplicate detection (Phase 8e) ----
  // Runs per org settings. Flags (not blocks) invoices that match an existing
  // record within the configured sensitivity window. The hard duplicate block
  // above already caught exact matches before we ever wrote the row.
  try {
    const settings = await getWorkflowSettings(orgId);
    if (settings.duplicate_detection_enabled) {
      const match = await findPotentialDuplicate(supabase, {
        org_id: orgId,
        vendor_name_raw: parsed.vendor_name ?? null,
        total_amount_cents: totalAmountCents,
        invoice_date: parsed.invoice_date,
        invoice_number: parsed.invoice_number,
        sensitivity: settings.duplicate_detection_sensitivity,
        exclude_id: invoiceId,
      });
      if (match) {
        await supabase
          .from("invoices")
          .update({
            is_potential_duplicate: true,
            duplicate_of_id: match.id,
          })
          .eq("id", invoiceId);
      }
    }
  } catch (err) {
    console.warn(
      `[save dup-detect] ${err instanceof Error ? err.message : err}`
    );
  }

  // Item 7 — coded line totals per cost code, accumulated as line rows are
  // built; used to allocate every dollar (line codes + pro-rata tax/fee) once
  // the invoice + line rows exist.
  const codedByCode = new Map<string, number>();

  // ---- Persist per-line-item rows in invoice_line_items ----
  // Each line gets its own cost code (AI-suggested when available; otherwise
  // falls back to the invoice-level default). PM can re-assign in review.
  if (Array.isArray(parsed.line_items) && parsed.line_items.length > 0) {
    // Resolve default budget_line_id once for lines that fall back to
    // the invoice-level cost code. Uses the FINAL (human-corrected) invoice
    // code so an uncoded line follows the correction, not the AI's original.
    const defaultBudgetLineId = await findBudgetLine(
      supabase,
      match?.job.id ?? null,
      finalCostCodeId
    );

    // Pre-resolve per-line AI-suggested codes (dedupe by code string).
    const perLineCodes = new Map<string, { id: string; is_change_order: boolean } | null>();
    for (const li of parsed.line_items) {
      const sug = li.cost_code_suggestion;
      if (sug?.code && !perLineCodes.has(sug.code)) {
        const cc = await matchCostCode(supabase, sug.code);
        perLineCodes.set(
          sug.code,
          cc ? { id: cc.id as string, is_change_order: !!cc.is_change_order } : null
        );
      }
    }

    const lineRows = await Promise.all(
      parsed.line_items.map(async (li, idx) => {
        const sugCode = li.cost_code_suggestion?.code ?? null;
        const sugMatch = sugCode ? perLineCodes.get(sugCode) : null;
        const sugConfidence = li.cost_code_suggestion?.confidence ?? null;

        // Assign the line's cost code: strong AI suggestion, else the FINAL
        // (human-corrected) invoice code — so uncoded lines follow a correction.
        const autoAssignLineCode =
          sugMatch && (sugConfidence ?? 0) >= 0.8 ? sugMatch.id : finalCostCodeId;

        const lineBudgetLineId =
          autoAssignLineCode === finalCostCodeId
            ? defaultBudgetLineId
            : autoAssignLineCode
              ? await findBudgetLine(supabase, match?.job.id ?? null, autoAssignLineCode)
              : null;

        return {
          invoice_id: invoiceId,
          line_index: idx,
          description: li.description ?? null,
          qty: li.qty,
          unit: li.unit,
          rate: li.rate,
          amount_cents: Math.round((li.amount ?? 0) * 100),
          cost_code_id: autoAssignLineCode,
          budget_line_id: lineBudgetLineId,
          is_change_order:
            !!li.is_change_order ||
            sugMatch?.is_change_order === true ||
            // Mirror invoice-level CO if this line has no opinion of its own.
            (li.is_change_order === undefined && invoiceIsChangeOrder),
          co_reference: li.co_reference ?? (invoiceIsChangeOrder ? parsed.co_reference : null),
          ai_suggested_cost_code_id: sugMatch?.id ?? null,
          ai_suggestion_confidence: sugConfidence,
          org_id: orgId,
        };
      })
    );

    const { error: lineErr } = await supabase.from("invoice_line_items").insert(lineRows);
    if (lineErr) {
      // Log but don't fail the invoice save — JSONB copy on the invoice row
      // remains as a fallback. PMs can still review the invoice; the line
      // table can be backfilled by a later reprocess job.
      console.warn(
        `[save] invoice_line_items insert failed for invoice ${invoiceId}: ${lineErr.message}`
      );
    }

    // Item 7 — accumulate coded line totals for allocation. Uses the same
    // resolved per-line cost code and cents amount we just persisted, so the
    // allocation weights track exactly what the PM sees on each line.
    for (const lr of lineRows) {
      if (lr.cost_code_id && lr.amount_cents > 0) {
        codedByCode.set(
          lr.cost_code_id,
          (codedByCode.get(lr.cost_code_id) ?? 0) + lr.amount_cents
        );
      }
    }
  }

  // ---- Auto-populate invoice_allocations (Item 7 — every dollar allocates) ----
  // The invoice total is allocated across cost codes so budget views see 100%
  // of the amount without the PM clicking "Save allocations". Rules:
  //   • Coded line items are the allocation weights (multi-code invoices split
  //     across their line codes).
  //   • Tax + any uncoded/fee remainder is spread PRO-RATA across those coded
  //     weights — it follows the lines' cost codes rather than being dropped.
  //   • Single-code / no-line-item invoices fall back to the invoice-level code.
  //   • Allocations sum EXACTLY to the invoice total — the last bucket absorbs
  //     the rounding remainder so no cent is lost or invented.
  //   • If there is no cost code anywhere, nothing is allocated — the amount is
  //     logged as unallocated (flagged, never silently dropped) for the PM to
  //     split in review.
  // Q10b ORG-scoped child (per migration 00096): org_id NOT NULL, direct-filter
  // RLS. orgId sourced from caller's getCurrentMembership().
  if (totalAmountCents > 0) {
    // Weights: coded line totals when present, else the invoice-level code —
    // and that fallback must use the FINAL (human-corrected) invoice code, not
    // the AI's original match, or a corrected single-code invoice would allocate
    // every dollar to the wrong (pre-correction) code.
    let weights = new Map<string, number>(codedByCode);
    if (weights.size === 0 && finalCostCodeId) {
      weights = new Map([[finalCostCodeId, totalAmountCents]]);
    }

    if (weights.size > 0) {
      const entries = Array.from(weights.entries());
      const weightSum = entries.reduce((s, [, w]) => s + w, 0);
      // Largest-remainder apportionment: floor each pro-rata share, then hand
      // out the leftover cents one at a time to the largest fractional
      // remainders. Guarantees every bucket is >= 0 (satisfies the table CHECK)
      // AND the buckets sum EXACTLY to the invoice total — no cent lost or
      // invented, even on pathological rounding (e.g. equal weights over a
      // 2-cent total, where "last bucket absorbs remainder" would go negative).
      const shares = entries.map(([ccId, w]) => {
        const exact = (w / weightSum) * totalAmountCents;
        const floor = Math.floor(exact);
        return { ccId, cents: floor, frac: exact - floor };
      });
      let leftover = totalAmountCents - shares.reduce((s, x) => s + x.cents, 0);
      shares.sort((a, b) => b.frac - a.frac);
      for (let i = 0; i < shares.length && leftover > 0; i++, leftover--) {
        shares[i].cents += 1;
      }
      // 00122: job_id NOT NULL — auto-created allocations default to the
      // header job (Q1). A jobless invoice can't allocate yet; the PM
      // assigns a job in review and the GET auto-materialize path (which
      // also stamps the header job) covers it.
      if (effectiveJobId) {
        const allocRows = shares
          .filter((x) => x.cents > 0)
          .map((x) => ({
            invoice_id: invoiceId,
            cost_code_id: x.ccId,
            amount_cents: x.cents,
            description: parsed.description ?? null,
            org_id: orgId,
            job_id: effectiveJobId,
          }));
        try {
          await supabase.from("invoice_allocations").insert(allocRows);
        } catch (allocErr) {
          console.warn(
            `[save] invoice_allocations auto-create failed for ${invoiceId}: ${allocErr instanceof Error ? allocErr.message : allocErr}`
          );
        }
      } else {
        console.warn(
          `[save] invoice ${invoiceId}: allocations deferred — no job assigned yet (00122 job_id NOT NULL); PM assigns a job in review.`
        );
      }
    } else {
      // No cost code on any line or the invoice — cannot allocate. Flag the
      // full amount as unallocated so it's visible in review, never dropped.
      console.warn(
        `[save] invoice ${invoiceId}: $${(totalAmountCents / 100).toFixed(2)} unallocated — no cost code on any line or the invoice; PM must allocate in review.`
      );
    }
  }

  // Cost Intelligence Spine: stage extraction lines for verification.
  // Runs after invoice_line_items exist. Never fails the save.
  try {
    await extractInvoice(supabase, invoiceId, { triggeredBy: null });
  } catch (err) {
    console.warn(
      `[save cost-intel] extractInvoice failed for ${invoiceId}: ${err instanceof Error ? err.message : err}`
    );
  }

  // Fire PM notifications when a matched, non-overhead invoice lands in a
  // queue they're responsible for. Wrapped so dispatch failures can't roll
  // back the save.
  if (match?.job.id && !overhead.isOverhead) {
    const vendorName = parsed.vendor_name ?? "a vendor";
    const jobName = match.job.name;
    const totalDollars = `$${Math.round(parsed.total_amount ?? 0).toLocaleString("en-US")}`;
    try {
      await notifyPmsForJob(match.job.id, orgId, {
        notification_type: "invoice_uploaded",
        subject: `New invoice — ${vendorName} · ${totalDollars}`,
        body: `New invoice from ${vendorName} for ${totalDollars} on ${jobName} needs your review.`,
        action_url: `/invoices/${invoiceId}`,
        related_entity_id: invoiceId,
      });
    } catch (notifyErr) {
      console.warn(
        `[save] notifyPmsForJob failed for invoice ${invoiceId}: ${notifyErr instanceof Error ? notifyErr.message : notifyErr}`
      );
    }
  }

  return { id: invoiceId };
}
