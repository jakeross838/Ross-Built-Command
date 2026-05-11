// Verification orchestrator — composes 3 layers + emits HarnessReport.
//
// Per D-05: harness loop runs INSIDE /gsd-execute-phase. The orchestrator
// runs ONCE per harness invocation; the LOOP (max 3 iter) is owned by
// Plan 8b runLoop and wraps the orchestrator.
//
// Per EXPANDED-SCOPE §7 acceptance criterion: harness completes < 5 min
// for a single-route phase.
//
// ITER-1 ARCH-CRIT-1 amendment + Jake watchpoint #1+#5: runHarness REMOVED
// state-machine driving — layer composition + reporting only. The state
// machine lives ONLY in Plan 8b runLoop. HarnessReport carries
// `results_by_layer` + `ambiguous_results`; Plan 8b reads these fields,
// applies its own state machine (initialState/transition/MAX_ITERATIONS
// from state-machine.ts), and emits HALT artifacts.
//
// Imports of initialState/transition/LoopContext/LoopState from
// state-machine.ts are FORBIDDEN here. Verified by:
//   grep -nE "initialState|transition|LoopContext|LoopState" \
//     src/lib/verification/orchestrator.ts
// returns 0.
//
// ITER-1 C1 + D-30 amendment: orchestrator authenticates as harness-fixture
// session BEFORE any layer runs (auth-strategy.ts). Threads harnessSession.org_id
// (FIXTURE_ORG_ID slug) into all three Layer*Context constructions.
//
// ITER-1 W1 enterprise-readiness amendment: top-level try/catch wraps the
// run body; on error, dynamically imports @sentry/nextjs (the SDK actually
// present in package.json) + captureException with tags
// {phase, commit_sha, preview_url_source} and extra
// {error_redacted: redactApiKey(message)}.
//
// ITER-1 WARNING-1 compliance amendment: redactApiKey strips sk-ant-* and
// Bearer * patterns from any string before it can reach stderr / Sentry /
// committed report files. Pattern is in lockstep with layer3/vision-client.ts
// redactApiKey (Plan 4) — the orchestrator imports the exported helper to
// stay consistent with the canonical regex.
//
// Per D-30: this module is tenant-blind in shape (operates on opaque org_id
// strings). The fixture-org binding happens at auth-strategy.ts; once a
// session is resolved, the orchestrator threads the resulting org_id through
// without distinguishing "fixture" vs "real tenant". When Wave 1.1+ enables
// per-tenant verification, only auth-strategy.ts changes; this module stays.

import { runLayer1 } from "./layer1";
import { runLayer2 } from "./layer2";
import { runLayer3 } from "./layer3";
import { discoverPreviewUrl } from "./vercel-discovery";
import { loadCriteriaFromPhase } from "./criteria-loader";
import { writePerCommitReport, writeReport } from "./report-writer";
import { createHarnessSession } from "./auth-strategy";
import { redactApiKey } from "./layer3/vision-client";
import type {
  VerificationResult,
  Layer1Context,
  Layer2Context,
  Layer3Context,
} from "./types";

export interface HarnessOptions {
  mode: "ci" | "local";
  preview_url?: string;
  base_url?: string; // for --mode local
  phase: string;
  commit_sha: string;
  cost_cap_usd?: number;
  skip_layers?: Array<1 | 2 | 3>;
  routes?: string[];
  repo_root: string;
  branch?: string;
}

/**
 * HarnessReport — Plan 5 emits this; Plan 8b runLoop consumes it.
 *
 * Per ITER-1 ARCH-CRIT-1 + Jake watchpoint #1+#5: this report has NO
 * `loop_state` or `halt_reason` fields. Loop state is owned by Plan 8b
 * runLoop entirely. runLoop reads `results_by_layer` + `ambiguous_results`
 * and applies the state machine itself.
 *
 * Calibration-log custodian integration (Jake watchpoint #7): Plan 9
 * (calibration-log scaffolding) reads HarnessReport.duration_ms,
 * total_vision_cost_usd, results_by_layer counts to populate per-phase
 * calibration entries at post-ship. The schema below is the contract;
 * report-writer.ts emits a JSON line `{kind: "harness-report", report}`
 * to stdout that the custodian post-ship sweep can pick up.
 */
