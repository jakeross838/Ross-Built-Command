// src/app/admin/financial/page.tsx
//
// Financial defaults (GC fee %, deposit %, payment schedule) in the flat IA.
// The old /settings/financial URL redirects to /admin (next.config), so this
// re-mounts the existing FinancialSettingsForm under the Admin section, which
// supplies the AppShell via src/app/admin/layout.tsx. Mirrors the
// /admin/cost-codes re-mount pattern.
//
// Deferred here from signup per the one-screen-signup rework: signup collects
// only what a G702/invoice header needs; GC fee / deposit / payment schedule
// live in Settings and are prompted at draw-creation time. Reached from the
// Admin dropdown ("Financial").

import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/org/session";
import FinancialSettingsForm from "@/app/settings/financial/FinancialSettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminFinancialPage() {
  const org = await getCurrentOrg();
  if (!org) redirect("/login");

  return (
    <div className="px-6 py-8 max-w-[1200px] mx-auto">
      <FinancialSettingsForm
        org={{
          default_gc_fee_percentage: Number(org.default_gc_fee_percentage),
          default_deposit_percentage: Number(org.default_deposit_percentage),
          payment_schedule_type: org.payment_schedule_type,
          payment_schedule_config: org.payment_schedule_config,
          cost_intelligence_settings: {
            auto_commit_enabled: org.cost_intelligence_settings?.auto_commit_enabled ?? false,
            auto_commit_threshold: org.cost_intelligence_settings?.auto_commit_threshold ?? 0.95,
            verification_required_for_low_confidence:
              org.cost_intelligence_settings?.verification_required_for_low_confidence ?? true,
          },
          pay_app_signatory_name: org.pay_app_signatory_name,
          pay_app_signatory_title: org.pay_app_signatory_title,
        }}
      />
    </div>
  );
}
