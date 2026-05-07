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

/**
 * Attaches the Supabase auth session as a cookie on a Playwright BrowserContext
 * so that subsequent `page.goto(...)` requests authenticate as the harness
 * fixture user. Without this, the Nightwork Next.js middleware redirects
 * unauthenticated traffic to `/login` and Layer 3 screenshots capture the
 * login page instead of the targeted app surface (nwrp66 surfaced this:
 * run #25520633491 had all 4 Layer 3 ACs fail conf 0.95 with reasoning
 * "screenshot shows a Nightwork login page").
 *
 * Cookie format mirrors @supabase/ssr's default storage:
 *
 *   name:  `sb-<projectRef>-auth-token`        (chunked: `.0`, `.1` if >3180 chars)
 *   value: `base64-` + base64URL(JSON.stringify(session))
 *   path:  `/`
 *   sameSite: `Lax`
 *   secure: true (preview URLs are https)
 *
 * Project ref is `<hostname>.split(".")[0]` of `supabaseUrl` — same derivation
 * used by `@supabase/supabase-js` (`SupabaseClient.ts` line 369).
 *
 * Idempotent with session-undefined path: returns empty array (caller
 * passes `[...vercelBypassHeaders, ...this]` shape; empty merges harmlessly).
 *
 * NOTE: Cookie attachment authenticates the harness as the harness-fixture
 * user (org-admin in fixture-harness-org). Per CLAUDE.md, `/design-system/*`
 * is gated to platform_admin in production — so the harness will still hit
 * a 404/redirect on those routes UNTIL Jake authorizes either (a) granting
 * platform_admin to harness-fixture, or (b) relaxing /design-system/*
 * middleware in non-prod. nwrp67 explicitly halts before that decision.
 *
 * @param supabaseUrl  e.g. "https://abc123.supabase.co"
 * @param previewUrl   the Vercel preview URL (used for cookie domain scope)
 * @param rawSession   the session object from supabase.auth.signInWithPassword
 */
export interface PlaywrightCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

const SUPABASE_BASE64_PREFIX = "base64-";
const SUPABASE_MAX_CHUNK_SIZE = 3180; // matches @supabase/ssr/utils/chunker.js

export function supabaseSessionCookies(
  supabaseUrl: string | undefined,
  previewUrl: string,
  rawSession: unknown | undefined
): PlaywrightCookie[] {
  if (!supabaseUrl || !rawSession) return [];

  let projectRef: string;
  let previewHost: string;
  try {
    projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    previewHost = new URL(previewUrl).hostname;
  } catch {
    return [];
  }
  if (!projectRef || !previewHost) return [];

  const cookieBaseName = `sb-${projectRef}-auth-token`;
  // base64URL: standard base64 with `+` → `-`, `/` → `_`, no padding.
  const json = JSON.stringify(rawSession);
  const base64url = Buffer.from(json, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const fullValue = SUPABASE_BASE64_PREFIX + base64url;

  // Chunk if needed — @supabase/ssr stores chunks as `<name>.0`, `<name>.1`
  // when total > MAX_CHUNK_SIZE. Server-side decoder concatenates in order.
  const chunks: { name: string; value: string }[] = [];
  if (fullValue.length <= SUPABASE_MAX_CHUNK_SIZE) {
    chunks.push({ name: cookieBaseName, value: fullValue });
  } else {
    let i = 0;
    for (let offset = 0; offset < fullValue.length; offset += SUPABASE_MAX_CHUNK_SIZE) {
      chunks.push({
        name: `${cookieBaseName}.${i}`,
        value: fullValue.slice(offset, offset + SUPABASE_MAX_CHUNK_SIZE),
      });
      i += 1;
    }
  }

  // 400 days from now (matches DEFAULT_COOKIE_OPTIONS.maxAge in @supabase/ssr).
  const expires = Math.floor(Date.now() / 1000) + 400 * 24 * 60 * 60;

  return chunks.map((c) => ({
    name: c.name,
    value: c.value,
    domain: previewHost,
    path: "/",
    expires,
    httpOnly: false,
    secure: true,
    sameSite: "Lax",
  }));
}
