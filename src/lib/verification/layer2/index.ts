// Layer 2 barrel.
//
// Side-effect imports register every verifyFn into the global registry
// (src/lib/verification/registry.ts). Plan 5 orchestrator imports this
// module once at startup; Plan 11 self-test verifies all expected rules
// are registered.
//
// Adding a new rule: append the side-effect import below + ship a matching
// JSON file in .planning/verification/standards/<domain>/. No other changes
// to runner.ts or loader.ts (D-02 forward-extensibility).
//
// Per ITER-1 ARCH-CRIT-3 / Jake watchpoint #1: Layer2Context re-exported
// from ../types (single source of truth — never redefined here).

import "./standards/conservation/money-line-items-sum";
// Future rules:
// import "./standards/conservation/<rule>";
// import "./standards/aia/<rule>";
// import "./standards/accounting/<rule>";
// import "./standards/lien-law/<rule>";
// import "./standards/dates/<rule>";

export { runLayer2 } from "./runner";
export { loadStandardsRules, validateRule } from "./loader";
export type { ValidationResult } from "./loader";
// Layer2Context: re-export from ../types (canonical home per ARCH-CRIT-3)
export type { Layer2Context } from "../types";
