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
import { chromiumLaunchArgs } from "../_browser";

const VISION_MODEL_ID = "claude-3-5-sonnet-20241022";

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
        const context = await browser.newContext({
          viewport: { width: 1280, height: 800 },
        });
        const page = await context.newPage();
        await page.goto(pageUrl, {
          waitUntil: "networkidle",
          timeout: 20_000,
        });
        await page.screenshot({ path: screenshotPath, fullPage: false });
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
