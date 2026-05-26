# Plan-review iter-1 — ai-logic-tester — B-4

**Plan reviewed:** `B-4-PLAN.md` commit `55f0a42`
**Reviewer:** ai-logic-tester (Nightwork; entity_type + validator domain per nwrp220 §6)
**Date:** 2026-05-26
**Verdict:** **NEEDS-WORK** (1 BLOCKING + 2 MUST-FIX on §2.7 diff accuracy; all corrections applied inline per nwrp220 §7 ONE-iter-cycle target; Tasks 1, 2, 3, 4, 5, 6, 7, 9 PASS or not in ai-logic-tester scope)
**Orchestrator note:** Agent returned findings inline only (per system-reminder constraint); orchestrator persists to disk per Rule 8(d) disk-evidence preference.

## Summary

TypeScript clean. ActivityEntityType union (35 members) verified — 32 trigger-target singular forms (B-3 migration 00107 CASE) + 3 extras (`invoice_import_batch`, `user`, `client_portal_access`). Diff vs migration 00107 CASE 1:1. Tasks 1+2 verification-only disposition CORRECT. ENTITY_LABELS Record exhaustive per TypeScript compile.

§2.7 (Tasks 8 + 10) has 3 diff-shape corrections needed before execute:
1. **BLOCKING** — Task 10 regex fix strips `g` flag (would crash `.matchAll()` at runtime) + strips `\b` anchor (false positives) + cites wrong ALIAS_WILDCARD pattern shape
2. **MUST-FIX** — Task 8 F-J `continue` keyword implies loop iteration; actual code is `.reduce()` aggregation — fix shape needs pre-pass NaN filter
3. **MUST-FIX** — Task 8 F-K same misalignment

## Findings

### BLOCKING — Task 10 F-A regex fix shape would crash at runtime

**Source:** PLAN §2.7 Task 10 diff block

**Issue:** PLAN's diff shape is `/pattern/` → `/pattern/i` (replace flag). Actual current patterns at `src/lib/knowledge-graph/validators/client-pii-not-embedded.ts:40-46` use `/g` flag (required by `.matchAll()` at lines 62-64 + 83). Applied literally, the diff strips the `g` flag → `String.prototype.matchAll called with a non-global RegExp argument` runtime throw.

**Actual patterns (verbatim from file):**
```typescript
const WILDCARD_PATTERN = /\bclients?\s*\(\s*\*\s*\)/g;
const ALIAS_WILDCARD = /:\s*clients?\s*\(\s*\*\s*\)/g;
const EMAIL_PATTERN = /\bclients?\s*\([^)]*\bemail\b[^)]*\)/g;
const PHONE_PATTERN = /\bclients?\s*\([^)]*\bphone\b[^)]*\)/g;
```

**Also:** PLAN's `ALIAS_WILDCARD` pattern citation `/\bclients?:\s*\*/` is wrong shape — actual is `/:\s*clients?\s*\(\s*\*\s*\)/g` (different structure: `:` PREFIX + full `clients(*)` body, NOT inline `clients:*`).

**Correct fix:** Append `i` to `g` (→ `gi`), preserving `g` flag + `\b` anchor + ALIAS's `:` prefix shape. 4 char total across 4 patterns.

**Verified via Node REPL:** `'X'.matchAll(/x/i)` throws; `'X'.matchAll(/x/gi)` works.

**Disposition:** APPLIED INLINE in B-4-PLAN.md §2.7 (commit pending) per nwrp220 §7 ONE-iter-cycle target.

### MUST-FIX — Task 8 F-J line range + fix shape misalignment

**Source:** PLAN §2.7 Task 8 diff block (`continue` keyword + line range 49-54)

**Issue:** Actual code at `src/lib/knowledge-graph/validators/wi-013-multi-job-allocation.ts:49-54` is the `.reduce()` sum:
```typescript
const sum = input.allocations.reduce(
  (acc, a) => acc + (a.amount ?? 0),
  0,
);
```

`.reduce()` has no body where `continue` keyword would fit. The for-loop is at line ~67 (different surface: reads `alloc.job_id` / `alloc.cost_code_id`, NOT `alloc.amount`).

