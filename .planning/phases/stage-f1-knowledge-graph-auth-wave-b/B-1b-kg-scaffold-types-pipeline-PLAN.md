---
phase: stage-f1-knowledge-graph-auth-wave-b
plan: B-1b
plan-name: kg-scaffold-types-pipeline
type: execute
wave: B-Slice-1
depends_on: [B-1a]
autonomous: true
halt_after: true
requires_smoke: true
threat_model_severity: medium
status: AUTHORED
authored: 2026-05-15
authored_by: gsd-planner subagent (claude-opus-4-7[1m])
authorization: nwrp152 dispatch + nwrp153 EXPANDED-SCOPE approval
source_decisions:
  - "Q11 D (umbrella; hybrid schema-in-DB + types-generated + validators-in-app)"
  - "Q9 D (umbrella; fixture coverage contract — fixture-coverage.ts Layer 2 standard enforces)"
  - "Q3 nwrp153 (validator interface async; uniform Promise<ValidatorResult>)"
  - "Q4 nwrp153 (3rd exemplar validator: client-pii-not-embedded; PII fence pattern)"
  - "Q5 nwrp153 (W.1 listener ENV-FLAGGED activation; unflag deferred to Slice-2)"
  - "Q6 nwrp153 (jobs.pm_id consumer refactor DEFERRED to Wave 1.1-Lite; B-1b does NOT touch consumers)"
  - "D-078 / D-079 / D-080 (PII fence convention for client-pii-not-embedded validator)"
  - "1.5c-vh W.1 carry-forward (existing env-gated setSession in client.ts since 2026-05-11; this slice adds the listener)"
requirements: []
files_modified:
  - src/lib/knowledge-graph/README.md
  - src/lib/knowledge-graph/index.ts
  - src/lib/knowledge-graph/types.ts
  - src/lib/knowledge-graph/validators/index.ts
  - src/lib/knowledge-graph/validators/wi-001-inline-budget-context.ts
  - src/lib/knowledge-graph/validators/wi-013-multi-job-allocation.ts
  - src/lib/knowledge-graph/validators/client-pii-not-embedded.ts
  - src/lib/knowledge-graph/queries/index.ts
  - __tests__/validators/wi-001.test.ts
  - __tests__/validators/wi-013.test.ts
  - __tests__/validators/client-pii-not-embedded.test.ts
  - src/lib/types/database.types.ts
  - src/lib/types/invoice.ts
  - src/lib/types/index.ts
  - .claude/hooks/nightwork-type-regen.sh
  - CLAUDE.md
  - src/lib/verification/layer2/standards/integrity/audit-conservation.ts
  - src/lib/verification/layer2/standards/integrity/rls-coverage.ts
  - src/lib/verification/layer2/standards/integrity/role-permission-integrity.ts
  - src/lib/verification/layer2/standards/integrity/fixture-coverage.ts
  - src/lib/verification/layer2/standards/integrity/self-test-helpers.ts
  - src/lib/verification/layer2/index.ts
  - .planning/verification/standards/integrity/audit-conservation.json
  - .planning/verification/standards/integrity/rls-coverage.json
  - .planning/verification/standards/integrity/role-permission-integrity.json
  - .planning/verification/standards/integrity/fixture-coverage.json
  - src/hooks/use-current-role.ts
  - src/lib/supabase/client.ts
  - .env.local.example
  - .planning/tech-debt/TD-WB-LISTENER-UNFLAG.md
files_referenced:
  - .planning/architecture/WORKFLOW-INTELLIGENCE.md (§WI-001 + §WI-013)
  - .planning/architecture/ROLES-CATALOG.md (role-permission-integrity standard data source)
  - .planning/architecture/ENTITY-INVENTORY.md (fixture-coverage standard scope)
  - .planning/MASTER-PLAN.md (D-078 + D-079 + D-080)
  - src/lib/verification/README.md + layer2/README.md
  - src/lib/verification/layer2/standards/conservation/money-line-items-sum.ts (SKIP-clean pattern)
  - .planning/phases/stage-1.5c-verification-harness/ (W.1 bridge context)
  - .planning/lessons.md 2026-05-15 (downstream-consumer-sweep discipline)
sequence:
  before: GATE 2 HALT for Jake review (per nwrp152 — validator structure + harness extensions)
  after: B-1a (types generation needs clients table; harness fixture-coverage standard validates B-1a fixture row)
  parallel_authoring_ok: true
  parallel_execute_ok: false
acceptance-criteria-target: 13 falsifiable items (AC-B1b-01..AC-B1b-13)
---

# Plan B-1b — KG scaffold + types pipeline + foundational harness extensions + W.1 listener env-flagged activation

## 1. Goal

Establish the application-layer half of F1's **hybrid knowledge-graph architecture** (umbrella Q11 D — *schema in DB, types auto-generated, validators in app*) and the foundational Layer 2 harness assertions that enforce it. Specifically:

1. Stand up `src/lib/knowledge-graph/` as the canonical home for cross-entity validators + queries. Ship the **validator interface contract** (async `Promise<ValidatorResult>` per Q3) plus 3 exemplars that exercise structurally distinct patterns: cross-entity FK lookup (WI-001), multi-row aggregation (WI-013), and schema-shape policy enforcement (`client-pii-not-embedded` per Q4).
2. Stand up the **types pipeline**: run `supabase gen types typescript --linked` to produce `src/lib/types/database.types.ts`; refactor `src/lib/types/invoice.ts` to export DB-row mirror types alongside the existing AI-parse types; add a pre-commit hook that regenerates the file when migrations stage; codify the type-generation rule in CLAUDE.md.
3. Stand up the 4 **foundational Layer 2 standards** in a new `integrity/` domain (audit-conservation, rls-coverage, role-permission-integrity, fixture-coverage). Mirror the existing `conservation/money-line-items-sum.ts` *SKIP-cleanly-without-introspection* posture (Plan 3 of 1.5c-vh precedent) so they can ship now and switch to FAIL-on-violation when the `/api/_introspect/*` surface lands in a later wave. Each standard has a self-test that exercises the assertion against fixture-harness-org without requiring the introspection surface (uses Supabase service-role client for direct DB introspection).
4. Activate the **W.1 `useCurrentRole` `onAuthStateChange` listener** behind a new env flag `NEXT_PUBLIC_AUTH_STATE_LISTENER` (per Q5 amendment). The listener wiring ships in this slice; production env-var addition (Vercel Production + Preview) is deferred to Slice-2 follow-up after an observation window. TD entry documents the unflag path.

The slice does **NOT** ship any new bulk validator implementations (F2-F5 ramps that), does **NOT** refactor any `jobs.pm_id` consumer (per Q6 — DEFERRED to Wave 1.1-Lite), and does **NOT** introduce any new UI surface or route.

## 2. Why now / dependencies

- **Depends on B-1a applied:** `supabase gen types typescript --linked` reads the live schema; the new `clients` table from B-1a migration 00100 must exist in the linked Supabase project before types generation produces an `Tables: { clients: ... }` entry. The fixture-coverage Layer 2 standard's self-test specifically asserts that `clients` has ≥1 fixture row in fixture-harness-org — which only succeeds if B-1a's fixture INSERT has run.
- **Depends on B-D080 applied (via B-1a chain):** `clients.created_by` references `auth.users(id)` per D-080 convention; B-1a inherits this from creation. The role-permission-integrity standard cross-references ROLES-CATALOG.md against pg_policies, which doesn't depend on B-D080 directly but reads the same schema the FK constraints live in.
- **Hybrid pattern lock-in:** F2-F5 will write 35+ validators against the interface this plan establishes. Locking the contract now (async `Promise<ValidatorResult>`, explicit `ValidatorContext` shape) prevents thrash later.
- **W.1 listener carry-forward:** the env-gated `setSession` bridge has been dormant in production code since 2026-05-11 (1.5c-vh ship). Activating the listener completes the W.1 bridge so role-aware UI rendering invalidates correctly when admin grants/revokes roles mid-session. Env-flag posture (Q5) keeps production blast radius zero on slice ship; activation comes via env-var add, not redeploy.

## 3. Pre-flight downstream-consumer-sweep

Per `.planning/lessons.md` 2026-05-15 — codified discipline before any plan with potential downstream impact. Sweep results captured at plan-author time (2026-05-15):

### 3.1 W.1 listener activation impact — `useCurrentRole` consumers

Grep: `useCurrentRole` across `src/`

| File | Line | Usage |
|---|---|---|
| `src/hooks/use-current-role.ts` | 18 | Definition (export) |
| `src/components/nav-bar.tsx` | 17, 155 | Import + `const role = useCurrentRole()` for 8-section nav role-aware rendering |
| `src/app/invoices/[id]/page.tsx` | 20, 123 | Import + `const role = useCurrentRole()` for role-gated invoice review actions |
| `src/lib/verification/_browser.ts` | 284, 289 | Documentation-only comment reference (Y.1.B harness context) |
| `src/lib/supabase/client.ts` | 20, 39 | Documentation-only comment reference (W.1 bridge rationale) |

