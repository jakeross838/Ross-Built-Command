# TD-NW-LIEN-CREATE — lien-release creation: manual/upload path + gate wiring

**Origin:** PART-2E F2E-1/F2E-2 (nwrp280) → nwrp281 §B disposition → **CORRECTED during the nwrp281 close-out wave**.
**Severity:** MEDIUM. **Deadline: before the first bank-submitted draw package** — NOT a dogfood-start blocker (BT tracks liens in parallel during dogfood, per nwrp281).

## CORRECTION to F2E-1 as originally filed

PART-2E said "no create path exists anywhere" — true for the src tree, **wrong for the system**: `draw_submit_rpc` (DB-side, invisible to src grep) **generates per-vendor lien_release rows at draw SUBMIT** (`status='pending'`, `through_date=period_end`, deduped per vendor×draw), and `draw_void_rpc` marks pending rows `not_required` on void. The generator has simply **never executed with effect**: no real draw has ever been submitted (both RB draws are draft; the smoke fixture draws were seeded directly as 'submitted', bypassing the RPC), and the 2E fixture submit had a vendor-less invoice. The route layer (list / PATCH transitions / bulk stamps / upload) sits on top, verified at the test layer (9/9 re-pinned guards).

**The Financials "Lien Releases · Live" tile is therefore inert until the first vendor-linked submit — not until a build.** First real submit should be treated as the generator's runtime validation moment (Rule 10: verify, don't infer — the 2D-1 playbook).

## Remaining scope (the actual gaps)

1. **Manual/upload-driven create** (nwrp281's shape: PDF in → row with release_type / vendor / draw linkage) — for releases that exist OUTSIDE the submit flow (Cindy's collected releases predating Nightwork draws, conditional/unconditional swaps, off-draw finals). Matches Ross Built's actual workflow.
2. **Generator runtime validation** at first real submit (per-vendor rows correct, amounts = vendor sums, dedupe holds).
3. **F2E-2 (folded): wire `require_lien_release_for_draw`** — zero consumers today. Interim honesty shipped in `8bed758`: code default FALSE + all 4 org rows false. Wiring decision at pickup: the gate's natural seat is draw SUBMIT (block when prior-draw pending releases exist) or PAYMENT (the payments/bulk read-gate already peeks at lien status — behavior with zero rows untested, map it here). Flip the default back deliberately WITH the consumer.
4. **Email loop:** submit-time `new_lien_releases` notification to accounting/admin exists (action route :225-231) — include in the validation pass.

## Resolution criteria

Upload path live + generator validated on a real submit + the gate wired with its default restored + the tile genuinely live. Natural host: F6 draw-family work, or a dogfood-period slice if Diane needs the upload path sooner.
