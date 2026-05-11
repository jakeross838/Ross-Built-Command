// Layer 2 — standards rules loader.
//
// Reads .planning/verification/standards/<domain>/*.json files; validates each
// against _schema.json (lightweight runtime validation — required fields,
// enum bounds, string formats); returns array of valid StandardsRule.
//
// Invalid rules: logged to stderr, NOT thrown. Plan 5 orchestrator can
// optionally fail-loudly via env flag, but default is fail-soft (one bad
// rule shouldn't block the whole layer).
//
// Per D-02 forward-extensibility: this loader works for ANY rule matching
// the schema. Adding a domain or rule = drop a JSON file. Loader does not
// enumerate domains hardcoded — it scans `<standards-dir>/*/*.json`.
//
// Per D-23 / .planning/lessons.md: this module reads from disk only; no
// child processes spawned, no force-kills possible.

import { readdirSync, readFileSync, statSync } from "node:fs";
import * as path from "node:path";
import type { StandardsRule, StandardsDomain } from "../types";

const VALID_DOMAINS: StandardsDomain[] = [
  "aia",
  "accounting",
  "lien-law",
  "dates",
  "conservation",
];
const VALID_SEVERITIES = ["blocking", "warning"] as const;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a parsed JSON object against the StandardsRule shape from
 * .planning/verification/standards/_schema.json. Returns errors as
 * human-readable strings; never throws.
 *
 * Mirrors _schema.json's required[] + enum[] + pattern[] constraints. If
 * the JSON Schema lockdown changes, mirror the change here AND in
 * _schema.json (Plan-review watchpoint #1 — schema lockdown).
 */
export function validateRule(rule: unknown): ValidationResult {
  const errors: string[] = [];
  if (!rule || typeof rule !== "object") {
    return { valid: false, errors: ["rule is not an object"] };
  }
  const r = rule as Record<string, unknown>;

  // Required fields
  for (const field of [
    "$schema",
    "id",
    "domain",
    "title",
    "description",
    "verifyFn",
    "applies_to",
    "severity",
    "source",
    "tags",
  ]) {
    if (!(field in r)) errors.push(`missing required field: ${field}`);
  }
  if (errors.length > 0) return { valid: false, errors };

  // Field shapes
  if (typeof r.id !== "string") errors.push("id must be string");
  if (typeof r.id === "string" && !/^[a-z]+(-[a-z0-9]+)+$/.test(r.id)) {
    errors.push(
      `id pattern violation: ${r.id} (expected ^[a-z]+(-[a-z0-9]+)+$)`
    );
  }
  if (
    typeof r.domain !== "string" ||
    !VALID_DOMAINS.includes(r.domain as StandardsDomain)
  ) {
    errors.push(
      `domain must be one of: ${VALID_DOMAINS.join(", ")} (got: ${r.domain})`
    );
  }
  if (typeof r.title !== "string") errors.push("title must be string");
  if (typeof r.description !== "string") errors.push("description must be string");
  if (typeof r.verifyFn !== "string") errors.push("verifyFn must be string");
  if (typeof r.verifyFn === "string" && !/^[a-z][a-zA-Z0-9]+$/.test(r.verifyFn)) {
    errors.push(
      `verifyFn pattern violation: ${r.verifyFn} (expected camelCase)`
    );
  }
  if (!Array.isArray(r.applies_to) || r.applies_to.length === 0) {
    errors.push("applies_to must be non-empty array");
  }
  if (
    typeof r.severity !== "string" ||
    !VALID_SEVERITIES.includes(r.severity as never)
  ) {
    errors.push(
      `severity must be one of: ${VALID_SEVERITIES.join(", ")} (got: ${r.severity})`
    );
  }
  if (!Array.isArray(r.source) || r.source.length === 0) {
    errors.push("source must be non-empty array");
  }
  if (!Array.isArray(r.tags)) errors.push("tags must be array");

  return { valid: errors.length === 0, errors };
}

/**
 * Load all rules from .planning/verification/standards/<domain>/*.json
 * (recursively scans domain subdirs). Validates each. Returns valid rules.
 * Logs invalid rules + errors to stderr.
 *
 * Forward-extensibility (D-02): adding a domain dir or a rule JSON file
 * requires NO change to this loader.
 */
export function loadStandardsRules(repo_root: string): StandardsRule[] {
  const standardsDir = path.resolve(
    repo_root,
    ".planning/verification/standards"
  );
  const rules: StandardsRule[] = [];

  let entries: string[];
  try {
    entries = readdirSync(standardsDir);
  } catch {
    // Standards dir doesn't exist (shouldn't happen post-Plan-1); fail-soft
    process.stderr.write(
      `[layer2/loader] standards dir not found: ${standardsDir}\n`
    );
    return rules;
  }

  for (const entry of entries) {
    // Skip hidden / underscored entries (e.g. _schema.json, .gitkeep, .DS_Store)
    if (entry.startsWith(".") || entry.startsWith("_")) continue;
    const domainDir = path.join(standardsDir, entry);
    let isDir = false;
    try {
      isDir = statSync(domainDir).isDirectory();
    } catch {
      continue;
    }
    if (!isDir) continue;

    let files: string[] = [];
    try {
      files = readdirSync(domainDir);
    } catch {
      continue;
    }

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const filePath = path.join(domainDir, file);
      let parsed: unknown;
      try {
        parsed = JSON.parse(readFileSync(filePath, "utf-8"));
      } catch (err) {
        process.stderr.write(
          `[layer2/loader] failed to parse ${filePath}: ${err instanceof Error ? err.message : String(err)}\n`
        );
        continue;
      }

      const validation = validateRule(parsed);
      if (!validation.valid) {
        process.stderr.write(
          `[layer2/loader] invalid rule at ${filePath}: ${validation.errors.join("; ")}\n`
        );
        continue;
      }
      rules.push(parsed as StandardsRule);
    }
  }

  return rules;
}
