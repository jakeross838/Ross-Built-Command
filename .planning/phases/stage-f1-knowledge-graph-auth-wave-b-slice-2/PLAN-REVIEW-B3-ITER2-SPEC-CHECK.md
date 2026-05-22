# Plan-review iter-2 -- spec-checker -- B-3

**Plan reviewed:** B-3-PLAN.md commit bf70d78
**Reviewer:** spec-checker (Nightwork)
**Date:** 2026-05-22
**Verdict:** NEEDS-WORK (1 MUST-FIX + 2 NOTEs; no new BLOCKING; all 6 iter-1 spec-checker findings CLOSED)

---

## Iter-1 findings closure check

| Iter-1 finding | Severity | iter-2 disposition | Verified CLOSED |
|---|---|---|---|
| F-1 (row count 36 vs 37) | HIGH | 36 data rows at all 4 sites: criteria block line 100, section 2.4 line 698, Task 2 line 798, AC-B3-09 line 1247. | YES |
| F-2 (client_portal_access deleted_at dangling) | HIGH | DEF-WC-3 table line 688 assigns Pattern B + Soft-delete trigger N/A (revoked_at lifecycle; no deleted_at). Correctly excluded from 32-table set. | YES |
| N-1 (EXPANDED-SCOPE ~25 stale) | NOTE | Frontmatter source_decisions line 28 cites correction; section 1.1 documents delta. | YES -- addressed |
| N-2 (W.1 deferred to B-4) | NOTE | Section 2.5 locks W.1 to B-4. Task 5 REMOVED line 938. Section 6 marks W.1 DEFERRED line 1473. | YES |
| N-3 (HALT GATE 1 per-table script gap) | NOTE | Task 6 added per nwrp215 decision 5 lines 824-915 + AC-B3-12 added lines 1332-1352. Per-table DO-block loops all 32 tables. N-3 fully resolved. | YES |
| AC-B3-02/03/06/10 Drummond fix | MUST-FIX | All 4 ACs use ross_built_org_id 00000000-0000-0000-0000-000000000001 and drummond_job_id a1bb4d28-103d-40d8-98fd-2dc449bf5d1c. Task 3 line 822 distinguishes fixture-harness-org vs Drummond. | YES |

---

## NEW findings at iter-2

### NEW-1 (MUST-FIX) -- AC-B3-07 verification query uses stale action filter

**Where:** B-3-PLAN.md line 1171

**Issue:** AC-B3-07 verification query ends with AND al.action = soft_deleted. This is the OLD
discriminator rejected by BLOCKING-2 fix per nwrp215 decision 3b. The iter-2 design writes
action = deleted throughout. The stale filter guarantees AC-B3-07 returns ZERO rows when
run against a correctly-shipped trigger, making the AC self-defeating.

**Evidence:**
- Trigger body line 536: uses action = deleted (existing ActivityAction union member, NOT soft_deleted)
- AC-B3-10 line 1277: AND action = deleted (correct)
- AC-B3-02 line 1009: captured_action = deleted (correct)
- AC-B3-07 line 1171: AND al.action = soft_deleted (STALE)

**Fix:** Change line 1171 from soft_deleted to deleted.

**Severity:** MUST-FIX. Query is internally inconsistent with the design it verifies.

---

### NEW-2 (NOTE) -- Section 1.3 B-3 design note still shows SELECT-wrapped DEF-WC-1 form

**Where:** B-3-PLAN.md lines 248-249

**Issue:** Section 1.3 B-3 design bullet still shows the old MF-2 SELECT-wrapped form:
  qual = ((org_id = (SELECT app_private.user_org_id())) OR (SELECT app_private.is_platform_admin()))
This was superseded by canonical direct-call form per nwrp215 decision 2 Option A.
Section 2.3 (lines 619-630) and criteria block line 99 are both correct (direct-call form).
Section 1.3 is a stale pre-design placeholder not updated during iter-2.

**Consequence:** Minor documentation inconsistency only. Section 2.3 is authoritative.

**Severity:** NOTE (no functional impact on migration or ACs).

---

### NEW-3 (NOTE) -- Task 4 SUMMARY.md scope says 11 ACs; correct count is 12

**Where:** B-3-PLAN.md line 924

**Issue:** Task 4 authoring scope reads all 11 ACs with verbatim verification query output.
AC-B3-12 was added by iter-2 per nwrp215 decision 5, making the correct count 12.
Section 4 header line 944 and section 8 falsifiability checklist line 1567 both correctly say 12.

**Severity:** NOTE (cosmetic; executor will include all 12 ACs regardless).

---

## AC coverage check (12 ACs)

