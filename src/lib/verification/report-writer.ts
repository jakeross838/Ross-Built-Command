// Report writer.
//
// Per D-15: final phase report git-tracked at
//   .planning/verification/reports/<phase>/final.md
// Per D-16: per-commit reports gitignored at
//   .planning/verification/runs/<phase>/<commit>/report.md
// Both formats are markdown; both overwrite on each run.
//
// In addition, JSON of the report is written to stdout when writing the
// per-commit report — CI (Plan 6) parses for PR comment + commit status.
//
// ITER-1 C5 + D-30 amendment + Jake watchpoint #1 evidence: writeReport
// (the git-tracked final.md) SANITIZES evidence — strips page URLs,
// screenshot paths, raw vision reasoning. Only criterion_id + verdict +
// confidence + truncated evidence (after sanitation) remain. The per-commit
// report (writePerCommitReport) keeps full evidence because it's gitignored.
//
// Per D-30: this module is tenant-blind in shape (operates on opaque
// HarnessReport data; no tenant lookups). Tenant scoping happens upstream
// (auth-strategy.ts ensures the report data only describes fixture-org
// activity). The sanitization here is defense-in-depth: even if a tenant
// boundary is breached upstream, raw page URLs and screenshot paths
// containing tenant identifiers won't land in git history.
//
// Calibration-log custodian integration (Jake watchpoint #7): the JSON
// emitted to stdout (`{kind: "harness-report", report}`) is the contract
// nightwork-custodian post-ship sweep picks up to populate per-phase
// calibration-log.md entries (Plan 9). Schema is HarnessReport (frozen by
// orchestrator.ts).

import { writeFileSync, mkdirSync } from "node:fs";
import * as path from "node:path";
import type { HarnessReport } from "./orchestrator";
import type { VerificationResult } from "./types";

/**
 * Write the gitignored per-commit report at:
 *   <repo_root>/.planning/verification/runs/<phase>/<commit>/report.md
 *
 * Full evidence retained (page URLs, screenshot paths, raw vision reasoning).
 * This file is gitignored (per D-16) so retention here is safe.
 *
 * Also emits a JSON line to stdout for CI consumption — Plan 6 GitHub Actions
 * parses to populate PR comment + commit status.
 */
export function writePerCommitReport(
  report: HarnessReport,
  repo_root: string
): void {
  const dir = path.resolve(
    repo_root,
    ".planning/verification/runs",
    report.phase,
    report.commit_sha
  );
  mkdirSync(dir, { recursive: true });
  const md = renderMarkdown(report, "per-commit");
  writeFileSync(path.join(dir, "report.md"), md, "utf-8");
  // JSON to stdout for CI consumption + nightwork-custodian post-ship sweep.
  process.stdout.write(
    JSON.stringify({ kind: "harness-report", report }, null, 2) + "\n"
  );
}

/**
 * Write the git-tracked final phase report at:
 *   <repo_root>/.planning/verification/reports/<phase>/final.md
 *
 * Per ITER-1 C5 + D-30: SANITIZED — page URLs, screenshot paths, raw vision
 * reasoning are stripped. Only criterion_id + verdict + confidence + truncated
 * evidence remain.
 *
 * Per D-15: overwrites on each run; the final.md represents the LATEST
 * harness state on this phase, not a historical log.
 */
export function writeReport(report: HarnessReport, repo_root: string): void {
  const dir = path.resolve(
    repo_root,
    ".planning/verification/reports",
    report.phase
  );
  mkdirSync(dir, { recursive: true });
  const md = renderMarkdown(report, "final");
  writeFileSync(path.join(dir, "final.md"), md, "utf-8");
}

/**
 * Sanitize evidence text for the git-tracked final.md per ITER-1 C5.
 *
 * Strips:
 *   - `pageUrl=https://...` markers
 *   - `screenshot=/path/to/file.png` markers
 *   - Anything that looks like a vision-reasoning verbatim quote (long prose;
 *     we conservatively drop strings >120 chars containing English-prose-ish
 *     constructs)
 *
 * The sanitized output is `[layer N evidence — see runs/<commit>/report.md
 * for details]` with verdict + confidence + criterion_id intact. Operators
 * who need the full evidence consult the gitignored per-commit report.
 */
