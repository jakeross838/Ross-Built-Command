// Verification idempotency.
//
// Per D-22: idempotency_key = sha256(commit_sha + canonical_criterion_hash)
// canonical_criterion_hash = sha256(JSON.stringify({phase, plan, category, text, org_id}))
//
// Stored at .planning/verification/runs/[phase]/[commit]/idempotency.json
// On rerun against same commit:
//   - Layer 3 vision: skip API call if key exists with verdict PASS
//   - Layer 1/2: re-run cheaply (idempotency only protects spend, not idempotent on its own)
//
// Plan-review watchpoint #7: rerun-on-same-commit really is a no-op. Tested
// in Plan 11 self-test against this very phase's harness run.
//
// Per D-30 + iter-1 C4: org_id participates in canonical_criterion_hash so a
// cached PASS verdict from tenant A cannot be reused for tenant B with the
// same criterion text. Today single-tenant (FIXTURE_ORG_ID); Wave 1.1+
// tenant-aware. Tenant safety is a SHAPE invariant, not a runtime check.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import * as path from "node:path";
import { FIXTURE_ORG_ID } from "./types"; // ITER-1 C4: default arg for tenant-bounded hash
import type { VerificationCriterion, IdempotencyKey } from "./types";

export function canonicalCriterionHash(
  criterion: VerificationCriterion,
  org_id: string = FIXTURE_ORG_ID
): string {
  // ITER-1 C4 amendment: org_id added to canonical hash so a cached PASS
  // verdict from tenant A cannot be reused for tenant B with same criterion
  // text. Today single-tenant (FIXTURE_ORG_ID); Wave 1.1+ tenant-aware.
  // Per D-30: this is enforcement-by-construction — even if the caller forgets
  // to pass org_id, the default keeps tenant data unreachable.
  //
  // Order-stable JSON to ensure identical hash across machines / Node versions.
  const canonical = JSON.stringify({
    phase: criterion.phase,
    plan: criterion.plan,
    category: criterion.category,
    text: criterion.text,
    org_id,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export function deriveIdempotencyKey(
  commit_sha: string,
  criterion: VerificationCriterion,
  org_id: string = FIXTURE_ORG_ID
): IdempotencyKey {
  // ITER-1 C4: thread org_id into the hash. See canonicalCriterionHash for
  // rationale. The key fingerprint includes tenant identity so cache lookups
  // are tenant-bounded by design.
  const criterion_hash = canonicalCriterionHash(criterion, org_id);
  const composite = createHash("sha256")
    .update(commit_sha + criterion_hash)
    .digest("hex");
  return { commit_sha, criterion_hash, composite };
}

/**
 * Read a cached value at runs/[phase]/[commit]/[name].json
 * Returns null if not present.
 */
export function cacheReadJson<T = unknown>(
  phase: string,
  commit_sha: string,
  name: string
): T | null {
  const filePath = cachePath(phase, commit_sha, name);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

/**
 * Write a cached value at runs/[phase]/[commit]/[name].json
 * Creates parent dir if missing.
 */
export function cacheWriteJson(
  phase: string,
  commit_sha: string,
  name: string,
  value: unknown
): void {
  const filePath = cachePath(phase, commit_sha, name);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
}

function cachePath(phase: string, commit_sha: string, name: string): string {
  // Resolve relative to repo root via process.cwd() (harness runs from repo root)
  return path.resolve(
    process.cwd(),
    ".planning/verification/runs",
    phase,
    commit_sha,
    `${name}.json`
  );
}
