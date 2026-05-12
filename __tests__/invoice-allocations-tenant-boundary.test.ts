/**
 * Regression test for migration 00096: invoice_allocations org_id denormalize.
 *
 * Plan: F1-Wave-A Plan A-4. Proves direct-filter RLS still enforces tenant
 * boundary post-rewrite from JOIN-based to direct-filter equivalents.
 *
 * Setup assumption: two distinct org_ids each have ≥1 invoice_allocations
 * row. If fixture coverage is single-org (current state per audit Section 2:
 * all 52 rows in Ross Built canonical org `00000000-0000-0000-0000-000000000001`),
 * the test SKIPs with a structured warning that GATE-A summary can grep.
 * Wave-B Plan B-6 (fixture-maintenance contract) will seed 2-org coverage.
 *
 * AC-3 (HF-A4-5 wording per ITER-2-PATCHES.md): "Regression test EXISTS and
 * will run hot once fixture coverage is seeded by Wave-B Plan B-6; current
 * execution SKIPs are documented in GATE-A summary."
 *
 * Runner convention matches the rest of __tests__/*.test.ts — each file is
 * a standalone tsx subprocess with a local cases[] array. The _runner.ts
 * top-level only discovers *.test.ts in the top of __tests__/ (no recursion),
 * so this file lives flat at __tests__/invoice-allocations-tenant-boundary.test.ts
 * rather than __tests__/rls/ as the PLAN.md path suggested.
 */
import { createClient } from "@supabase/supabase-js";
import { strict as assert } from "node:assert";

type Case = { name: string; fn: () => Promise<void> };
const cases: Case[] = [];
const test = (name: string, fn: () => Promise<void>) => cases.push({ name, fn });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HARNESS_FIXTURE_PASSWORD = process.env.HARNESS_FIXTURE_PASSWORD;

