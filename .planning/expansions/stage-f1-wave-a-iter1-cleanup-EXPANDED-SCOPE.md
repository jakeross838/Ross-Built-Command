# Expanded scope — stage-f1-wave-a-iter1-cleanup

**Status:** APPROVED 2026-05-19 (per nwrp176 Jake review of nwrp175 path-(a) authored artifact; dispatch authorized per nwrp174).
**Generated:** 2026-05-19 (post-hoc artifact authoring per nwrp175 path-a)
**Phase scope:** Single-plan cleanup wave (Wave-A iter-1 deferred items per MED-WA-1 + Supabase advisor lints).
**Plan file:** `.planning/phases/stage-f1-wave-a-iter1-cleanup/WA-iter1-cleanup-PLAN.md` (authored 2026-05-15 NIGHT as weekend Deliverable #5 per nwrp165 §37-42).

> This artifact was authored post-hoc per nwrp175 path-(a) to satisfy nightwork-preflight Check 1 + Check 2 honestly (without `--no-verify` / `--skip-preflight` bypass per Rule 8). The PLAN body at the path above is the authoring source of truth; this EXPANDED-SCOPE is a lift of the PLAN's §1 Goal + §2 Why now / dependencies + §6 Threat model + §7 Rollback plan sections, restructured into the standard EXPANDED-SCOPE shape. No content is invented — every section traces to PLAN body.

---

## Stated scope (lifted from nwrp165 §37-42 + PLAN §1)

Wave-A iter-1 surfaced three deferred security-hardening items (MED-WA-1 per `.planning/phases/stage-f1-knowledge-graph-auth-wave-a/GATE-A-HALT.md:122`) that did NOT ship in Wave-A scope. Supabase advisor confirms the same items via security-lint scan run 2026-05-15 NIGHT (per PLAN §1 inventory). This phase closes those items in a single atomic migration.

## 1. Mapped entities and workflows

### New entities introduced by this slice

None. This is a security-hardening sweep on EXISTING functions + extensions. Zero schema-level entity changes.

### Existing entities touched

| Entity | Plan section | Change |
|---|---|---|
| 8 functions with `function_search_path_mutable` lint | §A | Add explicit `SET search_path = <schema-list>, pg_temp` clause per function definition (mirrors migration 00034 canonical pattern). Function bodies remain unchanged. |
| 5 `trg_pricing_history_from_*` trigger functions (TRIGGER-INTERNAL, NOT RPC) | §B | `REVOKE EXECUTE ... FROM anon, authenticated`. Trigger fire context (table-owner role) unaffected. |
| 2 `create_default_*` seed-default functions (org-create-time, NOT end-user RPC) | §B | Same REVOKE EXECUTE pattern. |
| `pg_trgm` extension (currently in `public` schema) | §C | `ALTER EXTENSION pg_trgm SET SCHEMA extensions;` per Supabase canonical pattern. |
| `vector` extension (currently in `public` schema) | §C | `ALTER EXTENSION vector SET SCHEMA extensions;` per same pattern. |
| `postgres` database search_path | §C | `ALTER DATABASE postgres SET search_path TO "$user", public, extensions;` (keeps existing operator-class references resolving post-extension-move). |

### Workflows touched

None at the user-workflow layer. All changes are Postgres-side security-hardening (function definitions, role grants, extension schema location). Zero UI surfaces, zero API route changes, zero auth boundary changes (the REVOKE EXECUTE pattern is on trigger-internal functions that already had no legitimate caller-role use case).

## 2. Prerequisite gaps

What MUST exist before this phase can ship.

| # | Gap | Source | Blocking? |
|---|---|---|---|
| 1 | Wave-A iter-1 (Plans A-1..A-4) shipped | RESOLVED 2026-05-12 + migrations applied 2026-05-13 per Wave-A GATE-A-HALT.md | — |
| 2 | Slice-1 GATE 2 HALT closed (Q-W6 sequencing rationale: cleanup ships AFTER Slice-1 closes, BEFORE Slice-2 plan-review iter-1) | RESOLVED 2026-05-19 (B-1b shipped at `4144dc7`; ship artifacts at `e084da4`) | — |
| 3 | Migration numbering — next available migration number | 00102 (post-00101 from Slice-1 B-1a-bis); confirmed via PLAN §4 files_modified declaration | — |
| 4 | Supabase MCP `execute_sql` + `apply_migration` connection active | Live MCP session per Slice-1 dispatch chain | — |
| 5 | No third-party service dependencies (no Resend / Stripe / Anthropic / Inngest touchpoints) | PLAN §6 confirms scope is pure DB security hardening | — |

**No blocking prerequisites remain.** All 5 prereqs satisfied at HEAD `e084da4` (post-Slice-1 ship).

## 3. Dependent-soon gaps

What's likely needed shortly after — design for it now.

| # | Gap | Likely next slice / wave | Design implication |
|---|---|---|---|
| 1 | Slice-2 B-3 SECURITY DEFINER trigger function (per Slice-2 Q1) inherits canonical search_path convention | Wave-B Slice-2 B-3 | This cleanup wave's `SET search_path = public, pg_temp` pattern (mirroring migration 00034) becomes the canonical inheritance pattern for B-3 trigger authoring. Establishes precedent before B-3 plan-author dispatches. |
| 2 | Slice-2 plan-review iter-1 inherits clean advisor lint baseline | Wave-B Slice-2 | After this cleanup ships, `mcp__supabase__get_advisors security` returns ZERO `function_search_path_mutable` / `extension_in_public` lints. Plan-review iter-1 advisor checks for Slice-2 plans have clean baseline (no MED-WA-1 noise drowning out genuinely-new lints from B-2..B-7 surfaces). |
| 3 | F2 employees + role_definitions registry consumers of `create_default_*` functions | F2 (canonical phase) | The 2 REVOKEd `create_default_*` functions are seed-default functions called once at org-create-time. F2's role-definitions extension may add new `create_default_*` functions — the same REVOKE EXECUTE pattern applies by inheritance. |

## 4. Cross-cutting checklist

| Concern | Status | Rationale |
|---|---|---|
| Audit logging | N/A | No state mutations, no entity touched at row layer. Migration apply itself doesn't write activity_log (seed/migration bypass per existing precedent). |
| Permissions | APPLIES (CORE) | §B REVOKE EXECUTE tightens the permission boundary on 7 internal-trigger SECURITY DEFINER functions. Trigger fire context unaffected (table-owner role). |
| Optimistic locking | N/A | No write endpoints, no UI surfaces. |
| Soft-delete + status_history | N/A | No workflow entities touched. |
| Recalculate, don't increment | N/A | No new aggregations. |
| Multi-tenant RLS | N/A | No new RLS policies; no tenant tables touched. |
| Idempotency | APPLIES | Migration 00102 is idempotent — re-applying with same state is no-op per `CREATE OR REPLACE FUNCTION` semantics + `ALTER EXTENSION ... SET SCHEMA` re-apply semantics. Down migration also idempotent. |
| Background jobs | N/A | No async work added. |
| Rate limiting | N/A | No external-facing endpoints. |
| Observability | LIGHT | Migration apply through Supabase MCP should produce clean output; if extension move or function regen surfaces errors, captured via Supabase Studio logs. |
| Data import/export (V.2) | N/A | No new entities; existing import/export shapes unchanged. |
| Document provenance (V.3) | N/A | No document-bearing entities touched. |
| Mobile-friendly | N/A | No UI. |
| Drummond fixtures sufficient | N/A | No fixture data touched. Drummond data unaffected by function-definition changes. |
| CI test gate | APPLIES | Post-apply verification queries (per PLAN §8) confirm: function `proconfig` contains `search_path`; trigger functions have NO `EXECUTE` privilege for anon/authenticated; extensions in `extensions` schema. `get_advisors security` post-apply returns clean (zero `function_search_path_mutable` / `anon_security_definer_function_executable` / `extension_in_public` lints for the targeted entities). |
| Error handling for partial failures | APPLIES | Migration 00102 wraps all 3 sections in single transaction; either all 3 apply or none. Trigger-fire test in AC-WA-iter1-05 verifies post-apply that trigger context still fires correctly under REVOKE. |
| Graceful degradation | N/A | No external dependencies. |
| Wave-B prereq #12 smoke gate maintenance | APPLIES (INHERITED) | Smoke harness must continue passing ≤2 failures matching TD-WE-03 baseline post-cleanup. PLAN `requires_smoke: false` because pure DB security hardening doesn't affect UI/routes; per nwrp174 explicit re-affirmation, smoke isn't required for this plan. If post-apply check surfaces regression, halt + surface. |
| Downstream-consumer-sweep (`.planning/lessons.md` 2026-05-15) | APPLIES (INHERITED) | PLAN §3 documents the sweep: §A (8 search_path functions) confirmed zero application code call-site changes needed; §B (7 REVOKE candidates) confirmed zero `rpc('trg_pricing_history_*')` or `rpc('create_default_*')` calls in src/ via grep; §C (extension move) requires `gin_trgm_ops` / `vector_l2_ops` etc. references to resolve via updated database search_path (set in same migration). |
| Rules 1-6 (Workflow posture) | APPLIES | Rule 1: schema verification (migration applies cleanly) + runtime verification (post-apply queries) per PLAN §8. Rule 2: N/A (no PostgREST FKs). Rule 3: post-apply representative queries verify state. Rule 4: smoke not required per `requires_smoke: false`. Rule 5: single plan; no parallel dispatch. Rule 6: pre-flight collision check confirmed zero blocking precursors. |
| Plan-review iter-1 cross-reviewer factual disagreement HALT (nwrp118) | APPLIES | If 4 locked QA reviewers (per nwrp174) surface contradictory claims, halt for Jake per Rule 9. |

## 5. Construction-domain checklist

| Domain consideration | Applies? | Rationale |
|---|---|---|
| Drummond as reference job | N/A | No fixture data touched. |
| Field mistakes become permanent QC entries | N/A | Wave 2 scope. |
| Draw requests link to punchlist | N/A | Wave 2 scope. |
| Invoice review is gold standard UI | N/A | No UI. |
| Stone blue palette + Slate type + logo top-left | N/A | No UI. |
| Stored aggregates require rationale comments | N/A | No new aggregates. |
| Cost-plus open-book | N/A | No customer-facing surface. |
| Florida-specific | N/A | No FL-specific fields. |
| GC fee semantics | N/A | Not touched. |
| Lien waivers / FL release types | N/A | Not touched. |
| Retainage | N/A | Not in scope. |
| Multi-currency | N/A | FL-only. |
| Owner notification cadence | N/A | Not touched. |
| Compliance retention | N/A | No retention-class entity touched. |

## 6. Targeted questions for Jake

All Q-W6 sub-questions already resolved per nwrp174:

1. **7-function REVOKE list (5 trg_pricing_history_* + 2 create_default_*)?** → APPROVED authored state per nwrp169.
2. **Extension schema choice (`extensions` vs `nightwork_extensions`)?** → `extensions` per Supabase canonical (PLAN §C).
3. **`ALTER DATABASE postgres SET search_path` acceptable?** → YES per nwrp169 + Supabase canonical pattern (PLAN §C).
4. **Dispatch sequencing?** → AFTER Slice-1 GATE 2 HALT closes (resolved 2026-05-19), BEFORE Slice-2 plan-review iter-1 (per Q-W6 rationale). Authorized for dispatch 2026-05-19 per nwrp174.

No outstanding questions blocking dispatch.

## 7. Recommended scope expansion

**Stated:** Wave-A iter-1 deferred MED-WA-1 cleanup — 8 functions search_path + 7 REVOKE EXECUTE + 2 extension schema moves. Single atomic migration 00102.

**Recommended phase scope:** matches stated (no expansion). Per PLAN's explicit scope-boundary discipline:

- **In scope:** the 3 buckets enumerated above.
- **Out of scope:**
  - PII fence updates (D-078/D-079 scope, not Wave-A iter-1)
  - New SECURITY DEFINER functions (B-3 Slice-2 scope)
  - Role granularity changes (F2 scope)
  - New RLS policies (B-3 Slice-2 scope, DEF-WC-1 specifically)
  - Cost-code reseed (B-6 Slice-2 scope)
  - Any non-MED-WA-1 advisor lints

**Acceptance criteria target:** 14 falsifiable items (AC-WA-iter1-01..AC-WA-iter1-14) per PLAN §5.

## 8. Risks and assumptions

| Risk | Mitigation |
|---|---|
| `CREATE OR REPLACE FUNCTION` with body fetched from `pg_get_functiondef` produces a body subtly different from current (e.g., loses comments) | Executor must preserve body verbatim; PLAN §A explicitly documents this. Post-apply representative-trigger-fire test (AC-WA-iter1-05) verifies behavior preserved. |
| REVOKE EXECUTE breaks trigger fire | Trigger context fires as table-owner role, NOT caller role. Verified pattern across 30+ migrations. Post-apply test (AC-WA-iter1-05) inserts representative row + checks trigger-effect row exists. |
| Extension move breaks existing indexes using `gin_trgm_ops` or `vector_*_ops` | `ALTER DATABASE postgres SET search_path TO "$user", public, extensions;` keeps existing references resolving. Pre-apply sweep (PLAN §C "Critical sweep") enumerates affected indexes; post-apply EXPLAIN ANALYZE verification. |
| Down migration partial-revert | Single transaction wrapping; all-or-nothing apply/revert. PLAN §7 rollback plan documents per-section reverse. |
| Smoke harness regression post-apply | `requires_smoke: false` per PLAN; if Jake authorizes smoke run anyway, baseline 11/13 expected (TD-WE-03 set unchanged). |

**Assumptions:**

1. Supabase MCP connection remains active throughout execute.
2. The 8 functions' current bodies (per `pg_get_functiondef`) are stable + non-controversial.
3. No new schema changes have been applied to the live Supabase project between weekend authoring (2026-05-15 NIGHT) and dispatch time (2026-05-19) — verified at HEAD `e084da4` (no migrations 00102+ exist yet).

---

## 9. Hand-off

After Jake approves this artifact (or amends — but content is a lift from PLAN body, so amendment is unlikely):

1. `/nightwork-auto-setup stage-f1-wave-a-iter1-cleanup` produces SETUP-COMPLETE.md (or it's authored inline per nwrp175 path-a; no MANUAL items).
2. `/nightwork-preflight` re-runs; Checks 1+2 now PASS.
3. Jake authorizes `/nx stage-f1-wave-a-iter1-cleanup`.
4. Plan executes per `.planning/phases/stage-f1-wave-a-iter1-cleanup/WA-iter1-cleanup-PLAN.md` body.
5. /nightwork-qa with locked KEEP set per nwrp174 §11-13: spec-checker + database-reviewer + custodian + security-reviewer.
6. GATE post-cleanup substantive review per nwrp174 §16.
7. After cleanup ships: per nwrp174 §17, STOP for the night.
