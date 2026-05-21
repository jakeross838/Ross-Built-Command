/**
 * Server-only Owner Portal token helpers — F1 Wave-B Slice-2 B-2a.
 *
 * Per CONTEXT D-13 + D-14 + iter-1 SYNTHESIS B-1/B-3 cross-reviewer
 * alignment (multi-tenant-architect + ai-logic-tester + rls-auditor):
 * converts Owner Portal application-layer scoping from convention to
 * BY-CONSTRUCTION. Authors of B-2b cannot forget the `.eq()` filters
 * because the wrapper applies them at the SupabaseQueryBuilder level.
 *
 * Exports:
 *   - `ResolvedOwnerToken` — interface; carries the FK constraint values
 *     downstream queries MUST filter on
 *   - `resolveOwnerToken(plaintext)` — hash-based token resolution with
 *     timing-uniform null returns (per BLK-3 non-partial token-hash
 *     index — eliminates timing oracle on the resolution hot path)
 *   - `getScopedOwnerPortalClient(resolvedToken)` — returns a
 *     ScopedOwnerPortalClient wrapper exposing `scopedFrom(tableName)`
 *     with pre-injected scope filters
 *   - `assertDrawBelongsToToken(drawId, resolvedToken)` — pinned SQL
 *     with PostgREST `jobs!inner` embed (cite FK constraint name
 *     `draws_job_id_fkey` per CLAUDE.md Workflow Rule 2)
 *
 * Service-role-mediated (token resolution bypasses RLS by hash-eq lookup).
 * NEVER imported into a client component — `import "server-only"` throws
 * at client-bundle build time.
 *
 * References:
 *   - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-PLAN.md §6.e
 *   - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-CONTEXT.md D-13 + D-14
 *   - supabase/migrations/00104_b2a_token_issuance_security_model.sql (composite FK, RPC, non-partial token-hash index)
 *   - CLAUDE.md Workflow posture Rule 2 (PostgREST FK citation requirement)
 */

import "server-only";
import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * A resolved owner-portal token: the result of validating a plaintext
 * token against `client_portal_access`. Carries the FK constraint values
 * that downstream queries MUST filter on for tenant + client scope.
 *
 * `client_id` is non-nullable by design — post-B-2a invariant.
 * `resolveOwnerToken` returns null (NOT a partial token) if `client_id`
 * is NULL, so any caller holding a `ResolvedOwnerToken` can trust
 * `client_id` is populated.
 */
export interface ResolvedOwnerToken {
  portal_access_id: string;
  org_id: string;
  client_id: string;
  job_id: string;
  invited_at: string;
  expires_at: string;
  revoked_at: string | null;
}

/**
 * Tables consumable by `ScopedOwnerPortalClient.scopedFrom()`. String-
 * literal union ensures the type system rejects arbitrary table names —
 * a B-2b author cannot accidentally widen scope to e.g. `organizations`
 * (tenant-foreign) or `invoices` (B-2b read scope is read-only summary
 * subset, NOT raw bills).
 *
 * Extension policy: adding new table names to this union requires
 * updating the `scopedFrom` body with the table's specific filter shape
 * (most tables follow the job_id + org_id pattern; jobs itself follows
 * the id + client_id + org_id triplet). Plan-author latitude per
 * CONTEXT D-13.
 */
export type OwnerPortalScopableTable =
  | "jobs"
  | "draws"
  | "change_orders"
  | "lien_releases";

/**
 * Resolve a plaintext token to its underlying `client_portal_access`
 * row. Returns null on any failure mode (invalid format, no row matches,
 * expired, revoked, NULL client_id post-B-2a invariant).
 *
 * Timing-uniform: per BLK-3 iter-1 SYNTHESIS cross-reviewer alignment
 * (security + ai-logic), the token-hash index is non-partial (no
 * `WHERE revoked_at IS NULL` predicate). All five null-paths share
 * the same lookup latency, eliminating the timing oracle.
 *
 * App-layer filters (revoked_at IS NULL, expires_at > now(), client_id
 * IS NOT NULL) apply AFTER the index scan returns the row, NOT as part
 * of the index predicate. This is intentional per CONTEXT D-04 +
 * iter-1 SYNTHESIS B-7.
 *
 * @param plaintextToken — 64-char hex token from URL or Authorization header
 * @returns ResolvedOwnerToken on success; null on any failure
 * @throws never — returns null on any failure mode
 */
export async function resolveOwnerToken(
  plaintextToken: string,
): Promise<ResolvedOwnerToken | null> {
  if (typeof plaintextToken !== "string" || plaintextToken.length !== 64) {
    return null;
  }
  const hash = createHash("sha256").update(plaintextToken).digest("hex");
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("client_portal_access")
    .select(
      "id, org_id, client_id, job_id, invited_at, expires_at, revoked_at",
    )
    .eq("access_token_hash", hash)
    .maybeSingle();
  if (error || !data) return null;
  // App-layer filters per D-04 (non-partial index eliminates timing oracle).
  if (data.revoked_at !== null) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;
  if (data.client_id === null) return null; // Post-B-4 invariant; defensive.
  return {
    portal_access_id: data.id,
    org_id: data.org_id,
    client_id: data.client_id,
    job_id: data.job_id,
    invited_at: data.invited_at,
    expires_at: data.expires_at,
    revoked_at: data.revoked_at,
  };
}

