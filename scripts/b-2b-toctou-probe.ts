// scripts/b-2b-toctou-probe.ts
//
// F1-Wave-B Slice-2 B-2b — TOCTOU concurrent-double-tap probe (AC-B2b-06).
// Per CONTEXT D-19 + D-20 + D-21 + iter-1 SYNTHESIS B-12 closure.
//
// USAGE
//   npx tsx scripts/b-2b-toctou-probe.ts [--preview-url <https://...>]
//
// REQUIRED ENV
//   HARNESS_FIXTURE_OWNER_TOKEN — 64-char hex token for the seeded
//     client_portal_access row (smoke-seed.sql §Step 8.1).
//
// MECHANISM
//   Fires 2 concurrent POST requests to /api/owner-portal/acknowledge-pay-app
//   with the same (token, drawId) tuple. The 00106 partial unique index +
//   logActivity's onConflictDoNothing branch should produce EXACTLY 1
//   activity_log row.
//
//   Per Latitude #6 (a) — Playwright concurrent-double-tap recommended in
//   PLAN; this script uses Node global fetch in Promise.all parallel form
//   to keep the script lean (no Playwright dependency for what is
//   essentially a parallel HTTP probe). Two concurrent fetches via
//   Promise.all([fetch(), fetch()]) are equivalent to two browser tabs
//   firing the POST simultaneously.
//
// VERIFICATION
//   Pre-probe: SQL DELETE existing acknowledged rows for (drawId, token)
//   Probe: 2x POST in Promise.all
//   Post-probe: SQL SELECT COUNT(*) → MUST be exactly 1
//   On non-1 count: throw + exit 1.
//
// EXIT CODES
//   0  TOCTOU dedupe verified (count = 1)
//   1  TOCTOU FAILURE (count != 1) — escalate; HALT B-2b before ship
//   2  Setup error (missing env, invalid URL, non-2xx HTTP responses)

import { createServiceRoleClient } from "../src/lib/supabase/service";
import { createHash } from "node:crypto";

function failSetup(message: string): never {
  console.error(`[b-2b-toctou-probe] SETUP ERROR: ${message}`);
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
      "HARNESS_FIXTURE_OWNER_TOKEN: NOT SET — required for TOCTOU probe. Set in .env.local.",
    );
  }
  if (token.length !== 64) {
    failSetup(
      `HARNESS_FIXTURE_OWNER_TOKEN: invalid length (${token.length}) — expected 64-char hex`,
    );
  }
  console.log(
    `[b-2b-toctou-probe] HARNESS_FIXTURE_OWNER_TOKEN: SET (len=${token.length})`,
  );

  const drawId = "55555555-5555-5555-5555-500000000001"; // smoke fixture draw (Smoke Job Alpha)
  const { previewUrl } = parseArgs(process.argv.slice(2));
  const ackUrl = `${previewUrl}/api/owner-portal/acknowledge-pay-app`;
  console.log(`[b-2b-toctou-probe] target: ${ackUrl}`);

  // Resolve the seeded portal_access_id from the token hash so we can
  // (a) clean up pre-probe rows and (b) count post-probe rows.
  const hash = createHash("sha256").update(token).digest("hex");
  const supabase = createServiceRoleClient();
  const { data: portalRow, error: portalErr } = await supabase
    .from("client_portal_access")
    .select("id")
    .eq("access_token_hash", hash)
    .maybeSingle();
  if (portalErr || !portalRow) {
    failSetup(
      `Could not resolve portal_access_id for HARNESS_FIXTURE_OWNER_TOKEN: ${
        portalErr?.message ?? "no row"
      }`,
    );
  }
  const portalAccessId = portalRow.id;
  console.log(`[b-2b-toctou-probe] portal_access_id: ${portalAccessId}`);

  // Pre-probe cleanup: delete any existing acknowledged rows for (drawId, token).
  // Without this, a re-run on warm DB might see count >= 1 from a previous run.
  const { error: delErr } = await supabase
    .from("activity_log")
    .delete()
    .eq("action", "acknowledged")
    .eq("entity_id", drawId)
    .eq("actor_token_id", portalAccessId);
  if (delErr) {
    failSetup(`Pre-probe cleanup DELETE failed: ${delErr.message}`);
  }
  console.log(`[b-2b-toctou-probe] pre-probe cleanup OK`);

  // Fire 2 concurrent POSTs.
  const body = JSON.stringify({ token, drawId });
  const headers = { "Content-Type": "application/json" };
  const t0 = Date.now();
  const [r1, r2] = await Promise.all([
    fetch(ackUrl, { method: "POST", headers, body }),
    fetch(ackUrl, { method: "POST", headers, body }),
  ]);
  const dt = Date.now() - t0;
  console.log(
    `[b-2b-toctou-probe] concurrent POSTs done in ${dt}ms — status1=${r1.status} status2=${r2.status}`,
  );

  if (r1.status !== 200 || r2.status !== 200) {
    console.error(
      `[b-2b-toctou-probe] expected both 200; got ${r1.status} + ${r2.status}`,
    );
    console.error(`  r1 body: ${await r1.text()}`);
    console.error(`  r2 body: ${await r2.text()}`);
    process.exit(2);
  }

  // Post-probe count check.
  const { count, error: countErr } = await supabase
    .from("activity_log")
    .select("id", { count: "exact", head: true })
    .eq("action", "acknowledged")
    .eq("entity_id", drawId)
    .eq("actor_token_id", portalAccessId);
  if (countErr) {
    failSetup(`Post-probe count query failed: ${countErr.message}`);
  }
  console.log(`[b-2b-toctou-probe] post-probe activity_log count: ${count}`);

  if (count !== 1) {
    console.error(
      `[b-2b-toctou-probe] TOCTOU FAILURE: expected 1 row, got ${count}. ` +
        `Migration 00106 partial unique index OR onConflictDoNothing branch is misbehaving.`,
    );
    process.exit(1);
  }

  console.log(`[b-2b-toctou-probe] AC-B2b-06 PASS — TOCTOU dedupe verified.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`[b-2b-toctou-probe] unexpected error: ${err}`);
  process.exit(2);
});
