// Verification — shared chromium launch helper.
//
// Extracted from src/lib/verification/layer1/dom-assertions.ts (Plan 2) when
// Plan 4 (Layer 3 vision) introduced a second chromium-launching site, per
// Plan 3 SUMMARY recommendation: "if Plan 4 adds a second [chromium launch
// site], propose extraction in Plan 4 SUMMARY". Centralizes the iter-1
// SECURITY MEDIUM-2 sandbox-arg policy so future helpers can't drift.
//
// Y.1.B (nwrp82) — added HARNESS_AUTH_STATE_PATH and harnessStorageStateOption
// helper for Playwright storageState bootstrap pattern. Replaces the prior
// cookie + localStorage manual injection approach (see DEPRECATED markers on
// supabaseSessionCookies + supabaseLocalStorageInitScript below).

import { existsSync } from "node:fs";
import * as path from "node:path";

/**
 * Canonical path for the bootstrap-captured storageState JSON. Produced by
 * scripts/harness-auth-bootstrap.ts on every CI run BEFORE the main harness
 * invocation. Consumed by Layer 1 + Layer 3 runners via
 * `browser.newContext({ storageState: HARNESS_AUTH_STATE_PATH })`.
 *
 * File is gitignored (contains live session tokens). Regenerated per CI run
 * (~30s overhead). Path is repo-relative; helpers resolve to absolute when
 * passing to Playwright.
 */
export const HARNESS_AUTH_STATE_PATH = path.resolve(
  process.cwd(),
  ".planning/verification/auth/harness-auth-state.json"
);

/**
 * Returns the `storageState` option for `browser.newContext()` if the bootstrap
 * file exists; otherwise returns `undefined` (caller falls back to unauthenticated
 * context, useful for routes that don't need auth like the marketing root).
 *
 * The fallback path is intentional: routes like `/` (marketing landing) don't
 * require auth, and a missing bootstrap file should not crash the harness on
 * those routes. For auth-required routes, the harness's other defenses (route
 * status 200 check in Layer 1; vision verdict reasoning in Layer 3) will flag
 * the missing-auth state as a FAIL, surfacing the bootstrap-not-run condition
 * loudly via test results rather than silent context-creation crash.
 *
 * Per nwrp82 STEP 1.2: "Verify _browser.ts handles missing storageState file
 * gracefully (fail-loudly with actionable error)". The actionable error is
 * surfaced when the file IS expected but missing — see usage at callsites.
 */
