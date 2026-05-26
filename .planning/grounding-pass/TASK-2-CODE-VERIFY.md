# Task 2 — Re-verify Load-Bearing "Working" Labels

**Authorized by:** nwrp224 §17-23
**Generated:** 2026-05-26
**Source:** Live code reads + live Supabase queries (read-only SELECT)
**Posture:** Honest. Spot-check, not full re-inventory.

---

## Summary verdict

The inventory's load-bearing claims about Check 1 (invoice review screen) **match the code precisely** — file:line citations confirm the graduated severity classifier, CO-reference hard block, budget gate, amount-increase guard, lock-aware editing matrix, and DB wiring all behave as described. The Check 2 (flagAnomaly scaffold) and Check 3 (Caldwell-fixture-mount routes) claims also match — flagAnomaly is genuinely a 4-line stub, and 7 of 7 enumerated routes mount Caldwell fixtures (the inventory's "6 (or 7)" count was conservative; it's 7). Check 4 (pricing_history data) confirmed: **126 RB rows across 21 vendors and 29 cost codes, spanning 2020-02-04 through 2027-03-25 (2026-dominant: 92 rows)**. The data is real enough to make flagAnomaly meaningful for the top-10 vendor+cost-code pairs but thin for everything else.

**One factual correction to surface:** the inventory cites flagAnomaly as the "#1 launch BUILD item" because the data exists; this verification confirms the data exists but is **front-loaded into 2026** — pre-2026 backfill is 8 observations total (5 from 2020, 2 from 2021, 1 from 2024). The "2+ years of Ross Built history backfill" claim is technically accurate (the date range is 7 years) but operationally most of the signal is in the last 6 months.

---

## Check 1 — Invoice review screen wiring

### Claim-by-claim verification

#### 1a. Page is 2,234 lines, gold-standard Document Review pattern

**VERIFIED.** `src/app/invoices/[id]/page.tsx` = 2,234 lines exactly (`wc -l`).

#### 1b. Graduated budget severity classifier at lines 668-692

**VERIFIED.** `src/app/invoices/[id]/page.tsx:668-692`:

- Line 668: `type OverBudgetSeverity = "none" | "yellow" | "orange" | "red";` — matches inventory claim
- Lines 669-692: `classifyOverBudget()` function with documented thresholds:
  - `revised === 0 && thisInvoicePortion > 0` → red (line 677)
  - `projectedTotal <= revised` → none (line 683)
  - `isAllowance && overage` → red (line 688) (allowances bumped straight to red)
  - `pct > 25` → red (line 689)
  - `pct > 10` → orange (line 690)
  - else (0-10%) → yellow (line 691)

Inventory's claim of "yellow 0-10%, orange 10-25%, red 25%+" matches the >10 / >25 thresholds verbatim. **No discrepancy.**

The classifier returns `{ severity, overageCents, pct }` — richer than the inventory described but consistent with the stated behavior.

#### 1c. CO-reference hard block at /api/invoices/[id]/action/route.ts:183-199

**VERIFIED.** Implementation matches inventory claim verbatim:

- Lines 183-189: Query `invoice_line_items` for rows with `is_change_order=true` AND `co_reference IS NULL OR co_reference=''` AND `deleted_at IS NULL`
- Lines 191-198: If any rows found, return 422 with error message + offending lines

This is a server-side gate that cannot be bypassed by editing the UI (per the comment at line 182). **No discrepancy.**

#### 1d. Budget gate at lines 205-289 (422s with `over_budget` unless `acknowledged_over_budget=true`)

**VERIFIED.** `src/app/api/invoices/[id]/action/route.ts:201-289`:

