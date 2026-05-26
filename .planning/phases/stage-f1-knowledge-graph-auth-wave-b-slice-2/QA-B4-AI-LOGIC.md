# QA-B4-AI-LOGIC.md - ai-logic-tester verdict for B-4 post-execute

**Phase:** stage-f1-knowledge-graph-auth-wave-b-slice-2 / B-4
**Plan:** lean-tier-2-entity-type-and-validator-domain (Tasks 1, 2, 3, 8, 9, 10)
**Reviewer:** nightwork-ai-logic-tester (Rule 3 LOAD-BEARING)
**Date:** 2026-05-22
**Verdict:** **PASS**

---

## Summary

Six checks executed live against the post-execute repo state. All six PASS. ActivityEntityType union verified at 35 members (32 trigger-target singulars + 3 extras); ENTITY_LABELS Record exhaustive; TypeScript compiles clean. NaN guards in wi-013 (F-J) and wi-001 (F-K) verified in source AND via test execution (29/29 PASS). Task 9 F-D rationale comment present and well-placed. Task 10 regex preserves the g flag required by .matchAll() while adding i for case-insensitivity. Task 3 D-T3 deviation (convert-to-po) verified correct via handler-body read - route is genuinely a 501 stub with NO state mutation.

**No NEW BLOCKING; no halt conditions tripped; no FAIL_*; no ERROR.**

---

## Check 1 - Tasks 1+2 union/Record state (Rule 3 - execute, do not infer)

### Initial grep returned misleading count

Plain grep -c on the line-prefix regex returned 52 (combined entity_type + action union members; both use identical line-prefix syntax). The expected 35 is the entity-type union ONLY. Scoped grep with awk delimits the type:

```
awk /export type ActivityEntityType/,/export type ActivityAction/ src/lib/activity-log.ts | grep -c line-prefix-regex
35
```

### 35-member union enumerated

Per direct Read of src/lib/activity-log.ts:32-82, the union members are:

1. invoice
2. invoice_import_batch
3. purchase_order
4. change_order
5. budget_line
6. job
7. vendor
8. cost_code
9. draw
10. user
11. client
12. client_portal_access
13. approval_chain
14. change_order_line
15. document_extraction_line
16. document_extraction
17. draw_adjustment_line_item
18. draw_adjustment
19. draw_line_item
20. internal_billing
21. invoice_allocation
22. invoice_line_item
23. item
24. job_item_activity
25. job_milestone
26. lien_release
27. line_bom_attachment
28. line_cost_component
29. po_line_item
30. proposal_line_item
31. proposal
32. selection_category
33. selection
34. unit_conversion_suggestion
35. vendor_item_pricing

Breakdown: 32 trigger-target singular forms (B-3 migration 00107 CASE statement) + 3 extras already documented in source comments (invoice_import_batch, user, client_portal_access). ENTITY_LABELS Record in src/lib/audit/action-labels.ts:30-90 provides exhaustive coverage for all 35.

### TypeScript verification

```
$ npx tsc --noEmit
(no output, exit 0)
```

Record exhaustiveness on ActivityEntityType holds at compile time.

---

## Check 2 - Task 8 F-J + F-K NaN guards correctness

### wi-013 (F-J) - src/lib/knowledge-graph/validators/wi-013-multi-job-allocation.ts:58-86

Verified in source:
- Pre-pass NaN filter at lines 58-69 BEFORE the .reduce() aggregation (matches PLAN section 2.7 corrected shape).
- Emits wi-013-allocation-amount-not-finite violation per NaN/Infinity allocation.
- Reduce at lines 72-74 uses .filter((a) => Number.isFinite(a.amount)) BEFORE summing - NaN cannot propagate into sum.
- The drift check at lines 75-86 still fires correctly on the finite remainder, preserving original wi-013-allocation-sum-drift semantics.

Test evidence from npx tsx __tests__/validators/wi-013.test.ts:
```
PASS  allocation amount = NaN - wi-013-allocation-amount-not-finite (and sum-drift on the finite remainder)
PASS  allocation amount = Infinity - wi-013-allocation-amount-not-finite
```

### wi-001 (F-K) - src/lib/knowledge-graph/validators/wi-001-inline-budget-context.ts:44-54 + 128-130

