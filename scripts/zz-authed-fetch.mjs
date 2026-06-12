// scripts/zz-authed-fetch.mjs
//
// SmokeAuthHelper increment #3 — generic authed fetch against the
// production app as any smoke user. Generalizes zz-2a-flow-driver's
// cookie-jar replay for arbitrary routes (2D PO/CO probes and beyond).
//
// Usage: node scripts/zz-authed-fetch.mjs <email> <METHOD> <path> [json-body]
//   e.g. node scripts/zz-authed-fetch.mjs smoke-owner@nightwork.local \
//          PATCH /api/change-orders/<id> '{"status":"approved"}'
//
// Credentials per the smoke-seed lifecycle file; never printed (nwrp139).

import { readFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";

const APP = "https://nightwork-platform.vercel.app";
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
  const [email, method, path, bodyJson] = process.argv.slice(2);
  if (!email || !method || !path) {
    console.error("usage: zz-authed-fetch.mjs <email> <METHOD> <path> [json]");
    process.exit(2);
  }
  const env = envLocal();
  const password = credFor(email);
  if (!password) {
    console.error(`FATAL: no credential for ${email}`);
    process.exit(2);
  }
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
  const cookie = [...jar]
    .map(([n, v]) => `${n}=${encodeURIComponent(v)}`)
    .join("; ");
  let res;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      res = await fetch(`${APP}${path}`, {
        method: method.toUpperCase(),
        headers: { cookie, "content-type": "application/json" },
        body: bodyJson ?? undefined,
      });
      break;
    } catch (e) {
      console.error(
        `fetch attempt ${attempt} failed: ${e?.message} cause=${e?.cause?.code ?? e?.cause?.message ?? "?"}`
      );
      if (attempt === 3) process.exit(2);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  const text = await res.text();
  console.log(`${res.status} ${method.toUpperCase()} ${path} as ${email}`);
  console.log(text.slice(0, 500));
  // No signOut: throwaway session; the signOut/exit race trips a libuv
  // assertion on Windows (UV_HANDLE_CLOSING in async.c).
  process.exit(res.status < 500 ? 0 : 1);
}

main().catch((e) => {
  console.error("FATAL:", e?.message ?? e, e?.cause?.code ?? "");
  process.exit(2);
});