- Lines 206-213: Defines `INVOICE_COUNTING` statuses (`pm_approved` onward) — budget gate skipped if invoice is past PM approval
- Lines 214-227: Aggregates allocations by `budget_line_id` from invoice_line_items
- Lines 228-267: Fetches budget_lines + cost_codes, computes overages where `invoiced + thisInvoice > revised && revised > 0`
- Lines 269-282: If `overageDetails.length > 0`:
  - Reads URL param `acknowledged_over_budget`
  - If NOT `=== "true"`, returns 422 with `error: "over_budget"` + details payload (line 276)
- Lines 283-287: If acknowledged, auto-appends override note for audit trail

**Matches inventory claim verbatim.** The threshold for triggering is "any budget line would go over revised_estimate" — there is no separate threshold from the 1b severity classifier (the classifier is for UI warnings; this gate is binary "any overage at all").

#### 1e. Amount-increase >10% guard at lines 293-306

**VERIFIED.** Implementation:

- Line 293: Reads `ai_parsed_total_amount` (falls back to `total_amount` if null)
- Lines 294-295: Computes `effectiveTotal` from the update or the existing total
- Lines 296-306: If `effectiveTotal > aiParsed && pct > 10 && !note`, returns 422 requiring a note

**Matches inventory claim.** Threshold is `>10%` not `>=10%`. Requires explicit note in same request; not bypassable via empty string (note is checked truthy).

#### 1f. Lock-aware editing matrix in src/lib/invoice-permissions.ts

**VERIFIED.** `src/lib/invoice-permissions.ts:1-98`:

- `LOCKED_STATUSES` (lines 53-59): `pm_approved`, `qa_review`, `qa_approved`, `in_draw`, `paid` (5 statuses)
- `PRIVILEGED_ROLES` (lines 66-70): `accounting`, `admin`, `owner` (3 roles, PM explicitly excluded with rationale comment)
- `isInvoiceLocked()` (lines 73-75): boolean check against LOCKED_STATUSES
- `canEditLockedFields()` (lines 78-80): boolean check against PRIVILEGED_ROLES
- `canEditInvoice()` (lines 93-98): combined wrapper, `!isLocked || canEditLockedFields(role)`

Matrix is clean. Status enum (lines 25-46) has 21 values; only 5 lock. Role enum has 4 values (`owner`, `admin`, `accounting`, `pm`); 3 are privileged.

#### 1g. Test coverage for permission matrix

**VERIFIED.** `__tests__/invoice-permissions.test.ts` (147 lines):

Counting test cases by construction:
- `isInvoiceLocked`: 5 locked × 1 + 16 unlocked × 1 + 1 unknown-string = **22 cases**
- `canEditLockedFields`: 3 privileged + 1 non-privileged = **4 cases**
- `canEditInvoice` full matrix: 21 statuses × 4 roles = **84 cases**
- Brief-specified spot checks: **5 cases**

**Total: 115 test cases** covering the full matrix. Runs as a node `assert.strict` script with pass/fail counter (lines 129-146).

#### 1h. Page wired to real DB, not Caldwell fixtures

**VERIFIED.** Grep on `src/app/invoices/[id]/page.tsx`:
- Line 217: `.from("invoices")` — sibling lookup (partial-approval split)
- Line 225: `.from("invoices")` — child lookup
- Line 306: `.select("id, full_name")` — pm_users lookup

Primary invoice fetch goes via `/api/invoices/${invoiceId}` (line 203). The API route at `src/app/api/invoices/[id]/route.ts` does the canonical fetch — grep confirms 4 `.from("invoices")` calls in that file at lines 76, 138, 213, 261.

**Zero Caldwell-fixture imports** on this page. Real DB wiring confirmed.

### Check 1 verdict

**5 of 5 sub-claims verified.** No discrepancies. The inventory's "2,234-line gold-standard Document Review pattern" claim is empirically accurate — the file IS 2,234 lines, the graduated gates DO exist at the cited line numbers, the server-side enforcement IS in `/api/invoices/[id]/action/route.ts`, and the lock matrix HAS 115 test cases.

---

## Check 2 — flagAnomaly current state + data shape needed

### Current implementation

`src/lib/cost-intelligence/queries.ts:340-356`:

