// src/app/company/expenses/page.tsx
// F4 placeholder per Stage 1.5c Plan 4 — overhead expenses.

import NwPlaceholderCard from "@/components/nw/NwPlaceholderCard";

export default function ExpensesPage() {
  return (
    <div className="px-6 py-8 max-w-[800px] mx-auto">
      <NwPlaceholderCard
        eyebrow="Company · Expenses"
        headline="Overhead expense tracking"
        body="Company overhead expenses — rent, utilities, software, fleet, insurance — with categorization and trend analysis. Feeds the P&L overhead bucket."
        wave="F4"
      />
    </div>
  );
}
