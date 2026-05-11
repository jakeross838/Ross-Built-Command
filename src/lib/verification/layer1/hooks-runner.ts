// Layer 1 — hooks runner.
//
// Per D-08: absorbs nightwork-smoke-tester mechanical-health-check logic.
// The existing post-edit hook + system .githooks/pre-commit Drummond grep
// gate run on every commit. Layer 1 verifies they would still fire silently
// on a re-run (covers cases where state changed without touching gated files).
//
// Per D-23 / .planning/lessons.md: never force-kill child processes.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import * as path from "node:path";
import type {
  VerificationResult,
  VerificationCriterion,
} from "../types";
import { deriveIdempotencyKey } from "../idempotency";

interface HookSpec {
  id: string;
  text: string;
  cmd: string;
  args: string[];
  cwd_relative: string;
}

const HOOKS_TO_RUN: HookSpec[] = [
  {
    id: "layer1-mechanical-drummond-grep",
    text: "System .githooks/pre-commit Drummond grep gate silent (no real Drummond identifier leaks)",
    cmd: "bash",
    args: [".githooks/pre-commit"],
    cwd_relative: ".",
  },
  // Additional hooks added here as they ship; for now we run the system
  // pre-commit which covers the Drummond grep gate (the load-bearing one).
];

export async function runHookSweep(
  commit_sha: string,
  repo_root: string,
  org_id?: string
): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  for (const hook of HOOKS_TO_RUN) {
    const cwd = path.resolve(repo_root, hook.cwd_relative);
    const hookPath = path.resolve(repo_root, hook.args[0]);

    const criterion: VerificationCriterion = {
      id: hook.id,
      phase: "(any)",
      plan: "(synthetic)",
      category: "mechanical",
      text: hook.text,
      layer: 1,
    };

    if (!existsSync(hookPath)) {
      results.push({
        criterion_id: criterion.id,
        layer: 1,
        verdict: "SKIP",
        error: `Hook file not found: ${hookPath}`,
        duration_ms: 0,
        idempotency_key: deriveIdempotencyKey(commit_sha, criterion, org_id)
          .composite,
      });
      continue;
    }

    const start = Date.now();
    const exitCode = await new Promise<number>((resolve) => {
      const child = spawn(hook.cmd, hook.args, {
        cwd,
        shell: process.platform === "win32",
      });
      child.on("close", (code) => resolve(code ?? 1));
    });

    const verdict = exitCode === 0 ? "PASS" : "FAIL";
    results.push({
      criterion_id: criterion.id,
      layer: 1,
      verdict,
      evidence:
        verdict === "PASS" ? "hook exit 0 (silent)" : `hook exit ${exitCode}`,
      expected: "exit 0",
      actual: verdict === "PASS" ? undefined : `exit ${exitCode}`,
      duration_ms: Date.now() - start,
      idempotency_key: deriveIdempotencyKey(commit_sha, criterion, org_id)
        .composite,
    });
  }

  return results;
}
