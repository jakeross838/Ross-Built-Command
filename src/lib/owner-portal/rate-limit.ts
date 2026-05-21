/**
 * Server-only Owner Portal rate-limit guard — F1 Wave-B Slice-2 B-2a.
 *
 * Per CONTEXT D-15 + iter-1 SYNTHESIS B-6 + nwrp201/202 LOCKED:
 * DB-backed counter table + atomic upsert RPC. Replaces the non-
 * functional in-process Map rate-limit (the prior B-2 design — Vercel
 * serverless invocations destroy the Map per request, so the counter
 * never accumulated).
 *
 * Storage layer (created in supabase/migrations/00104_b2a_token_
 * issuance_security_model.sql §5):
 * - `owner_portal_rate_limit` table — (key_type, key_value,
 *   window_start, request_count) keyed by (key_type, key_value,
 *   window_start) with 60s window granularity
 * - `record_owner_portal_request(p_key_type, p_key_value, p_window_
 *   start)` RPC — atomic INSERT-ON-CONFLICT-DO-UPDATE returning
 *   request_count for race-free counter increment
 * - `cleanup_owner_portal_rate_limit()` RPC — TTL cleanup (5-minute
 *   retention); called opportunistically on every 100th request
 *
 * Both RPCs are SECURITY DEFINER with pinned search_path; PUBLIC
 * EXECUTE revoked; GRANT only to service_role per BLK-4 + 00102/00103
 * hardening pattern.
 *
 * Default limits (per nwrp202 §3 + plan §6.f):
 * - TOKEN_LIMIT_PER_MINUTE = 30 (per-token bursts; covers 3 surfaces ×
 *   ~10 requests/window homeowner browsing)
 * - IP_LIMIT_PER_MINUTE = 60 (per-IP global cap; backstop against
 *   scripted enumeration)
 *
 * Failure-mode: fail-OPEN on DB error (better to leak rate-limit than
 * block legitimate users on a transient infra issue). Sentry breadcrumb
 * documents the fail-open path for observability.
 *
 * References:
 *   - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-PLAN.md §6.f + §5 Task 6
 *   - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-CONTEXT.md D-15
 *   - supabase/migrations/00104_b2a_token_issuance_security_model.sql §5/§5b/§5d
 *   - nwrp201/202 (rate-limit DB-backed LOCKED)
 */

import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Per-token rate-limit ceiling — 30 requests per 60-second window.
 * Covers normal homeowner browsing (load dashboard → poll status →
 * acknowledge draw = ~3 surfaces × ~10 requests each).
 */
export const TOKEN_LIMIT_PER_MINUTE = 30;

/**
 * Per-IP rate-limit ceiling — 60 requests per 60-second window.
 * Backstop against scripted enumeration where an attacker rotates
 * tokens but reuses an IP. Higher than per-token because legitimate
 * traffic can multiplex multiple tokens through a corporate proxy.
 */
export const IP_LIMIT_PER_MINUTE = 60;

/**
 * Frequency of opportunistic cleanup calls. With 1% probability per
 * request, the TTL cleanup function runs to delete rows older than
 * 5 minutes. This keeps table growth bounded without requiring
 * pg_cron (no precedent in Nightwork) or a separate cron worker.
 */
const OPPORTUNISTIC_CLEANUP_PROBABILITY = 0.01;

export interface RateLimitResult {
  /** True if the request is within the limit (allow); false if blocked. */
  allowed: boolean;
  /** Suggested Retry-After value (seconds) when allowed=false. */
  retryAfterSeconds?: number;
}

/**
 * Record a request from `keyType`/`keyValue` and return whether it's
 * within the limit. Atomic via the `record_owner_portal_request` RPC
 * (INSERT-ON-CONFLICT-DO-UPDATE returning the new count).
 *
 * Window rounding: each request rounds its timestamp DOWN to the
 * nearest minute boundary (UTC). All requests landing within the same
 * minute share a single counter row. This is a fixed window (NOT
 * sliding) — a known simplification trade for atomicity. Burst-at-
 * window-rollover is bounded by the per-IP cap.
 *
 * Failure-mode: fail-OPEN on DB error. Returns `{ allowed: true }` so
 * a transient DB issue doesn't block legitimate homeowner traffic.
 * Sentry breadcrumb logs the fail-open for post-hoc analysis.
 *
 * Opportunistic cleanup: 1% probability per call invokes
 * `cleanup_owner_portal_rate_limit()` to delete rows older than 5
 * minutes. Bounded table growth without pg_cron.
 *
 * @param keyType — 'token' (per-token hash) or 'ip' (per-IP)
 * @param keyValue — opaque key (token hash hex string or IP address)
 * @returns RateLimitResult with allowed + optional retryAfterSeconds
 * @throws never — fail-open on any error
 */
export async function recordOwnerPortalRequest(
  keyType: "token" | "ip",
  keyValue: string,
): Promise<RateLimitResult> {
  // Round window down to the nearest minute boundary (UTC).
  const windowStart = new Date(
    Math.floor(Date.now() / 60000) * 60000,
  ).toISOString();

  let count: number;
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("record_owner_portal_request", {
      p_key_type: keyType,
      p_key_value: keyValue,
      p_window_start: windowStart,
    });
    if (error) {
      // Fail-OPEN. Better to leak rate-limit briefly than block users
      // on a transient infra issue. Breadcrumb for post-hoc analysis.
      console.warn(
        `[owner-portal-rate-limit] fail-open on RPC error: ${error.message} (key=${keyType}:${keyValue.slice(0, 8)})`,
      );
      return { allowed: true };
    }
    count = (data as number) ?? 1;
  } catch (err) {
    // Fail-OPEN on unexpected error (e.g., createServiceRoleClient
    // throws if SUPABASE_SERVICE_ROLE_KEY is missing).
    console.warn(
      `[owner-portal-rate-limit] fail-open on unexpected error: ${err instanceof Error ? err.message : err}`,
    );
    return { allowed: true };
  }

  const limit =
    keyType === "token" ? TOKEN_LIMIT_PER_MINUTE : IP_LIMIT_PER_MINUTE;
  if (count > limit) {
    // Retry-After: ceiling of seconds until window rollover.
    const msIntoWindow = Date.now() % 60000;
    const retryAfter = Math.ceil((60000 - msIntoWindow) / 1000);
    return { allowed: false, retryAfterSeconds: retryAfter };
  }

  // Opportunistic cleanup — 1% probability per request.
  if (Math.random() < OPPORTUNISTIC_CLEANUP_PROBABILITY) {
    try {
      const supabase = createServiceRoleClient();
      await supabase.rpc("cleanup_owner_portal_rate_limit");
    } catch {
      // Cleanup failure is non-critical; swallow silently. The TTL
      // cleanup is opportunistic; even if every cleanup call fails,
      // the table only grows by ~60 rows/min/key (bounded by the
      // UNIQUE constraint on (key_type, key_value, window_start)).
    }
  }

  return { allowed: true };
}
