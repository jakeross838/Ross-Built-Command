import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { createServerClient } from "@/lib/supabase/server";
import { requireOrgId } from "@/lib/org/session";
import {
 ACCEPTED_MIME_TYPES,
 parseInvoiceFile,
} from "@/lib/invoices/parse-file";
import { PlanLimitError } from "@/lib/claude";
import { matchJobForInvoice, loadJobCandidates } from "@/lib/invoices/job-matcher";
import { matchVendor } from "@/lib/invoices/save";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Allow up to 2 minutes for retries

export async function POST(request: NextRequest) {
 try {
 const formData = await request.formData();
 const file = formData.get("file") as File | null;

 if (!file) {
 return NextResponse.json({ error: "No file provided" }, { status: 400 });
 }

 const fileKind = ACCEPTED_MIME_TYPES[file.type];
 if (!fileKind) {
 return NextResponse.json(
 { error: `Unsupported file type: ${file.type}` },
 { status: 400 }
 );
 }
 if (fileKind === "xlsx") {
 return NextResponse.json(
 { error: "XLSX parsing is not yet supported. Please convert to PDF." },
 { status: 400 }
 );
 }

 const buffer = Buffer.from(await file.arrayBuffer());

 // Upload to Supabase Storage (org-scoped path: {org_id}/uploads/…)
 const supabase = createServerClient();
 const orgId = await requireOrgId();
 const {
 data: { user },
 } = await supabase.auth.getUser();
 const timestamp = Date.now();
 const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
 const storagePath = `${orgId}/uploads/${timestamp}_${safeName}`;

 const { error: uploadError } = await supabase.storage
 .from("invoice-files")
 .upload(storagePath, buffer, {
 contentType: file.type,
 upsert: false,
 });

 if (uploadError) {
 console.error("Storage upload error:", uploadError);
 return NextResponse.json(
 { error: `Storage upload failed: ${uploadError.message}` },
 { status: 500 }
 );
 }

 const parsed = await parseInvoiceFile({
 buffer,
 mediaType: file.type,
 fileKind,
 fileName: file.name,
 // Shared helper works with both SSR and supabase-js clients.
 supabase: supabase as unknown as Parameters<typeof parseInvoiceFile>[0]["supabase"],
 meta: {
 org_id: orgId,
 user_id: user?.id ?? null,
 metadata: { source: "invoice_upload" },
 },
 });

 // Item 1 — RESOLVE the job reference against REAL org jobs via the fuzzy
 // matcher (job name / client surname / street key). Sets job_resolution to a
 // real job or null (NO MATCH). Raw job_reference text is NEVER presented as an
 // assigned job — the upload card shows the matched job or a NO-MATCH picker.
 try {
 const jobs = await loadJobCandidates(supabase);
 const jobMatch = matchJobForInvoice(jobs, {
 job_reference_raw: parsed.job_reference,
 vendor_name_raw: parsed.vendor_name,
 description: parsed.description,
 filename: file.name,
 });
 if (jobMatch && jobMatch.score >= 3 && !jobMatch.ambiguous) {
 parsed.job_resolution = { id: jobMatch.job.id, name: jobMatch.job.name };
 parsed.job_suggestion = {
 name: jobMatch.job.name,
 address: jobMatch.job.address,
 confidence: parsed.confidence_details?.job_reference ?? 0,
 };
 } else {
 parsed.job_resolution = null;
 }
 } catch {
 parsed.job_resolution = null;
 }

 // Item 2 — vendor→code learning (read path): if this vendor has a learned
 // default cost code (from a prior human correction), prefer it over the AI's
 // guess and mark it source:"history" so the review card labels it
 // "from your history" (shows the code explicitly; stays overridable).
 if (parsed.vendor_name && parsed.vendor_name.trim()) {
 // Fuzzy-match the existing vendor (SAME matcher the save uses) so name
 // variations across uploads resolve to the same vendor + its learned default.
 // An exact ilike missed real cases like "EloDesigns of Sarasota LLC" vs
 // "EloDesigns" and silently lost the from-history suggestion (nwrp acceptance).
 const matchedVendor = await matchVendor(supabase, parsed.vendor_name.trim());
 if (matchedVendor?.default_cost_code_id) {
 const { data: cc } = await supabase
 .from("cost_codes")
 .select("code, description, is_change_order")
 .eq("id", matchedVendor.default_cost_code_id)
 .is("deleted_at", null)
 .maybeSingle();
 if (cc) {
 parsed.cost_code_suggestion = {
 code: cc.code as string,
 description: (cc.description as string) ?? "",
 confidence: 1,
 is_change_order: !!cc.is_change_order,
 source: "history",
 };
 }
 }
 }

 // DOCX: render HTML once here so the upload preview can display it
 // without a second roundtrip. The file is still in storage for the
 // eventual invoice record to reference.
 let docxHtml: string | null = null;
 if (fileKind === "docx") {
 try {
 const html = await mammoth.convertToHtml({ buffer });
 docxHtml = html.value;
 } catch (err) {
 console.warn("[parse] DOCX→HTML conversion failed:", err);
 }
 }

 return NextResponse.json({
 parsed,
 file_url: storagePath,
 file_name: file.name,
 file_type: fileKind,
 docx_html: docxHtml,
 });
 } catch (err) {
 // Plan-limit hits are expected, not failures — surface them as 429
 // with the structured fields the UI uses to show an upgrade prompt.
 if (err instanceof PlanLimitError) {
 return NextResponse.json(
 {
 error: "AI call limit reached",
 current: err.current,
 limit: err.limit,
 plan: err.plan,
 },
 { status: 429 }
 );
 }
 console.error("Invoice parse error:", err);
 const message = err instanceof Error ? err.message : "Unknown error";
 return NextResponse.json(
 { error: `Parse failed: ${message}` },
 { status: 500 }
 );
 }
}
