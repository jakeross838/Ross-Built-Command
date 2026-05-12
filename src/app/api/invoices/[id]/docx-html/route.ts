import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import DOMPurify from "isomorphic-dompurify";
import { createServerClient } from "@/lib/supabase/server";
import { ApiError, withApiError } from "@/lib/api/errors";
import {
  getCurrentMembership,
  getMembershipFromRequest,
} from "@/lib/org/session";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

/**
 * Render a DOCX invoice to sanitized HTML so the browser can display it
 * next to the parsed fields. DOCX can't be iframe-embedded like PDFs.
 *
 * Auth: requires an active org membership (per CLAUDE.md Development Rule —
 * every API route gates on `getCurrentMembership()` before DB access).
 * Cross-tenant invoice ids resolve to 404 (existence-side-channel-safe,
 * matching the rest of the /api/invoices/[id]/* family).
 *
 * Per F1 Wave-A Plan A-2 (D-035 first-day task #3): closes the gap where
 * the endpoint previously returned rendered DOCX HTML to unauthenticated
 * requests that knew or guessed a UUID.
 */
export const GET = withApiError(
  async (request: NextRequest, context: { params: { id: string } }) => {
    const membership =
      getMembershipFromRequest(request) ?? (await getCurrentMembership());
    if (!membership) throw new ApiError("Not authenticated", 401);

    const supabase = createServerClient();

    const { data: invoice, error } = await supabase
      .from("invoices")
      .select("id, org_id, original_file_url, original_file_type")
      .eq("id", context.params.id)
      // Defense-in-depth tenant filter — REQUIRED if this route ever switches
      // to tryCreateServiceRoleClient() (service-role bypasses RLS). Do not
      // remove without verifying RLS is still the sole tenant boundary.
      .eq("org_id", membership.org_id)
      .is("deleted_at", null)
      .single();
    if (error || !invoice) throw new ApiError("Invoice not found", 404);
    if (invoice.original_file_type !== "docx") {
      throw new ApiError("Not a DOCX invoice", 400);
    }
    if (!invoice.original_file_url) {
      throw new ApiError("Invoice has no file", 404);
    }

    const { data: fileData, error: dlError } = await supabase.storage
      .from("invoice-files")
      .download(invoice.original_file_url);
    if (dlError || !fileData) {
      throw new ApiError(`Download failed: ${dlError?.message ?? "unknown"}`, 500);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await mammoth.convertToHtml(
      { buffer },
      {
        // Keep it simple — wrap recognized lists/paras. No images (they'd
        // need signed URLs and DOCX invoices rarely embed them).
        styleMap: [
          "p[style-name='Heading 1'] => h2",
          "p[style-name='Heading 2'] => h3",
          "p[style-name='Heading 3'] => h4",
        ],
      }
    );

    // XSS guard (defense in depth): even though every consumer also
    // sanitizes on render, sanitizing here means the value persisted /
    // logged / cached anywhere downstream is already safe. DOMPurify
    // strips <script>, on*= handlers, and javascript: URLs.
    const sanitized = DOMPurify.sanitize(result.value, {
      USE_PROFILES: { html: true },
    });

    return NextResponse.json({
      html: sanitized,
      warnings: result.messages
        .filter((m) => m.type === "warning")
        .map((m) => m.message),
    });
  }
);
