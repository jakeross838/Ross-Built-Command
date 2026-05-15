// scripts/wave-d-smoke.ts
//
// Wave-D Playwright smoke harness — codifies Rule 4 (CLAUDE.md → Workflow
// posture; Plan D-4 / nwrp121 Addition 2 / nwrp122 iter-2).
//
// Walks 13 unique routes against a Vercel preview URL with harness-fixture
// auth, captures pass/fail JSON + per-route DIAGNOSTIC-ONLY screenshots, and
// runs per-route invariants (single NavBar, logo placement, DataGrid rows,
// PM-UUID-leak, NavBar background token resolution, Document Review pattern
// slots). Output JSON is consumed by /nightwork-qa per Rule 4's enforcement
// logic.
//
// USAGE
//   npx tsx scripts/wave-d-smoke.ts --preview-url <https://...>
//
// REQUIRED ENV
//   HARNESS_FIXTURE_PASSWORD  — fixture user password (harness-fixture@nightwork.local)
//
// OPTIONAL ENV (per iter-2 §4.12: missing emits loud WARN, does NOT abort)
//   VERCEL_AUTOMATION_BYPASS_SECRET  — Vercel SSO bypass
//   VERIFICATION_BYPASS_SECRET       — Nightwork middleware bypass for /design-system/*
//
// AUTHENTICATION
//   Script signs in as `harness-fixture@nightwork.local` in `fixture-harness-org`
//   (org-admin role; NOT platform_admin). Matches the 3-layer harness's
//   single-auth-path posture per .planning/phases/stage-1.5c-verification-harness D-30
//   + CLAUDE.md "Platform admin" section. Reuses storageState bootstrap from
//   scripts/harness-auth-bootstrap.ts; if state file is missing, the bootstrap
//   is invoked inline.
//
// SYNTHETIC SEED (per iter-2 §4.4 + Plan D-4 Task 5)
//   All 13 routes run against synthetic UUIDs seeded via
//   scripts/fixtures/smoke-seed.sql. NO Drummond / SmartShield / real-vendor
//   UUIDs anywhere. UUID convention:
//     Org:           11111111-1111-1111-1111-111111111111
//     Users:         00000000-0000-0000-XXXX-XXXXXXXXXXXX
//     Jobs:          22222222-2222-2222-2222-XXXXXXXXXXXX
//     Invoices:      33333333-3333-3333-3333-XXXXXXXXXXXX
//     Activity log:  44444444-4444-4444-4444-XXXXXXXXXXXX
//   Per iter-2 §4.4.3 the `requires_drummond_data: true` skip-path is REMOVED.
//
// SCREENSHOT STRATEGY: DIAGNOSTIC-ONLY (per iter-2 §4.3)
//   One screenshot per route captured to
//     .planning/qa-runs/wave-d/screenshots/<route-slug>-<run-id>.png
//   `<run-id>` is epoch milliseconds (filename idempotency per iter-2 §4.3).
//   NO baseline diff. Baseline+diff is a Wave 1.1-Full Layer 4 deliverable;
//   deferred until palette/density/typography contracts stabilize post-CP2.
//   Screenshots are for Jake's eyeball review at GATE-N halt, NOT for pixel-
//   diff regression detection.
//
// ROUTE COUNT (13 unique)
//   Issue-1 unique:    /today, /admin/platform/jobs-health, /settings/workflow,
//                      /financials/bills/<synthetic-invoice-id>,
//                      /jobs/<synthetic-job-id>, /jobs/new                = 6
//   Issue-1 + Issue-2 overlap (deduplicated):  /financials/bills,
//                                              /financials/bills/queue   = 2
//   Issue-2 unique:    /financials/bills/qa, /financials/lien-releases,
//                      /financials/payments, /financials/pay-apps         = 4
//   Redirect sentinel: /invoices  (asserts HTTP 308 → /financials/bills)  = 1
//   TOTAL: 13 unique routes
//
// OUTPUT
//   JSON at .planning/qa-runs/wave-d/smoke-results.json (per iter-2 §4.1)
//   Screenshots at .planning/qa-runs/wave-d/screenshots/<route-slug>-<run-id>.png
//
// EXIT CODES
//   0  all routes pass
//   1  any route fails (HTTP mismatch, console error, invariant failure, primary-UX miss)
//   2  setup error (missing env, invalid URL, bootstrap failure, outer timeout)
//
// WAVE 1.1-FULL LAYER 4 SEED INTENT
//   This script is the first Playwright-script-against-preview-URL artifact
//   outside the 3-layer verification harness, per calibration-log F1+
//   harness-extension entry (lines 93-95). The Wave 1.1-Full Layer 4
//   framework (interactive behavioral testing) will extend the route table,
//   add parallel BrowserContext fan-out (TD-WD-02), empty/loading/error
//   state coverage (TD-WD-03), and mobile viewport coverage (TD-WD-04).
//
// DEFERRED ITEMS (NOT in D-4 scope; tracked as TD)
//   TD-WD-02 — Parallel BrowserContext fan-out (per iter-2 §4.13)
//   TD-WD-03 — Empty/loading/error state coverage (per iter-2 §4.15)
//   TD-WD-04 — Mobile viewport coverage (per iter-2 §4.16)

