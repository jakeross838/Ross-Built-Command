import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { ApiError, withApiError } from "@/lib/api/errors";
import { ADMIN_OR_OWNER, requireRole } from "@/lib/org/require";
import { STANDARD_RESIDENTIAL_TEMPLATE } from "@/lib/cost-codes/standard-residential-template";
import { assertOrgHasNoCostCodes } from "@/lib/cost-codes/seed-guard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// The "Standard Residential" starter is a FROZEN, in-repo snapshot
// (src/lib/cost-codes/standard-residential-template.ts) — never a live org.
// See that file's header for provenance + the frozen-starter rule. Divorced
// in 1.1d from the old live-org template coupling (the route used to clone
// Ross Built's own cost codes cross-org), so no live customer's codes can
// ever seed another tenant.

export const GET = withApiError(async () => {
  // Preview the starter template. No DB read — the template ships in-repo.
  return NextResponse.json({ codes: STANDARD_RESIDENTIAL_TEMPLATE });
});

export const POST = withApiError(async () => {
  const membership = await requireRole(ADMIN_OR_OWNER);
  const supabase = createServerClient();

  // ONE guard, all seed doors (1.1d): never seed a starter template into an
  // org that already has cost codes. Throws 422 if the list is non-empty.
  await assertOrgHasNoCostCodes(supabase, membership.org_id);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = STANDARD_RESIDENTIAL_TEMPLATE.map((c) => ({
    org_id: membership.org_id,
    code: c.code,
    description: c.description,
    category: c.category,
    sort_order: c.sort_order,
    is_change_order: c.is_change_order,
    has_co_variant: c.has_co_variant,
    created_by: user?.id ?? null,
  }));

  const { error: insErr } = await supabase.from("cost_codes").insert(rows);
  if (insErr) throw new ApiError(insErr.message, 500);

  return NextResponse.json({ imported: rows.length });
});
