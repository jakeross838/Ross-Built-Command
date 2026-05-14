---
phase: stage-f1-knowledge-graph-auth-wave-e
plan: E-1
plan-name: vendor-pii-narrow
type: execute
wave: E
depends_on: []
autonomous: true
halt_after: false
requires_smoke: false
threat_model_severity: low
status: REVISED-PATH-C
authored: 2026-05-14
revised: 2026-05-14
authored_by: gsd-planner (claude-opus-4-7[1m]); revised by orchestrator under nwrp145 authorization
authorization: nwrp145 — Path C decision (re-classify FINDING-1 as ACCEPTED RISK; NO code changes)
requirements: []
source_decisions:
  - "nwrp145 Path C decision: FINDING-1 [HIGH] re-classified as ACCEPTED RISK. Vendor phone/email is B2B contact info (published business data), not customer PII. D-078's PII fence scope was designed around `profiles` (customer/employee identity), not `vendors`. VendorContactPopover tap-to-call is a load-bearing PM workflow. Plan E-1 reduces from code-changing to docs-only."
  - "Plan-author halt finding (original E-1 PLAN.md §Plan-author halt finding, lines 153-238): the prescribed Path A (narrow embed) would silently remove the legitimate VendorContactPopover tap-to-call/tap-to-email workflow. Path C accepts the existing posture explicitly."
  - "/nightwork-qa security-reviewer FINDING-1 [HIGH] (qa-security.md): documented + adjudicated; Jake override stands per nwrp145."
  - "New D-079 MASTER-PLAN entry: PII fence scope clarification — customer data only; vendor B2B contact info NOT in scope. Codifies the override + going-forward convention."

files_modified:
  - .planning/MASTER-PLAN.md  # D-079 entry
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-e-EXPANDED-SCOPE.md  # Plan E-1 section updated to Path C
  - .planning/qa-runs/wave-d/finding-1-reclassification.md  # NEW (gitignored audit trail)

files_referenced:
  - src/app/api/invoices/[id]/route.ts:76 (vendor embed REMAINS UNCHANGED per Path C)
  - src/components/invoices/InvoiceHeader.tsx:12-18 + 55-59 (downstream consumer of the embed — preserved by Path C)
  - src/components/vendor-contact-popover.tsx:18 + 110-149 (tap-to-call workflow — preserved by Path C)
  - .planning/qa-runs/2026-05-14-1700-qa-report.md (FINDING-1 original)
  - .planning/architecture/ARCHITECTURE.md §SOC2 control mapping (CC6.1 — clarified by D-079)
  - CLAUDE.md Architecture Rules (D-078 + new D-079 PII fence scope clarification)

requires:
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-e-EXPANDED-SCOPE.md (revised at nwrp145 to reflect Path C)

provides:
  - "FINDING-1 [HIGH] formally re-classified as ACCEPTED RISK with documented override rationale"
  - "D-079 MASTER-PLAN entry codifying PII fence scope: customer data only; vendor B2B contact info NOT in scope"
  - "Future security reviewers have explicit guidance distinguishing customer PII (fenced) from vendor B2B contact (not fenced)"
  - "VendorContactPopover tap-to-call/tap-to-email workflow preserved at parity with pre-Wave-E behavior"

affects:
  - "Wave-D /nightwork-qa security-reviewer FINDING-1 [HIGH] → CLOSED via re-classification (not via remediation)"
  - "Future PostgREST embed plan-author guidance: vendor embeds may include phone/email/address by default; profiles embeds remain fenced to (id, full_name) per D-078"
  - "TD-WD-06 (jobs/[id]/overview client_email/client_phone) remains active — customer PII, still subject to D-078 fence; Path C does NOT relax that"

sequence:
  before: "E-2 + E-3 plan-review iter-1 (sibling Wave-E plans)"
  parallel_authoring_ok: true
  parallel_execute_ok: "E-2 + E-3 (no file overlap; E-1 modifies only docs)"

acceptance-criteria-target: 4 falsifiable items (AC-E1-01..AC-E1-04)

