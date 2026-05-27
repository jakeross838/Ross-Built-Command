# Manual setup checklist — internal-launch-hide

**Status:** COMPLETE 2026-05-26 — Item 1 validated; Jake accepted empty as functionally equivalent to `false` per AskUserQuestion. See `.planning/expansions/internal-launch-hide-SETUP-COMPLETE.md`.
**Originally generated:** 2026-05-26

## Validation outcome (re-invocation 2026-05-26)

**Item 1 — Vercel env-var add:** **PARTIAL PASS.**

- ✓ **Presence:** all 6 flags exist in BOTH Production AND Preview environments. Verified via `vercel env ls production` + `vercel env pull` for both envs.
- ✗ **Value:** all 6 flags set to empty string `""` (not `false` as instructed in the original Item 1 steps).

**Functional analysis:** the W.1 fail-closed pattern at `src/hooks/use-current-role.ts:67-69` checks `process.env.VAR !== "true"`. Both `""` (empty) and `"false"` (literal) evaluate to "not true" → feature OFF. **Code behavior identical.** The difference is purely ops-clarity in the Vercel dashboard:
- `""` displays as "Encrypted" / empty value → reader can't tell at-a-glance whether it's intentionally false or accidentally cleared
- `"false"` displays as "Encrypted" / `false` when pulled → unambiguous intent

Per the strict letter of the original validation AC ("show value `false` (not unset, not `true`, not blank)"), this fails. Per the spirit of the AC (fail-closed default is correctly configured), this passes.

**Jake's call needed via AskUserQuestion in conversation.** Two paths:
- **(a) Accept empty as equivalent to false** — write SETUP-COMPLETE.md and proceed; no rework. Recommended for shipping speed; reversibility AC still verifiable via flip-to-`true`-test during `/nightwork-qa`.
- **(b) Re-set all 6 to explicit `false`** — Jake runs `vercel env rm` + `vercel env add` cycle for each, ~3–5 minutes; cleaner audit trail in Vercel dashboard.



After completing the item below, run `/nightwork-auto-setup internal-launch-hide` again to validate and produce `SETUP-COMPLETE.md`.

---

## Item 1: Add 6 `NEXT_PUBLIC_FEATURE_*` env vars to Vercel (Production + Preview)

