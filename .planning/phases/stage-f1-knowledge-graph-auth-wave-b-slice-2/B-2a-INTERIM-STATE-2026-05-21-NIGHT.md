# B-2a interim state — 2026-05-21 NIGHT

**Created:** 2026-05-21 (halt-for-fresh-session per nwrp203 Option B)
**Status:** B-2a iter-1 complete, NEEDS-WORK; halted before iter-2 per Rule 7d $50 per-plan halt gate (no autonomous bump per Rule 7c; one-bump-per-slice already used in Slice-1 via nwrp161)
**Resume:** Tomorrow, fresh session, fresh $50 per-plan ceiling
**Driver:** nwrp203 Option B halt-for-fresh-session decision

---

## Session summary (2026-05-21 — what happened)

Fresh-session re-orientation after machine restart (nwrp199). State (B) confirmed — B-2 PLAN authored + iter-1 NEEDS-WORK on disk. Jake's nwrp200 directive re-split B-2 → B-2a + B-2b driven by iter-1 SYNTHESIS B-4 leak finding. nwrp201 locked rate-limit DB-backed + strengthened B-4 AC. nwrp202 RE-APPROVED EXPANDED-SCOPE + dispatched /np for B-2a.

`/np` orchestrator executed all 3 steps:
1. **Discuss** (assumptions mode --auto) → B-2a-CONTEXT.md (23 D-NN decisions) + B-2a-DISCUSSION-LOG.md → commit `de778a9`
2. **Plan** (gsd-planner + gsd-plan-checker iter-1 NEEDS-WORK + iter-2 APPROVE) → B-2a-PLAN.md (2289 lines; 13 falsifiable ACs) → commit `7198e86`
3. **Plan-review** (7-reviewer Tier 1 HIGH-threat full rigor per nwrp202 §15; no design-pushback) → 7 reviewer reports + SYNTHESIS → commit `03c6ad5`

Plan-review verdict: **NEEDS-WORK**. 6 BLOCKING + 2 HIGH + multiple WARNING/NOTE. No Rule 9 factual disagreements. Cross-reviewer alignments on multiple findings.

---

## Top finding (post-Slice-2 retrospective note per nwrp203 §8)

The cross-reviewer-aligned BLOCKING finding (security-reviewer + ai-logic-tester) is the **SECOND pre-existing-artifact-undermines-new-security-design** finding in B-2a's lineage:

1. **B-4 NULL client_id leak** (iter-1 SYNTHESIS) — existing `create_client_portal_invite` RPC produced `client_id=NULL`; nwrp200 re-split B-2 → B-2a + B-2b to address.
2. **Existing partial index `idx_client_portal_access_token_hash WHERE revoked_at IS NULL`** (iter-1 SYNTHESIS for B-2a) — reintroduces timing oracle on token-resolution hot path; violates nwrp202 §4 LOCKED.

Both were in EXISTING code the new plan assumed was safe. Both are exactly the catastrophic-class leaks B-2a HIGH-threat treatment exists to catch. **Pattern: HIGH-threat security plans should explicitly audit pre-existing artifacts (indexes, RPCs, grants) that the new design depends on, not just new code.**

Worth adding to post-Slice-2 retrospective (`.planning/lessons.md`). Not actioned this session.

---

## Revision checklist location

**`PLAN-REVIEW-B2A-ITER1-SYNTHESIS.md` §Iter-2 revision checklist** (added 2026-05-21 NIGHT per nwrp203 §11). The checklist enumerates:

