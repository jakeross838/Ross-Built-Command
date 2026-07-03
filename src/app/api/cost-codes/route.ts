import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { ApiError, withApiError } from "@/lib/api/errors";
import { ADMIN_OR_OWNER, requireRole } from "@/lib/org/require";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Cost code format: codes may be numeric (22101) or a named line item
// ("Contractor Fee"). Valid = non-empty, no control chars, max 64. Rejects only
// blanks/whitespace and parse garbage. Mirrors the client validator in
// CostCodesManager (route files can't export non-handler symbols).
const CODE_FORMAT = /^[^\t\r\n]{1,64}$/;

export const GET = withApiError(async () => {
  const membership = await requireRole(ADMIN_OR_OWNER);
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("cost_codes")
    .select("id, code, description, category, sort_order, is_change_order, has_co_variant")
    .eq("org_id", membership.org_id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw new ApiError(error.message, 500);
  return NextResponse.json({ codes: data ?? [] });
});

export const POST = withApiError(async (request: NextRequest) => {
  const membership = await requireRole(ADMIN_OR_OWNER);
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const body = (await request.json()) as {
    code: string;
    description: string;
    category?: string | null;
    sort_order?: number;
    is_change_order?: boolean;
    has_co_variant?: boolean;
  };
  const code = body.code?.trim() ?? "";
  if (!code || !body.description?.trim()) {
    throw new ApiError("Code and description are required.", 400);
  }
  if (!CODE_FORMAT.test(code)) {
    throw new ApiError(
      `"${code}" is not a valid code — max 64 characters, no line breaks.`,
      400
    );
  }
  const { error } = await supabase.from("cost_codes").insert({
    org_id: membership.org_id,
    code,
    description: body.description.trim(),
    category: body.category ?? null,
    sort_order: body.sort_order ?? 0,
    is_change_order: body.is_change_order ?? false,
    has_co_variant: body.has_co_variant ?? false,
    created_by: user?.id ?? null,
  });
  if (error) {
    if (error.code === "23505") {
      throw new ApiError(`Cost code ${body.code} already exists.`, 409);
    }
    throw new ApiError(error.message, 500);
  }
  return NextResponse.json({ ok: true });
});
