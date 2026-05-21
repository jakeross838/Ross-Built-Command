# Plan-Review B-2a iter-2 — Multi-tenant architect

**Captured 2026-05-21 from agent inline return** (agent disk-write suppressed by its system prompt; transcribed for audit-trail persistence).

**Verdict: PASS** — iter-2 revision does NOT regress BY-CONSTRUCTION posture. All iter-1 PASS items preserved; BLK-4 REVOKE/GRANT pairs match 00074 role lists verbatim (no widening); Latitude #3 + #4 dispositions recorded; N-5 + N-1 captured.

## Verification table — iter-1 PASS items (regression check)

| Item | Pillar | iter-1 verdict | iter-2 regression check | Evidence |
|---|---|---|---|---|
| Composite FK `(org_id, client_id) REFERENCES clients(org_id, id) ON DELETE SET NULL` (D-01) | Tenant key on every row + No cross-tenant JOIN | PASS | PRESERVED | Lines 517-526 migration body (`NOT VALID` then `VALIDATE`); line 108 M-01 mechanical criterion; line 470 §6.a decision header. Same-org enforced BY Postgres constraint. |
| `getScopedOwnerPortalClient(resolvedToken)` helper (D-13) | Tenant filter on every query | PASS | PRESERVED | Lines 828-876 helper source; line 2529 §6.e acceptance. B-2b consumers GATED by N-5 grep gate. |
| `assertDrawBelongsToToken(drawId, resolvedToken)` helper with pinned SQL (D-14) | No cross-tenant JOIN | PASS | PRESERVED | Lines 878-940 helper source (PostgREST `jobs!inner(client_id, org_id)` embed); line 189 D-01 mechanical criterion. |
| `create_client_portal_invite` RPC re-definition (BLK-4 REVOKE/GRANT) | Per-tenant integrations | PASS | PRESERVED | Lines 1290-1293: `REVOKE ... FROM PUBLIC` + `GRANT ... TO authenticated`. 00074:441-443 reference role: `authenticated`. EXACT match — no widening. Admin function correctly NOT granted to `anon`. |
| `submit_client_portal_message` RPC re-definition (BLK-4 REVOKE/GRANT) | Per-tenant integrations | PASS | PRESERVED | Lines 1348-1351: `REVOKE ... FROM PUBLIC` + `GRANT ... TO anon`. 00074:496-497 reference role: `anon`. EXACT match. |
| `mark_client_portal_message_read` RPC re-definition (BLK-4 REVOKE/GRANT) | Per-tenant integrations | PASS | PRESERVED | Lines 1404-1407: `REVOKE ... FROM PUBLIC` + `GRANT ... TO anon`. 00074:545-546 reference role: `anon`. EXACT match. |
| NEW `cleanup_owner_portal_rate_limit()` RPC GRANT | Per-tenant integrations | NEW | CORRECTLY SCOPED | Lines 1442-1443: `GRANT ... TO service_role` only. Anon + authenticated blocked. |
| NEW `record_owner_portal_request(...)` RPC GRANT | Per-tenant integrations | NEW | CORRECTLY SCOPED | Lines 1470-1471: `GRANT ... TO service_role` only. |
| NEW `owner_portal_rate_limit` table RLS posture | Tenant key on every row (rate-limit per-token by design) | NEW | NO-POLICY DENY DEFAULT | Lines 1446-1448: `ENABLE ROW LEVEL SECURITY` + `GRANT SELECT, INSERT, UPDATE ... TO service_role` + no policies → anon/authenticated blocked at RLS layer. |
| Index posture LOCKED per D-04 (full covering + non-partial token-hash) | No timing oracle | PASS | PRESERVED | Lines 640-650 + 1207-1208 (`WHERE client_id IS NOT NULL` predicate, NOT `revoked_at IS NULL`); line 1483 COMMENT captures BLK-3 non-partial token-hash index. M-07 + M-09 mechanical criteria. |

## Latitude #3 + #4 disposition verification

| Latitude | iter-1 surface | iter-2 status | Location | Decision body |
|---|---|---|---|---|
| **L-3 `revoked_seq`** | DISPOSITION REQUIRED | **APPROVED Option A** | Line 242 header | Lines 244-246 disposition + multi-tenant-architect reasoning ("Option A is the cleanest BY-CONSTRUCTION re-invitation semantics. Option B violates the soft-delete rule. Option C is mechanically blocked by nwrp202 §4 timing-oracle prohibition.") |
| **L-4 sliding-window 90→1-year in 2 RPCs** | DISPOSITION REQUIRED | **APPROVED IN-SCOPE** | Line 262 header | Lines 264-266 disposition + 3-reviewer alignment (security + multi-tenant + ai-logic). Scope-completeness CONFIRMED via ai-logic-tester Q8 query. Both RPC bodies authored verbatim at lines 1299-1346 + 1358-1402 with `'1 year'` sliding-window UPDATEs. |

"ITER-1 DISPOSITION REQUIRED" markers REMOVED — both Latitude entries carry **APPROVED** prefix headers with cross-reviewer alignment citations.

## N-5 + N-1 verification

| Note | Required at | Location | Body |
|---|---|---|---|
| **N-5 (B-2b plan-review preconditions / grep gate)** | Jake checklist + Hand-off §13.4 | BOTH PRESENT | Line 2537 + Line 2548: B-2b plan-review iter-1 MUST add grep-based gate blocking `createServiceRoleClient()` / `createServerSupabaseClient()` invocations in `src/app/api/owner-portal/**` files. |
| **N-1 (`internal_billing_types` cosmetic clarification)** | Frontmatter line 73 + §6.a precedent table line 477 | BOTH PRESENT | Line 73: filename retains `internal_billings` per other tables in same migration. Line 477: "00038:41 in `internal_billing_types`". Cosmetic citation aligned. |

## Newly surfaced findings

**None — BY-CONSTRUCTION posture preserved end-to-end.**

Adversarial walkthrough (cross-tenant revoke attempt):
1. Middleware allows `/api/owner-portal/*` per D-12.
2. Route handler calls `getCurrentMembership()` → org_id = A.
3. `updateWithLock` filters `org_id = membership.org_id = A` — tenant-B token NOT in scope.
4. Query returns 0 rows; cross-tenant revoke BY CONSTRUCTION impossible.

Cross-reviewer factual disagreement check (Rule 9): NONE. multi-tenant-architect aligned with security-reviewer on L-3 Option A; with security + ai-logic on L-4 IN-SCOPE; with rls-auditor on B-5 PUBLIC_PATHS extension; no contradictory canonical-state claims surfaced in iter-2 revision.

## Summary

B-2a-PLAN.md iter-2 revision PASSES multi-tenant BY-CONSTRUCTION re-review. The 3 RPC REVOKE/GRANT pairs added per BLK-4 match 00074 role lists verbatim. The 2 new SECURITY DEFINER functions are correctly scoped to `service_role` only. Composite FK, helpers, Latitude dispositions, N-5, and N-1 all verify. No newly surfaced findings. No Rule 9 disagreements.