import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
  type ConsoleMessage,
} from "playwright";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import {
  chromiumLaunchArgs,
  harnessBrowserHeaders,
  HARNESS_AUTH_STATE_PATH,
} from "../src/lib/verification/_browser";

// ============================================================================
// Constants — auth + output paths + walltime
// ============================================================================

const FIXTURE_USER_EMAIL = "harness-fixture@nightwork.local";
const SMOKE_OUTPUT_DIR = path.resolve(
  process.cwd(),
  ".planning/qa-runs/wave-d",
);
const SMOKE_SCREENSHOTS_DIR = path.join(SMOKE_OUTPUT_DIR, "screenshots");
const SMOKE_RESULTS_PATH = path.join(SMOKE_OUTPUT_DIR, "smoke-results.json");

// Per-route timeout (ms) — 30s navigate + 5s settle ≈ 35s budget.
const PER_ROUTE_TIMEOUT_MS = 30_000;
// Outer walltime cap (ms) — 13 routes * ~35s ≈ 7.5min; cap at 10min.
const OUTER_TIMEOUT_MS = 600_000;
// Warmup ping timeout (ms) — cold-lambda absorption.
const WARMUP_TIMEOUT_MS = 30_000;

// ============================================================================
// Types
// ============================================================================

interface RouteCheck {
  route: string;
  category: "issue-1" | "issue-2" | "both";
  primary_ux_selector: string | null;
  primary_ux_min_count?: number;
  pattern?: "document-review";
  expected_http_status?: number; // default 200
}

interface RouteResult {
  route: string;
  status:
    | "pass"
    | "fail"
    | "skipped_no_auth"
    | "error_timeout"
    | "error_unknown";
  http_status: number | null;
  console_errors: string[];
  primary_ux_pass: boolean | null;
  primary_ux_evidence?: string;
  invariant_failures: string[];
  screenshot_path?: string;
  duration_ms: number;
}

interface SmokeOutput {
  preview_url: string;
  run_id: string;
  started_at: string;
  finished_at: string;
  total_routes: number;
  passed: number;
  failed: number;
  errored: number;
  results: RouteResult[];
}

// ============================================================================
// Route table — 13 unique routes (synthetic UUIDs per iter-2 §4.4.2)
// ============================================================================