| # | AC | LIVE SQL query | Falsifiable | Verdict |
|---|---|---|---|---|
| AC-B3-01 | 32 triggers applied | YES | YES | COVERED |
| AC-B3-02 | Trigger fires on soft-delete (singular entity_type, action=deleted) | YES | YES | COVERED |
| AC-B3-03 | Trigger does NOT fire on non-soft-delete UPDATE | YES | YES | COVERED |
| AC-B3-04 | DEF-WC-1 RESTRICTIVE policies applied | YES | YES | COVERED |
| AC-B3-05 | Cross-org leak blocked (session-context explicit per MF-RLS-04) | YES | YES | COVERED |
| AC-B3-06 | Three-tier user-id resolution (3 test cases) | YES | YES | COVERED |
| AC-B3-07 | activity_log org_id = source org_id | YES (JOIN query present) | PARTIAL -- stale filter action=soft_deleted at line 1171 returns 0 rows | PARTIAL (NEW-1) |
| AC-B3-08 | SECURITY DEFINER + search_path + aclexplode | YES | YES | COVERED |
| AC-B3-09 | DEF-WC-3 table 36 data rows + Pattern A/B accuracy | YES | YES | COVERED |
| AC-B3-10 | Graceful degradation | YES | YES | COVERED |
| AC-B3-11 | Smoke harness <= 2 failures | YES | YES | COVERED |
| AC-B3-12 | Per-table DO-block verification (NEW Task 6) | YES | YES | COVERED |

---

## Spec deliverables

- [x] Trigger function app_private.audit_soft_delete() -- COVERED (section 2.1; exception handler BLOCKING-3; singular CASE BLOCKING-1; action=deleted BLOCKING-2; search_path; REVOKE; W-1 tier restructure; MF-8 service-role-only contract)
- [x] 32 per-table triggers via DO block -- COVERED (section 2.2; idempotent DROP IF EXISTS + CREATE)
- [x] DEF-WC-1 org_members_org_isolation + org_members_delete_strict -- COVERED (section 2.3; direct-call form per nwrp215 decision 2; W-3 rationale comment)
- [x] DEF-WC-3 ARCHITECTURE.md RLS posture summary table 36 data rows -- COVERED (section 2.4; all 4 sites consistent)
- [x] W.1 DEFERRED to B-4 -- COVERED (section 2.5 locked per nwrp215 decision 4)
- [x] src/lib/activity-log.ts ActivityEntityType union + 23 singular entity types -- COVERED (files_modified + Task 1 M-07)
- [x] src/lib/audit/action-labels.ts ENTITY_LABELS Record + 23 entries -- COVERED
- [x] Task 6 per-table DO-block verification -- COVERED (lines 824-915 + AC-B3-12)
- [x] 12 falsifiable ACs with LIVE SQL verification queries -- 11 COVERED fully; AC-B3-07 PARTIAL (NEW-1)

---

## Domain rules spot-check

- Drummond fixtures used: YES -- ACs 02/03/06/10 use drummond_job_id a1bb4d28-103d-40d8-98fd-2dc449bf5d1c in org 00000000-0000-0000-0000-000000000001; smoke harness and Task 6 use synthetic fixture-harness-org per CLAUDE.md Domain rules
- Recalculate-not-increment honored: YES -- trigger is APPEND-ONLY to activity_log; no running totals modified by B-3
- Multi-tenant RLS posture: PASS -- trigger reads NEW.org_id and writes activity_log.org_id = NEW.org_id; AC-B3-07 verifies (PARTIAL per NEW-1); DEF-WC-1 adds RESTRICTIVE backstop on org_members
- Design tokens (no hardcoded colors): N/A -- B-3 is backend-only, no UI surface
- Audit log writes on every state change: PASS -- trigger fires on every soft-delete transition across 32 tables; exception handler ensures graceful degradation

---

## Findings

### BLOCKING
(none)

### MUST-FIX
1. NEW-1: AC-B3-07 line 1171 filter action=soft_deleted must be action=deleted. Stale discriminator produces false-negative against correctly-shipped trigger.

### NOTE
2. NEW-2: Section 1.3 lines 248-249 still shows SELECT-wrapped DEF-WC-1 form; section 2.3 is authoritative (direct-call). Minor documentation inconsistency.
3. NEW-3: Task 4 line 924 says 11 ACs; correct count is 12. Cosmetic stale reference.

---

## Verdict

**NEEDS-WORK**

All 6 iter-1 spec-checker findings verified CLOSED. One new MUST-FIX (NEW-1: AC-B3-07 line 1171 stale
action filter). Two new NOTEs (cosmetic documentation only). No new BLOCKING. No Rule 9 cross-reviewer
factual disagreement.

NEW-1 is a surgical 1-line edit: change line 1171 from soft_deleted to deleted. Once corrected,
no further spec-checker iteration required. The two NOTEs may be addressed in the same editorial pass.