```typescript
/**
 * Anomaly detection scaffolding. Phase 3.3 ships the safe-default
 * "insufficient history" response — full statistical anomaly logic
 * (z-score, rolling-window deviation, severity tiering) activates in
 * Phase 3.4+ once the spine has months of population.
 */
export async function flagAnomaly(
  _supabase: SupabaseClient,
  _orgId: string,
  _lineItem: {
    canonical_code_id: string;
    unit_price_cents: number;
    quantity: number;
  }
): Promise<AnomalyFlag> {
  return NO_HISTORY;
}
```

Where `NO_HISTORY` (lines 332-338):

```typescript
const NO_HISTORY: AnomalyFlag = {
  is_anomaly: false,
  severity: "none",
  reason: "insufficient history",
  rolling_avg_cents: null,
  pct_deviation: null,
};
```

**Confirmed scaffold-only.** All parameters are underscore-prefixed (unused). The function compiles but does nothing — every call returns the same constant.

### Current signature

- **Inputs:** `supabase: SupabaseClient`, `orgId: string`, `lineItem: { canonical_code_id: string, unit_price_cents: number, quantity: number }`
- **Output:** `AnomalyFlag { is_anomaly: boolean, severity: "none"|"warning"|"critical", reason: string, rolling_avg_cents: number|null, pct_deviation: number|null }`

The output shape is well-defined and matches what a real implementation would return. The input shape uses `canonical_code_id` (from `canonical_cost_codes` global spine) — not `cost_code_id` (org-local `cost_codes`). This is a wiring gap: invoice line items today carry `cost_code_id` (org-local), but flagAnomaly expects canonical IDs. The hookup point would need to resolve org-local → canonical via `org_cost_codes.canonical_code_id`.

### What the other functions do

**findSimilarLineItems (lines 68-112):** Works partially. Embeds the description via `generateEmbedding()` (hits OpenAI text-embedding-3-small, logs to api_usage). Calls `supabase.rpc("find_similar_items", ...)`. Falls back to client-side cosine similarity over up to 2000 items if the RPC isn't installed. This function has real logic — it requires `items.embedding` to be populated (only 61 items exist; embeddings status uncertain without inspection of the column).

**getVendorPriceHistory (lines 235-270):** Works partially. Queries `vendor_item_pricing` by org+vendor+date range. Returns empty array when `canonicalCodeId !== null` (lines 244-246) — this is a deliberate stub because vendor_item_pricing.cost_code_id references the legacy `cost_codes` table, not `canonical_cost_codes`. When called with `canonicalCodeId=null`, it returns all the vendor's price points in the date range. Real but limited.

**getCostCodeRollup (lines 304-316):** Scaffold-only. Returns `EMPTY_ROLLUP` constant unconditionally (line 315). Parameters all underscore-prefixed.

### Data shape needed for real implementation

**Inputs (recommended revision):**
```typescript
{
  vendor_id: string;          // org-local
  cost_code_id: string;       // org-local (resolve to canonical inside)
  unit_price_cents: number;
  unit: string;               // for unit-conversion sanity
  quantity?: number;
  observation_date?: Date;    // defaults to today
}
```

**Query against pricing_history:**
```sql
SELECT unit_price, date, source_type
FROM pricing_history
WHERE org_id = $1
  AND vendor_id = $2
  AND cost_code_id = $3
  AND date >= NOW() - INTERVAL '2 years'
ORDER BY date DESC
LIMIT 100;
```

Then compute median + IQR (or simple percentile bounds) and compare `unit_price_cents` against. The vendor+cost-code distribution from this verification shows:

- Top combo (ISLAND LUMBER × 10102 Framing Material): 28 observations, range $2.50 to $113.49, avg $18.54. Healthy sample.
- Second-tier combos (3-10 observations) at 10+ vendor+cost-code pairs: sample size borderline; flag with `confidence: low`.
- Single-observation combos (12 in top 20): insufficient — return `insufficient history`.

