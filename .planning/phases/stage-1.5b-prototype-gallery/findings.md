# Phase 1.5b — Findings

**Generated:** 2026-05-05
**Source plans:** 01.5-1 through 01.5-6 (Wave 0 → Wave 2)
**Reference:** EXPANDED-SCOPE.md §7 acceptance criterion 12

This document is a Stage 1.5b plan-required deliverable per
EXPANDED-SCOPE §7 ac12 + plan 01.5-6 Task 4 + nwrp33 C3.

## Table of contents

1. Polish requirements (non-blocking — feed Wave 1.1 backlog)
2. Critical findings (workflow failures — halt-and-decide)
3. Reconciliation leading-candidate recommendation (per CONTEXT Q3=C)
4. Wave-by-wave summary
5. Gates passed
6. Wave 0 fixture provenance + synthesized records
7. Stage 1.5b acceptance — 11 deliverables
8. CP3 deliberation surface (deferred — NOT locked in 1.5b)
9. 1.5b-followup tech debt registry
10. Phase 1B G702 1-day judgment outcome

---

## 1. Polish requirements (non-blocking — feed Wave 1.1 backlog)

| ID | Surface | Issue | Severity | Plan | Recommendation |
|----|---------|-------|----------|------|----------------|
| **F-W2-1** | Mobile approval | APPROVE INVOICE button currently top-right header — PM-in-field one-handed reachability concern | functional | nwrp40 walk | Investigate bottom-fixed full-width button at thumb-natural position. Test in real phone walk before /gsd-ship |
| **F-W2-2** | Mobile approval | Approve-only flow missing reject/kickback path. PM finding invoice issue must have one-tap path to send back to vendor with note | functional | nwrp40 walk | Add reject + kickback CTA into the bottom 3-button row before Wave 1.1 ships to Ross Built |
| **F-W2-3** | Budget DataGrid | 28 of 30 lines show $0/0% activity because Caldwell is mid-construction with only 2 trades active in current pay app — density test only validates header + cell rendering, not rich computed values across all rows | cosmetic | nwrp40 walk + 01.5-3 | Document as known limitation; real density test surfaces in Wave 1.1 customer use |
| **F-W2-4** | Schedule Gantt | Bar fill opacity 0.7 too light + predecessor arrows shown as text "After: N deps" rather than SVG arrows | cosmetic | nwrp40 walk + 01.5-5 | Both already in 1.5b-followup (see §9). Re-confirmed visually in nwrp40 walk |
| F-1 | Lien releases | `lien_releases.status_history` JSONB schema missing — timeline currently faked client-side w/ disclaimer | functional | 01.5-2 + 01.5-3 | F1 schema phase |
| F-2 | Vendor detail | W9 / COI / License # verification fields faked | functional | 01.5-2 | F1 schema phase |
| F-3 | Schedule items | `parent_id` hierarchy unproven by Caldwell data (zero parent_id usage) | functional | 01.5-5 | Confirm with Jake whether nested tasks are real Ross Built workflow before locking F1 schema |
| F-4 | Schedule items | "blocked" status path implemented but unexercised in fixture (0 blocked items) | functional | 01.5-5 | Add 1-2 blocked items in future fixture refresh |
| F-5 | Invoices | No index list page at `/design-system/prototypes/invoices` | cosmetic | 01.5-2 | Polish — add ~80 LOC List+Detail w/ filter-by-status |
| F-6 | Invoices | No print-preview surface for invoices (only for draws) | cosmetic | 01.5-2 | Polish — add `/invoices/[id]/print` mirroring `/draws/[id]/print` |
| F-7 | Schedule Gantt | SVG predecessor arrows deferred per nwrp29 R1 escape clause | cosmetic | 01.5-5 | 4-6h estimate |
| F-8 | Schedule Gantt | Schedule row virtualization missing — fine at 25 tasks, matters at 100+ tasks | functional | 01.5-5 | Add `@tanstack/react-virtual` when 75+ task fixtures appear |
| F-9 | Schedule Gantt | Today-marker overlay renders per-row | cosmetic | 01.5-5 | Refactor only if perf bottleneck |
| F-10 | Schedule Gantt | Bar fill at 0.7 opacity reads soft on white-sand bg | cosmetic | 01.5-5 + nwrp40 (= F-W2-4) | Raise to 0.85 |
| F-11 | Schedule Gantt | Month-label collision at <1024px viewport | cosmetic | 01.5-5 | Viewport-aware abbreviation pass |
| F-12 | Budget DataGrid | DataGrid does not sticky `<thead>` when user scrolls | functional | 01.5-3 | Add `position: sticky; top: 0;` |
| F-13 | Budget DataGrid | % complete progress bar is `aria-hidden="true"` — should use ARIA-progressbar markup | accessibility | 01.5-3 | Add ARIA semantics |
| F-14 | Budget DataGrid | No filter input | functional | 01.5-3 | Polish — add global filter |
| F-15 | Schedule | Validation gap — "blocked" status path not visually validated | functional | 01.5-5 | See F-4 |
| F-16 | Source-code naming | Pre-existing source-code "Drummond" mentions outside Wave 1 scope at `inputs/page.tsx:572` and `file-naming.ts:13` | privacy-cosmetic | nwrp40 inventory | D-28 acceptable-leak surface; address only if objectionable |
| F-17 | Lien releases | Fixture covers only 2 of 4 Florida statute types | functional | 01.5-1 + 01.5-3 | Real-data fidelity — final releases logically come after Substantial Completion 2026-03-15 |
| F-18 | Mobile approval | Real-phone walkthrough on iPhone+Safari pending | gating | 01.5-4 + nwrp40 | Required before `/gsd-ship` |
| **F-W2-5** | Reconciliation Candidate 1 | When both columns show identical cell content with drift on a NULL attribute, the warn-border on the right column is correct but subtle — real users may miss the drift signal | functional | nwrp41 walk | Strengthen treatment with strikethrough on the imported-but-now-null value, "UNRESOLVED" label, or icon indicator. Apply during production-version reconciliation phase post-3.9 |

