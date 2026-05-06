// Layer 1 orchestrator.
//
// Invokes build → typecheck → hooks-sweep → route-status → DOM assertions
// in sequence. Returns flat VerificationResult[] with mechanical + dom
// criteria results.
//
// Plan 5 (orchestrator) calls runLayer1; Plan 8b state machine consumes
// results to drive failed-fixable transitions.
//
// Per iter-1 ARCH-CRIT-3 / Jake watchpoint #1: Layer1Context is IMPORTED
// from ../types (single source of truth). Do NOT redefine here. types.ts
// is the canonical home for Layer*Context contracts.
//
// Per D-30: ctx.org_id is FIXTURE_ORG_ID today; tenant-aware Wave 1.1+.
// Sub-runners thread ctx.org_id through to deriveIdempotencyKey() so cache
// keys are tenant-bounded by SHAPE.

import { runBuild, runTypecheck } from "./build-typecheck";
import { runHookSweep } from "./hooks-runner";
import { runDomAssertions } from "./dom-assertions";
import { runRouteStatusCheck, discoverRoutes } from "./route-status";
import type { Layer1Context, VerificationResult } from "../types";

export async function runLayer1(
  ctx: Layer1Context
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // 1. Build
  if (!ctx.skip_build) {
    results.push(await runBuild(ctx.commit_sha, ctx.repo_root, ctx.org_id));
  }

  // 2. Typecheck
  if (!ctx.skip_typecheck) {
    results.push(
      await runTypecheck(ctx.commit_sha, ctx.repo_root, ctx.org_id)
    );
  }

  // 3. Hook sweep
  results.push(
    ...(await runHookSweep(ctx.commit_sha, ctx.repo_root, ctx.org_id))
  );

  // 4. Route status
  const routes =
    ctx.routes_to_check.length > 0
      ? ctx.routes_to_check
      : await discoverRoutes(ctx.repo_root);
  results.push(
    ...(await runRouteStatusCheck(
      ctx.preview_url,
      ctx.commit_sha,
      routes,
      ctx.org_id
    ))
  );

  // 5. DOM assertions
  results.push(
    ...(await runDomAssertions(
      ctx.preview_url,
      ctx.commit_sha,
      ctx.dom_criteria,
      ctx.org_id
    ))
  );

  return results;
}

export {
  discoverRoutes,
  runBuild,
  runTypecheck,
  runHookSweep,
  runDomAssertions,
  runRouteStatusCheck,
};
