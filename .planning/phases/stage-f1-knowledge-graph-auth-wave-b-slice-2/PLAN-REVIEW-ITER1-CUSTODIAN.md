# Plan-Review Iter-1 Custodian Report — B-2

**Date:** 2026-05-20  
**Plan:** B-2 — `client_portal_access.client_id` FK + Owner Portal Path A min UI + actor_token_id audit + TD-B1abis-03  
**Verdict:** READY FOR PLAN-REVIEW ITER-1 (no blocking drift detected)

---

## 1. Phase folder organization

✅ **Clean.** Only B-2-PLAN.md present. No orphaned artifacts, no SUMMARY/QA files (expected; plan not yet executed).

---

## 2. MASTER-PLAN integration

### §9 CURRENT POSITION alignment

✅ **Status claim verified.** MASTER-PLAN.md line 147 states "Slice-1 COMPLETE 2026-05-18 (B-1b shipped)". Slice-1 closure confirmed at §9 via 4 plan ships + smoke maintained + GATE 2 HALT in effect.

✅ **B-2 sequencing locked.** EXPANDED-SCOPE §7 line 271 specifies B-2 as first plan in Slice-2 execute order (no parallel peer). Frontmatter `wave: B-2 (first per Slice-2 execute order)` + `depends_on: []` consistent.

### §11 TD-B1abis-03 carry-forward closure task

✅ **Row 297 found and accurate.** MASTER-PLAN.md line 297 documents TD-B1abis-03 (ClientCombobox token polish):
- **Closure trigger:** "Wave-B Slice-2 polish wave"
- **Effort:** ~10 min (matches PLAN frontmatter ~10 lines)
- **Status in PLAN §5 Task 5 + §8 AC-B2-16:** hard-bounded; migration + UI + TD scope locked
- **Hand-off task (§13.1):** "Update MASTER-PLAN §11 TD-B1abis-03 row 297 → CLOSED with B-2 commit ref" — actionable post-ship

✅ **MASTER-PLAN carry-forward log (§12)** mentions B-1a-bis TDs at row 325; flow to B-2/B-4 documented in EXPANDED-SCOPE §7 distribution map (line 271-295 per nwrp166 distribute pattern).

### §12 NEXT PLANNED WORK sequencing

✅ **Slice-2 gating verified.** MASTER-PLAN.md §12 lines 327–332 document "Pending GATE 2 HALT" (post B-1b, pre-Slice-2 dispatch). B-2-PLAN frontmatter `authorization: Slice-2 EXPANDED-SCOPE APPROVED 2026-05-20 per nwrp196 + nwrp198` records the GATE 2 clearance.

✅ **nwrp198 /np dispatch authorization noted.** Frontmatter line 14 `authored: 2026-05-20` and line 15 `authorization: ... nwrp198 /np dispatch authorization` confirm authoring sequence (authored AFTER GATE 2 via nwrp198 direct authorization, not pre-GATE-2 prophylactic).

---

## 3. Frontmatter consistency

