// Layer 3 — vision runner with idempotency + cost cap.
//
// For each criterion (category='visual' or 'semantic'):
//   1. Derive idempotency key (commit_sha + criterion_hash + org_id per C4).
//   2. Check cache at .planning/verification/runs/[phase]/[commit]/vision-<key>.json.
//      Cache hit → reuse cached verdict + skip Anthropic call (vision_cost_usd=0).
//   3. If not cached: capture screenshot at preview URL (Playwright chromium
//      with iter-1 MEDIUM-2 sandbox args), check cost cap (canSpend(estimate)),
//      if OK call vision API, record actual cost.
//   4. Write result to cache for future runs.
//   5. Convert to VerificationResult (with confidence populated).
//
// Per D-22 idempotency contract: rerun against same commit = no API calls.
// Per D-07: confidence < 0.7 propagates to result; state machine reads.
//
// ITER-1 ARCH-CRIT-3 amendment: Layer3Context is IMPORTED from ../types
// (Plan 1's foundation). Local redefinition is forbidden.
//
// ITER-1 C2 + D-30 amendment: screenshot path includes ctx.org_id segment
// so artifacts are tenant-scoped BY CONSTRUCTION. Plan 6 GH Actions strips
// raw bytes from git-tracked artifacts.
//
// ITER-1 C4 + D-30 amendment: deriveIdempotencyKey threads ctx.org_id at
// every callsite; CostCap is constructed from ctx.cost_cap_remaining_usd
// when present (Plan 8b runLoop owns the cap; runner enforces). When absent
// (standalone runs from scripts/verify-phase.ts), default $1 budget applies.
//
// ITER-1 W5 enterprise-readiness amendment: cache-write-after-cost crash
// window — cacheWriteJson is called AFTER costCap.record() so a crash
// mid-cost-record doesn't leave a cached verdict whose cost was never
// accounted for. (Plan 1 idempotency.ts uses temp-file + atomic rename
// inside cacheWriteJson; this runner also enforces the ordering.)
//
// ITER-1 MEDIUM-2 amendment: chromium launch args from shared _browser.ts
// helper (extracted in Plan 4 since Plan 4 is the 2nd chromium-launch site).
//
// ITER-1 W1 enterprise-readiness amendment: Sentry tagging on harness
// exceptions. Top-level try/catch wraps the loop body; on error, dynamically
// imports @sentry/nextjs (the SDK actually present in package.json) +
// captureException with tags {layer, phase, commit_sha, org_id} and extra
// {error_redacted: redactApiKey(message)}.

import { chromium, type Browser } from "playwright";
import { mkdirSync } from "node:fs";
import * as path from "node:path";
import type {
  Layer3Context,
  VerificationResult,
  VisionResult,
} from "../types";
import {
  deriveIdempotencyKey,
  cacheReadJson,
  cacheWriteJson,
} from "../idempotency";
import {
  callVisionApi,
  estimateVisionCostUsd,
  redactApiKey,
} from "./vision-client";
import { CostCap } from "./cost-cap";
import {
  chromiumLaunchArgs,
  harnessBrowserHeaders,
  harnessStorageStateOption,
} from "../_browser";

// Updated 2026-05-07 per nwrp62 FIX 4: see vision-client.ts DEFAULT_MODEL.
const VISION_MODEL_ID = "claude-sonnet-4-6";

