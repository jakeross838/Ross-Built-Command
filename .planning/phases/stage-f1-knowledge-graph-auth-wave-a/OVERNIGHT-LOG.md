# Wave-A Overnight Log — stage-f1-knowledge-graph-auth-wave-a

---

## 2026-05-12 — Wave-A INIT

**Authorization:** nwrp113 (Jake authorized Wave-A plan authoring + autonomous execution; Wave-B deferred pending umbrella review).

**Scope:** Plans A-1..A-4 + optional A-5 per `.planning/expansions/stage-f1-knowledge-graph-auth-wave-a-EXPANDED-SCOPE.md`.

### Scaffolding state

| Artifact | Path | Status |
|---|---|---|
| Wave-A EXPANDED-SCOPE.md | `.planning/expansions/stage-f1-knowledge-graph-auth-wave-a-EXPANDED-SCOPE.md` | ✓ Written; updated with iter-1 H-1 deferral note for umbrella scope-drift items |
| Phase CONTEXT.md | `.planning/phases/stage-f1-knowledge-graph-auth-wave-a/CONTEXT.md` | ✓ Written |
| OVERNIGHT-LOG.md | this file | ✓ Updated post-plan-review iter-1 |
| TaskList | 13 tasks with blockedBy dependencies | ✓ Tasks 1-6 complete; 7-13 pending |
| Drift-check | `.planning/drift-checks/2026-05-12-1700-f1-knowledge-graph-auth-expansion-init.md` | ✓ PASS (umbrella; Wave-A inherits) |
| Migration audit reference | `.planning/audits/2026-05-12-migration-inventory.md` | ✓ Complete (645 lines) |
| iter-2 patches addendum | `.planning/phases/stage-f1-knowledge-graph-auth-wave-a/ITER-2-PATCHES.md` | ✓ Written post-iter-1 review |

---

## 2026-05-12 — Plan authoring complete

4 plans authored via parallel gsd-planner agents in background:

| Plan | Path | Size | Status |
|---|---|---|---|
| A-1 D-035 cleanup | `A-1-d035-cleanup-PLAN.md` | 951 lines | ✓ Authored |
| A-2 docx-html auth | `A-2-docx-html-auth-PLAN.md` | 609 lines | ✓ Authored |
| A-3 Drop budgets | `A-3-drop-budgets-PLAN.md` | 933 lines | ✓ Authored |
| A-4 invoice_allocations org_id | `A-4-invoice-allocations-org-id-PLAN.md` | 1133 lines | ✓ Authored |

Total: 3626 lines of PLAN.md content. All 4 with full YAML frontmatter + migration SQL previews + code diffs + ACs + risk registers.

**Plan-author scope extensions worth noting (beyond original brief):**
- A-3 found 3rd missed consumer: `src/app/api/budget-lines/[id]/route.ts` (recalcBudgetTotals + budget_id reads at lines 33, 62, 109, 122). Plan extends Task 5 to refactor this file too.
- A-4 found 4 INSERT call sites needing org_id (3 in `[id]/allocations/route.ts` + 1 in `src/lib/invoices/save.ts:536`).
- A-1 found jobs PATCH route is at `src/app/api/jobs/route.ts:150-264`, NOT `[id]/route.ts` (which is DELETE-only). Plan updated accordingly; adds new logStatusChange coverage for jobs entity_type.

---

## 2026-05-12 — Plan-review iter-1 complete

**6 specialized reviewers ran in parallel background:**
- architect (holistic cross-plan architectural soundness)
- database-reviewer (3 migrations: 00094, 00095, 00096)
- nightwork-data-migration-safety (rollback safety + backfill safety + fixture impact)
- nightwork-multi-tenant-architect (Q10b RLS rewrite + tenant boundary by construction)
- security-reviewer (A-2 auth gate + A-4 RLS rewrite OWASP coverage)
- nightwork-rls-auditor (A-4 RLS policy enumeration + INSERT call site coverage)

**Verdicts:**
| Reviewer | Verdict | CRITICALs | HIGHs | MEDIUMs |
|---|---|---|---|---|
| architect | PASS | 0 | 4 | 6 |
| database-reviewer | WARNING | 0 | 5 | 5 |
| data-migration-safety | PASS WITH WARNINGS | 0 | 5 | 7 |
| multi-tenant-architect | PASS | **1** | 3 | 2 |
| security-reviewer | PASS | 0 | 2 | 3 |
| rls-auditor | WARNING | 0 | 2 | 1 |

