---
phase: stage-f1-knowledge-graph-auth-wave-d
plan: D-5
plan-name: d078-decision-entry
type: execute
wave: D
depends_on: []
autonomous: true
halt_after: false
threat_model_severity: low
status: not-started
authored: 2026-05-13
authored_by: gsd-planner (claude-opus-4-7[1m])
authorization: nwrp121 Addition 1 (Wave-D authorization — D-078 entry in MASTER-PLAN.md per Addition 1)
requirements: []
source_decisions:
  - "nwrp121 Addition 1 — D-078 decision: user-identity FK convention codified after Wave-C/Wave-D split"
  - "D-066 (cross-entity validation first-class; relationship-FK metadata is the substrate PostgREST hints + cross-entity validators read from — convention drift here is high-blast)"
  - "D-051 (schema-aware terminology rename — same posture: document convention divergence explicitly rather than silently extending split)"
  - "Migration 00097 header lines 49-56 — Wave-C originating FK target choice rationale: profiles FKs enable PostgREST display-name embedding; auth.users FKs preserved for ownership/audit semantic — explicitly flagged 'Deliberate convention divergence; documented for Wave-B coordination' but never landed as a numbered decision"
  - "Plan D-1 migration 00098 (in same Wave-D) — extends split by adding 2nd FK on org_members.user_id → profiles(id) alongside existing auth.users(id) FK; codifying convention BEFORE the extending migration ships is the natural sequencing per nwrp121 execution order"

files_modified:
  - .planning/MASTER-PLAN.md
  - CLAUDE.md

