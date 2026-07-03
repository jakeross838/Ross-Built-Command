import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { ApiError, withApiError } from "@/lib/api/errors";
import { ADMIN_OR_OWNER, requireRole } from "@/lib/org/require";

export const dynamic = "force-dynamic";

type ImportRow = {
  code: string;
  description: string;
  category?: string | null;
  sort_order?: number;
  is_change_order?: boolean;
  has_co_variant?: boolean;
};

// A "<digits>C" code is the change-order VARIANT of its base (13101C → 13101).
// We never store the variant as its own row — it collapses into the base with
// has_co_variant = true. RB uses 5-digit codes; allow 3-7 for other builders.
const CO_SUFFIX = /^(\d{3,7})[cC]$/;

type Merged = {
  code: string;
  description: string;
  category: string | null;
  sort_order: number;
  is_change_order: boolean;
  has_co_variant: boolean;
  // true when this base was seen ONLY as a "<digits>C" variant (no real base
  // row in the batch) — for an existing DB base we then flip the flag WITHOUT
  // clobbering its real description/category.
  flagOnly: boolean;
};

export const POST = withApiError(async (request: NextRequest) => {
  const membership = await requireRole(ADMIN_OR_OWNER);
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const body = (await request.json()) as { codes?: ImportRow[] };

  if (!Array.isArray(body.codes) || body.codes.length === 0) {
    throw new ApiError("No rows supplied", 400);
  }

  // ---- STEP 2: auto-merge "<digits>C" variants into their base (un-split) ----
  // First pass: every "<digits>C" row marks its base as having a CO variant.
  const coBases = new Map<string, ImportRow>(); // base code -> the C-variant row (desc fallback)
  for (const row of body.codes) {
    const code = (row.code ?? "").trim();
    const m = code.match(CO_SUFFIX);
    if (m) coBases.set(m[1], row);
  }

  // Second pass: keep only base rows; the variant existence becomes a flag.
  const merged = new Map<string, Merged>();
  for (const row of body.codes) {
    const code = (row.code ?? "").trim();
    const description = (row.description ?? "").trim();
    if (!code || CO_SUFFIX.test(code) || !description) continue;
    merged.set(code, {
      code,
      description,
      category: row.category ?? null,
      sort_order: row.sort_order ?? 0,
      is_change_order: row.is_change_order ?? false,
      has_co_variant: row.has_co_variant === true || coBases.has(code),
      flagOnly: false,
    });
  }
  // Bases that appeared ONLY as a "<digits>C" variant (no base row in the batch).
  for (const [base, cRow] of coBases) {
    if (merged.has(base)) continue;
    merged.set(base, {
      code: base,
      description: (cRow.description ?? "").trim() || base,
      category: cRow.category ?? null,
      sort_order: cRow.sort_order ?? 0,
      is_change_order: false,
      has_co_variant: true,
      flagOnly: true,
    });
  }

  // ---- Upsert by (org_id, code) ----
  const { data: existing } = await supabase
    .from("cost_codes")
    .select("id, code")
    .eq("org_id", membership.org_id)
    .is("deleted_at", null);
  const byCode = new Map((existing ?? []).map((c) => [c.code as string, c.id as string]));

  let inserts = 0;
  let updates = 0;

  for (const row of merged.values()) {
    const existingId = byCode.get(row.code);
    if (existingId) {
      // Flag-only base (seen only via its C variant): flip has_co_variant
      // without overwriting the real base's description/category/sort.
      const patch = row.flagOnly
        ? { has_co_variant: true }
        : {
            description: row.description,
            category: row.category,
            sort_order: row.sort_order,
            is_change_order: row.is_change_order,
            has_co_variant: row.has_co_variant,
          };
      const { error } = await supabase
        .from("cost_codes")
        .update(patch)
        .eq("id", existingId)
        .eq("org_id", membership.org_id);
      if (error) throw new ApiError(`Update ${row.code}: ${error.message}`, 500);
      updates++;
    } else {
      const { error } = await supabase.from("cost_codes").insert({
        org_id: membership.org_id,
        code: row.code,
        description: row.description,
        category: row.category,
        sort_order: row.sort_order,
        is_change_order: row.is_change_order,
        has_co_variant: row.has_co_variant,
        created_by: user?.id ?? null,
      });
      if (error) throw new ApiError(`Insert ${row.code}: ${error.message}`, 500);
      inserts++;
    }
  }

  return NextResponse.json({
    imported: inserts + updates,
    inserts,
    updates,
    co_variants_merged: coBases.size,
  });
});
