"use client";

import { createBrowserClient } from "@supabase/ssr";

// Single shared browser client — cookies are synchronized so auth state
// persists across navigation and is readable by the Next.js middleware.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
