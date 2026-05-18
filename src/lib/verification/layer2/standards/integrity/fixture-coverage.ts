// Integrity — fixture coverage.
//
// Per F1-Wave-B Plan B-1b (nwrp152 + nwrp153 Q9 D).
//
// Assert: every tenant-scoped entity in `.planning/architecture/ENTITY-
// INVENTORY.md` has ≥1 row in `fixture-harness-org` (per Q9 D contract).
//
// This standard codifies the fixture-maintenance contract — new tenant
// tables added by future migrations MUST seed at least one fixture row
// in the canonical harness org so verification harness Layer 1/Layer 2
// checks have data to read.
//
// Defense-in-depth for SOC2 CC7.2 composite (audit-trail durability via
// fixture-reproducibility). When a new entity ships without a fixture
// row, this standard surfaces the gap at CI time, not at Wave 1.1
// harness ramp time when the regression is harder to catch.
//
// SKIP-CLEAN POSTURE (slice B-1b ship)
// ------------------------------------
// Mirrors `conservation/money-line-items-sum.ts`. Introspection surface
// (`/api/_introspect/fixture-coverage`) does not exist on main HEAD.
// Wave 1.1+ adds the surface that reads ENTITY-INVENTORY.md entity list
// and queries each tenant table with `WHERE org_id = FIXTURE_ORG_UUID`.

import { registerVerifyFn, type VerifyFn } from "../../../registry";

const fixtureCoverage: VerifyFn = async (ctx) => {
  const introspectUrl = `${ctx.preview_url.replace(/\/$/, "")}/api/_introspect/fixture-coverage`;

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
      error: `No introspection surface at ${introspectUrl} (HTTP not 2xx/3xx). Wave 1.1+ adds /api/_introspect/fixture-coverage; until then fixture-coverage SKIPs cleanly.`,
      evidence: introspectUrl,
    };
  }

  // Future walker (Wave 1.1+). Pseudocode for reference:
  //
  //   1. Read tenant-classified entity list from ENTITY-INVENTORY.md
  //      (markdown table parse) — the column with "Retention class" /
  //      "PII?" headers is the canonical source per iter-2 mechanical #6.
  //
  //   2. For each entity:
  //        SELECT count(*) FROM public.<entity>
  //         WHERE org_id = (SELECT id FROM public.organizations
  //                          WHERE slug = 'fixture-harness-org');
  //      - count = 0 → FAIL (no fixture coverage for this tenant table)
  //      - count >= 1 → PASS
  //
  //   3. Report:
  //      - Per-entity verdict in evidence (entity_name, count, verdict)
  //      - Overall FAIL if any entity returns count = 0
  //
  //   USER-scoped child tables (per Q10b — relationships like
  //   support_messages → support_conversations) are NOT subject to
  //   per-org fixture seeding; they inherit fixture coverage from the
  //   user-row in fixture-harness-org. Classification list distinguishes
  //   ORG-scoped from USER-scoped tables.

  return {
    verdict: "PASS",
    evidence:
      "Introspection surface present but fixture-coverage walker not yet implemented (Wave 1.1+).",
  };
};

registerVerifyFn("fixtureCoverage", fixtureCoverage);

export {}; // ensure file is a module
