# F-Inv-1 Retro Sweep — tightened (a)-CANDIDATE rule applied to the unwalked candidate set

**Date:** 2026-06-11
**Authorization:** nwrp266 §31 (Step 3) → nwrp269 §18 (re-projection) → nwrp270 §7 (authorized at $30 cap, sequenced after AppShell fix ship).
**Inputs:** PART-1-INVENTORY.md §1.1.4 (original 73-candidate set) + PART-1.5-WALK.md §F-Inv-1 (6 sub-rules) + lessons L7 (re-export grep-invisibility, captured this session).
**Method:** mechanical re-run of the classifier over all 204 `src/app/**/page.tsx` files (original grep output in /tmp was not preserved — sub-rule 1 makes the re-run the source of truth). Two passes: pass 1 reproduced the original single-line pattern; pass 2 added the amendments proposed below. Deltas between passes are themselves findings.

---

## PART A — The 6 sub-rules (verbatim from PART-1.5-WALK.md §F-Inv-1) — FOR JAKE'S SCAN

> 1. **Mechanical classifier output is the source of truth.** The grep-based data-call detection produces the candidate set. No hand-picking, no extrapolation from route names. If a file isn't in the grep result, it can't be (a)-CANDIDATE.
>
> 2. **Per-route file evidence required for any (a)-CANDIDATE.** Each route flagged (a)-CANDIDATE must cite a specific file path + line of the data call (e.g., `supabase.from("X").select(...)` at line N, OR `fetch("/api/...")` at line M). Inventory entry includes the citation; future readers can verify.
>
> 3. **Mechanical filter for placeholder patterns (auto-classify as (c)):**
>    - Files importing `NwPlaceholderCard` → auto (c). Grep: `import NwPlaceholderCard`.
>    - Files importing `CALDWELL_*` from `_fixtures/` → auto (c) (Stage 1.5c thin-wrapper pattern). Grep: `from "@/app/design-system/_fixtures`.
>    - Files with only `<NwPlaceholderCard ... wave="<F1|Wave 1.1-Lite|...>"/>` JSX → auto (c).
>    - Files that import `notFound` AND look up an ID against a hardcoded fixture set → auto (c) (fixture thin-wrapper pattern). Grep: `notFound` + fixture-find pattern.
>
> 4. **Runtime verification per nwrp256 modification 5.** (a)-CANDIDATE upgrades to (a)-VERIFIED only after an authed walk on Production confirms the route renders real data. Stage 1.5 walk format (split-driver: navigator + DB-cross-checker) is the canonical mechanism.
>
> 5. **Launch-criticality is ORTHOGONAL to classification.** A route can be both launch-critical AND (c) scaffold — that means it's a launch-blocker that needs FIX (wire-up), not a misclassification. Launch-criticality drives prioritization of Stage 1.5 walks; classification drives candidate-set selection.
>
> 6. **Inline self-check on inventory authoring:** Before publishing any (a)-CANDIDATE row, run `grep -lE "supabase\\.|fetch\\(/api/|await supabase" <file>` on the file. If grep returns no match, the file is NOT (a)-CANDIDATE — it's (c) regardless of how launch-critical the route name sounds.

### Soft-language assessment (executor's read; Jake tightens)