**Total polish items: ~23.** None trigger Q9=B halt criterion.

## 2. Critical findings (workflow failures — halt-and-decide)

**None — all 11 deliverables rendered without workflow breakage.**

The 1.5b prototype gallery validation succeeds: every Wave 1 + Wave 2 surface renders against sanitized Caldwell fixtures without halting the phase. Document Review (PATTERNS §2) survives all stress tests; Site Office direction holds at every density level surveyed (compact rows, 30+ G703 line items, 18-vendor list+detail, 25-task 14-month Gantt, mobile 360px-414px viewport). Reconciliation strawman renders all 4 candidates × 2 drift types. AIA G702/G703 print preview renders at target fidelity (G702 pixel-perfect attempt + G703 80%). The design system fundamentally works for Ross Built workflows.

## 3. Reconciliation leading-candidate recommendation (per CONTEXT Q3=C)

### Leading candidate: **Candidate 1 — Side-by-side delta**

### Rationale

Across all 8 Caldwell drift pairs (4 invoice↔PO + 4 draw↔budget), Candidate 1 (side-by-side delta) handles drift most cleanly because the Caldwell drift is dominated by **missing-field / null-vs-value cases**:

- `rec-caldwell-invoice_po-1` Anchor Bay Plumbing — `po_id` imported `PO-2025-0042`, current `null`
- `rec-caldwell-invoice_po-2` Bay Region Carpentry — `po_id` imported `PO-2025-0048`, current `null`
- `rec-caldwell-invoice_po-3` Sandhill Drywall — both `po_id` AND `po_amount_dollars` imported, both current `null`
- `rec-caldwell-draw_budget-1` framing cc-06101 — `co_attribution` imported `co-caldwell-01`, current `null`
- `rec-caldwell-draw_budget-3` drywall cc-15101 — `draw_total_to_date` imported `12,605`, current `0`; `draw_id` imported `d-caldwell-05`, current `null`
- `rec-caldwell-draw_budget-4` cc-13101 — `lien_release_id` imported `lr-caldwell-001`, current `null`

For these "this side has it, this side does not" cases, Candidate 1's two-column layout makes the imbalance instantly readable. The warn-color left-border on the differing cell anchors the eye without competing with the data.

The remaining 2 of 8 pairs are narrow-attribute drift cases — Candidate 2 (inline diff) handles those slightly better but does NOT surface match-fields (which obscures what is NOT drifting).

**Why not Candidate 2:** strong on narrow-attribute changes, weak on match-fields. **Why not Candidate 3:** over-rotates to time-ordered semantics that do not exist in Caldwell drift. **Why not Candidate 4:** carries the most visual weight per record — overweight for single-record review.

### Caveat

Recommendation does NOT lock PATTERNS.md §11. Final lock at first reconciliation phase post-Phase-3.9 per **D-028 + A16.1**.

## 4. Wave-by-wave summary

