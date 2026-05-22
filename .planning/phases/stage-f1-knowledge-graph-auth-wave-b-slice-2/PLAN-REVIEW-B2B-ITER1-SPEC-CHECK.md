# Spec check - B-2b plan-review iter-1

**Plan:** B-2b-PLAN.md (1846 lines; revised 2026-05-22)
**Reviewer scope:** LEANER 5-reviewer per nwrp209 §10
**Generated:** 2026-05-22

---

## Acceptance criteria

| # | Criterion | Verdict | Evidence |
|---|-----------|---------|----------|
| AC-B2b-01 | Migration 00106 partial unique index on activity_log; IF NOT EXISTS guard | COVERED | PLAN:1553 + §6.c:927-959 + Task 1:1341-1360; verify SQL PLAN:1592-1599; maps to D-19, M-01, SYNTHESIS B-12 |
| AC-B2b-02 | /owner/{token} renders main[data-prototype=owner-dashboard] via getScopedOwnerPortalClient; soft-delete+status filters; tenant-blind primitive UNTOUCHED | COVERED | PLAN:1557 + §6.a:554-716; BLK-3 code:703-715; verify PLAN:1601-1624; D-01,D-06,D-22 |
| AC-B2b-03 | /owner/{token}/pay-apps/{id} renders main[data-prototype=owner-draw]; assertDrawBelongsToToken cross-validates; cross-client probe notFound() | COVERED | PLAN:1558 + §6.a:719-788; PLAN:753; verify PLAN:1626-1635; D-02,D-07,D-17 |
| AC-B2b-04 | Error boundary link-no-longer-valid UX; no information disclosure | COVERED | PLAN:1559 + §6.a:519-552; verify PLAN:1637-1649; D-04,T-B2b-05 |
| AC-B2b-05 | POST acknowledge-pay-app returns 200; correct activity_log shape; BLK-1 middleware PUBLIC_PATHS; append-only | COVERED | PLAN:1563 + §6.b:793-923; BLK-1 PLAN:380-397; verify PLAN:1651-1674; D-10,D-15,D-16; SYNTHESIS B-13 |
| AC-B2b-06 | TOCTOU concurrent double-tap exactly 1 audit row; both POSTs 200 | COVERED | PLAN:1564 + §6.c:927-959; ON CONFLICT:1022-1042; verify PLAN:1677-1700; D-19,D-20,D-21; SYNTHESIS B-12 |
| AC-B2b-07 | ClientCombobox shadow-var(--shadow-panel); inline style removed; NOTE-1 font-display on layout+error | COVERED | PLAN:1568 + §6.e:1046-1093; verify PLAN:1705-1717; D-23,D-24,D-25; SYNTHESIS B-15 |
| AC-B2b-08 | Acknowledge CTA >=56px via TD-20 exemption raw button + minHeight:56px | COVERED | PLAN:1569 + §6.f:1096-1134; verify PLAN:1720-1728; D-26,D-27,D-31; SYNTHESIS B-16 |
| AC-B2b-09 | Mobile viewport: iPhone 13/14/15 Pro Max + Pixel 7; no horizontal scroll; safe-area | COVERED | PLAN:1573 + §6.h:1292-1313; verify PLAN:1732-1739; D-12,D-13,D-14; criteria V-01 |
| AC-B2b-10 (GATE) | Runtime revocation: 5-step Playwright probe on Vercel preview; HALT-before-ship if Step 4 fails | COVERED | PLAN:1577-1584 + Task 8:1522-1543; verify PLAN:1742-1751; D-28,D-29; HALT explicit per nwrp209 §3; criteria B-04 |

All 10 ACs have pinned verification commands in §9. No AC is defer-to-execute-only.

---

## criteria block

PRESENT. Block spans PLAN:122-215. All 5 required categories populated per D-17/D-18 mandate.

| Category | IDs | Verdict |
|---|---|---|
| mechanical | M-01, M-02, M-03, M-04 | query: + expected: present on all 4. PASS |
| dom | D-01, D-02, D-03, D-04 | selector: + expected: present on all 4. PASS |
| visual | V-01, V-02, V-03 | setup:/query: + expected: present on all 3. PASS |
| behavioral | B-01, B-02, B-03, B-04 | setup: + expected: on all 4; B-04 is explicit HALT gate. PASS |
| semantic | S-01, S-02 | file: + expected: with grep patterns on both. PASS |

No N/A entries. D-17/D-18 mandate satisfied.

---

## B-12..B-16 closures verified

