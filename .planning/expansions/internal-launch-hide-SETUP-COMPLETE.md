# Setup complete — internal-launch-hide

**Status:** READY FOR PLAN
**Completed:** 2026-05-26
**Phase:** internal-launch-hide (Phase 1 of Internal Ross Built Launch SEQUENCE: HIDE → UI-FINALIZE → BUILD → fix → TEST/dogfood)
**Halt-gate ceiling:** $25 (per nwrp227; halt-gate control point, NOT believed budget)
**Per-plan halt:** $50 per Rule 7d

---

## AUTO items (executed — 9/9 pass)

- [x] **EXPANDED-SCOPE.md presence + APPROVED status** — file exists at `.planning/expansions/internal-launch-hide-EXPANDED-SCOPE.md`; status line confirms APPROVED with Q1-Q3 answered via AskUserQuestion.
- [x] **`.env.local` no-conflict check** — zero existing `NEXT_PUBLIC_FEATURE_*` values (no overwrite risk per skill rule).
- [x] **Source-file path-reachability (Rule 6(c))** — all 9 source files exist + git-tracked: `src/components/nav-bar.tsx`, `src/middleware.ts`, `src/components/nav/per-job-tabs.tsx`, `src/app/financials/page.tsx`, `src/app/admin/page.tsx`, `src/app/people/page.tsx`, `src/app/company/page.tsx`, `src/app/pipeline/page.tsx`, `src/app/reports/page.tsx`.
- [x] **Hook regex sweep (Rule 6(a))** — 0 hex literals, 0 hardcoded ORG_IDs, 0 `min-[NNNpx]:` arbitrary breakpoints across all 9 files. 14 pre-existing `rgba(247,245,236,0.X)` white-sand-alpha tints in nav-bar.tsx documented as not-blocking (distinct from TD-B2b-RGBA-CLEANUP family; not in Phase 1 touched lines; touched-lines-only hook per Rule 8 won't fire).
- [x] **W.1 precedent reference** — `NEXT_PUBLIC_AUTH_STATE_LISTENER` + `D-T7-VERCEL-CLI-API-FALLBACK` both documented in `.planning/MASTER-PLAN.md` (env-var-as-feature-flag pattern is well-trodden).
- [x] **npm dependency check** — no new packages required (config + UI conditionals only).
- [x] **Schema / migration check** — no DB work in Phase 1 (per EXPANDED-SCOPE §1: "NO new entities. NO new tables. NO new RLS policies. NO new mutations. NO schema changes.").
- [x] **Fixture-infra collision (Rule 6(b))** — no SQL deliverables; N/A.
- [x] **files_modified intersection (Rule 6(d))** — single plan, no parallel dispatch; N/A.

Full audit trail: `.planning/expansions/internal-launch-hide-AUTO-LOG.md`.
Rule 6 pre-flight summary: `.planning/expansions/internal-launch-hide-PREFLIGHT-PASS.md`.

## MANUAL items (validated — 1/1 pass)

- [x] **Vercel env-var add for 6 `NEXT_PUBLIC_FEATURE_*` flags × 2 environments** — validated via `vercel env ls production` (all 6 present in Production AND Preview, created 2026-05-26) + `vercel env pull` for both environments confirming presence. Values set to empty string `""` (Jake's call per AskUserQuestion 2026-05-26: accept empty as functionally equivalent to `"false"` since the W.1 fail-closed pattern at `src/hooks/use-current-role.ts:67-69` checks `!== "true"`, so both evaluate as OFF). The 6 flags:
  - `NEXT_PUBLIC_FEATURE_OWNER_PORTAL`
  - `NEXT_PUBLIC_FEATURE_PIPELINE`
  - `NEXT_PUBLIC_FEATURE_COMPANY`
  - `NEXT_PUBLIC_FEATURE_REPORTS`
  - `NEXT_PUBLIC_FEATURE_PRICE_INTEL_F5`
  - `NEXT_PUBLIC_FEATURE_FINANCIALS_F1_VIEWS`

## Phase 1 ready-to-dispatch summary

| Field | Value |
|---|---|
| Phase | `internal-launch-hide` |
| Sequence step | HIDE (first per locked-scope rationale) |
| Threat-model severity | LOW (env vars + nav + middleware; no schema; no financial logic; no data writes; reversible via env-var flip) |
| Halt-gate ceiling | $25 |
| Per-plan halt | $50 (Rule 7d) |
| Max bumps | 1 per Rule 7c (low expected-bump risk per nwrp227 framing) |
| Plan-author self-resolution of overrun | BANNED per Rule 7a |
| Smoke required | YES — `requires_smoke: true` per Rule 4 (UI-touching plan) |
| Rule 1 verification | Vercel preview walk mandatory before /nightwork-qa PASS |
| Source files modified | 9 (see AUTO-LOG §3) |
| Sign-off scope | Phase 1 STOPS at its sign-off gate; does NOT roll into Phase 2 (per nwrp227 explicit directive) |

## Next

Run `/np internal-launch-hide` to begin planning.

After `/np` completes and Jake authorizes execute, run `/nx internal-launch-hide` (which fires `/nightwork-preflight` → reads this file → confirms ready → dispatches `/gsd-execute-phase` → fires `/nightwork-qa` post-execute).

Jake sign-off gate (per `INTERNAL-LAUNCH-PHASED-PLAN.md` §Phase 1): Jake visually confirms the 4-section + Admin dropdown spec on Vercel preview (desktop + mobile); `/nightwork-qa` PASS; custodian sweep marks Phase 1 done. **STOPS at that gate; does NOT roll into Phase 2.**

Phase 2 (UI-FINALIZE) cycle awaits separate Jake authorization per the phased plan dependency graph.

---

If during planning EXPANDED-SCOPE.md needs revision (a prerequisite was missed), update EXPANDED-SCOPE.md and re-run `/nightwork-auto-setup internal-launch-hide` to refresh setup.
