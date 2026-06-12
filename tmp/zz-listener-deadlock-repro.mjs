// tmp/zz-listener-deadlock-repro.mjs
//
// Interaction-bug D2/D3 repro (per nwrp283): library-level proof that
// AWAITING a supabase query INSIDE onAuthStateChange deadlocks
// supabase-js v2 on a FRESH SIGN-IN (the auth client dispatches
// callbacks while holding its internal lock; .from() queries acquire
// the session via that same lock). Case A mirrors use-current-role.ts's
// W.1 listener shape; Case B mirrors the proposed fix (setTimeout
// deferral — the supabase-documented pattern).
//
// Usage: node tmp/zz-listener-deadlock-repro.mjs A|B

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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
const withTimeout = (p, ms, label) =>
  Promise.race([
    p.then((r) => ({ ok: true, r })),
    new Promise((res) => setTimeout(() => res({ ok: false, label }), ms)),
  ]);

async function main() {
  const env = envLocal();
  const email = "smoke-pm-eta@nightwork.local";
  const password = credFor(email);
  const client = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  let callbackFired = [];
  client.auth.onAuthStateChange(async (event) => {
    callbackFired.push(event);
    if (event === "SIGNED_IN") {
      if (CASE === "A") {
        // BUG SHAPE (use-current-role.ts:73-97): await a query inside
        // the callback, inside the auth lock.
        await client.from("org_members").select("role").limit(1).maybeSingle();
        console.log("case A: callback query COMPLETED (no deadlock?)");
      } else {
        // FIX SHAPE: defer out of the lock.
        setTimeout(async () => {
          await client.from("org_members").select("role").limit(1).maybeSingle();
          console.log("case B: deferred callback query completed");
        }, 0);
      }
    }
  });

  console.log(`case ${CASE}: signing in fresh…`);
  const signin = await withTimeout(
    client.auth.signInWithPassword({ email, password }),
    8000,
    "signIn"
  );
  console.log(`signIn resolved: ${signin.ok}`);

  const followup = await withTimeout(
    client.from("org_members").select("role").limit(1).maybeSingle(),
    5000,
    "follow-up query"
  );
  console.log(
    `follow-up query within 5s: ${followup.ok ? "RESOLVED" : "TIMED OUT (deadlock)"}`
  );
  console.log(`events seen: ${callbackFired.join(",")}`);
  process.exit(0);
}
main();
