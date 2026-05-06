// Layer 3 — per-run cost cap.
//
// Per D-22 + EXPANDED-SCOPE §4: vision calls cost real money. Per-run cap
// (default $1) prevents runaway spending. Per-criterion idempotency (cache
// hit on same commit_sha + criterion_hash) prevents repeated spending on
// reruns.
//
// ITER-1 C4 amendment: CostCap is OWNED by Plan 8b runLoop, NOT Plan 4.
// runLoop instantiates ONE CostCap per phase (default $1) and threads
// `cost_cap_remaining_usd` into each runLayer3 call. runLayer3 enforces
// (canSpend / record) but does NOT construct or own the cap — this prevents
// the iter-N cost-multiplication bug where each iter would have its own $1
// budget = $3 total across 3 iterations. Now total stays ≤ $1 across the loop.
//
// Org-monthly cap is deferred to F3 per EXPANDED-SCOPE §7 (CI test gate
// scope narrowing).

export class CostCap {
  private spent_usd = 0;
  constructor(private readonly max_usd: number) {
    if (max_usd <= 0) throw new Error("CostCap max_usd must be positive");
  }

  canSpend(estimated_usd: number): boolean {
    return this.spent_usd + estimated_usd <= this.max_usd;
  }

  record(actual_usd: number): void {
    this.spent_usd += actual_usd;
  }

  remainingUsd(): number {
    return Math.max(0, this.max_usd - this.spent_usd);
  }

  getSpentUsd(): number {
    return this.spent_usd;
  }

  getMaxUsd(): number {
    return this.max_usd;
  }
}
