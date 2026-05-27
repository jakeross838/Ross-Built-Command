# Planner Cross-Review — internal-launch-hide PLAN.md

**Reviewer:** planner (cross-review lens; independent of original plan author)
**Date:** 2026-05-27
**Verdict:** WARNING (with 1 CRITICAL finding requiring resolution before /nx)

---

## Summary

Plan is high quality overall — task decomposition is coherent, AC derivation hits 22/23 must_haves, locked decisions D-01..D-06 are all implemented, halt-gate fields and threat model are complete. Two open questions correctly surfaced as HARD HALT dispatch-blockers.

**Two findings prevent unqualified APPROVE:**

1. **CRITICAL — `/people/vendors` reachability self-contradiction.** Plan internally contradicts itself: must_have line 49 + Task 5.3 claim "Section-overview Card grid on /people shows only Vendors (1 card)" with `live: true` filter; but Task 3 middleware-404s entire `/people/*` (no carve-out for `/people/vendors`); Task 6 smoke #4 explicitly asserts `GET /people/vendors → 404 (no carve-out)`. The "1 card visible" describes unreachable state. `/people/vendors` is itself a Caldwell-fixture-mount thin wrapper (`src/app/people/vendors/page.tsx:13-30` imports CALDWELL_VENDORS) — same architectural class as `/jobs/[id]/schedule` (Wave-2 hide).

2. **WARNING — Task-level dependency graph implicit only.** Task 1 (helper) → Tasks 2/3/5 (consumers) dependency is mechanical-via-import but not declared in any `depends_on` annotation. Partial-execute scenarios could land consumers before helper.

---

## Per-check findings

### CHECK 1 — Task decomposition quality: PASS (with note)

6 tasks, each scoped to a single coherent change:
- Task 1 = helper (1 NEW file)
- Task 2 = top nav filter (1 file)
- Task 3 = middleware gates (1 file)
- Task 4 = per-job tabs static removal (1 file; D-06 no helper import)
- Task 5 = section overview Card grids (6 files; identical pattern)
- Task 6 = smoke artifact (1 new script + 1 results JSON)

Wave structure correct (single wave, `parallel_execute_ok: false`). Sizes appropriate. Task 5 is the largest (6 files) but justified by pattern symmetry per `<scope_rationale>`.

### CHECK 2 — AC derivation: WARNING

22/23 must_haves demonstrably covered by at least one task AC. **1 (line 49 "/people shows only Vendors") describes unreachable state per CHECK 3.**