The 6 rules are MUST-grade with one soft spot: **sub-rule 2's "(e.g., ...)" example forms** leave room to cite a line that LOOKS like a data call without verifying it's executable code. This sweep hit that exact case (budget page's comment header contains `supabase.from("budget_lines")` as prose — pass 1 cited it; see Part B). Proposed tightening: *"MUST cite exact file:line of an EXECUTABLE data-call statement — comment text, docstrings, and type-only imports do NOT qualify."*

### Proposed sub-rule amendments (from this sweep's empirical misses — REQUIRE language; pending Jake's scan)

- **6b — Re-export resolution (L7).** Before classifying any route, the classifier MUST resolve `export { default } from "@/app/..."` indirection (one hop) and classify against the RESOLVED file. Grep the TARGET, not the stub. Empirical proof: all 7 `financials/*` stubs + 3 `price-intel/*` stubs carry real data-call surfaces invisible to route-directory grep; the original 73-count missed every one of them.
- **6c — Multiline-chain + import-level patterns.** The data-call grep MUST include import-level signals (`createServerClient|createBrowserClient`) and call-level `\.from\("` in addition to `supabase\.`. Single-line `supabase\.` alone is INSUFFICIENT. Empirical proof: `cost-intelligence/suggestions/page.tsx` chains `supabase\n  .from(...)` across lines — pass 1 missed it entirely.
- **6d — Comment-line exclusion.** Data-call grep hits on lines beginning `//` or inside block comments MUST be excluded before citation. Empirical proof: `jobs/[id]/budget/page.tsx:26` (pass-1 false positive — the reframe header documents the FUTURE wiring query in prose). Sub-rule 3 placeholder classification takes precedence over any comment-text hit.
- **6e — Second-hop component check.** When a route file has no data call, the classifier MUST check same-directory components the page imports (`./XManager`, `./XForm`, `./XDashboard` pattern) before declaring no-data. Empirical proof: 6 `settings/*` pages + `cost-intelligence/codes` mount sibling Manager/Form components that hold the data calls.

---

## PART B — Mechanical re-run results

| Metric | Original (PART-1-INVENTORY §1.1.4) | This sweep (pass 2) |
|---|---|---|
| Total page.tsx files | 203 routes | 204 |
| (a)-CANDIDATE files (data-call hit, resolved) | 73 | **90** |
| — of which walked at Stage 1.5 | 21-route set (≈23 files in candidate set) | 23 |
| — of which UNWALKED | "52" (73−21, approximate) | **67** |

The 73→90 delta decomposes mechanically: +10 re-export stubs resolved to data-call targets (6b), +1 multiline-chain miss (6c), +6 second-hop Manager components (6e), +2 routes added/changed since the 2026-05-29 inventory snapshot, −1 comment-only false positive removed (6d, budget), −2 staleness corrections (financials + admin section overviews — see Part E).

---

## PART C — NEW FINDING (F10): /financials/pay-apps/[id] + /print are Caldwell fixture thin-wrappers shadowing the REAL legacy implementation

**The highest-value catch of the sweep.** Same defect shape as F1-budget, on a worse path:

- `src/app/financials/pay-apps/[id]/page.tsx:30-31` — `CALDWELL_DRAWS.find((d) => d.id === params.id)` → `notFound()` on miss. Real Ross Built draw UUIDs never match `caldwell-*` fixture IDs → **404**.
- `src/app/financials/pay-apps/[id]/print/page.tsx` — identical pattern (CALDWELL_DRAWS import + notFound).
- **The broken user flow exists TODAY:** `/financials/pay-apps` (walk row 15, VERIFIED) lists 2 REAL draws (Fish #1, Dewberry #1) → click either → `/financials/pay-apps/{real-uuid}` → fixture lookup miss → 404. The walk never clicked INTO a pay-app (detail page wasn't in the 21-route set), so this never surfaced.
- **Worse than F1-budget:** the fully-implemented legacy draw detail (`src/app/draws/[id]/page.tsx`, real supabase calls at line 114) 308-redirects to the fixture wrapper (`next.config.mjs:101`). The IA rename pointed a REAL surface's traffic at a FIXTURE wrapper. Contrast: `financials/bills/[id]` had the same Plan-3 origin but was **wired to real invoices in Wave-E Plan E-3** (page header documents it; data call at line 68; only a type-only `CaldwellInvoice` import remains). Pay-apps detail + print never got the E-3 treatment.
- **Classification:** (c) fixture-thin-wrapper, launch-critical-FIX-required (sub-rule 5 orthogonality — exactly the F1-F4 pattern).

**Fix options (NOT executed — Step 3 is docs-only; Jake's call):**
1. **E-3-style wiring** — replace fixture lookup with org-scoped supabase query mounting the existing `DrawApprovalView` (mirror of how E-3 wired bills/[id]). Honest scope: the legacy `/draws/[id]` page already implements the real data layer — port it behind the View. Est. $10-20 as its own small fix.
2. **Interim re-export of the legacy page** (the F5/pay-apps-new pattern) — NOT recommended as-is: `draws/[id]/page.tsx` still mounts its own AppShell (3 branch mounts, lines 177/186/268 — deliberately out of the nwrp270 fix scope), so a bare re-export under `financials/layout.tsx` would recreate the double-chrome defect (L6/L7 lesson applied prospectively). Requires the same AppShell strip first.
3. **Defer to F6 (Pay App engine)** with an honest NwPlaceholderCard reframe of the detail page meanwhile (F1-budget treatment) — stops the lying-404 but removes draw review entirely until F6.

Recommendation: option 1 — bills/[id] proves the pattern and the data layer exists. Whatever the disposition, file under TD-NW-PER-JOB-TAB-WIRING's family or its own TD entry.

## PART D — Disposition table (90 candidates, grouped)

Legend: **KEEP** = (a)-CANDIDATE confirmed, citation valid, RUNTIME-PENDING per sub-rule 4. **WALKED** = in Stage 1.5 walk set; disposition lives in PART-1.5-WALK.md. **DEAD-SRC** = source file 308-redirected away; candidacy carried by the canonical row cited. **(e)** = middleware/flag-gated. **(c)** = downgrade.

### D.1 Walked at Stage 1.5 — dispositions authoritative in PART-1.5-WALK.md (23)

| Route | Resolved source | Citation | Walk |
|---|---|---|---|
| `/` | `page.tsx` | :15 | row 1 |
| `/login` | `login/page.tsx` | :14 | row 2 |
| `/today` | `today/page.tsx` | :86 | row 3 |
| `/jobs` | `jobs/page.tsx` | :97 | row 4 |
| `/jobs/[id]` | `jobs/[id]/page.tsx` | :155 | row 5 (P4) |
| `/jobs/[id]/budget` | `jobs/[id]/budget/page.tsx` | — (placeholder) | row 6 → F1, reframed `2033aee` |
| `/jobs/[id]/change-orders` | `jobs/[id]/change-orders/page.tsx` | :69 | row 9 (P1) |
| `/jobs/[id]/purchase-orders` | `jobs/[id]/purchase-orders/page.tsx` | :65 | row 10 (P6) |
| `/jobs/new` | `jobs/new/page.tsx` | :48 | row 12 (P5) |
| `/financials/bills` | → `invoices/page.tsx` | :152 | row 14 (F9 closed) |
| `/financials/pay-apps` | → `draws/page.tsx` | :38 | row 15 (F8 caveat) |
| `/invoices/[id]` | `invoices/[id]/page.tsx` | :203 | row 16 (P2) |
| `/invoices/[id]/qa` | redirect stub → `/invoices/[id]` | — | row 17 (see Part E correction) |
| `/financials/pay-apps/new` (+ `/draws/new` 308) | → `draws/new/page.tsx` | :138 | row 18 F5 → fixed `1d49103`, verified nwrp267 |
| `/change-orders/[id]` | `change-orders/[id]/page.tsx` | :68 | row 19 (FLAG-resolved) |
| `/price-intel` (+ `/cost-intelligence` 308) | → `cost-intelligence/page.tsx` | :90 | row 20 (P3) |
| `/admin/users` · `/admin/cost-codes` · `/admin/billing` · `/admin/owner-portal-tokens` | own pages | :33 · :23 · :73 · :97 | row 21 |

### D.2 Unwalked — KEEP (a)-CANDIDATE, citation confirmed (RUNTIME-PENDING) (37)

| Route | Resolved source | Citation |
|---|---|---|
| `/jobs/[id]/change-orders/new` | same | :78 |
| `/jobs/[id]/draws` | same | :46 |
| `/jobs/[id]/internal-billings` | same | :186 |
| `/jobs/[id]/invoices` | same | :47 |
| `/jobs/[id]/lien-releases` | same | :68 |
| `/jobs/[id]/purchase-orders/new` | same | :62 |
| `/financials/bills/[id]` | same (E-3 real-wired; `CaldwellInvoice` import is type-only residual) | :68 |
| `/financials/bills/qa` | → `invoices/qa/page.tsx` | :30 |
| `/financials/bills/queue` | → `invoices/queue/page.tsx` | :168 |
| `/financials/lien-releases` | → `invoices/liens/page.tsx` | :68 |
| `/financials/payments` | → `invoices/payments/page.tsx` | :51 |
| `/price-intel/cost-lookup` | → `cost-intelligence/lookup/page.tsx` | :83 |
| `/price-intel/verification` | → `cost-intelligence/verification/page.tsx` | :129 |
| `/cost-intelligence/items` (legacy, unredirected) | same | :38 |
| `/cost-intelligence/items/[id]` (legacy, unredirected) | same | :96 |
| `/platform-admin` family (11): `audit` :138 · `cost-intelligence` :129 · `feedback` :160 · `feedback/[id]` :67 · `items/[id]` :51 · `organizations` :45 · `organizations/[id]` :68 · `support` :120 · `support/[id]` :65 · `users` :44 · `users/[id]` :29 | own pages | as listed |
| `/admin/platform` legacy dual-path family (12): root :24 + same 11 sub-routes | own pages | as listed |
| `/signup` :18 · `/onboard` :12 · `/forgot-password` :16 · `/pricing` :126 · `/proposals/review/[extraction_id]` :96 | own pages | as listed |

Notes: the `notFound` imports across detail pages (feedback/[id], items/[id], organizations/[id], support/[id], users/[id], proposals) are normal not-found handling on REAL queries — sub-rule 3's auto-(c) requires notFound + fixture-set lookup combined, which none of these have. The `/admin/platform/*` ↔ `/platform-admin/*` dual-path duplication (24 files for 12 surfaces) is a consolidation TD candidate, not a classification problem — middleware gates both prefixes identically.

### D.3 Unwalked — DEAD-SRC (308-redirected; candidacy carried by canonical) (16)

`invoices/page` `queue` `qa` `payments` `liens` (→ financials/*) · `draws/page` (→ /financials/pay-apps) · `draws/new` (→ pay-apps/new) · `draws/[id]` (→ pay-apps/[id] — **lands on the F10 fixture wrapper**) · `dashboard/page.tsx:87` (→ /today) · `cost-intelligence` root/`lookup`/`verification` (carried by price-intel rows) · `settings/billing:66` `cost-codes:22` `team:40` `usage:79` (→ /admin*)

### D.4 Unwalked — orphaned-by-redirect REAL surfaces (Q1.1.4A follow-on) (7)

These have real data calls but NO canonical URL serves them — the redirect map routes their legacy URL to a DIFFERENT surface:

| Orphaned surface | Citation | Legacy URL 308s to |
|---|---|---|
| `cost-intelligence/suggestions/page.tsx` | :20 (caught only by 6c) | `/price-intel` root |
| `cost-intelligence/scope-data/page.tsx` | :57 | `/price-intel` root |
| `cost-intelligence/conversions/page.tsx` | :114 | `/price-intel/cost-database` (an F5 placeholder!) |
| `cost-intelligence/codes` → `CodesManager.tsx` | :158 | `/admin/cost-codes` (own real impl — acceptable overlap) |
| `settings/admin` → `AdminDashboard.tsx` :50 · `settings/company` → `CompanySettingsForm.tsx` :36 · `settings/financial` → `FinancialSettingsForm.tsx` :57 · `settings/internal-billings` → `InternalBillingTypesManager.tsx` :121 · `settings/workflow` → `WorkflowSettingsForm.tsx` :98 | as listed | `/admin` root or `/admin/workflow-customization` ("Coming F3" placeholder — the TD-WE-05 pattern) |

Disposition: classification-wise these are (a)-CANDIDATE code with zero reachable URL — functionally dead code with live data layers. Folds into the existing dead-code custodian questions (Q1.1.2A/B); the suggestions/scope-data/conversions trio is Price-Intel-roadmap relevant (F5 may resurrect or delete).

### D.5 Gated (e) / downgrades (c) (7)

| Route | Disposition |
|---|---|
| `/company/overview` :65 | **(e)-gated** (COMPANY flag off → middleware 404). Candidate-on-unhide. (AppShell strip in `34ac517` touched it; inert while gated.) |
| `/owner/[token]/pay-apps/[id]` (fetch in `AcknowledgePayAppButton.tsx`) | **(e)-gated** (OWNER_PORTAL flag family, gate verified L4-L5). |
| `/financials/pay-apps/[id]` + `/print` | **(c) fixture-wrapper — F10 DEFECT, launch-critical-FIX-required** (Part C). |
| `/financials/reconciliation` | **(c) fixture strawman** — renders `CALDWELL_RECONCILIATION_PAIRS` to any authed member; intentional Stage-1.5c strawman, no 404 risk. Note: fixture dollar-shape exposure is internal-authed-only (single-tenant pre-launch) — LOW now; revisit at multi-tenant onboarding. |
| `/jobs/[id]/budget` | **(c) placeholder** (already corrected via walk F1; pass-1 citation :26 was comment text — 6d). |

Remaining CALDWELL-fixture per-job wrappers (`documents/[documentId]`, `mobile-approval`, `schedule`) and all NwPlaceholderCard placeholders were never in the candidate set — correctly (c) since Stage 1.5c.

---

## PART E — PART-1-INVENTORY corrections (applied via correction block appended to that doc)

1. **§1.1.4 count 73 → 90** per Part B decomposition; citation column now mandatory per sub-rule 2.
2. **`financials/page.tsx`**: "(a)-CANDIDATE — one supabase call for pending count" is STALE at HEAD — zero data calls (Phase 1 T5 static 5-Card grid). Walk row 13 PASS stands as a render check. Reclass: (c)-static section overview.
3. **`admin/page.tsx`**: same staleness — zero data calls (static Card grid, D-060 canonical destination). Walk row 21 PASS stands. Reclass: (c)-static.
4. **`invoices/[id]/qa/page.tsx`**: pure `redirect()` stub to `/invoices/[id]` — not a candidate. Walk row 17 "QA review surface renders" actually verified the redirect target.
5. **NEW F10** (Part C): `/financials/pay-apps/[id]` + `/print` fixture wrappers; §1.1.4's "draws/* 3 candidates" implicitly treated the family as wired.
6. **Orphaned-real-surface cluster** (Part D.4) added to the Q1.1.2A/Q1.1.4A dead-code disposition queue.

## Cost

Step 3 actual: **~$12-16** (mechanical passes + spot-reads + this doc + inventory correction + commit) — within the re-projected $18-28 band, well under the $30 cap. The honest-projection exercise (nwrp269 item 2) was right to flag the original $10-15 as understated, mostly for table-authoring volume; the docs-only nature kept deploy-cycle drift at zero as predicted.
