# Plan-Review B-2a iter-1 — Multi-tenant architect

**Captured 2026-05-21 from agent inline return.** Source: nightwork-multi-tenant-architect agent return content (the agent's own disk-write was suppressed by its system prompt; this file captures the agent's full report verbatim for audit-trail persistence).

**Verdict: PASS** with one MINOR-NOTE for plan-author / iter-1 synthesis.

## BY-CONSTRUCTION verification — composite FK

**PASS.** The plan delivers a textbook BY-CONSTRUCTION same-org invariant on `client_portal_access.(org_id, client_id) → clients(org_id, id)`:

- **Postgres-enforced at write time.** The composite FK is a Postgres `FOREIGN KEY` constraint, not a trigger or CHECK function. There is no callable function body that can be bypassed; the constraint is part of the table's relational structure and cannot be evaded by SECURITY DEFINER role escalation, by service-role inserts, or by direct SQL. Verified at `B-2a-PLAN.md:411-422` (NOT VALID then VALIDATE pattern) and `B-2a-PLAN.md:1066-1072` (migration body).
- **Migration sequence is correct.** `ALTER TABLE clients ADD CONSTRAINT clients_org_id_id_unique UNIQUE (org_id, id)` (§1a) precedes the composite FK (§1d). Verified that `clients` does NOT currently have this UNIQUE constraint (only PK on `id` per `supabase/migrations/00100_clients_schema_foundation.sql:215-226`). Sequence is mechanically valid.
- **4 precedents all verified as valid pattern matches:**
  - `org_members UNIQUE(org_id, user_id)` confirmed at `supabase/migrations/00016_multi_tenant_foundation.sql:104`.
  - `org_invites UNIQUE(org_id, email)` confirmed at `supabase/migrations/00019_phase2_org_invites.sql:17`.
  - `internal_billing_types UNIQUE(org_id, name)` confirmed at `supabase/migrations/00038_phase_b_internal_billings.sql:41` (note: plan cites `internal_billings` but actual table is `internal_billing_types` — minor cosmetic inaccuracy that does NOT affect BY-CONSTRUCTION verification).
  - `org_cost_codes UNIQUE(org_id, code)` confirmed at `supabase/migrations/00083_org_cost_codes.sql:30`.
- **`ON DELETE SET NULL` is correct cascade semantics.** Token row preserved if client deleted; revocation audit trail intact; `actor_token_id` FK ON DELETE SET NULL composes correctly.
- **No CHECK trigger creep.** Plan §6.a explicitly rejects CHECK trigger via tradeoff matrix (lines 369-377). Migration §1a-§1d contains only DDL — no CREATE TRIGGER or CREATE FUNCTION for same-org enforcement.
- **Dual-FK pattern explicit.** Plan-author notes (lines 426-438) that the column declaration `client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL` (§1b) creates a single-column FK named `client_portal_access_client_id_fkey`, AND the composite FK §1d adds `client_portal_access_org_id_client_id_fkey`. Both constraints fire on every write; combined invariant is mathematically: `client_id IS NULL OR (clients.id == client_id AND clients.org_id == client_portal_access.org_id)`. BY-CONSTRUCTION.

This closes iter-1 SYNTHESIS B-2 multi-tenant C-2 at the design-time level.

## Helper enforcement check — type-system vs runtime

**PASS-WITH-CAVEAT** at the architectural bar; tighter type-narrowing surfaces as MINOR-NOTE below for plan-author latitude.

The helpers in `src/lib/owner-portal/token.ts` (B-2a-PLAN.md:608-762) convert convention to construction:

- **`resolveOwnerToken`** is the single entry point that produces a `ResolvedOwnerToken` interface. The interface requires non-null `org_id`, `client_id`, `job_id` at the type-system level (`client_id: string`, not `string | null`). Null `client_id` is filtered defensively at line 662. After `resolveOwnerToken` succeeds, downstream code receives a `ResolvedOwnerToken` that cannot represent a NULL client. **Type-system enforcement.**
- **`getScopedOwnerPortalClient(resolvedToken)`** consumes `ResolvedOwnerToken` only — cannot be called without a resolved token. Returns `ScopedOwnerPortalClient`, a wrapper class with a single `scopedFrom(tableName)` method that injects `.eq()` filters on every query. The wrapper does NOT expose the raw `supabase` instance.
- **`scopedFrom` tableName is a string-literal union** (`"jobs" | "draws" | "change_orders" | "lien_releases"`). A typo or unauthorized table name causes a TypeScript compile error.
- **`assertDrawBelongsToToken`** uses a pinned PostgREST embed `jobs!inner(id, client_id, org_id)` with explicit cross-validation that `job.org_id === resolvedToken.org_id` AND `job.client_id === resolvedToken.client_id`. This is the runtime BY-CONSTRUCTION close on the iter-1 SYNTHESIS B-3 intra-org cross-client probe.

