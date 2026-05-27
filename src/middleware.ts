import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isFeatureEnabled } from "@/lib/feature-flags";

// Anything a signed-out visitor can reach (marketing + auth pages).
// "/" is the marketing landing; the root page redirects authed users
// to /dashboard itself, so we leave that branching to the page.
//
// F1-Wave-B Slice-2 B-2a extension (per CONTEXT D-12 + iter-1 SYNTHESIS
// B-5 + W-1 disposition split form): owner-portal paths added with
// per-entry auth-model comments. PUBLIC_PATHS bypasses the auth-redirect
// in the !user branch below; route handlers and pages MUST do their own
// auth checks (token resolution via `resolveOwnerToken` for anon; or
// `getCurrentMembership()` + role assertion for authenticated admin).
// PUBLIC_PATHS extension is NOT an auth-check skip — only an auth-
// redirect skip. (See Sweep 4 in B-2a-PLAN.md §5.)
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/pricing",
  "/forgot-password",
  // F1-Wave-B Slice-2 B-2a per D-12: anon homeowner UI (B-2b). Matches
  // /owner/{token} via the startsWith(`${p}/`) matcher below. Route
  // handler does token resolution via `resolveOwnerToken` from
  // src/lib/owner-portal/token.ts; invalid/expired/revoked tokens
  // return 404 in B-2b.
  "/owner",
  // F1-Wave-B Slice-2 B-2a per D-12 + B-5: anon homeowner pay-app
  // acknowledge endpoint (B-2b). Reaches route handler as anon (NOT
  // 401 by middleware). Route handler does token resolution +
  // `assertDrawBelongsToToken` from src/lib/owner-portal/token.ts.
  "/api/owner-portal/acknowledge",
  // F1-Wave-B Slice-2 B-2b per BLK-1 fix (plan-checker iter-1): anon
  // homeowner pay-app acknowledge endpoint. The existing
  // /api/owner-portal/acknowledge entry above does NOT cover this route
  // because the matcher at line 65-66 requires `pathname === p` OR
  // `pathname.startsWith(`${p}/`)` — both fail when the suffix is
  // `-pay-app` (hyphen, not slash). Explicit entry required.
  // Reaches route handler as anon; route handler does token resolution +
  // assertDrawBelongsToToken from src/lib/owner-portal/token.ts.
  "/api/owner-portal/acknowledge-pay-app",
  // F1-Wave-B Slice-2 B-2a per D-12: authenticated admin revocation
  // endpoint. Reaches route handler as authenticated (PUBLIC_PATHS
  // entry is for auth-redirect skip; route handler enforces auth via
  // `getCurrentMembership()` + asserts role IN ('owner', 'admin')).
  // CSRF protection at route handler via Origin header validation
  // (H-2 iter-1 SYNTHESIS).
  "/api/owner-portal/admin",
];

