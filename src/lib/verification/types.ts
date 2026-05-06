// Verification module — types.
//
// Per D-01..D-22: this module implements the 3-layer verification pipeline.
// Layer 1 (mechanical/dom) — Plan 2; Layer 2 (behavioral/standards) — Plan 3;
// Layer 3 (visual/semantic — Claude vision) — Plan 4. Orchestrator (Plan 5)
// imports from here. Loop-with-executor state machine + halt-for-Jake
// triggers (Plan 8b) read LoopState from here.
//
// Per D-02: StandardsRule.verifyFn is a string ID resolved at runtime via
// registry. Adding a Layer 2 rule = drop a JSON file + register one function.
// See registry.ts.
//
// Per D-22: IdempotencyKey is sha256(commit_sha + canonical_criterion_hash).
// On rerun against same commit, Layer 3 reads cached VisionResult and skips
// the Anthropic API call. See idempotency.ts.
//
// Per D-07: VisionResult.confidence < 0.7 triggers halt-for-Jake EVEN ON PASS
// verdict. Plan 8b reads this field.
//
// Per D-30 + iter-1 ARCH-CRIT-3: Layer1Context, Layer2Context, Layer3Context
// live HERE so Plans 2/3/4 import a single source-of-truth contract. Without
// this, parallel Wave 1 plans could deviate (e.g., Plan 2 adds required
// `viewports?: number[]`) and Wave 2 dispatch would block on compile failures.
// Every Layer*Context carries org_id; today's value is constant FIXTURE_ORG_ID.

export type VerificationCriterionCategory =
  | "mechanical" // Layer 1: build clean, typecheck clean, hooks silent
  | "dom" // Layer 1: page contains element X
  | "visual" // Layer 3: Site Office signature visible
  | "behavioral" // Layer 2: state transition X → Y
  | "semantic"; // Layer 3: cost code visible on each line item

export type VerificationLayer = 1 | 2 | 3;

export interface VerificationCriterion {
  id: string; // unique within phase, e.g. "AC-1.5c-vh-5-2"
  phase: string;
  plan: string;
  category: VerificationCriterionCategory;
  text: string; // human-readable criterion (the "what to check")
  layer: VerificationLayer; // derived from category but cached for fast filter
}

export interface VerificationResult {
  criterion_id: string;
  layer: VerificationLayer;
  verdict: "PASS" | "FAIL" | "SKIP";
  confidence?: number; // 0-1, only set on Layer 3 results
  reasoning?: string; // Layer 3 vision reasoning
  evidence?: string; // file:line OR screenshot path
  expected?: string; // for FAIL: what was expected
  actual?: string; // for FAIL: what was found
  error?: string; // for SKIP / runtime errors
  duration_ms: number;
  idempotency_key: string; // sha256(commit_sha + criterion_hash)
  vision_cost_usd?: number; // only set on Layer 3 results when API was called
}

// Loop-with-executor state machine (per D-05, D-06, D-07).
//
// Per iter-1 plan-review Cluster 2 ARCH-CRIT-1 (state-machine spec lockdown)
// + Plan 8b.LoopOutcome.final_state spec: "paused-for-fix" is an explicit
// state value distinct from "failed-ambiguous" (Plan 8b runs gsd-fix-executor
// on this state and re-enters the loop). Plans 1 ships the type so Plan 8b
// implementation can reference it without locally redefining.
export type LoopState =
  | "idle"
  | "running-layer-1"
  | "running-layer-2"
  | "running-layer-3"
  | "failed-fixable"
  | "failed-ambiguous"
  | "paused-for-fix"
  | "passed";

export interface IdempotencyKey {
  commit_sha: string;
  criterion_hash: string;
  composite: string; // sha256(commit_sha + criterion_hash)
}

// Standards JSON schema (per D-02)
export type StandardsDomain =
  | "aia"
  | "accounting"
  | "lien-law"
  | "dates"
  | "conservation";

export interface StandardsRule {
  $schema: string;
  id: string; // e.g. "conservation-money-line-items-sum"
  domain: StandardsDomain;
  title: string;
  description: string;
  verifyFn: string; // string ID resolved via registry at runtime
  applies_to: string[]; // entity names: "invoice", "draw", "change_order"
  severity: "blocking" | "warning";
  source: string[]; // citations
  tags: string[];
}

export interface VisionResult {
  criterion_id: string;
  verdict: "PASS" | "FAIL";
  confidence: number; // 0-1; below 0.7 triggers halt-for-Jake even on PASS (per D-07)
  reasoning: string;
  vision_cost_usd: number;
  cached: boolean; // true if idempotency hit; vision API not called
}

// ITER-1 ARCH-CRIT-3 amendment: Layer*Context types live HERE so Plans 2/3/4
// import a single source-of-truth contract. Without this, parallel Wave 1
// plans could deviate (e.g., Plan 2 adds required `viewports?: number[]`)
// and Wave 2 dispatch would block on compile failures.
//
// Per D-30 + iter-1 C4: every Layer*Context carries org_id. Today's value is
// constant FIXTURE_ORG_ID = "fixture-harness-org". When Wave 1.1+ enables
// per-tenant preview verification, this becomes the tenant's org_id and the
// idempotency cache + report scoping respect tenant isolation BY CONSTRUCTION.

export const FIXTURE_ORG_ID = "fixture-harness-org";

export interface Layer1Context {
  preview_url: string;
  commit_sha: string;
  phase: string;
  org_id: string; // FIXTURE_ORG_ID today; tenant-aware Wave 1.1+
  routes_to_check: string[];
  dom_criteria: VerificationCriterion[];
  repo_root: string;
  // Plan 2 dev-loop convenience: skip expensive sub-runners locally. The
  // orchestrator (Plan 5) and CI (Plan 6) leave these undefined / false so
  // every check runs in the canonical signal path.
  skip_build?: boolean;
  skip_typecheck?: boolean;
}

export interface Layer2Context {
  preview_url: string;
  commit_sha: string;
  phase: string;
  org_id: string; // FIXTURE_ORG_ID today; tenant-aware Wave 1.1+
  rules?: StandardsRule[]; // explicit override; loaded from disk if absent
  repo_root: string;
}

export interface Layer3Context {
  preview_url: string;
  commit_sha: string;
  phase: string;
  org_id: string; // FIXTURE_ORG_ID today; tenant-aware Wave 1.1+
  criteria: VerificationCriterion[];
  cost_cap_usd?: number;
  cost_cap_remaining_usd?: number; // ITER-1 C4: hoisted from Plan 4 — runLoop passes the live remaining budget so iter-N is bounded across iterations (NOT multiplied 3×)
  repo_root: string;
  api_key?: string;
}