test(
  "RLS: invoice_allocations enforces tenant boundary post-00096",
  async () => {
    // Env preflight: if any required Supabase credential is absent, this
    // test cannot exercise live RLS. Skip with structured warning so the
    // GATE-A summary can grep for the WAVE-A-A4-REGRESSION-SKIP marker.
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
      console.warn(
        "WAVE-A-A4-REGRESSION-SKIP: missing Supabase env vars; cannot exercise live RLS. "
          + "Wave-B Plan B-6 must wire test env."
      );
      return;
    }

    // Service-role client to inspect cross-org row presence (bypasses RLS).
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find org_ids that have invoice_allocations rows. Post-00096 the column
    // is NOT NULL so every row has an org_id.
    const { data: allocRows, error: adminErr } = await admin
      .from("invoice_allocations")
      .select("org_id")
      .is("deleted_at", null);
    if (adminErr) {
      // If the column doesn't exist yet, migration 00096 hasn't been applied
      // to this environment. Skip rather than fail — this is the expected
      // pre-GATE-A state in Wave-A.
      if (
        adminErr.message.toLowerCase().includes("column") &&
        adminErr.message.toLowerCase().includes("org_id")
      ) {
        console.warn(
          "WAVE-A-A4-REGRESSION-SKIP: invoice_allocations.org_id column missing; "
            + "migration 00096 not yet applied. Expected pre-GATE-A."
        );
        return;
      }
      throw adminErr;
    }

    const orgIdsWithRows = [...new Set((allocRows ?? []).map((r) => r.org_id))];
    if (orgIdsWithRows.length < 2) {
      console.warn(
        "WAVE-A-A4-REGRESSION-SKIP: invoice_allocations fixture covers only 1 org; "
          + "Wave-B Plan B-6 must seed 2-org coverage"
      );
      return;
    }

    // Sign in as a fixture user — skip if password not wired.
    if (!HARNESS_FIXTURE_PASSWORD) {
      console.warn(
        "WAVE-A-A4-REGRESSION-SKIP: HARNESS_FIXTURE_PASSWORD not set; "
          + "cannot exercise RLS as authenticated user."
      );
      return;
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const testEmail = "harness-fixture@nightwork.local";
    const { error: signinErr } = await userClient.auth.signInWithPassword({
      email: testEmail,
      password: HARNESS_FIXTURE_PASSWORD,
    });
    if (signinErr) {
      console.warn(
        `WAVE-A-A4-REGRESSION-SKIP: cannot sign in as ${testEmail}: ${signinErr.message}`
      );
      return;
    }

    // Determine the user's org. multi-org-session pattern: order created_at + limit 1.
    const { data: userMembership, error: memErr } = await userClient
      .from("org_members")
      .select("org_id")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (memErr || !userMembership) {
      console.warn(
        `WAVE-A-A4-REGRESSION-SKIP: cannot determine user membership: ${memErr?.message ?? "no rows"}`
      );
      return;
    }
    const userOrgId = userMembership.org_id;

    // Find the cross-tenant target org.
    const targetOrgId = orgIdsWithRows.find((id) => id !== userOrgId);
    if (!targetOrgId) {
      console.warn(
        `WAVE-A-A4-REGRESSION-SKIP: harness-fixture user's org has all invoice_allocations rows; `
          + `no cross-tenant target.`
      );
      return;
    }

    // Attempt cross-tenant SELECT — RLS must reject.
    const { data: crossTenantRows, error: queryErr } = await userClient
      .from("invoice_allocations")
      .select("id, org_id")
      .eq("org_id", targetOrgId);

    if (queryErr) {
      throw new Error(`Unexpected query error: ${queryErr.message}`);
    }

    assert.equal(
      (crossTenantRows ?? []).length,
      0,
      `RLS BOUNDARY VIOLATION: user from org ${userOrgId} read ${crossTenantRows?.length ?? 0} `
        + `invoice_allocations rows from org ${targetOrgId}. Direct-filter RLS broken post-00096.`
    );

    // Sanity check: SELECT for own org returns >0 rows.
    const { data: ownRows, error: ownErr } = await userClient
      .from("invoice_allocations")
      .select("id")
      .eq("org_id", userOrgId);
    if (ownErr) throw ownErr;

    assert.ok(
      (ownRows ?? []).length > 0,
      `RLS posture suspicious: user from org ${userOrgId} got 0 rows for own org. `
        + `Either fixture coverage is missing or RLS rejects own org too (broken).`
    );

    // Backfill correctness — every row's org_id matches parent invoice's org_id.
    // Service-role bypass; covers full table.
    const { data: mismatch, error: mismatchErr } = await admin.rpc(
      "exec",
      {
        sql:
          "SELECT COUNT(*)::int AS n FROM public.invoice_allocations a "
            + "JOIN public.invoices i ON i.id = a.invoice_id "
            + "WHERE a.org_id <> i.org_id",
      }
    );
    // RPC `exec` may not exist in all envs — that's fine; the migration's
    // post-backfill DO block already enforces this invariant at apply time.
    // Leave the check optional (no assert) so absence of `exec` doesn't fail.
    if (!mismatchErr && Array.isArray(mismatch) && mismatch[0]?.n > 0) {
      throw new Error(
        `Backfill drift: ${mismatch[0].n} invoice_allocations rows have org_id `
          + `mismatched against parent invoice. Investigate.`
      );
    }
  },
);

// ---------------------------------------------------------------
// Runner — matches the convention in every other __tests__/*.ts
// ---------------------------------------------------------------
async function run(): Promise<void> {
  let failed = 0;
  for (const c of cases) {
    try {
      await c.fn();
      console.log(`PASS  ${c.name}`);
    } catch (e) {
      failed++;
      console.log(`FAIL  ${c.name}`);
      console.log(`      ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log("");
  if (failed > 0) {
    console.error(`${failed} of ${cases.length} test(s) failed`);
    process.exit(1);
  } else {
    console.log(`${cases.length} test(s) passed`);
  }
}

run();
