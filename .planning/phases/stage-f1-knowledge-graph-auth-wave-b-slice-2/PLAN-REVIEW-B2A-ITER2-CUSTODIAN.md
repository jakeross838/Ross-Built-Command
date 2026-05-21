# Plan-review iter-2 custodian — B-2a

**Date:** 2026-05-21
**Verdict:** **PASS**

---

## Planning tree state

**Expected post-iter-2:**
- ✓ B-2-PLAN.md (historical; unchanged)
- ✓ PLAN-REVIEW-ITER1-*.md (9 files; unchanged from B-2 iter-1)
- ✓ B-2a-CONTEXT.md (unchanged; commit `de778a9`)
- ✓ B-2a-DISCUSSION-LOG.md (unchanged; commit `de778a9`)
- ✓ B-2a-PLAN.md (REVISED; 2289 → 2559 lines; commit `4780007`)
- ✓ PLAN-REVIEW-B2A-ITER1-*.md (8 files; commit `03c6ad5` + checklist amendment `1878611`)
- ✓ B-2a-INTERIM-STATE-2026-05-21-NIGHT.md (unchanged; commit `1878611`)

**Actual state:** All files present and accounted for. No orphaned artifacts.

---

## Commit chain integrity

| Commit | Message | Status |
|--------|---------|--------|
| `de778a9` | B-2a CONTEXT + DISCUSSION-LOG | ✓ Clean |
| `7198e86` | B-2a-PLAN.md authored (iter-1) | ✓ Clean |
| `03c6ad5` | B-2a iter-1 reviews (7 reviewers) | ✓ Clean |
| `1878611` | B-2a halt-for-fresh-session (nwrp203) | ✓ Clean |
| `4780007` | B-2a-PLAN iter-2 revision (15 fixes applied) | ✓ **PASS** |

**All commits:**
- No `--no-verify` bypass flags present
- Proper co-author line: `Co-Authored-By: Claude Opus 4.7 (1M context)`
- Commit bodies document each fix category (6 BLOCKING + 2 HIGH + 2 WARNING + 5 NOTE)
- No secret values leaked in diff
- No Drummond PII exposed outside `.planning/` or fixture files

---

## Iter-2 revision checklist attestation

**Source:** `PLAN-REVIEW-B2A-ITER1-SYNTHESIS.md` §Iter-2 revision checklist (15 items total)

### Latitude dispositions (§2)

- ✓ **L-3** (revoked_seq column): APPROVED Option A — recorded in PLAN §2, markers removed
- ✓ **L-4** (sliding-window 90→1-year): APPROVED IN-SCOPE — recorded in PLAN §2, markers removed

### Phase 2 — 6 BLOCKING fixes

- ✓ **BLK-1** — `<criteria>` yaml block added (lines 98–192): all 5 categories present (mechanical, dom, visual, behavioral, semantic); visual explicitly marked N/A per nwrp202 §15
- ✓ **BLK-2** — AC-B2a-06 arg-count corrected to 6 (verified at lines 2023, 2201, 2205)
- ✓ **BLK-3** — Token-hash index `idx_client_portal_access_token_hash` DROP+recreate as NON-PARTIAL (lines 666–676); eliminates timing oracle per security + ai-logic cross-reviewer alignment
- ✓ **BLK-4** — REVOKE EXECUTE FROM PUBLIC + GRANT pairs for 3 re-defined SECURITY DEFINER RPCs (verified in migration body; roles per 00074 precedent)
- ✓ **BLK-5** — §4 resolution table B-9 row corrected to Option A predicate; AC-B2a-08 acknowledges re-invitation semantics
- ✓ **BLK-6** — Rule 2 FK citation verification query added to §9 before execute dispatch

### Phase 3 — 2 HIGH fixes

- ✓ **H-1** — AC-B2a-05 timing-oracle probe methodology pinned to concrete `SET enable_seqscan=off` + EXPLAIN (ANALYZE, BUFFERS) query with Index Scan assertion
- ✓ **H-2** — CSRF Origin header validation on admin revoke POST documented in §6.d threat model T-B2a-08b + AC-B2a-08 Step 8

### Phase 4 — 2 WARNING fixes

- ✓ **W-1** — PUBLIC_PATHS split with per-entry comments distinguishing `/owner` (anon B-2b), `/api/owner-portal/acknowledge` (anon B-2b), `/api/owner-portal/admin` (authenticated admin B-2a)
- ✓ **W-2** — Admin revocation rate-limit IP-only explicit accept (Option a); per-user_id deferred to Wave 1.1-Lite with documented rationale in §6.d

### Phase 5 — 5 NOTE cleanups

- ✓ **N-1** — internal_billings → internal_billing_types clarification (lines 73, 477)
- ✓ **N-2** — Drummond canary vacuously-true acknowledgment in AC-B2a-13 sub-item (9)
- ✓ **N-3** — draws.job_id prose imprecision tightened (partial composites acknowledged; B-2a needs unfiltered index)
- ✓ **N-4** — 'now()' as any → new Date().toISOString() correction in §6.d (matches Task 7 authoritative form)
- ✓ **N-5** — B-2b dispatch preconditions added: grep gate for direct createServiceRoleClient invocations in src/app/api/owner-portal/** documented in post-ship section

---

## MASTER-PLAN alignment

- ✓ §9 CURRENT POSITION — unchanged; no phase shipped yet; B-2a still in plan-review iter-2
- ✓ §12 NEXT PLANNED WORK — unchanged; B-2a remains the immediate item per nwrp202 dispatch authorization
- ✓ §10 DECISIONS LOG — unchanged; no new architectural decisions introduced in iter-2 revisions (all decisions locked at iter-1)
- ✓ §11 TECH DEBT REGISTRY — unchanged; no deferred work introduced in iter-2 (Wave 1.1-Lite items documented within PLAN §8 post-ship)

---

## Summary

**Verdict: PASS** — B-2a-PLAN.md iter-2 revision is clean, complete, and ready for 7-reviewer iter-2 re-review per nwrp204. All 15 items from SYNTHESIS checklist applied with on-disk citable evidence. Commit chain is atomic and hygenic. Latitude dispositions explicit. No cross-reviewer factual disagreements surfaced. Halt gate remains in place per nwrp202 §17 — B-2b dispatch blocked until Jake substantive review concludes.