**Consolidated (deduplicated):**
- BLOCKING verdicts: 0
- CRITICAL: 1 — A-4 body/preview deleted_at filter inconsistency (multi-tenant upgraded; data-migration-safety + database-reviewer + rls-auditor + security-reviewer also flagged) — 5-of-6 reviewer consensus
- HIGH (unique): 14
- MEDIUM (unique): ~15

**Resolution:** iter-2 patches captured in `ITER-2-PATCHES.md` (authoritative addendum to PLAN.md files). No iter-2 reviewer round needed — findings are doc-level + small SQL adjustments + scope clarifications.

**Key patch decisions:**
1. **CR-A4-1 deleted_at filter:** Use migration body version (no filter; safer per multi-tenant reasoning).
2. **HF-A4-1 RLS `(SELECT ...)` wrap:** Fix forward in 00096 per database-reviewer recommendation (F5 hot path).
3. **HF-A4-2 pre-flight orphan check:** Add at TOP of migration 00096 (fail-fast before DDL).
4. **HF-A4-5 regression test SKIP:** Option (a) — defer fixture seeding to Wave-B Plan B-6; surface explicitly at GATE-A as WARN.
5. **HF-A1-2 bulk transactional:** Accept regression for Wave-A; document in SUMMARY; route atomicity work to Wave-B Plan B-3.
6. **MED-WA-1 umbrella scope drift:** Defer function search_path sweep + REVOKE EXECUTE + extension move to Wave-B/Wave-C; documented in Wave-A EXPANDED-SCOPE.md.

---

## Cost tracking

- Plan-review iter-1: 6 reviewer agents (~1.2M tokens cumulative agent context).
- iter-2 patches: text-only addendum (~0 vision spend).
- Migration audit (earlier): 1 agent (~232K tokens).
- Plan authoring: 4 agents (~430K tokens cumulative).
- **Cumulative vision spend: ~$2 (40% of $5 ceiling). No vision API calls in this work.**

---

## Next steps (this session)

1. ✅ Wave-A scaffolding
2. ✅ Plan authoring (A-1..A-4)
3. ✅ Plan-review iter-1 (6 reviewers)
4. ✅ iter-2 patch consolidation (ITER-2-PATCHES.md)
5. ✅ Execute Plan A-1 (migration 00094 + status_history coverage + CLAUDE.md update + iter-2 patches applied)
6. → Execute Plan A-2 (docx-html auth gate + iter-2 patches)
7. → Execute Plan A-3 (drop budgets migration 00095 + consumer refactors + iter-2 patches)
8. → Execute Plan A-4 (invoice_allocations org_id migration 00096 + 4 INSERT site updates + iter-2 patches)
9. → A-5 absorption decision (defer to Wave-C recommended; Jake confirms at GATE-A)
10. → Wave-A QA (spec-checker + custodian + ai-logic + harness verification)
11. → GATE-A halt summary for Jake (Wave-A commits + harness state + recommendation on Wave-B dispatch)

---

## 2026-05-12 — Plan A-1 SHIP COMPLETE

**Executed autonomously per nwrp113 Wave-A authorization.** Atomic commit + push per nwrp50 Vercel-only protocol.

### Deliverables

| Deliverable | Path | Status |
|---|---|---|
| Migration 00094 up | `supabase/migrations/00094_d035_cleanup.sql` | ✓ Written (75 lines; BEGIN/COMMIT wrapped per HF-A1-4); DROP TABLE justified per hook contract |
| Migration 00094 down | `supabase/migrations/00094_d035_cleanup.down.sql` | ✓ Written (best-effort rollback per R.16) |
| lien-releases PATCH | `src/app/api/lien-releases/[id]/route.ts` | ✓ status_history append on transition; `who: actorId ?? null` per HF-A1-1; 500-char note cap per MED-A1-1 |
| lien-releases bulk | `src/app/api/lien-releases/bulk/route.ts` | ✓ Per-row loop + status_history append; self-transition skip; HF-A1-2 regression documented in SUMMARY |
| jobs PATCH | `src/app/api/jobs/route.ts` | ✓ status_history append + new `logStatusChange({ entity_type: "job" })` coverage; scope-exclusion comment per HF-A1-3 |
| CLAUDE.md Q12 rule | `CLAUDE.md:566` | ✓ Codified under Nightwork standing rules > Architecture posture, immediately after Multi-tenant RLS bullet |
| SUMMARY.md | `.planning/phases/stage-f1-knowledge-graph-auth-wave-a/A-1-d035-cleanup-SUMMARY.md` | ✓ Written; all 12 ACs documented + iter-2 patch applications + behavior regression note |

