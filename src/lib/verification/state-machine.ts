// Verification loop-with-executor state machine.
//
// Per D-05: harness loop runs INSIDE /gsd-execute-phase, BEFORE /nightwork-qa.
// Per D-06: max-iter is ADDITIVE within current execute iteration (not consuming halt-after budget).
// Per D-07: halt-for-Jake on (a) iter-3 OR (b) confidence < 0.7 vision result.
//
// State graph:
//   idle → running-layer-1
//   running-layer-1 → running-layer-2 (Layer 1 PASS) | failed-fixable (Layer 1 FAIL)
//   running-layer-2 → running-layer-3 (Layer 2 PASS) | failed-fixable (Layer 2 FAIL)
//   running-layer-3 → passed (Layer 3 PASS, confidence >= 0.7)
//                   | failed-fixable (Layer 3 FAIL, confidence >= 0.7)
//                   | failed-ambiguous (any confidence < 0.7, regardless of verdict)
//   failed-fixable → spawn gsd-fix-executor → idle (on next commit; iter++)
//   failed-ambiguous → halt-for-Jake (terminal — Plan 8b stops the loop)
//   iter == 3 → halt-for-Jake (terminal regardless of fixable/ambiguous)
//   passed → terminal
//
// Plan 8b consumes this state machine. Plan 11 self-tests the transitions.
//
// Per iter-1 ARCH-CRIT-1: MAX_ITERATIONS is hard-coded here (not configurable);
// loop ownership lives entirely in Plan 8b runLoop (Plan 5 runHarness does NOT
// drive transitions). Pure functions; no side effects.

import type { LoopState, VerificationResult } from "./types";

export const MAX_ITERATIONS = 3;

export interface LoopContext {
  state: LoopState;
  iteration: number; // 1-based; iter=3 hard-halts on next failure
  results: VerificationResult[];
  halt_reason?: "iter-3" | "ambiguous-vision" | "passed";
}

export function initialState(): LoopContext {
  return {
    state: "idle",
    iteration: 1,
    results: [],
  };
}

export function transition(
  ctx: LoopContext,
  event:
    | { type: "start" }
    | { type: "layer-1-result"; results: VerificationResult[] }
    | { type: "layer-2-result"; results: VerificationResult[] }
    | { type: "layer-3-result"; results: VerificationResult[] }
    | { type: "fix-committed" }
): LoopContext {
  switch (event.type) {
    case "start": {
      if (ctx.state !== "idle") return ctx;
      return { ...ctx, state: "running-layer-1" };
    }
    case "layer-1-result": {
      const allResults = [...ctx.results, ...event.results];
      const failed = event.results.some((r) => r.verdict === "FAIL");
      if (failed) {
        if (ctx.iteration >= MAX_ITERATIONS) {
          return {
            ...ctx,
            state: "failed-ambiguous",
            results: allResults,
            halt_reason: "iter-3",
          };
        }
        return { ...ctx, state: "failed-fixable", results: allResults };
      }
      return { ...ctx, state: "running-layer-2", results: allResults };
    }
    case "layer-2-result": {
      const allResults = [...ctx.results, ...event.results];
      const failed = event.results.some((r) => r.verdict === "FAIL");
      if (failed) {
        if (ctx.iteration >= MAX_ITERATIONS) {
          return {
            ...ctx,
            state: "failed-ambiguous",
            results: allResults,
            halt_reason: "iter-3",
          };
        }
        return { ...ctx, state: "failed-fixable", results: allResults };
      }
      return { ...ctx, state: "running-layer-3", results: allResults };
    }
    case "layer-3-result": {
      const allResults = [...ctx.results, ...event.results];
      // Per D-07: ambiguous = any confidence < 0.7, regardless of verdict
      const ambiguous = event.results.some(
        (r) => r.confidence !== undefined && r.confidence < 0.7
      );
      if (ambiguous) {
        return {
          ...ctx,
          state: "failed-ambiguous",
          results: allResults,
          halt_reason: "ambiguous-vision",
        };
      }
      const failed = event.results.some((r) => r.verdict === "FAIL");
      if (failed) {
        if (ctx.iteration >= MAX_ITERATIONS) {
          return {
            ...ctx,
            state: "failed-ambiguous",
            results: allResults,
            halt_reason: "iter-3",
          };
        }
        return { ...ctx, state: "failed-fixable", results: allResults };
      }
      return {
        ...ctx,
        state: "passed",
        results: allResults,
        halt_reason: "passed",
      };
    }
    case "fix-committed": {
      if (ctx.state !== "failed-fixable") return ctx;
      return { ...ctx, state: "idle", iteration: ctx.iteration + 1 };
    }
  }
}

export function isTerminal(ctx: LoopContext): boolean {
  return ctx.state === "passed" || ctx.state === "failed-ambiguous";
}

export function isHaltState(ctx: LoopContext): boolean {
  return ctx.state === "failed-ambiguous";
}
