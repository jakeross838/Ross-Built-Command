// Layer 1 — DOM assertion runner.
//
// Reads `dom`-category VerificationCriterion items and uses Playwright chromium
// to navigate the preview URL and assert each.
//
// Convention v1 (forward-extensible per D-02): criterion.text matches:
//   `Page <path> contains element "<css-selector>"`
//   `Page <path> contains text "<text>"`
//
// Future conventions (e.g. "Page X has N rows where ...") add a new parser
// branch here without rewriting the runner. PLAN files use exact text per
// the criteria mandate (Plan 8a).
//
// Per iter-1 SECURITY MEDIUM-2: chromium.launch() always passes
// --disable-dev-shm-usage; --no-sandbox is conditional on CI env detection
// (CI=true OR GITHUB_ACTIONS=true). Local dev keeps the default Chromium
// sandbox; CI containers without /dev/shm or namespaced sandboxes get the
// minimum-viable arg set.
//
// Per D-23 / .planning/lessons.md: never force-kill. browser.close() is
// awaited in the finally block; no kill -9 on the browser process.

import { chromium, type Browser, type Page } from "playwright";
import type {
  VerificationCriterion,
  VerificationResult,
} from "../types";
import { deriveIdempotencyKey } from "../idempotency";
import {
  chromiumLaunchArgs,
  harnessBrowserHeaders,
  supabaseSessionCookies,
  type PlaywrightCookie,
} from "../_browser";
import type { HarnessSessionLike } from "../types";

interface Viewport {
  name: string;
  width: number;
  height: number;
}

const VIEWPORTS: Viewport[] = [
  { name: "desktop", width: 1920, height: 1080 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "mobile", width: 393, height: 852 },
];

interface ParsedCriterion {
  path: string;
  kind: "element" | "text";
  needle: string;
}

function parseDomCriterion(text: string): ParsedCriterion | null {
  const m = text.match(
    /^Page\s+(?<path>\S+)\s+contains\s+(?<kind>element|text)\s+"(?<needle>[^"]+)"$/
  );
  if (!m || !m.groups) return null;
  return {
    path: m.groups.path,
    kind: m.groups.kind as "element" | "text",
    needle: m.groups.needle,
  };
}

// chromiumLaunchArgs extracted to ../_browser.ts in Plan 4 (2nd chromium
// launch site triggered the Plan 3 SUMMARY-recommended extraction). Local
// definition removed — single source of truth honors iter-1 MEDIUM-2 sandbox
// policy without drift risk.

export async function runDomAssertions(
  preview_url: string,
  commit_sha: string,
  criteria: VerificationCriterion[],
  org_id?: string,
  harness_session?: HarnessSessionLike
): Promise<VerificationResult[]> {
  const domCriteria = criteria.filter((c) => c.category === "dom");
  if (domCriteria.length === 0) return [];

  const browser: Browser = await chromium.launch({
    args: chromiumLaunchArgs(),
  });
  const results: VerificationResult[] = [];

  // Per nwrp67 FIX 8: build the Supabase auth cookies once (per harness run)
  // rather than reconstructing on each viewport context. Empty array if no
  // session — context.addCookies([]) is a no-op.
  const authCookies: PlaywrightCookie[] = supabaseSessionCookies(
    harness_session?.supabase_url,
    preview_url,
    harness_session?.raw_session
  );

  try {
    // Run each DOM criterion across all 3 viewports
    for (const viewport of VIEWPORTS) {
      // Per nwrp63 FIX 5: thread Vercel bypass into chromium context (same
      // pattern as Layer 3 runner.ts). DOM convention v1 criteria don't
      // currently exist in this phase (Plan 2's were N/A'd in nwrp60 FIX 3),
      // but applying here closes the gap before any future phase authors a
      // real DOM criterion against a protected preview.
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        extraHTTPHeaders: harnessBrowserHeaders(),
      });
      // Per nwrp67 FIX 8: attach Supabase auth cookies after newContext()
      // so the Nightwork app middleware doesn't redirect to /login.
      if (authCookies.length > 0) {
        await context.addCookies(authCookies);
      }
      const page: Page = await context.newPage();

      for (const criterion of domCriteria) {
        const start = Date.now();
        const parsed = parseDomCriterion(criterion.text);
        if (!parsed) {
          results.push({
            criterion_id: `${criterion.id}@${viewport.name}`,
            layer: 1,
            verdict: "SKIP",
            error: `Criterion text does not match Layer 1 DOM convention v1: '${criterion.text}'`,
            duration_ms: Date.now() - start,
            idempotency_key: deriveIdempotencyKey(commit_sha, criterion, org_id)
              .composite,
          });
          continue;
        }

        try {
          const url = `${preview_url.replace(/\/$/, "")}${parsed.path}`;
          // Per Block N+1 finding: "networkidle" never settles on routes with
          // Supabase realtime subs or heavy multi-fixture aggregation. "load"
          // is sufficient for DOM assertions. Timeout 45s for cold-start.
          await page.goto(url, { waitUntil: "load", timeout: 45_000 });
          let found = false;
          if (parsed.kind === "element") {
            const count = await page.locator(parsed.needle).count();
            found = count > 0;
          } else {
            const body = await page.locator("body").innerText();
            found = body.includes(parsed.needle);
          }
          results.push({
            criterion_id: `${criterion.id}@${viewport.name}`,
            layer: 1,
            verdict: found ? "PASS" : "FAIL",
            evidence: `viewport=${viewport.name}; url=${url}; needle=${parsed.needle}`,
            expected: `${parsed.kind} "${parsed.needle}" present on ${parsed.path}`,
            actual: found
              ? undefined
              : `not found at viewport ${viewport.name}`,
            duration_ms: Date.now() - start,
            idempotency_key: deriveIdempotencyKey(commit_sha, criterion, org_id)
              .composite,
          });
        } catch (err) {
          results.push({
            criterion_id: `${criterion.id}@${viewport.name}`,
            layer: 1,
            verdict: "FAIL",
            evidence: `viewport=${viewport.name}; navigation/assertion error`,
            expected: parsed.needle,
            actual: undefined,
            error: err instanceof Error ? err.message : String(err),
            duration_ms: Date.now() - start,
            idempotency_key: deriveIdempotencyKey(commit_sha, criterion, org_id)
              .composite,
          });
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  return results;
}
