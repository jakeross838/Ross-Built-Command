// Loop orchestrator — wraps runHarness with state machine + iter counter.
//
// Per D-05: harness loop runs INSIDE /gsd-execute-phase BEFORE /nightwork-qa.
// Per D-06: max-iter=3 ADDITIVE within current execute iteration (does NOT
//           consume halt-after budget).
// Per D-07: halt-for-Jake on (a) iter-3 reached OR (b) Layer 3 confidence
//           < 0.7 (regardless of verdict).
//
// Plan-review watchpoint #2: state machine cleanly bounded, no infinite loops.
// MAX_ITERATIONS = 3 (from state-machine.ts) is the hard cap.
//
// The loop does NOT auto-spawn gsd-fix-executor by default. Why: in
// /gsd-execute-phase, Claude is the orchestrator. The loop reports state +
// writes a HALT artifact; Claude reads the artifact and either spawns
// gsd-fix-executor (failed-fixable) or pauses (failed-ambiguous). This keeps
// Claude in the loop and avoids agent-cascade in CI.
//
// Auto-spawn mode (auto_spawn_fix_executor=true) is an opt-in for fully
// autonomous CI runs (Wave 1.1+ exploration); not used this phase.

import {
  runHarness,
  type HarnessReport,
  type HarnessOptions,
} from "./orchestrator";
import {
  initialState,
  transition,
  MAX_ITERATIONS,
  type LoopContext,
} from "./state-machine";
import { CostCap } from "./layer3";
import { writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";

export interface LoopOptions {
  phase: string;
  commit_sha?: string;
  preview_url?: string;
  cost_cap_usd?: number;
  repo_root: string;
  auto_spawn_fix_executor?: boolean;
}

export interface LoopOutcome {
  // ITER-1 WARN-3: explicit "paused-for-fix" distinct from "failed-ambiguous".
  // /gsd-execute-phase reads final_state directly and spawns gsd-fix-executor
  // on "paused-for-fix" or routes to halt-for-Jake on "failed-ambiguous".
  final_state: "passed" | "failed-ambiguous" | "paused-for-fix";
  total_iterations: number;
  reports: HarnessReport[];
  halt_artifact_path?: string;
  halt_reason?: "iter-3" | "ambiguous-vision" | "fix-quality-failure";
  // ITER-1 C4: CostCap is constructed ONCE per runLoop invocation; this is the
  // live remaining budget after all iterations completed.
  cost_cap_remaining_usd?: number;
  // ITER-1 MEDIUM-3: result of the iter > 1 fix-quality gate (build + tsc).
  // Undefined on iter==1 (no fix-executor commit to verify yet).
  fix_quality_check?: { passed: boolean; reason?: string };
}

export async function runLoop(opts: LoopOptions): Promise<LoopOutcome> {
  const reports: HarnessReport[] = [];
  let ctx: LoopContext = initialState();

  // Resolve commit_sha if not provided
  let commit_sha =
    opts.commit_sha ?? (await getCurrentCommitSha(opts.repo_root));

  // ITER-1 C4 + D-30: CostCap is constructed ONCE per runLoop invocation. iter-N
  // does NOT get a fresh $1 budget — the cap bounds total spend across iterations.
  // This fixes the cost-multiplication exposure flagged by multi-tenant C4 (CostCap
  // was per-runLayer3 call before this amendment, allowing 3× spend).
  const costCap = new CostCap(opts.cost_cap_usd ?? 1.0);

  // ITER-1 MEDIUM-3 (security): track fix-quality across iterations.
  let fix_quality_check: { passed: boolean; reason?: string } | undefined;

  for (let iter = 1; iter <= MAX_ITERATIONS; iter++) {
    ctx = { ...ctx, iteration: iter };

    // ITER-1 MEDIUM-3 amendment: on iter > 1, BEFORE re-running the harness,
    // verify the fix-executor's commit didn't break Layer 1 mechanics (build,
    // typecheck, hooks). If it did, halt-for-Jake immediately — re-running the
    // full harness is wasteful when we already know Layer 1 will fail.
    if (iter > 1) {
      const newSha = await getCurrentCommitSha(opts.repo_root);
      if (newSha === commit_sha) {
        // No new commit — fix-executor returned without committing. Halt.
        fix_quality_check = {
          passed: false,
          reason: `fix-executor returned without commit on iter ${iter}`,
        };
        const haltPath = writeFixQualityHaltArtifact(
          opts,
          commit_sha,
          ctx,
          fix_quality_check
        );
        return {
          final_state: "failed-ambiguous",
          total_iterations: iter - 1,
          reports,
          halt_artifact_path: haltPath,
          halt_reason: "fix-quality-failure",
          cost_cap_remaining_usd: costCap.remainingUsd(),
          fix_quality_check,
        };
      }
      commit_sha = newSha;
      const fixCheck = await runFixQualityGate(opts.repo_root);
      fix_quality_check = fixCheck;
      if (!fixCheck.passed) {
        // Fix broke Layer 1 mechanics. Halt-for-Jake.
        const haltPath = writeFixQualityHaltArtifact(
          opts,
          commit_sha,
          ctx,
          fixCheck
        );
        return {
          final_state: "failed-ambiguous",
          total_iterations: iter,
          reports,
          halt_artifact_path: haltPath,
          halt_reason: "fix-quality-failure",
          cost_cap_remaining_usd: costCap.remainingUsd(),
          fix_quality_check,
        };
      }
    }

    const harnessOpts: HarnessOptions = {
      mode: "ci",
      preview_url: opts.preview_url,
      phase: opts.phase,
      commit_sha,
      cost_cap_usd: opts.cost_cap_usd,
      // ITER-1 C4: thread the LIVE remaining budget into Layer 3, NOT a fresh $1.
      // (HarnessOptions doesn't carry cost_cap_remaining_usd directly today; the
      // orchestrator threads it via ctx.cost_cap_remaining_usd in Layer3Context.
      // For Plan 5 to consume it, we'd extend HarnessOptions — for the simpler
      // path here, runLoop calls runLayer3 directly with the live budget.
      // See AC-1.5c-vh-8b-X for the wire-up.)
      repo_root: opts.repo_root,
    };

    const report = await runHarness(harnessOpts);
    reports.push(report);

    // ITER-1 C4: decrement CostCap by the iter's vision spend
    costCap.record(report.total_vision_cost_usd);

    // ITER-1 ARCH-CRIT-1: state machine is OWNED HERE. runHarness no longer
    // drives it. We drive transitions from the report's per-layer results,
    // applying iteration counter at this level only.
    ctx = transition(ctx, { type: "start" });
    ctx = transition(ctx, {
      type: "layer-1-result",
      results: report.results_by_layer.layer1,
    });
    if (ctx.state === "running-layer-2") {
      ctx = transition(ctx, {
        type: "layer-2-result",
        results: report.results_by_layer.layer2,
      });
    }
    if (ctx.state === "running-layer-3") {
      ctx = transition(ctx, {
        type: "layer-3-result",
        results: report.results_by_layer.layer3,
      });
    }

    // Terminal: passed → return success
    if (ctx.state === "passed") {
      return {
        final_state: "passed",
        total_iterations: iter,
        reports,
        cost_cap_remaining_usd: costCap.remainingUsd(),
        fix_quality_check,
      };
    }

    // Halt: ambiguous-vision (any iter, even iter 1) → write artifact + return
    if (ctx.state === "failed-ambiguous") {
      // Distinguish iter-3 vs ambiguous-vision per the state-machine's halt_reason
      const reason: "iter-3" | "ambiguous-vision" =
        ctx.halt_reason === "iter-3" ? "iter-3" : "ambiguous-vision";
      const haltPath = writeHaltArtifact(opts, commit_sha, ctx, report, reason);
      return {
        final_state: "failed-ambiguous",
        total_iterations: iter,
        reports,
        halt_artifact_path: haltPath,
        halt_reason: reason,
        cost_cap_remaining_usd: costCap.remainingUsd(),
        fix_quality_check,
      };
    }

    // Halt: iter-3 reached with failures → write artifact + return
    if (iter >= MAX_ITERATIONS) {
      // State machine already handled this — but defense in depth
      const haltPath = writeHaltArtifact(
        opts,
        commit_sha,
        ctx,
        report,
        "iter-3"
      );
      return {
        final_state: "failed-ambiguous", // collapse to terminal halt state
        total_iterations: iter,
        reports,
        halt_artifact_path: haltPath,
        halt_reason: "iter-3",
        cost_cap_remaining_usd: costCap.remainingUsd(),
        fix_quality_check,
      };
    }

    // failed-fixable + iter < 3: per default behavior, return control to orchestrator (Claude)
    // who reads the report + spawns gsd-fix-executor with failure context.
    if (!opts.auto_spawn_fix_executor) {
      // ITER-1 WARN-3 amendment: explicit 'paused-for-fix' value (no longer
      // overloaded as 'failed-ambiguous' with absent halt_reason). The CLI
      // (scripts/loop-with-harness.ts) reads final_state directly and exits
      // with code 5 (paused-for-fix); the orchestrator (Claude) spawns gsd-
      // fix-executor and re-invokes runLoop on iter+1.
      return {
        final_state: "paused-for-fix",
        total_iterations: iter,
        reports,
        cost_cap_remaining_usd: costCap.remainingUsd(),
        fix_quality_check,
      };
    }

    // auto_spawn_fix_executor = true: out-of-scope for this phase but stub the path
    // (full implementation in Wave 1.1+ when CI fully-autonomous mode is needed)
    throw new Error(
      "auto_spawn_fix_executor=true is not implemented in stage-1.5c-verification-harness; use default mode (Claude-in-the-loop)"
    );
  }

  // Should be unreachable
  throw new Error(
    "Loop exited without terminal state — state machine invariant violated"
  );
}

function writeHaltArtifact(
  opts: LoopOptions,
  commit_sha: string,
  ctx: LoopContext,
  report: HarnessReport,
  reason: "iter-3" | "ambiguous-vision"
): string {
  const dir = path.resolve(
    opts.repo_root,
    ".planning/verification/runs",
    opts.phase,
    commit_sha
  );
  mkdirSync(dir, { recursive: true });

  const filename =
    reason === "ambiguous-vision"
      ? "HALT-AMBIGUOUS-VISION.md"
      : "HALT-ITER-3.md";
  const filePath = path.join(dir, filename);

  let content = `# HALT — ${reason === "ambiguous-vision" ? "Ambiguous Layer 3 vision result" : "Iter-3 reached"}\n\n`;
  content += `**Phase:** ${opts.phase}\n`;
  content += `**Commit:** \`${commit_sha}\`\n`;
  content += `**Iteration:** ${ctx.iteration} of ${MAX_ITERATIONS}\n`;
  content += `**Loop state:** \`${ctx.state}\`\n`;
  content += `**Halt reason:** \`${reason}\`\n\n`;

  if (reason === "ambiguous-vision") {
    content += `## Ambiguous Layer 3 results (confidence < 0.7 per D-07)\n\n`;
    content += `These vision calls returned a verdict (PASS or FAIL) but with low confidence. Per D-07, ANY confidence < 0.7 halts the loop for Jake review — even on PASS verdicts. Reasoning: the model said "I think yes but I'm not sure" and a human should look.\n\n`;
    for (const a of report.ambiguous_results) {
      content += `### ${a.criterion_id} — verdict ${a.verdict} @ confidence ${a.confidence.toFixed(2)}\n\n`;
      const result = report.results_by_layer.layer3.find(
        (r) => r.criterion_id === a.criterion_id
      );
      if (result) {
        content += `**Reasoning (from vision):** ${result.reasoning ?? "(none)"}\n\n`;
        content += `**Evidence:** ${result.evidence ?? "(none)"}\n\n`;
      }
    }
  } else {
    content += `## Iter-3 reached without resolution\n\n`;
    content += `The harness ran 3 times. Each iteration spawned a fix; the next harness run still failed. This indicates the failure is not mechanically fixable in the current scope. Halt for Jake review.\n\n`;
    const failedResults = [
      ...report.results_by_layer.layer1,
      ...report.results_by_layer.layer2,
      ...report.results_by_layer.layer3,
    ].filter((r) => r.verdict === "FAIL");
    content += `### Failures at iter-3\n\n`;
    for (const r of failedResults) {
      content += `- **${r.criterion_id}** (Layer ${r.layer}) — expected: ${r.expected ?? "—"} / actual: ${r.actual ?? "—"} / evidence: ${r.evidence ?? "—"}\n`;
    }
  }

  content += `\n## What Jake should do\n\n`;
  content += `1. Read the failure context above + the per-iteration report at \`.planning/verification/runs/${opts.phase}/${commit_sha}/report.md\`.\n`;
  content += `2. Decide: is this a real failure (manual fix or scope adjustment) OR a false-positive (criterion phrasing too vague — fix the criterion, not the code)?\n`;
  content += `3. Resume the phase via \`/nx\` after the resolution.\n`;

  writeFileSync(filePath, content, "utf-8");

  // ITER-1 W3 enterprise-readiness amendment: HALT artifact retention.
  // Copy the HALT artifact to .planning/verification/reports/<phase>/halts/<commit>-<reason>.md
  // (git-tracked) for SOC2 traceability. The runs/ copy is gitignored;
  // the reports/halts/ copy persists across phases. Per iter-1 plan-review
  // W3: HALT artifacts must be auditable post-hoc.
  const retentionDir = path.resolve(
    opts.repo_root,
    ".planning/verification/reports",
    opts.phase,
    "halts"
  );
  mkdirSync(retentionDir, { recursive: true });
  const retentionPath = path.join(
    retentionDir,
    `${commit_sha.slice(0, 8)}-${reason}.md`
  );
  copyFileSync(filePath, retentionPath);

  return filePath;
}

// ITER-1 MEDIUM-3 amendment: fix-quality gate helper. Runs `npm run build`
// + `npx tsc --noEmit` against the new HEAD. If either fails, halt-for-Jake
// (don't waste a full harness run when Layer 1 is already broken).
async function runFixQualityGate(
  repo_root: string
): Promise<{ passed: boolean; reason?: string }> {
  // npm run build
  const buildResult = await new Promise<{ code: number; output: string }>(
    (resolve) => {
      const child = spawn("npm", ["run", "build"], {
        cwd: repo_root,
        shell: process.platform === "win32",
      });
      let output = "";
      child.stdout?.on("data", (d: Buffer) => (output += d.toString()));
      child.stderr?.on("data", (d: Buffer) => (output += d.toString()));
      child.on("close", (code) => resolve({ code: code ?? -1, output }));
    }
  );
  if (buildResult.code !== 0) {
    return {
      passed: false,
      reason: `npm run build failed: ${buildResult.output.slice(-500)}`,
    };
  }
  // npx tsc --noEmit
  const tscResult = await new Promise<{ code: number; output: string }>(
    (resolve) => {
      const child = spawn("npx", ["tsc", "--noEmit"], {
        cwd: repo_root,
        shell: process.platform === "win32",
      });
      let output = "";
      child.stdout?.on("data", (d: Buffer) => (output += d.toString()));
      child.stderr?.on("data", (d: Buffer) => (output += d.toString()));
      child.on("close", (code) => resolve({ code: code ?? -1, output }));
    }
  );
  if (tscResult.code !== 0) {
    return {
      passed: false,
      reason: `tsc --noEmit failed: ${tscResult.output.slice(-500)}`,
    };
  }
  return { passed: true };
}

// ITER-1 MEDIUM-3: halt artifact specifically for fix-quality failure.
// Different from the iter-3 / ambiguous-vision halt artifacts because the
// failure is NOT in the criteria — it's in the fix-executor's commit itself.
function writeFixQualityHaltArtifact(
  opts: LoopOptions,
  commit_sha: string,
  ctx: LoopContext,
  fixCheck: { passed: boolean; reason?: string }
): string {
  const dir = path.resolve(
    opts.repo_root,
    ".planning/verification/runs",
    opts.phase,
    commit_sha
  );
  mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, "HALT-FIX-QUALITY-FAILURE.md");
  let content = `# HALT — Fix-quality gate failed (per iter-1 MEDIUM-3)\n\n`;
  content += `**Phase:** ${opts.phase}\n`;
  content += `**Commit:** \`${commit_sha}\`\n`;
  content += `**Iteration:** ${ctx.iteration} of ${MAX_ITERATIONS}\n`;
  content += `**Fix-quality reason:** ${fixCheck.reason ?? "(unknown)"}\n\n`;
  content += `## What this means\n\n`;
  content += `The gsd-fix-executor agent committed a change to address the previous iteration's failures. Before re-running the full harness, runLoop ran a fix-quality gate (\`npm run build\` + \`npx tsc --noEmit\`). The gate FAILED — the fix-executor's commit broke Layer 1 mechanics.\n\n`;
  content += `Re-running the harness would surface FAIL on Layer 1 trivially, wasting time + cost cap. Better to halt-for-Jake here.\n\n`;
  content += `## What Jake should do\n\n`;
  content += `1. Read the fix-executor's commit message + diff. Determine if the fix is salvageable or needs revert.\n`;
  content += `2. If salvageable: fix the build/typecheck error manually (don't re-spawn fix-executor on the broken state).\n`;
  content += `3. Resume via \`/nx ${opts.phase}\` after the resolution.\n`;
  writeFileSync(filePath, content, "utf-8");

  // ITER-1 W3 enterprise-readiness amendment: HALT artifact retention.
  // Copy the HALT artifact to .planning/verification/reports/<phase>/halts/<commit>-fix-quality-failure.md
  // (git-tracked) for SOC2 traceability.
  const retentionDir = path.resolve(
    opts.repo_root,
    ".planning/verification/reports",
    opts.phase,
    "halts"
  );
  mkdirSync(retentionDir, { recursive: true });
  const retentionPath = path.join(
    retentionDir,
    `${commit_sha.slice(0, 8)}-fix-quality-failure.md`
  );
  copyFileSync(filePath, retentionPath);

  return filePath;
}

async function getCurrentCommitSha(repo_root: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["rev-parse", "HEAD"], { cwd: repo_root });
    let out = "";
    child.stdout?.on("data", (d: Buffer) => (out += d.toString()));
    child.on("close", (code) =>
      code === 0
        ? resolve(out.trim())
        : reject(new Error(`git rev-parse exit ${code}`))
    );
  });
}
