# src/lib/knowledge-graph

Cross-entity validators + queries layer for the Nightwork knowledge graph.

Per umbrella Q11 D (hybrid schema-in-DB + types-generated + validators-in-app)
and nwrp153 Q3 (validator interface async / uniform `Promise<ValidatorResult>`).

Locked at slice B-1b ship (2026-05-15). F2-F5 will write 35+ validators
against this contract; **do NOT break the interface without explicit
cross-wave revisit.**

## Purpose

The knowledge graph (KG) is the application-layer half of F1's hybrid
architecture. The DB schema is the source of truth for shape; the
generated `database.types.ts` mirrors that shape; THIS directory hosts
the cross-entity invariant checks (validators) and intent-driven cross-
entity reads (queries).

Validators answer: **"Is this proposed state consistent with what I
already know?"**
Queries answer: **"What state should this role see right now?"**

Both pattern types thread the same `ValidatorContext` — a server-side
Supabase client + `org_id` + `user_id` — so they compose cleanly inside
API routes that have already called `getCurrentMembership()`.

## Directory layout

```
src/lib/knowledge-graph/
├── README.md                                  # this file
├── index.ts                                   # barrel — re-exports types + registries
├── types.ts                                   # Validator interface contract
├── validators/
│   ├── index.ts                               # Named exports + validatorRegistry Map
│   ├── wi-001-inline-budget-context.ts        # Exemplar 1 — cross-entity FK lookup
│   ├── wi-013-multi-job-allocation.ts         # Exemplar 2 — multi-row aggregation
│   └── client-pii-not-embedded.ts             # Exemplar 3 — schema-shape policy enforcement
└── queries/
    └── index.ts                               # Placeholder (F2-F5 expands)

__tests__/validators/
├── wi-001.test.ts
├── wi-013.test.ts
└── client-pii-not-embedded.test.ts
```

## Validator interface contract (locked)

See `types.ts` for the canonical definitions. The shape:

```typescript
type Validator<T> = (
  input: T,
  ctx: ValidatorContext,
) => Promise<ValidatorResult>;

interface ValidatorContext {
  supabase: SupabaseClient<Database>;
  org_id: string;
  user_id: string | null;
}

interface ValidatorResult {
  ok: boolean;
  violations: Array<{
    code: string;
    message: string;
    evidence?: unknown;
  }>;
}
```

Even in-memory checks (no DB call) use `Promise` so callers don't
branch on sync-vs-async. The cost is negligible; the consistency win
is real.

## How to add a new validator

1. **Author** `validators/<id>.ts` exporting a `Validator<T>` whose
   signature matches the interface in `types.ts`.

   Naming conventions:
   - `wi-NNN-<kebab-name>.ts` for WORKFLOW-INTELLIGENCE.md-derived
     validators (use the §WI-NNN id directly).
   - `<domain>-<noun>-<test>.ts` for non-WI validators (matches the
     `verifyFn` ID convention used elsewhere in the verification harness).

   Implementation pattern:
   - Pull tenant context from `ctx.org_id` and use `.eq("org_id",
     ctx.org_id)` on every DB read (tenant safety BY CONSTRUCTION per
     CLAUDE.md Multi-tenant RLS rule).
   - Return early on the happy path so violation pushes are explicit.
   - Use stable kebab-case codes for violations (downstream filtering +
     i18n depend on them).
   - Aggregate from source rows, never from a stored aggregate ("R.2
     Recalculate, don't increment" per CLAUDE.md).

2. **Re-export** from `validators/index.ts` and register in the
   `validatorRegistry` Map there.

3. **Unit-test** at `__tests__/validators/<id>.test.ts`. Tests use a
   stub `SupabaseClient` returning canned responses — no real DB
   needed. Cover both an `ok: true` happy path and ≥1 `ok: false`
   violation path. Use `node:assert` + the `__tests__/_runner.ts`
   runner.

4. **Update this README** if the validator introduces a new pattern
   (cross-entity FK / multi-row aggregation / schema-shape policy /
   anything novel) — future contributors should see the pattern listed.

## How to add a new query (F2+)

Queries are NOT shipped in B-1b. When F2 starts the "Today Engine":

1. Author `queries/<id>.ts` exporting an async function with
   `ValidatorContext`-style threading.
2. Re-export from `queries/index.ts` and register in `queryRegistry`.
3. Unit-test at `__tests__/queries/<id>.test.ts`.

## Cross-references

- **Validator source rules:**
  - WI-001 → `.planning/architecture/WORKFLOW-INTELLIGENCE.md §WI-001`
  - WI-013 → `.planning/architecture/WORKFLOW-INTELLIGENCE.md §WI-013`
  - client-pii-not-embedded → D-078 / D-079 / D-080 in
    `.planning/MASTER-PLAN.md §10` (PII fence convention)
- **Interface contract decisions:** nwrp153 Q3 (async uniform), Q4 (PII
  fence as 3rd exemplar), umbrella Q11 D (hybrid pattern)
- **Generated types:** `src/lib/types/database.types.ts` (regenerated
  by `supabase gen types typescript --linked` on every migration; see
  CLAUDE.md "Schema changes regenerate types" rule)
- **Verification harness:** `src/lib/verification/` — Layer 2 standards
  in `verification/layer2/standards/integrity/` ride alongside this
  layer; standards verify the harness contract holds, validators verify
  per-entity invariants hold.

## F2-F5 expansion path

F1 ships 3 validators (this slice). F2-F5 add ~35 more:

- **F2 (Today Engine + Roles Engine):** ~8 validators for
  role-permission integrity + today-item scope.
- **F3 (Approval + Notification Engines):** ~6 validators for approval
  chain integrity + notification deduplication.
- **F4 (Time / Equipment / Expenses):** ~5 validators for time-entry
  conflict + equipment-billing integrity.
- **F5 (Price Intel Engine):** ~10 validators for cost-intelligence
  corpus integrity + outlier detection.
- **F6 (Pay App / Draw Engine):** ~6 validators for G702/G703 conservation
  + AIA contract math.

Each ramp inherits the interface contract from this slice. If a future
ramp surfaces an interface limitation (e.g., a need for streaming
results, a need for sync-not-async, a need for a different result
shape), that requires an explicit cross-wave RFC and HALT — not a
quiet break.
