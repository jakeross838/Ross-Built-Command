// src/app/admin/cost-codes/page.tsx
//
// Cost Codes management at /admin/cost-codes — REAL-LOGIC mount of
// /settings/cost-codes logic. Per Stage 1.5c Plan 6 + iter-2 mechanical #10:
// getCurrentMembership preserved verbatim (grep diff zero vs
// /settings/cost-codes/page.tsx).
//
// Re-uses CostCodesManager client component from /settings/cost-codes.

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org/session";
import CostCodesManager from "@/app/settings/cost-codes/CostCodesManager";
import type { CostCode } from "@/app/settings/cost-codes/page";

export const dynamic = "force-dynamic";

export default async function CostCodesPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");

  const supabase = createServerClient();
  const { data: codes } = await supabase
    .from("cost_codes")
    .select("id, code, description, category, sort_order, is_change_order")
    .eq("org_id", membership.org_id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      <CostCodesManager initial={(codes ?? []) as CostCode[]} />
    </div>
  );
}
