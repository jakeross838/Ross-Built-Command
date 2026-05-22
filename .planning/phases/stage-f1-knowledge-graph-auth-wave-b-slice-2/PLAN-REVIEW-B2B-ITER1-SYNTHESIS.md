# Plan-review iter-1 synthesis — B-2b

**Generated:** 2026-05-22
**PLAN:** `.planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2b-PLAN.md` (1846 lines; commit `5ab2126`)
**Reviewers:** 5 (LEANER scope per nwrp209 §10 — DROPPED multi-tenant + rls; B-2a proved isolation)
**Dispatcher:** /np orchestrator via nwrp209 §5-17 authorization
**Iter-1 verdict:** **PASS** — 0 BLOCKING; multiple WARN/NOTE/FLAG items addressable inline at /nx OR by short revision; per nwrp209 §12 "target ONE iter cycle" satisfied

---

## Per-reviewer verdicts

| Reviewer | Verdict | Headline |
|---|---|---|
| spec-checker | **PASS** | 10/10 ACs falsifiable; `<criteria>` block complete (5 categories); B-12..B-16 closures verified; 2 WARN + 2 NOTE; AC-B2b-10 forward-carried GATE correctly load-bearing |
| ui-reviewer | **PASS with 3 FLAGS** | Mobile viewport coverage PASS; touch targets 56px PASS; FLAGS: §2j.3 citation drift, inline `minHeight` style, OwnerDrawView layout fidelity not verified by AC |
| nightwork-design-pushback | **APPROVE** | 2 WARN (citation drift + SYSTEM.md NwButton docs lag for Wave 1.1-Lite); TD-20 exemption + Latitude #4 (a) accepted; logo + color + pattern compliance confirmed |
| custodian | **PASS** | Tree state clean; commit chain hygiene clean; Slice-2 ledger ~$93-121 of $200 surfaced per nwrp209 §17; no concerns |
| security-reviewer (NARROW) | **PASS** | All 7 narrow checks clear; AC-B2b-10 treated as load-bearing GATE not defer-to-future; one non-blocking observation re ephemeral test token |

**0 BLOCKING findings.** No Rule 9 cross-reviewer factual disagreements.

---

## Cross-reviewer alignments (Rule 9 — alignments, not disagreements)

| Alignment | Reviewers |
|---|---|
| **PATTERNS.md citation drift: "§2j.3" should be "§2h.3"** | spec-checker + ui-reviewer + design-pushback (**3-reviewer alignment**; cosmetic but should be fixed before /nx so SUMMARY commits anchor cleanly) |
| `<criteria>` block complete (5 categories) | spec-checker + ui-reviewer (visual + dom + behavioral + semantic + mechanical entries verified) |
| AC-B2b-10 forward-carried GATE correctly load-bearing | spec-checker + security-reviewer (both confirm test pattern + HALT-before-ship directive) |
| Slice-2 ledger ~$93-121 burn surface | custodian (sole) — per nwrp209 §17; surfaces for B-3 forcing decision |
| TD-20 exemption + Latitude #4 (a) chosen by plan-author | ui-reviewer + design-pushback both APPROVE |

---

## Aggregated findings

### WARNING (5 items; non-blocking; addressable inline or by short revision)

| # | Item | Source | Recommended fix |
|---|---|---|---|
| **W-1** | PATTERNS.md citation drift: "§2j.3" → "§2h.3" at PLAN lines 25, 67, 232, 242, 260, 297, 313, 1138, 1141, 1420, 1568, 1813, 1817 | spec-checker + ui-reviewer + design-pushback (3-reviewer alignment) | Global replace `§2j.3` → `§2h.3` in PLAN body. ~5-min fix. |
| **W-2** | spec-checker AC-B2b-03 cross-client probe references second-client draw not seeded in smoke-seed.sql Step 8 | spec-checker WARN-1 | Either extend smoke-seed.sql Step 8 with a second client + draw fixture, OR document existing cross-client fixture path, OR defer to /nx executor with explicit acknowledgment. |
| **W-3** | `font-mono` → JetBrains Mono mapping deferred to execute (PLAN line 1091) | spec-checker WARN-2 | Verify Tailwind config `font-mono` mapping at /nx OR add explicit verification AC. |
| **W-4** | SYSTEM.md NwButton size docs lag implementation (lg=44px not 56px) — flag for Wave 1.1-Lite | design-pushback WARN-2 | NOT a B-2b blocker. Open TD-B2b-NWBUTTON-XL OR similar for Wave 1.1-Lite (add NwButton `size="xl"` at 56px OR reconcile docs). |
| **W-5** | Inline `style={{ minHeight: "56px" }}` on acknowledge button should be `min-h-[56px]` utility | ui-reviewer FLAG-2 | Convert at execute time (in-task fix; ~1 line). |

