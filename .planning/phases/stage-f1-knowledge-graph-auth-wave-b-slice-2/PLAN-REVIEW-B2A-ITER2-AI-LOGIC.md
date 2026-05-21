# Plan-Review B-2a iter-2 — AI Logic Tester

**Captured 2026-05-21 (iter-2 subset re-review per nwrp203 §re-review scope).** Source: nightwork-ai-logic-tester agent return content. Iter-1 finding closure verification + Rule 3 runtime evidence captured against current schema.

## Verdict

**PASS** — iter-1 BLOCKING-CANDIDATE (timing oracle on token-resolution hot path) + 3 WARNING/NOTE all closed in iter-2 revision. L-4 IN-SCOPE re-affirmed. No newly-surfaced findings. No Rule 9 cross-reviewer factual disagreement.

## Iter-1 finding closure table

| # | Iter-1 finding | Resolution PLAN location | Status |
|---|---|---|---|
| BLK-3 | Token-hash partial index `WHERE revoked_at IS NULL` reintroduces timing oracle on `resolveOwnerToken` hot path | Migration 00104 §1k forward: DROP + recreate non-partial (lines 1215-1223); down-migration §1k reverse: restore 00074:188-190 partial form (lines 1685-1689); AC-B2a-14 + criteria M-09 verification (lines 2446-2467 + 139-142) | **CLOSED** |
| W-1 | AC-B2a-13 sub-item 9 Drummond canary vacuously true (0 rows in client_portal_access) | AC-B2a-13 sub-item 9 prose at line 2056 explicitly acknowledges vacuously-true case + cross-references AC-B2a-06 sub-item 2 (RPC invocation active probe) per N-2 disposition | **CLOSED** |
| W-2 | Citation error: PLAN cites `internal_billings UNIQUE(org_id, name)` at 00038:41 but the constraint lives in `internal_billing_types` | Lines 73 (refs index header) + 477 (composite-FK precedent table) both corrected to read `internal_billing_types` | **CLOSED** |
| N-1 | `draws.job_id` prose imprecision (calls index "not exist" without acknowledging existing partial composites lead with job_id) | Lines 214, 304, 1088, 1093-1097 all tightened to acknowledge existing partial composites are partial-on-`deleted_at` and cannot serve B-2a helper queries that don't filter `deleted_at IS NULL` | **CLOSED** |
| L-4 | Sliding-window UPDATE 90-day → 1-year in 2 RPCs (scope-completeness check) | §2 Latitude #4 header at line 262 records APPROVED IN-SCOPE with cross-reviewer alignment (security + multi-tenant + ai-logic); inline body authoring in §5 Task 1 §3b (lines 1339-1342) + §3c (lines 1397-1400) with `1 year`; down-migration §3b/§3c reverse preserves `90 days` (lines 1622 + 1672) | **APPROVED IN-SCOPE re-affirmed** |

## Runtime evidence (Rule 3)

3 Supabase Management API queries executed 2026-05-21 (read-only; no schema mutation).

### Q1 — Baseline timing-oracle index state

Query:

    SELECT indexname, indexdef FROM pg_indexes
     WHERE tablename = 'client_portal_access' AND indexname = 'idx_client_portal_access_token_hash';

Output:

    [{"indexname":"idx_client_portal_access_token_hash",
      "indexdef":"CREATE UNIQUE INDEX idx_client_portal_access_token_hash ON public.client_portal_access USING btree (access_token_hash) WHERE (revoked_at IS NULL)"}]

**Match**: YES. Current pre-migration state has the partial `WHERE (revoked_at IS NULL)` predicate from 00074:188-190. Iter-2 §1k forward migration WILL correctly DROP + recreate non-partial. The BLK-3 fix is mechanically sound.

### Q2 — Drummond canary baseline (vacuously-true confirmation)

Query: `SELECT COUNT(*) AS row_count FROM public.client_portal_access;`

Output: `[{"row_count":0}]`

**Match**: YES. Re-confirms iter-1 Q6 finding (0 rows across all orgs). AC-B2a-13 sub-item 9 line 2056 vacuously-true acknowledgment is correctly anchored to current schema state; active probe via AC-B2a-06 sub-item 2 covers the non-empty case.

### Q3 — Pre-migration RPC body verification (L-4 scope-completeness)