/**
 * Return a service-role Supabase client pre-scoped to the resolved
 * token's (org_id, client_id, job_id) scope. Every subsequent query
 * MUST go through this client; the wrapper's `scopedFrom()` builder
 * injects the scope filters automatically.
 *
 * Per CONTEXT D-13 + iter-1 SYNTHESIS B-1: converts application-layer
 * scoping from convention to construction. Authors of B-2b cannot forget
 * the `.eq()` filters because the wrapper applies them.
 *
 * Tables that consume this wrapper's scope contract (`OwnerPortalScopable
 * Table` union): jobs, draws, change_orders, lien_releases. Adding a
 * new table requires updating both the union AND `scopedFrom()` body.
 *
 * Note (per N-5 iter-1 SYNTHESIS): the wrapper is a scope-floor enforcer
 * (mandatory `.eq()` injection on every query), not a complete query
 * gate. A B-2b author could still call `.or(...)` to widen scope.
 * Plan-review iter-1 for B-2b MUST include a grep-based mechanical gate
 * blocking direct `createServiceRoleClient()` / `createServerSupabase
 * Client()` invocations in `src/app/api/owner-portal/**` files, ensuring
 * every B-2b route handler routes through `getScopedOwnerPortalClient`.
 */
export function getScopedOwnerPortalClient(
  resolvedToken: ResolvedOwnerToken,
): ScopedOwnerPortalClient {
  const supabase = createServiceRoleClient();
  return new ScopedOwnerPortalClient(supabase, resolvedToken);
}

export class ScopedOwnerPortalClient {
  constructor(
    private supabase: SupabaseClient,
    private resolvedToken: ResolvedOwnerToken,
  ) {}

  /**
   * Issue a SELECT query against `tableName` pre-filtered by the token's
   * (org_id, client_id, job_id) scope.
   *
   * Callers MUST pass select columns as the second argument; the wrapper
   * returns a PostgrestFilterBuilder with scope filters pre-applied,
   * ready for callers to chain further `.eq()` / `.order()` / `.limit()`
   * calls or invoke `.maybeSingle()` / `.single()` to fetch.
   *
   * Scope shape per table:
   * - `jobs`: filters on `(id = token.job_id, client_id = token.client_id,
   *   org_id = token.org_id)` — the strictest scope (triplet identity)
   * - `draws` + `change_orders` + `lien_releases`: filters on
   *   `(job_id = token.job_id, org_id = token.org_id)` — same-job scope
   *
   * The string-literal union (`OwnerPortalScopableTable`) at the type
   * system level rejects arbitrary table names. Extending the union
   * MUST update this body to specify the table's scope shape.
   *
   * @param tableName — one of jobs/draws/change_orders/lien_releases
   * @param selectColumns — column list passed to `.select()` (default '*')
   */
  scopedFrom(tableName: OwnerPortalScopableTable, selectColumns = "*") {
    const base = this.supabase.from(tableName).select(selectColumns);
    if (tableName === "jobs") {
      return base
        .eq("id", this.resolvedToken.job_id)
        .eq("client_id", this.resolvedToken.client_id)
        .eq("org_id", this.resolvedToken.org_id);
    }
    // draws + change_orders + lien_releases all filter on job_id + org_id
    return base
      .eq("job_id", this.resolvedToken.job_id)
      .eq("org_id", this.resolvedToken.org_id);
  }
}

/**
 * Assert that `drawId` belongs to the resolved token's client + org
 * scope. Returns `true` iff the draw exists AND its parent job belongs
 * to the token's client + org. Returns `false` otherwise. Never throws.
 *
 * Pinned SQL per iter-1 SYNTHESIS B-3 + CONTEXT D-14: the only
 * acceptable scope check is via JOIN to `jobs` filtering on
 * `jobs.client_id = token.client_id AND jobs.org_id = token.org_id`
 * (NOT just `draws.org_id` — that permits an intra-org cross-client
 * probe where another client's draw_id in the same org would resolve).
 *
 * Cites FK constraint name `draws_job_id_fkey` (auto-named from
 * `draws.job_id` inline FK in supabase/migrations/00038_phase_b_
 * internal_billings.sql) per CLAUDE.md Workflow Rule 2.
 *
 * Consumed by B-2b's acknowledge endpoint — without this helper, the
 * acknowledge route could use only `.eq('id', drawId).eq('org_id',
 * orgId)` which permits the intra-org cross-client leak.
 *
 * @param drawId — UUID of the draw to verify
 * @param resolvedToken — the token's scope
 * @returns true if draw belongs to token's client+org; false otherwise
 * @throws never — returns false on any failure mode
 */
export async function assertDrawBelongsToToken(
  drawId: string,
  resolvedToken: ResolvedOwnerToken,
): Promise<boolean> {
  if (typeof drawId !== "string" || drawId.length === 0) return false;
  const supabase = createServiceRoleClient();
  // PostgREST embed `jobs!inner(id, client_id, org_id)` resolves via FK
  // constraint `draws_job_id_fkey` (auto-named from inline FK on
  // draws.job_id REFERENCES jobs(id)) per CLAUDE.md Workflow Rule 2.
  const { data, error } = await supabase
    .from("draws")
    .select("id, job_id, org_id, jobs!inner(id, client_id, org_id)")
    .eq("id", drawId)
    .eq("org_id", resolvedToken.org_id)
    .eq("job_id", resolvedToken.job_id)
    .maybeSingle();
  if (error || !data) return false;
  // Cross-validate via the embedded jobs row. PostgREST returns the
  // joined row as `data.jobs`; verify client_id + org_id match the
  // token (defense-in-depth on top of the explicit .eq filters above).
  const job = (
    data as unknown as {
      jobs?: { id?: string; client_id?: string; org_id?: string };
    }
  ).jobs;
  if (!job) return false;
  if (job.org_id !== resolvedToken.org_id) return false;
  if (job.client_id !== resolvedToken.client_id) return false;
  return true;
}
