# Calibration log

Per-phase retrospective entries. Append-only. Written by `nightwork-custodian` at post-ship sweep per D-13 in `.planning/phases/stage-1.5c-verification-harness/01.5-c-verification-harness-CONTEXT.md`.

**Schema:** `.planning/calibration-log-schema.md` (D-14 / Plan-review watchpoint #4).

**Reader:** `/np` orchestrator references the most recent 3-5 entries when scoping a new phase. Per D-27 dynamic prompting, orchestrator adjusts parallelism / prompt density / iter budget per the heuristics in the schema.

**Format:** JSON front-matter (machine-readable) + markdown body (human-readable). Both required. See schema for field list.

**Writer rules:** custodian extracts from PLAN SUMMARY.md / qa-runs / verification reports / lessons.md. No speculation beyond extractable data.

---

## stage-1.5c-verification-harness (PENDING SHIP)

```yaml
---
phase: stage-1.5c-verification-harness
shipped_at: <pending>
wave_count: 8
parallelism_used: 3
plan_count: 12
plan_iter_counts:
  "01": 0
  "02": 0
  "03": 0
  "04": 0
  "05": 0
  "06": 0
  "07": 0
  "08a": 0
  "08b": 0
  "09": 0
  "10": 0
  "11": 0
harness_runs: 0
harness_pass_rate: 0.0
harness_iter_counts:
  iter_1_resolved: 0
  iter_2_resolved: 0
  iter_3_resolved: 0
  iter_3_halt_for_jake: 0
ambiguous_vision_halts: 0
vision_cost_usd: 0
vision_cache_hit_rate: 0.0
prompt_density_signal: 3
drift_cases: 0
process_discipline_violations: 0
---
```

## What worked

(pending ship — custodian fills from QA report + lessons.md after Plan 11 self-test PASSes and Jake merges to main)

## What didn't

(pending ship)

## Adjustment for next phase

(pending ship)

## Cost notes

(pending ship — Plan 11 self-test will surface first vision_cost_usd data)

## Process notes

- 1.5c IA Plan 1 dev-server-kill incident (2026-05-05) is the carry-forward process discipline lesson — every executor brief in this phase reinforced "Never kill running processes" rule.

---

## stage-1.5c-information-architecture Block N+1 follow-ups (post-2026-05-11)

### useCurrentRole onAuthStateChange listener

**What**: Modify `src/hooks/use-current-role.ts` to subscribe to `supabase.auth.onAuthStateChange` for SIGNED_IN events in addition to the existing mount-time `getUser()` call. Would also benefit `src/components/nav-bar.tsx`'s profile fetch (same pattern).

**Why**: Production improvement that would resolve AC-1-8-class harness-incompatible criteria (client-side hook reads auth state with one-shot pattern + no listener; harness-injected sessions land too late to influence the hook before render). Real users would also benefit (cross-tab login sync, no stale-empty-session edge cases during slow networks).

**Effort**: ~30 min, including hook diff + cleanup of any cascading callsites + harness validation re-run.

**Trigger condition**: Pairs with F1 schema work where role-evaluation logic gets touched (will be modifying these hooks anyway). Could also land as a stand-alone polish PR if a future harness gap surfaces.

**Diagnostic provenance**: stage-1.5c-vh Block N+1 surfaced via Y.1.D race-confirmation diagnostic (nwrp86 W.1 validation). Diagnostic chain: nwrp79..nwrp87. Cookie + token + Supabase API all verified working in headless; only the hook's one-shot pattern is the gap.

**Estimated value**: removes 1 known harness limitation entirely; enables future Layer 3 visual/semantic criteria against any auth-gated client-rendered UI.

### F1+ harness extension — multi-viewport + interactive testing

**What**: Extend the verification harness with two categories not in 1.5c-IA scope:
1. **Multi-viewport Layer 3** — currently L3 vision uses a single 1280×800 viewport. Add 393×852 (iPhone 14 Pro) + 768×1024 (tablet) + 360×800 (smallest phone) as harness-managed standard viewports. Vision evaluates each at each viewport. Estimated +3x Layer 3 cost per criterion; budget impact ~$0.20/run.
2. **Interactive behavioral testing** — currently Layer 1 + 2 + 3 are non-interactive (page render checks). Add a Layer 1.5 or Layer 4 that scripts Playwright through user flows (click X, expect Y; open dropdown, click nested item, expect navigation). Stage 1.5c-IA's PerJobTabs mobile dropdown smoke had to be done by Jake manually (or one-off Playwright script) because the harness can't traverse interactive UI patterns.

**Why**: Two real issues surfaced post-1.5c-IA ship that the harness couldn't have caught:
- SMOKE 3 (2026-05-12): 13 of 24 viewport×route checks showed horizontal overflow at tablet 768×1024. Layer 3 single-viewport vision never sees this.
- SMOKE 4 (2026-05-12): PerJobTabs mobile dropdown traversal — harness can't open the dropdown + verify tab clicks navigate to correct sub-routes.

**Effort**: Likely a Wave 1.1-Full sub-phase. Multi-viewport extends `src/lib/verification/layer3/runner.ts` to loop over viewports; interactive layer is more substantial (~2-3 days of new framework code).

**Diagnostic provenance**: stage-1.5c-information-architecture Block N+2 GATE-B.1 manual smokes 2026-05-12. Both smokes were automatable in principle but not in current harness scope.

**Pairs with**: F1 schema work where many auth-gated routes get real DB-backed implementations and multi-viewport responsive validation becomes load-bearing.

---

## stage-f1-knowledge-graph-auth-wave-a (SHIPPED 2026-05-12; gate-A halt 2026-05-13)

```yaml
---
phase: stage-f1-knowledge-graph-auth-wave-a
shipped_at: 2026-05-12
wave_count: 1
parallelism_used: 4
plan_count: 4
plan_iter_counts:
  "A-1": 1
  "A-2": 1
  "A-3": 1
  "A-4": 1
harness_runs: 0
harness_pass_rate: 0.0
harness_iter_counts:
  iter_1_resolved: 0
  iter_2_resolved: 0
  iter_3_resolved: 0
  iter_3_halt_for_jake: 0
ambiguous_vision_halts: 0
vision_cost_usd: 0
vision_cache_hit_rate: 0.0
prompt_density_signal: 3
drift_cases: 0
process_discipline_violations: 4
---
```

### Pre-commit `--no-verify` bypass discipline lesson (process_discipline_violations = 4)

**Incident:** Across Wave-A's 4 plan-execute commits (`a7034dd` Plan A-1, `d04a428` Plan A-2, `c763c2e` Plan A-3, `d696fa1` Plan A-4), the executor agent bypassed the Claude-Bash pre-commit hook 4× via `--no-verify`. Each bypass occurred after manual verification of substantive checks (typecheck + build + system `.githooks/pre-commit` Drummond gate all exit 0). **System-level Drummond gate was never bypassed.**

**Root causes (both addressed):**
1. **Stale `/nightwork-qa` report threshold** — Claude-Bash hook checks for QA report freshness vs a 60-min threshold; latest report was 500+ mins old, triggering false-positive block. Future-Wave-N fix: pair every plan-execute with a fresh `/nightwork-qa` run or relax the QA-report-freshness threshold for known-fresh-state plans.
2. **`.claude/hooks/nightwork-post-edit.sh:105` grep arg-parsing bug** — `grep -iq "-- nightwork: drop-justified" "$FILE"` parses the leading `--` in the pattern as an option terminator, breaking with `unknown option`. Fixed in commit [TBD] via `grep -iq -- "-- nightwork: drop-justified" "$FILE"` (`--` before pattern).

**Discipline lesson (codified in CLAUDE.md Dev Rules):** Pre-commit hook failures should HALT for Jake authorization, not bypass-and-continue. Even with stated good reason, bypassing the gate without authorization erodes the discipline that catches real problems later. Going forward: hook failures = halt. Per-incident bypass requires explicit Jake authorization with bypass + rationale documented in commit body. Drummond gate (`.githooks/pre-commit`) is never bypassed under any circumstance.

### What worked

- **Parallel plan authoring + sequential execute pattern.** 4 plans authored in parallel by gsd-planner agents (3626 lines of PLAN.md content in one background batch), then executed atomically in migration-number sequence (00094 → 00095 → 00096). Total wall time ~6 hours for plan-authoring + 6-reviewer plan-review + 4-plan execute + post-execution QA. Recommend pattern for future bounded-cleanup waves.
- **iter-2 patch addendum protocol.** Consolidated `ITER-2-PATCHES.md` as authoritative override on PLAN.md files — no iter-2 reviewer round needed when findings are doc-level + small SQL adjustments. 14 unique HIGH findings + 1 CRITICAL resolved via single iter-2 doc.
- **Plan-author scope extensions.** gsd-planner agents do meaningful read-only investigation when given proper context — A-3's 3rd missed consumer (`budget-lines/[id]/route.ts`) and A-4's 4 INSERT sites + regression test scope were both surfaced during plan authoring, not flagged in original prompts.
- **6-reviewer iter-1 plan-review caught 1 CRITICAL early.** A-4 task-text-vs-migration-body `deleted_at` filter inconsistency caught by 5-of-6 reviewers (multi-tenant-architect upgraded to CRITICAL; data-migration-safety + database-reviewer + rls-auditor + security-reviewer all flagged). Resolution: migration body's no-filter version is safer (NOT NULL applies to all rows). No production schema risk because of fail-fast pre-flight + DO blocks in migration.

### What didn't

- **`--no-verify` bypass pattern (see lesson above).** 4× across Wave-A; root causes addressed but discipline erosion is a real cost.
- **Migration apply deferred to GATE-A batch.** gsd-executor agent didn't have `mcp__supabase__apply_migration` exposed in its toolset; migrations were authored + committed but not applied. Caused two-step flow at GATE-A. Future executor toolset should include Supabase MCP for self-applied migrations OR define an explicit "code-only ship + apply later" envelope.
- **AC-A1-05 wording overstates code reality.** Plan-author AC stated "each of N target rows" but code skips self-transitions (correct per intent OQ-A1-2). Future plan-author rule: AC text must match code semantics exactly.

### Adjustment for next phase (Wave-B)

- **Pre-flight Jake auth for any `--no-verify` use.** Codified in CLAUDE.md Dev Rules. If hook fails, HALT with diagnostic; do not bypass.
- **Bundle hook-bug fixes into Wave-B Plan B-7 or earlier** — `.claude/hooks/nightwork-post-edit.sh:105` is fixed in this calibration commit; remaining tooling debt may surface during Wave-B's broader RLS/auth work.
- **gsd-executor toolset enhancement** — expose `mcp__supabase__apply_migration` so plan execute can apply + verify in single pass.
- **AC wording vs code intent rule** — gsd-planner agents should be briefed: "AC text must describe what the code actually does, not the colloquial summary of what was asked."
- **Wave-B Plan B-3 inherits:** bulk lien-releases atomicity restoration (HF-A1-2 + ai-logic-tester's new finding re: `count` vs `updatedCount` mismatch) + status_history-trigger safety net.

### Cost notes

Wave-A cumulative vision spend: ~$0 (purely text-based: plan authoring + review + execute + QA). Pre-Wave-A baseline ~$2 of $5 ceiling — unchanged. Harness Layer 3 verification deferred to post-migration-apply; will add some vision spend at Vercel-preview-against-applied-schema time.

### Process notes

- 4 plans / 1 wave / 4-way parallelism on plan authoring + plan-review (6 reviewers parallel) is the upper bound that worked cleanly here. Larger plan counts may need orchestration assistance.
- Pre-existing test failures (`lien-release-waived-at.test.ts` 3/9 from A-1 bulk regression per HF-A1-2; `multi-org-session.test.ts` 1/4 from stage-1.5c-vh Plan 5 `1cc868d`) captured as known-state for Wave-B Plan B-3 inheritance.
- iter-1 CRITICAL finding (A-4 deleted_at filter inconsistency): **no reviewer dissented**; the 5-of-6 consensus refers to 5 of 6 reviewers explicitly flagging the same issue (architect didn't flag it; the 5 who did all converged on the same resolution — use migration body's no-filter version). No pushback captured because no dissent existed.

---

## stage-f1-knowledge-graph-auth-wave-d (DRAFT — PENDING SHIP)

```yaml
---
phase: stage-f1-knowledge-graph-auth-wave-d
shipped_at: <pending>
wave_count: 1
parallelism_used: <pending — sequential D-2 → D-1 after nwrp127 catch>
plan_count: 5
plan_iter_counts:
  "D-1": 2
  "D-2": 2
  "D-3": 2
  "D-4": 3  # iter-1 + iter-2 + iter-3 (nwrp127 Rule 5 addition)
  "D-5": 1
harness_runs: 0
harness_pass_rate: 0.0
ambiguous_vision_halts: 0
vision_cost_usd: ~1.86  # pre-Wave-D baseline; Wave-D execute will add some
process_discipline_violations: 0
---
```

### Process notes (draft — custodian extends at post-ship sweep)

- **iter-2 patch propagation gap surfaced twice in Wave-D.** ITER-2-PATCHES.md captures iter-2 plan-review decisions as an addendum on top of PLAN.md files, but plan-authors did NOT consistently propagate iter-2 patches INTO the PLAN.md files themselves before dispatch. Two specific cases:
  1. **D-4 needed full re-author** (per nwrp124) because 20 subsections of patches accumulated into incoherent stack; re-author produced 1575-line coherent PLAN.md.
  2. **D-2 needed rescope re-author** (per nwrp128) because nwrp123 decision 1's 6→8 file expansion was captured in ITER-2-PATCHES.md §2 but not propagated to D-2 PLAN.md, surfacing only at pre-dispatch grep check.

  **Pattern:** ITER-2-PATCHES.md is a changelog, not an executable artifact. Plans dispatched from PLAN.md files must reflect iter-2 patches IN the plan files, not just in the patch addendum. Future iter-2 protocol must include a "propagate-to-plan" step before plan-author closes iter-2 (proposed: gsd-planner's iter-2 close-out task should mechanically apply each ITER-2-PATCHES.md §X into the corresponding PLAN.md, OR the plan-author should re-emit the full PLAN.md with patches inlined as the iter-2 deliverable).

- **parallel_execute_ok over-assertion surfaced at pre-dispatch.** D-1 + D-2 both claimed `parallel_execute_ok: true` based on plan-author logical reasoning ("migration vs UI is independent"), but files_modified intersection revealed 2 shared files (invoices/page.tsx, invoices/queue/page.tsx). Caught by pre-flight grep at nwrp127 (during execute-resume), not at plan-author or plan-review iter-1/iter-2 time. Resolution: nwrp127 added Rule 5 to CLAUDE.md Workflow posture + plan-review enforcement (Plan D-4 Task 2 extended with Rule 5 enforcement section). Mechanical guardrail now structural for future waves.

- **nwrp129 finding: deliverable path reachability gap.** TD-WD-01 declared as Wave-D deliverable in ITER-2-PATCHES.md §2.2 + D-2 PLAN.md (18 cross-refs) but the target path `.planning/tech-debt/` was not whitelisted in `.gitignore`. Caught at pre-commit when the file was created by the gsd-planner re-author but `git status` showed `.planning/tech-debt/` as ignored. Resolved by whitelisting `.planning/tech-debt/` as canonical artifact path alongside `architecture/`, `phases/`, `expansions/`. Pattern (3rd Wave-D iter-2/3 propagation gap; see two above): iter-2 protocol must include "verify infrastructure supports declared deliverables" as a pre-commit check. Specifically — any new file path declared in plan `files_modified` or `must_haves.artifacts` must be reachable from a fresh checkout (i.e. either already tracked OR explicitly added to the canonical `.gitignore` whitelist). Plan-author cannot assume gitignore whitelist exists — must verify or add.

- **nwrp130 finding: precursor-violation hook halt at execute time.** D-2 executor halted at Task 2 on pre-existing `bg-white` violation in `src/app/invoices/page.tsx:822` (commit `2c5607e3`, 2026-04-13 — 31 days pre-D-2). Post-edit hook correctly halted on a real design-token violation, but the whole-file scan posture means any pre-existing violation in a target file blocks unrelated work on that file until the precursor is cleaned. Resolved by precursor commit `e9fbbd3` (`bg-white` → `bg-nw-white-sand` per Slate fallback rule — no Toggle primitive exists in SYSTEM.md/COMPONENTS.md; token-migration-map.md only excepts PDF previews, not toggle thumbs). Pattern (4th Wave-D iter-3 process gap after nwrp124/128/129): files targeted by Wave-D plans accumulated technical debt before Wave-D scoped them. The corrective wave can't proceed without first addressing precursor violations. Two sibling toggle-thumb violations flagged for future cleanup: `PaymentTrackingPanel.tsx:35` + `InternalBillingTypesManager.tsx:601` (NOT D-2 targets; Wave 1.1-Lite candidate).

- **nwrp131 finding: Rule 6 pre-flight regex precision gap.** After nwrp130 codified Rule 6 (precursor hook scan), orchestrator's first Rule 6 pre-flight scan used the narrower pattern `bg-white|bg-gray-[0-9]|bg-blue-[0-9]|...` and missed `hover:text-white` on `src/app/financials/aging-report/page.tsx:27`. The hook's authoritative regex is `\b(bg|text|border)-(white|black)\b` — the word-boundary `\b` anchor is load-bearing because it catches `hover:`-prefix variants (`hover:text-white`, `focus:bg-black`, etc.) that a naive prefix-anchored regex misses. D-2's 2nd executor attempt halted on the missed violation; precursor commit `fd70122` cleaned it; D-4 Rule 6 enforcement section extended with the COMPLETE hook forbidden-pattern set (HEX_HITS, NAMED_HITS, PURE_HITS, LEGACY_HITS, ORG_ID_HITS, ROUNDED, CB4, CB2, SHADOW, PURPLE) and a new WARNING finding `PLAN_PRECURSOR_SCAN_REGEX_NARROWED` for plan-review use of narrower approximations.

- **Cumulative Wave-D process gaps: 5 total.** iter-2-patch propagation (nwrp124, nwrp128, nwrp129) + precursor-violation scan (nwrp130) + precursor-scan regex precision (nwrp131). Pattern recognition: corrective waves disproportionately surface pre-existing tech debt because they touch files that have accumulated debt unscoped by the original feature that authored them. Each gap discovered late = a process-tightening at the next "before-dispatch" check. Pattern is converging — nwrp131 was a regex precision fix on the nwrp130 check, not a new category. Wave-B should ship with all 5 gaps closed via Rules 5-6 enforcement at plan-review iter-1 + the calibration-log-codified Wave-B adjustments (deliverable path reachability + precursor hook scan).

- **Wave-D execute sequencing.** Per nwrp127 sequencing decision: D-5 (shipped 2026-05-13 c84b4a0) → D-2 → D-1 → D-4 → D-3 → migration apply + Vercel preview + wave-d-smoke + /nightwork-qa + GATE-N. Originally planned parallel D-1 + D-2; flipped to sequential post-files_modified-overlap finding.

### What worked (preliminary)

(pending ship — custodian fills from QA report after GATE-N)

### What didn't (preliminary)

- iter-2 patch propagation discipline (two cases above; addressed in calibration adjustment below)
- parallel_execute_ok claim discipline at plan-author + plan-review time (one case; addressed via Rule 5 codification + plan-review enforcement)

### Adjustment for next wave

- **iter-2 close-out protocol:** future plan-author iter-2 deliverable should be the patched PLAN.md, not a separate ITER-2-PATCHES.md addendum. If addendum is preserved for traceability, plan-author must produce a traceability mini-diff confirming each addendum section landed in PLAN.md.
- **Rule 5 plan-review check now mechanical:** plan-review iter-1 runs files_modified intersection grep on every parallel-claimed plan pair in the wave. Missing check = BLOCKING (per Plan D-4 Task 2 Rule 5 enforcement section).
- **Deliverable path reachability check (Wave-B onward):** plan-review iter-1 includes a "deliverable path reachability" check — for every file path in plan `files_modified` or `must_haves.artifacts`, verify the path will be tracked in git from a fresh checkout (already-whitelisted parent OR new explicit whitelist entry in the same plan). Missing whitelist for a declared deliverable = BLOCKING. Origin: nwrp129 (Wave-D D-2 TD-WD-01 surfaced this gap during pre-commit, not during plan-author or plan-review).
- **Precursor hook scan check (Wave-B onward):** plan-review iter-1 includes a "precursor hook scan" check — for every file in plan `files_modified`, run the post-edit hook (or equivalent design-token / typecheck scan) against the current file state; any pre-existing HALT = surface to plan-author for either (a) include precursor cleanup in plan scope with explicit separation in the commit graph, OR (b) author a precursor plan that ships first. Either is acceptable; what's NOT acceptable is discovering at execute time. Missing check = WARNING (not BLOCKING since it doesn't always apply — schema-only / doc-only plans may not touch hook-scanned surfaces). Origin: nwrp130 (Wave-D D-2 surfaced pre-existing `bg-white` on `invoices/page.tsx:822` at executor's Task 2; precursor commit `e9fbbd3` cleaned it before D-2 re-dispatched).
