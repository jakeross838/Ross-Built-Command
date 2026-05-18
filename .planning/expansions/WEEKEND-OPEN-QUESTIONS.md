# Weekend open questions — 2026-05-15 NIGHT → Monday review

**Status:** PENDING JAKE
**Authored:** 2026-05-15 NIGHT
**Scope:** Consolidated index of decisions surfaced during nwrp165 + nwrp167 weekend authoring deliverables #1-#5. Cross-references the host deliverable for each question.

This file is the Monday-morning starting point. Each question has its host document for full context; the entries here are decision-summary lines for fast Monday scan.

---

## CRITICAL (blocking Slice-2 dispatch)

### Q-W1 — Production domain choice (F1+-1)

**Host:** `.planning/decisions-pending/2026-05-15-f1plus-1-production-domain-BRIEF.md`
**Question:** Register `nightwork.build` (Option A) OR subdomain on existing Jake-owned property (Option B) OR defer to commercial-launch (Option C)?
**Orchestrator recommendation:** **Option A — register `nightwork.build` at Cloudflare Registrar.** Wave-B Slice-2 B-5 (Resend webhook + sending DKIM/SPF) and B-2 (Owner Portal Path A homeowner email links) both require a stable owned domain.
**Cost:** ~$30/year + 1-2 hours Jake setup time.
**Blocks:** Slice-2 B-2 + B-5 dispatch.

### Q-W2 — RB Google Workspace status (F1+-2 prerequisite)

**Host:** `.planning/decisions-pending/2026-05-15-f1plus-2-production-sso-posture-BRIEF.md` §8
**Question:** Does RB actually use Google Workspace for `jake@rossbuilt.com` / `andrew@rossbuilt.com` email? (Yes / No)
**Why it matters:** Determines whether F1+-2 recommendation is Option C (Google OAuth + magic-link) or Option B (magic-link everywhere).
**No action required this weekend — pure info Q.**

### Q-W3 — Production SSO posture (F1+-2) — RESOLVED per nwrp169

**Host:** `.planning/decisions-pending/2026-05-15-f1plus-2-production-sso-posture-BRIEF.md`
**Question:** Pick A (keep email+password) / B (magic-link everywhere) / C (Google OAuth + magic-link) / D (multi-IdP + magic-link)?
**Decision (per nwrp169):** **Option B — magic-link everywhere.** Q-W2 confirmed NO Google Workspace at RB; Option C off table. Internal org-members migrate from email+password to magic-link reusing the B-5 magic-link primitive shipped in Slice-2. Q5 A (status quo) deprecated post-B-5 cutover. SOC2 CC6.1 trajectory: better posture than passwords; weaker than Google OAuth but acceptable given Workspace not available.
**Blocks:** Wave 1.1-Lite SOC2 readiness; not Slice-2-blocking. Internal migration sequencing: post-Slice-2 B-5 ship (magic-link primitive available) + observation window.

---

## HIGH PRIORITY (Slice-2 input)

### Q-W4 — Slice-2 EXPANDED-SCOPE approval

**Host:** `.planning/expansions/stage-f1-knowledge-graph-auth-wave-b-slice-2-EXPANDED-SCOPE.md`
**Question:** Approve the 12 Q&A resolutions (Q1-Q12) as written? Any amendments?
**Sub-questions of high importance:**

