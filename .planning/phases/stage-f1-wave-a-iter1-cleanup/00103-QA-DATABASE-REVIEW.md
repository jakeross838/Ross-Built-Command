# 00103 QA — Database Review
Migration: `00103_revoke_public_execute_security_definer_triggers.sql`
Reviewer: database-reviewer agent
Date: 2026-05-19
Verdict: **PASS**

---

## Per-Concern Findings

### 1. §B Verification DO Block — Syntax and Coverage
**Severity: PASS**

The DO block is syntactically correct. The iteration pattern is:

```sql
FOREACH acl_text IN ARRAY bad_function.proacl_array
```

`proacl` is of type `aclitem[]`. Postgres allows FOREACH iteration over `aclitem[]` by casting implicitly to `text[]` in this context — however, there is a subtle typing note: `proacl_array` is declared as `p.proacl AS proacl_array` which is `aclitem[]`, and `acl_text` is declared as `TEXT`. Postgres will cast each `aclitem` element to `text` on assignment in a FOREACH loop without an explicit `::text[]` cast. This works in practice and matches the pattern used in Supabase tooling, but an explicit `FOREACH acl_text IN ARRAY bad_function.proacl_array::text[]` would be marginally safer for forward-compatibility. This is a style note only — not a correctness failure given current Postgres behavior.

**Pattern coverage — all 3 grant vectors checked:**
- `'=%'` — PUBLIC (grantee is empty string before `=`). Correct. This is what 00102 missed.
- `'anon=%'` — named anon role. Correct.
- `'authenticated=%'` — named authenticated role. Correct.

One structural observation: the `bad_count := bad_count + 1` lines after each RAISE EXCEPTION are unreachable — RAISE EXCEPTION immediately exits the block. This is dead code but harmless; the fail-fast behavior (EXCEPTION → ROLLBACK) is correct and desired.

