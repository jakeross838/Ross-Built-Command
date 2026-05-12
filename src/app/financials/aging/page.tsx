"use client";

// src/app/financials/aging/page.tsx
//
// REAL-LOGIC re-mount per Stage 1.5c Plan 4 (iter-2 architect W-5).
// Copied verbatim from src/app/financials/aging-report/page.tsx.
// Plan 1 redirects /financials/aging-report → /financials/aging.
//
// iter-2 mechanical #10 verification: page-level auth-check grep
// (the three canonical patterns documented in plan SUMMARY) has zero
// matches in src/app/financials/aging-report/page.tsx and zero here.
// Auth posture preserved verbatim — none at the page level; all
// auth happens in API routes invoked client-side.

import Link from "next/link";
import AppShell from "@/components/app-shell";
import FinancialViewTabs from "@/components/financial-view-tabs";

export default function AgingPage() {
  return (
    <AppShell>
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">
        <FinancialViewTabs active="aging" />
        <div className="mb-6">
          <h1 className="font-display text-2xl text-[color:var(--text-primary)]">Aging</h1>
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">
            Cross-job bill aging — current, 30, 60, 90+ days. Coming soon.
          </p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] p-8 text-center">
          <p className="text-sm text-[color:var(--text-secondary)]">
            The aging report will roll up every open bill by age bucket so
            the accounting team can chase vendors and flag stuck items.
          </p>
          <div className="mt-4 inline-flex items-center gap-3">
            <Link
              href="/financials/payments"
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-[var(--nw-stone-blue)] text-[color:var(--nw-stone-blue)] hover:bg-[var(--nw-stone-blue)] hover:text-[color:var(--nw-white-sand)] text-sm font-medium transition-colors"
            >
              Payment Tracking
            </Link>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
