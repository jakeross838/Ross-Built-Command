// Verification verifyFn registry.
//
// Per D-02: Layer 2 standards rules reference a verifyFn by string ID
// (e.g. "conservationMoneyLineItemsSum"). The function is registered at
// import time and resolved at runtime. This means adding a new Layer 2
// rule = drop a JSON file in .planning/verification/standards/<domain>/
// + register one function in this registry. No Layer 2 framework code
// changes per new rule.

import type { StandardsRule } from "./types";

export type VerifyFnContext = {
  rule: StandardsRule;
  commit_sha: string;
  preview_url: string; // Vercel preview URL for the current run
  phase: string;
};

export type VerifyFnResult = {
  verdict: "PASS" | "FAIL" | "SKIP";
  evidence?: string; // file:line, query result, computed value
  expected?: string;
  actual?: string;
  error?: string;
};

export type VerifyFn = (ctx: VerifyFnContext) => Promise<VerifyFnResult>;

const _registry = new Map<string, VerifyFn>();

export function registerVerifyFn(id: string, fn: VerifyFn): void {
  if (_registry.has(id)) {
    throw new Error(`verifyFn '${id}' already registered`);
  }
  _registry.set(id, fn);
}

export function resolveVerifyFn(id: string): VerifyFn {
  const fn = _registry.get(id);
  if (!fn) {
    throw new Error(
      `verifyFn '${id}' not registered. Did you import the standards/<domain>/<rule>.ts module?`
    );
  }
  return fn;
}

/**
 * Read-only view of the registry for diagnostics. Do not mutate.
 */
export const verifyFnRegistry: ReadonlyMap<string, VerifyFn> = _registry;
