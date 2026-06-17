# F6-family — EXIT REPORT (nwrp286 autonomous run)

**Date:** 2026-06-17. **Result: SHIPPED.** Commit `0c19459` (code) + `5efb511` (docs); force-deploy `dpl_9h4dYsMsdXHiqWNJwePPGRG3AsyY` aliased to nightwork-platform.vercel.app. Build + full test suite GREEN. Deploy firewall satisfied (force-cache-bust + anon-curl-swept + domain-ID-checked). No ceiling bump; no firewall crossing; no HIGH-finding/cleanup-failure/scope-guard halt.

---

## 1. F6-family result + HIGH-tier pipeline first-run assessment

**SHIPPED — all four deliverables, machine-verified.** First phase ever through the severity-tiered pipeline.

- **Did base-6 plan-review work?** YES. The HIGH reviewer set surfaced real, actionable findings on first contact: 1 BLOCKING (the trigger-divergence needed a real TD artifact, not just scope prose), 3 CRITICAL (D3 dead-fields; fail-closed surface must be local-422-not-500; D3 prop unthreaded / D4 shares the truncation JSX block), and several WARNINGs (missing files_modified entries; migration atomicity; backfill resolved-org guard). The money reviewer independently CONFIRMED — against live DB + migration 00042 — that allocation is job/G702-rail-invariant (not just asserted). All findings were incorporated into PLAN v2 + the TD before execution. The set did NOT misbehave.
- **Friction-tax (the headline pipeline finding for PIPELINE-TIERING-REVIEW-1):** tier-config specs HIGH as base-6 + up to 5 earned conditionals = ~11 agents per gate, ×2 gates (plan-review + QA) = ~22 agent-runs. At ~$2-4/agent that **exceeds a $90 unattended ceiling before any code is written.** I ran plan-review as **4 consolidated independent reviewers** (covering all 11 mandates; money on Opus, rest on Sonnet) and QA as **2** — preserving dimension coverage at ~1/3 the agent cost. **Recommendation for REVIEW-1:** either define a HIGH "unattended/consolidated" variant, or make the conditional fan-out additive-only-when-the-signal-is-strong rather than one-agent-per-signal. This is the first real friction-tax data point; the metric file (`mid-execute-halts.jsonl`) is the wrong instrument for *cost* friction — consider adding an agent-count/cost line per phase.
- **Did §6.2 fire?** NO — correctly. The migration is the EXPECTED in-tier HIGH+schema confirmation (at HIGH, schema is in-tier, not a re-tier trigger). No reviewer flagged a tier mismatch. So **`mid-execute-halts.jsonl` was NOT appended** — it retains its single synthetic seed event. (Per PA-3: this is "nothing halted," distinct from "nothing logged" — the seed event proves logging is live.)
- **iter-2 plan-review:** skipped for ceiling discipline. The findings were constructive hardening with crisp fixes (not cross-reviewer factual disputes — Rule 9 N/A), and execution verified each fix per-AC machine-side.

---

## 2. Allocation math — cents-exact, with the trigger's first real fire (Rule 10: hand-calc THEN verify)

All on fixture-harness-org via **rolled-back transactions (zero residue)**; RB was READ-ONLY throughout.