export interface HarnessReport {
  phase: string;
  commit_sha: string;
  preview_url: string;
  preview_url_source: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  results_by_layer: {
    layer1: VerificationResult[];
    layer2: VerificationResult[];
    layer3: VerificationResult[];
  };
  total_vision_cost_usd: number;
  ambiguous_results: Array<{
    criterion_id: string;
    confidence: number;
    verdict: string;
  }>;
}

export async function runHarness(opts: HarnessOptions): Promise<HarnessReport> {
  const startedAt = new Date();
  const startMs = Date.now();

  let preview_url = "";
  let preview_url_source = "";

  try {
    // Resolve preview URL
    if (opts.mode === "local") {
      preview_url = opts.base_url ?? "http://localhost:3000";
      preview_url_source = "local-mode";
      // Per D-04: explicit log indicating discouraged path
      process.stderr.write(
        `[verify-phase] mode=local — using ${preview_url} (per D-04: documented but discouraged; CI signal is the canonical Vercel preview path).\n`
      );
    } else {
      const branch = opts.branch ?? (await getCurrentBranch(opts.repo_root));
      const discovery = await discoverPreviewUrl({
        branch,
        explicit_url: opts.preview_url,
        repo_root: opts.repo_root,
      });
      preview_url = discovery.url;
      preview_url_source = discovery.source;
    }

    // ITER-1 C1 + D-30: create fixture-org session BEFORE any layer runs.
    // Per migration 00092 + auth-strategy.ts, harness-fixture@nightwork.local
    // is a member of FIXTURE_ORG_UUID; this session's org_id claim resolves
    // only to fixture data. Layers 1/2/3 use this session for fetches that
    // require auth. The org_id slug is what every Layer*Context.org_id
    // carries (consistent with idempotency cache + screenshot paths +
    // Sentry tags from Plans 2/3/4).
    const harnessSession = await createHarnessSession(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
    );

    // Load PLAN-file criteria for the phase. ITER-1 SEC-HIGH-2 sanitization
    // is enforced inside loadCriteriaFromPhase; rejected criteria are logged
    // to stderr + skipped (NOT silently dropped).
    const criteria = await loadCriteriaFromPhase({
      phase: opts.phase,
      repo_root: opts.repo_root,
    });

    const results_by_layer = {
      layer1: [] as VerificationResult[],
      layer2: [] as VerificationResult[],
      layer3: [] as VerificationResult[],
    };

    // Layer 1 — runs unless skipped
    if (!opts.skip_layers?.includes(1)) {
      const l1ctx: Layer1Context = {
        preview_url,
        commit_sha: opts.commit_sha,
        phase: opts.phase,
        org_id: harnessSession.org_id, // ITER-1 C4 + D-30
        routes_to_check: opts.routes ?? [],
        dom_criteria: criteria.filter((c) => c.category === "dom"),
        repo_root: opts.repo_root,
        harness_session: harnessSession, // nwrp67 FIX 8 — Playwright cookie auth
      };
      results_by_layer.layer1 = await runLayer1(l1ctx);
    }

    // ITER-1 ARCH-CRIT-1: NO state-machine driving here. We DO short-circuit
    // on Layer 1 FAIL for cost-saving (skip Layer 3 vision tokens), but the
    // determination is a simple result check, not a state-machine transition.
    // Plan 8b runLoop reads results_by_layer and drives its own state machine.
    const layer1HasFail = results_by_layer.layer1.some(
      (r) => r.verdict === "FAIL"
    );

    if (!layer1HasFail && !opts.skip_layers?.includes(2)) {
      const l2ctx: Layer2Context = {
        preview_url,
        commit_sha: opts.commit_sha,
        phase: opts.phase,
        org_id: harnessSession.org_id, // ITER-1 C4 + D-30
        repo_root: opts.repo_root,
      };
      results_by_layer.layer2 = await runLayer2(l2ctx);
    }

    const layer2HasFailBlocking = results_by_layer.layer2.some(
      (r) => r.verdict === "FAIL"
    );

    if (
      !layer1HasFail &&
      !layer2HasFailBlocking &&
      !opts.skip_layers?.includes(3)
    ) {
      const l3ctx: Layer3Context = {
        preview_url,
        commit_sha: opts.commit_sha,
        phase: opts.phase,
        org_id: harnessSession.org_id, // ITER-1 C4 + D-30
        criteria: criteria.filter(
          (c) => c.category === "visual" || c.category === "semantic"
        ),
        cost_cap_usd: opts.cost_cap_usd,
        // ITER-1 C4: cost_cap_remaining_usd is threaded by Plan 8b runLoop
        // when present. When called outside runLoop (e.g., direct
        // scripts/verify-phase.ts invocation), absent → CostCap defaults
        // to ctx.cost_cap_usd ?? $1.
        cost_cap_remaining_usd: undefined,
        repo_root: opts.repo_root,
        harness_session: harnessSession, // nwrp67 FIX 8 — Playwright cookie auth
      };
      results_by_layer.layer3 = await runLayer3(l3ctx);
    }

    const finishedAt = new Date();
    const duration_ms = Date.now() - startMs;

    const total_vision_cost_usd = results_by_layer.layer3.reduce(
      (acc, r) => acc + (r.vision_cost_usd ?? 0),
      0
    );

    // Per D-07: ambiguous = any confidence < 0.7, regardless of verdict.
    // Plan 8b runLoop reads this list to drive the state machine
    // failed-ambiguous transition. Plan 5 only emits the data; it does NOT
    // act on it.
    const ambiguous_results = results_by_layer.layer3
      .filter((r) => r.confidence !== undefined && r.confidence < 0.7)
      .map((r) => ({
        criterion_id: r.criterion_id,
        confidence: r.confidence ?? 0,
        verdict: r.verdict,
      }));

    const report: HarnessReport = {
      phase: opts.phase,
      commit_sha: opts.commit_sha,
      preview_url,
      preview_url_source,
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms,
      results_by_layer,
      total_vision_cost_usd,
      ambiguous_results,
    };

    // Write per-commit (gitignored) report — full evidence retained.
    writePerCommitReport(report, opts.repo_root);

    // Update final phase report (git-tracked) — sanitized per ITER-1 C5.
    // page URLs, screenshot paths, raw vision reasoning are stripped;
    // only criterion_id + verdict + confidence + truncated evidence remain.
    writeReport(report, opts.repo_root);

    return report;
  } catch (err) {
    // ITER-1 W1 enterprise-readiness: Sentry capture with redacted error message.
    // Dynamic import keeps the harness runnable in test environments where
    // @sentry/nextjs is absent. Pattern matches Plan 4 layer3/runner.ts.
    try {
      const sentry = (await import("@sentry/nextjs").catch(
        () => null
      )) as typeof import("@sentry/nextjs") | null;
      if (sentry?.captureException) {
        const errMsg = err instanceof Error ? err.message : String(err);
        sentry.captureException(err, {
          tags: {
            layer: "orchestrator",
            phase: opts.phase,
            commit_sha: opts.commit_sha,
            preview_url_source: preview_url_source || "unknown",
          },
          extra: {
            error_redacted: redactApiKey(errMsg),
          },
        });
      }
    } catch {
      // Sentry import failed; nothing to do (harness run is the primary signal,
      // observability is best-effort).
    }
    // Re-throw with redacted message so stderr / orchestrator pause prompt
    // don't leak keys (per ITER-1 WARNING-1 compliance).
    if (err instanceof Error) {
      err.message = redactApiKey(err.message);
    }
    throw err;
  }
}

/**
 * Resolve the current git branch from the repo root. Used when the caller
 * doesn't explicitly pass --branch (typical local dev flow).
 *
 * Per D-23: never `kill -9`. The git subprocess runs to completion (always
 * fast — `git rev-parse` is a metadata-only op).
 */
async function getCurrentBranch(repo_root: string): Promise<string> {
  const { spawn } = await import("node:child_process");
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: repo_root,
    });
    let out = "";
    child.stdout?.on("data", (d) => (out += d.toString()));
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`git rev-parse exit ${code}`));
      resolve(out.trim());
    });
  });
}