const ROUTES: RouteCheck[] = [
  // Issue 1 — unique sites
  {
    route: "/today",
    category: "issue-1",
    primary_ux_selector: "text=Active jobs",
  },
  {
    route: "/admin/platform/jobs-health",
    category: "issue-1",
    primary_ux_selector: null, // API consumer; HTTP 200 + zero console errors only
  },
  {
    // Per ITER-2-PATCHES.md §2.3 + §2.5: production <select> has no name=
    // attribute. Plan body's role=combobox approach superseded by simpler
    // any-select selector (page has a default-PM <select> wrapped in <label>).
    route: "/settings/workflow",
    category: "issue-1",
    primary_ux_selector: "select",
    primary_ux_min_count: 1,
  },
  // Per iter-2 §4.4.2: synthetic invoice UUID (Drummond UUID NOT used here —
  // see ITER-2-PATCHES.md §4.4.2 for the replacement audit trail).
  {
    route: "/financials/bills/33333333-3333-3333-3333-300000000001",
    category: "issue-1",
    primary_ux_selector: "text=Smoke Vendor Alpha",
    pattern: "document-review",
  },
  // Per iter-2 §4.4.2: synthetic job UUID (Drummond UUID NOT used here —
  // see ITER-2-PATCHES.md §4.4.2 for the replacement audit trail).
  {
    route: "/jobs/22222222-2222-2222-2222-200000000001",
    category: "issue-1",
    primary_ux_selector: "text=Smoke Job Alpha",
  },
  {
    // Per ITER-2-PATCHES.md §2.3 + §2.5: production <select> has no name=
    // attribute. Plan body's role=combobox approach superseded by simpler
    // any-select selector (jobs/new form contains a PM <select> visible on load).
    route: "/jobs/new",
    category: "issue-1",
    primary_ux_selector: "select",
    primary_ux_min_count: 1,
  },
  // Issue 1 + Issue 2 overlap (deduplicated)
  // Per ITER-2-PATCHES.md §2.3: InvoiceHeader.tsx row-level PM <select> is
  // not visible on initial /financials/bills page load. Plan body's role-based
  // locator superseded by page-header text selector (page renders heading element
  // on load — stable test contract independent of row-level dropdown rendering).
  {
    route: "/financials/bills",
    category: "both",
    primary_ux_selector: "h1, h2, [data-page-header]",
    primary_ux_min_count: 1,
  },
  {
    route: "/financials/bills/queue",
    category: "both",
    primary_ux_selector: "h1, h2, [data-page-header]",
    primary_ux_min_count: 1,
  },
  // Issue 2 — financials/* routes (the 4 not already covered above)
  {
    route: "/financials/bills/qa",
    category: "issue-2",
    primary_ux_selector: 'header[data-component="nav-bar"]',
    primary_ux_min_count: 1,
  },
  {
    route: "/financials/lien-releases",
    category: "issue-2",
    primary_ux_selector: 'header[data-component="nav-bar"]',
    primary_ux_min_count: 1,
  },
  {
    route: "/financials/payments",
    category: "issue-2",
    primary_ux_selector: 'header[data-component="nav-bar"]',
    primary_ux_min_count: 1,
  },
  {
    route: "/financials/pay-apps",
    category: "issue-2",
    primary_ux_selector: 'header[data-component="nav-bar"]',
    primary_ux_min_count: 1,
  },
  // Redirect sentinel — /invoices → /financials/bills (per Plan D-3 + D-01).
  // Per iter-2 §3.3: Next.js `permanent: true` emits HTTP 308 (not 301).
  {
    route: "/invoices",
    category: "issue-2",
    primary_ux_selector: null,
    expected_http_status: 308,
  },
];

// ============================================================================
// Helpers
// ============================================================================

function parseArgs(argv: string[]): { previewUrl: string } {
  let previewUrl = "";
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--preview-url" && i + 1 < argv.length) {
      previewUrl = argv[i + 1];
    }
  }
  return { previewUrl };
}

function failSetup(message: string): never {
  console.error(`[wave-d-smoke] SETUP ERROR: ${message}`);
  process.exit(2);
}

function routeSlug(route: string): string {
  return route.replace(/\//g, "_").replace(/^_/, "") || "root";
}

function isListRoute(route: string): boolean {
  // Heuristic: routes ending without an ID-shape segment that look list-y.
  // /financials/bills (list), /financials/bills/queue (list), /financials/bills/qa (list),
  // /financials/lien-releases (list), /financials/payments (list), /financials/pay-apps (list).
  // /financials/bills/<uuid> is NOT a list route (detail view).
  if (/\/[0-9a-f-]{36}$/i.test(route)) return false;
  if (route === "/jobs/new") return false;
  if (route === "/today") return false;
  if (route === "/admin/platform/jobs-health") return false;
  if (route === "/settings/workflow") return false;
  if (route === "/invoices") return false; // redirect sentinel
  return (
    route.startsWith("/financials/") ||
    route === "/financials" ||
    route.endsWith("/queue") ||
    route.endsWith("/qa")
  );
}

// Redact sensitive substrings from captured console output before they land
// in the JSON output (mirrors Layer 3 vision-client.ts WARNING-1 amendment).
function redactConsole(text: string): string {
  return text
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, "sk-ant-***REDACTED***")
    .replace(/Bearer [A-Za-z0-9_.-]+/g, "Bearer ***REDACTED***");
}

