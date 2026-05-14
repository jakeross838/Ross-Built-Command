# Wave-E AI-logic review (qa-ai-logic)

Phase head: 018052b. Reference fixture: SYNTHETIC fixture-harness-org / smoke-* users (per Wave-D D-4 + iter-2 §4.4) — NOT Drummond.

## Q1 — Vendor null-guard correctness  →  PASS

Input: real production invoice, `vendor_id` NULL, `vendor_name_raw = "Doug Naeher Drywall"`. Forward reasoning: matching workflow requires the unmatched bill to render so a PM can attach a vendor. `notFound()` on null vendor would break that workflow.

Actual (src/app/financials/bills/[id]/page.tsx:168-173): `vendorEmbed` falsy → `{ id: "", name: row.vendor_name_raw ?? "Unknown Vendor" }`. Matches ITER-2-PATCHES.md §3.1.

Edge cases checked:
- Both `vendor_id` and `vendor_name_raw` null → renders "Unknown Vendor". Acceptable; PM will reject/match.
- Synthetic seed row (33333333-...-300000000001): vendor_id NULL, vendor_name_raw "Smoke Vendor Alpha" → renders "Smoke Vendor Alpha" — AC-E3-09 satisfied.
- Empty-string vendor_id passed downstream as prop: callable but matching submit must treat `""` as "no vendor" (NOTE — verify in Wave-B matching plan).

## Q2 — Soft-delete filter  →  PASS

`.is('deleted_at', null)` (line 83) is consistent with the "never delete records — soft delete only" rule. A tombstoned bill won't render. NOTE: page returns 404 for soft-deleted bills, indistinguishable from never-existed. Acceptable for review surface; audit/admin views may want a separate trashed-list (Wave 1.1 candidate, not blocking).

## Q3 — Org_id filter posture  →  PASS

`getCurrentMembership()` null → `notFound()` (line 64) before any DB hit. Defense-in-depth: explicit `.eq('org_id', membership.org_id)` (line 82) on top of RLS satisfies Architecture rule "RLS is backstop, not substitute." Cross-tenant id guess yields 404, not 403 — appropriate (don't leak existence). Returning 404 vs 401 for unauthenticated is acceptable here because middleware enforces auth before render; page-side notFound is belt+suspenders, not the primary gate.

## Q4 — maybeSingle vs single  →  PASS

`maybeSingle()` returns `{data:null,error:null}` on zero rows. Code (line 86-92) handles BOTH `error` AND `!row` paths → `notFound()`. Correct. Note: error path logs server-side, does NOT leak detail — good. `single()` would have thrown PGRST116 noise for the common "id doesn't exist" case; `maybeSingle()` is the right choice.

## Q5 — Seed re-apply idempotency  →  PASS WITH WARNING

`ON CONFLICT (id) DO UPDATE SET ... encrypted_password = EXCLUDED.encrypted_password` (smoke-seed.sql:147) rotates bcrypt hash on re-apply. ITER-2-PATCHES.md §2.1 step 5 + smoke-seed.sql header lines 60-72 document the orchestrator-side credentials-file rewrite. Procedure complete.

WARNING (not blocking): if orchestrator re-applies seed but FAILS to write credentials file (network/disk), the stored hash advances while the file stays stale — smoke can't auth. Mitigation already partly there (apply-then-write order), but a post-apply auth probe (one login round-trip) would be the canonical guard. NOTE for Wave-B harness hardening.

## State-machine / cents-math integrity

E-2/E-3 introduce no financial calculations, no status transitions, no aggregations. Seed `total_amount` values (1500000..5500000 cents = $15k..$55k) are static; statuses span the enum (`ai_processed`, `pm_review`, `qa_review`, `in_draw`, `paid`) but no transitions are exercised. Cents posture preserved.

## Verdict: PASS

All 5 questions resolve PASS. Wave-E is logic-correct against current schema + synthetic fixtures. One follow-up (post-apply auth-probe) noted for Wave-B.