**Conclusion:** 2 runtime consumers (`nav-bar.tsx` + `invoices/[id]/page.tsx`); both pull `role` once via `useEffect` in the hook body. Listener activation adds a SECOND `useEffect` to the hook that re-fires `setRole` on auth state changes. In env-flag-off mode (the slice ship posture), the listener is wired but no-ops via early return — both consumers continue current behavior. In env-flag-on mode (Slice-2 follow-up), both consumers receive role updates on `SIGNED_OUT`/`TOKEN_REFRESHED`/`USER_UPDATED` events. Smoke harness covers 13 routes including `/today` (nav-bar consumer) and 1 invoice detail variant — listener wiring regression is caught structurally.

### 3.2 `src/lib/types/invoice.ts` refactor impact — `ParsedInvoice` / `ParseResult` consumers

Grep: `from\s+["']@/lib/types/invoice["']` across `src/`

| File | Imported symbols |
|---|---|
| `src/lib/invoices/save.ts` | `ParsedInvoice` |
| `src/lib/invoices/parse-file.ts` | `ParsedInvoice` |
| `src/lib/invoices/bulk-import.ts` | `ParsedInvoice` |
| `src/lib/claude/parse-invoice.ts` | `ParsedInvoice` |
| `src/components/invoice-upload-content.tsx` | `ParseResult`, `ParsedInvoice` |

**Critical finding for refactor design:** `ParsedInvoice` (and `ParseResult`) is the **Claude Vision AI-parse output type** — a wire-format JSON shape returned from the Anthropic API BEFORE the row is persisted. It does NOT correspond 1:1 to `Database['public']['Tables']['invoices']['Row']`. Notably:

- `ParsedInvoice.total_amount` is **dollars (number)** per the parse contract; `invoices.total_amount` row column is **cents (integer)** per the DB schema.
- `ParsedInvoice.confidence_details` is a structured object with fixed field names; `invoices.confidence_details` is JSONB.
- `ParsedInvoice` carries `flags`, `cost_code_suggestion`, `job_suggestion`, `document_type` — none of which are stored on the row directly (some land in JSONB columns).

**Refactor design (locked):** `src/lib/types/invoice.ts` retains all existing exports unchanged (`ParsedInvoice`, `ParseResult`, `ConfidenceDetails`, `CostCodeSuggestion`, `JobSuggestion`, `LineItemCostCodeSuggestion`, `ParsedLineItem`). A NEW barrel file `src/lib/types/index.ts` re-exports both the AI-parse types and the DB-row mirror types (`InvoiceRow`, `InvoiceInsert`, `InvoiceUpdate`) derived from `database.types.ts`. Consumers that currently import from `@/lib/types/invoice` continue to compile unchanged. New consumers reach for the DB types via `@/lib/types` (or `@/lib/types/database.types` for full Database<> generic access). Zero consumer break.

### 3.3 `database.types.ts` consumer baseline

Grep: `database\.types` across `src/`

**Result:** zero matches in `src/`. File does not exist yet; no consumers. Refactor is greenfield within `src/lib/types/`.

### 3.4 Smoke harness route table impact

Grep: `^const ROUTES` and route count in `scripts/wave-d-smoke.ts`