// Pages that remain reachable even when the billing gate is "expired".
// Users need to be able to open the billing page to resubscribe, hit the
// Stripe portal/checkout APIs, and still log out.
//
// iter-2 mechanical #4 (security MEDIUM SEC-5): /admin/billing added
// alongside /settings/billing because Plan 1 Task 3 redirects
// /settings/billing → /admin/billing (308 permanent). Without this
// entry, expired-trial users redirected by the billing gate to
// /settings/billing would 308 to /admin/billing, hit the gate again
// (since /admin/billing was not in escape paths), redirect back to
// /settings/billing, infinite loop. Both paths kept here so the
// transition period remains safe and the gate redirect destination
// (line 137 below) lands on /admin/billing without recursion.
const BILLING_ESCAPE_PATHS = [
  "/settings/billing",   // legacy — kept for transition period; redirects to /admin/billing
  "/admin/billing",      // iter-2 mechanical #4 — canonical billing path post-1.5c per D-01
  "/api/stripe",
  "/pricing",
  "/login",
];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some(
    (p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`))
  );
}

function canEscapeBillingGate(pathname: string): boolean {
  return BILLING_ESCAPE_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

/**
 * Verification-bypass for /design-system/* routes only (per nwrp68).
 *
 * The verification harness (Plan 6 GH Action) needs to render
 * `/design-system/*` surfaces in Layer 3 vision and Layer 1 DOM checks.
 * The harness fixture user is org-admin in fixture-harness-org and is
 * intentionally NOT platform_admin (D-30: cross-tenant grant for a system
 * account would violate tenant-safety-by-construction). This function
 * provides a narrow header-gated bypass that mirrors the established
 * `x-vercel-protection-bypass` pattern at the application layer.
 *
 * Defense-in-depth (all four required to bypass):
 * 1. `pathname` must be inside /design-system/* (caller filters before invoking).
 * 2. `VERIFICATION_BYPASS_SECRET` env var must be set (fail closed if unset).
 * 3. `VERCEL_ENV` must NOT be `"production"` — bypass NEVER works on the
 *    production deployment, regardless of secret state. Preview + dev only.
 * 4. Request header `x-nightwork-verification-bypass` must equal the secret
 *    via timing-safe comparison.
 *
 * D-30 alignment: design-system is platform-presentation (sample data per
 * CLAUDE.md "Sample data only — no Drummond, no real Ross Built records"),
 * not tenant data. The bypass is narrow, secret-gated, production-blocked,
 * and audit-logged. Tenant-data routes (/api/*, /jobs, /financials, etc.)
 * are unaffected — they continue to enforce membership-scoped RLS as before.
 *
 * If granted, the request still flows through `updateSession` (so the
 * existing user / billing-gate / Sentry-tag pipeline runs); we simply
 * skip the platform_admin role check on `/design-system/*`.
 */
function isVerificationBypass(request: NextRequest): boolean {
  // 1. Caller (the design-system gate below) verifies pathname before this
  //    runs. Defense-in-depth: re-check here so the helper is safe to call
  //    from any future surface without trusting the caller.
  const { pathname } = request.nextUrl;
  if (pathname !== "/design-system" && !pathname.startsWith("/design-system/")) {
    return false;
  }
  // 2. Secret must be set (fail closed).
  const secret = process.env.VERIFICATION_BYPASS_SECRET;
  if (!secret || secret.length < 16) return false;
  // 3. Production-blocked. VERCEL_ENV is set by Vercel — "production" only
  //    on the production deployment; "preview" on PR / branch deployments;
  //    "development" / undefined locally.
  if (process.env.VERCEL_ENV === "production") return false;
  // 4. Header must match (timing-safe compare).
  const provided = request.headers.get("x-nightwork-verification-bypass");
  if (!provided || provided.length !== secret.length) return false;
  let mismatch = 0;
  for (let i = 0; i < secret.length; i += 1) {
    mismatch |= secret.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function middleware(request: NextRequest) {
  const T0 = Date.now();
  const { response, user, gate, isPlatformAdmin } = await updateSession(request);
  const { pathname } = request.nextUrl;
  if (process.env.PERF_LOG === "1" && pathname.startsWith("/api/")) {
    console.log(`[perf] middleware ${pathname}: ${Date.now() - T0}ms`);
  }

  // Bounce signed-in users away from auth-only pages.
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!user && !isPublic(pathname)) {
    // API routes called from client JS expect JSON, not a redirect to /login.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Platform admin route guard. Must run BEFORE the billing gate —
  // staff need to access platform-admin tools even when their own org
  // is expired, and non-staff shouldn't see the page exists.
  //
  // Per Stage 1.5c Plan 6 Task 2 (iter-2 must-fix CRITICAL #4 LOCKS
  // Option A — security BLOCKING SEC-1 + compliance W-1): regex
  // extended to ALSO match /platform-admin/* with the same
  // isPlatformAdmin posture. The 13 sub-routes migrated from
  // /admin/platform/* to /platform-admin/* (per iter-2 D-20 / D-058
  // Decision B-modified) must be gated identically. Plan 1's wildcard
  // redirect (/admin/platform/:path* → /platform-admin/:path*) sends
  // existing bookmarks to /platform-admin/*; without this regex
  // extension, those redirects would land at unprotected pages —
  // SEC-1 BLOCKING.
  //
  // iter-2 watchpoint #3 verification: a PM (non-platform_admin)
  // authenticated session navigating to /platform-admin/audit MUST
  // receive redirect to /dashboard (NOT successful render). Plan 6
  // SUMMARY documents the smoke test result.
  if (
    pathname === "/admin/platform" ||
    pathname.startsWith("/admin/platform/") ||
    pathname === "/platform-admin" ||
    pathname.startsWith("/platform-admin/")
  ) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      // Use the actual pathname for redirect param so user lands at
      // the right place after login (not always /admin/platform).
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!isPlatformAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    // Authorized — fall through to response.
  }

  // Internal-Launch Phase 1 — feature-flag 404 gates (HIDE per nwrp227,
  // CONTEXT D-05). Insertion point: AFTER platform-admin block AND AFTER
  // updateSession (line 141) so Sentry tags (user_id, org_id,
  // impersonation_active, platform_admin) are stamped on requests that
  // hit these 404s. Insertion BEFORE design-system block because design-
  // system is platform-presentation (sample data; not tenant) and feature
  // flags don't apply.
  //
  // Gate ordering: Owner Portal dual-gate FIRST (most sensitive — built at
  // full external-grade security rigor but staying hidden until external
  // launch per locked-scope §DEFERRED). Section gates next; sub-route
  // gates last.
  //
  // Response shape per CONTEXT D-05:
  //   /api/* paths → NextResponse.json({ error: "Not found" }, { status: 404 })
  //     (matches existing /api/* JSON 401 precedent at lines 157-162)
  //   non-API paths → NextResponse.rewrite(notFoundUrl, { status: 404 })
  //     (matches existing design-system 404 rewrite precedent; rewrite not
  //      redirect because a 3xx redirect leaks the route's existence)
  //
  // Reversibility: flip NEXT_PUBLIC_FEATURE_<NAME> to "true" in Vercel +
  // redeploy → route re-exposes without code changes. EXCEPTION: /people
  // is hardcoded per nwrp232 OQ #3 path (b) — un-hides at F2/Wave-2 via
  // code change.
  const respond404 = (): NextResponse => {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }
    const notFoundUrl = request.nextUrl.clone();
    notFoundUrl.pathname = "/_not-found";
    notFoundUrl.search = "";
    return NextResponse.rewrite(notFoundUrl, { status: 404 });
  };

  // OWNER PORTAL — DUAL GATE (most sensitive surface; per CONTEXT D-05).
  // Both /owner/* AND /api/owner-portal/* must 404 when flag off, even on
  // direct URL access (PUBLIC_PATHS enumerates 4 entries that bypass auth-
  // redirect; this gate fires AFTER auth gate so PUBLIC_PATHS bypass
  // already let the request through — that's expected; gate fires
  // regardless of auth state).
  if (!isFeatureEnabled("OWNER_PORTAL")) {
    if (pathname === "/owner" || pathname.startsWith("/owner/")) {
      return respond404();
    }
    if (pathname.startsWith("/api/owner-portal/")) {
      return respond404();
    }
  }

  // PIPELINE — entire section + sub-routes.
  if (!isFeatureEnabled("PIPELINE")) {
    if (pathname === "/pipeline" || pathname.startsWith("/pipeline/")) {
      return respond404();
    }
  }

  // COMPANY — entire section + sub-routes.
  if (!isFeatureEnabled("COMPANY")) {
    if (pathname === "/company" || pathname.startsWith("/company/")) {
      return respond404();
    }
  }

  // REPORTS — entire section + sub-routes.
  if (!isFeatureEnabled("REPORTS")) {
    if (pathname === "/reports" || pathname.startsWith("/reports/")) {
      return respond404();
    }
  }

  // PEOPLE — entire section + sub-routes (including /people/clients per
  // CONTEXT D-03 + /people/vendors per nwrp232 Disposition 1).
  // HARDCODED HIDE per nwrp232 OQ #3 path (b) — no env var; no
  // isFeatureEnabled check. Un-hides as part of eventual /people build at
  // F2/Wave-2 via code change (remove this block).
  if (pathname === "/people" || pathname.startsWith("/people/")) {
    return respond404();
  }

  // PRICE INTEL F5 — 7 placeholder sub-routes ONLY (not the /price-intel
  // root, which re-exports /cost-intelligence — a working surface per
  // src/app/price-intel/page.tsx:21). /price-intel/cost-lookup is a
  // REAL-LOGIC re-export — NOT in the F5 hide list.
  if (!isFeatureEnabled("PRICE_INTEL_F5")) {
    const priceIntelF5Routes = [
      "/price-intel/anomaly-review",
      "/price-intel/bid-comparison",
      "/price-intel/cost-database",
      "/price-intel/material-orders",
      "/price-intel/selections-catalog",
      "/price-intel/vendor-performance",
      "/price-intel/verification",
    ];
    for (const route of priceIntelF5Routes) {
      if (pathname === route || pathname.startsWith(`${route}/`)) {
        return respond404();
      }
    }
  }

  // FINANCIALS F1 ORG-WIDE VIEWS — 2 placeholder sub-routes (Coming F1) +
  // 2 Caldwell-fixture-mount Wave-2 routes (/jobs/[id]/schedule +
  // /financials/reconciliation per locked-scope §HIDE). All 4 gated by
  // the same flag because they're conceptually "Wave-2 post-internal-
  // launch financial UI" — re-expose together when F1 + Wave-2 ship
  // (BUNDLE confirmed per nwrp232 OQ #1 disposition).
  if (!isFeatureEnabled("FINANCIALS_F1_VIEWS")) {
    if (
      pathname === "/financials/change-orders" ||
      pathname.startsWith("/financials/change-orders/") ||
      pathname === "/financials/purchase-orders" ||
      pathname.startsWith("/financials/purchase-orders/") ||
      pathname === "/financials/reconciliation" ||
      pathname.startsWith("/financials/reconciliation/")
    ) {
      return respond404();
    }
    // /jobs/{any-id}/schedule + sub-paths — [id] is a dynamic segment.
    if (/^\/jobs\/[^/]+\/schedule(\/.*)?$/.test(pathname)) {
      return respond404();
    }
  }

  // Design-system playground gate (Stage 1.5a T18.5 / SPEC B7).
  //
  //   - Production: unconditional `isPlatformAdmin` check. Non-admins
  //     get a 404 rewrite to `/_not-found`. We rewrite (not redirect)
  //     because a redirect leaks the route's existence via HTTP 3xx;
  //     a 404 makes the route indistinguishable from any other unknown
  //     path. Explicit `status: 404` prevents `NextResponse.rewrite()`
  //     from passing through the destination's status (which can be 200
  //     in some build modes — N1 in security iteration-2).
  //   - Development: gate to authenticated users only. Any authed user
  //     in dev can browse the playground for design feedback; the
  //     production wall stays platform_admin-only.
  //   - Verification-bypass (per nwrp68, replaces the prior CR1/H12 "no
  //     env-var bypass" stance with a tighter contract): the verification
  //     harness can present `x-nightwork-verification-bypass:
  //     <VERIFICATION_BYPASS_SECRET>` to skip the platform_admin check on
  //     /design-system/* ONLY. This is NOT an env-var bypass; the older
  //     comment was specifically about a `BYPASS_DESIGN_SYSTEM_GATE=true`
  //     env-flag that would unlock the route by mere env-var presence.
  //     The new contract requires (a) a request header, (b) a 32+ byte
  //     shared secret, (c) timing-safe match, (d) VERCEL_ENV !== "production".
  //     The production wall remains platform_admin-only because clause (d)
  //     blocks bypass on the prod deployment unconditionally. See
  //     `isVerificationBypass` above for the full check.
  if (pathname === "/design-system" || pathname.startsWith("/design-system/")) {
    if (isVerificationBypass(request)) {
      // Audit log — every bypass usage is observable via console + Sentry.
      // Format intentionally machine-grep-friendly: prefix `[verification-bypass]`,
      // tab-separated fields. No DB write here (the platform_admin_audit
      // table is for operator actions, not system-account verification).
      const ts = new Date().toISOString();
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
        request.headers.get("x-real-ip") ||
        "unknown";
      const ua = request.headers.get("user-agent")?.slice(0, 80) || "unknown";
      console.log(
        `[verification-bypass] pathname=${pathname}\tip=${ip}\tua=${ua}\tts=${ts}`
      );
      // Fall through to response. user/gate/isPlatformAdmin have already
      // been resolved by updateSession; downstream billing-gate logic
      // operates on the resolved user (which is the harness fixture user
      // when the cookie is attached, or null otherwise).
    } else {
      // Defense-in-depth: use VERCEL_ENV as primary signal (set to "production"
      // only on production deployments, NOT on preview deployments). Fall back
      // to NODE_ENV for local. Prior code used NODE_ENV alone, which evaluates
      // "production" on Vercel preview deploys too — weakening the gate. Per
      // stage-1.5c-verification-harness post-ship QA WARNING-1.
      const isProd =
        process.env.VERCEL_ENV === "production" ||
        process.env.NODE_ENV === "production";
      if (isProd) {
        if (!isPlatformAdmin) {
          const notFoundUrl = request.nextUrl.clone();
          notFoundUrl.pathname = "/_not-found";
          notFoundUrl.search = "";
          return NextResponse.rewrite(notFoundUrl, { status: 404 });
        }
      } else {
        // Dev — authenticated users only.
        if (!user) {
          const loginUrl = request.nextUrl.clone();
          loginUrl.pathname = "/login";
          loginUrl.searchParams.set("redirect", pathname);
          return NextResponse.redirect(loginUrl);
        }
      }
    }
    // Authorized — fall through to response.
  }

  // Platform admin API routes: return JSON 401 instead of redirecting.
  if (pathname.startsWith("/api/admin/platform")) {
    if (!user || !isPlatformAdmin) {
      return NextResponse.json(
        { error: "Platform admin required" },
        { status: 401 }
      );
    }
  }

  // Billing enforcement: expired trial / cancelled sub → force to billing
  // page so they can resubscribe. Read-only mode is enforced at API-route
  // level (middleware stays GET-only friendly so pages can still render).
  // Platform admins are exempt — staff need to debug billing issues.
  if (user && !isPlatformAdmin && gate === "expired" && !canEscapeBillingGate(pathname)) {
    const url = request.nextUrl.clone();
    // iter-2 mechanical #4 — canonical billing path post-1.5c per D-01.
    // Pre-1.5c the gate redirected to /settings/billing; that path now
    // 308-redirects to /admin/billing via next.config.mjs. Pointing
    // directly here saves a hop and avoids browsers' redirect-chain
    // rate limiting.
    url.pathname = "/admin/billing";
    url.search = "?trial_expired=1";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on every request except Next internals, static files, and the auth callback.
    "/((?!_next/static|_next/image|favicon.ico|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