threat_model:
  trust_boundaries:
    - "Documentation boundary — Path C ships re-classification + D-079 entry as planning artifacts. No production code or schema change. Threat surface narrows to: future security reviewer (human OR AI) failing to read the re-classification doc + D-079 entry and re-flagging FINDING-1 as a new finding. Mitigation: cross-reference dense (D-079 + finding-1-reclassification.md + Wave-E EXPANDED-SCOPE + this plan all cross-link)."

  threats:
    - id: T-E-1-01
      category: "R (Repudiation — override decision lost without audit trail)"
      component: "FINDING-1 re-classification documentation"
      disposition: "mitigate"
      mitigation: "Audit trail at finding-1-reclassification.md (gitignored local audit) + D-079 MASTER-PLAN entry (tracked) + Wave-E EXPANDED-SCOPE update + this plan's frontmatter. Override documented in 4 cross-referenced locations."
    - id: T-E-1-02
      category: "I (Information Disclosure — re-classification reasoning misapplied to genuine customer PII finding)"
      component: "D-079 wording precision"
      disposition: "mitigate"
      mitigation: "D-079 explicitly scopes the fence to (a) profiles columns, (b) jobs customer columns, (c) future ENTITY-INVENTORY PII?-flagged columns. Explicit carve-out for vendors. Future findings on profiles or customer-data PII remain subject to D-078 fence; Path C does NOT broaden the carve-out beyond vendor B2B contact."

must_haves:
  truths:
    - "After Plan E-1 (Path C) ships, `grep -nE '^\\| \\*\\*D-079\\*\\*' .planning/MASTER-PLAN.md` returns exactly 1 match (D-079 entry exists)"
    - "After Plan E-1 (Path C) ships, `.planning/qa-runs/wave-d/finding-1-reclassification.md` exists (verify via `ls`)"
    - "After Plan E-1 (Path C) ships, Wave-E EXPANDED-SCOPE §Plan E-1 section reflects Path C decision (grep for 'Path C' substring)"
    - "After Plan E-1 (Path C) ships, `src/app/api/invoices/[id]/route.ts:76` is UNCHANGED (vendor embed still `vendors:vendor_id (id, name, phone, email, address)` — verify via grep)"
    - "Drummond grep gate silent on the diff (planning artifacts only; no code changes)"

  artifacts:
    - path: ".planning/MASTER-PLAN.md"
      provides: "D-079 entry codifying PII fence scope clarification"
      contains: "D-079"
      contains_also: "vendor B2B contact info NOT in scope"
    - path: ".planning/expansions/stage-f1-knowledge-graph-auth-wave-e-EXPANDED-SCOPE.md"
      provides: "Wave-E Plan E-1 section revised to Path C"
      contains: "Path C"
      contains_also: "FINDING-1 re-classification"
    - path: ".planning/qa-runs/wave-d/finding-1-reclassification.md"
      provides: "Override audit trail (gitignored; local-only)"
      contains: "ACCEPTED RISK"
      contains_also: "vendor B2B contact info"

  key_links:
    - from: "Wave-D /nightwork-qa security-reviewer FINDING-1 [HIGH]"
      to: "ACCEPTED RISK classification with documented override"
      via: "Plan E-1 Path C deliverables (finding-1-reclassification.md + D-079 + EXPANDED-SCOPE update + this plan)"
      pattern: "FINDING-1 reclassified|Path C|ACCEPTED RISK"
---

# E-1 (Path C) — FINDING-1 Re-classification

## Goal

Per nwrp145 Jake adjudication: re-classify Wave-D /nightwork-qa security-reviewer FINDING-1 [HIGH] as ACCEPTED RISK. Vendor phone/email is B2B contact info (published business data), not customer PII (homeowner/employee identity). The D-078 PII fence scope was designed around `profiles`, not `vendors`. VendorContactPopover tap-to-call is a load-bearing PM workflow with explicit product-design intent.

**Plan E-1 (Path C) ships ZERO code changes.** All deliverables are planning artifacts:
1. `.planning/qa-runs/wave-d/finding-1-reclassification.md` — override audit trail (gitignored local-only)
2. New D-079 MASTER-PLAN entry — codifies PII fence scope clarification
3. Wave-E EXPANDED-SCOPE §Plan E-1 update — reflects Path C decision
4. This PLAN.md — replaces the original Path A plan body

