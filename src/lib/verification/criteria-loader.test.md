# Criteria loader smoke test

**Purpose:** prove the criteria-loader (Plan 5 `src/lib/verification/criteria-loader.ts`) extracts a non-trivial number of criteria from this phase's own 12 PLAN files. Per iter-1 plan-review ARCH-CRIT-2: the regex-based YAML parser is fragile; this test catches malformed-block-loaded-as-empty failures that nightwork-plan-review (Plan 8a) does NOT catch.

**Status:** scaffold shipped Plan 1 Task 4 (per iter-1 ARCH-CRIT-2 amendment). Plan 11 self-test EXECUTES this test against the committed `criteria-loader.ts` (which Plan 5 ships). Until Plan 5 lands, this file is documentation only.

## Run

```bash
npx tsx -e "
import { loadCriteriaFromPhase } from './src/lib/verification/criteria-loader';
const phase = 'stage-1.5c-verification-harness';
const criteria = await loadCriteriaFromPhase({ phase, repo_root: process.cwd() });
console.log('Loaded ' + criteria.length + ' non-N/A criteria from ' + phase);
const byCategory = criteria.reduce((acc, c) => { acc[c.category] = (acc[c.category] || 0) + 1; return acc; }, {});
console.log(JSON.stringify(byCategory, null, 2));
if (criteria.length < 40) {
  console.error('FAIL: expected >=40 non-N/A criteria, got ' + criteria.length);
  process.exit(1);
}
console.log('PASS');
"
```

## Expected output

- `criteria.length >= 40` (stage-1.5c-verification-harness has 12 plans × ~3-5 non-N/A criteria each = ~40-50)
- `byCategory` shows non-zero counts for at least: `mechanical` (every plan has these), `behavioral` (most plans), and either `dom` or `semantic` (some plans)
- exit code 0

## Failure modes that this test catches

1. **Hand-rolled YAML parser regex breaks on indent change:** if `extractCategoryItems()` regex assumes 4-space indent but a plan author uses 2-space, items silently dropped.
2. **Single-quote strings:** `extractCategoryItems()` regex matches only double-quoted strings; if an author writes `- 'criterion text'`, items silently dropped.
3. **`<criteria>` block delimiter typo:** `extractCriteriaBlock()` regex requires exact `<criteria>...</criteria>` tags; typo (`<criterions>`, missing close tag) silently returns null → entire plan's criteria dropped.
4. **YAML key with extra whitespace:** `extractCategoryItems()` regex requires exact `^\s{2,6}([a-z]+):\s*$` shape; trailing tab or comment breaks match.

On any of these regressions, this test fails loudly. Plan 11 self-test runs this and includes the result in SELF-TEST-LOG.md.

## Trade-off note

Per iter-1 plan-review ARCH-CRIT-2 architect recommendation: replacing the hand-rolled regex with `js-yaml` (~50KB npm dep) eliminates this entire class of bugs. Trade-off:
- **Pro:** robust, no regex brittleness, supports comments + multi-line strings + anchors.
- **Con:** new npm dep (auditable; well-maintained; ~50KB unminified ~15KB gzipped).

**Decision pending Jake at Plan 5 dispatch:** include js-yaml or stick with regex parsing. If accepted, replace `extractCategoryItems` + `extractCriteriaBlock` with `yaml.load(content)` and update Plan 5 accordingly. If rejected, this smoke test is the safety net.

## Why this scaffold ships in Plan 1 (not Plan 5 / Plan 11)

Plans 5 and 11 are downstream consumers. Plan 1 owns the contracts (types.ts, registry, idempotency, state-machine). The criteria-loader test scaffold is part of the contract — Plan 11 must be able to point to a stable test spec when it self-tests Plan 5's loader implementation.

Per iter-1 ARCH-CRIT-2: shipping the scaffold here means the Plan 5 author must read this document before writing `criteria-loader.ts`. The 4 failure modes documented above are the regressions Plan 5 must defend against, regardless of which parsing strategy is chosen.