export function harnessStorageStateOption(): string | undefined {
  if (existsSync(HARNESS_AUTH_STATE_PATH)) return HARNESS_AUTH_STATE_PATH;
  return undefined;
}
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
 * Nightwork application-layer verification-bypass header for
 * `/design-system/*` routes (per nwrp68; pairs with `isVerificationBypass`
 * in `src/middleware.ts`, commit a3f22b1).
 *
 * The harness fixture user is org-admin (not platform_admin) and the
 * design-system playground is gated to platform_admin in production.
 * Without the bypass, navigation to `/design-system/*` returns 404 (the
 * middleware's "404 to non-staff" wall). This header tells the middleware
 * the request is from the verification harness and short-circuits the
 * platform_admin check on `/design-system/*` only.
 *
 * Defense-in-depth (all enforced server-side in middleware):
 * - Header value must equal `VERIFICATION_BYPASS_SECRET` (timing-safe)
 * - Bypass only applies to `/design-system/*` (server checks pathname)
 * - Bypass NEVER works in `VERCEL_ENV=production`
 * - Audit-logged on every bypass use (server-side console.log)
 *
 * Returns empty object when `VERIFICATION_BYPASS_SECRET` is unset —
 * harness behaves as before, fail-closed.
 *
 * Combined with `vercelBypassHeaders()` and `supabaseSessionCookies()`,
 * the harness now has the full auth chain: Vercel SSO bypass → Nightwork
 * Supabase cookie auth → Nightwork app verification bypass on
 * /design-system/*.
 */
export function nightworkVerificationBypassHeaders(): Record<string, string> {
  const secret = process.env.VERIFICATION_BYPASS_SECRET;
  if (!secret) return {};
  return {
    "x-nightwork-verification-bypass": secret,
  };
}

/**
 * Combined extra-HTTP-headers for Playwright `browser.newContext()`.
 * Convenience wrapper that merges Vercel + Nightwork verification bypass
 * headers in one call. Both helpers are idempotent with their respective
 * secrets unset.
 */
export function harnessBrowserHeaders(): Record<string, string> {
  return {
    ...vercelBypassHeaders(),
    ...nightworkVerificationBypassHeaders(),
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

/**
 * @deprecated since Y.1.B (nwrp82). Use `harnessStorageStateOption()` +
 * `browser.newContext({ storageState })` instead. This helper produced
 * Supabase SSR auth cookies for `context.addCookies()`; it worked for
 * server-side middleware but did NOT hydrate `@supabase/ssr`'s
 * `createBrowserClient` on the client side — confirmed by Y.1.D diagnostic
 * 2026-05-11 (cookies present in `document.cookie` but `auth.getUser()`
 * still returned null). Replaced by Playwright storageState bootstrap which
 * captures a real authenticated context via the actual login flow.
 *
 * Kept in source temporarily for one-more-validation-run comparison; will
 * be removed in cleanup commit after Y.1.B success confirmed.
 */
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

/**
 * @deprecated since Y.1.B (nwrp82). The hypothesis behind this helper —
 * that injecting into localStorage would hydrate the client-side
 * `@supabase/ssr` `createBrowserClient` — was disproven by Y.1.D
 * diagnostic 2026-05-11. The SSR client uses cookies as storage, not
 * localStorage; this script was a no-op for the SSR variant. Replaced
 * by Playwright `storageState` bootstrap which captures the real
 * authenticated context end-to-end via the login flow.
 *
 * Kept in source temporarily for one-more-validation-run comparison;
 * will be removed in cleanup commit after Y.1.B success confirmed.
 *
 * Inject Supabase session into the browser's localStorage so client-side
 * `@supabase/supabase-js` (and `@supabase/ssr`'s `createBrowserClient`,
 * which also falls back to localStorage in some auth-state code paths)
 * can hydrate `auth.getUser()` / `auth.getSession()` from the harness
 * fixture user.
 *
 * Pairs with `supabaseSessionCookies()` (nwrp67 FIX 8) — cookies handle
 * server-side `updateSession()`; this handles client-side hooks like
 * `useCurrentRole()` that call `supabase.auth.getUser()` from the browser.
 *
 * Per Block N+1 diagnostic (nwrp78 finding): the cookie-only injection
 * resolves server-side auth (route 200/308, body renders, RLS works)
 * but leaves client-side `auth.getUser()` returning null on routes whose
 * nav/permission UI depends on a client-side useCurrentRole hook (e.g.
 * /today's 8-section nav). This injects the SAME session payload via
 * `context.addInitScript()` so localStorage is populated BEFORE any
 * `<script>` runs on the navigated page.
 *
 * Storage key convention: `sb-<project-ref>-auth-token` — same name as
 * the SSR cookie, plain JSON (no `base64-` prefix; localStorage stores
 * raw JSON per @supabase/supabase-js default LocalStorage adapter).
 *
 * Idempotent with rawSession=undefined: returns the empty no-op script
 * so the caller can unconditionally attach without a branch.
 *
 * @returns The init-script source string ready for `context.addInitScript(string)`
 */
export function supabaseLocalStorageInitScript(
  supabaseUrl: string | undefined,
  rawSession: unknown | undefined
): string {
  if (!supabaseUrl || !rawSession) return "// supabase-localStorage no-op (no session)";

  let projectRef: string;
  try {
    projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  } catch {
    return "// supabase-localStorage no-op (bad URL)";
  }
  if (!projectRef) return "// supabase-localStorage no-op (no projectRef)";

  const key = `sb-${projectRef}-auth-token`;
  const value = JSON.stringify(rawSession);
  // Embed via JSON.stringify so any quotes in the payload are escaped
  // correctly into a JS string literal.
  const keyLit = JSON.stringify(key);
  const valueLit = JSON.stringify(value);
  return `try { window.localStorage.setItem(${keyLit}, ${valueLit}); } catch (e) { /* localStorage unavailable (e.g. data: scheme); harmless */ }`;
}

/**
 * Y.1.A / W.1 (per stage-1.5c-vh nwrp86) — sibling helper to
 * `supabaseLocalStorageInitScript` that writes the access/refresh tokens
 * to `window.__nightwork_harness_session` BEFORE any page `<script>`
 * runs, so the production-side env-gated block in
 * `src/lib/supabase/client.ts` can detect the global and call
 * `supabase.auth.setSession({ access_token, refresh_token })` on the
 * SAME (module-scoped) client instance the production hooks read from.
 *
 * Why this is necessary: Z.1 diagnostic (nwrp84) confirmed the cookie
 * + token + Supabase API are all valid in headless Playwright Chromium
 * (raw fetch returned HTTP 200), but @supabase/ssr's createBrowserClient
 * fails to auto-hydrate `auth.getUser()` from the cookie in that
 * specific runtime context. The setSession call is the SDK's canonical
 * escape hatch: it force-ingests the session into the client's in-memory
 * cache so subsequent getUser() reads succeed without exercising the
 * broken auto-hydration code path.
 *
 * Why not a sibling client (W.4): nwrp85 research found Supabase emits
 * a "Multiple GoTrueClient Instances Detected" warning and the multi-
 * instance pattern is documented to cause deadlocks (Discussion #37755).
 * Calling setSession on the production client (W.1) avoids that risk.
 *
 * Idempotent with tokens=undefined: returns no-op comment string.
 *
 * @returns The init-script source string ready for `context.addInitScript(string)`
 */
export function supabaseSetSessionBridgeInitScript(
  accessToken: string | undefined,
  refreshToken: string | undefined
): string {
  if (!accessToken || !refreshToken) {
    return "// supabase-set-session bridge no-op (no tokens)";
  }
  const atLit = JSON.stringify(accessToken);
  const rtLit = JSON.stringify(refreshToken);
  return `try { window.__nightwork_harness_session = { access_token: ${atLit}, refresh_token: ${rtLit} }; } catch (e) { /* harmless */ }`;
}
