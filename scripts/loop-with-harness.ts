#!/usr/bin/env -S npx tsx
// scripts/loop-with-harness.ts — Loop wrapper around the verification harness.
//
// Spawned by /gsd-execute-phase (Plan 8b's mandate update — see Task 2 below).
// Wraps scripts/verify-phase.ts in a state machine loop with max-3-iter +
// halt-for-Jake artifact emission per D-05/D-06/D-07.
//
// Default mode (this phase): Claude orchestrator is in the loop. Loop runs
// once, returns state; if failed-fixable, /gsd-execute-phase reads the
// failure context from the report + spawns gsd-fix-executor (Plan 7) which
// makes a focused commit; then /gsd-execute-phase invokes loop-with-harness
// again on iter+1.
//
// Exit codes (per ITER-1 WARN-3):
//   0 — passed (all 3 layers + state machine terminal: passed)
//   2 — failed-ambiguous (HALT artifact written; halt-for-Jake)
//   3 — discovery failed (propagated from runHarness)
//   4 — runtime error
//   5 — paused-for-fix (interim — /gsd-execute-phase spawns fix-executor + iterates)

import { runLoop } from "../src/lib/verification/loop-orchestrator";
import * as path from "node:path";

interface Argv {
  phase?: string;
  commit_sha?: string;
  preview_url?: string;
  cost_cap_usd?: number;
}

function parseArgv(args: string[]): Argv {
  const out: Argv = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    switch (arg) {
      case "--phase":
        out.phase = next;
        i++;
        break;
      case "--commit-sha":
        out.commit_sha = next;
        i++;
        break;
      case "--preview-url":
        out.preview_url = next;
        i++;
        break;
      case "--cost-cap-usd":
        out.cost_cap_usd = parseFloat(next);
        i++;
        break;
    }
  }
  return out;
}

async function main(): Promise<void> {
  const argv = parseArgv(process.argv.slice(2));
  if (!argv.phase) {
    process.stderr.write("ERROR: --phase required\n");
    process.exit(4);
  }

  const repo_root = path.resolve(__dirname, "..");

  let outcome;
  try {
    outcome = await runLoop({
      phase: argv.phase,
      commit_sha: argv.commit_sha,
      preview_url: argv.preview_url,
      cost_cap_usd: argv.cost_cap_usd,
      repo_root,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[loop-with-harness] FATAL: ${msg}\n`);
    if (msg.includes("FAILED to discover Vercel preview URL")) process.exit(3);
    process.exit(4);
  }

  process.stderr.write(
    `\n[loop-with-harness] ${argv.phase}\n` +
      `  Final state: ${outcome.final_state}\n` +
      `  Iterations: ${outcome.total_iterations}\n` +
      (outcome.halt_reason ? `  Halt reason: ${outcome.halt_reason}\n` : "") +
      (outcome.halt_artifact_path
        ? `  Halt artifact: ${outcome.halt_artifact_path}\n`
        : "")
  );

  // Output structured outcome to stdout for /gsd-execute-phase to parse
  process.stdout.write(
    JSON.stringify({ kind: "loop-outcome", outcome }, null, 2) + "\n"
  );

  // ITER-1 WARN-3: explicit final_state values drive exit code.
  if (outcome.final_state === "passed") process.exit(0);
  if (outcome.final_state === "paused-for-fix") {
    // /gsd-execute-phase spawns gsd-fix-executor + iterates
    process.exit(5);
  }
  if (outcome.final_state === "failed-ambiguous") {
    // Terminal halt — Jake review required (ambiguous vision OR iter-3 OR fix-quality fail)
    process.exit(2);
  }
  // Should be unreachable
  process.exit(4);
}

main().catch((err) => {
  process.stderr.write(
    `[loop-with-harness] UNCAUGHT: ${err instanceof Error ? err.stack : err}\n`
  );
  process.exit(4);
});