**Suggested return shape (richer than current):**
```typescript
{
  is_anomaly: boolean;
  severity: "none" | "warning" | "critical";
  reason: string;               // human-readable
  rolling_avg_cents: number | null;     // existing — keep
  pct_deviation: number | null;         // existing — keep
  n_observations: number;       // NEW — UI shows "comparing against N history points"
  median_cents: number | null;  // NEW — IQR-based, more robust than mean
  date_range: { first: string; last: string } | null;  // NEW
  confidence: "low" | "medium" | "high";  // NEW — based on N
}
```

### Wiring estimate

**Total: ~6-8 hours (single day) for a useful first cut. ~2-3 days for a polished version.**

Sub-tasks:

1. **Replace stub with query (1 hour).** Write the `pricing_history` SELECT, parse rows, compute median + percentile bounds.

2. **Resolve canonical_code_id ↔ cost_code_id (1 hour).** The current signature uses `canonical_code_id`; the practical caller knows `cost_code_id`. Two options:
   - Change signature to accept `cost_code_id`, resolve canonical inside if needed.
   - Keep signature, resolve at the caller. The first option is simpler.

3. **Pick severity thresholds (1 hour).** Median + IQR is the safe choice. Suggested:
   - `pct_deviation > 50% && n >= 10` → critical
   - `pct_deviation > 25% && n >= 5` → warning
   - else → none
   These thresholds need 1-2 rounds of tuning against real data before launch.

4. **Wire into invoice review screen (2 hours).** Call flagAnomaly per line item on `/invoices/[id]` page load. Render result as a per-line badge (similar to existing confidence-score badge). The right-rail panel has space for an anomaly indicator alongside the existing budget warnings.

5. **Test with the 28-observation ISLAND LUMBER × Framing Material combo (1 hour).** Verify a normal-priced item returns none; a 3x-priced item returns warning or critical. Verify a 1-observation vendor+code combo returns "insufficient history" without crashing.

6. **Cache + perf (1-2 hours).** A naive call per line item = N database queries per page load. Either: precompute medians into a derived view, OR batch the queries (one SELECT with `IN (vendor+code tuples)`), OR cache for 24h in memory.

7. **Tests (1 hour).** Unit tests for the median calculation, severity classification, and edge cases (zero observations, one observation, all same price).

**Variance:** if the team wants z-score instead of IQR, add 1-2 hours. If the team wants the result included in `/api/invoices/[id]` response (server-side), add 1 hour for the API integration. If the team wants a separate `/api/cost-intelligence/anomaly-check` endpoint, add 2 hours.

---

## Check 3 — 7 Caldwell-fixture-mount routes — launch-relevant vs hideable

Per-route verification (all 7 routes):