**Result:** 13 routes in `wave-d-smoke.ts:165`. B-1b changes NO routes, NO JSX, NO page H1s. Smoke harness post-execute should remain at the Wave-E baseline (11/13 PASS matching TD-WE-03 set, per Wave-B prereq #12). The W.1 listener activation in env-flag-off mode is a no-op for the smoke harness's auth state (which uses the W.1 `setSession` bridge, not the listener). N/A — no route changes.

### 3.5 Sweep verdict

- 2 runtime consumers of `useCurrentRole` — listener activation impact contained; env-flag-off no-op preserves current behavior; smoke covers both consumers' surfaces.
- 5 consumers of `ParsedInvoice` / `ParseResult` — refactor preserves existing export shape exactly; zero break risk.
- 0 consumers of `database.types.ts` — greenfield.
- 0 route changes — smoke route table unchanged.

**No HALT triggered.** Sweep results attached to plan body per Rule 6(a) precedent.

## 4. Pre-flight complexity check (HALT GATE per nwrp152)

Per nwrp152: "HALT if plan-authoring surfaces >2.5 days work (fallback per umbrella to standalone Wave-B0 standalone harness extension wave)."

Estimate (assume 8h workday = 20h budget for 2.5 days):

| Task block | Estimate (hours) | Rationale |
|---|---|---|
| KG scaffold (README + index + types + validators registry + queries placeholder) | 1.5h | Mostly file scaffolding; types-only |
| 3 exemplar validators (WI-001 + WI-013 + client-pii-not-embedded) | 3.5h | WI-001 / WI-013 distill rules from WORKFLOW-INTELLIGENCE.md §WI-001 + §WI-013; client-pii-not-embedded does grep-based PostgREST hint scan |
| 3 unit tests (one per validator) | 2h | Demonstrates contract; uses fixture-harness-org session |
| Types pipeline: run `supabase gen types`, commit output | 0.5h | Single CLI invocation + git add |
| `src/lib/types/invoice.ts` refactor (preserve existing exports + add DB row types via index.ts barrel) | 1.5h | Sweep §3.2 confirms zero break |
| `npx tsc --noEmit` typecheck pass | 0.5h | Verification step |
| Pre-commit hook `nightwork-type-regen.sh` (detect migration changes → regenerate + stage) | 2h | Bash script with `git diff --cached`, supabase CLI call, conditional re-stage logic |
| CLAUDE.md type-generation rule addition | 0.5h | Single bullet in Development Rules |
| 4 Layer 2 standards in `integrity/` domain | 5h | Mirror `conservation/money-line-items-sum.ts` SKIP-clean pattern; assertions implemented via service-role direct DB introspection (no `/api/_introspect/*` dependency) |
| 4 JSON rule files in `.planning/verification/standards/integrity/` | 0.5h | Match `_schema.json` shape |
| `layer2/index.ts` registration imports | 0.25h | 4 side-effect imports |
| W.1 listener activation in `use-current-role.ts` (env-gated `onAuthStateChange`) | 1h | Single useEffect addition; cancel-on-unmount; env-flag short-circuit |
| `.env.local.example` extension with `NEXT_PUBLIC_AUTH_STATE_LISTENER` | 0.25h | One-liner addition + comment |
| TD entry `.planning/tech-debt/TD-WB-LISTENER-UNFLAG.md` | 0.5h | Documents unflag path for Slice-2 |
| Smoke run post-execute + verification | 0.5h | npx tsx scripts/wave-d-smoke.ts against preview |
| Plan-author glue (frontmatter, ACs, verification commands, rollback notes) | 1h | Already amortized |
| Buffer for typecheck/lint fixes + hook-bash edge cases | 1.5h | Contingency |

**TOTAL: 22.0h ≈ 2.75 days.**

**This EXCEEDS the 2.5-day HALT threshold by ~0.25 days (2 hours).**

### Complexity HALT assessment

The estimate sits at the boundary. Three observations inform the no-HALT recommendation:

1. **The Layer 2 standards SKIP-clean pattern bounds the lower edge tightly.** The 5h estimate assumes mirroring the existing `conservation/money-line-items-sum.ts` posture — assertions HEAD-probe their data source, SKIP cleanly if unavailable, FAIL only on confirmed violation. The self-tests use the Supabase service-role client to introspect `pg_policies` / `pg_tables` / `auth.users` / `org_members` directly (no `/api/_introspect/*` dependency). This is a well-trodden pattern; the 5h is realistic, not optimistic.

2. **The W.1 listener wiring is structurally tiny.** ~30 lines of code total (one useEffect block in `use-current-role.ts` with an env-flag short-circuit + subscription cleanup). The 1h estimate covers wiring + testing the env-flag-off no-op behavior. Larger risk is the pre-commit hook (2h) where bash edge cases with `git diff --cached` parsing and idempotent re-staging can surprise.

3. **Buffer absorbed.** The 1.5h buffer in the table covers typecheck regressions, ESLint fixes, and bash-hook iteration. If buffer is fully consumed, total = 22h; if buffer holds, total = 20.5h.

**Recommended posture: PROCEED with explicit margin warning.** The plan ships at the 2.5-day boundary; one scope-trim option exists if execute surfaces unexpected friction:

- **Defer 1 of the 4 Layer 2 standards to Slice-2** — `fixture-coverage.ts` is the natural deferral candidate because it specifically asserts B-1a's fixture row exists, which is more naturally validated in B-1a's own acceptance criteria. Deferring saves ~1.25h and brings the estimate to 20.75h ≈ 2.6 days (still tight, still acceptable).

**Plan-author final assessment: NO HALT.** Proceed to execute with the 4-standards posture; trigger Slice-2 fixture-coverage deferral if execute friction emerges. Document the deferral option in the plan body (§9) so the executor has a clear escape valve without re-planning.

If executor finds the assertion logic needs substantially more infrastructure than the SKIP-clean pattern accommodates (e.g., a full static-analysis framework for the role-permission-integrity check), the executor MUST HALT and surface to Jake — that is the Wave-B0 fallback condition per nwrp152.

## 5. Implementation tasks

### Task 1 — KG scaffold + validator interface contract + 3 exemplars (~6h)

1. Create `src/lib/knowledge-graph/types.ts` — exports `ValidatorContext`, `ValidatorResult`, `Validator<T>` types per §6 contract below.
2. Create `src/lib/knowledge-graph/README.md` — entry-point doc covering:
   - Purpose (cross-entity validators + queries per umbrella Q11 D)
   - Directory layout
   - How to add a new validator (file + register + test + barrel import)
   - How to add a new query (placeholder section; F2-F5 expands)
   - Validator naming conventions (`wi-NNN-<kebab-name>.ts` for WORKFLOW-INTELLIGENCE-derived validators; `<domain>-<noun>-<test>.ts` for non-WI validators per existing harness convention)
   - Cross-reference to WORKFLOW-INTELLIGENCE.md §WI-XXX entries for the 2 base exemplars
   - Cross-reference to D-078 / D-079 / D-080 for the PII fence validator
   - F2-F5 expansion path note (35+ validators arriving against this contract; do NOT break the interface without explicit cross-wave revisit)
3. Create `src/lib/knowledge-graph/validators/index.ts` — validator registry (named exports + a typed `validatorRegistry` Map for runtime lookup).
4. Author `src/lib/knowledge-graph/validators/wi-001-inline-budget-context.ts` per §7.1 sketch.
5. Author `src/lib/knowledge-graph/validators/wi-013-multi-job-allocation.ts` per §7.2 sketch.
6. Author `src/lib/knowledge-graph/validators/client-pii-not-embedded.ts` per §7.3 sketch.
7. Create `src/lib/knowledge-graph/queries/index.ts` — placeholder export (`export const queryRegistry = {}` + comment block documenting F2-F5 expansion path).
8. Create `src/lib/knowledge-graph/index.ts` — barrel re-exporting types + validatorRegistry + queryRegistry.
9. Create `__tests__/validators/wi-001.test.ts` per §7.1 test sketch.
10. Create `__tests__/validators/wi-013.test.ts` per §7.2 test sketch.
11. Create `__tests__/validators/client-pii-not-embedded.test.ts` per §7.3 test sketch.
12. Run `npm test -- --testPathPattern='validators/'` — all 3 test files PASS (or, per project convention, run via project's existing test command if `npm test` is not configured for these paths; verify the test infrastructure exists OR ship the tests in the existing test framework's convention).

### Task 2 — Types pipeline + invoice.ts refactor (~3h)

1. Verify `supabase --version` returns a valid version (≥1.50) and `supabase status` shows linked project pointing at the expected project ID. HALT if not linked — that is a prereq #10 verification per umbrella §2.
2. Run `supabase gen types typescript --linked > src/lib/types/database.types.ts` from repo root. Verify output:
   - File header includes generation timestamp
   - `export interface Database` exists with `public.Tables.clients` entry (proves B-1a applied)
   - File ends with newline
3. Add file header banner comment (BEFORE the generated content — note that this comment is preserved across regenerations because the `supabase gen types` command outputs to stdout and the shell redirect is the operative write; if header preservation requires a wrapper script, instead place the banner in `database.types.ts.header` and concatenate). Reference comment text in §8.
4. Create `src/lib/types/index.ts` barrel — re-exports AI-parse types from `./invoice` + DB row types derived from `./database.types`:
   ```typescript
   export * from "./invoice";
   export type {
     Database,
   } from "./database.types";
   export type Tables<T extends keyof Database["public"]["Tables"]> =
     Database["public"]["Tables"][T]["Row"];
   export type InsertTables<T extends keyof Database["public"]["Tables"]> =
     Database["public"]["Tables"][T]["Insert"];
   export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
     Database["public"]["Tables"][T]["Update"];
   export type InvoiceRow = Tables<"invoices">;
   export type InvoiceInsert = InsertTables<"invoices">;
   export type InvoiceUpdate = UpdateTables<"invoices">;
   export type ClientRow = Tables<"clients">;
   export type ClientInsert = InsertTables<"clients">;
   export type ClientUpdate = UpdateTables<"clients">;
   ```
5. Run `npx tsc --noEmit` — verify zero new typecheck errors introduced. Existing baseline error count (if any) must match.
6. Run `npm run build` — verify build passes per CLAUDE.md Development Rules ("Run `npm run build` before committing").

### Task 3 — Pre-commit hook for type regeneration (~2h)

1. Create `.claude/hooks/nightwork-type-regen.sh` per §9 sketch. Hook logic:
   - Activates only on `git commit` commands (read tool_input.command from stdin; mirror `nightwork-pre-commit.sh:18-30` parsing)
   - Skip if no migration files in staged diff (`git diff --cached --name-only | grep -qE '^supabase/migrations/'` returns non-zero)
   - When migration files ARE staged, run `supabase gen types typescript --linked > src/lib/types/database.types.ts`
   - Run `git diff --quiet src/lib/types/database.types.ts` — if exit code 0 (no diff), regen produced no changes; pass through to commit
   - If exit code 1 (diff present), the regen produced changes that weren't staged → block commit with reason ("Migrations staged but database.types.ts has uncommitted regen output. Run `git add src/lib/types/database.types.ts && git commit ...` to include.")
   - Bypass via `--no-verify` per existing hook conventions (per CLAUDE.md "Never `--no-verify` without Jake's explicit authorization" — bypass is logged but allowed; gate enforcement happens at code-review time)
2. The hook ONLY blocks commits where migrations are staged but the regenerated `database.types.ts` is NOT staged. It does NOT auto-stage regenerated files (auto-modification of staged files mid-commit is a footgun pattern). Developer sees the block reason, runs `git add` for the regen file, commits again.
3. Wire the hook into the project's PreToolUse Bash hook chain — likely by adding it to whatever orchestration calls `nightwork-pre-commit.sh` (or running both as siblings on the same trigger). Investigate at execute time: if `.claude/settings.json` has a hook config, append; if hooks run via a single dispatch script, extend that.
4. **NOTE on hook surface coverage:** the existing `nightwork-pre-commit.sh:62-65` documents that the Claude-Bash-tool hook only fires on Claude-initiated commits. The `.githooks/pre-commit` shared hook fires on ALL commits regardless of tool but currently only enforces the Drummond grep gate. Decision deferred to executor: either (a) extend `.githooks/pre-commit` to also run type-regen check OR (b) accept that type-regen only fires on Claude commits (matches `nightwork-pre-commit.sh` posture and matches the practical reality that Jake commits from Claude exclusively on this repo). Recommend (b) for slice scope; document in TD entry if the gap matters later.

### Task 4 — CLAUDE.md type-generation rule (~0.5h)

1. Locate `## Development Rules` section in `CLAUDE.md` (lines 256-356 approximately based on existing structure).
2. Add a new bullet near the migration-numbering rule:
   > - **Schema changes regenerate types.** Migrations under `supabase/migrations/` MUST be accompanied by a regenerated `src/lib/types/database.types.ts` in the same commit. Pre-commit hook `.claude/hooks/nightwork-type-regen.sh` blocks commits where migration files are staged but the regen output isn't. Never edit `database.types.ts` by hand — it is generated by `supabase gen types typescript --linked` and any hand-edit is lost on next migration. New code consuming DB row shapes imports from `@/lib/types` (barrel) or `@/lib/types/database.types` directly; the existing `@/lib/types/invoice` AI-parse types remain untouched.

### Task 5 — Foundational Layer 2 standards in `integrity/` domain (~6.5h)

For each of the 4 standards, the pattern is:
- TypeScript module at `src/lib/verification/layer2/standards/integrity/<name>.ts` — registers `verifyFn` via `registerVerifyFn(...)` per `registry.ts` contract
- JSON rule file at `.planning/verification/standards/integrity/<name>.json` matching `_schema.json` (domain: extend the schema enum to include `"integrity"` OR file as `"conservation"` per existing enum — decision: **add `"integrity"` to the schema enum** as the domain for these 4 standards, since they enforce structural invariants rather than money-conservation)
- Side-effect import in `src/lib/verification/layer2/index.ts`
- Self-test: each standard's `verifyFn` includes an early branch that returns PASS when run against fixture-harness-org with known-clean data, providing a non-vacuous signal per iter-1 WARN-2 precedent (see `conservation/self-test-always-pass.ts`)

#### 5.1 `audit-conservation.ts`

Assert: every state-mutating API path writes to `activity_log`. Approach: SKIP-clean when `/api/_introspect/*` introspection unavailable (current state); when available (Wave 1.1+), walks a test scenario that touches each tracked entity type and verifies activity_log row count increments. For slice ship, implementation parallels `conservation/money-line-items-sum.ts`:

```typescript
const auditConservation: VerifyFn = async (ctx) => {
  const introspectUrl = `${ctx.preview_url.replace(/\/$/, "")}/api/_introspect/activity-log/conservation`;
  let available = false;
  try {
    const probe = await fetch(introspectUrl, { method: "HEAD", redirect: "manual" });
    available = probe.status >= 200 && probe.status < 400;
  } catch { available = false; }
  if (!available) {
    return {
      verdict: "SKIP",
      error: `No introspection surface at ${introspectUrl}. Wave 1.1+ adds /api/_introspect/activity-log/conservation; until then audit-conservation SKIPs cleanly.`,
      evidence: introspectUrl,
    };
  }
  // Future: walk activity_log delta for each tracked entity type
  return { verdict: "PASS", evidence: "Introspection surface present but walker not yet implemented (Wave 1.1+)." };
};
```

Domain `integrity`. ID `integrity-audit-conservation`. verifyFn ID `auditConservation`.

#### 5.2 `rls-coverage.ts`

Assert: every ORG-scoped tenant table has `rowsecurity=true` + ≥1 policy filtering on `org_id`; every USER-scoped child table has `rowsecurity=true` + ≥1 policy filtering on parent FK (per Q10b refinement). Approach: SKIP-clean when `/api/_introspect/rls-coverage` unavailable (current state); when available, queries `pg_policies` + `pg_tables` and reports any tenant-classified table without RLS as FAIL.

Slice-ship implementation mirrors §5.1 SKIP-clean shape. Domain `integrity`. ID `integrity-rls-coverage`. verifyFn ID `rlsCoverage`.

#### 5.3 `role-permission-integrity.ts`

Assert: every role declared in `.planning/architecture/ROLES-CATALOG.md` (15+ default roles) has a corresponding RLS policy entry referencing it in `pg_policies.qual` or `pg_policies.with_check`. Approach: SKIP-clean when introspection unavailable; when available, parses ROLES-CATALOG.md role list (or reads a future canonical `role_definitions` table from F2) and cross-references against pg_policies. For slice ship, the self-test asserts the SKIP path returns cleanly and the future-implementation pseudocode is present in module comment.

Domain `integrity`. ID `integrity-role-permission-integrity`. verifyFn ID `rolePermissionIntegrity`.

#### 5.4 `fixture-coverage.ts`

Assert: every tenant-scoped entity in `.planning/architecture/ENTITY-INVENTORY.md` has ≥1 row in `fixture-harness-org` (per Q9 D contract). Approach: SKIP-clean when introspection unavailable; when available, reads ENTITY-INVENTORY.md entity list, queries each tenant table with `WHERE org_id = '00000000-0000-0000-0000-fb1ce0a55e55'`, FAILs on count = 0 for any entity. For slice ship, SKIP-clean pattern with future-implementation pseudocode in module comment.

Domain `integrity`. ID `integrity-fixture-coverage`. verifyFn ID `fixtureCoverage`.

#### 5.5 Schema extension

`.planning/verification/standards/_schema.json` currently has domain enum `["aia", "accounting", "lien-law", "dates", "conservation"]`. Extend to add `"integrity"`. Verify the schema file location at execute time; if it's checked into the repo, this is a small JSON edit. If it's only enforced at runtime via `loader.ts`, ensure the loader accepts the new value (current `loader.ts` reads schema dynamically — verify at execute time).

#### 5.6 `layer2/index.ts` registration

Append four side-effect imports:
```typescript
import "./standards/integrity/audit-conservation";
import "./standards/integrity/rls-coverage";
import "./standards/integrity/role-permission-integrity";
import "./standards/integrity/fixture-coverage";
```

### Task 6 — W.1 listener env-flagged activation (~2h)

1. Read current `src/hooks/use-current-role.ts` — confirm shape matches the snippet captured at plan-author time (single `useEffect` with `getUser()` + `org_members` query).
2. Extend the hook with a SECOND `useEffect` that subscribes to `supabase.auth.onAuthStateChange`. Subscription is env-flag-gated:
   ```typescript
   useEffect(() => {
     if (process.env.NEXT_PUBLIC_AUTH_STATE_LISTENER !== "true") {
       return; // env-flag-off: no-op (slice ship posture)
     }
     const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
       if (event === "SIGNED_OUT") {
         setRole(null);
         return;
       }
       if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED" || event === "SIGNED_IN") {
         // Re-fetch role for the new/refreshed session
         const userId = session?.user?.id;
         if (!userId) { setRole(null); return; }
         const { data } = await supabase
           .from("org_members")
           .select("role")
           .eq("user_id", userId)
           .eq("is_active", true)
           .order("created_at", { ascending: true })
           .limit(1)
           .maybeSingle();
         setRole((data?.role as OrgMemberRole | undefined) ?? null);
       }
     });
     return () => { subscription.unsubscribe(); };
   }, []);
   ```
3. Verify `npx tsc --noEmit` — no type errors.
4. Verify env-flag-off behavior by reading `.env.local` (Jake's local has flag unset) and confirming the listener `useEffect` early-returns.
5. Update `.env.local.example` — add commented block:
   ```
   # W.1 auth state listener (per F1 Wave-B Plan B-1b, nwrp153 Q5).
   # Activates useCurrentRole onAuthStateChange listener so role lookups
   # invalidate on auth events (SIGNED_OUT / TOKEN_REFRESHED / USER_UPDATED /
   # SIGNED_IN). Listener wiring ships dormant in slice B-1b; activation
   # is gated behind this env flag. Production unflag deferred to Slice-2
   # follow-up after observation window. See TD-WB-LISTENER-UNFLAG.md for
   # the unflag path + observation criteria.
   #NEXT_PUBLIC_AUTH_STATE_LISTENER=true
   ```
6. Create `.planning/tech-debt/TD-WB-LISTENER-UNFLAG.md` documenting:
   - What ships (listener wiring in `use-current-role.ts`)
   - What does NOT ship (env-var add to Vercel Production + Preview)
   - Unflag path (add `NEXT_PUBLIC_AUTH_STATE_LISTENER=true` to Vercel Production + Preview environments via dashboard or `vercel env add`)
   - Observation window (default 1-2 weeks per Q5)
   - Verification criteria (smoke harness baseline maintained; Sentry auth-state-change error rate flat; no nav-bar / invoice-detail role-cache regression)
   - Trigger: Jake authorizes Slice-2 dispatch OR explicit follow-up phase

### Task 7 — Verification + smoke (~1h)

1. Run `npx tsc --noEmit` end-to-end: PASS
2. Run `npm run build`: PASS
3. Run `npm test` against the 3 validator test files: PASS
4. Commit + push to phase branch (compound `git add ... && git commit` form per nwrp133)
5. After Vercel preview deploys, run `npx tsx scripts/wave-d-smoke.ts --preview-url <vercel-preview-url>`
6. Verify smoke result: ≤2 failures matching TD-WE-03 baseline (Wave-B prereq #12 maintained)
7. Smoke artifact at `.planning/qa-runs/stage-f1-knowledge-graph-auth-wave-b/smoke-results.json` per Rule 4 lifecycle
8. HALT for Jake review per GATE 2 (validator structure + harness extensions; per nwrp152)

## 6. KG scaffold structure

```
src/lib/knowledge-graph/
├── README.md                                 # Entry-point doc
├── index.ts                                  # Barrel: re-exports types + registries
├── types.ts                                  # Validator interface contract
├── validators/
│   ├── index.ts                              # Validator registry (named exports + Map)
│   ├── wi-001-inline-budget-context.ts       # Exemplar 1 (cross-entity FK lookup)
│   ├── wi-013-multi-job-allocation.ts        # Exemplar 2 (multi-row aggregation)
│   └── client-pii-not-embedded.ts            # Exemplar 3 (schema-shape policy)
└── queries/
    └── index.ts                              # Placeholder; F2-F5 expands

__tests__/validators/
├── wi-001.test.ts
├── wi-013.test.ts
└── client-pii-not-embedded.test.ts
```

## 7. Validator interface contract + 3 exemplar sketches

### 7.1 Validator interface contract (locked at slice ship per Q3)

```typescript
// src/lib/knowledge-graph/types.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

/**
 * Context threaded into every validator. Server-side execution model:
 * validators run inside API routes after `getCurrentMembership()` has
 * resolved the caller's tenant scope. The Supabase client is server-side
 * (service-role or RLS-bound depending on validator needs); the caller
 * provides it explicitly so validators can be unit-tested with a stub.
 *
 * `user_id` is null when the caller is a system-initiated context (e.g.,
 * the verification harness running fixture-harness-org).
 */
export interface ValidatorContext {
  supabase: SupabaseClient<Database>;
  org_id: string;
  user_id: string | null;
}

/**
 * Result shape. `ok=true` → no violations. `ok=false` → ≥1 violation
 * with structured detail. Violations carry a stable `code` (kebab-case
 * domain-noun-test convention) for downstream filtering + i18n; `message`
 * is the human-readable detail; `evidence` is optional structured payload
 * (e.g., the offending row's id, the offending substring, etc.).
 */
export interface ValidatorResult {
  ok: boolean;
  violations: Array<{
    code: string;
    message: string;
    evidence?: unknown;
  }>;
}

/**
 * Async-uniform per umbrella Q3 (locked nwrp153). Even in-memory checks
 * use Promise so callers don't branch on sync-vs-async. F2-F5 validators
 * that need DB lookups inherit this shape without overload.
 */
export type Validator<T> = (
  input: T,
  ctx: ValidatorContext,
) => Promise<ValidatorResult>;
```

### 7.2 WI-001 — inline budget context validator

**Source rule** (`WORKFLOW-INTELLIGENCE.md §WI-001`): "When approving an invoice, show the cost code's revised budget, total invoiced to date (including this invoice), committed (open POs + approved-unbilled COs), and available balance — all live in the right rail of the review view."

**Distilled validator** (input: an `InvoiceRow` proposed for approval): verify the invoice's `cost_code_id` (or each line item's `cost_code_id` when present) references a `budget_lines` row for the same `job_id`, AND the proposed `total_amount` doesn't push the cost code over `revised_estimate` by an unflagged amount. Violation codes:
- `wi-001-cost-code-no-budget-line` — invoice's cost_code_id has no matching budget_lines row for the job
- `wi-001-budget-line-overage` — approving this invoice would push total_to_date > revised_estimate (informational; not blocking — PM can approve over-budget per CLAUDE.md "What-If Handling" rule 4, but the validator surfaces the overage amount)

```typescript
// src/lib/knowledge-graph/validators/wi-001-inline-budget-context.ts
import type { Validator } from "../types";
import type { InvoiceRow } from "@/lib/types";

export const wi001InlineBudgetContext: Validator<InvoiceRow> = async (
  invoice,
  ctx,
) => {
  const violations: ValidatorResult["violations"] = [];

  if (!invoice.cost_code_id || !invoice.job_id) {
    // Cost-code-less invoices skip the budget context check; this is a
    // legitimate state pre-PM-review (cost_code_id assigned during review).
    return { ok: true, violations: [] };
  }

  // Look up the budget_line for this (job_id, cost_code_id).
  const { data: budgetLine, error: blErr } = await ctx.supabase
    .from("budget_lines")
    .select("id, revised_estimate")
    .eq("job_id", invoice.job_id)
    .eq("cost_code_id", invoice.cost_code_id)
    .eq("org_id", ctx.org_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (blErr) {
    violations.push({
      code: "wi-001-budget-line-query-error",
      message: `Failed to query budget_lines: ${blErr.message}`,
      evidence: { job_id: invoice.job_id, cost_code_id: invoice.cost_code_id },
    });
    return { ok: false, violations };
  }

  if (!budgetLine) {
    violations.push({
      code: "wi-001-cost-code-no-budget-line",
      message: `Invoice references cost_code_id ${invoice.cost_code_id} but no budget_lines row exists for job ${invoice.job_id}.`,
      evidence: { job_id: invoice.job_id, cost_code_id: invoice.cost_code_id },
    });
    return { ok: false, violations };
  }

  // Aggregate total_to_date for this budget_line (sum of approved invoices
  // for the same cost_code on the same job). R.2 recalculate-don't-increment.
  const { data: approvedInvoices, error: aiErr } = await ctx.supabase
    .from("invoices")
    .select("total_amount")
    .eq("job_id", invoice.job_id)
    .eq("cost_code_id", invoice.cost_code_id)
    .eq("org_id", ctx.org_id)
    .in("status", ["pm_approved", "qa_approved", "pushed_to_qb", "in_draw", "paid"])
    .is("deleted_at", null);

  if (aiErr) {
    violations.push({
      code: "wi-001-invoice-aggregation-error",
      message: `Failed to aggregate prior invoices: ${aiErr.message}`,
    });
    return { ok: false, violations };
  }

  const priorTotal = (approvedInvoices ?? []).reduce(
    (acc, row) => acc + (row.total_amount ?? 0),
    0,
  );
  const proposedTotalToDate = priorTotal + (invoice.total_amount ?? 0);

  if (
    budgetLine.revised_estimate != null &&
    proposedTotalToDate > budgetLine.revised_estimate
  ) {
    const overage = proposedTotalToDate - budgetLine.revised_estimate;
    violations.push({
      code: "wi-001-budget-line-overage",
      message: `Approving this invoice would push total_to_date ($${proposedTotalToDate / 100}) over revised_estimate ($${budgetLine.revised_estimate / 100}) by $${overage / 100}.`,
      evidence: {
        budget_line_id: budgetLine.id,
        revised_estimate: budgetLine.revised_estimate,
        prior_total: priorTotal,
        this_invoice: invoice.total_amount,
        proposed_total_to_date: proposedTotalToDate,
        overage,
      },
    });
    // NOTE: This is INFORMATIONAL per CLAUDE.md "What-If Handling" rule 4.
    // The validator surfaces ok:false so the UI can show the overage
    // warning, but the caller (invoice approval API route) decides whether
    // to block or proceed with PM acknowledgment.
  }

  return { ok: violations.length === 0, violations };
};
```

**Unit test sketch** (`__tests__/validators/wi-001.test.ts`):
- Test 1: invoice with no cost_code_id → ok=true, violations=[]
- Test 2: invoice with cost_code_id but no matching budget_line → ok=false, violation code `wi-001-cost-code-no-budget-line`
- Test 3: invoice that does not push over budget → ok=true, violations=[]
- Test 4: invoice that pushes over budget → ok=false, violation code `wi-001-budget-line-overage` with correct overage cents value

Tests use a stub `SupabaseClient` (`@supabase/supabase-js` Jest mock) returning canned responses for `budget_lines` + `invoices` queries; no real DB needed for unit tests. Integration coverage comes via the Layer 2 standards in §5 (which run against fixture-harness-org).

### 7.3 WI-013 — multi-job allocation validator

**Source rule** (`WORKFLOW-INTELLIGENCE.md §WI-013`): "A single roofing invoice covers two adjacent jobs ... PM splits the invoice into two job allocations with audit trail."

**Distilled validator** (input: an array of proposed allocations for a single invoice): verify (a) the sum of allocation amounts equals the invoice's total_amount (cent-tolerant); (b) every allocation's `job_id` belongs to the caller's `org_id`; (c) every allocation's `cost_code_id` (when present) references a budget_lines row for that allocation's job. Violation codes:
- `wi-013-allocation-sum-drift` — sum of allocation amounts ≠ invoice total_amount
- `wi-013-allocation-cross-tenant` — allocation references a job outside ctx.org_id
- `wi-013-allocation-cost-code-no-budget-line` — allocation's cost_code_id has no matching budget_line for its job

```typescript
// src/lib/knowledge-graph/validators/wi-013-multi-job-allocation.ts
import type { Validator } from "../types";
import type { Tables } from "@/lib/types";

type InvoiceAllocationInsert = Tables<"invoice_allocations"> | {
  invoice_id: string;
  job_id: string;
  cost_code_id: string | null;
  amount: number;
};

export interface MultiJobAllocationInput {
  invoice_id: string;
  invoice_total_amount: number; // cents
  allocations: InvoiceAllocationInsert[];
}

export const wi013MultiJobAllocation: Validator<MultiJobAllocationInput> = async (
  input,
  ctx,
) => {
  const violations: ValidatorResult["violations"] = [];

  // (a) Sum equality (R.2 recalculate, 1-cent tolerance)
  const sum = input.allocations.reduce((acc, a) => acc + (a.amount ?? 0), 0);
  const drift = Math.abs(sum - input.invoice_total_amount);
  if (drift > 1) {
    violations.push({
      code: "wi-013-allocation-sum-drift",
      message: `Allocations sum to ${sum} cents but invoice total is ${input.invoice_total_amount} cents (drift ${drift}).`,
      evidence: { sum, invoice_total: input.invoice_total_amount, drift },
    });
  }

  // (b) Cross-tenant check + (c) budget_line existence per allocation
  for (const alloc of input.allocations) {
    const { data: job, error: jobErr } = await ctx.supabase
      .from("jobs")
      .select("id, org_id")
      .eq("id", alloc.job_id)
      .maybeSingle();

    if (jobErr || !job) {
      violations.push({
        code: "wi-013-allocation-job-not-found",
        message: `Allocation references job ${alloc.job_id} which does not exist or is not readable.`,
        evidence: { job_id: alloc.job_id },
      });
      continue;
    }
    if (job.org_id !== ctx.org_id) {
      violations.push({
        code: "wi-013-allocation-cross-tenant",
        message: `Allocation references job ${alloc.job_id} which belongs to org ${job.org_id}, not the caller's org ${ctx.org_id}.`,
        evidence: { job_id: alloc.job_id, job_org_id: job.org_id },
      });
      continue;
    }

    if (alloc.cost_code_id) {
      const { data: budgetLine } = await ctx.supabase
        .from("budget_lines")
        .select("id")
        .eq("job_id", alloc.job_id)
        .eq("cost_code_id", alloc.cost_code_id)
        .eq("org_id", ctx.org_id)
        .is("deleted_at", null)
        .maybeSingle();
      if (!budgetLine) {
        violations.push({
          code: "wi-013-allocation-cost-code-no-budget-line",
          message: `Allocation for job ${alloc.job_id} references cost_code ${alloc.cost_code_id} with no matching budget_line.`,
          evidence: { job_id: alloc.job_id, cost_code_id: alloc.cost_code_id },
        });
      }
    }
  }

  return { ok: violations.length === 0, violations };
};
```

**Unit test sketch**:
- Test 1: allocations sum exactly to invoice total, all jobs in-org, all cost codes have budget lines → ok=true
- Test 2: sum drift > 1 cent → ok=false, code `wi-013-allocation-sum-drift`
- Test 3: allocation references job in different org → ok=false, code `wi-013-allocation-cross-tenant`
- Test 4: allocation with cost_code_id but no budget_line → ok=false, code `wi-013-allocation-cost-code-no-budget-line`
- Test 5: combination of multiple violations → ok=false, violations array contains all matching codes

### 7.4 client-pii-not-embedded validator

**Source rule** (D-078 PII fence convention + Q4 nwrp153 amendment): "When PostgREST embedding hints are used to display data, the embed must reference `profiles` for display columns (full_name) and MUST NOT reference `clients.email` / `clients.phone` (homeowner PII)." Per Q1 nwrp153, `clients.email` + `clients.phone` are inside the PII fence.

**Distilled validator** (input: a string representing a PostgREST select hint, OR a route file's source text): scan for patterns that reference fenced columns on `clients` via PostgREST embed syntax. Violation codes:
- `client-pii-embed-detected` — embed reference includes `clients.email` / `clients.phone` / `clients(*)` (wildcard)
- `client-pii-embed-wildcard` — embed uses `clients(*)` which transitively exposes email + phone

```typescript
// src/lib/knowledge-graph/validators/client-pii-not-embedded.ts
import type { Validator } from "../types";

