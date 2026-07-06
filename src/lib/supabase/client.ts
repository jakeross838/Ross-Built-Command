"use client";

import { createBrowserClient } from "@supabase/ssr";

// ── Auth-lock hardening: ROOT CAUSE of the invoices-list ~15s hang ──────────
// supabase-js serializes every auth op (getSession, token refresh) behind a
// cross-tab Web Lock (`navigator.locks`, name `lock:sb-<ref>-auth-token`). The
// DEFAULT lock waits INDEFINITELY for that exclusive lock. When it's held — by
// another tab, or by a refresh that stalled and never released it — the very
// first thing the invoices page does (`supabase.auth.getSession()`) blocks, and
// with it every RLS query behind it; the page only renders via its 15s safety
// timeout. Confirmed on RB via `navigator.locks.query()`: the auth lock held
// exclusive with getSession requests queued behind it, and ZERO REST queries
// fired during the load. See Supabase Discussion #37755.
//
// This lock keeps normal cross-tab serialization when the lock is free (so
// legitimate token refreshes still don't race), but NEVER blocks the app for
// more than ~1s: if it can't acquire the lock within that budget it runs the
// operation without it. A rare, briefly-unserialized auth read is far less
// harmful than hanging every page load for 15 seconds. The 1s budget also
// comfortably covers a normal token refresh (~300-500ms), so concurrent-refresh
// (refresh-token-rotation) conflicts are avoided in the common case.
async function boundedAuthLock<R>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> {
  if (
    typeof navigator === "undefined" ||
    !navigator.locks ||
    typeof navigator.locks.request !== "function"
  ) {
    return await fn();
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1000);
  try {
    return (await navigator.locks.request(
      name,
      { mode: "exclusive", signal: controller.signal },
      async () => {
        clearTimeout(timer);
        return await fn();
      }
    )) as R;
  } catch {
    // AbortError (lock not acquired within the budget) or any lock failure →
    // run without the lock rather than hang the load.
    clearTimeout(timer);
    return await fn();
  }
}

// Single shared browser client — cookies are synchronized so auth state
// persists across navigation and is readable by the Next.js middleware.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { lock: boundedAuthLock } }
);

// ─────────────────────────────────────────────────────────────────────────
// Harness-only client-side auth hydration bridge (stage-1.5c-vh W.1).
//
// WHY THIS EXISTS
//   @supabase/ssr's createBrowserClient is supposed to auto-hydrate
//   auth.getUser() from the request's auth cookie. In a real user's
//   browser this works (Jake OBSERVATION A 2026-05-11: real Chromium
//   on the same preview URL renders the full 8-section nav correctly).
//   In headless Playwright Chromium it does NOT — useCurrentRole's
//   getUser() call returns null even though:
//     - The auth cookie is present (Y.1.D diagnostic confirmed at
//       document.cookie level)
//     - The cookie comes from a real /login form submit via
//       Y.1.B's Playwright storageState bootstrap (not manual injection)
//     - The access_token inside the cookie is valid (Z.1 diagnostic
//       confirmed: raw fetch to <project>.supabase.co/auth/v1/user with
//       Bearer <token> returns HTTP 200 + full user payload in 389ms)
//   So the failure is exclusively in the SDK's read/initialize path
//   in this specific headless context.
//
// HOW THE BRIDGE WORKS
//   The harness (src/lib/verification/_browser.ts) writes the session
//   to window.__nightwork_harness_session via context.addInitScript()
//   BEFORE any page <script> runs. When this module loads, the
//   env-gated block below detects the global, calls
//   supabase.auth.setSession() on THIS client instance (not a sibling),
//   and clears the global so route changes don't re-fire it. setSession
//   updates the in-memory session cache, so subsequent useCurrentRole's
//   getUser() returns the cached user without exercising the broken
//   auto-hydration path.
//
// SAFETY
//   Env-gated to NEXT_PUBLIC_VERCEL_ENV !== "production". Vercel sets
//   VERCEL_ENV to "production" on production deploys, "preview" on PR/
//   branch deploys, "development" locally. Next.js inlines
//   NEXT_PUBLIC_* env vars at build time, so on production builds this
//   block compiles to a no-op (`if (false) { ... }`) — dead code in the
//   production bundle, zero attack surface.
//
//   Even on preview/dev, an attacker who could set
//   window.__nightwork_harness_session would need a valid access_token
//   + refresh_token to do anything — and if they have those, they're
//   already authenticated. No privilege escalation.
//
// DIAGNOSTIC TRAIL
//   nwrp79 (Y.2 localStorage injection — was a no-op since @supabase/ssr
//   uses cookies as storage, not localStorage)
//   → nwrp80 (Y.1.D probe — captured cookies + storage on /today)
//   → nwrp82 (Y.1.B — Playwright storageState bootstrap; correct
//   architecturally but the SDK still failed to auto-hydrate)
//   → nwrp83 (Jake real-browser test — confirmed production code is
//   correct; bug is headless-only)
//   → nwrp84 (Z.1 — raw fetch test; proved cookie/token/network all OK)
//   → nwrp85 (research — W.4 sibling-client approach risks multi-
//   instance deadlocks per Supabase Discussion #37755)
//   → nwrp86 (W.1 = THIS BLOCK)
// ─────────────────────────────────────────────────────────────────────────
if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_VERCEL_ENV !== "production"
) {
  const inj = (
    window as {
      __nightwork_harness_session?: {
        access_token?: unknown;
        refresh_token?: unknown;
      };
    }
  ).__nightwork_harness_session;
  if (
    inj &&
    typeof inj.access_token === "string" &&
    inj.access_token.length > 0 &&
    typeof inj.refresh_token === "string" &&
    inj.refresh_token.length > 0
  ) {
    void supabase.auth
      .setSession({
        access_token: inj.access_token,
        refresh_token: inj.refresh_token,
      })
      .catch(() => {
        /* harness session ingestion failed; harmless — the real auth
           path (cookie/SSR) is still in place. Silenced to avoid noise
           in browser console on routes where the global is partial. */
      });
    // Single-use: clear so HMR / route changes / Strict-Mode double-mount
    // don't re-fire (setSession is mildly expensive — it writes storage +
    // emits BroadcastChannel events + may trigger token refresh).
    delete (
      window as { __nightwork_harness_session?: unknown }
    ).__nightwork_harness_session;
  }
}
