// tmp/zz-listener-app-cell.mjs
//
// Interaction-bug D2 — the decisive Rule-10 cell: the REAL APP on a
// Preview deployment (listener=true in Preview env) driven by a FRESH
// sign-in in real Chromium. Detects the deadlock signature Jake hit:
// role badge / jobs sidebar never load after sign-in.
//
// Usage: node tmp/zz-listener-app-cell.mjs <preview-url>

import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2];
const CRED_FILE =
  ".planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt";

function envLocal() {
  const out = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}
function credFor(email) {
  let pw = null;
  for (const line of readFileSync(CRED_FILE, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^(\S+@nightwork\.local)\s+(\S+)$/);
    if (m && m[1] === email) pw = m[2];
  }
  return pw;
}

async function main() {
  const env = envLocal();
  const email = "smoke-pm-eta@nightwork.local";
  const password = credFor(email);
  const bypass = env.VERCEL_AUTOMATION_BYPASS_SECRET;

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    extraHTTPHeaders: bypass ? { "x-vercel-protection-bypass": bypass } : {},
  });
  const page = await ctx.newPage();

  let supabaseRequests = 0;
  page.on("request", (r) => {
    if (r.url().includes(".supabase.co")) supabaseRequests++;
  });

  console.log(`cell: ${BASE} — fresh sign-in as ${email}`);
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 30000 }).catch(() => null),
  ]);
  console.log(`post-login URL: ${page.url()}`);

  // Fixture users bounce to /onboard (org never onboarded) — that's a
  // wizard, not the shell. Force the shell route; if middleware bounces
  // us back, the cell needs the org onboarding flag set instead.
  await page.goto(`${BASE}/today`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1500);
  console.log(`shell URL after goto /today: ${page.url()}`);

  // The deadlock signature: role badge + jobs count never resolve.
  // Give the healthy path 20s; capture what renders.
  const verdict = await page
    .waitForFunction(
      () => {
        const txt = document.body?.innerText ?? "";
        const roleLoaded = /\b(PM|ADMIN|OWNER|ACCOUNTING)\b/.test(txt);
        const jobsLoaded = /\b\d+\s+JOBS?\b/i.test(txt) && !/\b0\s+JOBS\b/i.test(txt);
        return roleLoaded && jobsLoaded ? "HEALTHY" : null;
      },
      { timeout: 20000 }
    )
    .then(() => "HEALTHY")
    .catch(() => "SIGNATURE: role/jobs never loaded (deadlock shape)");

  const bodySnippet = (await page.evaluate(() => document.body?.innerText.slice(0, 300) ?? ""))
    .replace(/\n+/g, " | ");
  console.log(`verdict: ${verdict}`);
  console.log(`supabase requests from browser: ${supabaseRequests}`);
  console.log(`body: ${bodySnippet}`);
  await browser.close();
}
main();
