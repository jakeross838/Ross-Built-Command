# AppShell Ownership Investigation — double-chrome defect scope

**Date:** 2026-06-11
**Trigger:** nwrp268 (Jake observed double chrome on /price-intel during F5 verification walk) + nwrp269 HALT (investigation was skipped before Step 2; required before F1 incognito verify).
**Cost cap:** $10 (nwrp268). Actual: ~$3-5 (greps + file reads, no builds/deploys).
**Verdict summary:** 5 user-reachable routes render double chrome. One root cause. F1 reframe is CLEAN — no amendment needed. Fix scope: 12 files, one commit, mechanical.

---

## Root cause

`AppShell` (`src/components/app-shell.tsx`) = NavBar + conditional JobSidebar. NavBar internally mounts TrialBanner (`src/components/nav-bar.tsx:478`). Root layout (`src/app/layout.tsx`) mounts NO chrome — AppShell is the only chrome source. Double chrome occurs when a **section layout** mounts AppShell AND the **page component** mounts it again.

Two variants:

1. **Re-export variant** (invisible to `<AppShell` grep on the route dir): Stage 1.5c IA-rename created section layouts that mount AppShell, then re-exported legacy pages that ALSO mount AppShell from the pre-1.5c "page-owns-chrome" era.
2. **Direct variant:** page under an AppShell-mounting layout directly mounts AppShell.

Every element of the nwrp268 observation (nav ×2, JOBS sidebar ×2, trial banner ×2) is this single cause — TrialBanner doubles because NavBar doubles.

## Affected routes — class (a) DOUBLE RENDER (user-reachable defects)

| # | Route | Outer AppShell | Inner AppShell | Variant |
|---|---|---|---|---|
| 1 | `/price-intel` | `price-intel/layout.tsx:14` | `cost-intelligence/page.tsx:253` | re-export (`price-intel/page.tsx:21`) — **Jake-confirmed visually** |
| 2 | `/price-intel/cost-lookup` | `price-intel/layout.tsx:14` | `cost-intelligence/lookup/page.tsx:195` | re-export |
| 3 | `/price-intel/verification` | `price-intel/layout.tsx:14` | `cost-intelligence/verification/page.tsx:317` | re-export |
| 4 | `/financials/pay-apps/new` | `financials/layout.tsx:14` | `draws/new/page.tsx:518` | re-export — **introduced by the F5 fix commit `1d49103` (06-02)**. The F5 verify (nwrp267) focused on wizard function; the wizard works but renders inside double chrome. |
| 5 | `/company/overview` | `company/layout.tsx:13` | `company/overview/page.tsx:100` | direct |

Legacy 308s landing on doubles: `/cost-intelligence` (+ `/lookup`, `/scope-data`, `/suggestions`) → /price-intel routes; `/draws/new` → `/financials/pay-apps/new` (matches `/draws/:id` redirect, `next.config.mjs:101`).

## Routes checked and CLEAN