files_referenced:
  - supabase/migrations/00097_drop_public_users.sql (Wave-C migration that originated the split; header lines 49-56 document FK target choice rationale; verbatim source for D-078 entry's "Wave-C originating split" cross-reference)
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md (Wave-D scope doc; Plan D-5 row at "Plan D-5: D-078 decision entry in MASTER-PLAN.md (per Addition 1)" captures convention summary)
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-1-postgrest-relationship-fix-PLAN.md (sibling plan that adds the org_members.user_id → profiles(id) FK extending the split; D-5 codifies the convention this sibling extends)
  - .planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-4-rules-1-4-codification-PLAN.md (sibling plan adding CLAUDE.md Rules 1-4 + wave-d-smoke.ts; D-5 cross-reference in CLAUDE.md adjacent placement coordination)

requires:
  - .planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md
  - .planning/MASTER-PLAN.md
  - supabase/migrations/00097_drop_public_users.sql

provides:
  - "D-078 entry appended to DECISIONS LOG in .planning/MASTER-PLAN.md (table row in same format as D-073..D-077)"
  - "User-identity FK convention codified: NEW user-identity FK columns default to REFERENCES auth.users(id) UNLESS the column is used in PostgREST embedding hints for display, in which case REFERENCES profiles(id) with explicit migration-comment documentation"
  - "CLAUDE.md Architecture Rules section cross-reference to D-078 so future plan-authors discover the convention before writing FK migrations"
  - "Wave-D pre-D-1-execute decision exists before the extending code lands (per nwrp121 execution order: D-5 first)"
  - "Wave-B gate item 'D-078 entry committed to MASTER-PLAN.md' (per Wave-D EXPANDED-SCOPE §Wave-B gate) satisfied by this plan's execute"

affects:
  - "Future plan-authors writing user-identity FK migrations — convention now codified, no per-migration relitigation needed"
  - "Migration-comment discipline — plan-authors choosing REFERENCES profiles(id) MUST document the column's PostgREST hint usage explicitly in the migration comment (enforcement is plan-review responsibility, not hook-mechanical for D-5)"
  - "No runtime / no schema / no source-code behavior change — convention codification only"
  - "Wave-B Plan B-1a (Clients work) — when authored post-Wave-D, will inherit the convention without ambiguity"
  - "F-phase or Wave 1.1-Full full-standardization decision (whether to migrate all 45 to one target OR add second FK on all 45) — deferred per D-078; entry documents the defer rationale so future planners know the door is left open"

sequence:
  before: D-1 execute (per nwrp121 execution order — D-5 first so the decision exists before code that references it; D-1's migration 00098 extends the convention codified by D-5)
  parallel_authoring_ok: true (Plans D-1, D-2, D-3, D-4, D-5 all authored in parallel per Wave-D EXPANDED-SCOPE step 1)
  execute_order_within_wave: 1 (first to execute; D-1 + D-2 follow in parallel; D-4 next; D-3 last)

acceptance-criteria-target: 4 falsifiable items (AC-D5-01..AC-D5-04); see "Acceptance criteria" below

threat_model:
  trust_boundaries:
    - "Documentation-only boundary — Plan D-5 modifies only .planning/MASTER-PLAN.md and CLAUDE.md; no schema change, no source code change, no runtime behavior change. The 'trust boundary' here is plan-author discipline downstream: future migrations writing user-identity FKs are expected to read the D-078 convention before authoring. Enforcement is plan-review responsibility (BLOCKING if FK choice is undocumented), not hook-mechanical for D-5 itself."
    - "Convention-codification boundary — the entry crystallizes a split that already exists in the schema (45 auth.users FKs + 3 profiles FKs after Wave-D ships). The risk surface is the entry's own correctness: misstating the going-forward rule (e.g., wrong default target, missing the PostgREST-hint exception clause, wrong cross-references) would actively misdirect future plan-authors. Mitigation: planner cites verbatim sources (migration 00097 header lines 49-56, nwrp121 Addition 1, Wave-D EXPANDED-SCOPE Plan D-5 row); executor verifies the entry matches the planner-authored text in this PLAN.md before commit."

  threats:
    - id: T-D-5-01
      category: "T (Tampering — decision entry crystallizes wrong rule)"
      component: ".planning/MASTER-PLAN.md DECISIONS LOG D-078 row"
      disposition: "mitigate"
      mitigation: "Planner-authored D-078 entry verbatim text is included in Task 2 below (the exact markdown table row the executor commits). Executor MUST NOT paraphrase — copy-paste the row from Task 2 into MASTER-PLAN.md between D-077 (line 252) and the blank line preceding `## 11. TECH DEBT REGISTRY` (line 254). Per Wave-D plan-review iter-1, reviewers verify the committed row matches Task 2 verbatim (string equality on the row content) so the convention rule itself is what plan-review evaluated, not an executor paraphrase."
    - id: T-D-5-02
      category: "T (Tampering — cross-reference orphan)"
      component: "CLAUDE.md Architecture Rules bullet referencing D-078"
      disposition: "mitigate"
      mitigation: "Planner-authored CLAUDE.md bullet verbatim text included in Task 3 below. Executor inserts it as the 8th bullet in the Architecture Rules section (between the 'All business logic in server-side API routes or Supabase functions' bullet at line 71 and the '### Stage 1.5c information-architecture additions' subsection at line 73). The bullet text references MASTER-PLAN.md D-078 + the Wave-D phase directory — both anchors are committed by THIS plan, so cross-reference is non-orphan at commit time."
    - id: T-D-5-03
      category: "R (Repudiation — convention drift in subsequent plans)"
      component: "Future plan-authors writing user-identity FK migrations"
      disposition: "accept"
      mitigation: "D-5 codifies the convention; enforcement of 'NEW user-identity FK columns follow D-078' is plan-review responsibility (per Wave-D Plan D-4 Rule 2 codification; reviewers BLOCKING on undocumented FK target choice). D-5 itself cannot mechanically prevent a future migration from violating the convention; the post-commit safety net is plan-review iter-1 catching it. Acceptable because: (a) plan-review BLOCKING is the established Nightwork pattern for convention enforcement (e.g., D-066 cross-entity validators, D-072 IA mini-phase scope discipline); (b) the convention is documented in TWO places (MASTER-PLAN.md + CLAUDE.md) so plan-authors encountering EITHER on context-load will discover it."
    - id: T-D-5-04
      category: "I (Information Disclosure — incorrect FK count)"
      component: "D-078 entry's 'Current state' clause (45 auth.users + 3 profiles post-Wave-D)"
      disposition: "mitigate"
      mitigation: "Planner-authored count derived from: (a) Wave-D EXPANDED-SCOPE Plan D-5 row explicit statement '45× auth.users + 3× profiles post-Wave-D' (line referencing 'Current state: split (45× auth.users, 3× profiles post-Wave-D)'); (b) migration 00097 explicit statement of 2 FK retargets (invoices.assigned_pm_id + org_workflow_settings.import_default_pm_id); (c) Plan D-1 migration 00098 explicit addition of org_members.user_id second FK to profiles(id). Count is documentary, not load-bearing on schema correctness — if future audit reveals the count is off-by-one (e.g., 46 auth.users instead of 45), the convention rule itself is still correct. Executor Task 1 includes an OPTIONAL pre-flight verification (information_schema query for actual count); if the actual count differs from documented, executor adds a footnote to the entry's 'Current state' clause without changing the rule. HALT only if count is wildly off (e.g., 30 vs 45 — indicates audit drift)."

must_haves:
  truths:
    - "After Plan D-5 commits, `grep -c '^| \\*\\*D-078\\*\\*' .planning/MASTER-PLAN.md` returns 1"
    - "After Plan D-5 commits, the D-078 row in MASTER-PLAN.md DECISIONS LOG matches the verbatim text in Task 2 of this PLAN.md (string equality on the markdown table row content)"
    - "After Plan D-5 commits, the D-078 row contains all 5 required clause-keywords: 'Current state', 'Rationale', 'Going-forward convention', 'Deferred', 'Cross-references' (verifiable via `grep -E 'Current state|Rationale|Going-forward convention|Deferred|Cross-references' .planning/MASTER-PLAN.md`)"
    - "After Plan D-5 commits, `grep -c 'D-078' CLAUDE.md` returns at least 1"
    - "After Plan D-5 commits, the CLAUDE.md bullet referencing D-078 lives inside the Architecture Rules section (between line 71 'TypeScript strict mode' / 'business logic' boundary and the line 73 '### Stage 1.5c information-architecture additions' subsection)"
    - "After Plan D-5 commits, `git status --porcelain` shows ONLY .planning/MASTER-PLAN.md + CLAUDE.md modified (no source code changes, no migration files, no schema files)"
    - "After Plan D-5 commits, `git diff --name-only HEAD~1 HEAD` contains exactly 2 files: .planning/MASTER-PLAN.md + CLAUDE.md"
    - "After Plan D-5 commits, `npm run build` continues to pass (zero new TypeScript errors; documentation-only change touches no .ts/.tsx file)"
    - "After Plan D-5 commits, Drummond grep gate (.githooks/pre-commit) silent on the committed diff (documentation-only diff carries no Drummond identifiers)"
    - "D-078 entry cites migration 00097 (Wave-C originating split) + migration 00098 (Wave-D org_members extension) + CLAUDE.md Architecture Rules + .planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-5-d078-decision-entry-PLAN.md (this plan) in its Cross-references clause"
    - "D-078 entry's Going-forward convention clause states: NEW user-identity FK columns default to auth.users(id) UNLESS used in PostgREST embedding hints for display — in which case profiles(id) — with explicit migration-comment documentation"
    - "D-078 entry's Deferred clause states: full standardization (migrate all 45 to one target OR add second FK on all 45) is an F-phase or Wave 1.1-Full decision; not Wave-D scope"

  artifacts:
    - path: ".planning/MASTER-PLAN.md"
      provides: "D-078 entry appended to DECISIONS LOG table (row inserted between D-077 row at line 252 and the blank-line preceding `## 11. TECH DEBT REGISTRY` at line 254)"
      contains: "**D-078**"
      contains_also: "user-identity FK convention codified after Wave-C/Wave-D split"
      contains_also_2: "Going-forward convention"

    - path: "CLAUDE.md"
      provides: "Architecture Rules bullet referencing D-078 (8th bullet in section; between line 71 and line 73)"
      contains: "User-identity FK convention (per D-078)"
      contains_also: "REFERENCES auth.users(id)"
      contains_also_2: "REFERENCES profiles(id)"

  key_links:
    - from: ".planning/MASTER-PLAN.md D-078 entry"
      to: "supabase/migrations/00097_drop_public_users.sql (Wave-C originating split)"
      via: "Cross-references clause in entry body"
      pattern: "migration 00097"

    - from: ".planning/MASTER-PLAN.md D-078 entry"
      to: "supabase/migrations/00098 (Wave-D org_members second-FK extension authored in Plan D-1)"
      via: "Cross-references clause in entry body"
      pattern: "migration 00098"

    - from: ".planning/MASTER-PLAN.md D-078 entry"
      to: "CLAUDE.md Architecture Rules section (per Plan D-4 Rule 2 + D-5 cross-reference)"
      via: "Cross-references clause in entry body"
      pattern: "CLAUDE.md Architecture Rules"

    - from: ".planning/MASTER-PLAN.md D-078 entry"
      to: ".planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-5-d078-decision-entry-PLAN.md (this plan)"
      via: "Cross-references clause in entry body"
      pattern: "stage-f1-knowledge-graph-auth-wave-d.*D-5"

    - from: "CLAUDE.md Architecture Rules bullet"
      to: ".planning/MASTER-PLAN.md D-078"
      via: "Direct citation 'See MASTER-PLAN.md D-078'"
      pattern: "MASTER-PLAN\\.md D-078"

    - from: "CLAUDE.md Architecture Rules bullet"
      to: ".planning/phases/stage-f1-knowledge-graph-auth-wave-d/"
      via: "Direct citation 'See ... .planning/phases/stage-f1-knowledge-graph-auth-wave-d/ for context'"
      pattern: "stage-f1-knowledge-graph-auth-wave-d"

criteria:
  mechanical:
    - "grep -c '^| \\*\\*D-078\\*\\*' .planning/MASTER-PLAN.md returns exactly 1"
    - "grep -c 'D-078' CLAUDE.md returns at least 1 (target: exactly 1 new reference in Architecture Rules bullet; D-078 may appear in commit message footers that grep would also count — primary check is the Architecture Rules bullet exists at the documented insertion line)"
    - "git diff --name-only HEAD~1 HEAD returns exactly 2 files: .planning/MASTER-PLAN.md + CLAUDE.md (verifiable post-commit by executor)"
    - "git status --porcelain (pre-commit) shows exactly 2 modified files; zero new/untracked source files"
    - "npm run build passes with zero new TypeScript errors (documentation-only diff touches no .ts/.tsx file; build should be no-op-equivalent for tsc)"
    - "Drummond grep gate (.githooks/pre-commit) returns 0 hits on diff (no Drummond client/job identifiers in either edit)"

  dom: []
    # No DOM-rendered surfaces — documentation-only change.

  visual: []
    # No visual surfaces — documentation-only change. Harness Layer 3 vision verification N/A for this plan.

  behavioral:
    - "Future plan-author opening CLAUDE.md before writing a user-identity FK migration discovers D-078 reference in the Architecture Rules section (the 8th bullet, adjacent to the existing 'business logic server-side' bullet) and follows the cross-reference to MASTER-PLAN.md D-078 for the full convention. Verifiable manually by Jake at any time post-commit: `grep -A 1 'User-identity FK convention' CLAUDE.md` shows the bullet."
    - "Plan-review iter-1 reviewer reading D-078 entry can determine WITHOUT additional context: (a) the default FK target for new user-identity columns is auth.users(id); (b) the exception that triggers profiles(id) instead is PostgREST embedding hints for display; (c) the documentation discipline when choosing profiles(id) is migration-comment explicit; (d) the current schema state (45 auth.users + 3 profiles post-Wave-D) is documentary; (e) full standardization is deferred to F-phase or Wave 1.1-Full. All 5 are extractable from the entry text alone."

  semantic:
    - "D-078 entry follows the existing D-073..D-077 markdown table row shape: `| **D-NNN** | YYYY-MM-DD | <decision text with rationale clauses> | <terse rationale/source clause> |` (4 pipe-separated cells; bold ID; ISO date; decision body uses bold-marked clause keywords; trailing rationale cell is concise)"
    - "D-078 entry's decision body contains 5 bold-marked clauses in the order: Current state. → Rationale. → Going-forward convention. → Deferred. → Cross-references. (matches the natural narrative order for a convention-codification entry; matches the planner-authored Task 2 verbatim text)"
    - "CLAUDE.md bullet follows the existing Architecture Rules bullet shape: leading `**Bold name**` followed by colon and the rule statement, ending with citation pointers (`See ... for context.`). Comparable to existing bullet shape at line 65: `**Every record:** ...` and line 67: `**Status history:** ...`"
    - "The D-078 entry's 'Cross-references' clause names FOUR anchors: migration 00097, migration 00098, CLAUDE.md Architecture Rules section, and this plan's path. All four anchors are reachable post-commit (00097 already exists in main; 00098 ships in Plan D-1 same wave; CLAUDE.md edit lands in this plan; PLAN.md path is the file you are reading)."
    - "No prohibited GSD scope-reduction language in entry or plan body: no 'v1', 'simplified version', 'placeholder', 'future enhancement', 'basic version' applied to the convention rule itself. The 'Deferred' clause uses 'deferred to F-phase or Wave 1.1-Full' which is an explicit phase-defer, not scope-reduction."
---

# D-5 — D-078 decision entry: user-identity FK convention codified in MASTER-PLAN.md + CLAUDE.md

## Goal

Codify the user-identity FK convention that emerged from Wave-C migration 00097 and is being extended by Wave-D migration 00098 (Plan D-1). After Plan D-5 commits, the convention exists as a numbered decision in `.planning/MASTER-PLAN.md` DECISIONS LOG (D-078) and is discoverable via `CLAUDE.md` Architecture Rules section so future plan-authors writing user-identity FK migrations don't re-litigate the choice. **Documentation artifact only. No code change. No migration. No schema change.**

The convention being codified:

> **NEW user-identity FK columns default to `REFERENCES auth.users(id)` UNLESS the column is used in PostgREST embedding hints for display purposes — in which case `REFERENCES profiles(id)` with explicit migration-comment documentation.**

This is what migration 00097 header lines 49-56 explained as "Deliberate convention divergence; documented for Wave-B coordination" but never landed as a numbered decision. Wave-D's Plan D-1 extends the split (adding org_members.user_id second FK to profiles(id) so PostgREST `profile:profiles(id, full_name)` resolves cleanly), making this the natural moment to codify before more plans extend the convention without a canonical reference.

---

## Source decisions (verbatim from authoritative sources)

> **nwrp121 Addition 1** — D-078 decision entry in MASTER-PLAN.md per Addition 1. New decision: user-identity FK convention. Current state: split (45× auth.users, 3× profiles post-Wave-D). Rationale: profiles FKs enable PostgREST embedding for display-name joins; auth.users FKs preserved for ownership/audit/identity columns. Going-forward convention: NEW user-identity FKs default to auth.users UNLESS the column is used in PostgREST embedding hints for display, in which case profiles. Document the column explicitly when choosing profiles. Deferred: full standardization (migrate all 45 to one target) is an F-phase or Wave 1.1-Full decision. Cross-reference: this entry + Wave-D PLAN.md + migration 00097 (Wave-C originating split) + Wave-D migration (extends to org_members).
>
> (`.planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md` lines 55-61)

> **Migration 00097 header lines 49-56 (FK target choice rationale)** — FKs retarget to `profiles(id)` not `auth.users(id)`. Codebase convention for person-FKs is REFERENCES auth.users(id) (30+ existing FKs). Plan C-1 retargets to `profiles(id)` because the PostgREST relationship hint `assigned_pm:assigned_pm_id (id, full_name, role)` requires full_name + role columns — which exist on profiles, NOT on auth.users. FK pointing at auth.users would break the named relationship resolution. **Deliberate convention divergence; documented for Wave-B coordination.**
>
> (`supabase/migrations/00097_drop_public_users.sql` lines 49-56)

> **Wave-D EXPANDED-SCOPE step 4 — Execute in dependency order: D-5 first (decision exists before code references it); D-1 + D-2 parallel (independent code/migration); D-4 (Rules + script); D-3 (test packet).**
>
> (`.planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md` line 70)

> **Wave-D EXPANDED-SCOPE Wave-B gate — D-078 entry committed to MASTER-PLAN.md** (one of the 5 Wave-B unblock conditions per nwrp121).
>
> (`.planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md` line 85)

---

## Pre-flight grep (REQUIRED at execute start)

Executor MUST run BEFORE editing any file:

```bash
# Verify D-077 is the highest existing D-XXX in MASTER-PLAN.md DECISIONS LOG
grep -oE '\*\*D-[0-9]{3}\*\*' .planning/MASTER-PLAN.md | sort -u | tail -3
```

**Expected output (against current main as of 2026-05-13):**

```
**D-075**
**D-076**
**D-077**
```

If `**D-078**` already exists in output, HALT for Jake — entry was authored elsewhere and this plan should be reconciled or skipped.

If the highest is below D-077 (e.g., D-076), HALT for Jake — MASTER-PLAN.md state has diverged from planner-time expectation; investigate before extending.

```bash
# Verify Architecture Rules section structure in CLAUDE.md
grep -n '^## Architecture Rules\|^### Stage 1.5c information-architecture' CLAUDE.md
```

**Expected output:**

```
61:## Architecture Rules (Non-Negotiable)
73:### Stage 1.5c information-architecture additions (D-040..D-065)
```

If line numbers have drifted (e.g., section at line 80 instead of 61), update Task 3 insertion-line citation accordingly — the SEMANTIC anchor is "the 8th bullet in Architecture Rules section, between the 'All business logic in server-side API routes or Supabase functions' bullet and the '### Stage 1.5c information-architecture additions' subsection."

---

## Scope inclusions

1. **Append D-078 entry** to the DECISIONS LOG table in `.planning/MASTER-PLAN.md` as a single new markdown table row, inserted between the existing D-077 row (line 252) and the blank line preceding `## 11. TECH DEBT REGISTRY` (line 254). The row text is authored verbatim in Task 2 below.
2. **Insert CLAUDE.md cross-reference bullet** in the Architecture Rules section as the 8th bullet (between the "All business logic in server-side API routes or Supabase functions" bullet at line 71 and the "### Stage 1.5c information-architecture additions" subsection at line 73). The bullet text is authored verbatim in Task 3 below.
3. **Commit the 2-file diff** with a commit message documenting the convention codification + Wave-B gate satisfaction.

## Scope exclusions

- **No source code changes.** Zero edits to `src/`, `supabase/migrations/`, or any other code path. Verifiable post-commit via `git diff --name-only HEAD~1 HEAD` returning exactly 2 files (MASTER-PLAN.md + CLAUDE.md).
- **No new migration.** Migration 00098 lives in Plan D-1, not D-5. D-5 only references it textually in the D-078 entry's Cross-references clause.
- **No FK retarget on existing 45 columns.** Per the convention's Deferred clause, full standardization is an F-phase or Wave 1.1-Full decision; D-5 only codifies the going-forward rule.
- **No CLAUDE.md drift beyond the 1 inserted bullet.** Existing Architecture Rules bullets remain verbatim; existing "### Stage 1.5c information-architecture additions" subsection remains verbatim; only the 8th bullet is added.
- **No hook update.** Convention enforcement is plan-review responsibility (per Wave-D Plan D-4 Rule 2 codification, BLOCKING on undocumented FK target choice). D-5 does not extend post-edit hooks.
- **No ENTITY-INVENTORY.md or other architecture-doc updates.** Cross-references in the D-078 entry are sufficient; ENTITY-INVENTORY.md can pick up the convention reference in F1 schema-design phase when it consumes the WI patterns per D-066.

---

## Convention codification rationale

### Why codify NOW rather than at F-phase boundary

The convention divergence was first introduced in Wave-C migration 00097 (retargeting 2 FKs from public.users → profiles) and is being extended in Wave-D Plan D-1 migration 00098 (adding org_members.user_id second FK to profiles). Without codification:

1. **Each future plan-author re-discovers the trade-off** when authoring a user-identity FK. The trade-off is non-obvious (PostgREST relationship resolution semantics are not a Postgres-DDL concern visible at migration-design time) and was already mis-applied in Wave-C planning iter-1 (per nwrp120 ISSUE 1 root-cause diagnosis: 9 sites with `profiles:user_id(...)` hint that PostgREST cannot resolve without an FK on org_members.user_id → profiles(id)).
2. **The convention exists implicitly in migration 00097 header lines 49-56** but is not searchable as a decision. New plan-authors grep MASTER-PLAN.md for "FK convention" or "user identity" and find nothing.
3. **Wave-B gate explicitly requires** "D-078 entry committed to MASTER-PLAN.md" per nwrp121 (Wave-D EXPANDED-SCOPE §Wave-B gate). Wave-B Plan B-1a (Clients work) will author user-identity FKs and depends on the convention being legible.

### Why this convention (default auth.users, exception profiles for display joins)

**Default `auth.users(id)`:**
- Existing codebase has 45 columns FK'd to `auth.users(id)` (per Wave-D EXPANDED-SCOPE; verified pre-Wave-C state). Switching the default to `profiles(id)` would require migrating 45 columns + accepting a long tail of edge cases (FKs preserved for ownership/audit semantic where display-name embedding is NOT used).
- `auth.users` is the foundational Supabase Auth identity. Every user-identity FK is conceptually anchored there.
- ON DELETE semantics are well-understood: `auth.users` row deletion cascades to `profiles` (per migration 00007:16 `profiles.id REFERENCES auth.users(id) ON DELETE CASCADE`), and downstream FKs to auth.users inherit the parent's behavior.

**Exception `profiles(id)` for display joins:**
- PostgREST resolves named relationships through FK metadata. A select hint like `profile:profiles(id, full_name)` requires an FK on the source column pointing at `profiles(id)`. Without that FK, PostgREST returns `null` for the embedded object (the bug pattern in nwrp120 ISSUE 1).
- `profiles` carries `full_name` + role + display-relevant columns that `auth.users` does NOT (auth.users is intentionally minimal per Supabase Auth design).
- Wave-C's migration 00097 retargeted `invoices.assigned_pm_id` + `org_workflow_settings.import_default_pm_id` to profiles(id) specifically to enable PostgREST display-name embedding (per migration 00097 header lines 49-56). The same rationale applies to `org_members.user_id` second FK in Wave-D Plan D-1.

**Document discipline when choosing profiles(id):**
- Plan-author MUST add an explicit migration comment stating the PostgREST hint(s) that triggered the choice (e.g., `-- FK target: profiles(id) [not auth.users(id)] because PostgREST hint 'profile:profiles(id, full_name)' in src/lib/notifications.ts:247 + src/app/.../page.tsx:204 requires FK-derived relationship resolution`).
- Plan-review iter-1 reviewers verify the comment is present (per Wave-D Plan D-4 Rule 2 codification — BLOCKING on undocumented FK target choice).

### Why defer full standardization

Two paths exist for eventual standardization:

**Path A — migrate all 45 to a single target.** Cost: 45-column migration in a single wave; cascading changes to RLS policies (some policies query `auth.users` via FK, some query `profiles` via FK); test sweep for ownership/audit semantic preservation. Risk: high-blast.

**Path B — add a second FK on all 45 columns** (so every user-identity column FKs to BOTH auth.users(id) AND profiles(id)). Cost: lower-blast per-column but doubles FK metadata for downstream tooling that walks `information_schema.referential_constraints`. Risk: medium (FK metadata bloat).

Either path is an F-phase or Wave 1.1-Full decision. D-5 leaves the door open; D-078's Deferred clause names both paths so future planners know the door is left open.

---

## Implementation tasks

### Task 1 — Pre-flight verification (REQUIRED before editing any file)

**Path:** N/A (verification only)

**Action:** Executor MUST complete all steps before editing files.

**Step A — Highest existing D-XXX:**

```bash
grep -oE '\*\*D-[0-9]{3}\*\*' .planning/MASTER-PLAN.md | sort -u | tail -3
```

Expected: `**D-075**`, `**D-076**`, `**D-077**` (in that order). If `**D-078**` already exists, HALT. If highest is below D-077, HALT.

**Step B — Insertion-line confirmation:**

```bash
grep -n '^| \*\*D-077\*\*\|^## 11\. TECH DEBT REGISTRY' .planning/MASTER-PLAN.md
```

Expected:
```
252:| **D-077** | ...
254:## 11. TECH DEBT REGISTRY
```

Line 253 is the insertion line (currently blank, separating D-077 row from `## 11.` heading). If line numbers have drifted (e.g., D-077 at 250 and `## 11.` at 252), the SEMANTIC anchor is "directly after the D-077 row, before the section break to `## 11. TECH DEBT REGISTRY`." Use the actual current line numbers from this grep output.

**Step C — CLAUDE.md section structure:**

```bash
grep -n '^## Architecture Rules\|^### Stage 1.5c information-architecture\|^- \*\*All business logic' CLAUDE.md
```

Expected:
```
61:## Architecture Rules (Non-Negotiable)
71:- **All business logic in server-side API routes or Supabase functions.** Frontend is display + forms only.
73:### Stage 1.5c information-architecture additions (D-040..D-065)
```

Line 72 is the insertion line (currently blank, separating the bullet list from the `### Stage 1.5c` subsection). If line numbers have drifted, the SEMANTIC anchor is "the 8th bullet in Architecture Rules, between the 'All business logic ...' bullet and the '### Stage 1.5c information-architecture additions' subsection." Use the actual current line numbers from this grep output.

**Step D — D-078 entry text verification (planner-authored):**

The exact markdown table row to insert in MASTER-PLAN.md is in Task 2 below. The exact CLAUDE.md bullet to insert is in Task 3 below. Executor MUST copy these verbatim — no paraphrase.

**Step E — git working tree clean:**

```bash
git status --porcelain
```

Expected: empty output (no uncommitted changes). If output is non-empty, HALT for Jake — Plan D-5's diff should be the only diff for its commit.

**Verify:** All 5 steps documented in SUMMARY.md before proceeding to Tasks 2-3.

### Task 2 — Append D-078 entry to MASTER-PLAN.md DECISIONS LOG

**Path:** `.planning/MASTER-PLAN.md`

**Action:** Insert the following single markdown table row directly after the existing D-077 row (currently at line 252 per planner-time grep) and before the blank line preceding `## 11. TECH DEBT REGISTRY` (currently at line 254). Use the Edit tool with `old_string` = the D-077 row line followed by the blank line, `new_string` = the D-077 row line + newline + the D-078 row line below + newline + the blank line — i.e., the D-078 row sits between D-077 and the blank line, preserving the blank line as the separator to `## 11.`.

**Verbatim D-078 row to insert (single line; do not break across lines in the file even if it renders multi-line here — the existing DECISIONS LOG rows are single-line markdown table rows):**

```markdown
| **D-078** | 2026-05-13 | User-identity FK convention codified after Wave-C/Wave-D split. **Current state:** 45 columns FK → `auth.users(id)` (canonical pre-Wave-C convention) + 3 columns FK → `profiles(id)` post-Wave-D (`invoices.assigned_pm_id` per migration 00097; `org_workflow_settings.import_default_pm_id` per migration 00097; `org_members.user_id` second FK per migration 00098). **Rationale:** profiles FKs enable PostgREST relationship resolution for display-name embedding hints (`profile:profiles(id, full_name)`); auth.users FKs preserve ownership/audit/identity semantic for columns NOT used in display joins. **Going-forward convention:** NEW user-identity FK columns default to `REFERENCES auth.users(id)` UNLESS the column is referenced in PostgREST embedding hints for display purposes — in which case `REFERENCES profiles(id)`. Plan-authors choosing `profiles(id)` MUST document the column's PostgREST hint usage explicitly in the migration comment (which file(s) + line(s) the hint appears in). **Deferred:** full standardization (migrate all 45 to one target OR add second FK on all 45) is an F-phase or Wave 1.1-Full decision; not Wave-D scope. **Cross-references:** migration 00097 (Wave-C originating split, lines 49-56 header rationale), migration 00098 (Wave-D `org_members.user_id` second-FK extension authored in Plan D-1), CLAUDE.md Architecture Rules section (FK convention bullet added per Plan D-5 cross-reference), `.planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-5-d078-decision-entry-PLAN.md` (this plan). | Wave-C surfaced the split via PostgREST `profiles:user_id(...)` hint malformation (nwrp120 ISSUE 1 root-cause); Wave-D Plan D-1 extends the split to `org_members.user_id`; D-5 codifies convention so future plan-authors don't re-litigate. |
```

**Insertion mechanics (Edit tool):**

The `old_string` MUST be the exact text of the D-077 row (the verbatim line currently at line 252) followed by `\n` (the blank line at 253) followed by `## 11. TECH DEBT REGISTRY` (the heading at 254). The `new_string` MUST be the D-077 row + `\n` + the D-078 row (from above, verbatim) + `\n` + the blank line + `## 11. TECH DEBT REGISTRY`.

Concretely:
- `old_string` = `"| **D-077** | 2026-05-11 | Loop-with-executor: ... pure-function transitions; no recursive calls. Plan-review watchpoint #7 (idempotency contract precise): commit_sha + criterion_hash key tested; rerun-on-same-commit really is no-op (Plan 11 self-test). |\n\n## 11. TECH DEBT REGISTRY"`
- `new_string` = `"| **D-077** | 2026-05-11 | Loop-with-executor: ... (same D-077 text verbatim) |\n| **D-078** | 2026-05-13 | User-identity FK convention codified ... (D-078 text from above, verbatim) |\n\n## 11. TECH DEBT REGISTRY"`

(The executor will read the actual D-077 row text from MASTER-PLAN.md at execute time and copy the full text into `old_string`. Do NOT abbreviate the D-077 text in the Edit call — the Edit tool requires exact string match.)

**Verify:**

```bash
# 1. D-078 row exists in MASTER-PLAN.md
grep -c '^| \*\*D-078\*\*' .planning/MASTER-PLAN.md
# Expect: 1

# 2. D-078 contains all 5 required clause keywords
grep -E '\*\*D-078\*\*' .planning/MASTER-PLAN.md | grep -oE '\*\*Current state:\*\*|\*\*Rationale:\*\*|\*\*Going-forward convention:\*\*|\*\*Deferred:\*\*|\*\*Cross-references:\*\*' | wc -l
# Expect: 5

# 3. D-078 row is the LAST row in the DECISIONS LOG (i.e., no rows between D-078 and `## 11.`)
awk '/^\| \*\*D-078\*\*/,/^## 11\. TECH DEBT REGISTRY/' .planning/MASTER-PLAN.md | grep -cE '^\| \*\*D-[0-9]+\*\*'
# Expect: 1 (only D-078 itself; no later rows)

# 4. D-077 row is still present (Edit did not accidentally clobber it)
grep -c '^| \*\*D-077\*\*' .planning/MASTER-PLAN.md
# Expect: 1
```

**Done:** D-078 row inserted at the correct location in MASTER-PLAN.md; D-077 unchanged; all 4 verify commands pass.

### Task 3 — Insert CLAUDE.md Architecture Rules bullet referencing D-078

**Path:** `CLAUDE.md`

**Action:** Insert the following single bullet as the 8th bullet in the Architecture Rules section (between the "All business logic in server-side API routes or Supabase functions" bullet at line 71 and the "### Stage 1.5c information-architecture additions" subsection at line 73). Use the Edit tool with `old_string` = the "All business logic" bullet line + `\n\n### Stage 1.5c information-architecture additions (D-040..D-065)`, `new_string` = the "All business logic" bullet line + `\n` + the new bullet text below + `\n\n### Stage 1.5c information-architecture additions (D-040..D-065)`.

**Verbatim CLAUDE.md bullet to insert:**

```markdown
- **User-identity FK convention (per D-078):** New columns referencing a user identity default to `REFERENCES auth.users(id)`. UNLESS the column is used in PostgREST embedding hints for display (e.g., `profile:profiles(id, full_name)`), in which case use `REFERENCES profiles(id)`. Document the PostgREST hint usage in the migration comment (which file(s) + line(s) the hint appears in). See MASTER-PLAN.md D-078 + `.planning/phases/stage-f1-knowledge-graph-auth-wave-d/` for context.
```

**Insertion mechanics (Edit tool):**

- `old_string` = `"- **All business logic in server-side API routes or Supabase functions.** Frontend is display + forms only.\n\n### Stage 1.5c information-architecture additions (D-040..D-065)"`
- `new_string` = `"- **All business logic in server-side API routes or Supabase functions.** Frontend is display + forms only.\n- **User-identity FK convention (per D-078):** New columns referencing a user identity default to \`REFERENCES auth.users(id)\`. UNLESS the column is used in PostgREST embedding hints for display (e.g., \`profile:profiles(id, full_name)\`), in which case use \`REFERENCES profiles(id)\`. Document the PostgREST hint usage in the migration comment (which file(s) + line(s) the hint appears in). See MASTER-PLAN.md D-078 + \`.planning/phases/stage-f1-knowledge-graph-auth-wave-d/\` for context.\n\n### Stage 1.5c information-architecture additions (D-040..D-065)"`

(Backticks in the bullet text MUST be preserved verbatim — markdown table parsing in MASTER-PLAN.md vs prose markdown in CLAUDE.md handle backticks identically; the Edit tool string-matches them.)

**Verify:**

```bash
# 1. Bullet exists in CLAUDE.md
grep -c '\*\*User-identity FK convention (per D-078):\*\*' CLAUDE.md
# Expect: 1

# 2. Bullet references D-078 anchor
grep -c 'MASTER-PLAN\.md D-078' CLAUDE.md
# Expect: 1

# 3. Bullet sits inside Architecture Rules section (between line ~71 'All business logic' and line ~73 '### Stage 1.5c')
awk '/^## Architecture Rules/,/^### Stage 1.5c information-architecture additions/' CLAUDE.md | grep -c 'User-identity FK convention'
# Expect: 1

# 4. Pre-existing 'All business logic' bullet is still present (Edit did not clobber)
grep -c 'All business logic in server-side API routes or Supabase functions' CLAUDE.md
# Expect: 1

# 5. Pre-existing '### Stage 1.5c information-architecture additions' subsection still present
grep -c '^### Stage 1.5c information-architecture additions' CLAUDE.md
# Expect: 1
```

**Done:** D-078 bullet inserted at the correct location in CLAUDE.md Architecture Rules section; existing 7th bullet ("All business logic") unchanged; existing "### Stage 1.5c information-architecture additions" subsection unchanged; all 5 verify commands pass.

### Task 4 — Final verification + commit

**Path:** N/A (verification + commit only)

**Action:**

**Step A — Diff verification:**

```bash
git diff --name-only
```

Expected: exactly 2 lines:
```
.planning/MASTER-PLAN.md
CLAUDE.md
```

If any other file appears, HALT for Jake.

**Step B — Build + grep gate:**

```bash
npm run build 2>&1 | tail -20
```

Expected: build passes with zero new TypeScript errors. (Documentation-only diff should be no-op-equivalent for tsc.)

```bash
# Drummond grep gate (the .githooks/pre-commit hook would run this; pre-verify before staging)
git diff | grep -iE 'drummond|client[_ -]?name|<address>' || echo "Drummond gate: clean"
```

Expected: `Drummond gate: clean` printed (no Drummond identifiers in the diff). If grep returns any matches, HALT for Jake — Plan D-5 should not introduce Drummond strings.

**Step C — Stage + commit:**

```bash
git add .planning/MASTER-PLAN.md CLAUDE.md
git commit -m "docs(wave-d): D-078 user-identity FK convention codified

D-078 entry appended to .planning/MASTER-PLAN.md DECISIONS LOG. Codifies
the user-identity FK convention introduced by Wave-C migration 00097
(invoices.assigned_pm_id + org_workflow_settings.import_default_pm_id
retargeted from public.users(id) to profiles(id)) and extended by
Wave-D migration 00098 (org_members.user_id second FK to profiles(id)
authored in Plan D-1).

Convention: NEW user-identity FK columns default to REFERENCES
auth.users(id) UNLESS the column is referenced in PostgREST embedding
hints for display purposes — in which case REFERENCES profiles(id)
with explicit migration-comment documentation.

Wave-B gate item 'D-078 entry committed to MASTER-PLAN.md' (per
.planning/expansions/stage-f1-knowledge-graph-auth-wave-d-EXPANDED-SCOPE.md
§Wave-B gate) satisfied by this commit.

Full standardization (migrate all 45 auth.users FKs to one target OR
add second FK on all 45) deferred to F-phase or Wave 1.1-Full per
D-078 Deferred clause.

CLAUDE.md Architecture Rules section gets an 8th bullet cross-referencing
D-078 so future plan-authors discover the convention before writing
user-identity FK migrations.

No source code change. No migration. No schema change.

Plan: .planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-5-d078-decision-entry-PLAN.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

**Step D — Post-commit verification:**

```bash
git diff --name-only HEAD~1 HEAD
```

Expected: exactly 2 lines (.planning/MASTER-PLAN.md + CLAUDE.md).

```bash
git status --porcelain
```

Expected: empty output (working tree clean post-commit).

```bash
# D-078 entry exists and is searchable
grep -c '^| \*\*D-078\*\*' .planning/MASTER-PLAN.md
# Expect: 1

# CLAUDE.md bullet exists and is searchable
grep -c '\*\*User-identity FK convention (per D-078):\*\*' CLAUDE.md
# Expect: 1
```

**Done:** Both files committed in a single commit; working tree clean; D-078 entry + CLAUDE.md bullet both searchable; all 4 post-commit verify commands pass.

---

## Acceptance criteria

| ID | Criterion | Verification |
|---|---|---|
| **AC-D5-01** | D-078 entry appended to `.planning/MASTER-PLAN.md` DECISIONS LOG as a single markdown table row matching the verbatim text in Task 2 | `grep -c '^\| \*\*D-078\*\*' .planning/MASTER-PLAN.md` returns 1 AND the row contains the 5 bold-marked clauses (Current state, Rationale, Going-forward convention, Deferred, Cross-references) AND the row text matches Task 2 verbatim (executor reads the committed row and confirms string-equality with planner-authored text) |
| **AC-D5-02** | CLAUDE.md Architecture Rules section gets a new bullet referencing D-078, inserted as the 8th bullet (between "All business logic" and "### Stage 1.5c information-architecture additions") | `awk '/^## Architecture Rules/,/^### Stage 1.5c information-architecture additions/' CLAUDE.md \| grep -c 'User-identity FK convention'` returns 1 AND the bullet references both `MASTER-PLAN.md D-078` AND `.planning/phases/stage-f1-knowledge-graph-auth-wave-d/` |
| **AC-D5-03** | No source code changes; only 2 files modified | `git diff --name-only HEAD~1 HEAD` returns exactly `.planning/MASTER-PLAN.md` and `CLAUDE.md` (2 lines total) AND `npm run build` passes with zero new TypeScript errors |
| **AC-D5-04** | Plan-author cites existing D-073..D-077 entry shape as the template; the D-078 entry follows the same 4-cell markdown table row shape (bold ID \| ISO date \| decision body with bold-marked clauses \| terse rationale/source cell) | Manual inspection: the D-078 row in MASTER-PLAN.md is grammatically a single markdown table row (single line in source); first cell is `**D-078**`; second cell is `2026-05-13`; third cell contains the 5 bold-marked clauses; fourth cell is the terse rationale citing nwrp120 ISSUE 1 + Wave-D Plan D-1 origin |

---

## Self-review checklist (planner)

- [x] **No GSD-prohibited language used in plan or entry body** (no "v1", "simplified version", "placeholder", "future enhancement", "basic version" applied to the convention rule itself). The "Deferred" clause uses "deferred to F-phase or Wave 1.1-Full" which is an explicit phase-defer, not scope-reduction (per `<scope_reduction_prohibition>` in agent prompt).
- [x] **D-078 entry's Cross-references clause names 4 anchors** (00097, 00098, CLAUDE.md, this plan's path) — all reachable post-commit. Plan-review iter-1 reviewer can follow each anchor.
- [x] **Template citation explicit** — Task 2 cites D-073..D-077 as shape template (the existing rows are 4-cell markdown table rows; the D-078 row matches that shape) per acceptance criteria AC-D5-04.
- [x] **No code change scope creep** — the only file edits are MASTER-PLAN.md (1 row insertion) + CLAUDE.md (1 bullet insertion). Verifiable via `git diff --name-only HEAD~1 HEAD` returning 2 files.
- [x] **Source decision verbatim quotes provided** — nwrp121 Addition 1, migration 00097 header lines 49-56, Wave-D EXPANDED-SCOPE step 4 + Wave-B gate. Plan-review reviewer can verify the convention rule was derived from these sources without paraphrase drift.
- [x] **Pre-flight grep gates documented** — Step A (highest D-XXX), Step B (insertion-line confirmation in MASTER-PLAN.md), Step C (CLAUDE.md section structure), Step D (planner-authored verbatim text confirmation), Step E (git working tree clean). All 5 documented in Task 1.
- [x] **Acceptance criteria are falsifiable** — 4 criteria each have a grep / awk / `git diff` command that returns a checkable count or string-equality result. No "looks good" subjective criteria.
- [x] **Threat model proportional to scope** — 4 threats covering convention drift (T-D-5-01 / T-D-5-02 paraphrase risk; T-D-5-03 future-plan drift; T-D-5-04 count accuracy). All 4 have explicit mitigation or accept rationale. No security_enforcement skip — this is a documentation-only plan but the threat model is required per agent prompt and is meaningful (T-D-5-01 + T-D-5-02 are real codification-correctness risks).
- [x] **Plan filename matches the user-specified write path** — `.planning/phases/stage-f1-knowledge-graph-auth-wave-d/D-5-d078-decision-entry-PLAN.md` matches sibling convention (Wave-A: `A-1-d035-cleanup-PLAN.md`; Wave-C: `C-1-public-users-retirement-PLAN.md`). The user's path is authoritative; GSD standard `{NN}-{NN}-PLAN.md` does NOT apply for this project per existing sibling phases.
- [x] **Wave-D execution order honored** — D-5 executes FIRST per nwrp121 step 4 (decision exists before code references it). Frontmatter `execute_order_within_wave: 1` documents this.
- [x] **Wave-B gate satisfied** — Plan D-5 SUMMARY (authored at execute time) will note "D-078 entry committed to MASTER-PLAN.md" satisfying the Wave-B gate item per nwrp121 (Wave-D EXPANDED-SCOPE §Wave-B gate).