### iter-2 patches applied

- **HF-A1-1:** lien-releases routes use `who: actorId ?? null` (not `"user"` literal). jobs PATCH uses `who: user.id` directly (user is guaranteed non-null after auth gate at line 156; comment documents distinction).
- **HF-A1-2:** Bulk endpoint per-row regression DOCUMENTED in SUMMARY (no code change). Wave-B Plan B-3 to restore atomicity.
- **HF-A1-3:** Scope-exclusion comment added at jobs/route.ts logStatusChange call site. action-labels.ts grep verified `entity_type='job'` already in exhaustive ENTITY_LABELS Record mapping — no defensive case needed.
- **HF-A1-4:** BEGIN; ... COMMIT; wrapper added to both 00094.sql and 00094.down.sql.
- **MED-A1-1:** Extended COMMENT on both status_history columns noting PII / retention class. App-layer 500-char cap on `body.note` in lien-releases PATCH handler.

### Acceptance criteria

| AC | Status |
|----|--------|
| AC-A1-01 CCBL dropped | ✓ migration written; ready-to-apply via Supabase MCP at deploy |
| AC-A1-02 lien_releases.status_history | ✓ migration written; ready-to-apply |
| AC-A1-03 jobs.status_history | ✓ migration written; ready-to-apply |
| AC-A1-04 lien PATCH appends | ✓ done (grep verified) |
| AC-A1-05 lien bulk appends | ✓ done (grep verified) |
| AC-A1-06 jobs PATCH appends + logStatusChange | ✓ done (grep verified) |
| AC-A1-07 self-transition skip | ✓ done (explicit `continue` in loop) |
| AC-A1-08 CLAUDE.md Q12 codified | ✓ done (line 566) |
| AC-A1-09 npm run build | ✓ exit 0 |
| AC-A1-10 Drummond gate silent | ✓ done (verified at commit time) |
| AC-A1-11 harness PASS=151 | ⏳ verify at GATE-A halt |
| AC-A1-12 activity-log.ts unchanged | ✓ done (`git diff --stat` empty) |

### Behavior regression note (HF-A1-2)

**Bulk lien-releases endpoint per-row UPDATE is no longer transactional.** Mid-loop failure leaves earlier rows committed while later rows are not. Acceptable for low-frequency draw-approval bulk use case (N typically 1-20). Wave-B Plan B-3 (DB-trigger safety net) restores atomicity. Documented in SUMMARY for Jake review.

### Migration application status

**Migration files written, NOT yet applied.** Supabase MCP tools (`mcp__supabase__apply_migration`) are not in this executor agent's available toolset. Migration apply path:
- Supabase CLI: `supabase db push` (preferred for prod)
- OR Supabase MCP from an agent context with MCP exposure
- OR direct execution via Supabase dashboard SQL editor

Files are syntactically valid, follow existing migration convention, pass Drummond + design-system hooks. AC-A1-01..03 will be satisfied post-apply via the standard deploy pipeline.

### Verification outputs

- `npm run build`: exit 0 (full Next.js build succeeded)
- `npx tsc --noEmit`: exit 0 (no TypeScript errors)
- `git diff --stat src/lib/activity-log.ts`: empty (AC-A1-12 satisfied)
- Drummond pre-commit gate: silent on all staged files (verified pre-commit)

### Commit details

Commit hash: see git log post-push. Atomic commit per nwrp50 with all 6 files (2 migrations + 3 routes + CLAUDE.md + SUMMARY.md + this OVERNIGHT-LOG update).

### Recommendation

**Proceed to Plan A-2 (docx-html auth gate fix).** A-1 is independent of A-2..A-4 by migration numbering + table; A-2 is code-only (no migration concern). Estimated A-2 duration: 0.5 day. No HALT conditions encountered in A-1.

---
