# Setup complete — stage-1.5c-information-architecture

**Status:** READY FOR PLAN — 0 MANUAL items pending, 0 AUTO actions needed (structure-only IA phase, 100% existing infrastructure)
**Completed:** 2026-05-05-1115

## AUTO items (executed)

**None.** Stage 1.5c is structure-only — no new tables, env vars, third-party services, npm packages, CI workflows, or fixtures. All infrastructure required by the phase already exists per the 1.5a/1.5b shipping baseline + post-1.5b QA verification.

## VALIDATE items (passed)

- [x] `.planning/architecture/` directory exists (target for 4 NEW canonical docs: ARCHITECTURE.md / ENTITY-INVENTORY.md / ROLES-CATALOG.md / INGESTION-ARCHITECTURE.md) — 6 existing files alongside
- [x] `.githooks/pre-commit` exists (Tier 1.5 Drummond grep gate)
- [x] `.claude/hooks/nightwork-pre-commit.sh` exists (Tier 2 + QA-staleness)
- [x] `.claude/hooks/nightwork-post-edit.sh` exists (T10c sample-data isolation — gating for D-053 thin-wrapper extraction)
- [x] `.github/workflows/drummond-grep-check.yml` exists (Tier 3 CI gate)
- [x] 11 prototype routes at `src/app/design-system/prototypes/*` exist (extraction source per D-053)
- [x] 12 sanitized Caldwell fixtures at `src/app/design-system/_fixtures/drummond/*` (Part 8 LOCKED — DO NOT modify)
- [x] `next.config.mjs` has `redirects()` async function (target for 32 legacy-path 301-redirects)
- [x] `src/middleware.ts` uses `isPlatformAdmin` (Platform Admin badge reuses)

## MANUAL items

**None.** No third-party signups, no env vars, no API keys, no Vercel CLI, no DNS, no OAuth consent, no domain verification.

## Approved decisions carried into plan-phase

Per Jake nwrp44, these decisions are LOCKED entering /np — the discuss-phase + plan-phase agents inherit them and don't re-litigate:

- **D-051** (Q1=A) — Full Bills/Pay Apps rename in 1.5c (50-80 label sites + 32 path 301-redirects)
- **D-052** (Q3=B) — 3 Sub Portal stubs (`/sub-portal`, `/sub-portal/magic/[token]`, `/sub-portal/public/[token]`)
- **D-053** (Q4=A) — Thin-wrapper extraction (refactor 11 prototype components for prop-drilled fixtures, T10c-clean separation)
- **D-054** (Q5=A) — Mobile hamburger expands all 8 nav items + Admin + User; bell + Platform Admin badge stay top-right
- **D-055** (Q6=C) — Today screen Wave-zero layout: move Cash Flow + Getting Started to `/company/overview`
- **D-056** (Q10=B-modified per nwrp44 Amendment 1) — Fix structural TDs only in 1.5c: TD-20 (NwButton bypass) + TD-25 (Card padding="lg" forbidden) + TD-26 (fontWeight 600 violation). Defer cosmetic TDs (TD-21/22/23/24/27/28) to Wave 1.1-Lite.

Plus all other Q1-Q15 recommendations approved as written:
- Q2=A (Owner Portal: same auth, role-gated)
- Q7=A (Today at `/today` with `/` redirect)
- Q8=A (no real-backend wiring promotion in 1.5c)
- Q9=A (D-040 through D-055 = 11 enumerated + 5 reserved-now-locked)
- Q11=C (full per-job tab placeholders for all More-dropdown items)
- Q12=A (Profile-based feature flags placeholder only)
- Q13=A (Single M3 phone walk bundled with 1.5b ship gate per CONTEXT D-31)
- Q14=A (Existing Wave 1.1 polish backlog → Wave 1.1-Lite scope)
- Q15 per recommendation

## Standing rules during execution (per nwrp44)

- **Parallel execution by work type:**
  - Independent work (placeholder routes, documentation files, isolated extracted components) → parallel batches of 6-8 agents per wave
  - Coupled work (thin-wrapper extraction architecture, audit-log string strategy, redirect map) → single architect first, then parallel implementers
  - Architecture decisions → surface to Jake, do not auto-decide
- **Integration checkpoints every 2-3 days** (not phase-end)
- **Real-data smoke tests** catch what plan-review misses
- **Visual walk of extracted routes** before declaring extraction complete (per Amendment 2 — divergence = CRITICAL)
- **Build + typecheck + hooks clean throughout** (incremental green)
- **Privacy gate (32-token denylist) clean across all new files**
- **Acceptance criterion on item 6 (extraction):** side-by-side visual verification — production route at `/financials/bills/[id]` must render identically to `/design-system/prototypes/invoices/[id]` (same for all 11 extracted route pairs). Method: screenshot or DOM-diff at minimum, manual visual walk preferred. Treat divergence as CRITICAL finding, not polish.

## Reminder for /nx blockers

Before `/nx stage-1.5c-information-architecture`:
- ✅ EXPANDED-SCOPE.md APPROVED (commit 49bf6dc)
- ✅ SETUP-COMPLETE.md exists (this file)
- ✅ M1 + M2 + M3 phone gate locked (carried over from 1.5b — same iPhone+Safari device per Q13=A)
- ✅ 4-tier privacy gate active
- ✅ All AUTO + VALIDATE items pass
- ⏳ /np stage-1.5c-information-architecture must complete first
- ⏳ /nightwork-plan-review iter-1 must reach APPROVE / WARNING (BLOCKING blocks execute)
- ⏳ Jake review of plan-review iter-1 (explicit halt per nwrp44)

## Next

Run `/np stage-1.5c-information-architecture` to begin planning. The chain is:

1. `/gsd-discuss-phase stage-1.5c-information-architecture` (with EXPANDED-SCOPE.md + SETUP-COMPLETE.md as context; D-051 through D-056 already locked)
2. `/gsd-plan-phase stage-1.5c-information-architecture` (with EXPANDED-SCOPE.md + discuss-phase context)
3. `/nightwork-plan-review iter-1` (multi-reviewer architectural gate — architect, planner, enterprise-readiness, multi-tenant-architect, scalability, compliance, security, design-pushback)

Then HALT for Jake review of plan-review iter-1 results before /nx execute.

If discovery during planning reveals EXPANDED-SCOPE.md needs revision (a prerequisite was missed), update EXPANDED-SCOPE.md and re-run `/nightwork-auto-setup stage-1.5c-information-architecture` to refresh setup.
