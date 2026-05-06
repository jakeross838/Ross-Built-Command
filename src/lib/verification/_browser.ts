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