The `LIKE '=%'` pattern correctly identifies PUBLIC ACL entries. In Postgres, the ACL text representation for PUBLIC grants has an empty grantee prefix: `=X/grantor`. The pattern `'=%'` will match this. However, note that `owner=X/postgres` (the owner's own grant) would NOT match `'=%'` because it begins with the owner role name — no false positives from owner entry. The pattern is sound.

**00102 §B vs 00103 §B improvement:**
- 00102 §B used `acl LIKE 'anon=%' OR acl LIKE 'authenticated=%'` via unnest + EXISTS subquery — missed PUBLIC.
- 00103 §B uses FOREACH iteration + checks all 3 patterns per element — correct and complete.
- Material improvement confirmed. The 00102 verification gap that allowed the bad commit is closed.

### 2. REVOKE EXECUTE FROM PUBLIC — Idempotency
**Severity: PASS**

In Postgres, `REVOKE` on a privilege that does not exist is a no-op (no error, no warning). Re-applying migration 00103 after it has already run will silently succeed. Idempotent: yes.

### 3. Down Migration — Rollback Fidelity and Semantic Correctness
**Severity: PASS (with informational note)**

The down migration issues `GRANT EXECUTE ON FUNCTION ... TO PUBLIC` for all 7 functions. This correctly restores the pre-00103 post-00102 state (anon + authenticated REVOKE'd; PUBLIC granted). The down.sql header correctly documents this is the "known-degraded rollback state" where the advisor will resume flagging.

**Semantic question raised in prompt:** Should the rollback be a no-op since PUBLIC was a default-extra grant (never explicitly set) rather than a business intent?

Answer: GRANT TO PUBLIC is the correct rollback target. In Postgres, functions created without explicit REVOKE FROM PUBLIC have an implicit PUBLIC grant. Migration 00102 did not REVOKE FROM PUBLIC; therefore post-00102 state includes the PUBLIC grant. The down migration faithfully restores that state by re-granting. If the down.sql were a no-op, it would be incorrect after rolling back into an environment that had the PUBLIC grant stripped by 00103. The explicit GRANT is the right semantic choice. The "default" nature of the original PUBLIC grant does not mean the rollback should be a no-op — it means the GRANT statement is idempotent, which it is.

### 4. §C Structural Count — Sufficiency
**Severity: PASS (with recommendation)**

§C checks that all 7 functions exist AND have `prosecdef = true`. This confirms the SECURITY DEFINER attribute was not accidentally altered and no function was dropped.

The question: should §C also verify trigger registrations?

Answer: Adding trigger registration verification would increase defense depth but is not required for correctness. The concern is: a REVOKE FROM PUBLIC cannot affect trigger registration (triggers are registered in pg_trigger by name, not governed by EXECUTE grants). The trigger fire path goes through the table-owner role, not through the grant system. Therefore trigger registration cannot be broken by this migration, and §C's omission of a trigger count check does not represent a gap in coverage for this specific migration's changes.

That said, a trigger count check (7 triggers in enabled state) would be inexpensive and would catch accidental trigger drops from concurrent DDL. Recommended for future migrations touching trigger-internal functions but not a blocker here.

Post-apply evidence cited (7 triggers, state='O', all enabled) confirms registration is intact independently of §C.

### 5. Trigger-Firing Safety Post-REVOKE
**Severity: PASS**

Trigger fire mechanism: when a trigger fires, Postgres executes the trigger function in the security context of the trigger function's SECURITY attribute — SECURITY DEFINER means it runs as the function's owner (postgres), regardless of the session role. The `EXECUTE` privilege governs only direct invocation (e.g., `SELECT myfunc()` or PostgREST `/rpc/myfunc`). It does not gate trigger invocation. This is documented Postgres behavior.

All 7 functions are SECURITY DEFINER with owner `postgres` per migration header and post-apply evidence (`{postgres=X/postgres,service_role=X/postgres}` — owner retains EXECUTE, service_role retains EXECUTE, PUBLIC does not). Trigger firing is completely unaffected.

The pre-authoring call-path sweep (`grep -r "rpc('create_default\|rpc('trg_pricing_history" src/`) returning no files confirms zero application-layer RPC callers — the only use path for these functions is via trigger invocation.

### 6. 00102 §B Comparison — Material Improvement
**Severity: PASS**

00102 §B gap: `EXISTS (SELECT 1 FROM unnest(rec.proacl::text[]) AS acl WHERE acl LIKE 'anon=%' OR acl LIKE 'authenticated=%')` — did not check `'=%'` (PUBLIC). The DO block returned "no findings" despite PUBLIC EXECUTE being present, allowing the commit to pass with the gate still open.

00103 §B closes this: FOREACH iteration over each ACL element with explicit `'=%'` check first. If PUBLIC were still present, the RAISE EXCEPTION would fire before the transaction commits, triggering automatic ROLLBACK. The migration would fail rather than silently pass.

This is a structural improvement to the verification pattern: instead of checking "are the named roles gone" it now checks "are ALL non-owner grants gone." This is the correct posture for a security hardening migration.

---

## Summary Table

| Concern | Verdict | Severity |
|---|---|---|
| §B syntax + proacl iteration | PASS (style note on implicit aclitem→text cast) | LOW |
| §B pattern coverage (all 3 grant vectors) | PASS | — |
| REVOKE idempotency | PASS | — |
| Down migration rollback fidelity | PASS | — |
| Down migration semantics (GRANT vs no-op) | PASS — GRANT is correct | — |
| §C structural count sufficiency | PASS (trigger count check recommended for future) | LOW |
| Trigger-firing safety post-REVOKE | PASS — EXECUTE grant does not gate trigger invocation | — |
| 00102 §B vs 00103 §B improvement | PASS — material improvement confirmed | — |

---

## Overall Verdict: PASS

No blocking issues. One style note (implicit aclitem→text cast in FOREACH — works but an explicit `::text[]` cast would be cleaner). One low-severity recommendation (add trigger count to §C in future similar migrations). Neither is a correctness concern. Migration is sound, idempotent, rollback-faithful, and closes TD-WAIC-03 correctly.