- 6 BLOCKING fixes (BLK-1..BLK-6) with location + fix approach + estimated lines
- 2 HIGH fixes (H-1, H-2) with same detail
- 2 WARNING fixes (W-1, W-2)
- 5 NOTE cleanups (N-1..N-5; cosmetic; <10 lines total)
- Latitude #3 + #4 dispositions to record (markers to remove)
- Re-review scope (subset: spec-checker + security + database + ai-logic + optional rls-auditor; custodian + multi-tenant don't need re-review)
- Iter-2 cost projection (~$18-28 within fresh $50 ceiling)

Tomorrow's iter-2 = "apply the checklist" not "re-read 7 reviewer reports."

---

## Latitude dispositions already APPROVED (cross-reviewer)

These were SURFACED for iter-1 disposition AND APPROVED with cross-reviewer alignment; tomorrow's revision just RECORDS the dispositions in PLAN §2 + removes the "ITER-1 DISPOSITION REQUIRED" markers:

### Latitude #3 — `revoked_seq` column (revocation versioning approach)

**APPROVED Option A** (column + revocation versioning) by:
- security-reviewer (security-sound; preserves audit chain; no timing oracle; no soft-delete-rule violation)
- multi-tenant-architect (cleanest BY-CONSTRUCTION re-invitation semantics; Postgres uniqueness enforces; Options B+C rejected for stated reasons)

### Latitude #4 — Sliding-window UPDATE 90→1-year in 2 RPCs

**APPROVED IN-SCOPE** (NECESSARY CONSEQUENCE of nwrp200 1-year lock; not scope creep) by:
- security-reviewer (consistent 1-year lock across all RPCs that update expires_at; without it, first token use rolls window back to 90 days; undermines nwrp200)
- multi-tenant-architect (90→1-year change is single string-literal swap; no cross-tenant signal introduced)
- ai-logic-tester (verified via Q8 query: the 2 RPCs are correctly named — `submit_client_portal_message` + `mark_client_portal_message_read`; naming-error correction holds; no other RPCs/triggers touch `expires_at` — scope-completeness CONFIRMED)

**NAMING-ERROR CORRECTION** (caught during plan-checker iter-1 revision): the original B-2 PLAN inherited a non-existent `consume_client_portal_token` reference. The actual third sliding-window RPC is `mark_client_portal_message_read` at `00074:501-543`. Correction holds in B-2a-PLAN.md throughout.

---

## Resume sequence (tomorrow per nwrp203 §25-30)

1. **Fresh CLI session.** The agent-tooling fix (bceae9f explicit enumeration of 9 mcp__supabase__* tools) holds across restarts per today's gsd-executor probe (verified 2026-05-21 morning re-orientation).
2. **Read INTERIM-STATE + SYNTHESIS revision checklist.** Specifically:
   - `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-INTERIM-STATE-2026-05-21-NIGHT.md` (this file)
   - `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/PLAN-REVIEW-B2A-ITER1-SYNTHESIS.md` §Iter-2 revision checklist
3. **Jake authorizes fresh $50 B-2a ceiling** for iter-2 revision + re-review + execute + GATE scope.
4. **Dispatch iter-2 revision.** Apply the 6-BLOCKING + 2-HIGH + 2-WARNING + 5-NOTE checklist + record Latitude dispositions in PLAN §2. Single gsd-planner pass with explicit checklist in dispatch prompt (cheaper than fresh authoring; ~$8-12).
5. **Re-review with subset 7-reviewer scope** (spec-checker + security + database + ai-logic + optional rls-auditor; custodian + multi-tenant already PASS; ~$8-14).
6. **Surface iter-2 verdict for Jake review.** If clean → /nx (execute + QA + GATE B-2a per halt_after: true). If not clean → re-decide (another iter or halt-for-fresh-session).
7. **After GATE B-2a clears → B-2b dispatch authorization.** B-2b depends on B-2a GATE per nwrp202 §17.

---

## Active gates (state preserved)

- **B-2a still gates B-2b** (B-2b consumes `getScopedOwnerPortalClient` + `assertDrawBelongsToToken` helpers + depends on B-2a GATE per EXPANDED-SCOPE §9 + nwrp200 hard sequential edge)
- **B-2a still gates B-3** (B-3 soft-delete trigger applies to B-2a's new `client_portal_access.client_id` FK shape per EXPANDED-SCOPE §8 strict-sequential edges)
- **halt_after: true** on B-2a frontmatter — GATE B-2a 8 verification items per EXPANDED-SCOPE §9; tomorrow's iter-2 + execute must satisfy ALL 8 before B-2b dispatch.

---

## Slice-2 cost ledger

Spent through 2026-05-21:

| Plan / Activity | Spend | Source |
|---|---|---|
| B-2 plan-author + 9-reviewer iter-1 (2026-05-20) | ~$15-20 | nwrp198 dispatch → NEEDS-WORK; superseded by nwrp200 re-split |
| nwrp200/201/202 EXPANDED-SCOPE amendment | ~$3-4 | This session's amendment work |
| B-2a CONTEXT + DISCUSSION-LOG (assumptions mode) | ~$2-3 | This session's /np Step 1 |
| B-2a-PLAN.md authoring + plan-checker iter-1/iter-2 | ~$15-22 | This session's /np Step 2 (planner 233k+251k tokens; checker 176k+100k tokens) |
| B-2a 7-reviewer iter-1 plan-review + SYNTHESIS | ~$15-25 | This session's /np Step 3 (7 reviewer agents; ai-logic SQL-heavy; security thorough) |

**Slice-2 to-date: ~$50-74 of $200 ceiling (~25-37% consumed).**

**Remaining: ~$126-150 for B-2a iter-2 ($18-28) + B-2a execute + GATE ($20-30) + B-2b ($15-22 per EXPANDED-SCOPE §10) + B-3 ($35-50) + B-4 ($15-25) + B-5 ($25-35) + B-6 ($15-20) + B-7 ($20-30).**

**B-2a + B-2b combined still on track to land at $30-50 (per EXPANDED-SCOPE §10 $30-45 for B-2a + $15-22 for B-2b = $45-67 — slightly above $30-45 estimate but within Slice-2 ceiling).**

**Tomorrow's fresh ceiling:** $50 scoped to "iter-2 revision + re-review + execute + GATE." Today's $50-74 iter-1 spend is sunk; the findings ARE the revision input (not wasted; same pattern as B-2's original iter-1 → B-2a re-scope).

---

## Open / unresolved items (NOT for tomorrow's iter-2; longer-term)

- **Post-Slice-2 retrospective:** add to `.planning/lessons.md` the pattern "HIGH-threat security plans should explicitly audit pre-existing artifacts (indexes, RPCs, grants) that the new design depends on, not just new code." Driver: B-4 NULL leak + token-hash partial index timing oracle (both pre-existing artifacts the B-2/B-2a plans assumed were safe).
- **B-2b plan-review awareness:** when B-2b dispatches, ensure plan-review iter-1 includes grep-based gate blocking direct `createServiceRoleClient()` / `createServerSupabaseClient()` invocations in `src/app/api/owner-portal/**` files (per multi-tenant-architect MINOR-NOTE; the `scopedFrom` wrapper is scope-floor enforcer not complete query gate).

---

## Files committed this session

| Commit | Files | Purpose |
|---|---|---|
| `bceae9f..27f6b0e` (this session start) | 10 stranded commits pushed | Session restart per nwrp199 §6 |
| `27f6b0e` | EXPANDED-SCOPE.md amendment | nwrp200/201/202 B-2 re-split + 1-year lock + DB-backed rate-limit + 3-query B-4 AC |
| `de778a9` | B-2a-CONTEXT.md + B-2a-DISCUSSION-LOG.md | /np Step 1 discuss-phase (assumptions mode --auto) |
| `7198e86` | B-2a-PLAN.md (2289 lines) | /np Step 2 plan-phase (planner + checker iter-1→iter-2 APPROVE) |
| `03c6ad5` | 7 reviewer reports + SYNTHESIS | /np Step 3 plan-review iter-1 (NEEDS-WORK) |
| (this commit) | B-2a-INTERIM-STATE-2026-05-21-NIGHT.md + SYNTHESIS iter-2 checklist | Halt-for-fresh-session per nwrp203 |

---

## STOP

**No /nx tonight. No iter-2 tonight. Session terminates after commit + push.**

Tomorrow's first action: fresh CLI session, read this INTERIM-STATE + SYNTHESIS revision checklist, await Jake's fresh-ceiling authorization.

— /np orchestrator session 2026-05-21
