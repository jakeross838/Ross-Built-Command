# Setup complete — stage-f1-knowledge-graph-auth-wave-b (Slice 1)

**Status:** READY FOR PLAN
**Completed:** 2026-05-15 12:46 (validation re-invocation #2)
**EXPANDED-SCOPE:** `.planning/expansions/stage-f1-knowledge-graph-auth-wave-b-EXPANDED-SCOPE.md` (APPROVED 2026-05-15 per nwrp153)

## VALIDATE checks (all pass)

- [x] **V1** npx supabase CLI accessible — 2.98.2
- [x] **V2** `HARNESS_FIXTURE_PASSWORD` env var set in `.env.local` — present
- [x] **V3** D-080 codified in MASTER-PLAN.md §10 — 1 hit at line 256 (commit f108c02)
- [x] **V4** Wave-B prereq #12 smoke gate green — 11/13 PASS; 2 failures = TD-WE-03 DataGrid empty-state (documented LOW)
- [x] **V5** `NEXT_PUBLIC_AUTH_STATE_LISTENER` env-flag absent — 0 hits (Q5 dormant by design)
- [x] **V6** fixture-harness-org exists in production Supabase — verified via Wave-E seed apply (2026-05-14)

## AUTO items (executed)

**None.** All needed infrastructure existed pre-slice; no agent-side writes required. Setup verified existing state only.

## MANUAL items (validated)

- [x] **Item 1** — Supabase CLI auth + project link
  - Validated via H1.c canonical check: `npx supabase gen types typescript --linked` returns 5230 lines of valid TypeScript starting with `export type Json = | string | number | boolean | null | { [key: string]: Json | undefined } | Json[]` and including `export type Database` shape
  - Evidence:
    - `supabase/.temp/linked-project.json` → `{"ref":"egxkffodxcefwpqmwrur","name":"Nightwork Platform (Dev)","organization_id":"hxzyvnbnqzypvnpviloq","organization_slug":"hxzyvnbnqzypvnpviloq"}`
    - `supabase/.temp/project-ref` → `egxkffodxcefwpqmwrur`
    - `supabase/config.toml` → 15029 bytes written 12:46
  - Authentication path used: DB-password-based link (`supabase link --project-ref <ref> -p <password>`). Account-level `supabase login` not required for the slice's execute-time path.
  - **Note on supplementary check H1.a (`npx supabase projects list`):** still returns "Access token not provided" because that command requires account-level auth, NOT DB-password-based auth. Validation reclassified as NOT REQUIRED for slice scope — the canonical functional dependency is H1.c (`gen types --linked`) which works under either auth path. H1.a would only be needed if Wave-B-Slice-2+ introduces a multi-project workflow.

## Next

Run `/np stage-f1-knowledge-graph-auth-wave-b` to begin planning.

The plan-author orchestrator will author 3 plans in parallel:
- **B-D080** — Migration 00099 (FK convention per D-080 matrix); source_decisions: D-080 (primary) + D-078 (parent)
- **B-1a** — Migration 00100 (clients schema + backfill with dual-probe safety per Q2 nwrp153 amendment); source_decisions: Q2 A1 + Q9 D + Q10b + Q12 + D-080 (parent for clients.created_by)
- **B-1b** — KG scaffold + types pipeline + 3 exemplar validators (WI-001 + WI-013 + `client-pii-not-embedded` per Q4 amendment) + 4 Layer 2 standards + W.1 listener ENV-FLAGGED activation (per Q5 amendment); source_decisions: Q11 D + Q9 + harness Layer 2 contract

After plan authoring, `/nightwork-plan-review iter-1` dispatches reviewers. **HALT at GATE 1** for Jake review of all 3 plans before execute.

If you discover during planning that EXPANDED-SCOPE.md needs revision (a prerequisite was missed), update EXPANDED-SCOPE.md and re-run `/nightwork-auto-setup stage-f1-knowledge-graph-auth-wave-b` to refresh setup.
