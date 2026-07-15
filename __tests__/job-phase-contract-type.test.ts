/**
 * Phase 2.1 regression fence — R.15.
 *
 * Migration 00064 adds `phase TEXT` (9 values) to `jobs` and expands
 * `jobs.contract_type` from a two-value legacy CHECK (`'cost_plus'`,
 * `'fixed'`) to a six-value set (`'cost_plus_aia'`, `'cost_plus_open_book'`,
 * `'fixed_price'`, `'gmp'`, `'time_and_materials'`, `'unit_price'`). Legacy
 * data migrates `cost_plus → cost_plus_aia` and `fixed → fixed_price`.
 *
 * Downstream the API validator in `src/app/api/jobs/route.ts` must accept
 * every new `contract_type` value + reject the old two-value exclusive
 * allow-list, and every `phase` value; the onboard wizard default must
 * switch from `"cost_plus"` to `"cost_plus_aia"`; TS types in the jobs
 * pages must widen to the new unions.
 *
 * This test locks those behaviors in place. UI display-label expansion
 * is deferred to Branch 4 (GH issue #4) — not asserted here.
 *
 * UPDATE 2026-07-14 (NEW-2 doc-gen pass): the two UI assertions were relocated
 * to current deliberate policy. Per 3.4 (ONE NEW-JOB) /jobs/new is now a
 * redirect to the New-Job modal; per 2.4 contract_type (payment model) and
 * billing_method (draw doc) are two SEPARATE fields, and OnboardWizard.tsx is
 * gone (contract_type is per-job, not org-onboarding). The new-job form +
 * default now live in NewJobSlideOver.tsx, whose quick-create contract_type
 * control curates to the 3 common custom-home types (Pattern 4) — the DB/API/
 * Job-type still support all 6, asserted below/above and unchanged.
 */
import { readFileSync, existsSync } from "node:fs";
import { strict as assert } from "node:assert";

type Case = { name: string; fn: () => void };
const cases: Case[] = [];
const test = (name: string, fn: () => void) => cases.push({ name, fn });

const MIGRATION = "supabase/migrations/00064_job_phase_contract_type.sql";
const MIGRATION_DOWN = "supabase/migrations/00064_job_phase_contract_type.down.sql";
const JOBS_API = "src/app/api/jobs/route.ts";
const JOBS_NEW_PAGE = "src/app/jobs/new/page.tsx";
const JOBS_ID_PAGE = "src/app/jobs/[id]/page.tsx";
// 2.4 + 3.4: /jobs/new is now a redirect and OnboardWizard.tsx is gone — the
// new-job form (contract_type + the 2.4 billing_method split) is the modal.
const NEW_JOB_MODAL = "src/components/new-job/NewJobModal.tsx";
// Quick-create curates to the 3 common custom-home contract types (Pattern 4);
// gmp / time_and_materials / unit_price are DB/API-valid and set later on the job.
const QUICK_CREATE_CONTRACT_TYPES = ["cost_plus_aia", "cost_plus_open_book", "fixed_price"];

const PHASE_VALUES = [
  "lead",
  "estimating",
  "contracted",
  "pre_construction",
  "in_progress",
  "substantially_complete",
  "closed",
  "warranty",
  "archived",
];
const CONTRACT_TYPE_VALUES = [
  "cost_plus_aia",
  "cost_plus_open_book",
  "fixed_price",
  "gmp",
  "time_and_materials",
  "unit_price",
];

// ── migration 00064 ──────────────────────────────────────────────────

test("migration 00064 exists", () => {
  assert.ok(existsSync(MIGRATION), `${MIGRATION} missing`);
});

test("migration 00064 adds jobs.phase with all 9 CHECK values", () => {
  const src = readFileSync(MIGRATION, "utf8");
  assert.ok(
    /ADD\s+COLUMN\s+phase\s+TEXT/i.test(src),
    "migration must ADD COLUMN phase TEXT on jobs"
  );
  for (const v of PHASE_VALUES) {
    assert.ok(
      src.includes(`'${v}'`),
      `migration must reference phase value '${v}' inside the CHECK constraint`
    );
  }
});