| Route | File | Caldwell import? | Launch-relevant? | Recommendation |
|---|---|---|---|---|
| `/jobs/[id]/budget` | `src/app/jobs/[id]/budget/page.tsx:48-56` | YES — imports CALDWELL_BUDGET_LINES, CALDWELL_INVOICES, CALDWELL_COST_CODES, CALDWELL_JOBS, CALDWELL_CHANGE_ORDERS, CALDWELL_DRAWS, CALDWELL_DRAW_LINE_ITEMS | **LAUNCH-RELEVANT** | **SWAP** — core PM surface, sees real budget data daily |
| `/jobs/[id]/schedule` | `src/app/jobs/[id]/schedule/page.tsx:18-22` | YES — imports CALDWELL_SCHEDULE_ITEMS, CALDWELL_VENDORS, CALDWELL_JOBS | Wave 2 scope | **HIDE** — schedules ship in Wave 2 |
| `/jobs/[id]/mobile-approval` | `src/app/jobs/[id]/mobile-approval/page.tsx:19-24` | YES — imports CALDWELL_INVOICES, CALDWELL_VENDORS, CALDWELL_COST_CODES, CALDWELL_JOBS | **LAUNCH-RELEVANT** | **SWAP** — PM mobile approval is core invoice flow |
| `/jobs/[id]/documents/[documentId]` | `src/app/jobs/[id]/documents/[documentId]/page.tsx:19-24` | YES — imports CALDWELL_LIEN_RELEASES, CALDWELL_VENDORS, CALDWELL_INVOICES, CALDWELL_JOBS | Partial (lien releases) | **PARTIAL SWAP** — lien release path only; plans/contracts stay hidden |
| `/financials/pay-apps/[id]` | `src/app/financials/pay-apps/[id]/page.tsx:16-22` | YES — imports CALDWELL_DRAWS, CALDWELL_DRAW_LINE_ITEMS, CALDWELL_COST_CODES, CALDWELL_CHANGE_ORDERS, CALDWELL_JOBS | **LAUNCH-RELEVANT** | **SWAP** — Pay App approval is critical owner-touchpoint |
| `/financials/pay-apps/[id]/print` | `src/app/financials/pay-apps/[id]/print/page.tsx:16-22` | YES — same Caldwell imports | **LAUNCH-RELEVANT** | **SWAP** — G702/G703 print is the legal deliverable |
| `/financials/reconciliation` | `src/app/financials/reconciliation/page.tsx:15-17` | YES — imports CALDWELL_RECONCILIATION_PAIRS | Strawman per nwrp44 | **HIDE** — explicitly "reconciliation lock happens post-Phase 3.9" (deferred) |

**Verification of fixture imports:**
- All 7 routes import from `@/app/design-system/_fixtures/drummond` — confirmed via direct file reads of each `page.tsx`.
- All 7 wrap in `<div data-direction="C" data-palette="B" className="design-system-scope">` per CONTEXT D-19.
- None call `getCurrentMembership()` or `createServerClient()` — they are pure fixture-mount thin wrappers.

### Canonical swap pattern reference

`src/app/financials/bills/[id]/page.tsx` (already rolled out per Wave-E E-3, file lines 1-198) is the canonical example. Pattern:

1. `getCurrentMembership()` + `notFound()` if null (lines 63-64)
2. `createServerClient()` (line 66)
3. `.from("invoices").select(...).eq("id", params.id).eq("org_id", membership.org_id).is("deleted_at", null).maybeSingle()` (lines 68-84)
4. Handle null embeds defensively for arrays vs singletons (lines 95-107)
5. Construct CaldwellInvoice-shaped shim from DB row + safe defaults (lines 121-159)
6. Pass shim to InvoiceReviewView unchanged (lines 187-197)

**Comment block at lines 1-50 documents the rationale, field-mapping shim concerns, vendor PII fence, and the F1 swap reference signature.** This is well-engineered swap infrastructure; the pattern is repeatable.

### Adapter complexity estimate per remaining swap

For each launch-relevant route, the swap effort:

| Route | DB query complexity | Shim complexity | Effort estimate |
|---|---|---|---|
| `/jobs/[id]/budget` | Multiple tables (budget_lines + cost_codes + invoices + draws + draw_line_items + change_orders) joined per job — ~6 PostgREST embeds | High — BudgetView expects synthesized aggregate shapes | **4-6 hours** |
| `/jobs/[id]/mobile-approval` | Same as `/invoices/[id]` (already done at /financials/bills/[id]) — single invoice + vendor + cost_code | Low — borrows the bills/[id] shim almost verbatim | **1-2 hours** |
| `/financials/pay-apps/[id]` | draws + draw_line_items + cost_codes + change_orders + jobs — 5 PostgREST embeds | Medium — DrawApprovalView expects pre-summed line items | **3-4 hours** |
| `/financials/pay-apps/[id]/print` | Same as `[id]` above (just renders different view) | Low — same data, different View | **1 hour** (after [id] is done) |
| `/jobs/[id]/documents/[documentId]` (lien_release path) | lien_releases + vendors + invoices — single document | Low — DocumentReviewView "lien_release" type only | **2-3 hours** (skip plan/contract paths) |

