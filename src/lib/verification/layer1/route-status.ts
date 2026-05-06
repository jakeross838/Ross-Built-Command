// Layer 1 — route status checker.
//
// Walks autodiscovered (or explicitly passed) routes against the Vercel preview
// URL and reports HTTP status. 200 PASS; 3xx PASS-with-redirect-note; 4xx/5xx FAIL.
//
// Per Q3a-now expectations: 12 production routes 1.5c IA mounts. This phase
// runs against whatever routes exist on the harness branch; the
// "12 routes" assertion only fires once IA merges through the harness.
//
// Per D-23: never force-kill anything. fetch() respects the AbortController if
// passed; Plan 5 orchestrator owns timeout/abort policy.

import { readdir, stat } from "node:fs/promises";
import * as path from "node:path";
import type {
  VerificationResult,
  VerificationCriterion,
} from "../types";
import { deriveIdempotencyKey } from "../idempotency";

/**
 * Recursively scan src/app/ for page.tsx files. Convert each to a URL path.
 * - app/page.tsx → "/"
 * - app/dashboard/page.tsx → "/dashboard"
 * - app/financials/invoices/[id]/page.tsx → "/financials/invoices/[id]"
 * - Excludes app/api/, app/_*, layout.tsx, route.ts.
 *
 * Note: dynamic [param] segments are returned literally; orchestrator (Plan 5)
 * substitutes safe placeholders or skips them per phase config.
 */
export async function discoverRoutes(repo_root: string): Promise<string[]> {
  const appDir = path.resolve(repo_root, "src/app");
  const routes: string[] = [];

  async function walk(dir: string, urlPath: string): Promise<void> {
    let entries: string[] = [];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      // Skip private folders, the api dir, and dotfiles
      if (entry.startsWith("_") || entry === "api" || entry.startsWith(".")) {
        continue;
      }
      const full = path.join(dir, entry);
      const stats = await stat(full).catch(() => null);
      if (!stats) continue;
      if (stats.isDirectory()) {
        // Route group like (auth) doesn't contribute to URL path
        const segment =
          entry.startsWith("(") && entry.endsWith(")") ? "" : `/${entry}`;
        await walk(full, urlPath + segment);
      } else if (entry === "page.tsx" || entry === "page.ts") {
        routes.push(urlPath || "/");
      }
    }
  }

  await walk(appDir, "");
  return routes.sort();
}

export async function runRouteStatusCheck(
  preview_url: string,
  commit_sha: string,
  routes: string[],
  org_id?: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  for (const route of routes) {
    const start = Date.now();
    // Skip routes with unsubstituted [param] segments — orchestrator (Plan 5) is
    // responsible for substituting safe placeholders or skipping per phase config.
    if (/\[[^\]]+\]/.test(route)) continue;

    const criterion: VerificationCriterion = {
      id: `layer1-route-status-${route.replace(/\W/g, "-").replace(/^-+|-+$/g, "") || "root"}`,
      phase: "(any)",
      plan: "(synthetic)",
      category: "mechanical",
      text: `Route ${route} returns HTTP 200 (or documented 3xx)`,
      layer: 1,
    };

    try {
      const url = `${preview_url.replace(/\/$/, "")}${route}`;
      const res = await fetch(url, {
        method: "GET",
        // Don't follow redirects — log them as PASS-with-redirect; downstream criteria
        // may require redirect chains for auth flows.
        redirect: "manual",
      });
      const verdict = res.status >= 200 && res.status < 400 ? "PASS" : "FAIL";
      results.push({
        criterion_id: criterion.id,
        layer: 1,
        verdict,
        evidence: `${url} → HTTP ${res.status}`,
        expected: "HTTP 2xx or 3xx",
        actual: verdict === "PASS" ? undefined : `HTTP ${res.status}`,
        duration_ms: Date.now() - start,
        idempotency_key: deriveIdempotencyKey(commit_sha, criterion, org_id)
          .composite,
      });
    } catch (err) {
      results.push({
        criterion_id: criterion.id,
        layer: 1,
        verdict: "FAIL",
        evidence: `${preview_url}${route} fetch error`,
        expected: "HTTP 2xx or 3xx",
        actual: "fetch failed",
        error: err instanceof Error ? err.message : String(err),
        duration_ms: Date.now() - start,
        idempotency_key: deriveIdempotencyKey(commit_sha, criterion, org_id)
          .composite,
      });
    }
  }

  return results;
}
