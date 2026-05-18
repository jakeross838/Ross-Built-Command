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
import "./standards/conservation/self-test-always-pass"; // iter-1 WARN-2: non-vacuous self-test signal
// Integrity domain — added in F1-Wave-B Plan B-1b (nwrp152). Structural-
// invariant standards (audit conservation, RLS coverage, role-permission
// integrity, fixture coverage) per umbrella Q9 D + Q11 D. All 4 SKIP
// cleanly until their introspection surfaces ship in Wave 1.1+ / F2+.
import "./standards/integrity/audit-conservation";
import "./standards/integrity/rls-coverage";
import "./standards/integrity/role-permission-integrity";
import "./standards/integrity/fixture-coverage";
// Future rules:
// import "./standards/conservation/<rule>";
// import "./standards/aia/<rule>";
// import "./standards/accounting/<rule>";
// import "./standards/lien-law/<rule>";
// import "./standards/dates/<rule>";
// import "./standards/integrity/<rule>";

export { runLayer2 } from "./runner";
export { loadStandardsRules, validateRule } from "./loader";
export type { ValidationResult } from "./loader";
// Layer2Context: re-export from ../types (canonical home per ARCH-CRIT-3)
export type { Layer2Context } from "../types";