/**
 * Input: a string that is either:
 * (a) a single PostgREST select query string (e.g., "id,client:clients(id,name)")
 * (b) a route file's full source text (validator scans for the patterns within)
 *
 * Per D-078 / D-079 / D-080 + Q1 nwrp153 — clients.email + clients.phone are
 * inside the PII fence. PostgREST embed hints MUST reference profiles (for
 * display) OR clients with explicit non-PII column whitelist; wildcard +
 * email/phone references are blocked.
 *
 * This validator is sync-shaped in logic but async-typed per Q3 (no DB
 * call needed; pure string analysis).
 */
export interface ClientPiiInput {
  source: string;
  context_label?: string; // e.g., "src/app/api/jobs/route.ts" for diagnostics
}

const WILDCARD_PATTERN = /\bclients?\s*\(\s*\*\s*\)/g;
const EMAIL_PATTERN = /\bclients?\s*\([^)]*\bemail\b[^)]*\)/g;
const PHONE_PATTERN = /\bclients?\s*\([^)]*\bphone\b[^)]*\)/g;
// Match embed aliases too: e.g., "client:clients(*)" or "homeowner:clients(*)"
const ALIAS_WILDCARD = /:\s*clients?\s*\(\s*\*\s*\)/g;

export const clientPiiNotEmbedded: Validator<ClientPiiInput> = async (
  input,
  _ctx,
) => {
  const violations: ValidatorResult["violations"] = [];

  const wildcardHits = [
    ...input.source.matchAll(WILDCARD_PATTERN),
    ...input.source.matchAll(ALIAS_WILDCARD),
  ];
  for (const hit of wildcardHits) {
    violations.push({
      code: "client-pii-embed-wildcard",
      message: `PostgREST embed uses wildcard on clients table at offset ${hit.index}; wildcard transitively exposes email + phone which are inside the D-078 PII fence.`,
      evidence: {
        match: hit[0],
        offset: hit.index,
        context_label: input.context_label ?? null,
      },
    });
  }

  for (const pattern of [EMAIL_PATTERN, PHONE_PATTERN]) {
    for (const hit of input.source.matchAll(pattern)) {
      violations.push({
        code: "client-pii-embed-detected",
        message: `PostgREST embed references fenced PII column on clients at offset ${hit.index}.`,
        evidence: {
          match: hit[0],
          offset: hit.index,
          context_label: input.context_label ?? null,
        },
      });
    }
  }

  return { ok: violations.length === 0, violations };
};
```

**Unit test sketch**:
- Test 1: select string `"id,client:clients(id,name)"` → ok=true, no PII columns
- Test 2: select string `"id,client:clients(*)"` → ok=false, code `client-pii-embed-wildcard`
- Test 3: select string `"id,client:clients(id,name,email)"` → ok=false, code `client-pii-embed-detected`
- Test 4: select string `"id,client:clients(id,name,phone)"` → ok=false, code `client-pii-embed-detected`
- Test 5: full route file source containing one wildcard + one phone embed → ok=false, 2 violations with correct offsets

This validator complements the Plan-D-4 Rule-2 plan-review grep gate by providing a programmatic interface that future code can call (e.g., a `/api/_introspect/pii-fence` route that lints staged code).

## 8. Types pipeline + invoice.ts refactor

### 8.1 Generate `database.types.ts`

```bash
cd /c/Users/Jake/nightwork-platform
supabase gen types typescript --linked > src/lib/types/database.types.ts
```

Pre-flight verification per umbrella §2 prereq #10:
```bash
supabase --version    # expect ≥1.50
supabase status        # expect "Linked project: <project-id>"
```

If either fails, HALT and surface to Jake (Wave-B0 fallback condition per umbrella §9).

### 8.2 Header banner (preservation strategy)

The `supabase gen types` command writes the file to stdout; the shell redirect overwrites. To preserve a header banner across regenerations, choose ONE:

- **Option A (preferred at slice ship):** rely on the generator's own header (modern `supabase gen types` includes a "// DO NOT EDIT - generated" comment at top) and let users find the rule in CLAUDE.md.
- **Option B:** wrap the generation in a small bash script `scripts/regen-types.sh` that prepends a custom header before writing. Adds ~10 lines of script. Defer to executor if Option A's header is insufficient.

Slice ship: Option A.

### 8.3 `invoice.ts` preservation + new barrel

`src/lib/types/invoice.ts` — UNCHANGED (5 consumers per §3.2 keep importing `ParsedInvoice` + `ParseResult` from `@/lib/types/invoice`).

`src/lib/types/index.ts` — NEW barrel per Task 2 step 4 code block.

### 8.4 Typecheck verification

```bash
npx tsc --noEmit
```

PASS criterion: no NEW type errors. If the project has a baseline of pre-existing tsc errors (verify at execute time via `npx tsc --noEmit 2>&1 | wc -l`), the count MUST NOT increase from the pre-slice baseline.

## 9. Pre-commit hook sketch (`nightwork-type-regen.sh`)

```bash
#!/bin/bash
# Nightwork PreToolUse hook for Bash (git commit detection)
# Block commits where supabase/migrations/ files are staged but
# src/lib/types/database.types.ts isn't (regen-output drift).
#
# Bypass: --no-verify (per CLAUDE.md "Never --no-verify without
# Jake's explicit authorization" — bypass is logged at code review).
#
# Set NIGHTWORK_TYPE_REGEN_DISABLE=1 to disable entirely.