**Total swap effort for 5 LAUNCH-RELEVANT routes: ~11-16 hours (1.5-2 days).**

Hiding the 2 Wave-2-scope routes (schedule, reconciliation) per the inventory's recommended env-var pattern: ~30 minutes total.

### Check 3 verdict — final recommendation

**SWAP these 5 (1.5-2 days):**
1. `/financials/pay-apps/[id]` — Pay App approval
2. `/financials/pay-apps/[id]/print` — G702/G703 print
3. `/jobs/[id]/budget` — per-job budget tab
4. `/jobs/[id]/mobile-approval` — PM mobile approval
5. `/jobs/[id]/documents/[documentId]` (lien_release path only) — lien release review

**HIDE these 2 (~30 min):**
6. `/jobs/[id]/schedule` — Wave 2 scope
7. `/financials/reconciliation` — explicitly post-Phase 3.9 per route comment

The inventory's "6 (or 7)" count was conservative — all 7 are confirmed Caldwell-fixture-mount routes. The launch-relevant/hideable split (5/2) is cleaner than the inventory implied.

---

## Check 4 — pricing_history real data verification

### Table existence

**VERIFIED.** `public.pricing_history` exists in the live DB with 126 rows total (per `mcp__supabase__list_tables`). Schema confirmed via `information_schema.columns`:

Columns: `id (uuid)`, `org_id (uuid)`, `job_id (uuid)`, `source_type (text)`, `source_id (uuid)`, `source_line_id (uuid)`, `vendor_id (uuid)`, `cost_code_id (uuid)`, `description (text)`, `quantity (numeric)`, `unit (text)`, `unit_price (bigint)`, `amount (bigint)`, `date (date)`, `canonical_item_id (uuid)`, `match_confidence (numeric)`, `created_at (timestamptz)`, `created_by (uuid)`.

**Two discrepancies from the inventory's expected shape:**
- Column is `date` (not `observation_date` as I initially queried).
- Column is `unit_price` (bigint, in cents). Not `unit_price_cents` as my mental model assumed from vendor_item_pricing.

These are not inventory errors — the inventory didn't specify the exact column names. Just noting the actual shape.

Table comment confirms: "Trigger-populated append-only audit spine for pricing observations across 4 source entities (invoice / proposal / po / co)". Append-only — no soft-delete, no UPDATE; correction is service-role DELETE only.

### Row counts for Ross Built

**VERIFIED:**
- Total rows for RB (`org_id = 00000000-0000-0000-0000-000000000001`): **126**
- Other org rows: **0**
- Total in table: **126**

**100% of pricing_history is Ross Built.** No other org has populated this table yet.

By source_type breakdown:
- `invoice`: **119 rows** (94.4%)
- `proposal`: **7 rows** (5.6%)