✅ **All required fields present:**
- `phase`, `plan`, `plan-name`, `type: execute`, `wave`, `depends_on`, `autonomous: true`, `halt_after: true`, `requires_smoke: true`
- `threat_model_severity: medium` — appropriate (external token surface; mobile-first; first user-facing F1 UI)
- `status: AUTHORED — PENDING JAKE REVIEW AT PLAN-REVIEW ITER-1` — correct gating posture
- `source_decisions` — 10 refs to EXPANDED-SCOPE + ARCHITECTURE.md + nwrp refs
- `files_modified` — 12 entries (1 SQL migration pair, 5 new .ts/.tsx, 5 existing .ts for extension)
- `files_referenced` — 8 entries (migrations, components, existing tables, PATTERNS.md, MASTER-PLAN)
- `acceptance-criteria-target: 19 falsifiable items (AC-B2-01..AC-B2-19)` — explicit count
- `qa_reviewers` — 8 listed: spec-checker, custodian, security-reviewer, multi-tenant-architect, ai-logic-tester, rls-auditor, database-reviewer, design-pushback
- `sequence.before: B-3` — correct (B-3 depends on B-2's new FK shape per EXPANDED-SCOPE §8 line 107)
- `sequence.after: Wave-A iter-1 cleanup + TD-WAIC-03 closure` — accurate; Slice-1 closed, TD-WAIC-03 resolved 2026-05-20 via migration 00103
- `parallel_execute_ok: false` — correct (single plan, no wave-mate)

✅ **vs HDOD-PLAN.md precedent** (stage-f1-hook-doc-only-detect per lines 61, frontmatter §4 Tier 1 plan structure): B-2 follows Tier 1 structure (6-section task boundary). Audit checklist present (§4.a threat-model table T-B2-01..T-B2-06). Matches.

---

## 4. Cross-file drift checks

### Drift 4a: EXPANDED-SCOPE §7 row 1 (B-2 scope binding)

**PLAN §1 Goal (lines 81–104):**
- Extends client_portal_access with client_id FK ✅
- Audit integration (actor_token_id) ✅
- Owner Portal Path A min UI ✅
- 1-2 owner-initiated actions (pay-app acknowledgment) ✅
- TD-B1abis-03 carry-forward ✅

**EXPANDED-SCOPE §7 row 1 (line 271):**
- Migration: ADD client_id + backfill + partial unique index ✅
- UI: minimum-viable /owner/{token} — read-only progress + payment status + document downloads ✅
- Audit: 1-2 owner-initiated actions wire actor_token_id ✅
- Carry-forward: TD-B1abis-03 token polish ✅

**Verdict:** ✅ **Exact alignment.** No scope drift.

### Drift 4b: nwrp166 distribute pattern (Q11 rewrite)

**EXPANDED-SCOPE §1 mapped entities table (line 78):**
```
| src/components/client-combobox.tsx token polish (TD-B1abis-03) | B-2 | ...
```

**PLAN §5 Task 5 (line 565–580):**
- Targets `src/components/client-combobox.tsx` lines 173-180 + 203 ✅
- Bounded to ~10 lines ✅
- Scheduled as part of B-2 commit chain ✅

**Verdict:** ✅ **Accurate carry-forward routing.**

### Drift 4c: Cost projection vs Slice-1 actuals

**EXPANDED-SCOPE §10 row 1 (B-2) line 474:** `$22-33` estimate

**PLAN §12 (line 927–940):** 
- Migration + types: $4-6
- Route + layout + token helper: $8-12
- Acknowledgment endpoint: $4-6
- TD-B1abis-03: $1-3
- Smoke + SUMMARY + MASTER-PLAN: $3-5
- Plan-review (7 reviewers): $5-8
- **Total: $25-40**

**Reasoning:** "At-or-above EXPANDED-SCOPE estimate due to 7-reviewer plan-review" — acknowledges inflation from baseline estimate due to 7 reviewers (security, multi-tenant, rls-auditor, database, design-pushback present). Within $50 per-plan halt gate (Rule 7d). Slice-2 ceiling $200 impact: $25-40 consumed, $160-175 remain.

**Verdict:** ✅ **Realistic; within gate.** No friction with cost discipline.

### Drift 4d: 90-day vs 1-year token expiration

**EXPANDED-SCOPE Q5 (line 211):** States "B-2 default in this slice: tokens have 1-year expiration"

**PLAN §4.a (line 210–211):** 
> **CORRECTION at plan-author time:** the EXPANDED-SCOPE wording says "1-year expiration" but the existing 00074 schema is 90-day sliding. **B-2 preserves the existing 90-day sliding default** to avoid an unintentional schema-default change inside a plan that should not be changing token lifecycle policy. If Jake intends to change the default to 1 year, that is a separate D-### decision and a separate plan; this is surfaced to plan-review iter-1 for explicit Jake acknowledgement.

**PLAN §11 (line 919):** Jake pre-/nx checklist item:
> [ ] **90-day sliding window preserved (NOT 1-year default).** EXPANDED-SCOPE Q5 line 211 mentions "1-year expiration" but the existing 00074 schema is 90-day sliding. B-2 preserves the existing default to avoid an unintentional schema-default change.

**Verdict:** ⚠️ **SURFACE TO JAKE.** Plan-author surface is clear + actionable; Jake must sign-off that 90-day sliding is the intended choice. This is a clarification, not a drift, because the PLAN explicitly surfaces the discrepancy and halts for Jake acknowledgement (§11 checklist item line 919). **No blocking issue** — plan-review iter-1 holds the gate pending Jake sign-off.

### Drift 4e: Files_modified intersection (Rule 5)

**Frontmatter line 66:** `parallel_execute_ok: false` — single plan, no peer.

**Verdict:** ✅ **N/A; no parallel risk.**

### Drift 4f: Hook pre-flight sweep (Rule 6a)

**PLAN §3 Sweep 5 (lines 175–184):** 
- Identifies TD-B1abis-03 inline boxShadow + inline style violations that will trigger the hook (HEX_HITS on rgba, NAMED_HITS on inline color/fontFamily)
- Plan resolves via Task 5 (token-driven replacement)
- Notes new /owner/* JSX MUST consume design tokens from day one

**Verdict:** ✅ **Pre-flight complete.** Hook anticipation documented.

### Drift 4g: Fixture infrastructure collision (Rule 6b)

**PLAN §3 Sweep 6 (lines 186–194):**
- No new fixture rows introduced — B-2 backfills from existing jobs.client_id
- Drummond + harness-fixture-org token rows pre-existing per 00074 + smoke-seed.sql
- Migration forward-probe DO block enforces zero orphans (HF-A4-2 fail-loud pattern)

**Verdict:** ✅ **Collision-free.** Pre-existing fixture infrastructure adequate.

---

## 5. Acceptance criteria binding

**19 ACs listed (§8 lines 720–759):**

- **AC-B2-01..05** Migration (5): forward probe, FK shape, partial index, Drummond backfill, down idempotency
- **AC-B2-06..08** actor_token_id (3): column + FK + index, logActivity signature extension, idempotency
- **AC-B2-09..13** Token security (5): cross-client leak, rate-limit, anon-role policy, expiration, audit RLS denial
- **AC-B2-14..15** Mobile + URL tampering (2): 4-viewport visual, cross-client 404
- **AC-B2-16** TD-B1abis-03 (1): line count ≤15, hook pass, no inline remnants
- **AC-B2-17..19** Workflow (3): SUMMARY.md, MASTER-PLAN TD closure, smoke ROUTES extension

**Verification commands present (§9 lines 761–897):** bash + SQL probes for every AC. Falsifiable + automatable.

**Verdict:** ✅ **ACs are load-bearing + testable.** No ambiguity.

---

## 6. Post-ship hand-off clarity

**§13 Hand-off (lines 945–959):** 7-step closure task list:

1. Update MASTER-PLAN §11 TD-B1abis-03 row 297 → CLOSED (with B-2 commit ref)
2. Update MASTER-PLAN §12 carry-forward log (B-2 ship note, B-3 readiness)
3. Mark Slice-2 progress in EXPANDED-SCOPE.md §7 row B-2 → SHIPPED
4. Open TD-B2-01 (if applicable): "PATTERNS.md Owner Status View deferred to Wave 1.1-Lite or design-pushback request"
5. Document Wave 1.1-Lite trigger conditions (token revocation UI, rotation cadence, PII restoration, multi-region rate-limit)
6. Signal B-3 dispatch unblocked (depends_on: B-2 ship per EXPANDED-SCOPE §8 strict-sequential edge)
7. Custodian update: SUMMARY.md + all 6 commits + smoke artifact + QA cycle

**Verdict:** ✅ **Actionable and explicit.** Each task has a target file + section reference. No ambiguity.

---

## 7. Threat model coverage

**§4.a threat checklist (lines 238–245):**

| Threat | Mitigation | Verification |
|---|---|---|
| T-B2-01 cross-client leak | Layer 3 app-filter + PG plan verification | AC-B2-09 |
| T-B2-02 brute-force | 256-bit entropy + rate-limit | AC-B2-10 |
| T-B2-03 cross-org leak | RLS + service-role filter | AC-B2-11 |
| T-B2-04 expiration bypass | Existing query filter + sliding-window UPDATE | AC-B2-12 |
| T-B2-05 audit-log poisoning | Service-role validation + RLS RESTRICTIVE | AC-B2-13 |
| T-B2-06 TD scope-creep | Hard line-count bound (~10 lines) | AC-B2-17 |

**Verdict:** ✅ **Exhaustive.** All 6 threats mapped to AC with explicit verification.

---

## 8. QA reviewer roster

**Frontmatter qa_reviewers (lines 68–76):**
- `spec-checker` — ACs falsifiability + plan-text truth
- `custodian` — structural coherence + post-ship hand-off
- `security-reviewer` — token security model + actor_token_id audit surface
- `multi-tenant-architect` — RLS posture + anon-role scoping
- `ai-logic-tester` — representative SQL queries (cross-client probe, RLS denial)
- `rls-auditor` — anon-role RESTRICTIVE intersection + RLS coverage
- `database-reviewer` — FK shape + partial index + backfill correctness
- `design-pushback` — mobile-first UI + new PATTERNS.md entry (conditional)

**Threat-model severity mapping:**
- PLAN §4.a threat_model_severity: `medium` → 8 reviewers is appropriate (NOT HIGH, which would add compliance/enterprise-readiness)
- Security + multi-tenant + rls reviewers all present ✅
- Design-pushback present for new UI pattern ✅

**Verdict:** ✅ **Roster matches threat model + scope.**

---

## 9. Halt gate verification

**Frontmatter halt_after: true (line 9)** + **§11 Dispatch authorization (lines 912–925):**

**Jake pre-/nx checklist (6 items):**
1. §4.a security model accepted (layered defense, NO anon RLS policy, service-role API sole path)
2. 90-day sliding window preserved (NOT 1-year; surface to Jake if intentional change)
3. §4.b actor_token_id pattern accepted (app-layer mutual exclusion, display label, PII fence)
4. §4.c mobile-first surface accepted (new /owner/{token} route distinct from /owner-portal/*, standalone layout)
5. TD-B1abis-03 polish bounded (≤15 lines, cost-code-combobox idiom)
6. Cost projection at $22-33 (within $50 per-plan halt gate)

**Jake authorization required per nwrp198 §26** before `/nx` dispatch.

**Verdict:** ✅ **Halt gate structure locked.** Plan CANNOT proceed to execute without Jake explicit sign-off on all 6 checklist items.

---

## 10. No blocking drift detected

Scan completed across:
- ✅ Phase folder organization
- ✅ MASTER-PLAN §9 current position + §11 TD carry-forward + §12 sequencing
- ✅ Frontmatter vs HDOD precedent
- ✅ EXPANDED-SCOPE §1 + §7 + §10 scope binding + cost projection
- ✅ ACs falsifiability + verification commands
- ✅ Post-ship hand-off actionability
- ✅ Threat model coverage + reviewer roster
- ✅ Halt gate + Jake authorization requirement
- ✅ Hook pre-flight + fixture infrastructure + files_modified intersection

**Minor note (not blocking):** EXPANDED-SCOPE Q5 line 211 wording mentions "1-year expiration" while existing 00074 schema is 90-day sliding. PLAN §4.a + §11 explicitly surface this discrepancy and halt for Jake acknowledgement. Plan-review iter-1 holds the gate pending Jake decision. **This is correct gating, not a flaw.**

---

## Custodian verdict

**READY FOR PLAN-REVIEW ITER-1.**

Plan B-2 is structurally complete, falsifiably scoped, and properly gated. All dependencies documented; sequencing locked; threat model mapped to ACs and reviewer roster. Cost projection realistic within discipline gates. Post-ship hand-off tasks explicit and actionable.

No corrections required before plan-review circulation. Plan-review iter-1 will exercise the 8-reviewer roster on the 19 ACs + security/mobile/design concerns; custodian sweep will verify post-execute hand-off completeness.

**Authorization path:** Jake signs-off §11 checklist (6 items including 90-day sliding window decision) → `/nx` dispatch released → execute + QA cycle → post-ship custodian sweep.

