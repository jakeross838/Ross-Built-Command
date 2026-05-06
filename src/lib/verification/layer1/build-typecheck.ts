// Layer 1 — build + typecheck wrappers.
//
// Per D-08: absorbs nightwork-smoke-tester mechanical-health-check logic.
// Per CLAUDE.md: build clean is non-negotiable; typecheck clean is non-negotiable.
// These checks fail FAST and CHEAP — no point spawning Layer 2/3 against a
// broken build.
//
// Per D-23 / .planning/lessons.md: this module never force-kills a child
// process. spawn() returns when the child closes naturally. Plan 5 orchestrator
// owns timeout/abort semantics for higher-level cancellation.

import { spawn } from "node:child_process";
import type {
  VerificationCriterion,
  VerificationResult,
} from "../types";
import { deriveIdempotencyKey } from "../idempotency";

// Synthetic criterion for build (mechanical category). Always present in Layer 1.
const BUILD_CRITERION: VerificationCriterion = {
  id: "layer1-mechanical-build-clean",
  phase: "(any)",
  plan: "(synthetic)",
  category: "mechanical",
  text: "npm run build clean (0 warnings, 0 errors)",
  layer: 1,
};

const TYPECHECK_CRITERION: VerificationCriterion = {
  id: "layer1-mechanical-typecheck-clean",
  phase: "(any)",
  plan: "(synthetic)",
  category: "mechanical",
  text: "npx tsc --noEmit returns 0 errors in src/",
  layer: 1,
};

interface SpawnResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

async function runCmd(
  cmd: string,
  args: string[],
  cwd: string
): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(cmd, args, {
      cwd,
      shell: process.platform === "win32",
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (d: Buffer) => (stdout += d.toString()));
    child.stderr?.on("data", (d: Buffer) => (stderr += d.toString()));
    child.on("close", (code) =>
      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr,
        durationMs: Date.now() - start,
      })
    );
  });
}

export async function runBuild(
  commit_sha: string,
  repo_root: string,
  org_id?: string
): Promise<VerificationResult> {
  const result = await runCmd("npm", ["run", "build"], repo_root);
  const verdict = result.exitCode === 0 ? "PASS" : "FAIL";
  // Detect warnings — Next.js prints "warn" lines; treat any as PASS-but-noted
  // (build CLEAN per CLAUDE.md is exit 0 + 0 warnings).
  const hasWarnings =
    /\bwarn(?:ing)?[ :]/i.test(result.stdout) ||
    /\bwarn(?:ing)?[ :]/i.test(result.stderr);
  const finalVerdict = verdict === "PASS" && hasWarnings ? "FAIL" : verdict;
  return {
    criterion_id: BUILD_CRITERION.id,
    layer: 1,
    verdict: finalVerdict,
    evidence:
      finalVerdict === "PASS"
        ? "exit 0; no warnings"
        : truncate(result.stdout + result.stderr, 2000),
    expected: "exit 0, 0 warnings",
    actual:
      finalVerdict === "PASS"
        ? undefined
        : `exit ${result.exitCode}${hasWarnings ? "; warnings present" : ""}`,
    duration_ms: result.durationMs,
    idempotency_key: deriveIdempotencyKey(commit_sha, BUILD_CRITERION, org_id)
      .composite,
  };
}

export async function runTypecheck(
  commit_sha: string,
  repo_root: string,
  org_id?: string
): Promise<VerificationResult> {
  const result = await runCmd("npx", ["tsc", "--noEmit"], repo_root);
  const verdict = result.exitCode === 0 ? "PASS" : "FAIL";
  return {
    criterion_id: TYPECHECK_CRITERION.id,
    layer: 1,
    verdict,
    evidence:
      verdict === "PASS"
        ? "0 errors in src/"
        : truncate(result.stdout + result.stderr, 2000),
    expected: "0 errors in src/",
    actual: verdict === "PASS" ? undefined : `exit ${result.exitCode}`,
    duration_ms: result.durationMs,
    idempotency_key: deriveIdempotencyKey(commit_sha, TYPECHECK_CRITERION, org_id)
      .composite,
  };
}

function truncate(s: string, max: number): string {
  return s.length > max
    ? s.slice(0, max) + `... (truncated; full output ${s.length} chars)`
    : s;
}