- **Q1 (B-3 SECURITY DEFINER + Wave-A iter-1 sweep bundling):** orchestrator recommends SECURITY DEFINER with explicit search_path; recommends NOT bundling Wave-A iter-1 sweep with B-3 (kept separate per Deliverable #5 standalone plan).
- **Q2 (middleware threading owner):** orchestrator recommends `getCurrentMembership()` helper.
- **Q4 (PII restoration in UI):** orchestrator recommends DEFER to Wave 1.1-Lite. Named dependency cost: ~4-8 week regression where PMs can't see client contact info from UI.
- **Q5 (token rotation cadence):** orchestrator recommends DEFER with B-2 ship-time defaults = 1-year expiration + manual admin revocation.
- **Q6 (cost-code reseed split):** orchestrator recommends SPLIT — templates + fixture-harness-org wiped in Slice-2; RB org wipe deferred to Wave 1.1-Lite for Diane review.
- **Q9 (parallel dispatch B-4+B-5+B-6):** orchestrator deferred authorization to plan-review iter-1 after authored plans expose actual `files_modified`. Best-estimate matrix flags B-4 ∩ B-5 as MEDIUM-HIGH risk.
- **Q11 (carry-forward distribution per nwrp166):** orchestrator distributes TD-B1abis-01/02 → B-4, TD-B1abis-03 → B-2, W.1 unflag → B-3 or B-4 conditional. No B-8 bundle plan.
- **Q12 (RLS posture summary table):** orchestrator recommends FULL TABLE (~25 tables × 5 columns; ~1 hour authoring).

### Q-W5 — Slice-2 ceiling authorization

**Host:** Slice-2 EXPANDED-SCOPE §10 + lessons.md retrospective §"Cost-ceiling discipline pattern"
**Question:** Authorize Slice-2 ceiling at $200 (per nwrp166 recommendation; 6 plans × $22-32 mean + 20% buffer)?
**Orchestrator recommendation:** $200 ceiling. Per-plan halt gate at $50 (Rule 7d).
**Forward calibration evidence:** Slice-1 actuals showed 50% underestimation; Slice-2 estimate uses Slice-1 actuals + 20% buffer.

---

## MEDIUM PRIORITY (Wave-A iter-1 cleanup dispatch)

### Q-W6 — Wave-A iter-1 cleanup plan approval + dispatch sequencing

**Host:** `.planning/phases/stage-f1-wave-a-iter1-cleanup/WA-iter1-cleanup-PLAN.md` §9
**Question 1:** Confirm 7-function REVOKE list (5 trg_pricing_history_* + 2 create_default_*)?
**Question 2:** Confirm extension schema choice — `extensions` (Supabase canonical) vs alternative name (e.g., `nightwork_extensions`)?
**Question 3:** Confirm `ALTER DATABASE postgres SET search_path` is acceptable vs per-role/per-session search_path?
**Question 4:** Sequence dispatch — BEFORE Slice-2, AFTER Slice-1 GATE 2 HALT, or PARALLEL with B-1b polish?
**Orchestrator recommendation:** ship AFTER Slice-1 B-1b ships + GATE 2 HALT closes, BEFORE Slice-2 plan-review iter-1 (clean lint surface for Slice-2 reviews).
**Cost:** estimated $10-16 single-plan spend; separate budget envelope from Slice-2.

### Q-W7 — CLAUDE.md amendments

**Host:** `CLAUDE.md` (modified — uncommitted) + `.planning/lessons.md` (modified — uncommitted)
**Question:** Approve the CLAUDE.md amendments authored as Deliverable #3?
**Additions:**
- New "Orchestration discipline" subsection under Nightwork standing rules (orchestrator vs executor pattern + autonomy envelope + halt-vs-autonomous modes).
- Rule 7 — Cost ceiling discipline (5 sub-clauses including per-plan halt gate at $50).
- Rule 8 — Hook fail-closed contract (4 sub-clauses including disk-evidence > conversation-context).
- Rule 9 — Cross-reviewer factual disagreement HALT (codifies nwrp118 origin + cross-reviewer agreement disposition pattern).
**Orchestrator preference:** approve as written — codifies Slice-1 lessons before Slice-2 dispatches.

---

## INFORMATIONAL (no action required)

### Q-W8 — Slice-1 lessons.md retrospective entry

**Host:** `.planning/lessons.md` (Deliverable #2 — uncommitted)
**Question:** Approve the Slice-1 close-out retrospective text?
**Sections:** Plan-author quality (3 defects), cost-ceiling discipline (Slice-1 actuals + Slice-2 calibration), QA-report-write-step gap (nwrp163), Path-A halt vs split-plans decisions (nwrp164/166), inheritance to Slice-2 + downstream.
**Cosmetic-only review acceptable.**

---

## Recommended Monday dispatch order (per nwrp169 reorder)

After Jake reviews these open questions, the sequence is:

1. **Apply Q-W3 lock amendment** to this file (Option B; remove conditional branching). UNCOMMITTED — bundled into Step 3.

2. **Q-W9 gitignore precursor commit** — whitelist `.planning/decisions-pending/` + `.planning/decisions-resolved/` to .gitignore. **MUST precede the weekend-deliverables commit** because 2 of the 7 deliverable files (F1+-1 + F1+-2 briefs) cannot be staged until their parent directory is no longer gitignored. Standalone commit, no `--no-verify` (clean hook posture for .gitignore-only change).

3. **Weekend deliverables commit** — 7 files (Slice-2 EXPANDED-SCOPE + lessons.md + CLAUDE.md + 2x decision briefs + cleanup plan + this index with Q-W3 amendment). `--no-verify` authorized per nwrp169 with rationale in commit body (100% docs; hook intent gap). Push.

4. **TD-NW-HOOK-DOC-ONLY-DETECT** small follow-up commit to MASTER-PLAN §11 — codifies the hook calibration gap surfaced repeatedly across nwrp163/166/169.

5. **Surface Q-W4 / Q-W5 approval requests** to Jake (Slice-2 EXPANDED-SCOPE + $200 ceiling). Surface-only; no dispatch.

6. **Resume Slice-1 close-out** — B-1b execute + QA + GATE 2 HALT review per `INTERIM-STATE-2026-05-15-NIGHT.md` §6. Fresh $50 ceiling per nwrp164. Pre-execute scope verification confirms plan unchanged from GATE 1.5 baseline.

7. **After Slice-1 closes:** dispatch Wave-A iter-1 cleanup plan per Q-W6 sequencing recommendation (lean lint surface for Slice-2).

8. **After cleanup ships:** dispatch Slice-2 per Q-W4 / Q-W5 (B-2 first, then B-3, then parallel B-4/B-5/B-6 pending Q9 plan-review iter-1 matrix, then B-7 last).

**Q-W1 production domain (nightwork.build):** Jake will resolve outside this session (domain registration is a Jake task). Slice-2 B-2 + B-5 dispatch waits for domain ready.
**Q-W3 SSO posture:** RESOLVED per nwrp169 (Option B). Internal cutover scheduling: post-Slice-2 B-5 + observation window.

---

## Commit posture for weekend deliverables

All weekend deliverable files are CURRENTLY UNCOMMITTED on main branch (HEAD `3654393`). Per the doc-only commit-overnight pattern Jake authorized in nwrp166 §3-5, these stay uncommitted through the weekend pending Monday review.

**Files awaiting commit decision:**

| File | Deliverable | Status | Gitignore? |
|------|-------------|--------|-----------|
| `.planning/expansions/stage-f1-knowledge-graph-auth-wave-b-slice-2-EXPANDED-SCOPE.md` | #1 (Slice-2 scope) | NEW | whitelisted (commit-eligible) |
| `.planning/lessons.md` | #2 (retrospective) | MODIFIED | whitelisted |
| `CLAUDE.md` | #3 (orchestration discipline + Rules 7-9) | MODIFIED | always-tracked |
| `.planning/decisions-pending/2026-05-15-f1plus-1-production-domain-BRIEF.md` | #4a (production domain) | NEW | **GITIGNORED — see Q-W9 below** |
| `.planning/decisions-pending/2026-05-15-f1plus-2-production-sso-posture-BRIEF.md` | #4b (SSO posture) | NEW | **GITIGNORED — see Q-W9 below** |
| `.planning/phases/stage-f1-wave-a-iter1-cleanup/WA-iter1-cleanup-PLAN.md` | #5 (cleanup plan) | NEW | whitelisted (`.planning/phases/` carve-out) |
| `.planning/expansions/WEEKEND-OPEN-QUESTIONS.md` | This index | NEW | whitelisted |

### Q-W9 — `.planning/decisions-pending/` gitignore whitelist

**Surfaced during weekend final state check:** the F1+-1 + F1+-2 decision briefs live in `.planning/decisions-pending/`, which is GITIGNORED per `.gitignore` line 107 (`/.planning/*` catch-all). No explicit whitelist carve-out exists for `decisions-pending/` or `decisions-resolved/`. The existing `decisions-resolved/2026-05-15-user-identity-fk-convention-BRIEF.md` is also PC-local-only.

**Question:** Add whitelist carve-out for `decisions-pending/` and `decisions-resolved/` so decision briefs sync across PCs?

Three options:
- **(a) Whitelist both directories.** Add `!/.planning/decisions-pending/` + `!/.planning/decisions-pending/**` + same for `decisions-resolved/` to .gitignore. Decision briefs become canonical git-tracked artifacts.
- **(b) Move briefs to a whitelisted parent.** E.g., relocate F1+-1 + F1+-2 briefs to `.planning/expansions/2026-05-15-f1plus-1-production-domain-BRIEF.md` (etc.). Preserves PC-local convention for decisions-pending/; adds these specific briefs to expansions tree.
- **(c) Leave gitignored.** Jake reads briefs on the PC where authored (this PC); decisions get codified into MASTER-PLAN.md D-### entries which ARE committed. Matches existing decision-brief convention (user-identity-fk brief was PC-local).

**Orchestrator recommendation:** **Option (a) whitelist both directories.** Reasoning:
- Jake works across multiple PCs per CLAUDE.md Dev Environment Rules; PC-local-only is fragile for review work.
- Decision briefs are canonical artifacts — they're the SOURCE for D-### entries; losing the source means losing reviewability + audit trail of the decision process.
- nwrp129/TD-WD-01 precedent established the "whitelist additional .planning subdirs" pattern (`.planning/tech-debt/` was added then).
- Cost: 4 lines of .gitignore + one commit.

**If (a) approved:** the .gitignore change becomes a small precursor commit Monday before the weekend-deliverable commit. The 2 brief files then become git-trackable + commitable.

**Constraint:** orchestrator did NOT auto-add the whitelist this weekend per nwrp165's "no destructive git operations" — modifying .gitignore feels closer to "destructive-leaning git op" without Jake authorization. Surfaced as Q-W9 for explicit Monday call.

Per CLAUDE.md "Always run these after finishing any work session" — Monday commit + push is the natural close.

If hook blocks commit on stale qa-report.md timestamp (likely; last qa-runs file 2026-05-15-1730 will be ~36+ hours old by Monday), the gate's intent is "verify recent code coverage" — doc-only commits don't change code, but the hook can't differentiate. **Recommended Monday move:** Jake authorizes `--no-verify` for the weekend-deliverables commit with explicit rationale (doc-only commit, no code changes, hook intent satisfied since no recent code shipped). Document the bypass in commit body. Or, run /nightwork-qa-no-op against Slice-1 HEAD to refresh timestamp.

---

## Weekend ledger summary

| Metric | Value |
|--------|-------|
| Deliverable #1 (Slice-2 EXPANDED-SCOPE) | DONE (revised per nwrp166 amendments) |
| Deliverable #2 (lessons.md retrospective) | DONE (single comprehensive entry) |
| Deliverable #3 (CLAUDE.md orchestration discipline) | DONE (new subsection + Rules 7-9) |
| Deliverable #4 (F1+-1 + F1+-2 decision briefs) | DONE (2 separate brief files in decisions-pending/) |
| Deliverable #5 (Wave-A iter-1 cleanup plan) | DONE (single plan + frontmatter + 11 sections + 14 ACs) |
| Deliverable #6 (Slice-2 plan-author skeletons B-2..B-7) | **SKIPPED** — projected cost $12-18 would exceed $40 weekend ceiling per nwrp167 halt rule |
| Weekend cost spent (estimate) | ~$28-32 of $40 ceiling |
| Cost remaining headroom | ~$8-12 |

**Why skipped #6:** orchestrator's per-plan budget projection showed 6 plan skeletons at ~$2-3 each = $12-18, pushing total to $40-48 vs $40 ceiling. Per nwrp167 halt rule on "ceiling approach," halted before authoring rather than overrun. Slice-2 plan-author skeletons will be produced at /np dispatch time anyway (gsd-planner agent's job); pre-authoring them this weekend was optional optimization, not required deliverable.

**No destructive ops performed.** No migrations applied. No production schema changes. No code touched outside CLAUDE.md (documentation). No `--no-verify` bypasses. No autonomous ceiling bumps. All halt-rule discipline preserved.

---

## Notes for Monday session

- **Slice-1 still has B-1b deferred per nwrp164.** Fresh session resume sequence in `INTERIM-STATE-2026-05-15-NIGHT.md` §6. Jake authorizes fresh $50 ceiling scoped to B-1b alone.
- **Smoke harness storageState refreshed 2026-05-15 20:42 UTC** (last bootstrap against preview `6rs4cd2r3`). Will be ~36-48 hours old Monday; may need re-bootstrap if smoke runs early Monday. Auth state expiration is not deterministic but Supabase refresh tokens typically last 30 days; should still work without bootstrap.
- **Weekend protocol (nwrp167) terminates at Monday review.** Future sessions revert to nwrp157/162/164/166 halt-and-surface-on-discipline-boundary default.
- **Cost-discipline pattern continues to operate.** Slice-2's $200 ceiling (if approved) gets per-plan halt gate at $50 (Rule 7d codified in CLAUDE.md per Deliverable #3).
