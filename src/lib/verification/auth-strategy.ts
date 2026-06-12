// Verification harness auth strategy.
//
// Per ITER-1 C1 + D-30 amendment: the harness operates on a single fixture-org
// session. There is NO platform-admin escape hatch — if a future need arises,
// it requires explicit D-30 amendment, not a code workaround.
//
// The harness session is constructed by:
//   1. Reading HARNESS_FIXTURE_PASSWORD from process.env (CI secret / .env.local).
//   2. Calling supabase.auth.signInWithPassword with FIXTURE_USER_EMAIL.
//   3. Asserting the resolved session's org_id matches FIXTURE_ORG_UUID
//      (defense-in-depth — fail loudly if migration 00092 is not applied or
//      if the membership table has drift).
//   4. Returning { access_token, refresh_token, user_id, org_id } where
//      org_id is the FIXTURE_ORG_ID slug (what Layer*Context carries) and
//      org_uuid is the database primary key (what Supabase queries filter on).
//
// Per CLAUDE.md "Never hardcode an ORG_ID as a fallback" rule: this module
// does NOT have a fallback path. If sign-in fails, it throws; the orchestrator
// halts; nothing downstream silently degrades.
//
// Per D-30: this is the ONLY auth path for the harness. There is NO
// platform-admin path. Adding one would require explicit D-30 amendment;
// the absence is enforcement-by-construction (a future contributor cannot
// "just this once" reach across tenants by importing a different module).

import { createClient } from "@supabase/supabase-js";
import { FIXTURE_ORG_ID, FIXTURE_ORG_UUID } from "./types";

/**
 * Email of the harness fixture user. Seeded by migration 00092 + a one-time
 * bootstrap (see README chicken-and-egg note). The user has membership
 * (role='admin') in the fixture org ONLY; RLS denies cross-org reads.
 */
export const FIXTURE_USER_EMAIL = "harness-fixture@nightwork.local";

/**
 * Returned by createHarnessSession. Threaded into Layer*Context.org_id (slug)
 * and used by future Supabase queries (UUID). Both are returned so callers
 * never need to do their own slug↔UUID lookup.
 */
export interface HarnessSession {
  access_token: string;
  refresh_token: string;
  user_id: string;
  /**
   * The fixture org SLUG (`"fixture-harness-org"`). This is what every
   * `Layer*Context.org_id` carries today. Plans 1/2/3/4 thread this through
   * the idempotency cache + screenshot path + Sentry tags. Per D-30:
   * tenant-bounded by SHAPE.
   */
  org_id: string;
  /**
   * The fixture org UUID primary key. Used when the harness needs to query
   * Supabase tables directly (RLS filters on the UUID, not the slug). Future
   * Wave 1.1+ usage: a `getCurrentMembership()`-style lookup that resolves
   * the session's `org_id` claim against the live row.
   */
  org_uuid: string;
  /**
   * The Supabase project URL (e.g. `https://abc123.supabase.co`). Used by
   * `attachSupabaseSession()` (in `_browser.ts`) to construct the Supabase
   * SSR auth-cookie name (`sb-<project-ref>-auth-token`) so Playwright
   * navigation carries the user's session and clears Nightwork app
   * middleware redirects to `/login`. Added per nwrp67 FIX 8.
   */
  supabase_url: string;
  /**
   * Raw session object from `supabase.auth.signInWithPassword`. Serialized
   * as the value of the SSR auth cookie. Kept opaque (no field-by-field
   * extraction) so future Supabase auth schema additions flow through
   * automatically. Added per nwrp67 FIX 8.
   */
  raw_session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at?: number;
    token_type: string;
    user: unknown; // Supabase User object — opaque pass-through to the cookie
  };
}

/**
 * Sign in as the harness fixture user and resolve to a session whose
 * `org_id` claim binds to the fixture org. The orchestrator (Plan 5)
 * calls this BEFORE any layer runs; the returned session is threaded
 * through all three Layer*Context constructions.
 *
 * Per ITER-1 C1 + D-30: this is the C1 deliverable — real auth strategy,
 * NOT a deferred-to-F1 placeholder per Jake watchpoint #1.
 *
 * @throws Error if HARNESS_FIXTURE_PASSWORD is not set
 * @throws Error if sign-in fails (with actionable message — likely cause:
 *   the fixture user has not been bootstrapped yet; see README chicken-
 *   and-egg setup)
 */
