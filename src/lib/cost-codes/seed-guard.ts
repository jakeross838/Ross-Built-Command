import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/errors";

/**
 * Shared cost-code seed guard — ONE implementation, all seed doors (1.1d).
 *
 * A starter/template cost-code seed may only populate an EMPTY cost-code list.
 * If the caller's org already carries any (non-deleted) cost code, blending a
 * frozen starter template into that curated set produces a confusing hybrid,
 * so we refuse with 422 instead of the old filter-and-skip merge.
 *
 * This is the single guard every template-seed path must call BEFORE inserting
 * starter codes:
 *   - `POST /api/cost-codes/template` (the "Standard Residential" starter)
 *   - any future onboarding "Use Template" step
 *
 * It intentionally does NOT gate additive, per-code flows (manual create via
 * `POST /api/cost-codes`, user CSV import, or the sample-data demo generator) —
 * those legitimately add codes to an already-populated org and carry their own
 * idempotency. The guard is for whole-template seeding only.
 */
export async function assertOrgHasNoCostCodes(
  supabase: SupabaseClient,
  orgId: string
): Promise<void> {
  const { count, error } = await supabase
    .from("cost_codes")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .is("deleted_at", null);

  if (error) throw new ApiError(error.message, 500);

  if ((count ?? 0) > 0) {
    throw new ApiError(
      "This organization already has cost codes. The starter template can " +
        "only seed an organization with an empty cost-code list. Add codes " +
        "individually or import a CSV instead.",
      422
    );
  }
}
