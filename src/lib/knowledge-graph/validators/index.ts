// Validator registry.
//
// Named exports for direct import (e.g., a single API route reaching
// `wi001InlineBudgetContext` directly), plus a typed `validatorRegistry`
// Map for runtime lookup by ID (e.g., a future generic `/api/_validate`
// dispatcher that resolves validators by string ID).
//
// Adding a new validator:
//   1. Author `validators/<id>.ts` exporting a `Validator<T>` per ../types.ts
//   2. Add a named re-export here.
//   3. Register the validator in the `validatorRegistry` Map below.
//   4. Add a unit test at `__tests__/validators/<id>.test.ts` exercising
//      both the happy path AND ≥1 violation path.
//   5. Update the directory README if the validator introduces a new
//      pattern (cross-entity FK / multi-row aggregation / schema-shape
//      policy / ...).
import type { Validator } from "../types";

import { wi001InlineBudgetContext } from "./wi-001-inline-budget-context";
import { wi013MultiJobAllocation } from "./wi-013-multi-job-allocation";
import { clientPiiNotEmbedded } from "./client-pii-not-embedded";

export { wi001InlineBudgetContext } from "./wi-001-inline-budget-context";
export { wi013MultiJobAllocation } from "./wi-013-multi-job-allocation";
export { clientPiiNotEmbedded } from "./client-pii-not-embedded";

// Runtime registry. Keys are stable IDs (kebab-case
// `<domain>-<noun>-<test>` for WI-derived validators; `wi-NNN-<kebab>`
// for direct WORKFLOW-INTELLIGENCE entries).
//
// Typed as `Map<string, Validator<unknown>>` so the registry is
// homogeneous from the caller's perspective; specific validators retain
// their generic types via the named exports above for type-safe direct
// import. Callers using the registry must cast at the call site
// (acceptable: the registry is a runtime dispatcher, not a type-safe
// generic facade).
export const validatorRegistry: ReadonlyMap<string, Validator<unknown>> =
  new Map<string, Validator<unknown>>([
    [
      "wi-001-inline-budget-context",
      wi001InlineBudgetContext as Validator<unknown>,
    ],
    [
      "wi-013-multi-job-allocation",
      wi013MultiJobAllocation as Validator<unknown>,
    ],
    [
      "client-pii-not-embedded",
      clientPiiNotEmbedded as Validator<unknown>,
    ],
  ]);