**Owner Portal DUAL gate AC for UI + API** (Jake's nwrp231 emphasis): **PASS.** Verified at PLAN.md lines 609-616 (Task 3 action), 765-767 (Task 3 AC), 1283 (Task 6 smoke). Both `/owner/*` AND `/api/owner-portal/*` gated.

**Reversibility AC**: PASS (Task 6 smoke #10 MANUAL + verification §Runtime AC line 1498).

**Fail-closed default AC**: PASS at Task 1 AC line 401 + verification §Mechanical AC line 1486.

**Middleware tag posture preservation AC**: PASS at Task 3 AC line 771 (insertion line-number check) + verification §Runtime AC line 1497.

**Idiom consistency AC across 4 read sites**: PASS — D-04 mechanical AC `! grep -rEn '=== ?"false"|!process\.env\.NEXT_PUBLIC_FEATURE|Boolean(process\.env\.NEXT_PUBLIC_FEATURE' src/` at line 1486 catches all forbidden patterns.

### CHECK 3 — Coverage check: CRITICAL (`/people/vendors` contradiction)

**EXPANDED-SCOPE §7 work items:** all 5 covered.
**CONTEXT D-01..D-06 decisions:** all 6 implemented.
**Phased-plan §Phase 1 AC (9 items):** all 7 stated + 2 NEW covered.

**Locked decisions dropped or partially implemented:**

- **CRITICAL — `/people/vendors` reachability internally contradictory.**
  - must_have line 49 + Task 5.3 ALL_PEOPLE_SECTIONS line 1044 claim `live: true`
  - Task 3 middleware 404s entire `/people/*` (lines 644-648; no carve-out)
  - Task 6 smoke #4 asserts `GET /people/vendors → 404 (no carve-out)` (line 1285)
  - `/people/vendors` itself is Caldwell-fixture-mount (`src/app/people/vendors/page.tsx:13-30`) — same Wave-2 class as `/jobs/[id]/schedule`
  - Three resolution paths (plan-author picks one):
    - **(a) Vendors is a carve-out** — add `/people/vendors` to not-404'd allowlist in middleware; contradicts D-03 + Task 6 smoke
    - **(b) Vendors is hidden too** [RECOMMENDED] — mark `live: false` in Task 5.3; update must_have line 49 to "Section-overview Card grid on /people is unreachable in flag-OFF state (middleware 404); filter retained as defensive future-state"; remove `/people/vendors → 200` from any AC
    - **(c) Acknowledge unreachable** — keep must_have line 49 but reword to "in flag-ON state, /people shows N cards" + document flag-OFF unreachability

### CHECK 4 — Open question handling: PASS

Both OQ #1 (Schedule flag bundling) + OQ #3 (PEOPLE flag mechanism) surfaced clearly as HARD HALT dispatch-blockers at `<dispatch_blocker>` table (PLAN.md lines 127-138) + plan body OQ §1 + §3.

Plan body documents assumed path + revision required if Jake picks alternative. No silent assumptions.

OQ #2 (404 vs 403) + OQ #4 (empty Card grid UX) surfaced as SOFT HALT recommendations.

### CHECK 5 — Dependency graph + sequencing: WARNING (implicit only)

- Task 1 → Tasks 2/3/5 dependency: mechanical-via-import; not declared formally
- Task 4: no Task 1 dependency (D-06 explicit no-import)
- Task 6: must run last; implicit only

Recommend explicit task-level `depends_on`:
```
Task 2: depends_on: [Task 1]
Task 3: depends_on: [Task 1]
Task 4: depends_on: []
Task 5: depends_on: [Task 1]
Task 6: depends_on: [Task 1, Task 2, Task 3, Task 4, Task 5]
```

### CHECK 6 — Frontmatter compliance: PASS (1 ceiling-value clarification)

All required fields present (`requires_smoke`, `parallel_execute_ok`, `files_modified`, `halt_gate_ceiling`, `per_plan_halt`, `plan_author_self_resolution_overrun: BANNED`, `max_bumps_per_slice`, `<threat_model>` block).

**CLARIFY:** Frontmatter `halt_gate_ceiling: 25` cites nwrp227 only. nwrp231 authorized bump $25→$50 for plan-review reduced-set. If bump applies to total Phase 1 plan-author budget: update to `halt_gate_ceiling: 50` with audit trail. If bump applies only to plan-review runtime (separate budget category): no change needed. Orchestrator clarifies.

### CHECK 7 — Scope + cost discipline: PASS (cost-projection note)

Scope cohesion accurate. No scope creep beyond HIDE.

Per-plan halt $50 risk: Task 6 (Playwright smoke) is the cost unknown. Recommend executor monitor cost halfway through Task 5 + halt if projecting >$50 per Rule 7d.

---

## Recommendations (priority order)

**A. CRITICAL — Resolve `/people/vendors` reachability contradiction.** Plan-author picks (a)/(b)/(c). Recommend (b). 1-line fix: change `live: true` → `live: false` in Task 5.3 ALL_PEOPLE_SECTIONS + update must_have line 49.

**B. WARNING — Add task-level `depends_on` annotations.**

**C. WARNING — Same review treatment for /company Overview** (must_have line 50). Same shape contradiction. Reword or accept with note.

**D. CLARIFY — Ceiling field value vs nwrp231 bump.** Update frontmatter if bump applies to total Phase 1.

**E. NOTE — Smoke Task 6 area string list (line 1372-1376)** hard-codes 10 area strings. Executor either matches verbatim OR uses looser grep patterns.

---

## Cross-task concerns / scope drift

- **Plan body line 1485 + line 1492 assume OQ #3 path (a).** If Jake picks path (b), AC counts shift + Vercel env-add for PEOPLE NOT required. Plan-author add conditional AC.
- **SETUP-COMPLETE.md currently lists 6 flags.** If Jake picks OQ #3 path (a), MUST update to 7 + run Vercel env-add for PEOPLE BEFORE /nx dispatch.

---

## Final summary

**Verdict: WARNING (CRITICAL finding requires plan-author resolution before /nx).** Plan is high quality; CRITICAL finding is a clean self-contradiction with a 1-line fix. Other findings are clarifications + documentation improvements.

**Files referenced:**
- `.planning/phases/internal-launch-hide/internal-launch-PLAN.md`
- `.planning/phases/internal-launch-hide/internal-launch-CONTEXT.md`
- `.planning/expansions/internal-launch-hide-EXPANDED-SCOPE.md`
- `.planning/expansions/internal-launch-hide-SETUP-COMPLETE.md`
- `.planning/launch/INTERNAL-LAUNCH-PHASED-PLAN.md`
- `src/hooks/use-current-role.ts` (W.1 precedent)
- `src/app/people/vendors/page.tsx` (Caldwell-fixture-mount; relevant to CHECK 3)
- `src/app/admin/page.tsx` (current ADMIN_TILES state)
- `src/app/admin/owner-portal-tokens/page.tsx` (Owner Portal Tokens route exists)