function sanitizeEvidenceForFinal(
  result: VerificationResult,
  layer: number
): string {
  const evidence = result.evidence ?? result.error ?? "";
  if (!evidence) return "—";
  // Strip pageUrl= markers
  let sanitized = evidence.replace(/pageUrl=https?:\/\/[^\s|]+/g, "");
  // Strip screenshot= markers
  sanitized = sanitized.replace(/screenshot=[^\s|]+/g, "");
  // Strip absolute file paths that contain the FIXTURE_ORG_ID slug or look
  // like screenshot dump paths
  sanitized = sanitized.replace(
    /[A-Z]:[\\/][^\s|]+\.(png|jpg|jpeg|webp)/gi,
    ""
  );
  sanitized = sanitized.replace(/\/[^\s|]*\/screenshots\/[^\s|]+/g, "");
  // Strip unix-style absolute paths to runs/ tree
  sanitized = sanitized.replace(/[A-Z]?[\\/][^\s|]*runs[\\/][^\s|]+/gi, "");
  // Trim
  sanitized = sanitized.trim().replace(/\|/g, "\\|");
  if (!sanitized) {
    return `[layer ${layer} — see runs/<commit>/report.md]`;
  }
  // Truncate to a short snippet — full evidence remains in per-commit report
  const TRUNCATE_AT = 80;
  if (sanitized.length > TRUNCATE_AT) {
    sanitized = sanitized.slice(0, TRUNCATE_AT) + "…";
  }
  return sanitized;
}

/**
 * Format full evidence for the per-commit (gitignored) report. Keeps page
 * URLs + screenshot paths + reasoning intact — operators need the full
 * trace for debugging and the file is not committed.
 */
function fullEvidenceForPerCommit(result: VerificationResult): string {
  const parts: string[] = [];
  if (result.evidence) parts.push(result.evidence);
  if (result.reasoning) parts.push(`reasoning: ${result.reasoning}`);
  if (result.error) parts.push(`error: ${result.error}`);
  if (result.expected) parts.push(`expected: ${result.expected}`);
  if (result.actual) parts.push(`actual: ${result.actual}`);
  return parts.join(" | ").replace(/\|/g, "\\|").slice(0, 300);
}

function renderMarkdown(
  report: HarnessReport,
  kind: "per-commit" | "final"
): string {
  const allResults = [
    ...report.results_by_layer.layer1,
    ...report.results_by_layer.layer2,
    ...report.results_by_layer.layer3,
  ];
  const passes = allResults.filter((r) => r.verdict === "PASS").length;
  const fails = allResults.filter((r) => r.verdict === "FAIL").length;
  const skips = allResults.filter((r) => r.verdict === "SKIP").length;

  let md = "";
  md += `# Verification report — ${report.phase}\n\n`;
  md +=
    kind === "per-commit"
      ? `**Commit:** \`${report.commit_sha}\`\n`
      : `**Latest commit:** \`${report.commit_sha}\`\n`;

  // ITER-1 C5: sanitize the preview URL line for the final.md (it can leak
  // tenant identifiers via the deterministic-pattern URL or PR-comment
  // surface). Per-commit keeps the full URL.
  if (kind === "per-commit") {
    md += `**Preview URL:** ${report.preview_url} (${report.preview_url_source})\n`;
  } else {
    md += `**Preview URL source:** ${report.preview_url_source}\n`;
  }

  md += `**Started:** ${report.started_at}\n`;
  md += `**Finished:** ${report.finished_at}\n`;
  md += `**Duration:** ${(report.duration_ms / 1000).toFixed(1)}s\n`;
  md += `**Vision cost:** $${report.total_vision_cost_usd.toFixed(4)}\n\n`;
  md += `## Summary\n\n`;
  md += `- **PASS:** ${passes}\n- **FAIL:** ${fails}\n- **SKIP:** ${skips}\n\n`;

  if (report.ambiguous_results.length > 0) {
    md += `## Ambiguous Layer 3 results (confidence < 0.7 per D-07 — halt-for-Jake trigger)\n\n`;
    for (const a of report.ambiguous_results) {
      md += `- ${a.criterion_id} — verdict ${a.verdict} @ confidence ${a.confidence.toFixed(2)}\n`;
    }
    md += "\n";
  }

  for (const layer of [1, 2, 3] as const) {
    const layerKey = `layer${layer}` as const;
    const results = report.results_by_layer[layerKey];
    md += `## Layer ${layer}\n\n`;
    if (results.length === 0) {
      md += `_no criteria_\n\n`;
      continue;
    }
    md += `| Criterion | Verdict | Conf. | Cost | Evidence |\n`;
    md += `|---|---|---|---|---|\n`;
    for (const r of results) {
      const conf = r.confidence !== undefined ? r.confidence.toFixed(2) : "—";
      const cost =
        r.vision_cost_usd !== undefined
          ? `$${r.vision_cost_usd.toFixed(4)}`
          : "—";
      const evidence =
        kind === "final"
          ? sanitizeEvidenceForFinal(r, layer)
          : fullEvidenceForPerCommit(r);
      md += `| ${r.criterion_id} | ${r.verdict} | ${conf} | ${cost} | ${evidence} |\n`;
    }
    md += "\n";
  }

  if (kind === "final") {
    md += `\n---\n\n`;
    md += `_Sanitization note (per D-30 + ITER-1 C5): evidence column strips page URLs, screenshot paths, and raw vision reasoning. Full evidence is in \`.planning/verification/runs/${report.phase}/${report.commit_sha}/report.md\` (gitignored)._\n`;
  }

  return md;
}