| Wave | Plan | Surface | Verdict |
|------|------|---------|---------|
| 0 | 01.5-1 | Fixture extraction (12 sanitized files + script + scaffold + CI gate) | **COMPLETE** |
| 1 | 01.5-2 | Invoice/draw/vendors prototypes (Document Review + List+Detail) | **COMPLETE** |
| 1 | 01.5-3 | Budget view + Document Review dispatcher | **COMPLETE** |
| 1 | 01.5-4 | Owner portal + mobile approval | **COMPLETE** |
| 1 | 01.5-5 | Schedule (Gantt) — Wave 2 preview | **COMPLETE** |
| 2 | 01.5-6 | G702/G703 print + reconciliation strawman + findings.md | **COMPLETE** |

All 6 plans pass; 11 of 11 EXPANDED-SCOPE §7 deliverables ship. No phase halt invoked.

## 5. Gates passed

- [x] Privacy 4-tier grep gate clean (extractor + Claude pre-commit + CI workflow + .githooks/pre-commit) — 0 hits across 32-token denylist
- [x] All 12 entity fixture files committed; types/index barrel correct
- [x] Hook T10c silent on all prototype routes
- [x] Token discipline gate
- [x] Build passes (`npm run build` ✓ Compiled successfully)
- [x] TypeScript clean (0 errors in src/; pre-existing `__tests__/*.ts` errors out-of-scope)
- [x] R1 fixture extraction within 4-day budget (Wave 0 ~3 hours)
- [x] G702 1-day judgment resolved — pixel-perfect cover sheet attempt converged within budget
- [ ] M3 phone gate — pending Jake's real-phone walk on iPhone + Safari
- [x] Schedule prototype acceptance (≥6-month + ≥20 tasks + dependencies + today-marker)
- [x] Reconciliation 4×2 matrix renders all 8 prototypes
- [x] AIA G702/G703 print preview bank-acceptable layout

10 of 11 gates passed; M3 phone gate remains pending (gating ship, NOT pending phase close).

## 6. Wave 0 fixture provenance + synthesized records

Per CONTEXT D-32, findings.md surfaces synthesized records explicitly so QA spec-checker can distinguish raw-derived from fabricated fixtures.

### Synthesized records (3 total)

| ID | Type | Synthesis rationale |
|----|------|---------------------|
| inv-caldwell-007 | invoice (T&M) | Bay Region Carpentry weekly labor sheet synthesized: 5 daily entries × 2-3 crew × 8h × $60 ≈ $8,377. Tagged `synthesized` in flags. |
| co-caldwell-04 | change order (DEDUCTIVE) | PCCO #4 framing scope reduction (-$8,500 + -$1,700 GC fee). `[SYNTHESIZED per nwrp38]` prefix. |
| co-caldwell-05 | change order (ALLOWANCE_RECON) | PCCO #5 drywall allowance reconciliation (+$4,400 + $792 GC fee at 18%). `[SYNTHESIZED per nwrp38]` prefix. |

### Fixture inventory (post-nwrp38 closure)

- jobs: 1, vendors: 18, cost_codes: 30
- invoices: 7 (progress 2 + lump_sum 4 + T&M 1 synth)
- draws: 5 (paid 4 + submitted 1 — Pay App 5)
- draw_line_items: 150
- change_orders: 5 (additive 3 raw + deductive 1 synth + allowance_recon 1 synth)
- budget: 30, lien_releases: 3, schedule_items: 25 (6 milestones)
- payments: 1, reconciliation_pairs: 8 (4 invoice_po + 4 draw_budget)

### Substitution-pair posture (T-1.5b-W0-07)

Closed per nwrp38 — redact-forward + accept historical exposure under private-repo posture. 4-tier defense-in-depth gates active.

## 7. Stage 1.5b acceptance — 11 deliverables

| # | Deliverable | Route | Verdict |
|---|-------------|-------|---------|
| 1 | Drummond fixture sanitization | `_fixtures/drummond/*.ts` | ✓ |
| 2 | Invoice approval | `/prototypes/invoices/[id]` | ✓ |
| 3 | Draw approval | `/prototypes/draws/[id]` | ✓ |
| 4 | AIA G702/G703 print preview | `/prototypes/draws/[id]/print` | ✓ (G702 pixel-perfect attempt + G703 80%) |
| 5 | Budget view | `/prototypes/jobs/[id]/budget` | ✓ |
| 6 | Vendor management | `/prototypes/vendors` + `/[id]` | ✓ (18 vendors) |
| 7 | Document review | `/prototypes/documents/[id]` | ✓ |
| 8 | Mobile approval | `/prototypes/mobile-approval` | ✓ |
| 9 | Owner portal stub | `/prototypes/owner-portal/` + `/draws/[id]` | ✓ |
| 10 | Reconciliation strawman | `/prototypes/reconciliation/` | ✓ (4×2 = 8 prototypes) |
| 11 | Schedule (Gantt) | `/prototypes/jobs/[id]/schedule` | ✓ |