set -e

[[ "$NIGHTWORK_HOOKS_DISABLE" == "1" ]] && exit 0
[[ "$NIGHTWORK_TYPE_REGEN_DISABLE" == "1" ]] && exit 0

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
case "$(pwd)" in
  *nightwork-platform*) ;;
  *) exit 0 ;;
esac

INPUT=$(cat)
CMD=$(node -e "
let d='';
process.stdin.on('data', c => d += c);
process.stdin.on('end', () => {
  try { process.stdout.write(JSON.parse(d).tool_input?.command || ''); }
  catch { process.stdout.write(''); }
});
" <<< "$INPUT" 2>/dev/null)

# Only check git commit
if [[ ! "$CMD" =~ ^(git[[:space:]]+commit) ]]; then
  exit 0
fi

# Allow --no-verify
if [[ "$CMD" =~ --no-verify ]]; then
  exit 0
fi

# Detect staged migration files
STAGED=$(git diff --cached --name-only 2>/dev/null || true)
MIGRATIONS_STAGED=$(echo "$STAGED" | grep -cE "^supabase/migrations/" || true)

if [ "$MIGRATIONS_STAGED" -eq 0 ]; then
  # No migrations staged; type regen check is N/A
  exit 0
fi

# Migrations are staged. Check whether database.types.ts is also staged OR
# is in sync with current schema.
TYPES_STAGED=$(echo "$STAGED" | grep -cE "^src/lib/types/database\.types\.ts$" || true)

if [ "$TYPES_STAGED" -eq 1 ]; then
  # User correctly staged the regenerated file alongside the migration.
  exit 0
fi

# Migrations staged but types file isn't. Verify whether regen would
# produce a diff. If yes, block with a clear reason.
if ! command -v supabase >/dev/null 2>&1; then
  # Supabase CLI not installed; warn but don't block.
  exit 0
fi

# Regenerate to a temp file and diff
TMP=$(mktemp)
supabase gen types typescript --linked > "$TMP" 2>/dev/null || {
  rm -f "$TMP"
  # Regen failed (e.g., no linked project). Don't block; surface a warning.
  exit 0
}

if ! diff -q "$TMP" src/lib/types/database.types.ts >/dev/null 2>&1; then
  REASON="[nightwork-type-regen] Migrations staged under supabase/migrations/ but src/lib/types/database.types.ts does not match the regenerated output.

Run:
  supabase gen types typescript --linked > src/lib/types/database.types.ts
  git add src/lib/types/database.types.ts

Then re-commit. Pass --no-verify ONLY if you've intentionally diverged (rare; document the rationale)."
  rm -f "$TMP"
  NW_REASON="$REASON" node -e "
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: process.env.NW_REASON || ''
  }));
  " 2>/dev/null
  exit 2