| Finding ID | PLAN trace | AC mapping | Verdict |
|---|---|---|---|
| B-12 (TOCTOU duplicate rows) | D-19+D-20+D-21; 00106 migration; ON CONFLICT DO NOTHING; resolution table PLAN:301 | AC-B2b-06; criteria B-03 | CLOSED |
| B-13 (append-only audit, no expected_updated_at) | D-16; resolution table PLAN:302; logActivity PLAN:908-918 no optimistic-lock; out-of-scope PLAN:247 | AC-B2b-05; criteria B-02 | CLOSED |
| B-14 (missing deleted_at + status filters) | D-22; resolution table PLAN:303; code PLAN:691-693, PLAN:759-764 | AC-B2b-02+AC-B2b-03; criteria B-01 | CLOSED |
| B-15 (--shadow-popover non-existent) | D-24; resolution table PLAN:304; code PLAN:1083-1088 shadow-var(--shadow-panel); colors_and_type.css:61 cited | AC-B2b-07; criteria S-02 | CLOSED |
| B-16 (NwButton no 56px variant) | D-26+D-27; resolution table PLAN:305; §6.f PLAN:1099-1132; TD-20 exemption + minHeight:56px | AC-B2b-08; criteria D-04+V-03 | CLOSED |

---

## Locked decisions integrity

- B-2a security model not re-litigated: §2 out-of-scope block PLAN:240-248; PLAN:308 confirms B-1..B-11 RESOLVED in B-2a.
- No new PATTERNS.md entry (B-17 RESOLVED): §6.g PLAN:1136-1143 cites §4h.3+§2j.3; resolution table row PLAN:306.
- nwrp209 §3 forward-carried gate: AC-B2b-10 labelled LOAD-BEARING GATE at PLAN:1577; HALT condition explicit at PLAN:1583-1584; D-29 in B-2b-CONTEXT.md:94.
- §4h.3+§2j.3 cited: frontmatter source_decisions PLAN:25-26; §6.g text PLAN:1140-1141.

---

## Domain rules spot-check

- Drummond fixtures used: N/A for B-2b execute. Smoke seed uses synthetic harness-fixture-org UUIDs per CLAUDE.md convention. PASS.
- Recalculate-not-increment honored: activity_log is append-only INSERTs; no stored running totals in B-2b scope. PASS.
- Multi-tenant RLS posture: no new RLS policies; portal queries route through getScopedOwnerPortalClient from B-2a; N-5 grep gate at PLAN:328, 1609-1612, 1823. PASS conditional on grep.
- Design tokens (no hardcoded colors): V-02 criterion PLAN:180-182 greps 10 hook categories on B-2b files; NOTE-1 removes inline fontFamily; §6.e removes inline boxShadow. PASS conditional on V-02.
- Audit log on every state change: acknowledge endpoint writes activity_log unconditionally on valid request. PASS.

---

## Findings

### BLOCKING

None.

### WARNING

1. **AC-B2b-03 cross-client probe requires Smoke Client B fixture.** Verification command PLAN:1627-1635 references a draw belonging to a second client in harness-fixture-org. smoke-seed.sql Step 8 (PLAN:1156-1257) seeds only Smoke Client A + 1 draw. No Smoke Client B draw is seeded. At execute time, executor must either (a) extend Step 8 with a second client+draw fixture, or (b) document an existing harness-fixture-org draw belonging to a different job/client scope. Resolve before QA.

2. **font-mono to JetBrains Mono mapping deferred to execute.** PLAN:1091 notes verify at execute time; if font-mono does not map to JetBrains Mono, fall back to font-[var(--font-jetbrains-mono)]. S-02 criterion expects one or the other. Executor must not ship with font-mono silently mapping to a different font family.

### NOTE

1. **draw={drawRow as any} cast in OwnerPayAppPage code sample.** PLAN:777 uses as any with omitted-for-brevity comment. NOTE-2 fix requires explicit field-by-field mapDbDrawToCaldwell on the dashboard page (PLAN:632-656). Executor must apply the same mapping to the pay-app page and remove the as any cast before the TypeScript compile gate (criteria M-03: npx tsc --noEmit passes).

2. **b-2b-toctou-probe.ts + b-2b-touch-target-probe.ts not in files_modified.** PLAN:1489, PLAN:1724 reference these as NEW scripts. Neither appears in frontmatter files_modified (PLAN:31-60). Likely intentional. Custodian should verify both are git-tracked after execute.

---

## Verdict

**PASS**

10/10 ACs falsifiable with pinned verification commands. criteria block present with all 5 categories (D-17/D-18 mandate satisfied). B-12 through B-16 all traced to ACs and D-NN decisions. Locked decisions integrity confirmed. 5-reviewer scope correctly noted in frontmatter. No new BLOCKING findings vs plan-checker iter-1. Two WARNINGs are execute-time concerns that do not block plan dispatch.
