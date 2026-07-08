import type { SupabaseClient } from "@supabase/supabase-js";
import { stampInvoicePdf } from "./stamp-pdf";

const BUCKET = "invoice-files";

/** Deterministic storage path for the stamped copy — adjacent to the original,
 *  so the detail route can find it without a schema column. */
export function stampedPathFor(originalUrl: string): string {
  return `${originalUrl}.stamped.pdf`;
}

type EmbedCode = { code?: string | null } | { code?: string | null }[] | null;
function pickCode(v: EmbedCode): string | null {
  const row = Array.isArray(v) ? v[0] : v;
  return row?.code ?? null;
}

/**
 * Item 5 — generate a stamped copy of an approved invoice's PDF and store it
 * adjacent to the original (which is never touched). PDF originals only; images
 * / DOCX are skipped (returned as `skipped`). Never throws in a way that blocks
 * approval — the caller awaits it and logs the result.
 */
export async function applyApprovalStamp(
  supabase: SupabaseClient,
  invoiceId: string,
  orgId: string,
  approverName: string,
  approvedDate: string
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("original_file_url, original_file_type, invoice_number, total_amount, job_id, jobs(name)")
    .eq("id", invoiceId)
    .eq("org_id", orgId)
    .single();
  if (invErr || !inv) return { ok: false, error: invErr?.message ?? "invoice not found" };

  const url = inv.original_file_url as string | null;
  const type = inv.original_file_type as string | null;
  if (!url) return { ok: false, skipped: "no original file" };
  if (type !== "pdf") return { ok: false, skipped: `non-pdf original (${type ?? "unknown"})` };

  // Cost codes: prefer the allocation split; fall back to line-item codes.
  const { data: allocs } = await supabase
    .from("invoice_allocations")
    .select("cost_codes(code)")
    .eq("invoice_id", invoiceId)
    .is("deleted_at", null);
  let codes = (allocs ?? [])
    .map((a) => pickCode((a as { cost_codes: EmbedCode }).cost_codes))
    .filter((c): c is string => !!c);
  if (codes.length === 0) {
    const { data: lines } = await supabase
      .from("invoice_line_items")
      .select("cost_codes(code)")
      .eq("invoice_id", invoiceId)
      .is("deleted_at", null);
    codes = (lines ?? [])
      .map((l) => pickCode((l as { cost_codes: EmbedCode }).cost_codes))
      .filter((c): c is string => !!c);
  }
  codes = Array.from(new Set(codes));

  const { data: file, error: dlErr } = await supabase.storage.from(BUCKET).download(url);
  if (dlErr || !file) return { ok: false, error: `download failed: ${dlErr?.message ?? "no file"}` };
  const bytes = new Uint8Array(await file.arrayBuffer());

  const jobRow = inv.jobs as { name?: string | null } | { name?: string | null }[] | null;
  const job = Array.isArray(jobRow) ? jobRow[0] : jobRow;

  let stamped: Uint8Array;
  try {
    stamped = await stampInvoicePdf(bytes, {
      jobName: job?.name ?? null,
      costCodes: codes,
      amountCents: (inv.total_amount as number) ?? 0,
      approvedBy: approverName,
      approvedDate,
      invoiceNumber: (inv.invoice_number as string | null) ?? null,
    });
  } catch (err) {
    return { ok: false, error: `stamp render failed: ${err instanceof Error ? err.message : err}` };
  }

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(stampedPathFor(url), stamped, { contentType: "application/pdf", upsert: true });
  if (upErr) return { ok: false, error: `upload failed: ${upErr.message}` };
  return { ok: true };
}