Query:

    SELECT proname,
           position('90 days' in prosrc) AS pos_90days,
           position('1 year' in prosrc) AS pos_1year
      FROM pg_proc
     WHERE proname IN ('submit_client_portal_message', 'mark_client_portal_message_read', 'create_client_portal_invite')
       AND pronamespace = 'public'::regnamespace
     ORDER BY proname;

Output:

    [{"proname":"create_client_portal_invite","pos_90days":843,"pos_1year":0},
     {"proname":"mark_client_portal_message_read","pos_90days":724,"pos_1year":0},
     {"proname":"submit_client_portal_message","pos_90days":775,"pos_1year":0}]

Drill-down on sliding-window snippet:

    SELECT proname, substring(prosrc from position('expires_at = now()' in prosrc) for 80) AS sliding_snippet
      FROM pg_proc
     WHERE proname IN ('submit_client_portal_message', 'mark_client_portal_message_read')
       AND pronamespace = 'public'::regnamespace
     ORDER BY proname;

Output (newlines in snippet shown as literal \n):

    [{"proname":"mark_client_portal_message_read",
      "sliding_snippet":"expires_at = now() + interval '90 days'\n    WHERE id = _access.id;\nEND;\n"},
     {"proname":"submit_client_portal_message",
      "sliding_snippet":"expires_at = now() + interval '90 days'\n    WHERE id = _access.id;\n\n  RETURN QUE"}]

**Match**: YES. All three RPC bodies currently contain `'90 days'` (positions 724, 775, 843); none contain `'1 year'` (positions all 0). Iter-2 migration §3, §3b, §3c WILL correctly flip them to `'1 year'`. Down-migration §3, §3b, §3c reverse correctly preserves `'90 days'`. The sliding-window UPDATE text is verbatim `expires_at = now() + interval '90 days'` matching iter-1 SYNTHESIS Q8 evidence.

## BLK-3 fix verification (PLAN body cited lines)

Forward migration (lines 1215-1223):

    -- §1k — DROP+recreate idx_client_portal_access_token_hash as NON-PARTIAL per BLK-3.
    DROP INDEX IF EXISTS public.idx_client_portal_access_token_hash;
    CREATE UNIQUE INDEX idx_client_portal_access_token_hash
      ON public.client_portal_access (access_token_hash);

Down migration (lines 1685-1689):

    -- §1k reverse — restore 00074:188-190 partial index form (per BLK-3 down-reverse parity)
    DROP INDEX IF EXISTS public.idx_client_portal_access_token_hash;
    CREATE UNIQUE INDEX idx_client_portal_access_token_hash
      ON public.client_portal_access (access_token_hash)
      WHERE revoked_at IS NULL;

AC-B2a-14 (lines 2446-2467):

    SELECT indexname, indexdef FROM pg_indexes
     WHERE tablename = 'client_portal_access'
       AND indexname = 'idx_client_portal_access_token_hash';
    -- Expected: indexdef has no WHERE clause (non-partial)

Criteria block M-09 (lines 139-142):

    - id: M-09
      statement: "Token-hash index ... is NON-PARTIAL post-00104 ..."
      query: "SELECT indexdef FROM pg_indexes WHERE ... = 'idx_client_portal_access_token_hash';"
      expected: "indexdef does NOT contain 'WHERE' clause (non-partial; ...)"

**Verification**: BLK-3 fix is structurally complete. DROP IF EXISTS present, CREATE UNIQUE INDEX has no WHERE clause, down-migration restores 00074:188-190 partial form on rollback, AC-B2a-14 + M-09 verification queries align with the resulting indexdef. PLAN body internally consistent (lines 211, 300, 624, 654, 1114, 1483, 2523 all reference BLK-3 fix coherently).

## WARNINGs + NOTE verification

### W-1 — Drummond canary vacuously-true acknowledgment (line 2056)

PLAN text at AC-B2a-13 sub-item 9:
> **Vacuously-true acknowledgment (N-2 per iter-1 SYNTHESIS):** if `client_portal_access` is empty at backfill time (current state per ai-logic-tester Q6 evidence — 0 rows across all orgs in current schema), the canary passes vacuously. The active probe via AC-B2a-06 sub-item 2 (RPC invocation against Drummond job + `client_id` verification) covers the canary intent for the non-empty case.

