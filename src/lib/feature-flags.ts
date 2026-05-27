// src/lib/feature-flags.ts
//
// Internal-Launch Phase 1 — env-var-as-feature-flag helper (D-04).
//
// Canonical idiom: NEXT_PUBLIC_FEATURE_<NAME> !== "true" (fail-closed default).
// Empty string "" → !== "true" === true → feature OFF (per Jake's nwrp230 +
// SETUP-COMPLETE.md: all 6 Vercel flags set to "" as functionally equivalent
// to "false"). Unset env var → undefined → !== "true" === true → OFF.
//
// Byte-identical to W.1 precedent at src/hooks/use-current-role.ts:67-69
// (NEXT_PUBLIC_AUTH_STATE_LISTENER). Re-uses the proven Next.js NEXT_PUBLIC_*
// build-time inlining contract: Next.js inlines NEXT_PUBLIC_* at build time
// so client + server + Edge middleware all see the same value.
//
// Centralizes the flag NAMES as a TypeScript union so:
//   (a) every read site auto-completes via FeatureFlagName
//   (b) typos surface at compile time (vs runtime "undefined" silent OFF)
//   (c) /nightwork-qa security-reviewer can mechanically grep:
//       `grep -rn "isFeatureEnabled\(" src/` finds every read site
//       `grep -rn "NEXT_PUBLIC_FEATURE_" src/lib/feature-flags.ts` confirms
//       the canonical pattern lives in exactly one file (one-token-per-name)
//
// The 6 flags below match Vercel Production + Preview added 2026-05-26
// per SETUP-COMPLETE.md MANUAL §1.
//
// PEOPLE intentionally NOT a flag per nwrp232 OQ #3 path (b); hardcoded in
// middleware (pathname check, no env var). Reasoning per Jake's disposition:
// People is F2/Wave-2 build that doesn't exist yet; the env var's whole value
// (cheap flip-back) doesn't apply since /people will ship as code, not a
// flag-flip. Hardcoded HIDE; un-hides as part of eventual /people build via
// code change.

export type FeatureFlagName =
  | "OWNER_PORTAL"
  | "PIPELINE"
  | "COMPANY"
  | "REPORTS"
  | "PRICE_INTEL_F5"
  | "FINANCIALS_F1_VIEWS";

// Static mapping: TypeScript union → process.env key. Inline `process.env.X`
// reads are REQUIRED for Next.js NEXT_PUBLIC_* build-time inlining (dynamic
// access like `process.env[`NEXT_PUBLIC_FEATURE_${name}`]` does NOT inline
// per Next.js docs — must be statically analyzable string literals).
const FLAG_ENV_VALUE: Record<FeatureFlagName, string | undefined> = {
  OWNER_PORTAL:        process.env.NEXT_PUBLIC_FEATURE_OWNER_PORTAL,
  PIPELINE:            process.env.NEXT_PUBLIC_FEATURE_PIPELINE,
  COMPANY:             process.env.NEXT_PUBLIC_FEATURE_COMPANY,
  REPORTS:             process.env.NEXT_PUBLIC_FEATURE_REPORTS,
  PRICE_INTEL_F5:      process.env.NEXT_PUBLIC_FEATURE_PRICE_INTEL_F5,
  FINANCIALS_F1_VIEWS: process.env.NEXT_PUBLIC_FEATURE_FINANCIALS_F1_VIEWS,
};

/**
 * Returns `true` if the named feature flag is enabled (env var === "true").
 * Returns `false` otherwise: empty string, "false", any other value, OR
 * env var unset (undefined). This is the FAIL-CLOSED default per W.1.
 *
 * Per CLAUDE.md Workflow Posture Rule 1: combine with Vercel-preview-walk
 * runtime verification — schema verification ≠ runtime verification. UI
 * changes gated by these flags MUST be confirmed on the Vercel preview
 * before /nightwork-qa PASS.
 *
 * Usage:
 *   // middleware.ts
 *   if (!isFeatureEnabled("PIPELINE") && pathname.startsWith("/pipeline")) {
 *     return NextResponse.rewrite(notFoundUrl, { status: 404 });
 *   }
 *
 *   // section overview page
 *   const sections = ALL_SECTIONS.filter(s => s.live || isFeatureEnabled("FINANCIALS_F1_VIEWS"));
 *
 *   // nav-bar PRIMARY_NAV
 *   const PRIMARY_NAV = ALL_NAV_ITEMS.filter(item => {
 *     if (item.key === "pipeline" && !isFeatureEnabled("PIPELINE")) return false;
 *     // ... etc
 *     return true;
 *   });
 */
export function isFeatureEnabled(name: FeatureFlagName): boolean {
  return FLAG_ENV_VALUE[name] === "true";
}
