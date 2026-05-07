// Verification — shared chromium launch helper.
//
// Extracted from src/lib/verification/layer1/dom-assertions.ts (Plan 2) when
// Plan 4 (Layer 3 vision) introduced a second chromium-launching site, per
// Plan 3 SUMMARY recommendation: "if Plan 4 adds a second [chromium launch
// site], propose extraction in Plan 4 SUMMARY". Centralizes the iter-1
// SECURITY MEDIUM-2 sandbox-arg policy so future helpers can't drift.
//
// Per iter-1 SECURITY MEDIUM-2:
// - --disable-dev-shm-usage always (works around /dev/shm size constraints
//   in containers; no security trade-off).
// - --no-sandbox conditional on CI env detection. Local dev keeps Chromium's
//   default sandbox; CI containers without namespaced sandbox capabilities
//   get the relaxed setting (the alternative is no chromium at all in the
//   GitHub Actions runner).

export function chromiumLaunchArgs(): string[] {
  const args = ["--disable-dev-shm-usage"];
  const ci =
    process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
  if (ci) args.push("--no-sandbox");
  return args;
}

/**
 * Vercel deployment-protection bypass headers for use as `extraHTTPHeaders`
 * on `browser.newContext({ extraHTTPHeaders })`.
 *
 * Vercel preview deployments are protected by default — unauthenticated
 * requests get redirected to Vercel SSO. The bypass header lets E2E /
 * automation traffic through. `x-vercel-set-bypass-cookie: true` instructs
 * Vercel to set a session cookie after the first request, so subsequent
 * navigations within the same context don't pay per-request bypass overhead.
 *
 * Source: https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection
 *
 * Returns an empty object when `VERCEL_AUTOMATION_BYPASS_SECRET` is unset —
 * harness behaves as before, useful for local dev against unprotected URLs.
 *
 * Added per nwrp63 FIX 5 because the same gap that route-status.ts (Layer 1
 * fetch path) addressed in nwrp60 FIX 1 had not been propagated to the
 * Playwright path. Run #25514368735 surfaced the gap: every Layer 3
 * screenshot was capturing the Vercel SSO login page instead of the app.
 */
export function vercelBypassHeaders(): Record<string, string> {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!secret) return {};
  return {
    "x-vercel-protection-bypass": secret,
    "x-vercel-set-bypass-cookie": "true",
  };
}