## Why Path C, not Path A or Path B

The original E-1 PLAN.md (Path A) prescribed narrowing the vendor embed from `(id, name, phone, email, address)` to `(id, name, address)`. The plan-author surfaced a halt finding: VendorContactPopover at `src/components/vendor-contact-popover.tsx:18` explicitly endorses the prefetch posture ("preferred over fetching: avoids a second query and any RLS surprise"). Narrowing the embed silently removes a legitimate workflow capability.

**Path A** — accept the workflow regression. Closes FINDING-1 cleanly but degrades PM workflow.
**Path B** — add admin-gated separate `/api/invoices/[id]/vendor-contact` endpoint. Preserves workflow but expands E-1 from 1 file to ~3-4 files.
**Path C** — re-classify FINDING-1. Preserves workflow + no code change.

Per nwrp145, Jake chose Path C with reasoning:
1. Vendor phone/email is B2B contact info, not customer PII
2. D-078's PII fence was designed around customer data (homeowner email/phone)
3. Vendors expect calls from their builder; consent implicit in vendor relationship
4. VendorContactPopover tap-to-call is a legitimate PM workflow
5. Severity calibration disagreement with security-reviewer documented explicitly

## Pre-flight verification

```bash
# Confirm vendor embed at line 76 is unchanged (Path C ships no code changes)
grep -nF "vendors:vendor_id (id, name, phone, email, address)" src/app/api/invoices/\[id\]/route.ts
# Expected: 1 hit at line 76 (UNCHANGED from current state)

# Confirm D-079 entry will be the next sequence number (D-078 is current latest)
grep -nE "^\| \*\*D-079\*\*" .planning/MASTER-PLAN.md
# Expected pre-Plan-E-1: 0 hits (D-079 will be created by this plan)
# Expected post-Plan-E-1: 1 hit (D-079 entry added)
```

## Implementation tasks

### Task 1 — Author finding-1-reclassification.md

**Path:** `.planning/qa-runs/wave-d/finding-1-reclassification.md` (gitignored under `.planning/qa-runs/` per .gitignore:107 whitelist exclusion)

**Action:** Write override audit trail documenting Path C decision, Jake's 5-point rationale, severity calibration disagreement, and trigger conditions for re-evaluation (vendor master agreement, GDPR-equivalent regulation, new vendor PII columns).

**Verify:** `ls .planning/qa-runs/wave-d/finding-1-reclassification.md` returns the file path.

**Done:** Audit trail exists; documents the override + rationale + trigger conditions.

### Task 2 — Add D-079 entry to MASTER-PLAN.md DECISIONS LOG

**Path:** `.planning/MASTER-PLAN.md`

**Action:** Insert new D-079 entry after D-078, before §11 TECH DEBT REGISTRY. Entry must:
- Cite the override decision (Jake at nwrp145)
- Document Jake's 5-point rationale
- Codify going-forward convention: PII fence applies to (a) profiles columns, (b) jobs customer columns, (c) future ENTITY-INVENTORY PII?-flagged columns. NOT applicable to vendors.
- Specify trigger conditions for re-evaluation (vendor master agreement / GDPR / new vendor PII columns)
- Cross-reference finding-1-reclassification.md + Wave-E EXPANDED-SCOPE + this PLAN.md
- Map to SOC2 controls (CC6.1 — access controls; no new controls introduced)

**Verify:** `grep -nE '^\| \*\*D-079\*\*' .planning/MASTER-PLAN.md` returns 1 match.

**Done:** D-079 entry exists with required content.

### Task 3 — Update Wave-E EXPANDED-SCOPE §Plan E-1 section

**Path:** `.planning/expansions/stage-f1-knowledge-graph-auth-wave-e-EXPANDED-SCOPE.md`

**Action:** Replace original Path A scope description with Path C revised scope. New section header: `### Plan E-1 — FINDING-1 re-classification (Path C per nwrp145)`. Body documents: (a) original scope cancelled; (b) revised scope (docs only); (c) files modified now 0 source + 3 planning artifacts; (d) requires_smoke false; (e) out-of-scope unchanged.