// Inline bootstrap invocation when storageState file is missing. Mirrors the
// 3-layer harness chicken-and-egg pattern.
function ensureStorageState(previewUrl: string): void {
  if (existsSync(HARNESS_AUTH_STATE_PATH)) {
    console.log(
      `[wave-d-smoke] storageState found at ${HARNESS_AUTH_STATE_PATH}`,
    );
    return;
  }
  console.log(
    `[wave-d-smoke] storageState missing — invoking bootstrap inline`,
  );
  const result = spawnSync(
    "npx",
    [
      "tsx",
      "scripts/harness-auth-bootstrap.ts",
      "--preview-url",
      previewUrl,
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    failSetup(
      `harness-auth-bootstrap failed with exit code ${result.status}; cannot proceed`,
    );
  }
  if (!existsSync(HARNESS_AUTH_STATE_PATH)) {
    failSetup(
      `bootstrap reported success but storageState still missing at ${HARNESS_AUTH_STATE_PATH}`,
    );
  }
}

// ============================================================================
// Per-route check
// ============================================================================

async function checkRoute(
  context: BrowserContext,
  routeCheck: RouteCheck,
  previewUrl: string,
  runId: string,
): Promise<RouteResult> {
  const startNs = process.hrtime.bigint();
  const route = routeCheck.route;
  const expectedStatus = routeCheck.expected_http_status ?? 200;
  const consoleErrors: string[] = [];
  const invariantFailures: string[] = [];
  let httpStatus: number | null = null;
  let primaryUxPass: boolean | null = null;
  let primaryUxEvidence: string | undefined;
  let screenshotPath: string | undefined;

  const page: Page = await context.newPage();

  // Capture console errors + warnings (redacted).
  page.on("console", (msg: ConsoleMessage) => {
    const severity = msg.type();
    if (severity === "error" || severity === "warning") {
      consoleErrors.push(`[${severity}] ${redactConsole(msg.text())}`);
    }
  });

  try {
    // Navigate. For /invoices we want to capture the redirect WITHOUT
    // following it, so we listen for the first response.
    let firstResponseStatus: number | null = null;
    if (route === "/invoices") {
      page.on("response", (resp) => {
        if (firstResponseStatus !== null) return;
        try {
          const url = resp.url();
          if (url.endsWith("/invoices") || url.endsWith("/invoices/")) {
            firstResponseStatus = resp.status();
          }
        } catch {
          // ignore
        }
      });
    }

    const response = await page.goto(`${previewUrl}${route}`, {
      waitUntil: "networkidle",
      timeout: PER_ROUTE_TIMEOUT_MS,
    });

    if (route === "/invoices" && firstResponseStatus !== null) {
      httpStatus = firstResponseStatus;
    } else if (response) {
      httpStatus = response.status();
    }

    // HTTP status assertion.
    if (httpStatus !== null && httpStatus !== expectedStatus) {
      invariantFailures.push(
        `HTTP status mismatch on ${route}: expected ${expectedStatus}, got ${httpStatus}`,
      );
    }

    // Skip DOM invariants on the redirect sentinel.
    if (route !== "/invoices") {
      // Per-route invariant — single NavBar global (per iter-2 §4.8 / H-D4-21).
      const navBars = await page.$$('header[data-component="nav-bar"]');
      if (navBars.length !== 1) {
        invariantFailures.push(
          `Expected exactly 1 NavBar on ${route}, got ${navBars.length}`,
        );
      }
      const sidebars = await page.$$('aside[data-component="job-sidebar"]');
      if (sidebars.length > 1) {
        invariantFailures.push(
          `Expected ≤1 sidebar on ${route}, got ${sidebars.length}`,
        );
      }

      // Per-route invariant — logo placement (per iter-2 §4.6 / B-D4-05).
      //
      // Logo expected at TOP-LEFT half of viewport per CLAUDE.md "Stone blue
      // palette + Slate type system + logo top-left" section. Productivity-app
      // convention (Gmail, Linear, Notion, Stripe Dashboard, Procore) places
      // the brand mark at top-left next to primary navigation. Earlier
      // versions of this invariant checked right-half (assuming SOW letterhead
      // convention); corrected 2026-05-15 per nwrp147 + TD-WE-02 disposition
      // (Wave-E ship calibration). Implementation in src/components/nav-bar.tsx:286
      // was always correct (brand mark at LEFT inside `<Link href="/">`); the
      // spec text and this invariant were stale together.
      const logoSelector = 'header [data-slot="org-logo"]';
      const logo = await page.$(logoSelector);
      if (!logo) {
        invariantFailures.push(`Logo missing on ${route}`);
      } else {
        const box = await logo.boundingBox();
        const viewportWidth = page.viewportSize()?.width ?? 1280;
        if (!box || box.x >= viewportWidth * 0.5) {
          invariantFailures.push(
            `Logo not in left-half of viewport on ${route} (x=${box?.x ?? "null"}, viewport=${viewportWidth})`,
          );
        }
      }

      // Per-route invariant — DataGrid + design tokens + display-name
      // (per iter-2 §4.7 / H-D4-09+19+20; list routes only).
      if (isListRoute(route)) {
        const rows = await page.$$('[role="grid"] [role="row"], tbody tr');
        const emptyState = await page.$('[data-state="empty"]');
        if (rows.length === 0 && !emptyState) {
          invariantFailures.push(
            `DataGrid empty without empty-state indicator on ${route}`,
          );
        }
      }

      // PM dropdown display-name (NOT UUID) — applies wherever the
      // dropdown surfaces in the DOM. Per ITER-2-PATCHES.md §2.3: production
      // PM <select> elements have no name= attribute; query all <option>
      // children of all <select>s and rely on the UUID regex below to detect
      // actual leaks (false-positive tolerant — we only fail if UUIDs literally
      // appear in option text).
      const pmOptions = await page
        .$$eval(
          'select option',
          (els) =>
            els.map((e) => ({
              value: (e as HTMLOptionElement).value,
              text: e.textContent || "",
            })),
        )
        .catch(() => [] as { value: string; text: string }[]);
      const uuidPattern =
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/;
      const uuidLeaks = pmOptions.filter((o) => uuidPattern.test(o.text.trim()));
      if (uuidLeaks.length > 0) {
        invariantFailures.push(
          `PM dropdown shows UUIDs not display-names on ${route}: ${uuidLeaks.map((o) => o.text).join(", ")}`,
        );
      }

      // NavBar background-color token resolution check.
      try {
        const navBg = await page.$eval(
          'header[data-component="nav-bar"]',
          (el) => getComputedStyle(el).backgroundColor,
        );
        if (
          !navBg ||
          navBg === "rgba(0, 0, 0, 0)" ||
          navBg === "transparent"
        ) {
          invariantFailures.push(
            `NavBar background token not resolving on ${route}: ${navBg}`,
          );
        }
      } catch {
        // NavBar selector missed — covered by NavBar count invariant above.
      }

      // Per-route invariant — Document Review pattern (per iter-2 §4.9).
      if (routeCheck.pattern === "document-review") {
        const filePreview = await page.$(
          '[data-pattern-slot="file-preview"]',
        );
        const rightRail = await page.$('[data-pattern-slot="right-rail"]');
        const auditTimeline = await page.$(
          '[data-pattern-slot="audit-timeline"]',
        );
        if (!filePreview)
          invariantFailures.push(
            `Document Review missing file preview on ${route}`,
          );
        if (!rightRail)
          invariantFailures.push(
            `Document Review missing right rail on ${route}`,
          );
        if (!auditTimeline)
          invariantFailures.push(
            `Document Review missing audit timeline on ${route}`,
          );
      }

      // Per-route invariant — DOM-level PM name verification (Plan E-2 / nwrp144 #1).
      //
      // Validates the application-layer pm_id → orgPms[i].full_name mapping.
      // The PostgREST embed (`org_members.select=*,profile:profiles(...)`) resolving
      // is necessary but NOT sufficient — the React code at
      // src/app/jobs/[id]/page.tsx:345 maps pm_id from the resolved pms array
      // and renders the full_name in the Detail component's `<p data-pm-name="...">`.
      //
      // For the synthetic Job Alpha route the pm_id is
      // 00000000-0000-0000-0002-000000000002 which seeds to "Smoke PM Alpha"
      // in scripts/fixtures/smoke-seed.sql. Assert the DOM contains that text
      // in the [data-pm-name] element.
      if (route === "/jobs/22222222-2222-2222-2222-200000000001") {
        const pmNameEl = await page.$('[data-pm-name]');
        if (!pmNameEl) {
          invariantFailures.push(
            `DOM-level PM name verification: [data-pm-name] element missing on ${route}`,
          );
        } else {
          const txt = (await pmNameEl.textContent())?.trim() ?? "";
          if (!txt.includes("Smoke PM Alpha")) {
            invariantFailures.push(
              `DOM-level PM name verification: expected "Smoke PM Alpha" in [data-pm-name] textContent, got "${txt}"`,
            );
          }
        }
      }

      // Primary-UX check.
      if (routeCheck.primary_ux_selector === null) {
        primaryUxPass = null;
      } else {
        const elements = await page
          .locator(routeCheck.primary_ux_selector)
          .all();
        const minCount = routeCheck.primary_ux_min_count ?? 1;
        if (elements.length >= minCount) {
          primaryUxPass = true;
          primaryUxEvidence = `found ${elements.length} matches for "${routeCheck.primary_ux_selector}"`;
        } else {
          primaryUxPass = false;
          primaryUxEvidence = `found ${elements.length} matches for "${routeCheck.primary_ux_selector}" (expected >= ${minCount})`;
        }
      }

      // Screenshot — DIAGNOSTIC-ONLY per iter-2 §4.3.
      const screenshotFile = `${routeSlug(route)}-${runId}.png`;
      screenshotPath = path.join(SMOKE_SCREENSHOTS_DIR, screenshotFile);
      try {
        await page.screenshot({ path: screenshotPath, fullPage: false });
      } catch (err) {
        invariantFailures.push(
          `Screenshot capture failed on ${route}: ${(err as Error).message}`,
        );
      }
    }
  } catch (err) {
    const message = (err as Error).message;
    if (/Timeout|timeout/i.test(message)) {
      await page.close().catch(() => undefined);
      const durationNs = process.hrtime.bigint() - startNs;
      return {
        route,
        status: "error_timeout",
        http_status: httpStatus,
        console_errors: consoleErrors,
        primary_ux_pass: primaryUxPass,
        primary_ux_evidence: primaryUxEvidence,
        invariant_failures: [...invariantFailures, `timeout: ${message}`],
        screenshot_path: screenshotPath,
        duration_ms: Number(durationNs / 1_000_000n),
      };
    }
    await page.close().catch(() => undefined);
    const durationNs = process.hrtime.bigint() - startNs;
    return {
      route,
      status: "error_unknown",
      http_status: httpStatus,
      console_errors: consoleErrors,
      primary_ux_pass: primaryUxPass,
      primary_ux_evidence: primaryUxEvidence,
      invariant_failures: [...invariantFailures, `error: ${message}`],
      screenshot_path: screenshotPath,
      duration_ms: Number(durationNs / 1_000_000n),
    };
  }

  await page.close().catch(() => undefined);
  const durationNs = process.hrtime.bigint() - startNs;

  // Determine final status.
  let finalStatus: RouteResult["status"] = "pass";
  if (consoleErrors.length > 0) finalStatus = "fail";
  if (invariantFailures.length > 0) finalStatus = "fail";
  if (primaryUxPass === false) finalStatus = "fail";

  return {
    route,
    status: finalStatus,
    http_status: httpStatus,
    console_errors: consoleErrors,
    primary_ux_pass: primaryUxPass,
    primary_ux_evidence: primaryUxEvidence,
    invariant_failures: invariantFailures,
    screenshot_path: screenshotPath,
    duration_ms: Number(durationNs / 1_000_000n),
  };
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  // Step 1: parse args + validate env.
  const { previewUrl } = parseArgs(process.argv.slice(2));
  if (!previewUrl) {
    failSetup(
      "Missing --preview-url argument. Usage: npx tsx scripts/wave-d-smoke.ts --preview-url <https://...>",
    );
  }
  if (!/^https:\/\/[A-Za-z0-9.-]+/.test(previewUrl)) {
    failSetup(`Invalid --preview-url: ${previewUrl}`);
  }
  if (!process.env.HARNESS_FIXTURE_PASSWORD) {
    failSetup(
      "Missing HARNESS_FIXTURE_PASSWORD env. Set the harness fixture user password before running.",
    );
  }

  // Per iter-2 §4.12 — loud WARN on missing bypass secrets (do NOT abort).
  if (!process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    console.warn(
      "⚠ VERCEL_AUTOMATION_BYPASS_SECRET not set — preview routes may capture Vercel SSO wall as HTTP 200 (false PASS)",
    );
  }
  if (!process.env.VERIFICATION_BYPASS_SECRET) {
    console.warn(
      "⚠ VERIFICATION_BYPASS_SECRET not set — middleware bypass disabled",
    );
  }

  // Auth fixture identity (per D-30 single-auth-path constraint).
  console.log(
    `[wave-d-smoke] auth fixture user: ${FIXTURE_USER_EMAIL} (org-admin in fixture-harness-org)`,
  );

  // Step 2: ensure storageState file exists (invoke bootstrap inline if not).
  ensureStorageState(previewUrl);

  // Step 3: prepare output dirs.
  mkdirSync(SMOKE_OUTPUT_DIR, { recursive: true });
  mkdirSync(SMOKE_SCREENSHOTS_DIR, { recursive: true });

  const runId = Date.now().toString();
  const startedAt = new Date().toISOString();
  console.log(`[wave-d-smoke] run_id=${runId} started_at=${startedAt}`);

  // Step 4: launch chromium + create authenticated context.
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  const results: RouteResult[] = [];

  try {
    browser = await chromium.launch({ args: chromiumLaunchArgs() });
    context = await browser.newContext({
      storageState: HARNESS_AUTH_STATE_PATH,
      extraHTTPHeaders: harnessBrowserHeaders(),
      viewport: { width: 1280, height: 800 },
    });

    // Step 5: cold-lambda warmup ping (per nwrp124 step 5 reversion of
    // iter-2 §4.14). Hit /login (public + reachable pre-auth) to absorb
    // Vercel preview cold-lambda penalty before the route walk begins.
    try {
      const warmupPage = await context.newPage();
      await warmupPage.goto(`${previewUrl}/login`, {
        timeout: WARMUP_TIMEOUT_MS,
      });
      await warmupPage.close();
      console.log("[wave-d-smoke] warmup complete");
    } catch (err) {
      console.warn(
        `[wave-d-smoke] warmup ping failed (proceeding anyway): ${(err as Error).message}`,
      );
    }

    // Step 6: iterate routes sequentially (parallel deferred to TD-WD-02).
    const walkPromise = (async () => {
      for (const routeCheck of ROUTES) {
        if (!context) break;
        console.log(`[wave-d-smoke] checking ${routeCheck.route}`);
        const result = await checkRoute(
          context,
          routeCheck,
          previewUrl,
          runId,
        );
        results.push(result);
        const statusLabel = result.status.toUpperCase();
        const failuresList =
          result.invariant_failures.length > 0
            ? ` invariant_failures=[${result.invariant_failures.join("; ")}]`
            : "";
        console.log(
          `[wave-d-smoke]   → ${statusLabel} http=${result.http_status} duration=${result.duration_ms}ms${failuresList}`,
        );
      }
    })();

    // Outer walltime cap (per T-D-4-02 mitigation).
    await Promise.race([
      walkPromise,
      new Promise<never>((_, rej) =>
        setTimeout(
          () => rej(new Error(`outer timeout exceeded ${OUTER_TIMEOUT_MS}ms`)),
          OUTER_TIMEOUT_MS,
        ),
      ),
    ]);
  } catch (err) {
    console.error(`[wave-d-smoke] FATAL: ${(err as Error).message}`);
    // Fall through to writing partial results.
  } finally {
    if (context) await context.close().catch(() => undefined);
    if (browser) await browser.close().catch(() => undefined);
  }

  const finishedAt = new Date().toISOString();
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const errored = results.filter(
    (r) => r.status === "error_timeout" || r.status === "error_unknown",
  ).length;

  const output: SmokeOutput = {
    preview_url: previewUrl,
    run_id: runId,
    started_at: startedAt,
    finished_at: finishedAt,
    total_routes: ROUTES.length,
    passed,
    failed,
    errored,
    results,
  };

  // Step 7: write JSON output + echo summary.
  writeFileSync(SMOKE_RESULTS_PATH, JSON.stringify(output, null, 2));
  console.log(`[wave-d-smoke] results written to ${SMOKE_RESULTS_PATH}`);
  console.log(
    `[wave-d-smoke] summary: passed=${passed} failed=${failed} errored=${errored} total=${ROUTES.length}`,
  );

  // Exit code: 0 if all pass, 1 if any fail/error.
  if (failed > 0 || errored > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(`[wave-d-smoke] unhandled: ${(err as Error).message}`);
  process.exit(2);
});
