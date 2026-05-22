// scripts/b-2b-touch-target-probe.ts
//
// F1-Wave-B Slice-2 B-2b — Acknowledge CTA touch-target audit (AC-B2b-08).
// Per CONTEXT D-26 + D-27 + Latitude #4 (a) — SYSTEM.md §11 mandates 56px
// touch target for high-stakes (homeowner irreversible attestation of pay-app).
//
// USAGE
//   npx tsx scripts/b-2b-touch-target-probe.ts --preview-url <url>
//
// REQUIRED ENV
//   HARNESS_FIXTURE_OWNER_TOKEN — 64-char hex token for seeded fixture row.
//
// MECHANISM
//   Renders /owner/{HARNESS_FIXTURE_OWNER_TOKEN}/pay-apps/55555555-...500000000001
//   at iPhone 13 Pro Max + Pixel 7 viewports. Measures
//   [data-testid='acknowledge-pay-app-button'] computedStyle minHeight + height.
//   Asserts >= 56px at every viewport.
//
// EXIT CODES
//   0  ≥56px at all viewports
//   1  <56px at any viewport (FAIL B-2b ship)
//   2  setup error / probe failure

import { chromium } from "playwright";

interface ViewportSpec {
  name: string;
  width: number;
  height: number;
}

const VIEWPORTS: ViewportSpec[] = [
  { name: "iphone-13-pro-max", width: 430, height: 932 },
  { name: "iphone-14-pro-max", width: 430, height: 932 },
  { name: "pixel-7", width: 412, height: 915 },
];

function failSetup(message: string): never {
  console.error(`[b-2b-touch-target-probe] SETUP ERROR: ${message}`);
  process.exit(2);
}

function parseArgs(argv: string[]): { previewUrl: string } {
  let previewUrl = process.env.PREVIEW_URL ?? "http://localhost:3000";
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--preview-url" && i + 1 < argv.length) {
      previewUrl = argv[i + 1];
    }
  }
  return { previewUrl };
}

async function main() {
  const token = process.env.HARNESS_FIXTURE_OWNER_TOKEN;
  if (!token) {
    failSetup(
      "HARNESS_FIXTURE_OWNER_TOKEN: NOT SET — required for touch-target probe.",
    );
  }
  if (token.length !== 64) {
    failSetup(
      `HARNESS_FIXTURE_OWNER_TOKEN: invalid length (${token.length}) — expected 64-char hex`,
    );
  }
  console.log(
    `[b-2b-touch-target-probe] HARNESS_FIXTURE_OWNER_TOKEN: SET (len=${token.length})`,
  );

  const drawId = "55555555-5555-5555-5555-500000000001";
  const { previewUrl } = parseArgs(process.argv.slice(2));
  const targetUrl = `${previewUrl}/owner/${token}/pay-apps/${drawId}`;

  const browser = await chromium.launch({ headless: true });
  let anyFail = false;

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();
    try {
      console.log(`[b-2b-touch-target-probe] viewport=${vp.name} navigating ${targetUrl}`);
      await page.goto(targetUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      const button = page.locator(
        "[data-testid='acknowledge-pay-app-button']",
      );
      await button.waitFor({ state: "attached", timeout: 5_000 });
      const measured = await button.evaluate((el) => {
        const cs = window.getComputedStyle(el);
        return {
          height: parseFloat(cs.height),
          minHeight: parseFloat(cs.minHeight) || 0,
          // Effective height for touch-target = max(actual height, min-height)
          effective: Math.max(parseFloat(cs.height), parseFloat(cs.minHeight) || 0),
        };
      });
      const pass = measured.effective >= 56;
      console.log(
        `[b-2b-touch-target-probe] ${vp.name}: height=${measured.height}px minHeight=${measured.minHeight}px effective=${measured.effective}px → ${pass ? "PASS" : "FAIL"}`,
      );
      if (!pass) anyFail = true;
    } catch (err) {
      console.error(
        `[b-2b-touch-target-probe] ${vp.name} ERROR: ${err instanceof Error ? err.message : err}`,
      );
      anyFail = true;
    } finally {
      await context.close();
    }
  }

  await browser.close();

  if (anyFail) {
    console.error(
      `[b-2b-touch-target-probe] AC-B2b-08 FAILURE — acknowledge CTA <56px at one or more viewports.`,
    );
    process.exit(1);
  }
  console.log(
    `[b-2b-touch-target-probe] AC-B2b-08 PASS — acknowledge CTA ≥56px at all viewports.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(`[b-2b-touch-target-probe] unexpected error: ${err}`);
  process.exit(2);
});
