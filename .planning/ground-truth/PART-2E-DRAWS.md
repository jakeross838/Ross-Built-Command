# PART 2E — Draws / Pay Apps / Lien Releases results (trimmed per nwrp279/280)

**Date:** 2026-06-12 · **Spend:** ~$12-14 of $18 · **Verdict: hard-floor rows both land; Row 3 cut per its sacrificial clause; three MEDIUM-or-below findings filed under auto-proceed; zero HIGH; cleanup exact.**

## Row 1 — lien adjudication + first-ever flow exercise

**(a) Test debt: STALE GUARDS, not a regression.** The bulk route refactored to table-driven form (`action → newStatus/timestampField`, single `.update({status: newStatus, [timestampField]: nowIso, status_history: [...]})` at route :105-110) — behavior fully intact; the 3 guards' literal regexes missed it. Re-pinned to the mapping + assignment shape (in-scope test-layer fix per the gate): **9/9 PASS**. No production change needed; the mid-stage nod boundary never engaged.

**(b) The anticipated finding fires — F2E-1 (MEDIUM):** the lien flow CANNOT be exercised because **no create/generation path exists anywhere** — API surface is list/PATCH/bulk/upload only; zero `lien_releases` inserts in the entire src tree (multiline grep). Zero rows have ever existed because nothing can make one. Intended source per CLAUDE.md Phase-3: draw compilation generates per vendor×draw. **F2E-2 (LOW):** `require_lien_release_for_draw` (default TRUE) has ZERO consumers — declared-unwired; naively wiring it against the unpopulatable table would block every draw. The payment-path lien read-gate (payments/bulk :93-98) exists; behavior with zero rows untested. All file to the F6 draw-family TD at scoping (per (b) ledger in the canonical doc).

## Row 2 — full draw lifecycle mutation (fixture)

- **Business-rule catch (positive):** one-open-draw-per-job enforced — create on Smoke Job Beta 400'd ("Draw #1 still submitted — approve or void first"). Re-planned per the rule.
- **Forward path (Smoke Job Gamma, ZZ-2E draw `515bc163`):** create (200, draw #1) → submit → approve → void — all legal-transition-gated (ACTION_MAP), 4 status_history entries + 5 activity rows, zero draw_line_items written (computed-on-read ✓).
- **Reject path (Beta fixture draw, net-zero):** send_back (submitted→draft) → submit (→submitted, exact original status). Audit residue (2 history entries) stays by design.
- **F2E-3 (MEDIUM):** voiding a draw does NOT unlink its invoices — Gamma's invoice kept `draw_id` pointing at the void draw; the wizard's picker likely filters drawn invoices → potential un-drawable orphans after a void. Filed (F6 family); my cleanup restored it explicitly.
- Cleanup: ZZ draw soft-deleted, invoice draw_id restored, fixture draw at exact original status. **Exact-return holds.**

## Row 3 — export parity: CUT (sacrificial clause)

The driver's response-slice made the cheap parity diff a ~$2-3 row; export shares the canonical draw-calc helper chain (code-read). Cut per the gate; the leg stays in the canonical doc's honest-negatives list.
