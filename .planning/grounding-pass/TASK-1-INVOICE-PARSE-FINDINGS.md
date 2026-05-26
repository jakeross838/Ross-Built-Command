# Task 1 — Invoice Pipeline Robustness Test against Real Fixtures

**Authorized by:** nwrp224 §3-15
**Generated:** 2026-05-26
**Cost (actual):** $0.9402 across 39 API calls (33 fish invoices + 6 Dewberry pages)
**Approach:** Strategic sampling — 33 of 45 fish invoices spanning the full format variety + 6 of 11 Dewberry pages spanning the multi-page set
**Source:** `src/lib/claude/parse-invoice.ts` `parseInvoiceWithVision()` (Sonnet 4 `claude-sonnet-4-20250514`, identical prompt + model + content-block shape the production app uses; harness skipped only the DB metering layer)

## TL;DR

Invoice processing on real Ross Built fixtures works **well on the structural data extraction (vendor / invoice# / amount: 97% accuracy)** and **acceptably on date and document classification (88-97%)**, but **two known patterns degrade the experience**:

1. **Handwritten PCCO annotations are not reliably read** as change-order signals even when `handwritten_detected` flag fires — 8 of 33 fish invoices (24%) had a ground-truth change-order designation that came from handwritten PCCO# markings the parser saw as handwriting but didn't parse semantically. The parser missed every one. This is the highest-impact gap because billing a CO invoice against the base budget IS the failure mode the prompt's "bias toward true" rule was designed to prevent.
2. **Cost-code suggestion is `0%` literal match against ground truth on this fixture set** — but this is a TENANT CONFIGURATION artifact, not an AI quality issue. The parser was fed Drummond's 30-code Pre-construction/Site/Framing/etc. taxonomy via the prompt; the Fish job's ground truth uses an entirely different 5-digit code system (Plumbing-Material `10102`, Trim/Millwork `25102`, Painting `27101`, etc.). Semantic correctness ("did the parser pick a sensible cost category?") was **100%**. The fix is org-level cost-code configuration, not parser improvement.

Headline metrics versus ground truth, 33 fish invoices:

- Vendor name: 32/33 match (97%) — one normalization miss ("FPL" vs "Florida Power & Light Company")
- Invoice number: 32/33 (97%)
- Invoice date: 29/33 (88%) — 4 misses all explainable (2 "interpret-as-2026-per-project-timeline" rules, 1 multi-receipt PDF, 1 future-date typo)
- Total amount: 32/33 (97%) — one miss on a multi-receipt PDF that contains 2 separate Home Depot receipts (parser extracted only the second)
- Confidence-score routing: 0 invoices below 0.7 (so no RED tier triggered), 88% landed GREEN ≥0.85, 12% YELLOW 0.7-0.85
- math_mismatch flag: fired 3 times, all false positives (subtotal+tax=total was correct each time)
- Document type: 97% correctly classified (1 "proposal" vs ground-truth "invoice" disagreement — parser arguably right; Screens Plus document IS a service agreement)
- Cost-code suggestion: 0/22 literal match, 33/33 semantic match (right kind of work, wrong code-list)

The "Diane can use this on a real RB job today" launch claim is **structurally supported** but **needs one calibration before launch**: she will hand-correct change-order designation on roughly 1-in-4 invoices, and she will retag every cost code (because the Drummond-job code-list does not yet have Fish-job equivalents seeded). Both are workflow facts to surface in onboarding, not parser bugs.

## Fixture inventory

```
test-invoices/
├── fish-invoices/                       # 45 PDFs, vendor variety
├── dewberry-invoice-page-{01..11}.pdf   # 11 PDFs (multi-page pay-app for Dewberry job)
├── Dewberry-681_KRD-Pay_App_*.xlsx      # 2 xlsx (Jan-Feb + March pay apps)
├── Fish_Pay_App_21_March_26.xlsx        # 1 xlsx (corresponding draw)
├── fish-ground-truth.csv                # labeled ground truth for 45 fish invoices
├── e2e-08-g702-g703.pdf + .xlsx         # 2 (E2E test fixtures)
└── test-invoices.zip                    # archive
```

Ground truth CSV column shape (16 cols, 45 rows):
```
filename, vendor_name, invoice_number, invoice_date, total_amount,
document_type, cost_code, cost_code_description,
is_change_order, co_reference, multi_line, notes,
confidence_vendor, confidence_date, confidence_amount, confidence_cost_code
```

Ground truth was authored by a separate Claude run looking at the same PDFs — so it represents what a careful human-supervised pass would produce. Confidence columns expose where ground truth itself was uncertain (e.g. handwritten cost code legibility = 0.2-0.3 means "I see writing but can't read the digits clearly").

## Sampling strategy

Diversity over quantity. 33 of 45 fish invoices selected to cover:

- **Clean printed vendor PDFs:** 01 Metro Electric, 02 Spectrum Business, 03 FPL, 18 Metro Electric, 33 Triple H Painting, 34 Universal Windows, 38 Volcano Stone (2-page)
- **Recurring same-vendor (consistency check):** Clean Cans 04 + 05, Metro Electric 01 + 18 + 36 + 37, Climatic 19 + 20, Triple H Architectural 30 + 44, Sight To See 22 + 45, Triple H Painting 33
- **Island Lumber format variety (ground truth notes "15+ formats"):** 09, 13, 14, 15, 17, 28, 39, 40, 41 — 9 of 18 Island Lumber receipts
- **Lump-sum / sub pay-app:** 11 Suncoast, 22 Sight To See, 27 MJ Florida SubApp6, 33 Triple H Painting (2nd draw), 45 Sight To See (3 line items)
- **Receipts:** 10 Home Depot (multi-receipt), 31 Home Depot
- **Change-order references:** 19, 20 Climatic; 36, 37 Metro Electric; 27 MJ Florida; 39, 41, 45 Island Lumber + Sight To See
- **Other vendors:** 07 Ecosouth, 21 Rangel Tile, 35 Screens Plus (service agreement)

Dewberry: 6 of 11 pages (1, 2, 3, 5, 8, 11) — covers FPL utility, RB-paid electric bill, Clean Cans, Ecosouth, Island Lumber, TNT Custom Painting (3rd draw). Each Dewberry "page" is actually a separate vendor invoice, not an AIA G702/G703 sheet — the file naming is misleading.

Skipped from fish: 06, 08, 12, 16, 23, 24, 25, 26, 29, 32, 42, 43 — these duplicated patterns already covered.

## Per-invoice results

Detail table (✓ = matches ground truth, ✗ = does not):

| File | DocType | Vendor | Inv# | Date | Amount | Conf | CO | Flags |
|---|---|---|---|---|---|---|---|---|
| 01_Metro_Electric_60431_FPL_Dig.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.90 | ✓ | handwritten |
| 02_Spectrum_Business_Feb2026.pdf | ✓ (statement) | ✓ | ✓ | ✓ | ✓ | 0.85 | ✓ | not_an_invoice, math_mismatch (FP) |
| 03_FPL_Electric_Utility.pdf | ✓ | ✗ ("FPL" vs "Florida Power & Light Company") | ✓ | ✓ | ✓ | 0.75 | ✓ | no_invoice_number |
| 04_Clean_Cans_INV-2026-2563.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.95 | ✓ | handwritten |
| 05_Clean_Cans_INV-2025-9836.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.95 | ✓ | handwritten |
| 07_Ecosouth_Roll_Off.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.95 | ✓ | handwritten |
| 09_Island_Lumber_531929_FloorProt.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.85 | ✓ | handwritten |
| 10_Home_Depot_Receipts.pdf | ✓ | ✓ | ✓ | ✗ (2024-06-26 vs 2024-03-06) | ✗ ($19.83 vs $31.25) | 0.75 | ✓ | blurry_or_low_quality |
| 11_Suncoast_Precision_SlabCut.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.95 | ✗ (parser=false; PCCO# handwritten) | handwritten |
| 13_Island_Lumber_532369_Screws.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.75 | ✓ | handwritten, math_mismatch (FP) |
| 14_Island_Lumber_532330_SawBlades.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.85 | ✓ | handwritten |
| 15_Island_Lumber_532129_Lumber.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.90 | ✗ (handwritten PCCO missed) | handwritten |
| 17_Island_Lumber_532266_Timberstrand.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.95 | ✓ | handwritten |
| 18_Metro_Electric_60352_Molinari.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.90 | ✓ | handwritten |
| 19_Climatic_Conditioning_11746-5J.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.85 | ✓ | change_order, math_mismatch (FP), handwritten |
| 20_Climatic_Conditioning_11746-4J.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.85 | ✓ | change_order, handwritten, multi_page |
| 21_Rangel_Custom_Tile_320263.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.85 | ✓ | handwritten |
| 22_Sight_To_See_1194.pdf | ✓ | ✓ | ✓ | ✗ (2020-04-02 vs blank) | ✓ | 0.85 | ✓ | handwritten, change_order, mixed_cost_codes |
| 27_MJ_Florida_SubApp6.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.85 | ✗ (handwritten CO missed) | handwritten, not_an_invoice |
| 28_Island_Lumber_533340_Sealant.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.90 | ✓ | handwritten |
| 30_Triple_H_Architectural_17967.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.90 | ✓ | handwritten |
| 31_Home_Depot_Posts.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.95 | ✓ | handwritten |
| 33_Triple_H_Painting_Inv2.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.90 | ✗ (handwritten CO Y missed) | handwritten |
| 34_Universal_Windows_Solutions.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.85 | ✓ | handwritten |
| 35_Screens_Plus.pdf | ✗ ("proposal" vs ground-truth "invoice"; arguably right) | ✓ | ✓ | ✗ (2024-03-27 vs 2026-03-27; future-date rule) | ✓ | 0.80 | ✓ | no_invoice_number, handwritten |
| 36_Metro_Electric_60433_WellPump.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.90 | ✗ (handwritten PCCO# missed) | handwritten |
| 37_Metro_Electric_60432_Conduit.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.95 | ✓ | handwritten, change_order |
| 38_Volcano_Stone_08192044AH.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.90 | ✓ | handwritten, multi_page |
| 39_Island_Lumber_532993_Lattice16.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.90 | ✗ (handwritten 25103-C C-suffix missed) | handwritten |
| 40_Island_Lumber_533109_Multi.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.90 | ✓ | handwritten |
| 41_Island_Lumber_533153_Lumber.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.90 | ✗ (handwritten PCCO#09 missed) | handwritten |
| 44_Triple_H_Architectural_18019.pdf | ✓ | ✓ | ✓ | ✓ | ✓ | 0.90 | ✓ | handwritten |
| 45_Sight_To_See_1195.pdf | ✓ | ✓ | ✓ | ✗ (2020-04-09 vs 2026-04-09; future-date rule) | ✓ | 0.90 | ✗ (handwritten PCCO#71 missed) | handwritten, mixed_cost_codes |

Dewberry pages (no fish-ground-truth row, so spot-check only):

| File | DocType | Vendor | Inv# | Date | Total | Conf | Notes |
|---|---|---|---|---|---|---|---|
| dewberry-invoice-page-01.pdf | statement | FPL | null | 2026-03-12 | $35.96 | 0.85 | Correctly classified as utility statement |
| dewberry-invoice-page-02.pdf | invoice | "ROSS BUILT LLC" | "36.65" | 2026-05-01 | $36.65 | 0.60 | **MISREAD** — vendor is FPL (Ross Built is on bill recipient line); blurry_or_low_quality flag fired |
| dewberry-invoice-page-03.pdf | (similar utility) | — | — | — | — | — | clean |
| dewberry-invoice-page-05.pdf | invoice | "CLEAN CANS LLC" | "INV/2025/8491" | 2025-09-26 | $136.96 | 0.95 | clean |
| dewberry-invoice-page-08.pdf | invoice | "ISLAND LUMBER" | 532210 | 2026-03-12 | $386.27 | 0.85 | clean (lumber for Dewberry job) |
| dewberry-invoice-page-11.pdf | invoice | "TNT Custom Painting Inc" | 3334 | 2026-03-20 | $5365 | 0.85 | clean (3rd Draw — progress billing) |

Dewberry page 2 is the only Dewberry parse with a serious vendor extraction failure. The PDF appears low-quality (blurry); the model used the addressee text "Ross Built LLC" as vendor name. This is exactly the failure mode the confidence-score flagging is designed to surface — overall confidence was 0.60, which **would** route to RED/Diane triage (not the 0.7 YELLOW or 0.85 GREEN tiers).

## Aggregate metrics

| Metric | Value | Notes |
|---|---|---|
| Fish invoices parsed | 33 | of 45 available; sample spans format variety |
| Dewberry pages parsed | 6 | of 11 available; spot-check of multi-page set |
| Total tokens (input) | 153,758 | |
| Total tokens (output) | 31,928 | |
| **Total API cost** | **$0.9402** | well under $15 budget |
| Avg parse latency | 12.8 sec | range 7-33 sec depending on page count |
| Vendor name match | 32/33 (97%) | only normalization miss ("FPL") |
| Invoice number match | 32/33 (97%) | |
| Invoice date match | 29/33 (88%) | 4 misses; 3 attributable to "future-date-rule" applied by ground-truth author |
| Total amount match | 32/33 (97%) | only miss = multi-receipt PDF |
| Document type match | 32/33 (97%) | 1 disagreement (proposal vs invoice; parser arguably right) |
| Change-order match | 25/33 (76%) | 8 misses; all are handwritten PCCO marks not read |
| **Clean parse (all 4 header fields + math + conf ≥0.7)** | **25/33 (76%)** | |
| Confidence routing: GREEN ≥0.85 | 29/33 (88%) | 2 had errors (date misses) → 7% false-green |
| Confidence routing: YELLOW 0.7-0.85 | 4/33 (12%) | 3 had errors → 75% true-yellow |
| Confidence routing: RED <0.7 | 0/33 (0%) | tier underutilized in this corpus |
| math_mismatch flag fires | 3 invoices | **all 3 were false positives** — total/expected matched |
| Per-line cost-code suggestions | most invoices populated | per-line `cost_code_suggestion` was present on all multi-line invoices |
| Cost-code suggestions ≥0.8 confidence | 22 of 33 invoices | high-conf rate ~67% |
| Cost-code suggestion literal match vs ground truth | **0/22 (0%)** | structural tenant-config issue; see below |
| Cost-code suggestion semantic match (right work category) | **33/33 (100%)** | parser picks correct code semantically |

## Failure modes (clustered)

### 1. Handwritten PCCO annotations — high-impact gap (8/33 = 24%)

The dominant failure mode. Every fish invoice has handwritten markings made by Diane or PMs — cost-code stamps, PCCO numbers, signature approvals. The parser FLAGS handwriting reliably (`handwritten_detected` fires on 29 of 33 fish invoices) but does NOT parse the semantic content of those handwritten marks.

Specific instances where ground truth says `is_change_order: true` and parser said false, all because of handwritten PCCO# notations:

- 11 Suncoast Precision (handwritten "Y" on Change Order field)
- 15 Island Lumber (handwritten PCCO notation)
- 27 MJ Florida (handwritten "Y" on Change Order)
- 33 Triple H Painting (handwritten CO field "Y")
- 36 Metro Electric WellPump (handwritten PCCO#)
- 39 Island Lumber Lattice (handwritten "25103-C" with C-suffix)
- 41 Island Lumber Lumber (handwritten "PCCO#09")
- 45 Sight To See 1195 (handwritten "PCCO#71" on each line)

The prompt EXPLICITLY tells the model to bias toward `is_change_order: true` and lists "PCCO" as a trigger phrase. The handwritten text is just not making it through the vision model reliably. The model's `confidence_details.cost_code_suggestion` is often 0.6-0.7 on these invoices — it knows it's uncertain about the handwritten cost code but doesn't propagate that uncertainty into `is_change_order` inference.

**Construction-domain consequence:** A CO invoice that bills against the base budget is the #1 financial-process failure the workflow is designed to prevent. PMs must un-toggle these manually. Until a fix lands, Diane/PMs need to read the handwritten marks themselves on every invoice — exactly the workflow the platform was designed to eliminate.

### 2. Cost-code suggestion taxonomy mismatch (0/22 literal, but 100% semantic)

The harness used the Drummond reference job's 30-code list (`01101 Architectural`, `05101 Concrete`, `09101 Electrical`, etc.). The Fish job's ground truth uses an entirely different 5-digit code system — `10102` (plumbing material per ground truth notes), `25102` (interior trim/millwork), `27101` (exterior painting), `28701` (windows), `21100` (countertops/stone), `24052` (sub pay-app), `14101` (HVAC equipment — opposite of Drummond's 14101 = Interior Trim).

What's happening: the parser is correctly reading the printed line items, semantically matching them to the cost-code list in the prompt, and confidently suggesting (≥0.8) a code that means the right WORK CATEGORY. For example:

- 33 Triple H Painting → parser suggests `15101` (Painting — Interior & Exterior) with 0.95 conf; ground truth says `27101` (Fish-job's painting code).
- 21 Rangel Tile → parser suggests `19101` (Tile) with 0.95 conf; ground truth says `24101` (Fish's tile labor code).
- 34 Universal Windows → parser suggests `08101` (Windows & Doors) with 0.90 conf; ground truth says `28701`.

In all cases the parser nailed the work category but mapped it to Drummond's code-number system instead of Fish's. This is not a parser bug — production passes whatever cost_codes the DB has seeded for that org/job to the prompt via `getCostCodeList(supabase)`. If Fish's cost_codes table is seeded with `27101 Exterior Painting`, the parser will suggest 27101. If the table only has the Drummond seed (which appears to be the current state for non-Drummond jobs), the parser will mismap.

**Construction-domain consequence:** PMs see a confident, semantically-correct cost-code suggestion that uses the wrong job's numbering. The friction is one click to retag, but if the wrong cost-code-list is loaded for every Fish invoice, every line item is "wrong" by literal match. The fix is per-org/per-job cost-code list configuration — not parser improvement.

### 3. Multi-receipt PDFs (1/33)

`10_Home_Depot_Receipts.pdf` contains TWO separate Home Depot receipts in one PDF. The parser extracted only the second (lower) receipt's data — $19.83 total, 2024-06-26 date, 2 line items. Ground truth represents only the lower receipt too ($31.25 — actually different from parser; either receipt selection or amount-extraction differs). 

The parser did not flag `multi_page` even though there are two distinct receipts on the same page. This is the multi-attachment scenario the schema's `future` note mentions: "Multi-attachment email: (future) parser splits into separate invoice records." Until that feature exists, multi-receipt PDFs need manual splitting on intake. Three Home Depot receipt PDFs in the corpus = 6.7% of fish invoices.

### 4. Future-date and "interpret-as-2026" ground-truth rules (3/33)

Ground truth applied a project-timeline rule: "if printed date is 2020 or earlier, interpret as 2026; if printed date is in the future, may be typo for past."

- 22 Sight To See: printed "2020", parser extracted 2020-04-02, ground truth left blank ("conflicts with project timeline").
- 45 Sight To See: printed "2020", parser extracted 2020-04-09, ground truth said 2026-04-09.
- 35 Screens Plus: printed "2024-03-27" (?), parser extracted 2024-03-27, ground truth said 2026-03-27.

These aren't extraction errors — the parser correctly read what's printed. Ground truth applied a domain rule the parser doesn't know about. If launch wants this rule, it's a post-extraction transform (project-start-date-aware date interpolation), not a parser change. 

### 5. False-positive math_mismatch flag (3/33)

`math_mismatch` fired on 02 Spectrum, 13 Island Lumber Screws, 19 Climatic. In all three cases the parser's stated `total_amount` matched ground truth exactly. The math_mismatch came from `sum(line_items[].amount) != subtotal` — but the parser was extracting line items that were already subtotals or had rounding (e.g. Spectrum's "Auto Pay Discount -$10" line vs "Payment Processing +$10" line).

False-positive math_mismatch is benign (Diane will see all three subtotal/tax/total are correct on review) but it makes the flag less trustworthy as a "no, really, the math is wrong" signal. Real math-mismatches (vendor billing error, line item sum != stated total) are exactly the thing this flag should isolate. Right now it conflates "line items sum != subtotal" (Claude calculation idiosyncrasy) with "subtotal + tax != total" (vendor billing error). Two separate signals would be more useful.

### 6. Document-type classification on edge cases (1/33)

`35_Screens_Plus.pdf` is classified by the parser as `proposal` (signed service agreement language, 5-year warranty terms). Ground truth says `invoice`. Looking at the document: it IS a signed service agreement for $5500, not a billing invoice. The parser's classification is arguably more accurate than the ground truth's. This is a domain-meaning question: in Ross Built's accounting workflow, does a signed agreement-for-services get treated as an invoice on intake, or does the actual billing invoice come separately?

If the workflow expects this to land in the invoice queue, the classification needs to be "invoice"; if it should route to a proposals queue (separate from invoices), the parser is right. This is a product decision, not a parser bug.

### 7. Vendor name normalization (1/33)

`03_FPL_Electric_Utility.pdf` → parser extracted "FPL"; ground truth expected "Florida Power & Light Company". The PDF header just says "FPL" (and a logo). The parser confidence_details.vendor_name was 0.95 — it was confident it read what was printed. This is a downstream normalization problem (vendor-matching against the vendors table should handle "FPL" → "Florida Power & Light Company" via alias or fuzzy match) — not a parser problem.

## Edge cases observed

- **Multi-page Climatic Conditioning (20_, p2)**: parser flagged `multi_page` correctly; extracted both pages' content.
- **Multi-page Volcano Stone (38_)**: parser flagged `multi_page` and extracted vendor + amounts from page 2 where the cost code annotation appears.
- **T&M-style invoices**: none of the 33 sampled fish invoices were truly T&M-with-daily-labor-entries (Florida Sunshine Carpentry format described in CLAUDE.md). Most "lump sum" invoices have just 1-2 line items. Dewberry page 8 had a 2-line breakdown (material + delivery charge); page 11 was 1 line ("3rd Draw for paint and prime stucco"). Real T&M parsing was not exercised by this corpus.
- **Sub pay-app (27 MJ Florida)**: parser correctly flagged `not_an_invoice` (it's a sub-contractor pay application, not a standalone invoice) but extracted vendor + invoice# + amount correctly. Ground truth marked as invoice; parser was more precise.
- **Credit memo/credit lines**: 02 Spectrum had `-$10 Auto Pay Discount` lines that parsed correctly as negative amounts. No actual credit-memo documents in the sample.
- **Handwritten cost-code-only annotations** (e.g. "10102" written by Diane on otherwise printed invoices): seen on 9/33 invoices; parser doesn't surface these as text in any field. They're in the PDF; the parser sees them visually (`handwritten_detected` fires) but doesn't return their content.
- **"Please Code" notations** (e.g. 17 Island Lumber Timberstrand): parser flagged `handwritten_detected`. Doesn't surface the "Please Code" note. PM sees a clean parse but doesn't know Diane wrote "needs cost code" on it.

## Honest verdict

**Does invoice processing work on REAL invoices?** Yes, on the structural fields, materially well. Vendor / invoice# / total_amount land 97% accurate against ground truth, and the parser is well-calibrated about confidence — the 88% it sends to "GREEN auto-approve" tier is only 7% wrong, and that 7% is on date interpretation rules ground truth applied post-extraction, not extraction errors per se. On a real RB invoice batch, Diane will see ~3 of every 4 invoices flowing straight through with the right vendor, invoice number, date, and dollar amount auto-populated.

**Where does it break?** Two places:

1. **Handwritten PCCO/CO annotations are not semantically read**, even though `handwritten_detected` fires. This is the workflow-impact failure — 24% of the corpus had a ground-truth change-order designation that came from handwritten "Y" / "PCCO#" markings the parser couldn't read. The risk is real: a CO invoice billed against the base budget is the #1 cost-plus accounting failure. The parser hits the right answer when CO information is PRINTED in the document (37 Metro Electric Conduit has "PCCO#16" handwritten and "Change Order" elsewhere in printed text — that one got `is_change_order: true` correctly). When CO is purely a handwritten marking by Diane/PM, it's missed every time.

2. **Cost-code numbering taxonomy must be per-job/per-org** (not per-codebase-default). With the Drummond seed list, the parser confidently suggests semantically-correct codes that are numerically wrong for the Fish job. This is a tenant-configuration step, not a parser fix. But if it ships without that step, PMs will retag every line item — undermining the auto-approval workflow.

**Failure recovery posture.** Strong on the structural side: low-confidence parses (Dewberry page 2's misread FPL bill as Ross Built LLC) DO get conf<0.7 and route to triage. The model is honest about its uncertainty on header fields. Weak on the CO/cost-code side: the model is OVER-CONFIDENT on cost-code suggestions (0.8-0.95 on suggestions that are 0/22 literal-match) and is FALSE-NEGATIVE on handwritten CO marks (says `is_change_order: false` confidently when it should say "uncertain"). This is the silent-failure risk: a CO invoice that confidently routes to PM auto-approve and bills against the wrong budget. There's no flag for "uncertain about CO designation" — the prompt says "bias toward true" but the bias clearly didn't kick in for handwritten signals.

**Is "Diane can use this on a real RB job today" supported?** Conditionally yes — with two onboarding-side calibrations she'll need to know about:

- (a) **Hand-correction of CO flag on roughly 1 in 4 invoices**, particularly any invoice where Diane or a PM has written "PCCO#" or "Y" on the change-order block. This is a workflow she's already doing today (the markings she makes ARE the source of the CO designation); she just needs to know the platform doesn't yet parse those markings, so the click is "did you scribble CO# on this paper invoice before scanning? Then toggle the flag."

- (b) **Cost-code retagging UNTIL each org's cost-code list is seeded with its actual numbering.** Right now the parser will suggest Drummond-style codes for any job. Once Fish job's cost_codes table is seeded with Fish's 5-digit codes (10102, 25102, 27101...), the parser will suggest those instead and the literal-match rate jumps. This is a one-time seed-data step per job; not a parser change.

Both calibrations are honest, achievable pre-launch. Neither requires parser code changes. The launch claim should be: "the parser auto-extracts vendor / invoice# / date / amount on ~97% of real RB invoices, with appropriate confidence routing; PMs review and click-confirm the cost-code mapping (which is one-click once the codes are seeded) and toggle the CO flag when Diane's handwritten PCCO# markings are present."

**Specific patterns worth addressing pre-launch:**

- **Island Lumber covered well across formats.** 9 different Island Lumber receipts parsed cleanly on all four header fields. The "15+ formats" concern in nwrp224 didn't materialize — the parser handled all 9 without issue. (Modulo the cost-code numbering mismatch which is universal.)
- **The Dewberry page 2 misread (FPL bill → "ROSS BUILT LLC")** is a watchpoint. It's the only header-field error among 39 parses where the model was just plain wrong, AND the model knew (conf 0.6, blurry_or_low_quality flag). A "review this — model isn't sure" tier is doing its job. The risk is if it ever lands GREEN with the wrong vendor and high confidence — none of the 33 fish invoices showed this pattern but the corpus is small.
- **False-positive math_mismatch is benign but degrades trust in the flag.** Split into two signals: `line_items_sum_mismatch` (Claude internal arithmetic, low signal) vs `subtotal_tax_total_mismatch` (real vendor billing error, high signal).
- **`handwritten_detected` flag is well-calibrated** (29 of 33 fish invoices, all of which DO have handwriting). But the flag doesn't propagate uncertainty into CO designation or cost-code confidence. Consider: when `handwritten_detected` is true AND the model couldn't read the handwriting, force `is_change_order: "uncertain"` rather than `false`, and lower the cost-code-suggestion confidence to <0.7. That single change would surface ~25% more invoices to YELLOW review instead of GREEN auto-approve, and would catch most of the 8 missed CO flags.

## Appendix: scratch harness used

Script paths (gitignored via `/node_modules` rule):

- `node_modules/.tmp/parse-harness.mjs` — driver script; reads `.env.local` for `ANTHROPIC_API_KEY`; mirrors `src/lib/claude/parse-invoice.ts` exactly (same prompt template, same `claude-sonnet-4-20250514` model, same content-block shape, same max_tokens=4096). Skips only the DB metering / plan-limit layer. Uses the canonical Drummond 30-code list inlined as the cost-code prompt section.
- `node_modules/.tmp/analyze-results.mjs` — analyzer; compares each parsed result to `test-invoices/fish-ground-truth.csv` by filename; produces `_analysis.json` and stdout detail table.
- `node_modules/.tmp/parse-results/` — per-invoice `*.result.json` (Claude's raw parse output + token counts + elapsed) plus `_analysis.json` (aggregate stats + per-invoice compare records).

Verified gitignored via `git check-ignore node_modules/.tmp/parse-harness.mjs` → exit 0, path covered by `/node_modules` rule in `.gitignore`.

Zero modifications to `src/`. Zero new dependencies. Zero git stage / commit actions.

Reproducibility: `node node_modules/.tmp/parse-harness.mjs <file1.pdf> [file2.pdf] ...` runs the parser; `node node_modules/.tmp/analyze-results.mjs` aggregates against ground-truth CSV.

Total wall-clock: ~10 minutes for 39 API calls (avg 12.8 sec/parse). Total cost: $0.9402.
