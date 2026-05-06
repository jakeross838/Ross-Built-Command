// Layer 3 barrel.
//
// Per iter-1 ARCH-CRIT-3 / Jake watchpoint #1: Layer3Context lives in
// ../types (Plan 1 foundation). Re-exported here so consumers can write
// `import { Layer3Context } from "@/lib/verification/layer3"` and the
// public API stays stable even though the type is defined upstream.

export { runLayer3 } from "./runner";
export type { Layer3Context } from "../types";
export { callVisionApi, estimateVisionCostUsd, redactApiKey } from "./vision-client";
export type { VisionApiInput } from "./vision-client";
export { CostCap } from "./cost-cap";