- **F1 reframe (`/jobs/[id]/budget`) — CLEAN (nwrp269 a/b/c answered).** `jobs/[id]/budget/page.tsx` mounts NwPlaceholderCard only, no AppShell. `jobs/[id]/layout.tsx` mounts PerJobTabs only. The single AppShell comes from `jobs/layout.tsx:8`. Same for `bills/page.tsx` + `pay-apps/page.tsx` (NwPlaceholderCard only). **F1 needs NO amendment — ready for incognito verify.**
- **/today — single chrome at runtime** (suspected in nwrp268, cleared here). `today/page.tsx:108` mounts AppShell; `today/layout.tsx` is a pass-through. NOTE: the layout's comment claims chrome is "inherited from root layout" — stale/false (root layout mounts none), but harmless at runtime. This is the TD-WL11-TODAY-CHROME-INCONSISTENCY pattern: page-owns-chrome instead of layout-owns-chrome, rendering correctly.
- **/jobs/[id]/change-orders "two summary rows" — NOT the AppShell bug.** The page renders `JobFinancialBar` (`page.tsx:201`: Original / Approved COs / Revised / Billed / % / Remaining) AND its own 4-stat grid (`page.tsx:203-208`: Original / Approved COs / Revised / Pending). Two distinct components rendered once each — 3 of 4 metrics repeat, so it READS as a duplicate. UX-redundancy finding, different fix class (de-dupe the stat grid or slim JobFinancialBar); not part of the AppShell fix.
- **Other page-owns-chrome routes (single render, class b — correct but architecturally inconsistent):** /vendors, /vendors/[id], /change-orders/[id], /proposals/review/[extraction_id] (ReviewManager), /cost-intelligence/items + /items/[id] + /verification (legacy paths, no redirect entries — still directly reachable). Defer normalization to Wave-1.1-Lite chrome-consistency pass (TD-WL11 scope).
- **Layout-owns-chrome sections (class c — correct):** /admin/*, /reports/*, /pipeline/*, /financials/* (except #4), /people/*, /company/* (except #5), /jobs/* (all per-job tabs), /price-intel 6 NwPlaceholderCard sub-pages. /settings mounts NavBar-only layout (no sidebar by design). /platform-admin and /owner trees have their own non-AppShell chrome.
- **Unreachable legacy AppShell pages (dead code, no action):** /dashboard → /today 308, /operations → /today 308, /invoices/* → /financials/* 308s, /draws/[id] → /financials/pay-apps/[id] 308. `financials/bills/[id]` + `financials/pay-apps/[id]` + `[id]/print` are real implementations without AppShell (correct).

## Proposed fix — 12 files, one commit, mechanical unwrap

Direction: **layout owns chrome** (the established 1.5c IA architecture). Strip inner AppShell mounts; never strip section layouts.

1. Remove `<AppShell>` wrap (keep children, unindent) in 9 cost-intelligence files: `page.tsx:253`, `lookup/page.tsx:195`, `verification/page.tsx:317`, `scope-data/page.tsx:140`, `conversions/page.tsx:151`, `items/page.tsx:148`, `items/[id]/page.tsx` (3 branch mounts: 198/208/229), `codes/CodesManager.tsx:270`, `suggestions/SuggestionsManager.tsx:67`.
2. Add `src/app/cost-intelligence/layout.tsx` mounting AppShell — keeps the 3 still-reachable unredirected legacy paths (/cost-intelligence/items, /items/[id], /verification) chromed after step 1. Re-exports under /price-intel are unaffected (layouts are path-based; re-export pulls only the page component).
3. Remove `<AppShell>` wrap in `draws/new/page.tsx:518` (all /draws/* direct paths 308 away; component reached only via the financials re-export, which gets chrome from `financials/layout.tsx`).
4. Remove `<AppShell>` wrap in `company/overview/page.tsx:100` (chrome from `company/layout.tsx`).

Render-context safety: outer AppShell provides the identical `flex-1 min-w-0` content wrapper the inner one did — no styling shift expected. Verify: build + deploy + authed incognito walk of the 5 routes + spot-check /cost-intelligence/items legacy path.

**Estimated fix cost:** $8-12 (mechanical edits + build + deploy verify + 6-route walk). Risk LOW.

## Adjacent findings (surfaced, NOT in fix scope — Jake disposition)

- **NO_SIDEBAR regex drift after IA rename** (`app-shell.tsx:12-25`): exclusion patterns still target legacy paths (`/invoices/[id]`, `/draws/[id]`, `/draws/new`) but canonical URLs are now `/financials/bills/[id]`, `/financials/pay-apps/[id]`, `/financials/pay-apps/new`. Net effect: detail drill-downs and the draw wizard now show the JobSidebar though they were designed sidebar-less. 3-line regex update; could ride the same commit if authorized.
- **`today/layout.tsx` stale comment** (claims root layout provides chrome — false). One-line comment fix, cosmetic.
- **/jobs/[id]/change-orders summary redundancy** (see above) — UX call, separate disposition.

## Step 3 (F-Inv-1) cost re-projection (nwrp269 item 2)

Original estimate $10-15. **Honest re-projection: $18-28; propose $30 cap.** Basis: sub-rule surfacing is near-free (the 6 sub-rules are already authored in PART-1.5-WALK.md §F-Inv-1 — present for scan + apply tightening edits). The sweep is the real cost: mechanical grep across 52 files is one scripted pass, but authoring the 52-row disposition table with per-file `file:line` citations + reconciling PART-1-INVENTORY classifications + commit is token-heavy. Mitigating vs Steps 1-2 drift: docs-only (no deploy-verify cycles, the main Step 1/2 drift driver). If Jake's scan tightens sub-rules into additional mechanical re-checks: +$5.