**B-2b consumers will have no escape hatch IF** the iter-1 synthesis attaches a grep-based plan-review gate to B-2b that BLOCKS direct `createServiceRoleClient()` or `createServerSupabaseClient()` invocations in any `src/app/api/owner-portal/**` file. The B-2a plan does not codify this gate (correctly, since B-2b is out of scope) but plan-review iter-1 SYNTHESIS for B-2a should flag this as a B-2b plan-author requirement.

**Error semantics are clean.** Both helpers return `null`/`false` rather than throwing — the contract is documented. Callers must check return value; TypeScript narrowing on `null` enforces this.

**MINOR-NOTE for plan-author latitude (NON-BLOCKING):** The `scopedFrom` return type is the raw Supabase query builder after chained `.eq()` calls. A B-2b author could call `.scopedFrom("draws").or(...)` and append an OR clause that effectively widens the scope. The wrapper's type signature does not prevent further query mutation. **Acceptable per the BY-CONSTRUCTION bar** — the wrapper enforces the lower-bound scope filter, and B-2b plan-review will catch hostile `.or()` patterns. Surface for B-2b plan-author awareness.

## Cross-tenant isolation for 3 RPCs

**PASS — all 3 RPCs re-defined safely with cross-tenant isolation preserved or strengthened.**

**`create_client_portal_invite` (D-05 NULL-leak fix):**
- Cross-org attack rejected at function start (preserved auth check from 00074:407-421): `p_org_id = app_private.user_org_id()` raises `unauthorized` BEFORE function body executes.
- Defense-in-depth: new same-org guard at B-2a-PLAN.md:1137-1139 makes cross-org variant impossible.
- AC-B2a-06 Query 3 directly verifies with "zero-leakage-row clause" per nwrp202 §5.

**`submit_client_portal_message` (Latitude #4 sliding-window):**
- Anon-token-based auth path. `_access` is derived from `access_token_hash = _hash` lookup.
- Cross-tenant concern: `_access.org_id, _access.job_id` are server-derived from token row — no tenant data leak possible.
- 90-day → 1-year change is a single string-literal swap with no observable cross-tenant signal.

**`mark_client_portal_message_read` (Latitude #4 sliding-window):**
- Same shape. Cross-tenant lookup constraints enforced at composite filter on `org_id` + `job_id` from resolved token.

**Down-migration verbatim restoration:**
- Lines 1380-1521 contain all 3 RPC bodies restored byte-faithful to 00074:390-439, 448-494, 501-543.
- Down migration does NOT preserve B-2a's 1-year semantics (correctly restores pre-B-2a state).

## Latitude #3 disposition with reasoning

**Recommend: Option A (`revoked_seq` column) — plan-author default is correct.**

Multi-tenant lens analysis:

| Option | Cross-tenant impact | BY-CONSTRUCTION cleanliness | Audit trail integrity |
|---|---|---|---|
| **A — `revoked_seq` column** | None — column adds to same row's tuple; doesn't affect cross-tenant boundary. Postgres uniqueness on `(org_id, client_id, job_id, revoked_seq)` enforces per-tenant uniqueness with revocation versioning. | Clean — pure declarative DDL. Postgres enforces. | Full — old row preserved with `revoked_at` populated; `revoked_seq` bumped. |
| **B — hard-delete on re-invite** | None at cross-tenant boundary, BUT violates "Never delete records — soft delete only" CLAUDE.md Dev Rule. The `actor_token_id` FK ON DELETE SET NULL would fire on every re-invitation, severing audit chain. | Partially clean — relies on application-layer DELETE call before INSERT; race condition possible. | Broken — admin UI cannot show "re-invited 3 times" pattern. |
| **C — partial-index `WHERE revoked_at IS NULL`** | None at cross-tenant boundary, BUT re-introduces timing oracle (per iter-1 SYNTHESIS B-7 + nwrp202 §4 explicit prohibition). **Rejected per nwrp202 §4.** |

**Reasoning:** Option A is the cleanest BY-CONSTRUCTION re-invitation semantics. Option B violates soft-delete rule (discipline-erosion). Option C is mechanically blocked by nwrp202 §4. **Plan-author default Option A stands.**

## Rule 9 cross-reviewer factual disagreement notes

**No contradictions surfaced at multi-tenant lens.**

**One minor non-disagreement to note for iter-1 synthesis:** the plan cites `internal_billings UNIQUE(org_id, name)` at `00038:41`, but the actual table at that line is `internal_billing_types`. Constraint at line 41 is correct (UNIQUE on `(org_id, name)`); table-name is misnamed. **Cosmetic; one-word fix.**

## Summary

B-2a passes the BY-CONSTRUCTION multi-tenant bar with strong evidence. **Verdict: PASS** with one MINOR-NOTE for plan-author latitude on the `scopedFrom` return type (surface to B-2b plan-review iter-1). No Rule 9 cross-reviewer factual disagreements detected at multi-tenant lens.