export async function runLayer3(
  ctx: Layer3Context
): Promise<VerificationResult[]> {
  const layer3Criteria = ctx.criteria.filter(
    (c) => c.category === "visual" || c.category === "semantic"
  );
  if (layer3Criteria.length === 0) return [];

  const apiKey = ctx.api_key ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fail-soft: every Layer 3 criterion gets verdict='SKIP' with reason.
    return layer3Criteria.map<VerificationResult>((criterion) => ({
      criterion_id: criterion.id,
      layer: 3,
      verdict: "SKIP",
      error: "ANTHROPIC_API_KEY not set — Layer 3 vision skipped",
      duration_ms: 0,
      idempotency_key: deriveIdempotencyKey(
        ctx.commit_sha,
        criterion,
        ctx.org_id
      ).composite,
    }));
  }

  // ITER-1 C4 amendment: CostCap is constructed by Plan 8b runLoop and
  // threaded in via ctx.cost_cap_remaining_usd. If absent (called outside
  // loop, e.g. from scripts/verify-phase.ts), construct locally with default
  // $1 budget. The remaining_usd path is the load-bearing one — it bounds
  // iter-N total spend across the runLoop iterations (NOT multiplied 3×).
  const costCap =
    ctx.cost_cap_remaining_usd !== undefined
      ? new CostCap(ctx.cost_cap_remaining_usd)
      : new CostCap(ctx.cost_cap_usd ?? 1.0);

  // ITER-1 C2 + D-30 amendment: screenshot path includes ctx.org_id so
  // artifacts are tenant-scoped BY CONSTRUCTION. Even single-tenant today,
  // the path SHAPE is tenant-bounded. Plan 6 GH Actions strips raw bytes
  // from git-tracked artifacts; per-org subdir is mandatory.
  const screenshotsDir = path.resolve(
    ctx.repo_root,
    ".planning/verification/runs",
    ctx.phase,
    ctx.commit_sha,
    "screenshots",
    ctx.org_id
  );
  mkdirSync(screenshotsDir, { recursive: true });

  // ITER-1 MEDIUM-2 amendment: shared chromium launch args. See _browser.ts
  // for sandbox-arg policy.
  const browser: Browser = await chromium.launch({
    args: chromiumLaunchArgs(),
  });
  const results: VerificationResult[] = [];

  try {
    for (const criterion of layer3Criteria) {
      const start = Date.now();
      const idempotencyKey = deriveIdempotencyKey(
        ctx.commit_sha,
        criterion,
        ctx.org_id
      );

      // Idempotency check: reuse cached vision result if present
      const cacheKey = `vision-${idempotencyKey.composite.slice(0, 16)}`;
      const cached = cacheReadJson<VisionResult>(
        ctx.phase,
        ctx.commit_sha,
        cacheKey
      );

      if (cached) {
        results.push({
          criterion_id: criterion.id,
          layer: 3,
          verdict: cached.verdict,
          confidence: cached.confidence,
          reasoning: cached.reasoning,
          evidence: `cached (rerun no-op per D-22)`,
          duration_ms: Date.now() - start,
          idempotency_key: idempotencyKey.composite,
          vision_cost_usd: 0, // cached → no spend
        });
        continue;
      }

      // Cost cap check (pre-call estimate)
      const estimate = estimateVisionCostUsd(VISION_MODEL_ID);
      if (!costCap.canSpend(estimate)) {
        results.push({
          criterion_id: criterion.id,
          layer: 3,
          verdict: "SKIP",
          error: `Cost cap reached (spent $${costCap.getSpentUsd().toFixed(3)} of $${costCap.getMaxUsd().toFixed(2)}); skipping vision call to stay under budget`,
          duration_ms: Date.now() - start,
          idempotency_key: idempotencyKey.composite,
          vision_cost_usd: 0,
        });
        continue;
      }

      // Capture screenshot at the page URL implied by the criterion.
      // Convention v1 (matches Layer 1 dom-assertions parser): if criterion
      // text starts with "Page <path>:", use <path>. Otherwise fall back to
      // "/" (preview URL root).
      const pathMatch = criterion.text.match(/^Page\s+(\S+):/);
      const route = pathMatch ? pathMatch[1] : "/";
      const pageUrl = `${ctx.preview_url.replace(/\/$/, "")}${route.startsWith("/") ? route : `/${route}`}`;
      const screenshotPath = path.join(screenshotsDir, `${cacheKey}.png`);

      let visionResult: VisionResult;
      try {
        // Per nwrp63 FIX 5 + nwrp68 FIX 9: thread Vercel + Nightwork
        // verification bypass headers into Playwright. harnessBrowserHeaders()
        // merges both — Vercel SSO bypass for protected previews and
        // Nightwork app verification bypass for /design-system/* routes.
        //
        // Y.1.B (nwrp82): auth comes from Playwright storageState bootstrap
        // (scripts/harness-auth-bootstrap.ts) rather than manual cookie +
        // localStorage injection. storageState restores cookies + localStorage
        // + IndexedDB as a unit — the same state a real authenticated user
        // would have after a normal login flow. This is the canonical
        // Playwright auth pattern. The bypass headers are still required
        // (they protect against Vercel SSO + drive Nightwork's design-system
        // gate); only the Supabase auth state moved to storageState.
        const storageState = harnessStorageStateOption();
        const context = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          extraHTTPHeaders: harnessBrowserHeaders(),
          ...(storageState ? { storageState } : {}),
        });
        const page = await context.newPage();
        // Per Block N+1 finding: routes with Supabase realtime subscriptions
        // (e.g. /today Activity Feed) or heavy multi-fixture aggregation
        // (e.g. /design-system/prototypes/jobs/[id]/budget) never reach
        // "networkidle" — Block N+1 confirmed 45s timeout still SKIPped
        // those routes. Switching to "load" (DOM + initial resources loaded)
        // is sufficient for vision rendering. Timeout raised to 45s for
        // additional cold-start headroom.
        await page.goto(pageUrl, {
          waitUntil: "load",
          timeout: 45_000,
        });

        // ── Y.1.D + Z.1 one-time diagnostic (nwrp80 + nwrp84) ─────────────
        // TEMPORARY: will be reverted after analysis completes.
        // Captures client-side auth state on /today (the route where AC-1-8
        // fails) to determine whether cookies are reaching client JS, whether
        // localStorage was populated, and whether the Supabase API is itself
        // reachable + authoritative from the headless Playwright Chromium
        // context. Z.1 (nwrp84) adds the raw /auth/v1/user fetch test to
        // bypass @supabase/ssr SDK and surface ground truth on Supabase
        // reachability + token validity. Redacted throughout: names + sizes
        // + status codes + boolean fields only, never raw token values.
        if (route === "/today" || route.endsWith("/today")) {
          try {
            const supabaseUrlForProbe =
              process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
            const anonKeyForProbe =
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
            const probe = await page.evaluate(
              async ({ supabaseUrl, anonKey }) => {
                const out: Record<string, unknown> = {};
                // Cookies: parse names + lengths only (NO raw values)
                const rawCookies = document.cookie || "";
                const cookieEntries = rawCookies
                  .split(";")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((c) => {
                    const eq = c.indexOf("=");
                    return eq === -1
                      ? { name: c, len: 0, value: "" }
                      : {
                          name: c.slice(0, eq),
                          len: c.length - eq - 1,
                          value: c.slice(eq + 1),
                        };
                  });
                out.cookies_count = cookieEntries.length;
                out.cookies = cookieEntries.map((c) => ({
                  name: c.name,
                  len: c.len,
                }));
                out.cookies_sb_only = cookieEntries
                  .filter((c) => c.name.startsWith("sb-"))
                  .map((c) => ({ name: c.name, len: c.len }));
                // localStorage: sb-* keys with value lengths
                const ls: Array<{ key: string; len: number }> = [];
                try {
                  for (let i = 0; i < window.localStorage.length; i += 1) {
                    const k = window.localStorage.key(i);
                    if (k && k.startsWith("sb-")) {
                      ls.push({
                        key: k,
                        len: (window.localStorage.getItem(k) || "").length,
                      });
                    }
                  }
                } catch {
                  /* localStorage unavailable */
                }
                out.localStorage_sb = ls;
                // sessionStorage: sb-* keys
                const ss: Array<{ key: string; len: number }> = [];
                try {
                  for (let i = 0; i < window.sessionStorage.length; i += 1) {
                    const k = window.sessionStorage.key(i);
                    if (k && k.startsWith("sb-")) {
                      ss.push({
                        key: k,
                        len: (window.sessionStorage.getItem(k) || "").length,
                      });
                    }
                  }
                } catch {
                  /* sessionStorage unavailable */
                }
                out.sessionStorage_sb = ss;
                out.window_supabase_present = Boolean(
                  (window as unknown as { supabase?: unknown }).supabase
                );

                // ── Z.1 raw /auth/v1/user fetch ─────────────────────────────
                // Extract access_token from sb-* cookie (base64- prefix +
                // base64url JSON), make raw fetch to Supabase /auth/v1/user,
                // capture status + redacted shape + errors. Classifies as
                // outcome A/B/C per nwrp84.
                const z1: Record<string, unknown> = {};
                try {
                  const sbCookie = cookieEntries.find((c) =>
                    c.name.startsWith("sb-")
                  );
                  if (!sbCookie) {
                    z1.stage = "no-sb-cookie";
                  } else {
                    let cookieValue = sbCookie.value;
                    // Cookies may be URL-encoded by the browser when read
                    // back via document.cookie; decode defensively.
                    try {
                      cookieValue = decodeURIComponent(cookieValue);
                    } catch {
                      /* leave as-is if not URI-encoded */
                    }
                    if (!cookieValue.startsWith("base64-")) {
                      z1.stage = "cookie-not-base64-prefixed";
                      z1.value_prefix = cookieValue.slice(0, 16);
                    } else {
                      const stripped = cookieValue.slice("base64-".length);
                      // base64url → base64
                      const base64 = stripped
                        .replace(/-/g, "+")
                        .replace(/_/g, "/");
                      // Pad to multiple of 4
                      const padded =
                        base64 + "=".repeat((4 - (base64.length % 4)) % 4);
                      let decoded = "";
                      try {
                        decoded = atob(padded);
                      } catch (decErr) {
                        z1.stage = "base64-decode-failed";
                        z1.error =
                          decErr instanceof Error
                            ? decErr.message
                            : String(decErr);
                      }
                      if (decoded) {
                        let session: { access_token?: string } | null = null;
                        try {
                          session = JSON.parse(decoded);
                        } catch (parseErr) {
                          z1.stage = "json-parse-failed";
                          z1.error =
                            parseErr instanceof Error
                              ? parseErr.message
                              : String(parseErr);
                          z1.decoded_len = decoded.length;
                          z1.decoded_prefix = decoded.slice(0, 64);
                        }
                        const accessToken = session?.access_token;
                        if (accessToken) {
                          z1.access_token_len = accessToken.length;
                          z1.access_token_prefix = accessToken.slice(0, 12);
                          // Now do the raw fetch
                          const apiUrl = `${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`;
                          z1.api_url = apiUrl;
                          const t0 = Date.now();
                          try {
                            const res = await fetch(apiUrl, {
                              method: "GET",
                              headers: {
                                apikey: anonKey,
                                Authorization: `Bearer ${accessToken}`,
                              },
                            });
                            z1.fetch_ms = Date.now() - t0;
                            z1.http_status = res.status;
                            z1.http_ok = res.ok;
                            const bodyText = await res.text();
                            z1.body_len = bodyText.length;
                            // Redacted body summary: parse + extract only
                            // boolean + ID-shape fields (no email, no user
                            // metadata, no tokens). Surfaces enough to
                            // classify A/B/C per nwrp84.
                            try {
                              const body = JSON.parse(bodyText);
                              z1.body_shape = {
                                has_id: typeof body.id === "string",
                                id_format_uuid:
                                  typeof body.id === "string" &&
                                  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
                                    body.id
                                  ),
                                has_aud: typeof body.aud === "string",
                                aud_value: body.aud,
                                has_role: typeof body.role === "string",
                                role_value: body.role,
                                has_email_field: "email" in body,
                                has_app_metadata: "app_metadata" in body,
                                error_code: body.code || body.error_code,
                                error_message_present: Boolean(
                                  body.message || body.msg
                                ),
                                error_message_first_60: (
                                  body.message ||
                                  body.msg ||
                                  ""
                                )
                                  .toString()
                                  .slice(0, 60),
                              };
                              // Classify per nwrp84
                              if (res.ok && body.id && body.aud) {
                                z1.outcome = "A_fetch_succeeds";
                              } else if (res.status === 401) {
                                z1.outcome = "C_fetch_401";
                              } else {
                                z1.outcome = `unexpected_status_${res.status}`;
                              }
                            } catch (bodyParseErr) {
                              z1.body_parse_error =
                                bodyParseErr instanceof Error
                                  ? bodyParseErr.message
                                  : String(bodyParseErr);
                              z1.body_first_120 = bodyText.slice(0, 120);
                              if (!res.ok) {
                                z1.outcome = `unexpected_status_${res.status}`;
                              }
                            }
                          } catch (fetchErr) {
                            z1.fetch_ms = Date.now() - t0;
                            z1.outcome = "B_fetch_network_error";
                            z1.fetch_error =
                              fetchErr instanceof Error
                                ? fetchErr.message
                                : String(fetchErr);
                          }
                        } else if (!z1.stage) {
                          z1.stage = "no-access-token-in-session";
                          z1.session_keys = session
                            ? Object.keys(session)
                            : [];
                        }
                      }
                    }
                  }
                } catch (z1Err) {
                  z1.stage = "z1-outer-throw";
                  z1.error =
                    z1Err instanceof Error ? z1Err.message : String(z1Err);
                }
                out.z1_raw_supabase_fetch = z1;
                return out;
              },
              { supabaseUrl: supabaseUrlForProbe, anonKey: anonKeyForProbe }
            );
            // Redacted log line — appears in harness-output.json (stdout is
            // captured to that file by the workflow). Grep-able marker.
            console.log(
              "[Y.1.D-diagnostic] /today client-side auth state probe:",
              JSON.stringify(probe)
            );
          } catch (probeErr) {
            console.log(
              "[Y.1.D-diagnostic] probe failed:",
              probeErr instanceof Error ? probeErr.message : String(probeErr)
            );
          }
        }
        // ── end Y.1.D + Z.1 diagnostic ────────────────────────────────────

        // nwrp70/71 FIX 11: fullPage screenshot (capped at 7800px height) so
        // long-scroll design-system pages don't lose below-the-fold content.
        // Pre-flight diagnostic confirmed #5B8699 stone-blue (palette/page.tsx:63)
        // and 0.14em tracking (typography/page.tsx:266) are both rendered below
        // the prior 800px viewport fold.
        //
        // nwrp71 FIX 11b: Anthropic vision API rejects images with any
        // dimension > 8000px. The patterns page (1715 lines, ~15000px tall
        // fullPage) hit this limit; AC-138/139 SKIPped with HTTP 400 "image
        // dimensions exceed max allowed size: 8000 pixels". Cap height at
        // 7800px (margin of safety) using Playwright's `clip` option for
        // pages taller than the cap; fall back to `fullPage:true` for pages
        // that fit. Loses bottom content of pages > 7800px (currently only
        // the patterns page); preserves full content of all others.
        const scrollHeight = await page.evaluate(
          () => document.documentElement.scrollHeight
        );
        const MAX_SCREENSHOT_HEIGHT = 7800;
        if (scrollHeight > MAX_SCREENSHOT_HEIGHT) {
          await page.screenshot({
            path: screenshotPath,
            clip: { x: 0, y: 0, width: 1280, height: MAX_SCREENSHOT_HEIGHT },
          });
        } else {
          await page.screenshot({ path: screenshotPath, fullPage: true });
        }
        await context.close();

        visionResult = await callVisionApi({
          criterion,
          screenshot_path: screenshotPath,
          page_url: pageUrl,
          api_key: apiKey,
        });
        // ITER-1 W5 amendment: record cost BEFORE writing the cache. If the
        // process crashes between record() and cacheWriteJson(), the next
        // run will re-call the API (cache miss) and the cost will be charged
        // once again — wasteful but correct. The opposite ordering (cache
        // first, record second) would let a crash mid-record produce a
        // cached verdict whose cost was never accounted for in the cap, and
        // a future rerun would silently exceed the budget.
        costCap.record(visionResult.vision_cost_usd);
      } catch (err) {
        results.push({
          criterion_id: criterion.id,
          layer: 3,
          verdict: "SKIP",
          error:
            err instanceof Error
              ? redactApiKey(err.message)
              : redactApiKey(String(err)),
          evidence: `pageUrl=${pageUrl}`,
          duration_ms: Date.now() - start,
          idempotency_key: idempotencyKey.composite,
          vision_cost_usd: 0,
        });
        continue;
      }

      // Persist cache AFTER cost is recorded (W5 ordering above).
      // cacheWriteJson uses temp-file + atomic rename (per Plan 1
      // idempotency.ts) so a partial write cannot leave a corrupt cache.
      cacheWriteJson(ctx.phase, ctx.commit_sha, cacheKey, visionResult);

      results.push({
        criterion_id: criterion.id,
        layer: 3,
        verdict: visionResult.verdict,
        confidence: visionResult.confidence,
        reasoning: visionResult.reasoning,
        // ITER-1 C5 (overlap): evidence in committed reports is sanitized in
        // Plan 5 report-writer. Per-commit (gitignored) reports keep full
        // evidence including pageUrl + screenshotPath.
        evidence: `pageUrl=${pageUrl}; screenshot=${screenshotPath}`,
        duration_ms: Date.now() - start,
        idempotency_key: idempotencyKey.composite,
        vision_cost_usd: visionResult.vision_cost_usd,
      });
    }
  } catch (err) {
    // ITER-1 W1 enterprise-readiness: Sentry tagging on harness exceptions.
    // Dynamic-import @sentry/nextjs so absence (test environments etc.)
    // doesn't break compilation. Tags carry phase + commit + layer + org so
    // ops can filter by tenant when investigating.
    try {
      const sentry = (await import("@sentry/nextjs").catch(() => null)) as
        | typeof import("@sentry/nextjs")
        | null;
      if (sentry?.captureException) {
        const errMsg = err instanceof Error ? err.message : String(err);
        sentry.captureException(err, {
          tags: {
            layer: "3",
            phase: ctx.phase,
            commit_sha: ctx.commit_sha,
            org_id: ctx.org_id,
          },
          extra: {
            error_redacted: redactApiKey(errMsg),
          },
        });
      }
    } catch {
      // Sentry capture itself failed; swallow and re-throw original error.
    }
    throw err;
  } finally {
    await browser.close();
  }

  return results;
}