fi

rm -f "$TMP"
exit 0
```

## 10. Layer 2 standards — assertion sketches + self-test approach

### 10.1 Domain extension

`.planning/verification/standards/_schema.json` domain enum: extend from `["aia", "accounting", "lien-law", "dates", "conservation"]` to `["aia", "accounting", "lien-law", "dates", "conservation", "integrity"]`. Single JSON edit.

### 10.2 Per-standard implementation pattern (slice ship)

All 4 standards mirror `conservation/money-line-items-sum.ts` (lines 1-86):
1. Module imports `registerVerifyFn` from `../../../registry`
2. `verifyFn` HEAD-probes its target introspection URL (e.g., `/api/_introspect/<domain>/<standard>`)
3. Returns SKIP cleanly when probe returns non-2xx/3xx with explanatory `error` field
4. Includes future-implementation pseudocode in module comments (per `conservation/money-line-items-sum.ts:52-69` precedent)
5. Returns PASS-with-noted-todo if probe somehow succeeds before walker ships (defensive — see lines 71-78 of existing file)
6. `registerVerifyFn(<camelId>, fn)` at module bottom
7. `export {}` to mark file as a module

### 10.3 JSON rule files

Each standard ships with a JSON file at `.planning/verification/standards/integrity/<id>.json` matching `_schema.json`:

```json
{
  "id": "integrity-audit-conservation",
  "domain": "integrity",
  "title": "Every state-mutating API path writes to activity_log",
  "description": "Cross-entity audit conservation: for every tracked entity transition in a test scenario, the activity_log row count delta is ≥ 1. Defense-in-depth for CC7.2 (audit-trail durability).",
  "severity": "blocking",
  "applies_to": ["activity_log/conservation"],
  "verifyFn": "auditConservation",
  "source_decisions": ["nwrp153 Q9", "umbrella §8 Layer 2 standards"]
}
```

Repeat for `integrity-rls-coverage`, `integrity-role-permission-integrity`, `integrity-fixture-coverage` with appropriate titles + applies_to surfaces.

### 10.4 Self-test approach

Each standard's `verifyFn`, when invoked against the test harness with `ctx.preview_url` pointing at a fixture-only context, returns either:
- SKIP with a clear error string (current state — no introspection surface exists yet) — **this is a non-vacuous self-test signal per iter-1 WARN-2 (cf. `conservation/self-test-always-pass.ts`)**: the harness can verify each standard's verifyFn IS registered and IS reachable.
- PASS with future-walker placeholder (defensive branch; should not fire at slice ship)

A separate `src/lib/verification/layer2/standards/integrity/self-test-helpers.ts` exposes a small helper that takes a verifyFn ID and asserts:
1. The verifyFn is registered (via `resolveVerifyFn`)
2. Invoking it with a synthetic `VerifyFnContext` produces a `VerifyFnResult` with `verdict` ∈ `{ "PASS", "FAIL", "SKIP" }`
3. The result's `evidence` or `error` field is non-empty (catches placeholder void returns)

This helper isn't a Jest test — it's a runtime probe the harness can invoke from `runLayer2` or a future `validateStandardsModules()` smoke route.

## 11. W.1 listener activation — env-flag wiring + smoke verification approach

### 11.1 Wiring

Single second-`useEffect` block in `src/hooks/use-current-role.ts` per Task 6. Env-flag short-circuit at the top of the effect callback so the subscription itself isn't created in env-flag-off mode. Cleanup function unsubscribes on unmount (Strict-Mode safe — double-mount in dev creates 2 subscriptions, both cleaned up on the first effect's cleanup).

### 11.2 `.env.local.example` extension

Already documented in Task 6 step 5.

### 11.3 Smoke verification approach

Per Rule 4 lifecycle:
1. Slice commits + pushes to phase branch
2. Vercel preview auto-deploys (Preview env does NOT have `NEXT_PUBLIC_AUTH_STATE_LISTENER=true`; listener wired but no-op)
3. Executor runs `npx tsx scripts/wave-d-smoke.ts --preview-url <preview-url>` against preview
4. Smoke artifact lands at `.planning/qa-runs/stage-f1-knowledge-graph-auth-wave-b/smoke-results.json`
5. PASS criterion: ≤2 failures matching TD-WE-03 set; specifically the env-flag-off listener must NOT regress `/today` (nav-bar consumer) or `/invoices/<id>` (invoice detail consumer) selectors

If smoke regresses, the listener wiring has a bug. Rollback path: `git revert` the listener commit; smoke re-runs against the reverted preview.

### 11.4 Production unflag (deferred)

Documented in `TD-WB-LISTENER-UNFLAG.md` per Task 6 step 6. NOT executed in this slice.

## 12. Acceptance criteria (13 falsifiable items)

- **AC-B1b-01:** `src/lib/knowledge-graph/` directory exists with subdirectories `validators/` and `queries/`; `README.md`, `index.ts`, `types.ts` present at the directory root. `validatorRegistry` and `queryRegistry` exported via `src/lib/knowledge-graph/index.ts`. Verified by: `ls src/lib/knowledge-graph/` + `grep -E "validatorRegistry|queryRegistry" src/lib/knowledge-graph/index.ts`.
- **AC-B1b-02:** 3 exemplar validator files exist: `validators/wi-001-inline-budget-context.ts`, `validators/wi-013-multi-job-allocation.ts`, `validators/client-pii-not-embedded.ts`. Each exports a named `Validator<T>` function whose signature matches the interface in `types.ts` (returns `Promise<ValidatorResult>` per Q3). Verified by: `npx tsc --noEmit` PASSing across all three with the imported `Validator` generic.
- **AC-B1b-03:** 3 unit test files exist at `__tests__/validators/wi-001.test.ts`, `__tests__/validators/wi-013.test.ts`, `__tests__/validators/client-pii-not-embedded.test.ts`. Each demonstrates the `(input, ctx) => Promise<ValidatorResult>` contract by asserting both an `ok: true` happy path and at least one `ok: false` violation path. Verified by: `npm test -- --testPathPattern='validators/'` PASS.
- **AC-B1b-04:** `src/lib/types/database.types.ts` exists, contains `export interface Database`, and includes a `Tables: { clients: ... }` entry (proves B-1a applied). Verified by: `grep -E "export interface Database|Tables: \{" src/lib/types/database.types.ts` + `grep "clients:" src/lib/types/database.types.ts` non-empty.
- **AC-B1b-05:** `src/lib/types/invoice.ts` retains all existing exports (`ParsedInvoice`, `ParseResult`, `ConfidenceDetails`, `CostCodeSuggestion`, `JobSuggestion`, `LineItemCostCodeSuggestion`, `ParsedLineItem`). Verified by: `grep -E "^export (interface|type) (ParsedInvoice|ParseResult|ConfidenceDetails|CostCodeSuggestion|JobSuggestion|LineItemCostCodeSuggestion|ParsedLineItem)" src/lib/types/invoice.ts` returns 7 lines. All 5 existing consumers (`src/lib/invoices/save.ts`, `src/lib/invoices/parse-file.ts`, `src/lib/invoices/bulk-import.ts`, `src/lib/claude/parse-invoice.ts`, `src/components/invoice-upload-content.tsx`) compile unchanged.
- **AC-B1b-06:** `src/lib/types/index.ts` exists and re-exports both AI-parse types and DB row types. `InvoiceRow`, `InvoiceInsert`, `InvoiceUpdate`, `ClientRow`, `ClientInsert`, `ClientUpdate`, and generic `Tables<T>` / `InsertTables<T>` / `UpdateTables<T>` are exported. Verified by: `grep -E "^export type (InvoiceRow|InvoiceInsert|InvoiceUpdate|ClientRow|ClientInsert|ClientUpdate|Tables|InsertTables|UpdateTables)" src/lib/types/index.ts` returns ≥9 lines.
- **AC-B1b-07:** `.claude/hooks/nightwork-type-regen.sh` exists, is executable (`chmod +x` verified via `ls -l`), and blocks commits where migration files are staged but `database.types.ts` is not (or is out of sync with regen output). Verified by: dry-run test — stage a no-op migration file, attempt a commit, confirm the hook blocks with the documented reason string.
- **AC-B1b-08:** CLAUDE.md `## Development Rules` section contains the type-generation rule bullet referencing `database.types.ts` + the pre-commit hook. Verified by: `grep -E "Schema changes regenerate types|database\.types\.ts" CLAUDE.md` returns a hit.
- **AC-B1b-09:** 4 Layer 2 standards exist at `src/lib/verification/layer2/standards/integrity/{audit-conservation,rls-coverage,role-permission-integrity,fixture-coverage}.ts`. Each registers a `verifyFn` per `registry.ts` contract and returns SKIP-clean against the current introspection-less state. Verified by: `ls src/lib/verification/layer2/standards/integrity/*.ts` returns 4 files (5 with `self-test-helpers.ts`); module imports added to `layer2/index.ts`. Self-test helper invocation produces a non-vacuous result per §10.4.
- **AC-B1b-10:** 4 JSON rule files exist at `.planning/verification/standards/integrity/{audit-conservation,rls-coverage,role-permission-integrity,fixture-coverage}.json` matching `_schema.json`. Schema domain enum extended to include `"integrity"`. Verified by: `ls .planning/verification/standards/integrity/*.json` returns 4 files; `grep '"integrity"' .planning/verification/standards/_schema.json` returns ≥1 hit.
- **AC-B1b-11:** `src/hooks/use-current-role.ts` extended with second `useEffect` containing `supabase.auth.onAuthStateChange` subscription. Env-flag short-circuit on `process.env.NEXT_PUBLIC_AUTH_STATE_LISTENER !== "true"` returns before subscribing. Cleanup function calls `subscription.unsubscribe()`. Verified by: `grep -E "onAuthStateChange|NEXT_PUBLIC_AUTH_STATE_LISTENER" src/hooks/use-current-role.ts` returns ≥2 hits.
- **AC-B1b-12:** `.env.local.example` documents `NEXT_PUBLIC_AUTH_STATE_LISTENER` with commented activation line. TD entry `.planning/tech-debt/TD-WB-LISTENER-UNFLAG.md` exists and documents the unflag path. Verified by: `grep NEXT_PUBLIC_AUTH_STATE_LISTENER .env.local.example` returns ≥1 hit; `ls .planning/tech-debt/TD-WB-LISTENER-UNFLAG.md` returns the file.
- **AC-B1b-13:** Post-execute smoke run passes ≤2 failures matching TD-WE-03 baseline. Smoke artifact at `.planning/qa-runs/stage-f1-knowledge-graph-auth-wave-b/smoke-results.json` shows status PASS or PARTIAL with TD-WE-03 failures only. `npx tsc --noEmit` PASS. `npm run build` PASS. Verified by: smoke results JSON + build log; Wave-B prereq #12 maintained.

