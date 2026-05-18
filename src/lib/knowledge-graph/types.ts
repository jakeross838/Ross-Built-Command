// Knowledge-graph validator interface contract.
//
// Per umbrella Q11 D (hybrid schema-in-DB + types-generated + validators-in-app)
// + nwrp153 Q3 (validator interface async / uniform Promise<ValidatorResult>).
//
// Locked at slice B-1b ship. F2-F5 will write 35+ validators against this
// contract; do NOT break the interface without explicit cross-wave revisit.
//
// See README.md in this directory for naming conventions, the registry
// pattern, and how to add a new validator.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

/**
 * Context threaded into every validator. Server-side execution model:
 * validators run inside API routes after `getCurrentMembership()` has
 * resolved the caller's tenant scope. The Supabase client is server-side
 * (service-role or RLS-bound depending on validator needs); the caller
 * provides it explicitly so validators can be unit-tested with a stub.
 *
 * `user_id` is null when the caller is a system-initiated context (e.g.,
 * the verification harness running fixture-harness-org).
 *
 * Per CLAUDE.md "Multi-tenant RLS" — validators MUST use ctx.org_id for
 * any DB query (never trust input alone). The standard pattern is to
 * `.eq("org_id", ctx.org_id)` on every read against a tenant table.
 */
export interface ValidatorContext {
  supabase: SupabaseClient<Database>;
  org_id: string;
  user_id: string | null;
}

/**
 * Violation entry surfaced by a validator on `ok: false`. `code` is a
 * stable kebab-case `<domain>-<noun>-<test>` string used for downstream
 * filtering + i18n. `message` is human-readable detail. `evidence` is
 * optional structured payload (offending row id, substring, computed
 * delta, etc.) for diagnostics.
 */
export interface ValidatorViolation {
  code: string;
  message: string;
  evidence?: unknown;
}

/**
 * Result shape. `ok=true` → no violations. `ok=false` → ≥1 violation
 * with structured detail. Even when ok=true, `violations` is the empty
 * array (never undefined) so callers can iterate uniformly.
 */
export interface ValidatorResult {
  ok: boolean;
  violations: ValidatorViolation[];
}

/**
 * Async-uniform per umbrella Q3 (locked nwrp153). Even in-memory checks
 * use Promise so callers don't branch on sync-vs-async. F2-F5 validators
 * that need DB lookups inherit this shape without overload.
 */
export type Validator<T> = (
  input: T,
  ctx: ValidatorContext,
) => Promise<ValidatorResult>;