export async function createHarnessSession(
  supabaseUrl: string,
  anonKey: string
): Promise<HarnessSession> {
  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "[auth-strategy] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set. " +
        "Local dev: copy .env.example → .env.local. CI: GitHub Actions secrets."
    );
  }

  const password = process.env.HARNESS_FIXTURE_PASSWORD;
  if (!password) {
    throw new Error(
      "[auth-strategy] HARNESS_FIXTURE_PASSWORD env var is missing. " +
        "Local: set in .env.local (any sufficiently strong string used at bootstrap time). " +
        "CI: store as a GitHub Actions secret. " +
        "Per D-30: this is the ONLY auth path for the harness; no platform-admin fallback exists."
    );
  }

  // Use the public anon-key client (NOT the service-role client). The session
  // resolves through the same RLS path real customers' sessions resolve
  // through — defense-in-depth: even a malicious migration that flipped
  // RLS policies couldn't grant the harness cross-tenant access without
  // also granting it to every authenticated user.
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email: FIXTURE_USER_EMAIL,
    password,
  });

  if (error || !data.session || !data.user) {
    const code = error?.status ?? "unknown";
    const message = error?.message ?? "no session returned";
    throw new Error(
      `[auth-strategy] Failed to sign in as ${FIXTURE_USER_EMAIL} (status=${code}): ${message}. ` +
        `Likely causes: (a) HARNESS_FIXTURE_PASSWORD does not match what was set at bootstrap; ` +
        `(b) migration 00092 was not applied (fixture-harness-org not seeded); ` +
        `(c) one-time bootstrap not run — see Plan 5 README "Chicken-and-egg setup". ` +
        `Per D-30: there is NO platform-admin escape hatch.`
    );
  }

  // Defense-in-depth: confirm the user has membership in the fixture org.
  // If migration 00092 ran but the user was bootstrapped AFTER and the
  // re-run was skipped, the user has no membership; an unbounded session
  // would otherwise look "fine" but produce empty queries downstream.
  // Failing loudly here surfaces the missing-membership case immediately.
  const { data: membership, error: membershipError } = await client
    .from("org_members")
    .select("org_id, role, is_active")
    .eq("user_id", data.user.id)
    .eq("is_active", true)
    // GH#18 determinism (W-7 per nwrp282): the fixture user is single-org
    // today, but limit-without-order is the multi-org nondeterminism
    // anti-pattern the guard exists to fence. Oldest membership wins.
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    throw new Error(
      `[auth-strategy] User ${FIXTURE_USER_EMAIL} signed in but has NO active org membership. ` +
        `Re-run migration 00092 (the org_members INSERT is gated on the user existing in auth.users — ` +
        `if the user was bootstrapped AFTER the migration ran, re-running 00092 binds the membership). ` +
        `See Plan 5 README "Chicken-and-egg setup" for the full bootstrap flow.`
    );
  }

  // Defense-in-depth: assert the membership UUID matches the well-known
  // FIXTURE_ORG_UUID. If it doesn't, the user has membership in a different
  // org — which violates D-30 (the harness is fixture-org-scoped only).
  if (membership.org_id !== FIXTURE_ORG_UUID) {
    throw new Error(
      `[auth-strategy] [D-30 BREACH] User ${FIXTURE_USER_EMAIL} resolved to org_id=${membership.org_id} ` +
        `but expected FIXTURE_ORG_UUID=${FIXTURE_ORG_UUID}. ` +
        `This indicates the fixture user has membership in a non-fixture org — STOP and investigate. ` +
        `Per D-30: harness must operate on fixture-org-scoped data only; there is no platform-admin escape hatch.`
    );
  }

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user_id: data.user.id,
    org_id: FIXTURE_ORG_ID, // slug — what Layer*Context carries
    org_uuid: FIXTURE_ORG_UUID, // UUID — what RLS filters on
    supabase_url: supabaseUrl, // for SSR cookie construction (nwrp67 FIX 8)
    raw_session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      expires_at: data.session.expires_at,
      token_type: data.session.token_type,
      user: data.session.user,
    },
  };
}
