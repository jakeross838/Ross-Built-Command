# Stage 2B Entry Gate — Price Intel verification (COMPRESSED, LOW-tier)

**Date:** 2026-06-12
**Authorization chain:** nwrp266 §15 (revised order) + nwrp276 (LOW-tier compression approved in principle, $15 ceiling — "propose the compressed gate and I'll stamp it").
**Ceiling:** $15. **Status: AWAITING JAKE'S STAMP.**

## Compression rationale

Price Intel is read-only rendering over an already-walked surface: `/price-intel` is (a)-VERIFIED (walk row 20, P3 — "61 items, 6 pricing observations, 80 pending verification, $554 tracked"), the AppShell double-chrome on its routes was fixed and walk-verified this week, and no mutations or role gates live in this stage's scope. LOW-tier per the severity-tiering prototype: 2-reviewer-equivalent depth, SQL cross-checks + one authed spot-walk, no mutation matrix.

## DB-says (2026-06-12)

61 active items; **127** pricing_history rows (walk P3 said 126 — one row added since 2026-06-02; expected drift, not a finding unless the walk reproduces ≠127).

## Compressed matrix (5 rows)

| # | Test | Method |
|---|---|---|
| 2B-1 | P3 panel numbers reproducible from source rows (items / observations / pending-verification / tracked-$) | SQL replicating the dashboard aggregations, exact-match against the rendered values |
| 2B-2 | Verification queue counts: `/price-intel/verification` list total == DB pending rows | SQL + Jake spot-walk (same authed session as his outstanding verify items) |
| 2B-3 | Cost-lookup returns: one known item's price history renders all its pricing_history rows, cents-exact | SQL pull → Jake spot-walk compares one item detail |
| 2B-4 | Orphaned-surface confirmation: suggestions/scope-data/conversions data layers (real queries, zero reachable URL — F-Inv-1 Part D.4) still orphaned; no canonical route silently appeared | route-table grep (mechanical) |
| 2B-5 | Index posture on pricing_history aggregations | EXPLAIN ANALYZE (2C-6 pattern) |

**No mutations. No fixture prep. RB read-only throughout (trivially — nothing writes).**

Halt conditions: ceiling; any 2B-1/2B-3 mismatch >$0.00 (cents-exact standard) escalates from LOW to a finding + surface. Exit: PART-2B-PRICE-INTEL.md (compact — matrix + findings only).