The NaN bug IS real: `NaN ?? 0 === NaN` (nullish coalescing doesn't fix NaN); sum becomes NaN; `Math.abs(NaN - X) === NaN`; `NaN > 1 === false` — drift check silently bypasses.

**Correct fix shape:** Pre-pass loop BEFORE the reduce that pushes violation per NaN allocation + filters NaN out of the reduce.

**Disposition:** APPLIED INLINE in B-4-PLAN.md §2.7 (commit pending). Pre-pass + filtered-reduce pattern documented.

### MUST-FIX — Task 8 F-K same line/shape misalignment

**Source:** PLAN §2.7 Task 8 diff block (`continue` + line range 101-105)

**Issue:** Actual code at `wi-001-inline-budget-context.ts:101-105` is the `priorTotal` reducer + the `proposedTotalToDate` computation. Same shape problem as F-J.

**Correct fix shape:** Early-return at validator top (if `!Number.isFinite(invoice.total_amount)` → return ok:false with violation) + filter NaN from `approvedInvoices` reducer.

**Disposition:** APPLIED INLINE in B-4-PLAN.md §2.7 (commit pending). Early-return + filtered-reduce pattern documented.

### PASS — Tasks 1+2 verification-only disposition

ActivityEntityType union member count = 35 (verified via `sed -n '33,82p' src/lib/activity-log.ts | grep -c '^  | "'`). Diff vs migration 00107 CASE = 3 extras (invoice_import_batch + user + client_portal_access — all correct).

`npx tsc --noEmit` returned clean (no output = no errors). `Record<ActivityEntityType, string>` exhaustiveness preserved by TypeScript compile.

CONTEXT D-01..D-02 claims VERIFIED. Tasks 1+2 verification-only disposition is appropriate planning hygiene.

### PASS — Task 9 F-D rationale comment

Lines 67-72 contain the jobs lookup `.from("jobs").select("id, org_id").eq("id", alloc.job_id).maybeSingle()` — exactly the spot for the proposed INTENTIONAL/diagnostic/cross-tenant comment block per PLAN §2.7 Task 9 body. Placement guidance correct.

### PASS — Test infrastructure compatibility

Existing test files use bespoke harness:
- `__tests__/validators/wi-013.test.ts` (7 cases via `cases[]` + `test()` helper + runner block)
- `__tests__/validators/wi-001.test.ts` (6 cases)
- `__tests__/validators/client-pii-not-embedded.test.ts` (10 cases)

New test cases per Task 8 + Task 10 can append via additional `cases[]` entries without restructure. PLAN AC-B4-08/09/11 verification mechanisms are sound.

## Verdict

**NEEDS-WORK** at iter-1 review; **3 PLAN-text corrections applied inline** (no design change; surgical edits to §2.7). Per nwrp220 §7 ONE-iter-cycle target, these are PLAN-text accuracy corrections rather than architectural rework — appropriate to apply inline at SYNTHESIS time rather than dispatch iter-2.

Post-correction, B-4 is **ready for /nx execute under calibrated hook** + `$50` per-plan halt gate + lean Tier-2 reviewer scope.

## Cross-reviewer alignment

No Rule 9 cross-reviewer factual disagreement detected against spec-checker (PASS), custodian (PASS), database-reviewer (PASS + 1 test-file-naming MUST-FIX, also applied inline), security-reviewer-Task-4 (PASS). The §2.7 diff corrections are unique to ai-logic-tester's validator-domain surface; no overlap with other reviewer scopes.

## Files referenced (absolute paths)
- `C:\Users\Jake\nightwork-platform\src\lib\activity-log.ts` (union 35 members verified)
- `C:\Users\Jake\nightwork-platform\src\lib\audit\action-labels.ts` (Record exhaustive)
- `C:\Users\Jake\nightwork-platform\src\lib\knowledge-graph\validators\wi-013-multi-job-allocation.ts` (F-J reducer + F-D comment slot)
- `C:\Users\Jake\nightwork-platform\src\lib\knowledge-graph\validators\wi-001-inline-budget-context.ts` (F-K reducer)
- `C:\Users\Jake\nightwork-platform\src\lib\knowledge-graph\validators\client-pii-not-embedded.ts` (F-A regex 4 patterns with `/g` flag + `\b` anchors)
- `C:\Users\Jake\nightwork-platform\__tests__\validators\*.test.ts` (3 files; harness extensible)
- `C:\Users\Jake\nightwork-platform\supabase\migrations\00107_b3_soft_delete_audit_trigger_def_wc_1.sql` (32-table CASE 1:1 with union)
- `C:\Users\Jake\nightwork-platform\.planning\phases\stage-f1-knowledge-graph-auth-wave-b-slice-2\B-4-PLAN.md` (§2.7 corrected inline)