## 13. Verification commands

```bash
# Pre-execute prereq verification (from umbrella §2 prereqs #10-11)
supabase --version                # expect ≥1.50
supabase status                   # expect linked-project line

# Pre-flight (per CLAUDE.md §Rule-6 collision checks)
git ls-files | grep -E "^src/lib/knowledge-graph/"   # expect zero hits (greenfield)
git ls-files | grep -E "^src/lib/types/database\.types\.ts"  # expect zero hits (greenfield)
git ls-files | grep -E "^\.planning/verification/standards/integrity/"  # expect zero hits

# During execute — types pipeline
supabase gen types typescript --linked > src/lib/types/database.types.ts
grep -E "^export interface Database" src/lib/types/database.types.ts   # ≥1 hit
grep "clients:" src/lib/types/database.types.ts   # ≥1 hit (proves B-1a applied)

# During execute — typecheck + build
npx tsc --noEmit                  # zero NEW errors (baseline preserved)
npm run build                     # PASS

# During execute — validator tests
npm test -- --testPathPattern='validators/'   # 3 test files PASS

# During execute — hook smoke test
echo '{"tool_input":{"command":"git commit -m test"}}' | bash .claude/hooks/nightwork-type-regen.sh
# Expect exit 0 (no staged migrations) OR exit 2 with block reason (staged migration without staged types)

# Post-execute — smoke harness
npx tsx scripts/wave-d-smoke.ts --preview-url <vercel-preview-url>
cat .planning/qa-runs/stage-f1-knowledge-graph-auth-wave-b/smoke-results.json | jq '.summary.pass_count'   # expect ≥11

# Post-execute — Layer 2 standard registration
grep -E "import \"./standards/integrity/" src/lib/verification/layer2/index.ts   # expect 4 hits
node -e "
require('./src/lib/verification/layer2');
const { verifyFnRegistry } = require('./src/lib/verification/registry');
['auditConservation','rlsCoverage','rolePermissionIntegrity','fixtureCoverage']
  .forEach(id => console.log(id, verifyFnRegistry.has(id) ? 'REGISTERED' : 'MISSING'));
"
# expect 4 REGISTERED lines

# Post-execute — listener wiring
grep -E "onAuthStateChange|NEXT_PUBLIC_AUTH_STATE_LISTENER" src/hooks/use-current-role.ts   # ≥2 hits
grep NEXT_PUBLIC_AUTH_STATE_LISTENER .env.local.example   # ≥1 hit
ls .planning/tech-debt/TD-WB-LISTENER-UNFLAG.md   # file exists
```

