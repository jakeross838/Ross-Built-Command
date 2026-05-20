# Expanded scope — stage-f1-hook-doc-only-detect

**Status:** APPROVED 2026-05-19 (per nwrp190 Jake review — 2 amendments applied: Q2 reasoning addition + Q5 custodian-task expansion; AC-HDOD-13 ambiguity flagged for plan-author resolution per nwrp190 §17-22)
**Generated:** 2026-05-19
**Phase classification:** CHORE (hook discipline calibration; NOT a product-feature phase)
**Plan scope:** Single plan, single hook file edit (~30 lines bash) at `.claude/hooks/nightwork-pre-commit.sh`
**Ceiling:** $15 fresh-scoped (per nwrp189 §17-25)
**requires_smoke:** false
**threat_model_severity:** LOW (hook calibration; fail-closed posture preserved for application-code commits)

**Stated scope (Jake's verbatim words from nwrp189 §17-25):**

> "Pre-authorized scope per nwrp182:
> - New phase: stage-f1-hook-doc-only-detect (or similar phase name matching existing convention)
> - Single plan: detect doc-only commits (no code-file extensions in diff — only .md / .gitignore / .claude/* / etc.) and skip QA timestamp check
> - Single hook file edit (~30 lines bash) at .githooks/pre-commit (or wherever the QA timestamp gate lives — verify file path)
> - requires_smoke: false
> - threat_model_severity: low (hook change, but fail-closed posture preserved for application code commits)
> - Ceiling: $15 fresh-scoped to this chore plan
> - QA reviewer scope: spec-checker + custodian + security-reviewer (small scope; security included because hook is discipline gate)"

**Orchestrator pre-flight findings (verified before requirements-expander dispatch):**
- QA-timestamp gate lives at `.claude/hooks/nightwork-pre-commit.sh` (Claude-Bash-tool hook), NOT `.githooks/pre-commit` (latter is Drummond grep gate — non-bypassable per CLAUDE.md Dev Rules).
- Canonical TD entry: `.planning/MASTER-PLAN.md` §11 row "TD-NW-HOOK-DOC-ONLY-DETECT" (MEDIUM severity; origin nwrp163/166/169 three-occurrence pattern; proposed remediation = file-extension filter with regex).
- Current hook bypass count: 4 (per CLAUDE.md Dev Rules note on F1-Wave-A bypass incidents + nwrp169 weekend-deliverable bypass).
- Existing hook already implements a partial doc-only branch at lines 43-50 (`.planning/` + `docs/` + `README` + `CHANGELOG` + `.gitignore` whitelist). This phase EXTENDS that branch's coverage to handle the gap categories that triggered the four bypass incidents.

---

## 1. Mapped entities and workflows

### New entities introduced by this slice
None. This is a discipline-gate calibration sweep on a single existing hook file. Zero schema-level entity changes, zero UI changes, zero API route changes.

### Existing artifacts touched

| Artifact | Section | Change |
|---|---|---|
| `.claude/hooks/nightwork-pre-commit.sh` | lines 43-50 (existing doc-only whitelist branch) | Expand whitelist regex to cover the doc-extension/path categories that triggered nwrp163/166/169 bypass events. Preserve fail-closed posture: any code file in the diff → enforce QA-timestamp + verdict checks. |
| `.claude/hooks/nightwork-pre-commit.sh` | (header comment) | Document the doc-only detection contract (extensions + paths whitelisted; mixed-commit posture; bypass-counter / observability if added). |
| `.planning/MASTER-PLAN.md` §11 (TD-NW-HOOK-DOC-ONLY-DETECT row) | (post-ship) | Mark closed; cross-reference shipped commit SHA. (Custodian post-ship; NOT in plan scope but flagged for hand-off.) |
| CLAUDE.md Workflow posture Rule 8 (Hook fail-closed contract) | (optional, post-ship) | Append a sub-clause documenting the doc-only-skip carve-out as a calibrated exception, NOT a posture change. (Custodian or follow-up; flagged for Q5 below.) |

### Workflows touched

None at the product layer. The only "workflow" touched is the Claude Code Bash-tool pre-commit discipline gate — a developer-side process boundary. Trigger surface: every `git commit` invocation via Claude's Bash tool inside a nightwork-platform working directory. Affected user: any executor (Claude session) committing doc-only changes outside the existing `.planning/`/`docs/`/`README`/`CHANGELOG`/`.gitignore` whitelist.

## 2. Prerequisite gaps

What MUST exist before this phase can ship.

| # | Gap | Source | Blocking? |
|---|---|---|---|
| 1 | Existing hook file `.claude/hooks/nightwork-pre-commit.sh` present at HEAD | Verified by orchestrator read (file exists, 165 lines, current structure understood) | — |
| 2 | TD-NW-HOOK-DOC-ONLY-DETECT canonical TD entry in MASTER-PLAN.md §11 | Verified by orchestrator grep at row 314 | — |
| 3 | Slice-1 GATE 2 HALT closed (so this chore can sequence before Slice-2 dispatch) | Per nwrp182 pre-authorization: this plan ships AFTER Slice-1 closes, BEFORE Slice-2 B-2 dispatch. Slice-1 ship confirmed 2026-05-18 per MASTER-PLAN §12. | — |
| 4 | Wave-A iter-1 cleanup shipped (so the SECURITY DEFINER + extension hardening landscape is stable before touching gate discipline) | RESOLVED 2026-05-19 per `.planning/expansions/stage-f1-wave-a-iter1-cleanup-PREFLIGHT-PASS.md` | — |
| 5 | No fixture / migration / FK / RLS dependencies (pure hook-script change) | PLAN scope is single bash file edit per nwrp189 §17-25 | — |

**No blocking prerequisites remain.** All 5 prereqs satisfied at HEAD.

## 3. Dependent-soon gaps

What's likely needed shortly after — design for it now.

| # | Gap | Likely next slice / wave | Design implication |
|---|---|---|---|
| 1 | Manual git `git commit` from terminal (not Claude-Bash-tool) is NOT covered by this hook (per existing hook line 62-64 comment). `.githooks/pre-commit` covers the Drummond grep gate but does NOT implement QA-timestamp logic. If a future workflow wants terminal-commit QA gating, that's a NEW hook addition, not in this scope. | Future (post-Wave-B Slice-2 if it surfaces) | This phase should NOT silently extend coverage to terminal commits. Doc the gap explicitly in the hook header. If Jake wants symmetric coverage later, that's a separate plan. |
| 2 | Bypass-counter telemetry: today the only signal of `--no-verify` use is commit-body citations. If the doc-only-skip path is invoked frequently AND a real code-file commit slips through (regex gap), there's no out-of-band signal until QA fails downstream. | Hardening sweep (Wave-B Slice-2 or later if pattern surfaces) | Optional in this scope (Q4 below). If added, write a single-line entry to `.planning/qa-runs/hook-skip-log.md` (or similar canonical path) each time the doc-only branch fires. Adds ~5-10 lines bash + creates an auditable trail. |
| 3 | NIGHTWORK_HOOKS_DISABLE / NIGHTWORK_PRECOMMIT_DISABLE env-flag escape hatches remain in place at hook lines 9-10. This phase does NOT touch them; they preserve the operator-side emergency-exit pattern. | N/A | If the doc-only-skip path causes unforeseen issues, the env-flag hatch remains as a one-line-set escape. Do NOT remove or modify these in this phase. |
| 4 | Future doc-bearing paths (e.g., `.planning/expansions/*.md`, `.planning/qa-runs/*.md`, `.claude/agents/*.md`, `docs/*.md`) — the current whitelist at line 46 covers `.planning/` + `docs/` paths broadly, so file-extension-only inputs may already pass. The gap is mixed cases: a commit that touches `.claude/agents/foo.md` + `README.md` should pass; today, `.claude/agents/` is NOT in the path whitelist, so falls to extension check. | This phase's design space | Plan must reconcile path-whitelist (line 46) vs extension-whitelist (new). Recommendation in Q1 below: extension-whitelist is the primary check; path-whitelist remains for back-compat but isn't extended. |

## 4. Cross-cutting checklist

| Concern | Status | Rationale |
|---|---|---|
| Audit logging | N/A | No DB mutations; no `activity_log` writes. Hook fires pre-commit; no entity touched. |
| Permissions | N/A | No role-gated surfaces; hook is process-side discipline, not application auth. |
| Optimistic locking | N/A | No write endpoints touched. |
| Soft-delete + status_history | N/A | No workflow entities touched. |
| Recalculate, don't increment | N/A | No aggregations introduced. |
| Multi-tenant RLS | N/A | No tenant tables touched; no RLS policies introduced. |
| Idempotency | APPLIES | The hook edit itself is idempotent (re-running the hook on the same staged diff produces the same decision). Plan must ensure new regex branch is purely additive — preserves existing line-43-50 branch behavior unchanged for the cases it already catches. |
| Background jobs | N/A | No async work added. |
| Rate limiting | N/A | No external endpoints. |
| Observability | APPLIES (LIGHT) | Optional bypass-counter telemetry per Dependent-soon #2 (Q4 below — recommendation: defer to follow-up plan; keep this slice ~30 lines). At minimum, the hook should NOT emit chatty stdout/stderr — Claude Code's PreToolUse contract requires clean JSON or empty output on PASS. |
| Data import/export (V.2) | N/A | No entities. |
| Document provenance (V.3) | N/A | No documents. |
| Mobile-friendly | N/A | No UI. |
| Drummond fixtures sufficient | N/A | No fixture data. |
| CI test gate | APPLIES (LIGHT) | Plan should include a `bash -n` syntax check of the modified hook + manual table-test against representative diff scenarios (doc-only / code-only / mixed). No automated test harness exists for hooks today; manual scenario walk in PLAN §8 is acceptable per chore-plan posture. |
| Error handling for partial failures | APPLIES | If `git diff --cached --name-only` fails (returns non-zero / empty unexpectedly), hook MUST fail-closed (proceed to QA check, not skip). Match the fail-closed posture established by nwrp158-161 chain. |
| Graceful degradation | N/A | Hook either passes or blocks; no third-party service dependency. |

### Hook-discipline-specific cross-cutting concerns (this phase's core focus per Jake's prompt)

| Concern | Status | Rationale |
|---|---|---|
| **Hook discipline preservation (Workflow posture Rule 8)** | APPLIES (CORE) | The whole point of this slice. Doc-only-skip must NOT erode the QA-timestamp gate for code commits. Fail-closed posture: any ambiguity (regex didn't match cleanly, mixed extensions, untracked files in diff, git command failure) → fall through to existing QA check. |
| **Fail-closed posture for application code commits** | APPLIES (CORE) | Any commit whose `git diff --cached --name-only` includes ANY entry NOT matching the doc-only extension/path allowlist → enforce QA timestamp + verdict checks. No "majority doc files" carve-out, no "small code change" carve-out. Binary: 100% doc-allowlist → skip; anything else → enforce. |
| **No scope-creep into other gates (Rule 7e — scope-engineering ban)** | APPLIES | This plan touches ONLY the qa-timestamp/verdict gate's pre-check, not: Drummond grep gate (lines 65-92 of hook, non-bypassable), the `.githooks/pre-commit` Drummond gate (separate file), the file-extension classification used in hardcoded-hex/legacy-token hooks, or the NIGHTWORK_HOOKS_DISABLE env-flag pattern. Plan-review iter-1 should flag any expansion beyond the qa-timestamp pre-check as scope-creep. |
| **Audit trail of which commits used the new path** | OPEN (Q4 below) | Today: no record of which commits hit the doc-only skip branch. Could add a one-line log to `.planning/qa-runs/hook-skip-log.md` on each skip, OR defer telemetry to a follow-up plan. Recommendation: defer (Q4=B). |
| **Bypass-counter integrity** | APPLIES | Today the only `--no-verify` audit is commit-body citations (Workflow posture Rule 8a). This plan must NOT introduce a covert bypass — the doc-only-skip branch is explicit-and-honest (matches whitelist or doesn't), not a stealth path that resembles `--no-verify` semantics. |

## 5. Construction-domain checklist

| Domain consideration | Applies? | Rationale |
|---|---|---|
| Drummond as reference job | N/A | Hook discipline change; no fixture data, no entity flow, no Drummond touchpoint. |
| Field mistakes to permanent QC entries | N/A | No daily-log / punchlist workflow. |
| Draw requests linked to punchlist | N/A | No draw workflow. |
| Invoice review template extension | N/A | No UI surface. |
| Stone blue palette + Slate type system + logo top-left | N/A | No UI. |
| Stored aggregates require rationale comments | N/A | No DB writes. |
| Cost-plus open-book transparency | N/A | No client-facing surface. |
| Florida-specific (lien releases, contractor licenses, retainage) | N/A | No domain rules touched. |
| GC fee semantics (cost-plus vs fixed) | N/A | No financial calc. |
| Org-configurable (org_settings) | N/A | Hook is repo-level discipline gate, not per-org config. |
| Florida tax handling / sub-tier suppliers / multi-currency | N/A | No financial domain touched. |

**Construction-domain checklist is uniformly N/A — this is a chore plan calibrating a discipline gate, not a domain feature.** Recorded here per requirements-expander contract Section 5 even when fully N/A.

## 6. Targeted questions for Jake

Each question has bounded options + a recommended answer with rationale. Strong opinion, weak hold.

### Q1 — Doc-only whitelist: extension-allowlist vs path-allowlist vs both?

**Options:**
- **A: Extension-allowlist only.** Treat the existing path-allowlist at lines 43-50 as deprecated-but-kept-for-back-compat; new logic is purely extension-based.
- **B: Path-allowlist extended.** Keep the existing branch shape; add new paths like `.claude/`, `.planning/expansions/`, etc.
- **C: Both — union of extension-allowlist AND path-allowlist (most permissive).** A commit passes the doc-only branch if EVERY file matches EITHER an allowed extension OR an allowed path.

**Recommended: C (both, additive union).**

**Rationale:**
- The current path-allowlist (line 46) is already in production behavior; ripping it out risks regressing commits that pass today.
- The new extension-allowlist catches the gap categories that triggered nwrp163/166/169 bypasses: doc-bearing files outside `.planning/` / `docs/` (e.g., `.claude/agents/foo.md`, root-level `*.md` not named `README`/`CHANGELOG`, `LICENSE`, `.editorconfig`).
- Union posture is the most permissive AND the most fail-closed: a commit touching `src/foo.ts` + `README.md` still has `src/foo.ts` falling outside both lists → enforce. A commit touching `nwrp189.txt` + `CHANGELOG.md` has both files matching at least one list → skip.
- Plan must mechanically verify the union logic with a scenario table in PLAN §8 (`bash -n` syntax + manual diff table-tests for 8 representative cases).

### Q2 — Which file extensions count as "doc-only"?

**Options:**
- **A: Conservative.** `.md`, `.txt`, `.gitignore`, `LICENSE`, `.editorconfig`, `CHANGELOG`, `README` (with or without extension).
- **B: Conservative + dot-claude paths.** A + `.claude/agents/**/*.md`, `.claude/hooks/**/*.md`, `.claude/skills/**/*.md`, `.claude/commands/**/*.md` (path-based because dot-claude has loose extension conventions).
- **C: Permissive.** A + any file under `.planning/`, `.claude/`, `docs/`, regardless of extension (so a `.planning/qa-runs/foo.json` would skip).

**Recommended: B (conservative + explicit dot-claude doc paths).**

**Rationale:**
- C is too loose — a `.json` schema file under `.planning/` could land code-bearing config (validator interface contract, type definitions) without QA check. The bypass count would erode the gate value.
- A is too restrictive — does not catch the `.claude/agents/*.md` and `.claude/commands/*.md` cases which were part of the bypass pattern.
- B threads the needle: explicit extension list for doc files anywhere in repo, plus explicit path inclusion for the dot-claude documentation surfaces where extension conventions are loose. Easy to grep + audit + extend.
- Explicit non-inclusions: NO `.json`, NO `.yml`/`.yaml`, NO `.toml`, NO `.sh`, NO `.sql`, NO `.ts`/`.tsx`/`.js`/`.jsx`, NO `.css` — these are all code or config-as-code surfaces and must hit the QA gate.

**Amendment 1 (per nwrp190 §11-12) — hook-edit discipline reasoning:**

`.claude/hooks/` paths are in the doc-only allowlist for documentation files inside that directory (e.g., a README or comment block file). The `.claude/hooks/*.sh` executable files themselves are NOT in the allowlist (per the explicit-NO `.sh` clause above). Hook edits (the `.sh` files) are governed by **sign-off-cycle discipline** (Rule 8 hook fail-closed contract, evidenced by nwrp160/161 three-cycle sign-off on the touched-lines classification fix), NOT by the QA timestamp gate. Doc-only-skip for hook-doc edits is appropriate because the discipline for hook changes is the surface-for-Jake-review cycle, not the QA timestamp check. This makes the decision deliberate, not accidental — the qa-timestamp-skip is granted to hook DOCUMENTATION, while hook EXECUTABLES continue to fall through to the gate AND to the existing manual-review-cycle posture that produced nwrp160/161's three-cycle calibration.

### Q3 — Mixed-commit posture: doc files + code files?

**Options:**
- **A: Strict.** Any code file in diff → enforce QA gate (no doc-pass carve-out for the same commit).
- **B: Tolerant.** If the commit is mostly doc (>80% files are doc-allowlist matches), skip the QA gate.

**Recommended: A (strict).**

**Rationale:**
- B introduces a continuous threshold that is easy to game (split the commit so docs go first, code goes second, or pad with trivial doc churn). Continuous thresholds erode discipline.
- A is binary, auditable, and matches the fail-closed posture established by nwrp158-161. The commit either touches code or it does not; the gate either runs or it does not.
- If a developer wants to commit doc + code together AND the QA report is stale, the correct path is: refresh QA OR split the commit OR get explicit `--no-verify` authorization. Not soften the gate to make this case easier.
- Workflow posture Rule 7e (scope-engineering ban) is the parallel principle here — Rule 8 (hook fail-closed) shares the same posture.

### Q4 — Bypass-counter / observability for the doc-only-skip path?

**Options:**
- **A: Add now.** Each time the doc-only branch fires, append a line to `.planning/qa-runs/hook-skip-log.md`. Adds ~5-10 lines bash; creates a chronological audit trail.
- **B: Defer.** Ship without telemetry; revisit if a code-file commit slips through the new branch (regex gap surfaced by QA-downstream).
- **C: Bypass-counter only.** Increment a counter in `.planning/qa-runs/.hook-skip-count` without listing files.

**Recommended: B (defer).**

**Rationale:**
- The plan ceiling is $15. A adds 5-10 lines + log-file lifecycle + potential file-locking concerns + custodian housekeeping debt. Scope creep.
- The fail-closed posture in Q3=A is the structural defense against regex-gap slippage. Telemetry is a secondary line of defense; deferring it does not compromise the primary defense.
- If the doc-only-skip path is exercised and a code-file commit slips through, downstream QA will catch it AND the commit SHA is in git log — investigation has a starting point.
- If, after Slice-2 close, the doc-only-skip path is observed to skip incorrectly even once, file a follow-up TD to add telemetry then. Three-occurrence rule applies.

### Q5 — CLAUDE.md Workflow posture Rule 8 update?

**Options:**
- **A: In-scope.** Append a sub-clause to Rule 8 (e.g., Rule 8(e): doc-only-skip carve-out is calibrated exception, not posture change).
- **B: Out-of-scope.** Document the doc-only-skip behavior in the hook header comment only; CLAUDE.md update is post-ship custodian housekeeping.
- **C: Both.** Header comment in this slice; CLAUDE.md update as a tiny custodian-managed follow-up commit.

**Recommended: C (both, sequenced).**

**Rationale:**
- A puts CLAUDE.md edit inside the plan scope, which is fine but inflates plan-review iter-1 scope.
- B leaves CLAUDE.md silent on the carve-out, which risks future executor sessions discovering the doc-only-skip path by surprise.
- C is the cleanest: this slice ships the hook + header doc, and the next custodian sweep updates Rule 8 with the calibrated-exception language. Tracked as a closing-out post-ship task in §9 Hand-off.

### Q6 — 60-minute threshold tunability?

**Options:**
- **A: Leave as-is.** 60 minutes hardcoded at line 120. No change.
- **B: Make tunable via env-var.** `QA_TIMESTAMP_MAX_AGE_MIN` defaults to 60.
- **C: Tune to a different fixed value.** E.g., 90 or 120 minutes.

**Recommended: A (leave as-is).**

**Rationale:**
- This plan scope is doc-only detection. Touching the threshold is a separate concern; mixing them inflates plan-review iter-1 scope + dilutes the audit trail of why this particular calibration was needed.
- The bypass incidents (nwrp163/166/169) were doc-only commits, NOT code commits with stale-but-fresh-enough QA reports. Tightening or loosening the threshold does not fix those cases; doc-only detection does.
- If after this slice the threshold itself becomes a recurring friction point, file a separate TD. Today the evidence supports doc-only detection, not threshold tuning.

## 7. Recommended scope expansion

Stated: detect doc-only commits (no code-file extensions in diff - only .md / .gitignore / .claude/ etc.) and skip QA timestamp check. Single hook file edit (~30 lines bash) at .claude/hooks/nightwork-pre-commit.sh. requires_smoke: false, threat_model_severity: low, Ceiling: 15 dollars.

Recommended phase scope:

1. Single bash regex addition to .claude/hooks/nightwork-pre-commit.sh (~25-35 lines diff) - after the existing line 43-50 path-allowlist branch (or merged with it as a union), add an extension-allowlist branch that skips the qa-runs timestamp check AND the verdict check when every file in the staged diff matches the doc-only allowlist. Per Q1=C, Q2=B, Q3=A: union with existing path-allowlist; extensions = .md, .txt, plus filenames LICENSE, CHANGELOG, README, .gitignore, .editorconfig; paths include the existing set plus .claude/agents/, .claude/hooks/, .claude/skills/, .claude/commands/. Strict mixed-commit posture: any non-allowlist file falls through to existing gate logic.

2. Header comment block in the hook documenting the doc-only-skip contract (~5-10 lines) - enumerate exact extensions + paths in the allowlist; document fail-closed posture for ambiguity; cross-reference origin nwrps (163/166/169) and this phase folder; cite Workflow posture Rule 8 as the discipline contract being preserved.

3. PLAN section 8 manual scenario table (bash -n syntax check + 8 representative diff scenarios) - explicit pass/fail expectations for 8 cases including pure .md, pure .txt, pure code .ts, mixed .md+.ts, .claude/agents/foo.md only, root LICENSE only, .planning/expansions/foo.md only, .gitignore only.

4. Threat model note in PLAN section 6 (LOW severity) - codify why this is LOW: doc-only-skip cannot affect production application code (any code file forces full gate); env-flag escape hatches remain unchanged; --no-verify Jake-authorization rule untouched; Drummond grep gate (hook lines 65-92) untouched and still fires before the qa-timestamp check.

5. Post-ship custodian task: append CLAUDE.md Workflow posture Rule 8 sub-clause (per Q5=C) - out-of-plan but flagged in section 9 Hand-off for the next custodian sweep.

Out of scope (deferred):
- Bypass-counter / observability telemetry - defer to follow-up plan if recurrence pattern surfaces (per Q4=B).
- CLAUDE.md Rule 8 sub-clause edit - custodian housekeeping post-ship (per Q5=C); flagged in section 9 Hand-off.
- NIGHTWORK_HOOKS_DISABLE / NIGHTWORK_PRECOMMIT_DISABLE env-flag rework - not touched; preserved as-is.
- Terminal-commit (non-Claude-Bash-tool) QA-gate coverage - separate plan if surfaced; would require .githooks/pre-commit extension and Drummond-gate interaction analysis.
- 60-minute threshold tuning - separate plan if surfaced (per Q6=A).
- Bypass-counter retroactive cleanup of the 4 incidents - audit-only; commit bodies stand; not in scope.
- Hook extension to non-doc skip cases (test-only commits, dependency-only commits) - explicit anti-scope; mentioning here to head off scope-creep at plan-review iter-1.

Acceptance criteria target (preview - final criteria locked in /gsd-discuss-phase):

- [ ] AC-HDOD-01: bash -n .claude/hooks/nightwork-pre-commit.sh returns exit 0 (syntax clean).
- [ ] AC-HDOD-02: Manual scenario test #i (pure .md diff) - hook returns exit 0 (skip).
- [ ] AC-HDOD-03: Manual scenario test #ii (pure .txt diff) - hook returns exit 0 (skip).
- [ ] AC-HDOD-04: Manual scenario test #iii (pure code .ts diff) - hook falls through to existing qa-timestamp check (behaviour unchanged for code-only commits).
- [ ] AC-HDOD-05: Manual scenario test #iv (mixed .md + .ts) - hook falls through to existing qa-timestamp check (strict-mixed posture per Q3=A).
- [ ] AC-HDOD-06: Manual scenario test #v (.claude/agents/foo.md only) - hook returns exit 0 (skip).
- [ ] AC-HDOD-07: Manual scenario test #vi (root LICENSE only) - hook returns exit 0 (skip).
- [ ] AC-HDOD-08: Manual scenario test #vii (.planning/expansions/foo.md only) - hook returns exit 0 (skip, back-compat preserved).
- [ ] AC-HDOD-09: Manual scenario test #viii (.gitignore only) - hook returns exit 0 (skip, back-compat preserved).
- [ ] AC-HDOD-10: Header comment block enumerates: extension allowlist, path allowlist, fail-closed posture for ambiguity, origin nwrp citations (163/166/169), Workflow posture Rule 8 cross-reference.
- [ ] AC-HDOD-11: Drummond grep gate (hook lines 65-92) verified UNCHANGED in the diff (regex pattern + REASON message + node JSON-emit shape all byte-identical).
- [ ] AC-HDOD-12: Existing line 43-50 path-allowlist branch is either UNCHANGED-AND-AUGMENTED-BY-NEW-BRANCH or MERGED-INTO-NEW-UNION-BRANCH; PLAN must declare the structural approach in section 4.
- [ ] AC-HDOD-13: Real-world test: ship the slice itself via a doc-only commit (this artifact + PLAN + SETUP-COMPLETE + PREFLIGHT-PASS + AUTO-LOG are all .md files); the commit must pass the new hook branch cleanly without --no-verify. Self-validating ship.
- [ ] AC-HDOD-14: Post-ship custodian task is logged in MASTER-PLAN section 12 NEXT PLANNED WORK as CLAUDE.md Rule 8(e) sub-clause append (per nwrp189 sections 17-25 + Q5=C).

## 8. Risks and assumptions

| Risk | Mitigation |
|---|---|
| Regex gap allows a code-file commit to slip through doc-only-skip (e.g., a .tsx file misclassified as a doc extension). | (1) Q3=A strict-mixed posture: ANY non-allowlist file falls through to enforcement. (2) PLAN section 8 scenario table includes representative code-file diff to confirm fall-through. (3) git diff --cached --name-only failure falls-closed per CLAUDE.md Rule 8c. (4) Extension allowlist is explicit and short (per Q2=B); reviewer can visually audit the regex against the list. |
| Existing line 43-50 branch silent behavior change. If structured as merged union, commits that passed before may pass for a different reason; commits that previously failed may now pass. | PLAN section 4 structural-approach declaration + AC-HDOD-08, AC-HDOD-09 back-compat preservation tests + diff-walk in plan-review iter-1 to spot regressions. |
| Doc-only-skip becomes a stealth bypass pattern. Future executor sessions exploit the carve-out to commit .md files containing meaningful repo-state changes. | (1) Q3=A strict-mixed posture prevents bundling actual code with docs. (2) Doc files do not affect runtime behavior; if a .md change drives a future code change, the future code change hits the gate. (3) Q5=C CLAUDE.md Rule 8(e) sub-clause makes the carve-out explicit + auditable. |
| Cross-reviewer disagreement at plan-review iter-1 on Q1/Q2/Q3 selection. Reviewers may have differing opinions on permissiveness. | Per Workflow posture Rule 9 (cross-reviewer factual disagreement HALT), any contradictory factual claims surface to Jake. Opinion divergence on permissiveness recommendations is resolved by orchestrator-pre-selected answer captured in this EXPANDED-SCOPE post-Jake-approval. |
| Scope creep into other hook concerns at plan-review iter-1. Reviewers may suggest adding bypass-counter (Q4), threshold tuning (Q6), CLAUDE.md edit (Q5), terminal-commit coverage, etc. | Per Workflow posture Rule 7e (scope-engineering ban), explicit anti-scope items enumerated in section 7 Out of scope must be respected. Plan-author authorization to expand scope = Jake-only. Plan-review iter-1 reviewers may flag for TD-route only. |
| Hook syntax error (bash quoting / regex escape) introduced in the edit. | (1) AC-HDOD-01 bash -n syntax check. (2) PLAN section 8 walks all 8 scenarios manually before ship. (3) requires_smoke: false is acceptable BECAUSE the hook is itself the trigger surface - manual scenario walks ARE the smoke for this slice. (4) Hook is small (~30 lines diff); diff-walk audit is feasible at plan-review iter-1 and QA. |
| Ceiling breach mid-authoring. Per Rule 7d (max one ceiling bump per slice) + Rule 7c (Jake-only bump authorization). | Plan scope is bounded (~30 lines bash, one file, one PLAN file, one EXPANDED-SCOPE, manual scenario walk). 15 dollar ceiling is generous for this scope. If breach surfaces, halt-and-surface to Jake per Rule 7e. |
| Self-validating ship paradox. AC-HDOD-13 says the slice own ship should pass the new hook. If the hook misbehaves at ship time, the slice itself cannot land cleanly without --no-verify. | (1) Fix path identical to any hook issue: fix the regex, re-stage, re-commit. (2) If the slice ships via --no-verify (Jake-authorized), it is a known acceptable exception logged in commit body; the next doc-only commit validates the fix. (3) Manual scenario walk in PLAN section 8 catches the issue pre-ship, NOT at ship time. |

### Assumptions

1. Jake pre-authorization in nwrp189 sections 17-25 is the authoritative scope for this slice; ceiling = 15 dollars; reviewers = spec-checker + custodian + security-reviewer.
2. The QA-timestamp gate is .claude/hooks/nightwork-pre-commit.sh (orchestrator-verified; not .githooks/pre-commit).
3. The TD-NW-HOOK-DOC-ONLY-DETECT entry in MASTER-PLAN section 11 row 314 is the canonical TD; closing it post-ship is custodian job.
4. No DB, no UI, no API, no fixture changes - pure hook script edit + plan artifacts.
5. The doc-only-skip path will be exercised by THIS slice own ship (self-validating).
6. Workflow posture Rules 7 + 8 are inviolable; this slice design must preserve them.

## 9. Hand-off

After Jake approves this expansion (or amends it):

1. /nightwork-auto-setup stage-f1-hook-doc-only-detect runs to author the SETUP-COMPLETE.md + MANUAL-CHECKLIST.md (if applicable; chore plan likely has minimal manual setup).
2. Pre-flight via nightwork-preflight skill runs the 10-check execute gate; produces PREFLIGHT-PASS.md.
3. /np stage-f1-hook-doc-only-detect dispatches plan-author + plan-review iter-1 (spec-checker + custodian + security-reviewer per Jake scope cap).
4. /nx stage-f1-hook-doc-only-detect dispatches plan-execute + /nightwork-qa (3 reviewers per cap) + ship.
5. Post-ship custodian sweep:
   - Mark TD-NW-HOOK-DOC-ONLY-DETECT in MASTER-PLAN section 11 row 314 as CLOSED with shipped commit SHA.
   - Append CLAUDE.md Workflow posture Rule 8(e) sub-clause per Q5=C recommendation (out-of-plan) **AND evaluate whether Rules 7/8/9 + Orchestration discipline subsection should extract to `.planning/discipline/*.md` with CLAUDE.md anchor references, given the 45.1k > 40k size warning** (per nwrp190 Amendment 2). NOT acting on extraction in this slice — the custodian task names it so it's tracked. If extraction is endorsed at custodian-sweep time, that becomes a follow-up plan; if rejected, the sub-clause append happens inline as originally scoped.
   - Update MASTER-PLAN section 12 NEXT PLANNED WORK to remove this phase from queue.
6. Slice-2 B-2 dispatch can proceed per nwrp182 sequencing (Slice-1 closed + Wave-A iter-1 cleanup shipped + hook calibration shipped).

Cost projection:
- Plan-author: 3-5 dollars (single bash file edit, well-scoped, EXPANDED-SCOPE answers most design questions).
- Plan-review iter-1 (3 reviewers): 4-6 dollars (small surface, 3 reviewers per cap not 9).
- Plan-execute: 1-3 dollars (mechanical edit; manual scenario walk is no-cost reasoning).
- /nightwork-qa (3 reviewers): 3-5 dollars (small surface).
- Ship: 1 dollar.
- Total projection: 12-20 dollars. Median ~14; tail ~18 if plan-review iter-1 surfaces non-trivial findings on permissiveness questions.

Ceiling discipline: If mid-authoring projection exceeds 15 dollars (per Rule 7d max one bump + Rule 7e scope-engineering ban), executor MUST halt and surface to Jake. No autonomous bump, no autonomous scope-trim to fit.

---

END EXPANDED-SCOPE.md — **APPROVED 2026-05-19 per nwrp190 Jake review.** Two amendments applied (Q2 hook-edit-discipline reasoning + Q5 custodian-task expansion to include CLAUDE.md size-reduction evaluation). One ambiguity flagged to plan-author for resolution at plan-review iter-1: AC-HDOD-13 self-validating-ship is internally inconsistent — ship commit contains the `.sh` hook edit which is explicit-NO doc-only, so the slice's own ship will not exercise the doc-only-skip path; instead the QA timestamp gate must pass legitimately (fresh QA cycle from this phase). Plan-author resolves by splitting AC-HDOD-13 into 13a (ship via fresh QA timestamp) + 13b (throwaway doc-only test commit demonstrates skip path, then discarded). Per nwrp189 section 40, this was the canonical /nightwork-init-phase path (not post-hoc per nwrp175 precedent).
