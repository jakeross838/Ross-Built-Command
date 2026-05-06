#!/usr/bin/env -S npx tsx
// scripts/verify-phase.ts — Nightwork verification harness CLI.
//
// Usage:
//   npx tsx scripts/verify-phase.ts \
//     --phase stage-1.5c-verification-harness \
//     [--preview-url https://...] \
//     [--commit-sha abc123] \
//     [--mode ci|local] \
//     [--base-url http://localhost:3000] \
//     [--cost-cap-usd 1.0] \
//     [--skip-layer 1|2|3] \
//     [--routes /,/dashboard]
//
// Exit codes:
//   0 — all 3 layers PASS (no FAIL verdicts, no confidence < 0.7 results)
//   1 — fail-fixable (any FAIL verdict with confidence >= 0.7)
//   2 — fail-ambiguous (any confidence < 0.7 — halt-for-Jake per D-07)
//   3 — preview URL discovery failed
//   4 — runtime error (uncaught exception)
//
// Per D-04: --mode local supported as escape hatch (documented but
// discouraged per CLAUDE.md Testing Rule update Q2=C deprecation-path).
//
// CI consumption: JSON `{kind: "harness-report", report}` written to stdout.
// GitHub Actions (Plan 6) parses for PR comment + commit status.
//
// Per ITER-1 ARCH-CRIT-1 + Jake watchpoint #1+#5: this CLI does NOT drive
// the state machine. It applies a simple decision rule (does the report
// have any FAIL? any ambiguous?) to map HarnessReport → exit code.
// Plan 8b runLoop wraps this CLI in a loop and drives the actual state
// machine; this CLI is the standalone "run once and exit" entry point
// (used by Plan 6 GH Actions, by Plan 11 self-test, and by the human
// developer running `npx tsx scripts/verify-phase.ts ...` interactively).

import { runHarness } from "../src/lib/verification/orchestrator";
import * as path from "node:path";

interface Argv {
  phase?: string;
  preview_url?: string;
  base_url?: string;
  commit_sha?: string;
  mode: "ci" | "local";
  cost_cap_usd?: number;
  skip_layers: Array<1 | 2 | 3>;
  routes?: string[];
}

function parseArgv(args: string[]): Argv {
  const out: Argv = { mode: "ci", skip_layers: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    switch (arg) {
      case "--phase":
        out.phase = next;
        i++;
        break;
      case "--preview-url":
        out.preview_url = next;
        i++;
        break;
      case "--base-url":
        out.base_url = next;
        i++;
        break;
      case "--commit-sha":
        out.commit_sha = next;
        i++;
        break;
      case "--mode":
        if (next === "ci" || next === "local") out.mode = next;
        i++;
        break;
      case "--cost-cap-usd":
        out.cost_cap_usd = parseFloat(next);
        i++;
        break;
      case "--skip-layer":
        if (next === "1" || next === "2" || next === "3") {
          out.skip_layers.push(parseInt(next, 10) as 1 | 2 | 3);
        }
        i++;
        break;
      case "--routes":
        out.routes = next.split(",").map((s) => s.trim());
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

  let commit_sha = argv.commit_sha;
  if (!commit_sha) {
    // Fall back to HEAD
    const { spawn } = await import("node:child_process");
    commit_sha = await new Promise<string>((resolve, reject) => {
      const child = spawn("git", ["rev-parse", "HEAD"], { cwd: repo_root });
      let out = "";
      child.stdout?.on("data", (d) => (out += d.toString()));
      child.on("close", (code) =>
        code === 0
          ? resolve(out.trim())
          : reject(new Error(`git rev-parse exit ${code}`))
      );
    });
  }

  let report;
  try {
    report = await runHarness({
      mode: argv.mode,
      preview_url: argv.preview_url,
      base_url: argv.base_url,
      phase: argv.phase,
      commit_sha,
      cost_cap_usd: argv.cost_cap_usd,
      skip_layers: argv.skip_layers,
      routes: argv.routes,
      repo_root,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[verify-phase] FATAL: ${msg}\n`);
    if (msg.includes("FAILED to discover Vercel preview URL")) {
      process.exit(3);
    }
    process.exit(4);
  }

  // Print summary to stderr for human readers
  process.stderr.write(
    `\n[verify-phase] ${argv.phase} @ ${commit_sha.slice(0, 8)} on ${report.preview_url} (${report.preview_url_source})\n` +
      `  Layer 1: ${report.results_by_layer.layer1.length} criteria\n` +
      `  Layer 2: ${report.results_by_layer.layer2.length} criteria\n` +
      `  Layer 3: ${report.results_by_layer.layer3.length} criteria  (vision cost: $${report.total_vision_cost_usd.toFixed(4)})\n` +
      `  Duration: ${(report.duration_ms / 1000).toFixed(1)}s\n` +
      `  Ambiguous (conf<0.7): ${report.ambiguous_results.length}\n`
  );

  // Decision rule (NOT a state machine — Plan 8b runLoop owns the actual SM).
  // Apply HarnessReport → exit code mapping:
  //   - any ambiguous result (conf < 0.7) → exit 2 (fail-ambiguous, halt-for-Jake)
  //   - any FAIL verdict → exit 1 (fail-fixable; loop runs gsd-fix-executor)
  //   - all PASS → exit 0
  if (report.ambiguous_results.length > 0) {
    process.exit(2);
  }
  const allResults = [
    ...report.results_by_layer.layer1,
    ...report.results_by_layer.layer2,
    ...report.results_by_layer.layer3,
  ];
  const hasFail = allResults.some((r) => r.verdict === "FAIL");
  if (hasFail) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(
    `[verify-phase] UNCAUGHT: ${err instanceof Error ? err.stack : err}\n`
  );
  process.exit(4);
});
