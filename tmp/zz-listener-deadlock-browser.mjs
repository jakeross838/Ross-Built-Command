// tmp/zz-listener-deadlock-browser.mjs
//
// Interaction-bug D2/D3 — BROWSER repro (per nwrp283). The Node repro
// did NOT deadlock because supabase-js's session lock is navigator.locks
// (Web Locks API), a browser-only primitive that Node no-ops. This runs
// the same two cases inside real Chromium via Playwright:
//   A = bug shape (await a supabase query INSIDE onAuthStateChange)
//   B = fix shape (setTimeout deferral out of the callback)
// Expected if the mechanism holds: A's follow-up query TIMES OUT
// (lock held by the dispatching callback; .from() waits forever),
// B resolves.
//
// Usage: node tmp/zz-listener-deadlock-browser.mjs A|B

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const CASE = process.argv[2] ?? "A";
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
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("console", (m) => console.log(`[page] ${m.text()}`));
  await page.goto("https://example.com"); // secure context for navigator.locks
  await page.addScriptTag({
    path: resolve("node_modules/@supabase/supabase-js/dist/umd/supabase.js"),
  });

  const result = await page.evaluate(
    async ({ url, anon, email, password, testCase }) => {
      const withTimeout = (p, ms) =>
        Promise.race([
          p.then(() => "RESOLVED"),
          new Promise((res) => setTimeout(() => res("TIMED_OUT"), ms)),
        ]);
      // Mirror the app: browser client with persisted session + locks.
      const client = window.supabase.createClient(url, anon, {
        auth: { persistSession: true, autoRefreshToken: true },
      });
      const events = [];
      client.auth.onAuthStateChange(async (event) => {
        events.push(event);
        if (event === "SIGNED_IN") {
          if (testCase === "A") {
            console.log("A: awaiting query INSIDE callback…");
            await client.from("org_members").select("role").limit(1).maybeSingle();
            console.log("A: callback query completed");
          } else {
            setTimeout(async () => {
              await client.from("org_members").select("role").limit(1).maybeSingle();
              console.log("B: deferred query completed");
            }, 0);
          }
        }
      });
      console.log("signing in fresh…");
      const signin = await withTimeout(
        client.auth.signInWithPassword({ email, password }),
        8000
      );
      const followup = await withTimeout(
        client.from("org_members").select("role").limit(1).maybeSingle(),
        6000
      );
      // A second auth-path call — getSession also wants the lock.
      const getSess = await withTimeout(client.auth.getSession(), 4000);
      return { signin, followup, getSess, events: events.join(",") };
    },
    {
      url: env.NEXT_PUBLIC_SUPABASE_URL,
      anon: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      email,
      password,
      testCase: CASE,
    }
  );
  console.log(`case ${CASE}:`, JSON.stringify(result));
  await browser.close();
  process.exit(0);
}
main();