Verified in source:
- Early-return at validator top (lines 44-54) on !Number.isFinite(invoice.total_amount).
- Emits wi-001-invoice-amount-not-finite violation with invoice_id + total_amount in evidence.
- Returns ok:false immediately - downstream proposedTotalToDate arithmetic never sees a non-finite value.
- Defensive sibling guard at lines 128-130: priorTotal reducer ALSO filters non-finite values from approvedInvoices (historical-row defense-in-depth).

Test evidence from npx tsx __tests__/validators/wi-001.test.ts:
```
PASS  invoice total_amount = NaN - wi-001-invoice-amount-not-finite (early return)
PASS  invoice total_amount = Infinity - wi-001-invoice-amount-not-finite (early return)
```

NaN propagation BLOCKED at validator entry; historical-row contamination filtered defensively.

---

## Check 3 - Task 9 F-D rationale comment

src/lib/knowledge-graph/validators/wi-013-multi-job-allocation.ts:90-118:

The INTENTIONAL/diagnostic/outcome-safe comment block is present and positioned BEFORE the .from(jobs).select(...) chain at line 119. The comment cites:

- **Diagnostic clarity rationale**: validator MUST see foreign-org rows to emit wi-013-allocation-cross-tenant with the actual foreign org_id in the evidence payload.
- **Outcome equivalence argument**: if filtered by org_id at query time, cross-tenant allocations would return null from .maybeSingle() and the validator would emit wi-013-allocation-job-not-found instead - same safety outcome, less diagnostic.
- **Three outcome-safe arguments** for cross-tenant visibility:
  - Validator runs server-side; returns only violation code + evidence, never the row itself.
  - Production callers ARE RLS-bound at the API layer (getCurrentMembership + org-filter eq before validator invocation).
  - Evidence payload reveals foreign org_id, but that is NOT a meaningful tenant-isolation leak - publicly inferable from any constraint-violation error.
- **Cross-reference**: B-1b QA report 2026-05-18-1230 F-D + nwrp172 GATE 2 disposition.

Placement verified: the lookup chain at line 119 is the omitted-org-filter site the comment justifies.

---

## Check 4 - Task 10 F-A regex gi flag preservation

src/lib/knowledge-graph/validators/client-pii-not-embedded.ts:49-55:

```typescript
const WILDCARD_PATTERN = /\bclients?\s*\(\s*\*\s*\)/gi;
const ALIAS_WILDCARD = /:\s*clients?\s*\(\s*\*\s*\)/gi;
const EMAIL_PATTERN = /\bclients?\s*\([^)]*\bemail\b[^)]*\)/gi;
const PHONE_PATTERN = /\bclients?\s*\([^)]*\bphone\b[^)]*\)/gi;
```

All 4 patterns use /gi:

- **g flag PRESERVED** - .matchAll() calls at lines 71-72 and line 92 require the g flag (without it, String.prototype.matchAll throws TypeError: String.prototype.matchAll called with a non-global RegExp argument).
- **i flag APPENDED** - enables case-insensitive matching for uppercase / mixed-case variants (CLIENTS(*), Clients(email), etc.).
- **Word-boundary anchor PRESERVED** on 3/4 patterns (WILDCARD, EMAIL, PHONE). ALIAS_WILDCARD uses a colon prefix instead, which is the correct shape for alias-form detection (homeowner:clients(*) requires the colon as discriminator).
- **Colon prefix shape PRESERVED** on ALIAS_WILDCARD.

The source comment at lines 41-48 explicitly documents the i flag addition AND the rationale for preserving g (.matchAll() requirement) AND the rationale for preserving word-boundary (false-positive guard against subclients(...) matching).

Test evidence from npx tsx __tests__/validators/client-pii-not-embedded.test.ts:
```
PASS  uppercase wildcard CLIENTS(*) - client-pii-embed-wildcard (i flag)
PASS  mixed-case Clients(id,name,email) - client-pii-embed-detected (i flag)
```

.matchAll() at lines 71-72 + line 92 runtime confirmed working - all 12 tests pass with zero runtime errors. No TypeError raised.

---

## Check 5 - Task 3 per-route disposition (D-T3 deviation)

### convert-to-po path correction

The instructions reference src/app/api/proposals/[id]/convert-to-po/route.ts:17-26. The actual path uses [proposal_id] (Next.js dynamic-route convention chosen for this route family): src/app/api/proposals/[proposal_id]/convert-to-po/route.ts. Content verified at this corrected path.