### NOTE (3 items; cosmetic; address at execute)

| # | Item | Source | Fix |
|---|---|---|---|
| **N-1** | `draw={drawRow as any}` cast at PLAN:777 — should use `mapDbDrawToCaldwell` (NOTE-2 was supposedly fixed but PLAN body still has this in one spot) | spec-checker NOTE-1 | Apply `mapDbDrawToCaldwell` to drawRow at PLAN:777 (executor verifies during Task 4). |
| **N-2** | `b-2b-toctou-probe.ts` + `b-2b-touch-target-probe.ts` appear in PLAN body but not `files_modified` frontmatter | spec-checker NOTE-2 | Add both scripts to `files_modified` frontmatter (or document as TEST artifacts; custodian verifies git-tracking post-execute). |
| **N-3** | OwnerDrawView internal layout fidelity to Document Review not mechanically verified by any AC | ui-reviewer FLAG-3 | Add smoke-harness assertion verifying file-preview-LEFT structure OR explicit manual-visual-check task at /nx ship test. |

### Non-blocking observations

| # | Item | Source |
|---|---|---|
| obs-1 | Use ephemeral test token (not shared smoke-harness fixture row) for AC-B2b-10 revocation probe to avoid fixture-state contamination between Task 7 and Task 8 | security-reviewer non-blocking |

---

## Slice-2 ledger surface (per nwrp209 §17)

| Plan/activity | Estimate | Actual (running) |
|---|---|---|
| B-2 iter-1 (superseded) | $22-33 | ~$15-20 |
| B-2a (re-split + iter-1 + iter-2 + execute + QA + ACL fix + GATE) | $30-45 | ~$77-98 (executor self-reported $28-37 execute + iter-2 $14-22 + QA $10-18 + ACL fix + re-verify $5-8 + GATE artifact ~$2) |
| B-2b (CONTEXT + planner + plan-checker + revision + 5-reviewer iter-1 + this synthesis) | $15-22 | ~$15-20 (so far) |
| **Slice-2 consumed so far** | — | **~$107-138 of $200** |
| Remaining for B-2b execute + GATE + B-3..B-7 | — | **~$62-93** |
| B-3 est alone | $35-50 | TBD |

**Forcing decision** per nwrp209 §7: B-3 will not fit comfortably in remaining budget if B-2b execute + GATE consumes more than ~$30. Deferred to post-B-2b-GATE rescope conversation.

---

## Recommended path forward

**Per nwrp209 §12 + §15-16 + Tier 1 halt_after gate:**

1. **Surface PLAN + this synthesis to Jake for substantive review.** Do NOT auto-proceed to /nx.

2. **Jake decides on WARN/NOTE/FLAG remediation:**
   - **(A)** Inline /nx with WARN/NOTE/FLAG items addressed at execute time (executor handles in-task — cheap; preserves "target ONE iter cycle" per nwrp209 §12)
   - **(B)** Short revision pre-/nx to fix W-1 (citation drift; 5-min global replace) + N-2 (add scripts to files_modified); rest defer to /nx
   - **(C)** Full revision pre-/nx applying all WARN/NOTE/FLAG items

3. **After Jake's call → /nx B-2b** (preflight + execute + qa + GATE substantive review).

4. **B-2b ship GATE includes forward-carried AC-B2a-08 runtime revocation test** per nwrp209 §3 — if Step 4 of the probe fails, HALT before B-2b ships.

5. **Post-B-2b-GATE: Slice-2 pace-vs-ceiling conversation** per nwrp209 §7 (rescope decision for B-3..B-7 based on remaining $62-93 of $200 ceiling).

---

## Synthesis recommendation

**Recommend Option (B)** — short revision for W-1 (3-reviewer-aligned citation drift; quick global replace) + N-2 (frontmatter files_modified addition). Both are PLAN-doc hygiene that should be clean entering /nx execute. Rest of WARN/NOTE/FLAG items are executor-in-task fixes (W-3, W-5, N-1, N-3) OR Wave-1.1-Lite TDs (W-4).

W-2 (cross-client fixture for AC-B2b-03) is a judgment call — could be added to revision OR documented as executor-task. Defer to Jake.

**Estimated revision cost:** ~$1-2 (text-only edits).

---

## Halt per nwrp209 §15-16 + halt_after: true

**Awaiting Jake disposition** on remediation path (A/B/C above). Then /nx authorization separate per nwrp209 §15.