(The inventory's "Amendment M backfilled 54 historically qa_approved invoices" claim — I cannot verify the exact 54-invoice claim without checking the migration commit text, but 119 invoice-sourced rows is consistent with a multi-line-item backfill of ~50 invoices. The 119 vs 54 discrepancy could be because each invoice contributes multiple lines.)

### Date range

**VERIFIED. Spans 2020-02-04 through 2027-03-25.**

By year breakdown:
- 2020: 5 rows (invoice)
- 2021: 2 rows (invoice)
- 2024: 1 row (invoice)
- 2025: 18 rows (invoice)
- 2026: 92 rows (invoice) + 7 rows (proposal) = 99 rows
- 2027: 1 row (invoice) — likely a future-dated test record

**Honest framing of "2+ years of history":**
The date range IS 2020-2027 (7 years). But 79% of observations are 2026 — the backfill is real but signal density is heavily weighted to recent months. Pre-2026 data: 26 rows / 126 total = 21%.

For flagAnomaly purposes, the "2+ years" framing should be interpreted as "the dataset spans 2+ years; the meaningful comparison window for most vendor+cost-code combos is the last 6-12 months."

### Top vendor + cost code observation density

| Vendor | Cost Code | Observations | Date range | n_vendors |
|---|---|---|---|---|
| ISLAND LUMBER AND HARDWARE | 10102 Framing Material | 28 | 2026-03-11 to 2026-04-02 | 1 |
| ISLAND LUMBER AND HARDWARE | (NULL — unmapped) | 14 | 2026-03-16 to 2027-03-25 | 1 |
| VOLCANO STONE LLC | 21103 Counter Tops | 10 | 2025-11-08 (single day) | 1 |
| CLEAN CANS LLC | 03111 Temporary Sanitation | 10 | 2025-08-29 to 2026-04-01 | 1 |
| Avery Roof Services | (NULL — unmapped) | 7 | 2026-04-28 (single day) | 1 |
| Climatic Conditioning | 14101C HVAC CO | 4 | 2026-02-04 (single day) | 1 |
| ISLAND LUMBER | 27101 Painting | 4 | 2026-03-19 (single day) | 1 |
| ISLAND LUMBER | 25103 Interior Trim Mat'l | 3 | 2026-03-17 to 2026-04-06 | 1 |
| Sight to see construction | 25102C Interior Trim Labor CO | 3 | 2020-02-04 (single day) | 1 |
| SmartShield Homes | 13101C Electrical Labor CO | 3 | 2026-04-20 (single day) | 1 |

**Key observation:** Many top entries are single-day clusters (10 observations all on 2025-11-08 from VOLCANO STONE, etc.) — these are single-invoice line-item bursts, not actual historical price drift signal. Only ISLAND LUMBER × Framing Material (28 obs over 3 weeks) and CLEAN CANS × Temporary Sanitation (10 obs over 7 months) look like genuine time-series.

**Cost code coverage:** 29 distinct cost codes have at least 1 observation. **14 rows have NULL cost_code_id** — these are unmapped historical entries where the cost-code-to-line-item mapping wasn't applied during backfill. For flagAnomaly to work on those, a precursor cleanup pass is needed.

**Vendor coverage:** 21 distinct vendors out of 24 active in the DB (`vendors` table count). Reasonable coverage.

### vendor_item_pricing parallel system

**VERIFIED.** `public.vendor_item_pricing` exists separately with very different shape (44 columns including `tax_cents`, `landed_total_cents`, `observed_unit`, `canonical_unit_price_cents`, `scope_size_value`, `ai_confidence`, `human_verified`, etc.).

Row counts:
- Total rows for RB: **6** (down from `list_tables` count of 7 because deleted_at filter excludes 1)
- Distinct vendors: 3
- Distinct items: 6
- Date range: 2020-03-06 to 2027-03-25

This is the **AI-extraction-driven spine** described in the inventory. Currently sparsely populated (6 rows vs 126 in pricing_history). The Wave 1A AI-extraction infrastructure exists; the data is thin because the AI parsing pipeline has only been run on a small number of recent invoices/proposals.

### Verdict: is there enough data to make flagAnomaly meaningful?

**Conditional yes, with caveats.**

- **Yes** for the **top-2 vendor+cost-code combos** (ISLAND LUMBER × Framing Material with 28 obs over 3 weeks; CLEAN CANS × Sanitation with 10 obs over 7 months) — these have enough sample size for IQR-based outlier detection.

- **Borderline** for the **3rd-10th tier combos** (3-10 observations) — flagAnomaly should return them but with `confidence: low` and large tolerance bands.

- **No** for the **12 vendor+cost-code combos with single observations** — flagAnomaly correctly should return "insufficient history" for these and not crash.

- **Cleanup gap:** 14 rows have NULL cost_code_id and won't contribute to per-cost-code aggregations until they're mapped. This is a 1-2 hour manual cleanup task that should precede launch if PMs are to trust the anomaly flags.

**Practical recommendation:** flagAnomaly is buildable today (~6-8 hours per Check 2 estimate) AND will be useful on at minimum the 2 healthy combos. Launch with a `confidence: low/medium/high` indicator so PMs know which flags to trust. Add backfill polish (cost-code-mapping cleanup, more invoices through the pipeline) as ongoing operations work post-launch.

---

## Discrepancies surfaced

### Verified-cleanly claims (no discrepancies)

- Invoice review page is 2,234 lines.
- Graduated severity classifier exists at lines 668-692 with the documented thresholds (yellow 0-10%, orange 10-25%, red 25%+).
- CO-reference hard block at /api/invoices/[id]/action/route.ts:183-199 enforces what the inventory said.
- Budget gate at lines 205-289 returns 422 with `error: "over_budget"` unless `acknowledged_over_budget=true`.
- Amount-increase >10% guard at lines 293-306 requires a note.
- Lock-aware editing matrix in src/lib/invoice-permissions.ts (5 locked statuses × 3 privileged roles).
- 115 test cases in __tests__/invoice-permissions.test.ts.
- Invoice review page wired to real DB (not Caldwell fixtures).
- flagAnomaly is a 4-line stub returning constant `NO_HISTORY`.
- pricing_history exists, 126 rows, all RB, spans 2020-2027.
- All 7 enumerated Caldwell-fixture-mount routes confirmed to import from `_fixtures/drummond`.
- Canonical swap pattern at `src/app/financials/bills/[id]/page.tsx` is well-engineered with rationale comments.

### Minor discrepancies / clarifications

1. **"6 (or 7) Caldwell-fixture-mount routes" → it's 7.** The inventory hedged on the count; this verification confirms 7. Not a discrepancy, just resolves the hedge.

2. **"2+ years of Ross Built history backfill" framing is technically accurate but operationally misleading.** The date range is 7 years (2020-2027) but 79% of observations are 2026. Pre-2026 backfill is only 8 observations. Honest framing: "the dataset includes some pre-2026 anchor points for posterity but the operationally useful window is the last 6-12 months."

3. **"54 historically qa_approved invoices" claim could not be precisely verified.** What the data shows: 119 invoice-source rows for RB. If each invoice averages ~2 line items, that's ~50-60 invoices — consistent with the claim. The exact 54 number would need migration-text inspection, which is out of scope for this check.

4. **flagAnomaly input uses `canonical_code_id`, not `cost_code_id`.** Inventory described the conceptual inputs (vendor_id, cost_code_id) — those make sense for callers, but the current function signature expects canonical IDs. Implementation note: the wired function should either accept org-local cost_code_id and resolve canonical internally, or callers must resolve before calling. Not a discrepancy, just a wiring-time decision.

5. **14 of 126 pricing_history rows have NULL cost_code_id.** These won't contribute to per-cost-code anomaly detection until they're back-mapped. This is a real cleanup gap not surfaced in the inventory. Estimated cleanup effort: 1-2 hours of manual mapping (or a SQL pass against vendor + description text to infer cost code).

6. **vendor_item_pricing has only 6 RB rows.** The inventory mentioned this as the "AI-extraction-driven" parallel system; verification confirms it's sparsely populated. Not a discrepancy but worth noting that "Wave 1A AI-extraction spine is shipped" means the infrastructure is shipped — the data population is still early. flagAnomaly should NOT depend on vendor_item_pricing alone; pricing_history is the meaningful corpus today.

### No load-bearing claims failed

The inventory's launch-relevant claims about Check 1 (invoice review screen) and Check 2 (flagAnomaly scaffold + wiring estimate) and Check 3 (Caldwell-fixture-mount routes) and Check 4 (pricing_history data) all hold up empirically. The launch plan's load-bearing assumptions are sound.

The minor discrepancies above are all clarifications or precision items, not corrections to load-bearing assertions.
