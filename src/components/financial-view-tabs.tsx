"use client";

import Link from "next/link";

export type FinancialView =
  | "invoices"
  | "queue"
  | "qa"
  | "payments"
  | "draws"
  | "aging"
  | "liens";

// Gate-2 strip (2026-07): Payments / Aging / Liens tabs removed — their targets
// (/financials/{payments,aging,lien-releases}, via the /invoices/* + aging-report
// redirects) are now 404'd by the extended FINANCIALS_F1_VIEWS gate. Kept:
// Invoices / Queue / QA / Draws. The FinancialView type retains the removed keys
// so any stripped page's `active` prop still typechecks (those pages no longer
// render — middleware 404). Un-hide = re-add the entries.
const TABS: { key: FinancialView; label: string; href: string }[] = [
  { key: "invoices", label: "Invoices", href: "/invoices" },
  { key: "queue", label: "Queue", href: "/invoices/queue" },
  { key: "qa", label: "QA", href: "/invoices/qa" },
  { key: "draws", label: "Draws", href: "/draws" },
];

export default function FinancialViewTabs({
  active,
}: {
  active: FinancialView;
}) {
  return (
    <div
      className="flex items-center gap-1 mb-5 overflow-x-auto"
      style={{ borderBottom: "1px solid var(--border-default)" }}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className="relative px-3 py-2.5 text-[12px] font-medium transition-colors whitespace-nowrap"
            style={{
              color: isActive ? "var(--text-primary)" : "var(--text-tertiary)",
              letterSpacing: "0.02em",
            }}
          >
            {tab.label}
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: "var(--nw-stone-blue)" }}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