**Verify:** `grep -nE 'Path C' .planning/expansions/stage-f1-knowledge-graph-auth-wave-e-EXPANDED-SCOPE.md` returns ≥2 hits (header + body).

**Done:** Wave-E EXPANDED-SCOPE reflects Path C.

### Task 4 — Update E-1 PLAN.md (THIS FILE) to reflect Path C

**Path:** `.planning/phases/stage-f1-knowledge-graph-auth-wave-e/E-1-vendor-pii-narrow-PLAN.md`

**Action:** Replace original Path A plan body with this Path C version. THIS DOCUMENT IS the Task 4 deliverable.

**Verify:** `grep -nE 'Path C' .planning/phases/stage-f1-knowledge-graph-auth-wave-e/E-1-vendor-pii-narrow-PLAN.md` returns ≥3 hits.

**Done:** Plan body reflects Path C (no code changes; docs only).

## Acceptance criteria

| ID | Criterion | Verification |
|---|---|---|
| AC-E1-01 | D-079 entry exists in MASTER-PLAN.md | `grep -nE '^\| \*\*D-079\*\*' .planning/MASTER-PLAN.md` returns 1 match |
| AC-E1-02 | finding-1-reclassification.md exists | `ls .planning/qa-runs/wave-d/finding-1-reclassification.md` succeeds |
| AC-E1-03 | Wave-E EXPANDED-SCOPE §Plan E-1 reflects Path C | `grep -c 'Path C' .planning/expansions/stage-f1-knowledge-graph-auth-wave-e-EXPANDED-SCOPE.md` returns ≥2 |
| AC-E1-04 | No code changes to `src/app/api/invoices/[id]/route.ts` | `grep -nF "vendors:vendor_id (id, name, phone, email, address)" src/app/api/invoices/\[id\]/route.ts` returns 1 match (UNCHANGED) |

## Verification commands

```bash
# AC-E1-01: D-079 entry exists
grep -nE '^\| \*\*D-079\*\*' .planning/MASTER-PLAN.md
# Expected: 1 match

# AC-E1-02: Re-classification audit trail exists (local-only)
ls .planning/qa-runs/wave-d/finding-1-reclassification.md
# Expected: file path returned (gitignored; local)

# AC-E1-03: EXPANDED-SCOPE reflects Path C
grep -c 'Path C' .planning/expansions/stage-f1-knowledge-graph-auth-wave-e-EXPANDED-SCOPE.md
# Expected: ≥ 2

# AC-E1-04: Vendor embed unchanged
grep -nF "vendors:vendor_id (id, name, phone, email, address)" src/app/api/invoices/\[id\]/route.ts
# Expected: 1 match (line 76 unchanged from pre-Wave-E state)
```

## Rollback strategy

