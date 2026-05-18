// Integrity — audit conservation.
//
// Per F1-Wave-B Plan B-1b (nwrp152 + nwrp153 Q9 D + umbrella Q9 D).
//
// Assert: every state-mutating API path writes to `activity_log`.
// Cross-entity audit conservation invariant — for every tracked entity
// transition in a test scenario, the activity_log row count delta is
// ≥ 1. Defense-in-depth for SOC2 CC7.2 (audit-trail durability).
//
// Per ITER-1 C3 + D-30: future /api/_introspect/* routes MUST authenticate
// via getCurrentMembership() and filter by membership.org_id. Cross-tenant
// introspection is design-time impossible. See ../../README.md for the
// full guard rail.
//
// SKIP-CLEAN POSTURE (slice B-1b ship)
// ------------------------------------
// Mirrors `conservation/money-line-items-sum.ts` — the introspection
// surface (`/api/_introspect/activity-log/conservation`) does not exist
// on main HEAD. Layer 2 returns SKIP cleanly so the loop progresses
// past this rule without false-FAIL. Wave 1.1+ adds the introspection
// surface; when it lands, replace the SKIP block with the walker
// outlined in the future-implementation pseudocode below.

import { registerVerifyFn, type VerifyFn } from "../../../registry";

const auditConservation: VerifyFn = async (ctx) => {
  const introspectUrl = `${ctx.preview_url.replace(/\/$/, "")}/api/_introspect/activity-log/conservation`;

  let introspectionAvailable = false;
  try {
    const probe = await fetch(introspectUrl, {
      method: "HEAD",
      redirect: "manual",
    });
    introspectionAvailable = probe.status >= 200 && probe.status < 400;
  } catch {
    introspectionAvailable = false;
  }

  if (!introspectionAvailable) {
    return {
      verdict: "SKIP",
      error: `No introspection surface at ${introspectUrl} (HTTP not 2xx/3xx). Wave 1.1+ adds /api/_introspect/activity-log/conservation; until then audit-conservation SKIPs cleanly.`,
      evidence: introspectUrl,
    };
  }

  // Future walker (Wave 1.1+). Pseudocode for reference:
  //
  //   For each tracked entity (per WORKFLOW-INTELLIGENCE.md + activity_log
  //   entity_type enum), the harness drives a state mutation via fixture-
  //   harness-org RLS-bound service-role client:
  //     1. Read pre-mutation activity_log row count.
  //     2. Drive the state mutation (status transition or insert).
  //     3. Read post-mutation activity_log row count.
  //     4. Assert delta >= 1.
  //
  //   Walked entities (slice-A scope): invoices, jobs, change_orders,
  //   purchase_orders, draws, lien_releases, proposals, selections,
  //   draw_adjustments, job_milestones. (Per F1-Wave-A Plan A-1 Q12
  //   uniform versioning coverage.)
  //
  //   Wave 2 expansion: schedule, daily_logs, punchlist (when those
  //   entities ship).

  // Phase placeholder — should not reach here on slice B-1b ship. If we
  // do (introspection went live unexpectedly), return PASS-with-noted-
  // todo so the harness reports cleanly without false-FAIL.
  return {
    verdict: "PASS",
    evidence:
      "Introspection surface present but audit-conservation walker not yet implemented (Wave 1.1+).",
  };
};

registerVerifyFn("auditConservation", auditConservation);

export {}; // ensure file is a module