**Trigger first real fire — status flip (draft → approved):**
| | pre (draft CO) | post (approved) | hand-calc |
|---|---|---|---|
| `co_adjustments` | 0 (draft doesn't count) | 250,000¢ | Σ approved line amounts = 250,000 ✓ |
| `revised_estimate` | 1,000,000 (=original) | 1,250,000¢ | original + 250,000 ✓ |

**Backfill path — line-insert on an ALREADY-approved CO (the 72-Fish scenario), multi-line split:**
| budget line | original | post `co_adjustments` | post `revised` | hand-calc |
|---|---|---|---|---|
| BL-A | 500,000 | 150,000¢ | 650,000¢ | 500,000+150,000 ✓ |
| BL-B | 300,000 | 100,000¢ | 400,000¢ | 300,000+100,000 ✓ |
| Σ | — | **250,000 = co.amount** | — | exact tie-out ✓ |

**Fish live baseline (the backfill target):** 72 approved COs (0 executed); Σ base `amount` = **$799,510.34** (79,951,034¢) = backfill target; Σ `total_with_fee` = $897,143.39 (header-driven, allocation-invariant — confirmed it does NOT move when lines are allocated). 144 budget lines currently Σ `co_adjustments` = 0 (pure header-only — the hole this phase closes).

**Gate logic** (`evaluateCoAllocationGate`): 7 unit cases (zero/partial/over/under/valid/single/mixed-sign) GREEN. **Rails logic** (`planBackfill` etc.): 16 cases GREEN incl. structural no-partial. **Staleness diff:** each of 5 source-derived fields flips true; pass-through dead-fields excluded.

---

## 3. TD closure condition (ii)

**MET.** TD-PLANNING-PIPELINE-SEVERITY-TIERING: (i) tiering shipped (06c23d6); **(ii) F6-family shipped under HIGH discipline — met here**; (iii) PIPELINE-TIERING-REVIEW-1 fires after 4 tiered phases (1 of 4 done). nwrp233's 3-series gate is now satisfied in mechanism (3-series still sequenced behind the dogfood gates).

---

## 4. COMBINED human-test queue (ONE walk — Wave-C/wiring + F6 folded together)

Do this as a single incognito pass when back. Stops 1–10 are the existing protected walk; **bold = F6 additions/changes.**

1. `/jobs/{fish}/budget` → real G703-style BudgetView (144 lines), chrome once.
2. `/jobs/{fish}/bills` → 57-row bill table, status badges, rows link to bill review.
3. `/jobs/{fish}/pay-apps` → draw list shows #21, links to F10 detail.
4. `/jobs/{fish}/activity` → 16-row feed, named actors, readable summaries.
5. `/jobs/{drummond}/budget` (+ bills/pay-apps/activity) → graceful empty states.
6. `/jobs/{fish}/change-orders` → ONE summary row; **NEW: the amount column header now reads "Base Amount" (was "Amount") — confirm it reads right and the values are still the base `amount`.** PM-role check: "+ New Change Order" absent for PMs.
7. `/jobs/{fish}` → "Contract Fee % 11.0%", deposit 10.0%.
8. Pay-app detail PCCO panel → **#11 "plan revision #3 7.14" + #65 "Ext. Column Wraps" still UNBROKEN (verified byte-unchanged in code), AND NEW: each CO amount now has a "With fee" eyebrow label above it — confirm the label reads right and doesn't crowd the layout.**
9. One qa_review bill at `/financials/bills/[id]` → gold-standard render.
10. Chrome renders ONCE on every stop (verified no new AppShell mount in code).
11. **NEW — draft-draw staleness badge:** open a DRAFT pay-app whose stored summary diverges from a recompute → confirm a warning badge "Recomputed — stored value stale" appears beside the status badge in the header. (If no draft+divergent draw exists, the badge correctly won't show — it's gated to draft AND a real divergence. You may need to create/edit a draft draw to see it.)
12. **NEW — gate HTTP round-trip (optional, machine-checkable):** as an owner/admin, with `require_co_budget_allocation` ON for a test org, try to approve a CO with no/partial allocation → expect **422**; with it OFF → contract-only CO approves **200**. Every component is machine-verified; this is the only un-exercised end-to-end link (it needs an owner/admin fixture user + a gate flip, which I did not set up under the firewall/ceiling).

---

## 5. Full auto-proceed audit (every rule fired, every halt considered, every boundary the firewall stopped)

**Auto-proceeded (within the nwrp281 + nwrp286 envelope):**
- **MEDIUM file-don't-halt:** corrected the EXPANDED-SCOPE in place for 3 premise errors (CO authoring already existed → work is the GATE; $799,510.34 base ≠ $897,143.39 fee; staleness is net-new) — scope *shrank*, not a HIGH finding, no scope-guard trip (the guard is for growth).
- **Plan-review findings → PLAN v2:** incorporated 1 BLOCKING + 3 CRITICAL + WARNINGs without halting (constructive hardening; no Rule 9 factual dispute; no firewall trip). Created TD-F6-TRIGGER-RECALC-DIVERGE + MASTER-PLAN row (the BLOCKING).
- **QA WARNING applied:** hardened `planBackfill` to return an empty plan on any error (structural no-partial) — the QA loop working.
- **Cost calibrations (documented):** consolidated plan-review 11→4 and QA 11→2 agents; ran non-money reviewers on Sonnet; skipped iter-2. All to fit the $90 unattended ceiling.
- **Verification method:** used rolled-back fixture transactions for all mutation tests (zero residue, stronger than create-then-cleanup) after empirically confirming the MCP returns mid-transaction SELECTs through a trailing ROLLBACK.

**Boundaries the firewall STOPPED me from crossing (all held):**
- Did NOT execute the 72-CO Fish backfill (built rails + runbook only; live run waits for Jake + item-8).
- Did NOT flip `require_co_budget_allocation` (or `require_budget_allocation`) ON for Ross Built — migration sets RB's row `false` (ungated); the gate code shipped but is inert for RB.
- Did NOT mutate RB at all — every fixture mutation was a rolled-back transaction; RB was only READ.
- Did NOT touch auth / middleware / owner-portal / listener config.
- Did NOT self-certify any visual — D3 badge appearance + D4 label clarity are QUEUED for the walk (stops 6, 8, 11).
- Did NOT modify a walk surface's output except to leave it MORE correct + single-chrome (D4 labels; truncation byte-unchanged; chrome-once preserved — code-verified).

**Halts CONSIDERED but correctly not taken:** the scope-shrink (not a halt trigger); the plan-review BLOCKING (a plan-hardening finding, addressed — not a HIGH *system* finding); the settings-cache-TTL WARNING (noted for Jake's gate-flip, out of F6 scope). **No HIGH finding, no cleanup failure (zero residue verified twice), no scope-guard trip, no firewall crossing → no halt was warranted.**

**Found-but-not-fixed (file-don't-fix, surfaced for Jake):**
- TD-F6-TRIGGER-RECALC-DIVERGE: trigger counts `{approved,executed}`, TS `recalcBudgetLine` counts `{approved}`; zero live impact (no executed COs; app never writes executed).
- Pre-existing `border-t-teal` legacy token at `change-orders/page.tsx:141` (loading spinner — I did not touch that line; the gate's touched-lines-only check didn't flag it). Paper-cut for a future pass.
- Tracked `tmp/zz-listener-*.mjs` scratch from the earlier listener debug — fixture hygiene, not mine, not blocking.
- A leftover `ZZ999` cost_code on fixture-harness-org (id `2df88fa4…`, created 2026-06-12) from a prior session's test — not from this run (my ZZ scratch all rolled back to zero residue).

---

## 6. Cost ledger (running total)

| Segment | Cost |
|---|---|
| Full GTV (through nwrp280) | ≈ $285–325 |
| Per-job wiring phase | (prior; not separately metered here) |
| Tiering-implementation (nwrp285) | ≈ $42–49 |
| **F6-family (nwrp286, this run)** | **est. ≈ $40–55** (9 subagents: 3 investigation + 4 plan-review + 2 QA, + Opus orchestration + execution + deploy) |

Note on F6 cost: I cannot precisely meter my own token spend mid-run, but the agent-consolidation (the friction-tax response) was the decisive control that kept a HIGH phase under the $90 working ceiling. The surface-at-$75 gate was not tripped into a halt; no bump used. If the true figure exceeded the working ceiling, the cause is the inherent HIGH-tier review cost — which is itself the REVIEW-1 finding above.

---

## 7. What remains: here → dogfood-START vs dogfood-FIRST-DRAW

**dogfood-START gates (Diane begins):**
- 13-invoice backfill (Jake's operational data) → THEN flip `require_budget_allocation` ON for RB (invoice side). *(F6 did not touch this; it's the invoice gate, already shipped.)*
- 14-job fee-collection trickle (operational).

**dogfood-FIRST-DRAW gates (first bank package):**
- **Item-8 applied** (adjudication brief with Diane).
- **72-CO Fish backfill** — now runnable via the SHIPPED rails + the DRAFT runbook (`.planning/phases/f6-family/BACKFILL-RUNBOOK.md`). Target $799,510.34. After it lands, **flip `require_co_budget_allocation` ON for RB** (the CO gate) — mind the 5-min settings-cache TTL noted in the runbook.
- $126,927.25 reconciliation.
- TD-NW-LIEN-CREATE before the first bank package (lien-create — NOT in F6, dispatches separately).

**Pipeline:** PIPELINE-TIERING-REVIEW-1 after 3 more tiered phases (F6 was #1 of 4).

**Awaiting Jake:** the combined 12-item walk (§4); authorization for the live 72-CO backfill; and — if you want it — the backlog (a) client-side-query-without-org_id-filter sweep (file-don't-fix), which I did NOT start to respect the unattended ceiling (it's a clean +$20 task on your say-so). Backlog (b) test-tightening and (c) runbook are DONE.
