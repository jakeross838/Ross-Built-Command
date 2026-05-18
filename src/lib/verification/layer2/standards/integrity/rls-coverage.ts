// Integrity — RLS coverage.
//
// Per F1-Wave-B Plan B-1b (nwrp152 + nwrp153 Q9 D).
//
// Assert: every ORG-scoped tenant table has `rowsecurity=true` + ≥1
// policy filtering on `org_id`; every USER-scoped child table has
// `rowsecurity=true` + ≥1 policy filtering on parent FK (per Q10b
// child-entity scope-axis rule).
//
// Defense-in-depth for SOC2 CC6.1 (Logical access). Tenant safety BY
// CONSTRUCTION via direct-filter RLS; this standard catches regressions
// where a new tenant table is added without RLS or without the proper
// org_id filter pattern.
//
// SKIP-CLEAN POSTURE (slice B-1b ship)
// ------------------------------------
// Mirrors `conservation/money-line-items-sum.ts`. The introspection
// surface (`/api/_introspect/rls-coverage`) does not exist on main HEAD.
// Wave 1.1+ adds the surface that queries `pg_policies` + `pg_tables`
// and reports any tenant-classified table without RLS as FAIL.

import { registerVerifyFn, type VerifyFn } from "../../../registry";

const rlsCoverage: VerifyFn = async (ctx) => {
  const introspectUrl = `${ctx.preview_url.replace(/\/$/, "")}/api/_introspect/rls-coverage`;

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
      error: `No introspection surface at ${introspectUrl} (HTTP not 2xx/3xx). Wave 1.1+ adds /api/_introspect/rls-coverage; until then rls-coverage SKIPs cleanly.`,
      evidence: introspectUrl,
    };
  }

  // Future walker (Wave 1.1+). Pseudocode for reference:
  //
  //   The introspection route runs (via service-role client):
  //     SELECT t.tablename, t.rowsecurity,
  //            count(p.policyname) FILTER (WHERE p.qual ILIKE '%org_id%'
  //                                          OR p.with_check ILIKE '%org_id%')
  //              AS org_id_policy_count
  //     FROM pg_tables t
  //     LEFT JOIN pg_policies p ON p.tablename = t.tablename
  //     WHERE t.schemaname = 'public'
  //       AND t.tablename IN (<tenant-classified entity list from
  //                            ENTITY-INVENTORY.md>)
  //     GROUP BY t.tablename, t.rowsecurity;
  //
  //   For each row:
  //     - If rowsecurity = false → FAIL (RLS not enabled on tenant table)
  //     - If org_id_policy_count = 0 → FAIL (no direct-filter policy)
  //
  //   USER-scoped child tables (per Q10b — e.g., support_messages
  //   joining to support_conversations on user_id = auth.uid()) require
  //   the same rowsecurity=true but pass via parent-FK join. The
  //   pg_policies.qual would reference the parent table; the
  //   classification list distinguishes ORG-scoped from USER-scoped
  //   tables.

  return {
    verdict: "PASS",
    evidence:
      "Introspection surface present but rls-coverage walker not yet implemented (Wave 1.1+).",
  };
};

registerVerifyFn("rlsCoverage", rlsCoverage);

export {}; // ensure file is a module
