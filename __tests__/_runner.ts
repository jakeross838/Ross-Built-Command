/**
 * Discovers and runs every `*.test.ts` under `__tests__/` (recursive) as an
 * isolated subprocess. A test file that exits non-zero does not halt sibling
 * test files — the runner collects the exit codes and returns its own
 * non-zero exit code if any test file failed.
 *
 * Recursion added per ai-logic-tester F-H finding (nwrp171/nwrp172 GATE 2
 * disposition): previously the runner globbed only top-level `*.test.ts`,
 * leaving `__tests__/validators/*.test.ts` (23 cases from B-1b) dark to CI.
 * Recursion eliminates the silent CI drift risk for F2-F5 35+ validators.
 *
 * Invoked via `npm test`.
 */
import { readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, relative, resolve } from "node:path";

const dir = resolve("__tests__");

function findTests(d: string): string[] {
  return readdirSync(d).flatMap((entry) => {
    const full = join(d, entry);
    if (statSync(full).isDirectory()) {
      return findTests(full);
    }
    return entry.endsWith(".test.ts") ? [full] : [];
  });
}

const files = findTests(dir).sort();

if (files.length === 0) {
  console.error("no test files found under __tests__/");
  process.exit(1);
}

let anyFailed = false;
for (const f of files) {
  const display = relative(dir, f);
  console.log(`\n── ${display} ───────────────────────────────`);
  const result = spawnSync("npx", ["tsx", f], {
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    anyFailed = true;
  }
}

console.log("");
if (anyFailed) {
  console.error("one or more test files failed");
  process.exit(1);
}
console.log("all test files passed");