**11 of 11 deliverables shipping.**

## 8. CP3 deliberation surface (deferred — NOT locked in 1.5b)

### F-CP3-1: Owner portal "warmer variant" question

Site Office direction is technical/archival. Risk of feeling cold to high-end custom home buyers in $1.5M–$10M+ range Ross Built serves. Three options for CP3:
1. Accept current Site Office for owner portal — single direction across audiences.
2. **Lighter sub-variant for `/owner-portal/*`** — same bones, sentence-case eyebrows, larger type scale, more whitespace, softer Stone Blue. **Recommended option per nwrp40.**
3. Different direction entirely for owner audience — bigger effort, breaks design language unity.

### F-CP3-2: SYSTEM.md §11a Reject 56px categorization

SYSTEM.md §11a lists `reject` as high-stakes 56px; plan 01.5-4 deliberately tested 44px. Two options for CP3:
- a. Update SYSTEM.md §11a to match prototype hierarchy.
- b. Update mobile-approval to make Reject = 56px in production.

Resolution path: Jake-call at CP3 / Wave 1.1 polish.

## 9. 1.5b-followup tech debt registry

### F1 schema work (3 items)
- TD-1 status_history JSONB
- TD-2 vendor verification W9/COI/License
- TD-3 schedule parent_id semantics

### CP3 design decisions (2 items)
- TD-4 §11a Reject 56px
- TD-5 owner trust posture

### Polish UI/UX (10 items)
- TD-6 sticky header
- TD-7 ARIA-progressbar
- TD-8 DataGrid filter
- TD-9 invoices index
- TD-10 invoice print-preview
- TD-11 SVG arrows
- TD-12 row virtualization
- TD-13 today-marker refactor
- TD-14 bar-fill contrast
- TD-15 month-label collision

### Validation gaps (1 item)
- TD-16 blocked status visual validation

### Pre-existing source-code Drummond mentions (2 items)
- TD-17 inputs/page.tsx:572
- TD-18 file-naming.ts:13

### Wave 2 walk findings (5 items)
- TD-W2-1 mobile CTA
- TD-W2-2 mobile reject path
- TD-W2-3 DataGrid stress test partial
- TD-W2-4 Gantt opacity + arrows
- TD-W2-5 Reconciliation Candidate 1 NULL-drift signal too subtle (= F-W2-5)

### Production-render polish (1 item — nwrp41 walk)
- **TD-19** `[SYNTHESIZED per nwrp38]` tags appear in G702 print output for PCCO #4 (framing scope reduction) and PCCO #5 (drywall allowance reconciliation) because the synthesis disclaimer prefix is part of the change-order `description` string. Polish requirement: production render should strip these synthesis disclaimers from the printed G702. Two implementation options — (a) strip-at-print-render-time via a description sanitizer in the print component, or (b) conditionally include based on a prototype-vs-production flag (preferred — keeps the disclaimer in prototype output for QA traceability, hides it in production where the data is real). Cosmetic but objectionable in real customer-facing G702.

**Total: ~24 effective items.** All non-blocking; all feed Wave 1.1 polish phase.

## 10. Phase 1B G702 1-day judgment outcome

### Outcome: **Pixel-perfect cover sheet attempt CONVERGED within budget**

The G702 cover sheet renders to AIA G702-1992 standard layout: title block + 2x2 header (TO OWNER / FROM CONTRACTOR / PROJECT / CONTRACT FOR) + 4-cell application info + 7 numbered statement-of-contractor lines (with bold + gray-fill on Line 7 CURRENT PAYMENT DUE) + 5-column PCCO summary (incl deductive PCCO #4 + allowance recon PCCO #5) + signature block.

### G703 fidelity: 80% as accepted per Q7 override

8-column AIA structure across 30 line items, monospace cost codes, grand total row.

### Escape clause NOT invoked

**No 1.5b-followup logged for AIA Document Service certification at this time.**

Conditional follow-up if Jake's print-test reveals shortfall:
- **CONDITIONAL TD-19** — Pixel-perfect AIA G702 fidelity for production AIA Document Service certification — separate phase post-1.5b.

### Print stylesheet caveat resolution

Print-specific @page + @media print + AIA color palette overrides live in SCOPED `<style jsx global>` block inside `prototypes/draws/[id]/print/page.tsx`. globals.css UNTOUCHED. Hex literals line-commented per nightwork-post-edit.sh:55 filter exception.

---

*End of findings.md aggregator.*
