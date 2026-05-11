// Self-test always-PASS verifyFn (per ITER-1 architect WARN-2 + Plan 11 self-test).
//
// This rule exists SOLELY to give Plan 11 self-test a non-vacuous Layer 2 signal.
// The real conservation/money-line-items-sum SKIPs cleanly until /api/_introspect/*
// ships in Wave 1.1+; without this synthetic rule, Plan 11's verification of
// runLayer2 + idempotency contract is vacuous.
//
// DO NOT extend this rule. DO NOT use as a template for real rules. Real rules
// have real verification logic; this rule is a sentinel.

import { registerVerifyFn, type VerifyFn } from "../../../registry";

const conservationSelfTestAlwaysPass: VerifyFn = async () => ({
  verdict: "PASS",
  evidence:
    "Synthetic always-PASS rule (iter-1 amendment); Plan 11 self-test uses this for non-vacuous Layer 2 signal.",
});

registerVerifyFn(
  "conservationSelfTestAlwaysPass",
  conservationSelfTestAlwaysPass
);

export {};
