// scripts/smoke-auth-probe.mjs
//
// SmokeAuthHelper — first increment (per nwrp238 mandate + nwrp275 2A
// condition 1; design convention PLANNING-PIPELINE-TIERING.md §229/§241).
//
// Binding Stage-2A pre-flight gate (nwrp266 §13): every smoke-* synthetic
// account must authenticate against production Supabase before the 2A
// matrix runs. Exits non-zero on any failure.
//
// Credentials: parsed from the orchestrator-written credentials file
// (smoke-seed.sql PASSWORD LIFECYCLE step 5 —
// .planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt,
// gitignored). Lines matching "<email> <password>"; LAST occurrence per
// email wins (rotation-safe). Passwords are NEVER printed (nwrp139).
//
// Usage: node scripts/smoke-auth-probe.mjs

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const CRED_FILE =
  ".planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt";

const EXPECTED = [
  "smoke-pm-alpha@nightwork.local",
  "smoke-pm-beta@nightwork.local",
  "smoke-pm-gamma@nightwork.local",
  "smoke-pm-delta@nightwork.local",
  "smoke-pm-epsilon@nightwork.local",
  "smoke-pm-zeta@nightwork.local",
  "smoke-pm-eta@nightwork.local",
  "smoke-accounting@nightwork.local",
  "smoke-owner@nightwork.local",
];

function parseEnvLocal() {
  const out = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function parseCreds() {
  const creds = new Map();
  for (const line of readFileSync(CRED_FILE, "utf8").split(/\r?\n/)) {
    const m = line.trim().match(/^(\S+@nightwork\.local)\s+(\S+)$/);
    if (m) creds.set(m[1], m[2]); // last occurrence wins
  }
  return creds;
}

async function main() {
  const env = parseEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error("FATAL: Supabase URL/anon key not found in .env.local");
    process.exit(2);
  }

  let creds;
  try {
    creds = parseCreds();
  } catch {
    console.error(`FATAL: credentials file unreadable at ${CRED_FILE}`);
    process.exit(2);
  }

  let pass = 0;
  let fail = 0;
  for (const email of EXPECTED) {
    const password = creds.get(email);
    if (!password) {
      console.log(`FAIL  ${email}  (no credential line in file)`);
      fail++;
      continue;
    }
    // Fresh client per account — no shared session state.
    const supabase = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data?.session) {
      console.log(`FAIL  ${email}  (${error?.message ?? "no session"})`);
      fail++;
    } else {
      console.log(`PASS  ${email}  (user ${data.user.id.slice(0, 8)}…)`);
      await supabase.auth.signOut();
      pass++;
    }
  }

  console.log(`\nsmoke-auth-probe: ${pass} PASS / ${fail} FAIL of ${EXPECTED.length}`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("FATAL:", e?.message ?? e);
  process.exit(2);
});