**Why:** Phase 1 HIDE relies on env-var-as-feature-flag pattern per the locked scope + W.1 precedent (`NEXT_PUBLIC_AUTH_STATE_LISTENER`). The 6 flags gate the 4 hidden top-nav sections + Owner Portal + F1 org-wide Financials views. Default behaviour is **fail-closed** (env-var unset OR explicitly `false` = feature OFF — see EXPANDED-SCOPE §4 row "Graceful degradation" + AC #8). Adding them now to Vercel:
- Makes the reversibility AC testable (flip one to `true` in a Preview deploy → confirm route comes back; flip back to `false`).
- Surfaces the gated surfaces in Vercel's env-var dashboard so future-Jake (or a hotfix-Jake) knows exactly which flags exist.
- Avoids the "is this env var supposed to be unset or did I forget it?" ambiguity at incident-response time.

**Time estimate:** ~5–10 minutes total (CLI + Preview API fallback if needed).

**The 6 flags:**

| Env var name | Hides | Default |
|---|---|---|
| `NEXT_PUBLIC_FEATURE_OWNER_PORTAL` | `/owner/*` + `/api/owner-portal/*` (404 on direct URL) | `false` |
| `NEXT_PUBLIC_FEATURE_PIPELINE` | `/pipeline/*` + Pipeline section card | `false` |
| `NEXT_PUBLIC_FEATURE_COMPANY` | `/company/*` + Company section card | `false` |
| `NEXT_PUBLIC_FEATURE_REPORTS` | `/reports/*` + Reports section card | `false` |
| `NEXT_PUBLIC_FEATURE_PRICE_INTEL_F5` | 7 `/price-intel/*` sub-routes (anomaly-review, bid-comparison, cost-database, material-orders, selections-catalog, vendor-performance, verification) — root `/price-intel` stays (re-exports working `/cost-intelligence` hub) | `false` |
| `NEXT_PUBLIC_FEATURE_FINANCIALS_F1_VIEWS` | `/financials/change-orders` + `/financials/purchase-orders` (org-wide views — both Card grid AND middleware 404) | `false` |

All 6 set to **explicit `false`** (NOT unset — sets up audit-trail clarity in the Vercel dashboard).

### Steps — Production (vercel CLI works)

For each of the 6 flags, run:

```bash
vercel env add NEXT_PUBLIC_FEATURE_OWNER_PORTAL production
# When prompted "What's the value of NEXT_PUBLIC_FEATURE_OWNER_PORTAL?", enter: false
# Press Enter
```

Repeat 5 more times with the other flag names. Expected total: ~3 minutes.

### Steps — Preview (CLI may hit `git_branch_required` per D-T7)

The `vercel env add ... preview` CLI flow requires `git_branch_required` in non-interactive mode (per `MASTER-PLAN §11 D-T7-VERCEL-CLI-API-FALLBACK`). Two paths:

**Path A — Vercel dashboard UI (recommended, ~3 minutes):**
1. Open https://vercel.com/<your-team>/<your-project>/settings/environment-variables
2. Click **Add New** for each of the 6 flags
3. Set name (e.g. `NEXT_PUBLIC_FEATURE_OWNER_PORTAL`), value `false`, environment **Preview** (check the box)
4. Click **Save**
5. Repeat for the other 5 flags

**Path B — Vercel API direct POST (if you prefer CLI):**
Per the D-T7 fallback documentation in MASTER-PLAN.md §11. Use this if you have your Vercel token ready and want to script it:
```bash
# Pseudo — adjust to your actual Vercel API helper
for flag in OWNER_PORTAL PIPELINE COMPANY REPORTS PRICE_INTEL_F5 FINANCIALS_F1_VIEWS; do
  vercel env add "NEXT_PUBLIC_FEATURE_$flag" preview --git-branch=main
  # When prompted for value: false
done
```

### Capture

After completion, run `vercel env ls` (or check the dashboard) and confirm all 6 flags appear in BOTH `Production` AND `Preview` environments with value `false`.

### Validation (runs automatically when you re-invoke `/nightwork-auto-setup internal-launch-hide`)

- `vercel env ls --environment=production` lists all 6 `NEXT_PUBLIC_FEATURE_*` flags
- `vercel env ls --environment=preview` lists all 6 `NEXT_PUBLIC_FEATURE_*` flags
- All 12 records (6 flags × 2 envs) show value `false` (not unset, not `true`, not blank)

If validation fails: the re-invocation updates THIS file flagging which specific flag×env combination is missing OR has wrong value. Add the missing/wrong one and re-invoke again.

---

## After this item completes

Run: `/nightwork-auto-setup internal-launch-hide`

On 100% pass, the command writes `.planning/expansions/internal-launch-hide-SETUP-COMPLETE.md` and Phase 1 is cleared for `/np internal-launch-hide` dispatch.

---

## Notes (non-action — read once before doing the item)

- **Fail-closed default already covered by code-side AC #8** — Phase 1 ships without depending on these env vars existing in Vercel for the HIDDEN-by-default behaviour (env-var unset is treated as `false` per `src/hooks/use-current-role.ts:67-69` pattern). The env-var add is for **reversibility testing** + **operational clarity**, not for hiding the routes.
- **The reversibility AC (#6) is tested during `/nightwork-qa`** — once env vars are added, flip one to `true` in Preview, redeploy, confirm route re-exposes. Flip back to `false`. That test will fail if env vars are not added.
- **Do NOT add `NEXT_PUBLIC_FEATURE_YOUR_DAY`** — the "Your Day" today-card replacement is Phase 2 (UI-FINALIZE) work, not a HIDE flag. EXPANDED-SCOPE §3 row 2 explicitly: "Recommend: do NOT add a `NEXT_PUBLIC_FEATURE_YOUR_DAY` flag. Replacement is a real Phase 2 build (Open Invoices Today + Pay Apps Due This Week aggregate), not a hide. Flag here would be cosmetic over-engineering."
- **`/people/clients` working route stays exposed** even though `/people/*` is generally hidden — confirm with the plan-author during `/np` whether clients gets a carve-out in the middleware regex OR whether the route also goes behind a flag. Per AC #2, clients-route handling TBD at `/gsd-discuss-phase`.
