// Knowledge-graph barrel — top-level entrypoint for the KG layer.
//
// Per F1-Wave-B Plan B-1b (nwrp152 / nwrp153 umbrella Q11 D — hybrid
// schema-in-DB + types-generated + validators-in-app).
//
// CALLER PATTERN
// --------------
// Server-side API routes / verification harness import from here:
//   import {
//     validatorRegistry,
//     queryRegistry,
//     type Validator,
//     type ValidatorContext,
//     type ValidatorResult,
//   } from "@/lib/knowledge-graph";
//
// Direct named imports of specific validators are also supported:
//   import { wi001InlineBudgetContext } from "@/lib/knowledge-graph";
//
// See ./README.md for naming conventions, how to add a validator/query,
// and F2-F5 expansion plan.

export type {
  Validator,
  ValidatorContext,
  ValidatorResult,
  ValidatorViolation,
} from "./types";

export {
  validatorRegistry,
  wi001InlineBudgetContext,
  wi013MultiJobAllocation,
  clientPiiNotEmbedded,
} from "./validators";

export { queryRegistry, type CrossEntityQuery } from "./queries";
