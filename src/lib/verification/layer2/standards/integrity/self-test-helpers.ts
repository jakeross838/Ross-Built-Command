// Integrity standards — self-test helpers.
//
// Per F1-Wave-B Plan B-1b §5.4 + §10.4. Runtime probe (not a Jest test)
// that the harness can invoke to assert each integrity-domain verifyFn:
//   1. Is registered (via resolveVerifyFn)
//   2. Returns a `VerifyFnResult` with verdict ∈ {"PASS", "FAIL", "SKIP"}
//   3. Carries non-empty `evidence` or `error` (catches placeholder void
//      returns)
//
// Mirrors `conservation/self-test-always-pass.ts` posture — exists to
// give the harness a non-vacuous Layer 2 signal during slice ship when
// the introspection surface for the real walkers doesn't exist yet.
//
// This module exports a callable function. It does NOT register a
// verifyFn (no `registerVerifyFn` call). The function returns an array
// of per-standard probe results; callers (a future
// `validateStandardsModules()` route or a runtime smoke test) iterate
// over the results and FAIL if any standard's probe fails.

import { resolveVerifyFn, type VerifyFnContext } from "../../../registry";

export interface IntegrityProbeResult {
  verifyFnId: string;
  registered: boolean;
  verdictValid: boolean;
  evidenceOrErrorPresent: boolean;
  ok: boolean; // all 3 above true
  details?: string;
}

const INTEGRITY_VERIFY_FN_IDS = [
  "auditConservation",
  "rlsCoverage",
  "rolePermissionIntegrity",
  "fixtureCoverage",
] as const;

/**
 * Probes each integrity-domain verifyFn registered via the layer2 barrel.
 * Returns one IntegrityProbeResult per standard. The caller is
 * responsible for aggregating + reporting.
 *
 * The synthetic context targets a non-routable host so the real walkers'
 * HEAD probes for the introspection surfaces fail cleanly (driving them
 * down the SKIP path with `evidence` non-empty — exactly the contract
 * the probe is verifying).
 */
export async function probeIntegrityStandards(): Promise<
  IntegrityProbeResult[]
> {
  const results: IntegrityProbeResult[] = [];
  const syntheticCtx: VerifyFnContext = {
    rule: {
      $schema: ".planning/verification/standards/_schema.json",
      id: "integrity-probe",
      domain: "integrity",
      title: "synthetic probe",
      description: "synthetic probe ctx for self-test",
      verifyFn: "(probe-placeholder)",
      applies_to: ["probe"],
      severity: "warning",
      source: ["self-test-helpers.ts"],
      tags: ["probe"],
    },
    commit_sha: "synthetic-probe",
    // Non-routable; HEAD probe will fail → walkers SKIP cleanly with
    // non-empty `error` (which counts as evidence-or-error present).
    preview_url: "http://127.0.0.1:65535",
    phase: "self-test",
  };

  for (const id of INTEGRITY_VERIFY_FN_IDS) {
    const probe: IntegrityProbeResult = {
      verifyFnId: id,
      registered: false,
      verdictValid: false,
      evidenceOrErrorPresent: false,
      ok: false,
    };

    let fn;
    try {
      fn = resolveVerifyFn(id);
      probe.registered = true;
    } catch (e) {
      probe.details = e instanceof Error ? e.message : String(e);
      results.push(probe);
      continue;
    }

    try {
      const result = await fn(syntheticCtx);
      probe.verdictValid =
        result.verdict === "PASS" ||
        result.verdict === "FAIL" ||
        result.verdict === "SKIP";
      const hasEvidence =
        typeof result.evidence === "string" && result.evidence.length > 0;
      const hasError =
        typeof result.error === "string" && result.error.length > 0;
      probe.evidenceOrErrorPresent = hasEvidence || hasError;
      probe.details = `verdict=${result.verdict}, evidence=${hasEvidence}, error=${hasError}`;
    } catch (e) {
      probe.details = `verifyFn threw: ${e instanceof Error ? e.message : String(e)}`;
      results.push(probe);
      continue;
    }

    probe.ok =
      probe.registered &&
      probe.verdictValid &&
      probe.evidenceOrErrorPresent;
    results.push(probe);
  }

  return results;
}