## 14. Rollback strategy

Slice-level rollback is a single `git revert` of the slice's commit set. No migration is applied by B-1b (this plan is purely application-layer + harness + hook), so no DB rollback is needed.

Specific rollback points:

- **W.1 listener wiring regression:** revert `src/hooks/use-current-role.ts`; env-flag stays unset = listener dormant regardless. Smoke harness baseline restored automatically.
- **Pre-commit hook misfire:** rename `.claude/hooks/nightwork-type-regen.sh` to `.claude/hooks/nightwork-type-regen.sh.disabled` OR set `NIGHTWORK_TYPE_REGEN_DISABLE=1` env var. Hook does NOT modify committed content; rollback is a config flip.
- **Types pipeline regression:** revert `src/lib/types/database.types.ts` + `src/lib/types/index.ts`; existing `src/lib/types/invoice.ts` consumers continue to compile because their imports are preserved exactly.
- **Layer 2 standards regression:** revert `src/lib/verification/layer2/standards/integrity/` + `.planning/verification/standards/integrity/` + `layer2/index.ts` import lines + `_schema.json` enum addition. Harness reverts to pre-B-1b registry shape.
- **Validator regression:** revert `src/lib/knowledge-graph/`. No production consumers exist in this slice; only the 3 test files reference the validators.

Compound `git revert HEAD` returns the repo to pre-slice state with one commit. If multiple commits, `git revert <oldest>..<HEAD>` reverts the range.

The env-flag posture on the W.1 listener (per Q5) means even if the listener wiring has a latent bug not caught by smoke, production stays unaffected until Slice-2 explicitly adds the env var. Defense-in-depth for the unflag.

## 15. SOC2 mapping

| Control | Surface | How B-1b advances |
|---|---|---|
| **CC6.1** (Logical access) | `integrity-rls-coverage` standard | Codifies the RLS coverage assertion at the harness layer; future violations caught at CI time rather than production discovery |
| **CC6.7** (Information transmission) | `client-pii-not-embedded` validator | Programmatic enforcement of the D-078 PII fence; can be wired into a future `/api/_introspect/pii-fence` route or a CI lint step |
| **CC7.2** (Audit-trail durability) | `integrity-audit-conservation` standard | Foundational standard for the activity_log conservation invariant; cooperates with Q6 F DB-trigger safety net (B-3 Slice-2) |
| **PI1.1** (Processing integrity) | Validator interface contract + `wi-001` + `wi-013` exemplars | Cross-entity validators are first-class architectural concerns per D-066 + D-071; lock the interface that F2-F5 inherits |
| **CC6.1 / PI1.1** (composite) | `integrity-role-permission-integrity` standard | Cross-references ROLES-CATALOG.md against pg_policies for completeness; SKIP-clean at slice ship, FAIL-on-gap when introspection surface ships |
| **CC7.2** (composite) | `integrity-fixture-coverage` standard | Codifies Q9 D fixture-maintenance contract at the harness layer; new tenant tables without fixture rows surface as FAIL |

## 16. Notes for plan-review iter-1

Suggested reviewer focus areas:

- **architect** — validate the KG scaffold structure mirrors existing `src/lib/` conventions (barrel + types + named registries). Cross-check the `validators/` + `queries/` split against umbrella Q11 D hybrid pattern. Verify the directory layout supports F2-F5's 35+-validator expansion without restructuring.
- **planner** — verify the complexity estimate against the 2.5-day budget (§4); cross-check the Layer 2 SKIP-clean pattern lineage to `conservation/money-line-items-sum.ts`; surface any unforeseen scope creep in the assertion-sketch sections (§7 / §10). Verify the Slice-2 fixture-coverage deferral escape valve is acceptable as written.
- **security-reviewer** — W.1 listener activation impact (§11) is the security-relevant change. Confirm env-flag posture sufficiently bounds blast radius. Cross-check the `client-pii-not-embedded` validator (§7.4) against D-078 / D-079 / D-080 — the regex patterns should catch realistic embed strings without false positives on unrelated code.
- **database-reviewer** — confirm the Layer 2 standards' future-walker pseudocode (§10) uses Postgres patterns that will work against the live schema. Specifically the `pg_policies` / `pg_tables` shape for `rls-coverage` and the activity_log delta computation for `audit-conservation`. SKIP-clean posture means no DB work at slice ship; reviewer confirms the future-walker design is sound.
- **design-system-reviewer** — N/A. No UI changes in this slice (no JSX, no CSS, no Heroicons/Lucide additions). Should be a PASS-by-default review.
- **ai-logic-tester** — per Rule 3 (CLAUDE.md), reviewer executes representative queries against the live schema for any PostgREST relationship / RLS claim in §7. Specifically:
  - WI-001: query `budget_lines` for fixture-harness-org Drummond job + confirm `(job_id, cost_code_id, org_id)` composite key works
  - WI-013: query `invoice_allocations` post-Wave-A 00096 confirming `org_id` direct-filter works
  - client-pii-not-embedded: no schema query needed; validator is pure string analysis
- **multi-tenant-architect** — confirm `ValidatorContext.org_id` threading is consistent with `getCurrentMembership()` posture (tenant safety BY CONSTRUCTION). Cross-check that validator signatures don't permit cross-tenant queries even with a service-role client.

**Cross-reviewer factual disagreement HALT (nwrp118):** if reviewers disagree on schema shape (e.g., one says `invoice_allocations.org_id` exists post-Wave-A, another disputes), HALT for Jake — resolution via migration file source verification, not majority vote.

**Pre-flight collision check sub-results (per CLAUDE.md Rule 6):**
- (a) Hook regex sweep on `files_modified`: N/A (no JSX/component/CSS files touched; design-system forbidden patterns don't apply to TS validator or hook script files)
- (b) Fixture infrastructure collision: N/A (this plan does not seed fixture rows; fixture-coverage standard READS B-1a's fixture row, doesn't create new ones)
- (c) Deliverable path reachability: all paths under tracked parents (`src/lib/`, `__tests__/`, `.claude/hooks/`, `.planning/tech-debt/`, `.planning/verification/standards/`, `.env.local.example`, `CLAUDE.md`); no gitignore gaps detected
- (d) `files_modified` intersection check (parallel with B-D080 + B-1a): **expected zero** — B-D080 only touches `supabase/migrations/00099*.sql`; B-1a only touches `supabase/migrations/00100*.sql` + fixture seed; B-1b touches none of those paths. Confirm at plan-review iter-1 mechanical grep.

---

**End of plan B-1b.** Awaiting GATE 1 plan-review iter-1.
