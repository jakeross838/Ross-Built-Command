// scripts/zz-2a-flow-driver.mjs
//
// Stage-2A flow driver (ZZ-2A evidence script, per nwrp275) — drives the
// PRODUCTION app's invoice action route as an authed smoke user so the
// APP-LAYER behavior (gates, status transitions, audit appends) is what
// gets tested — not SQL-path equivalents. SmokeAuthHelper second
// increment: signs in via @supabase/ssr with a local cookie jar, then
// replays the library's own cookies against the app.
//
// Usage: node scripts/zz-2a-flow-driver.mjs <email> <action> [json-body]
//   e.g. node scripts/zz-2a-flow-driver.mjs smoke-pm-beta@nightwork.local \
//          approve '{"updates":{"cost_code_id":"..."}}'
//        action "get" fetches the invoice instead of posting an action.
//
// Target invoice is fixed: Smoke Invoice Beta (fixture-harness-org).
// Credentials from the smoke-seed lifecycle file; never printed (nwrp139).

import { readFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";

const APP = "https://nightwork-platform.vercel.app";
const INVOICE_ID = "33333333-3333-3333-3333-300000000002";
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
  const [email, action, bodyJson] = process.argv.slice(2);
  if (!email || !action) {
    console.error("usage: zz-2a-flow-driver.mjs <email> <action|get> [json]");
    process.exit(2);
  }
  const env = envLocal();
  const password = credFor(email);
  if (!password) {
    console.error(`FATAL: no credential for ${email}`);
    process.exit(2);
  }

  // Cookie jar the @supabase/ssr client writes into on sign-in; we replay
  // those exact cookies (library-native format, chunking included) to the app.
  const jar = new Map();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (cs) => cs.forEach((c) => jar.set(c.name, c.value)),
      },
    }
  );
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (authErr) {
    console.error(`AUTH FAIL ${email}: ${authErr.message}`);
    process.exit(1);
  }
  const cookieHeader = [...jar]
    .map(([n, v]) => `${n}=${encodeURIComponent(v)}`)
    .join("; ");

  // Generic override (2D probes): ZZ_PATH + ZZ_METHOD env vars redirect the
  // authed fetch to any route; [json-body] arg becomes the raw body. The
  // standalone generic script hit persistent per-process ENOTFOUND on this
  // box; this proven auth+fetch path is the workaround.
  if (process.env.ZZ_PATH) {
    const res2 = await fetch(`${APP}${process.env.ZZ_PATH}`, {
      method: (process.env.ZZ_METHOD ?? "GET").toUpperCase(),
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      body: bodyJson ?? undefined,
    });
    const text2 = await res2.text();
    console.log(
      `${res2.status} ${(process.env.ZZ_METHOD ?? "GET").toUpperCase()} ${process.env.ZZ_PATH} as ${email}`
    );
    console.log(text2.slice(0, 500));
    process.exit(res2.status < 500 ? 0 : 1);
  }

  let res;
  if (action === "get") {
    res = await fetch(`${APP}/api/invoices/${INVOICE_ID}`, {
      headers: { cookie: cookieHeader },
    });
  } else {
    const body = { action, ...(bodyJson ? JSON.parse(bodyJson) : {}) };
    res = await fetch(`${APP}/api/invoices/${INVOICE_ID}/action`, {
      method: "POST",
      headers: { cookie: cookieHeader, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }
  const text = await res.text();
  let summary = text.slice(0, 400);
  try {
    const j = JSON.parse(text);
    summary = JSON.stringify(
      action === "get"
        ? { status: j.status, cost_code_id: j.cost_code_id, invoice_date: j.invoice_date }
        : j
    ).slice(0, 400);
  } catch {
    /* non-JSON (e.g. HTML error page) — raw slice stands */
  }
  console.log(`${res.status} ${action} as ${email} -> ${summary}`);
  await supabase.auth.signOut();
  process.exit(res.ok || res.status === 422 || res.status === 400 || res.status === 403 ? 0 : 1);
}

main().catch((e) => {
  console.error("FATAL:", e?.message ?? e);
  process.exit(2);
});