E-1 (Path C) is a documentation-only change. Rollback is trivial:
1. `git revert <E-1 Path C commit hash>` — removes D-079 entry + EXPANDED-SCOPE update + this PLAN.md update
2. Re-instates original Path A E-1 PLAN.md (or earlier state if E-1 hadn't been authored)
3. The local-only `finding-1-reclassification.md` would be re-deleted by the revert (since it's in qa-runs/ which is gitignored, the revert doesn't actually touch it; manual `rm` if cleanup desired)

If Jake decides post-ship that Path C was wrong (e.g. vendor master agreement signed restricting PII distribution), the revert restores Path A scope; a new plan can then ship the actual code change.

## Notes for plan-review

### Plan-review iter-1 reviewer focus

**security-reviewer:**
- Validate D-079 wording precisely scopes the fence carve-out to vendor B2B contact info, NOT customer PII
- Confirm trigger conditions for re-evaluation are appropriately captured (vendor master agreement / GDPR-equivalent / new vendor PII columns)
- Flag if any production code paths embed VENDOR table columns that ARE customer-PII-equivalent (e.g. if vendors table has a `homeowner_contact` field or similar — sanity check; per current schema, vendors is purely commercial entity data)

**multi-tenant-architect:**
- Confirm `public.vendors` RLS posture is unchanged (org-scoped per existing policy); Path C does not relax RLS
- Validate D-079's interaction with future vendor-portal work (Wave 4 vendor portal scope) — if vendors will eventually have customer-facing presence, the B2B-vs-customer distinction matters then; flag for Wave 4 plan-author

**design-pushback:**
- Adjudicate severity calibration disagreement: confirm PM tap-to-call workflow is meaningful UX value (not a vestigial feature); confirm dropping it would degrade real PM workflow
- Validate the "vendor B2B contact info is published business data" rationale (the planner stated this confidently; if Ross Built treats vendor contact as confidential despite being technically published, the rationale weakens)

**planner-coverage:**
- Confirm Path C deliverables (4 artifacts) are all in scope + verifiable
- Confirm parallel_execute_ok: true with E-2 + E-3 (no file overlap)

**architect:**
- Validate single planning-artifacts-only constraint (no src/ files touched)
- Confirm sequencing: E-1 Path C can dispatch in parallel with E-2 + E-3 since no execute-time file overlap

**enterprise-readiness:**
- Confirm the override audit trail meets SOC2-equivalent discipline expectations (override documented, rationale captured, trigger conditions for re-evaluation specified)
- Validate D-079's SOC2 control mapping note (CC6.1 — access controls clarified, no new controls introduced)

### Cross-plan coordination

E-1 (Path C) has no cross-plan coordination concerns with E-2 or E-3:
- No file overlap (E-2 touches nav-bar/job-sidebar/wave-d-smoke/smoke-seed/harness-auth-bootstrap/jobs-id-page; E-3 touches financials/bills/[id]/page.tsx)
- No DB state coordination (E-1 ships no code or migration)
- No smoke harness dependency (E-1 requires_smoke: false)

### Commit posture

E-1 (Path C) = ONE atomic commit containing:
- `.planning/qa-runs/wave-d/finding-1-reclassification.md` (NEW, gitignored — won't appear in commit)
- `.planning/MASTER-PLAN.md` (D-079 entry added)
- `.planning/expansions/stage-f1-knowledge-graph-auth-wave-e-EXPANDED-SCOPE.md` (Plan E-1 section revised)
- `.planning/phases/stage-f1-knowledge-graph-auth-wave-e/E-1-vendor-pii-narrow-PLAN.md` (THIS FILE — replaces Path A plan body)

Compound `git add ... && git commit` form per nwrp133 codification. No --no-verify.

Suggested commit message:
```
docs(stage-f1-wave-e): E-1 Path C — re-classify FINDING-1 as ACCEPTED RISK

Per nwrp145 Jake adjudication: vendor phone/email is B2B contact info
(published business data), not customer PII. D-078's PII fence scope
was designed around `profiles`, not `vendors`. VendorContactPopover
tap-to-call is a load-bearing PM workflow. Plan E-1 reduces from
code-changing to docs-only.

Artifacts:
- New D-079 MASTER-PLAN entry codifying PII fence scope (customer
  data only; vendor B2B contact info NOT in scope)
- Wave-E EXPANDED-SCOPE §Plan E-1 revised to Path C
- E-1 PLAN.md replaced with Path C plan body
- .planning/qa-runs/wave-d/finding-1-reclassification.md (gitignored
  override audit trail with Jake's 5-point rationale + trigger
  conditions for re-evaluation)

No code changes. Vendor embed at src/app/api/invoices/[id]/route.ts:76
remains unchanged. VendorContactPopover tap-to-call/tap-to-email
workflow preserved at parity with pre-Wave-E behavior.

FINDING-1 [HIGH] CLOSED via re-classification (not via remediation).

Refs: nwrp145, D-079, finding-1-reclassification.md
```

## Files written by this plan

| Path | New/Modified | Size |
|---|---|---|
| `.planning/qa-runs/wave-d/finding-1-reclassification.md` | NEW (gitignored) | ~3 KB |
| `.planning/MASTER-PLAN.md` | Modified | +1 D-079 entry row |
| `.planning/expansions/stage-f1-knowledge-graph-auth-wave-e-EXPANDED-SCOPE.md` | Modified | §Plan E-1 section rewritten |
| `.planning/phases/stage-f1-knowledge-graph-auth-wave-e/E-1-vendor-pii-narrow-PLAN.md` | Replaced | This file (~7 KB) |

Total: 0 source files. 4 planning artifacts (1 new + 3 modified).