test("migration 00064 installs the new 6-value contract_type CHECK", () => {
  const src = readFileSync(MIGRATION, "utf8");
  assert.ok(
    /ADD\s+CONSTRAINT\s+jobs_contract_type_check\s+CHECK\s*\(\s*contract_type\s+IN\s*\(/i.test(src),
    "migration must ADD CONSTRAINT jobs_contract_type_check with CHECK (contract_type IN (...))"
  );
  for (const v of CONTRACT_TYPE_VALUES) {
    assert.ok(
      src.includes(`'${v}'`),
      `migration must reference contract_type value '${v}'`
    );
  }
});

test("migration 00064 drops the legacy contract_type CHECK before migrating data", () => {
  const src = readFileSync(MIGRATION, "utf8");
  assert.ok(
    /DROP\s+CONSTRAINT\s+jobs_contract_type_check/i.test(src),
    "migration must DROP CONSTRAINT jobs_contract_type_check before the UPDATE"
  );
  // ordering: DROP CONSTRAINT must appear before the UPDATE that rewrites values
  const dropIdx = src.search(/DROP\s+CONSTRAINT\s+jobs_contract_type_check/i);
  const updateIdx = src.search(/UPDATE\s+(?:public\.)?jobs\s+SET\s+contract_type/i);
  assert.ok(dropIdx >= 0 && updateIdx >= 0, "both DROP and UPDATE must be present");
  assert.ok(
    dropIdx < updateIdx,
    "DROP CONSTRAINT must precede the UPDATE statement (flag-E sequencing)"
  );
});

test("migration 00064 maps cost_plus → cost_plus_aia", () => {
  const src = readFileSync(MIGRATION, "utf8");
  assert.ok(
    /UPDATE\s+(?:public\.)?jobs\s+SET\s+contract_type\s*=\s*'cost_plus_aia'\s+WHERE\s+contract_type\s*=\s*'cost_plus'/i.test(src),
    "migration must UPDATE jobs SET contract_type='cost_plus_aia' WHERE contract_type='cost_plus'"
  );
});

test("migration 00064 maps fixed → fixed_price", () => {
  const src = readFileSync(MIGRATION, "utf8");
  assert.ok(
    /UPDATE\s+(?:public\.)?jobs\s+SET\s+contract_type\s*=\s*'fixed_price'\s+WHERE\s+contract_type\s*=\s*'fixed'/i.test(src),
    "migration must UPDATE jobs SET contract_type='fixed_price' WHERE contract_type='fixed'"
  );
});

test("migration 00064 updates default to cost_plus_aia", () => {
  const src = readFileSync(MIGRATION, "utf8");
  assert.ok(
    /ALTER\s+COLUMN\s+contract_type\s+SET\s+DEFAULT\s+'cost_plus_aia'/i.test(src),
    "migration must SET DEFAULT 'cost_plus_aia' on contract_type"
  );
});

test("migration 00064 indexes both columns", () => {
  const src = readFileSync(MIGRATION, "utf8");
  assert.ok(
    /CREATE\s+INDEX\s+idx_jobs_phase\s+ON\s+(?:public\.)?jobs\s*\(\s*org_id\s*,\s*phase\s*\)/i.test(src),
    "migration must CREATE INDEX idx_jobs_phase ON jobs(org_id, phase)"
  );
  assert.ok(
    /CREATE\s+INDEX\s+idx_jobs_contract_type\s+ON\s+(?:public\.)?jobs\s*\(\s*org_id\s*,\s*contract_type\s*\)/i.test(src),
    "migration must CREATE INDEX idx_jobs_contract_type ON jobs(org_id, contract_type)"
  );
});

test("migration 00064 has a rollback companion (.down.sql)", () => {
  assert.ok(existsSync(MIGRATION_DOWN), `${MIGRATION_DOWN} missing`);
  const src = readFileSync(MIGRATION_DOWN, "utf8");
  assert.ok(
    /DROP\s+COLUMN\s+IF\s+EXISTS\s+phase/i.test(src),
    "down migration must DROP COLUMN IF EXISTS phase"
  );
  // legacy contract_type restoration: values + CHECK
  assert.ok(
    /UPDATE\s+(?:public\.)?jobs\s+SET\s+contract_type\s*=\s*'cost_plus'\s+WHERE\s+contract_type\s*=\s*'cost_plus_aia'/i.test(src),
    "down migration must reverse-map cost_plus_aia → cost_plus"
  );
  assert.ok(
    /UPDATE\s+(?:public\.)?jobs\s+SET\s+contract_type\s*=\s*'fixed'\s+WHERE\s+contract_type\s*=\s*'fixed_price'/i.test(src),
    "down migration must reverse-map fixed_price → fixed"
  );
  assert.ok(
    /CHECK\s*\(\s*contract_type\s+IN\s*\(\s*'cost_plus'\s*,\s*'fixed'\s*\)\s*\)/i.test(src),
    "down migration must restore legacy 2-value CHECK"
  );
});

// ── API validator in src/app/api/jobs/route.ts ───────────────────────

test(`${JOBS_API} accepts all 6 new contract_type values`, () => {
  const src = readFileSync(JOBS_API, "utf8");
  for (const v of CONTRACT_TYPE_VALUES) {
    assert.ok(
      src.includes(`"${v}"`),
      `${JOBS_API} must reference contract_type value "${v}" in its validator allow-list`
    );
  }
});

test(`${JOBS_API} no longer uses the legacy exclusive ["cost_plus","fixed"] allow-list (regression guard)`, () => {
  const src = readFileSync(JOBS_API, "utf8");
  // Matches the legacy pattern: the exact two-element allow-list used as an
  // exclusive .includes() gate. Any substring match means the expansion
  // didn't fully land.
  assert.ok(
    !/\[\s*"cost_plus"\s*,\s*"fixed"\s*\]\s*\.includes/.test(src),
    `${JOBS_API} must not gate contract_type on the legacy 2-value allow-list`
  );
});

test(`${JOBS_API} validates phase with all 9 values`, () => {
  const src = readFileSync(JOBS_API, "utf8");
  for (const v of PHASE_VALUES) {
    assert.ok(
      src.includes(`"${v}"`),
      `${JOBS_API} must reference phase value "${v}" in its validator allow-list`
    );
  }
});

test(`${JOBS_API} rejects invalid contract_type / phase with clear error (shape check)`, () => {
  const src = readFileSync(JOBS_API, "utf8");
  assert.ok(
    /Invalid\s+contract_type/i.test(src),
    `${JOBS_API} must throw "Invalid contract_type" on unknown values`
  );
  assert.ok(
    /Invalid\s+phase/i.test(src),
    `${JOBS_API} must throw "Invalid phase" on unknown values`
  );
});

// ── TS types in jobs pages ───────────────────────────────────────────

test(`${JOBS_ID_PAGE} Job type unions contract_type to the 6 new values`, () => {
  const src = readFileSync(JOBS_ID_PAGE, "utf8");
  for (const v of CONTRACT_TYPE_VALUES) {
    assert.ok(
      src.includes(`"${v}"`),
      `${JOBS_ID_PAGE} must include "${v}" in the contract_type TS union`
    );
  }
});

test(`${JOBS_ID_PAGE} Job type includes phase field with new union`, () => {
  const src = readFileSync(JOBS_ID_PAGE, "utf8");
  // Accept either an inline string union or a named type alias (e.g.
  // `phase: JobPhase;`). The values must still appear somewhere in the
  // file so we can check the nine-member union below.
  assert.ok(
    /\bphase\s*:\s*(["']|[A-Z][A-Za-z0-9_]*\s*;?)/.test(src),
    `${JOBS_ID_PAGE} must declare a phase field on the Job type (inline union or aliased type)`
  );
  for (const v of PHASE_VALUES) {
    assert.ok(
      src.includes(`"${v}"`),
      `${JOBS_ID_PAGE} must include "${v}" in the phase TS union`
    );
  }
});

// 3.4 (ONE NEW-JOB): the full-page /jobs/new form was DELETED — it redirects to
// the Bills view and opens the New-Job modal. So contract_type coverage
// moved off this route; the migration + JOBS_API + JOBS_ID_PAGE assertions above
// keep the full 6-value contract set enforced end-to-end.
test(`${JOBS_NEW_PAGE} redirects to the New-Job modal (3.4 — no full-page form)`, () => {
  const src = readFileSync(JOBS_NEW_PAGE, "utf8");
  assert.ok(
    /router\.replace\(\s*["']\/financials\/bills["']\s*\)/.test(src) && /useNewJob/.test(src),
    `${JOBS_NEW_PAGE} must redirect to /financials/bills and open the modal (3.4)`
  );
});

test(`${NEW_JOB_MODAL} carries the deliberate contract_type + billing_method split (2.4)`, () => {
  const src = readFileSync(NEW_JOB_MODAL, "utf8");
  for (const v of QUICK_CREATE_CONTRACT_TYPES) {
    assert.ok(src.includes(`"${v}"`), `modal must offer contract_type "${v}"`);
  }
  assert.ok(/billing_method/.test(src), "modal must carry billing_method (2.4 split)");
  assert.ok(
    /"aia"/.test(src) && /"cost_plus_statement"/.test(src),
    "modal billing_method must offer aia + cost_plus_statement"
  );
});

// ── new-job default contract_type ────────────────────────────────────
// 2.4 + 3.4: contract_type is a PER-JOB field (payment model), no longer an
// org-onboarding field — OnboardWizard.tsx is gone and onboard/page.tsx sets no
// contract_type. The default now lives on the New-Job modal.

test(`${NEW_JOB_MODAL} defaults new jobs' contract_type to "cost_plus_aia"`, () => {
  const src = readFileSync(NEW_JOB_MODAL, "utf8");
  assert.ok(
    /DEFAULT_CONTRACT[^=]*=\s*["']cost_plus_aia["']/.test(src),
    `${NEW_JOB_MODAL} must default contract_type to "cost_plus_aia"`
  );
  // Regression guard: no lingering bare legacy default.
  assert.ok(
    !/["']cost_plus["'](?!_aia|_open_book|_statement)/.test(src),
    `${NEW_JOB_MODAL} must not default to the bare legacy "cost_plus"`
  );
});

// ── runner ────────────────────────────────────────────────────────────

let failed = 0;
for (const c of cases) {
  try {
    c.fn();
    console.log(`PASS  ${c.name}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${c.name}`);
    console.log(`      ${e instanceof Error ? e.message : String(e)}`);
  }
}
console.log("");
if (failed > 0) {
  console.error(`${failed} of ${cases.length} test(s) failed`);
  process.exit(1);
} else {
  console.log(`${cases.length} test(s) passed`);
}
