// Layer 2 — standards runner.
//
// Iterates loaded standards rules, invokes each via the registry, converts
// VerifyFnResult → VerificationResult. Returns flat array.
//
// Plan 5 orchestrator calls runLayer2; Plan 1 state machine consumes results;
// Plan 8b loop-with-executor reads failed-fixable transitions on FAIL of
// blocking-severity rules.
//
// Per iter-1 ARCH-CRIT-3 / Jake watchpoint #1: Layer2Context is IMPORTED
// from ../types (single source of truth). Do NOT redefine here. types.ts
// is the canonical home for Layer*Context contracts (set in Plan 1 to
// satisfy Plans 2/3/4 zero-overlap claim).
//
// Per D-30 + iter-1 C4: ctx.org_id is FIXTURE_ORG_ID today; tenant-aware
// Wave 1.1+. ctx.org_id is threaded through to deriveIdempotencyKey() so
// cache keys are tenant-bounded BY SHAPE, mirroring Plan 2's Layer 1
// pattern.

import type {
  Layer2Context,
  StandardsRule,
  VerificationCriterion,
  VerificationResult,
} from "../types";
import { resolveVerifyFn } from "../registry";
import { deriveIdempotencyKey } from "../idempotency";
import { loadStandardsRules } from "./loader";

export async function runLayer2(
  ctx: Layer2Context
): Promise<VerificationResult[]> {
  const rules: StandardsRule[] = ctx.rules ?? loadStandardsRules(ctx.repo_root);
  const results: VerificationResult[] = [];

  for (const rule of rules) {
    const start = Date.now();
    // Synthesize a criterion for idempotency key derivation. Layer 2 rules
    // are not declared in PLAN-file `criteria:` blocks — they're driven by
    // the standards JSON files — so we synthesize a stable criterion ID
    // from rule.id. Plan-5 orchestrator merges these results with PLAN-file
    // criteria results downstream.
    const criterion: VerificationCriterion = {
      id: `layer2-${rule.id}`,
      phase: ctx.phase,
      plan: "(synthetic-rule-driven)",
      category: "behavioral",
      text: rule.title,
      layer: 2,
    };

    let fnResult;
    try {
      const fn = resolveVerifyFn(rule.verifyFn);
      fnResult = await fn({
        rule,
        commit_sha: ctx.commit_sha,
        preview_url: ctx.preview_url,
        phase: ctx.phase,
      });
    } catch (err) {
      // Rule registered-but-throwing OR rule unregistered → SKIP with
      // diagnostic. State machine reads SKIP as "loop progresses".
      results.push({
        criterion_id: criterion.id,
        layer: 2,
        verdict: "SKIP",
        error: err instanceof Error ? err.message : String(err),
        evidence: `rule.verifyFn=${rule.verifyFn}`,
        duration_ms: Date.now() - start,
        idempotency_key: deriveIdempotencyKey(
          ctx.commit_sha,
          criterion,
          ctx.org_id
        ).composite,
      });
      continue;
    }

    results.push({
      criterion_id: criterion.id,
      layer: 2,
      verdict: fnResult.verdict,
      evidence: fnResult.evidence,
      expected: fnResult.expected,
      actual: fnResult.actual,
      error: fnResult.error,
      duration_ms: Date.now() - start,
      idempotency_key: deriveIdempotencyKey(
        ctx.commit_sha,
        criterion,
        ctx.org_id
      ).composite,
    });
  }

  return results;
}