### Comment block verification (lines 18-26)

Rationale block present and cites:
- B-4 Task 3 sweep + Rule 1 deviation documented in B-4-SUMMARY.md section Task-3.
- Original B-4-PLAN section 2.2 line 266 prescribed entity_type=proposal, action=status_changed.
- "501 stub that mutates NO state" justification.
- "Adding an audit row would log a phantom event (false evidence) violating audit integrity."
- Forward reference: when Phase 3.5 wires real PO-generation pipeline, that implementation will own the logActivity call.

### Mutation verification (handler body read - lines 40-73)

Per direct Read of the route file:
- Line 44: getCurrentMembership() - read-only auth check.
- Line 47-48: pulls proposal_id from params - no DB mutation.
- Line 51-57: .from(proposals).select(id, status, deleted_at)...maybeSingle() - READ ONLY (select).
- Line 59-60: throws ApiError on error/not-found - no mutation.
- Line 62-72: returns NextResponse.json(...) with HTTP 501 - no mutation.

**Verdict**: convert-to-po IS genuinely a 501 stub. NO UPDATE, NO INSERT, NO DELETE on proposals or any other table. The D-T3 deviation is **CORRECT** - adding a logActivity call would have written a phantom audit row (false evidence in the audit log) violating Rule 1 (audit-integrity > coverage). Task 3 disposition is sound.

---

## Check 6 - Unit test counts vs expected

```
$ Grep (it|test) pattern across __tests__/validators/*.test.ts
__tests__/validators/wi-013.test.ts:9
__tests__/validators/client-pii-not-embedded.test.ts:12
__tests__/validators/wi-001.test.ts:8

Found 29 total occurrences across 3 files.
```

Per Rule 3, tests EXECUTED:

```
$ npx tsx __tests__/validators/wi-013.test.ts
... 9 PASS ...
9 test(s) passed

$ npx tsx __tests__/validators/wi-001.test.ts
... 8 PASS ...
8 test(s) passed

$ npx tsx __tests__/validators/client-pii-not-embedded.test.ts
... 12 PASS ...
12 test(s) passed
```

All counts match expected (9 / 8 / 12). All 29 tests PASS at runtime.

---

## Runtime evidence (Rule 3 compliance)

All claims in this report backed by:
- Direct file Read of source files (activity-log.ts, action-labels.ts, all 3 validators, convert-to-po route).
- Direct file Read of test files.
- npx tsc --noEmit for type-system claims (clean exit, no errors).
- npx tsx __tests__/validators/*.test.ts for runtime validator behavior (29/29 PASS).

No inferred-but-unverified claims.

---

## Halt conditions assessment

| Halt condition | Verdict |
|----|----|
| D-T3 deviation incorrect (convert-to-po actually mutates) - BLOCKING | **NO** - confirmed 501 stub with no state mutation |
| Task 8 NaN guards still allow NaN propagation - BLOCKING | **NO** - pre-pass filter + early-return + reduce-filter in place |
| Task 10 regex breaks .matchAll() runtime - BLOCKING | **NO** - g flag preserved; 12 tests pass cleanly |
| Unit test count mismatch (less than expected) - MUST-FIX | **NO** - 9/8/12 confirmed |

None tripped.

---

## Verdict

**PASS** - B-4 Tasks 1, 2, 3, 8, 9, 10 all verified against runtime evidence. Lean Tier-2 audit-integrity posture (Rule 1) correctly applied at convert-to-po deviation. NaN guard pattern + regex flag preservation + per-task test coverage all hold. TypeScript compiles clean. ENTITY_LABELS Record exhaustive over 35-member ActivityEntityType union.

---

## Recommended fixes

None blocking. Optional housekeeping (non-blocking):

1. The initial grep on the line-prefix regex returns 52 not 35 because both ActivityEntityType and ActivityAction unions use identical line-prefix syntax. Future plan-author instructions should scope with awk (as in Check 1) or use a more specific regex anchor to avoid confusion at reviewer kickoff.
2. The route path is src/app/api/proposals/[proposal_id]/convert-to-po/route.ts, not [id]. Worth correcting in B-4-SUMMARY.md or any other cross-reference that may cite the wrong dynamic-segment name.