**Verification**: PASS. Q2 runtime evidence above (0 rows) confirms current state matches the vacuously-true case. AC-B2a-06 sub-item 2 (RPC invocation) is correctly cited as the active probe. Cross-reference is unambiguous.

### W-2 — `internal_billings` → `internal_billing_types` correction (lines 73, 477)

Line 73 (refs index): `# composite UNIQUE precedent #3 (constraint at line 41 in internal_billing_types table; filename retains internal_billings per other tables in same migration — N-1 corrected per iter-1 SYNTHESIS)`

Line 477 (precedent-table row): `Precedent in codebase | 4 established (00016:104, 00019:17, 00038:41 in internal_billing_types, 00083:30)`

**Verification**: PASS. Both citations correctly resolved to `internal_billing_types`. Substantive impact zero — 4-precedent claim holds; cosmetic-citation parity restored.

### N-1 — `draws.job_id` prose imprecision (lines 214, 304, 1088, 1093-1097)

All four locations now consistently frame the existing state as: "no unfiltered single-column index ... the two existing partial composites (`idx_draws_job_number` / `idx_draws_job_status`) are partial-on-`deleted_at` and cannot serve B-2a helper queries that don't filter `deleted_at IS NULL`."

**Verification**: PASS. Prose framing is precise; PLAN conclusion (add unfiltered index) is correct; no implication that existing indexes are absent — only that they cannot serve the B-2a helper query shape (which deferral-of-soft-delete-filter to B-2b makes structurally true).

## L-4 re-affirmation

Three runtime-verified facts re-confirm iter-1 Q8 scope-completeness:

1. **3 RPCs touch `client_portal_access.expires_at`** (Q3 runtime evidence): `create_client_portal_invite`, `submit_client_portal_message`, `mark_client_portal_message_read`. No others (iter-1 Q8 searched all pg_proc bodies).
2. **All 3 currently contain `'90 days'`** (Q3 runtime evidence: positions 724, 775, 843); none contain `'1 year'` (positions all 0).
3. **Iter-2 PLAN body correctly flips all 3 to `'1 year'`** in forward migration:
   - `create_client_portal_invite` at line 1281: `COALESCE(p_expires_at, now() + interval '1 year')`
   - `submit_client_portal_message` at line 1341: `expires_at = now() + interval '1 year'`
   - `mark_client_portal_message_read` at line 1399: `expires_at = now() + interval '1 year'`
4. **Down-migration correctly preserves `'90 days'`** at lines 1568, 1622, 1672, 1683.

**L-4 disposition**: APPROVED IN-SCOPE re-affirmed. Sliding-window UPDATE flip is a NECESSARY CONSEQUENCE of nwrp200 1-year lock (not scope creep). Without consistent 1-year semantics across all 3 RPCs, first token use rolls window back to 90 days, undermining nwrp200.

## Cross-reviewer alignment notes (Rule 9)

No Rule 9 factual disagreement surfaced in iter-2 review. Iter-1 BLK-3 cross-reviewer ALIGNMENT (security + ai-logic) on timing oracle is preserved as a single resolved finding; not a disagreement requiring Jake disposition.

## Newly-surfaced findings (iter-2)

**None.** No new BLOCKING, WARNING, or NOTE findings. PLAN body iter-2 revisions are surgical and contained to the iter-1 finding scope. The internal consistency (BLK-3 fix references at lines 211, 300, 624, 654, 1114, 1483, 2523; AC-B2a-14 + M-09 verification; down-migration parity at line 1689) is coherent.

## Verdict (final)

**PASS** — iter-2 revision applies BLK-3 + W-1 + W-2 + N-1 surgically with no regressions; L-4 APPROVED IN-SCOPE re-affirmed; Rule 3 runtime evidence captured (3 queries, all current pre-migration state matches PLAN body baseline assumptions). No new findings. No HALT triggers fired.

## Runtime evidence anchors

- **Query route**: Supabase Management API `/v1/projects/{ref}/database/query`
- **Auth**: `SUPABASE_ACCESS_TOKEN` (read-only token)
- **Read-only**: all 3 queries are SELECTs against `pg_indexes`, `public.client_portal_access`, `pg_proc`. No DDL, no DML.
- **Schema mutations**: none
- **Project ref**: egxkffodxcefwpqmwrur (Nightwork primary project)
- **Date**: 2026-05-21
