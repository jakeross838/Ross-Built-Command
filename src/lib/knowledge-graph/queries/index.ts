// Knowledge-graph queries registry — placeholder.
//
// Per umbrella Q11 D, the knowledge graph has TWO concerns:
//   1. Validators (cross-entity invariants) — see ../validators/
//   2. Queries (cross-entity reads with intent) — this directory
//
// QUERIES are NOT shipped in slice B-1b. F2-F5 expands this:
//   - F2 "Today Engine" introduces queries like
//     `queryTodayItemsForRole(role, org_id)` that join across
//     invoices / pay-apps / change-orders / lien-releases with
//     role-aware filtering.
//   - F3 "Approval Engine" introduces queries like
//     `queryPendingApprovalsForUser(user_id, org_id)` that gather
//     cross-entity pending items.
//   - F5 "Price Intel Engine" introduces queries like
//     `queryHistoricalCostBenchmark(cost_code_id, region)` that
//     join invoice line-items against the cost-intelligence corpus.
//
// Adding a new query (F2+):
//   1. Author `queries/<id>.ts` exporting a typed async function with
//      ValidatorContext-style threading (`ctx: { supabase, org_id, user_id }`).
//   2. Add a named re-export here.
//   3. Register in `queryRegistry` below.
//   4. Unit test at `__tests__/queries/<id>.test.ts`.
import type { ValidatorContext } from "../types";

/**
 * Stable signature for any cross-entity query. Inputs vary per query;
 * outputs are query-specific. Async-uniform per Q3.
 */
export type CrossEntityQuery<TInput, TOutput> = (
  input: TInput,
  ctx: ValidatorContext,
) => Promise<TOutput>;

// Empty until F2 ships. Typed as a generic `Map` so future registrations
// inherit the shape without further refactor.
export const queryRegistry: ReadonlyMap<
  string,
  CrossEntityQuery<unknown, unknown>
> = new Map();
