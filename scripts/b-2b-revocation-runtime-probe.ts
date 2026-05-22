// scripts/b-2b-revocation-runtime-probe.ts
//
// F1-Wave-B Slice-2 B-2b — forward-carried AC-B2a-08 runtime revocation
// probe (AC-B2b-10). LOAD-BEARING GATE per nwrp209 §3.
//
// Per CONTEXT D-28 + nwrp209 §3 forward-carried condition:
//   B-2a deferred this AC to QA (status DEFERRED-TO-QA per B-2a-SUMMARY.md);
//   B-2b ship is GATED on this test passing live. If revocation doesn't work
//   in practice (despite all B-2a mechanical verifications), the security
//   model is unproven and B-2b ship is HALTED per nwrp209 §3.
//
// USAGE
//   npx tsx scripts/b-2b-revocation-runtime-probe.ts [--preview-url <url>]
//
// REQUIRED ENV
//   HARNESS_FIXTURE_OWNER_TOKEN — 64-char hex token for seeded portal_access row.
//
// MECHANISM (5 steps per D-28; uses ephemeral test token to avoid contaminating
// shared smoke-fixture per security-reviewer iter-1 non-blocking observation)
//   1. Create ephemeral portal_access row via direct DB insert (service role).
//      Uses synthetic plaintext + SHA-256 hash. Avoids the admin-side
//      create_client_portal_invite RPC path (extra surface area) — the goal
//      here is to test the REVOCATION path, not the invitation path.
//   2. GET /owner/{plaintext} → assert HTTP 200 + page text contains the
//      <main data-prototype="owner-dashboard"> wrapper (BLK-3 anchor).
//   3. UPDATE client_portal_access SET revoked_at = NOW() WHERE id = <ephemeral.id>.
//      (Direct DB update to keep the probe lean — exercises the same code
//      path as the admin /api/owner-portal/admin/revoke-token route, but
//      without the authenticated-admin session ceremony. The runtime path
//      under test is resolveOwnerToken's `if (data.revoked_at !== null) return null`
//      branch — that branch fires regardless of HOW revoked_at got set.)
//   4. GET /owner/{plaintext} (re-fetched) → assert error boundary visible
//      (data-error="owner-portal-invalid-token") OR 404. NOT 200 with data.
//      **If Step 4 fails: HALT B-2b before ship per nwrp209 §3.**
//   5. Cleanup: DELETE ephemeral portal_access row.
//
// EXIT CODES
//   0  AC-B2b-10 PASS (revocation works runtime)
//   1  AC-B2b-10 FAIL (Step 4 returned 200 with data) → HALT B-2b ship
//   2  setup error (missing env, DB error, etc.)

import { createServiceRoleClient } from "../src/lib/supabase/service";
import { createHash, randomBytes } from "node:crypto";

function failSetup(message: string): never {
  console.error(`[b-2b-revocation-runtime-probe] SETUP ERROR: ${message}`);
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

const HARNESS_ORG_ID = "00000000-0000-0000-0000-fb1ce0a55e55";
const HARNESS_JOB_ID = "22222222-2222-2222-2222-200000000001"; // Smoke Job Alpha
const HARNESS_CREATOR = "5eb26edc-5989-477f-ac42-d1e9264db0e2"; // harness-fixture user
const EPHEMERAL_ID = "88888888-8888-8888-8888-880000000001"; // ephemeral probe row id

async function getClientId(supabase: ReturnType<typeof createServiceRoleClient>) {
  const { data, error } = await supabase
    .from("jobs")
    .select("client_id")
    .eq("id", HARNESS_JOB_ID)
    .eq("org_id", HARNESS_ORG_ID)
    .maybeSingle();
  if (error || !data?.client_id) {
    failSetup(
      `Could not resolve client_id from Smoke Job Alpha: ${
        error?.message ?? "missing client_id"
      }`,
    );
  }
  return data.client_id as string;
}

async function main() {
  const { previewUrl } = parseArgs(process.argv.slice(2));
  console.log(`[b-2b-revocation-runtime-probe] preview URL: ${previewUrl}`);

  const supabase = createServiceRoleClient();
  const clientId = await getClientId(supabase);

  // STEP 1: Create ephemeral portal_access row.
  const plaintext = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(plaintext).digest("hex");
  console.log(
    `[b-2b-revocation-runtime-probe] ephemeral token plaintext: len=${plaintext.length}`,
  );

  // Cleanup any prior ephemeral row (idempotent run).
  await supabase.from("client_portal_access").delete().eq("id", EPHEMERAL_ID);

  const { error: insErr } = await supabase
    .from("client_portal_access")
    .insert({
      id: EPHEMERAL_ID,
      org_id: HARNESS_ORG_ID,
      job_id: HARNESS_JOB_ID,
      client_id: clientId,
      email: "ephemeral-revocation-probe@nightwork.local",
      name: "Ephemeral Revocation Probe",
      access_token_hash: hash,
      visibility_config: {},
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      created_by: HARNESS_CREATOR,
    });
  if (insErr) {
    failSetup(`Step 1 — ephemeral INSERT failed: ${insErr.message}`);
  }
  console.log(`[b-2b-revocation-runtime-probe] Step 1 PASS — ephemeral row created (id=${EPHEMERAL_ID})`);

  let stepResult: "PASS" | "FAIL" = "PASS";

  try {
    // STEP 2: GET /owner/{plaintext} → expect 200 + dashboard wrapper.
    const url2 = `${previewUrl}/owner/${plaintext}`;
    const r2 = await fetch(url2, { method: "GET", redirect: "manual" });
    const body2 = await r2.text();
    const has2 = body2.includes('data-prototype="owner-dashboard"');
    console.log(
      `[b-2b-revocation-runtime-probe] Step 2: status=${r2.status} has-dashboard-wrapper=${has2}`,
    );
    if (r2.status !== 200 || !has2) {
      console.error(
        `[b-2b-revocation-runtime-probe] Step 2 FAIL — expected 200 + dashboard wrapper. ` +
          `Token resolution failing pre-revocation indicates B-2a foundation issue, not B-2b regression.`,
      );
      // This is a setup failure, not a B-2b revocation failure — exit 2.
      stepResult = "FAIL";
      process.exitCode = 2;
      return;
    }
    console.log(`[b-2b-revocation-runtime-probe] Step 2 PASS — portal loads pre-revocation`);

    // STEP 3: Revoke via direct DB UPDATE (exercises resolveOwnerToken's
    // `if (data.revoked_at !== null) return null` branch under test).
    const { error: revErr } = await supabase
      .from("client_portal_access")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", EPHEMERAL_ID);
    if (revErr) {
      failSetup(`Step 3 — revoke UPDATE failed: ${revErr.message}`);
    }
    console.log(`[b-2b-revocation-runtime-probe] Step 3 PASS — revoked_at set`);

    // STEP 4: GET /owner/{plaintext} (re-fetch) → assert error boundary visible
    //         (NOT 200 with dashboard data). LOAD-BEARING GATE.
    const url4 = `${previewUrl}/owner/${plaintext}?_t=${Date.now()}`; // cache-bust
    const r4 = await fetch(url4, { method: "GET", redirect: "manual" });
    const body4 = await r4.text();
    const stillHasDashboard = body4.includes('data-prototype="owner-dashboard"');
    const hasErrorBoundary =
      body4.includes('data-error="owner-portal-invalid-token"') ||
      body4.includes("link no longer valid");
    const is404 = r4.status === 404;
    console.log(
      `[b-2b-revocation-runtime-probe] Step 4: status=${r4.status} still-has-dashboard=${stillHasDashboard} has-error-boundary=${hasErrorBoundary} is-404=${is404}`,
    );

    if (stillHasDashboard) {
      console.error(
        `[b-2b-revocation-runtime-probe] Step 4 FAIL — REVOCATION DID NOT WORK RUNTIME. ` +
          `Portal still rendered the dashboard wrapper after revoked_at was set. ` +
          `This is a LOAD-BEARING GATE failure per nwrp209 §3 — HALT B-2b before ship.`,
      );
      stepResult = "FAIL";
      process.exitCode = 1;
      return;
    }
    if (!hasErrorBoundary && !is404) {
      console.error(
        `[b-2b-revocation-runtime-probe] Step 4 PARTIAL FAIL — response is neither dashboard ` +
          `nor recognized error boundary nor 404. Investigate before shipping.`,
      );
      console.error(`  body excerpt: ${body4.slice(0, 500)}`);
      stepResult = "FAIL";
      process.exitCode = 1;
      return;
    }
    console.log(
      `[b-2b-revocation-runtime-probe] Step 4 PASS — revocation honored runtime (error boundary OR 404)`,
    );
  } finally {
    // STEP 5: Cleanup ephemeral row.
    const { error: delErr } = await supabase
      .from("client_portal_access")
      .delete()
      .eq("id", EPHEMERAL_ID);
    if (delErr) {
      console.warn(
        `[b-2b-revocation-runtime-probe] Step 5 cleanup warning: ${delErr.message}`,
      );
    } else {
      console.log(`[b-2b-revocation-runtime-probe] Step 5 PASS — ephemeral row deleted`);
    }
  }

  if (stepResult === "PASS") {
    console.log(
      `[b-2b-revocation-runtime-probe] AC-B2b-10 PASS — forward-carried AC-B2a-08 verified live.`,
    );
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(
    `[b-2b-revocation-runtime-probe] unexpected error: ${err instanceof Error ? err.stack : err}`,
  );
  process.exit(2);
});
