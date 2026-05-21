# Spec check: Plan-review iter-1 B-2a Token-issuance security model

Reviewer: nightwork-spec-checker
Date: 2026-05-21
Plan: B-2a-PLAN.md (2289 lines)
Verdict: NEEDS-WORK

---

## Overall verdict

NEEDS-WORK. The plan resolves all 11 in-scope iter-1 SYNTHESIS blocking findings
(B-1..B-11) with concrete SQL and implementation. Two BLOCKING findings must be
resolved before /nx.

BLOCKING-1 (PLAN_MISSING_CRITERIA_BLOCK): No structured criteria yaml block in
B-2a-PLAN.md. D-17/D-18 mandate is unconditional for all plans authored after
stage-1.5c-verification-harness shipped (2026-05-20). B-2a authored 2026-05-21.

BLOCKING-2 (AC-B2a-06 Query 2 text inconsistency): AC definition at PLAN:1845 lists
5 args to a 6-parameter function. SQL at PLAN:1992-1999 is correct (6 args). AC text
and SQL are inconsistent; ai-logic-tester cannot execute the AC definition verbatim.

HIGH-1 (not independently blocking): AC-B2a-05 timing-oracle verification deferred
to execute-time script. For the criterion with NO partial-index escape per nwrp202
section 4, the probe methodology must be pinned in the PLAN.

---

## AC count and falsifiability summary

| # | AC | Falsifiable | Pinned probe | Notes |
|---|---|---|---|---|
| 1 | AC-B2a-01 Migration applies | YES | YES PLAN:1882-1888 | schema_migrations check |
| 2 | AC-B2a-02 Composite FK invariant | YES | YES PLAN:1891-1915 | pg_constraint + cross-tenant INSERT probe |
| 3 | AC-B2a-03 Backfill completeness | YES | YES PLAN:1921-1935 | orphan-count=0 + Drummond row |
| 4 | AC-B2a-04 Down migration reversibility | YES | YES PLAN:1941-1953 | down-apply + column-absent check |
| 5 | AC-B2a-05 Index posture timing oracle | PARTIAL | PARTIAL PLAN:1959-1970 | pg_indexes pinned; variance test deferred; see HIGH-1 |
| 6 | AC-B2a-06 RPC NULL-leak fix 3 queries | PARTIAL | PARTIAL PLAN:1975-2038 | Q1+Q3 concrete; Q2 AC text 5-arg inconsistency; see BLOCKING-2 |
| 7 | AC-B2a-07 1-year token lifecycle | YES | YES PLAN:2044-2060 | column_default + pg_get_functiondef |
| 8 | AC-B2a-08 Admin revocation end-to-end | YES | YES PLAN:2064-2115 | 7-step curl+SQL; audit-log; PM 403; cross-tenant blocked |
| 9 | AC-B2a-09 Middleware + FK citations | YES | YES PLAN:2120-2134 | curl probes; grep citation count |
| 10 | AC-B2a-10 DB-backed rate-limit | YES | YES PLAN:2140-2162 | 35-request burst + DB counter + cleanup |
| 11 | AC-B2a-11 Helpers enforce scope | YES | YES PLAN:2165-2178 | unit tests + cross-client probe script |
| 12 | AC-B2a-12 draws + change_orders indexes | YES | YES PLAN:2184-2192 | pg_indexes query |
| 13 | AC-B2a-13 GATE Jake review | YES | YES PLAN:1864-1875 | 9-item checklist; Drummond canary explicit |

Falsifiability score: 11/13 fully pinned; 2 partial (AC-B2a-05, AC-B2a-06).

---

## Traceability table

| AC | EXPANDED-SCOPE section 11 | D-NN | iter-1 SYNTHESIS |
|---|---|---|---|
| AC-B2a-01 | line 393: migration applied + FK exists | D-17 | B-2 |
| AC-B2a-02 | line 393: same-org invariant | D-01 | B-2 multi-tenant C-2 |
| AC-B2a-03 | line 393: Drummond token backfilled | D-02 | -- |
| AC-B2a-04 | line 393: migration applied reversibility | D-17 | -- |
| AC-B2a-05 | line 401: full covering index timing oracle | D-04 | B-7 security BLOCKING-2 |
| AC-B2a-06 | lines 394-397: RPC NULL-leak fix 3 queries | D-05 D-06 | B-4 rls-auditor W-4 nwrp201/202 |
| AC-B2a-07 | line 398: 1-year locked + revocation | D-07 D-08 | EXPANDED-SCOPE section 6 Q5 LOCKED |
| AC-B2a-08 | line 398: revocation writes audit-log user_id | D-08 D-09 D-10 D-11 | -- |
| AC-B2a-09 | line 400: PUBLIC_PATHS; line 404: FK citations | D-12 D-19 | B-5 B-8 |
| AC-B2a-10 | line 399: rate-limit Vercel-functional | D-15 D-16 | B-6 security BLOCKING-1 |
| AC-B2a-11 | lines 402-403: getScopedOwnerPortalClient + assertDrawBelongsToToken | D-13 D-14 | B-1 B-3 |
| AC-B2a-12 | line 405: draws + change_orders job_id indexes | D-18 | B-11 database BLOCKING-2 |
| AC-B2a-13 | line 406: GATE Jake reviews before B-2b | D-17 GATE semantics | EXPANDED-SCOPE section 9 HALT GATE B-2a |

Traceability: 13/13 ACs trace to EXPANDED-SCOPE section 11 items. 13/13 trace to D-NN
decisions. All 11 in-scope synthesis findings (B-1..B-11) mapped. B-12..B-16 deferred
to B-2b. B-17 RESOLVED. AC count: EXPANDED-SCOPE section 11 lists 12 B-2a-scoped ACs
(lines 393-406); PLAN adds AC-B2a-13 as GATE bundling AC; PLAN frontmatter line 81
declares 13. Count matches.

---

## Structured criteria block check

Result: BLOCKING -- PLAN_MISSING_CRITERIA_BLOCK

A grep of B-2a-PLAN.md for criteria block markers (criteria tag, mechanical:, dom:,
visual:, behavioral:, semantic:) returns zero matches. Stage-1.5c-verification-harness
shipped 2026-05-20 (commit c20e5d9). B-2a was authored 2026-05-21. Mandate is
unconditional for all post-harness plans regardless of plan type or UI surface scope.

Expected categories for B-2a:
  mechanical (Layer 1): FK shape verification (AC-B2a-02), rate-limit table existence
    (AC-B2a-10), index existence (AC-B2a-05 AC-B2a-12), actor_token_id column (AC-B2a-08).
  dom (Layer 1): admin token list renders with Revoke button on active rows; disabled
    badge on revoked rows. Maps to AC-B2a-08 admin UI surface.
  visual (Layer 3): N/A with explicit rationale. nwrp202 section 15 waived
    design-pushback for B-2a (no UI surface design-novelty; admin revocation UI reuses
    existing admin section patterns). Valid N/A if rationale stated inline.
  behavioral (Layer 2): revocation flow end-to-end (AC-B2a-08); rate-limit burst test
    (AC-B2a-10); cross-org RPC rejection (AC-B2a-06 Q3).
  semantic (Layer 3): assertDrawBelongsToToken returns false on cross-client probe;
    getScopedOwnerPortalClient enforces scope at type-system level (AC-B2a-11).

---

## Locked-decisions integrity check

| Locked decision | PLAN evidence | Verdict |
|---|---|---|
| Token expiration 1-year LOCKED (nwrp200) | PLAN:1097-1099 PLAN:506 PLAN:1208 1262 | HONORED |
| Mandatory revocation (nwrp200 Q5) | PLAN:575-598 PLAN:1720-1754 | HONORED |
| Rate-limit DB-backed (nwrp201/202 section 3) | PLAN:778-819 PLAN:826-888 | HONORED |
| Index posture full covering NO partial escape (nwrp202 section 4) | PLAN:533-543 PLAN:519 | HONORED |
| B-4 AC 3-query (nwrp201/202 section 5) | PLAN:1843-1846 all 3 queries; SQL correct; AC text needs BLOCKING-2 fix | HONORED with correction needed |
| Composite FK (EXPANDED-SCOPE section 7) | PLAN:381-421 | HONORED |
| CREATE OR REPLACE RPC (D-05) | PLAN:444-453 rationale + PLAN:1108-1160 full RPC body | HONORED |
| Single migration 00104 (D-17) | PLAN:1009-1353 | HONORED |
| PATTERNS.md B-17 RESOLVED | PLAN:128-131 | HONORED |
| PostgREST FK citations (Workflow Rule 2) | PLAN:424 + PLAN:1767 | HONORED |

All 10 locked decisions honored. No re-litigation found.

---

## Out-of-scope discipline check

| Deferred item | PLAN location | Verdict |
|---|---|---|
| /owner/{token} route + mobile UI + doc downloads (B-2b) | PLAN:117-118 | EXPLICIT |
| actor_token_id audit-log WRITES (B-2b) | PLAN:120-121 | EXPLICIT |
| TOCTOU close on acknowledge (B-2b) | PLAN:122 | EXPLICIT |
| Soft-delete + status filters on portal queries (B-2b) | PLAN:123 | EXPLICIT |
| TD-B1abis-03 ClientCombobox (B-2b) | PLAN:124 | EXPLICIT |
| NwButton TD-20 exemption (B-2b) | PLAN:125 | EXPLICIT |
| Soft-delete trigger + DEF-WC-1 + DEF-WC-3 (B-3) | PLAN:177 sequencing + PLAN:127 OOS | INFERRED via sequencing |
| activity_log entity_type general additions (B-4) | PLAN:238 Sweep 2 | HONORED |
| New PATTERNS.md Owner Status View entry | PLAN:128-131 explicit RESOLVED cite | EXPLICIT |

Out-of-scope discipline: PASS. All 8 required deferrals present.

---

## Domain rules spot-check

Drummond fixtures used: PASS -- PLAN:1932 uses Drummond job identifier in AC-B2a-03
  query. AC-B2a-13 item 9 (PLAN:1874) mandates Drummond backfill canary explicitly.

Recalculate-not-increment honored: PASS -- B-2a adds no financial running totals.
  Rate-limit counter is DB-backed atomic UPSERT structurally distinct from financial
  aggregation; no stored financial derived values added.

Multi-tenant RLS posture: PASS -- owner_portal_rate_limit RLS-on-no-policy
  service-role-only (PLAN:815-818). Composite FK enforces same-org BY CONSTRUCTION.
  Admin revoke: getCurrentMembership() + updateWithLock org-scoped (PLAN:580-584).
  activity_log existing RESTRICTIVE cited at PLAN:993.

Design tokens (no hardcoded colors): PASS -- Hook pre-flight sweep (PLAN:306-315)
  shows 0 hits across all 4 new file samples for all 10 hook regex categories.

Audit log writes on every state change: PASS -- Admin revocation writes activity_log
  row (PLAN:1721 Task 7 step 5). LogActivityArgs extended for B-2b writes
  (PLAN:930-941).

SECURITY DEFINER search_path hardening: PASS -- SET search_path = public, pg_temp on
  all new/redefined SECURITY DEFINER functions (PLAN:1113-1114 1173-1174 1225-1226
  1291-1292 1313-1314). REVOKE PUBLIC EXECUTE per 00103 pattern
  (PLAN:1299-1300 1327-1328).

---

## Findings

### BLOCKING

BLOCKING-1: PLAN_MISSING_CRITERIA_BLOCK (D-17/D-18 mandate)

B-2a-PLAN.md (2289 lines) contains no structured criteria yaml block. Stage-1.5c-
verification-harness shipped 2026-05-20; B-2a authored 2026-05-21. Mandate is
unconditional for all post-harness plans.

Fix: Add the criteria block before /nx. Categories described above in the criteria
block check section. N/A on visual acceptable given nwrp202 section 15 waiver if
rationale stated inline. N/A entries are valid per criteria-loader convention when
rationale is present.

BLOCKING-2: AC-B2a-06 Query 2 AC definition text inconsistency (PLAN:1845)

The AC definition text at PLAN line 1845 reads: invoke create_client_portal_invite
with 5 positional arguments (test_job_id, test_email, test_name, visibility_config,
expires_at). The function signature at PLAN:1108-1111 requires 6 parameters:
p_org_id, p_job_id, p_email, p_name, p_visibility_config, p_expires_at. The
verification SQL block at PLAN:1992-1999 is correct (6 arguments with test_org_id
as first argument). The AC definition text and the verification SQL are inconsistent;
the ai-logic-tester cannot execute the AC definition verbatim without correction.

Fix: Correct PLAN line 1845 to include test_org_id as the first argument, matching
the verification SQL. The SQL block is already correct and does not need to change.

### HIGH

HIGH-1: AC-B2a-05 timing-oracle verification deferred to execute-time script
authoring (PLAN:1968-1970)

AC-B2a-05 is the single criterion carrying the NO-partial-index-escape constraint
from nwrp202 section 4 -- the hardest locked criterion in the PLAN. The timing
variance threshold (<2x response time between revoked vs never-existed tokens) at
PLAN:1969 is the correct criterion, but the probe implementation is deferred to
scripts/b-2a-timing-oracle-probe.ts authored at execute time. Pinned methodology
required: (a) setup 3 token states -- valid, revoked, never-existed; (b) probe each
N>=20 times via resolveOwnerToken(); (c) compute mean response time for each state;
(d) pass criterion: max(mean_revoked, mean_never_existed) / mean_valid < 2.0.

Does not independently block /nx but must be addressed before the plan-checker can
return PASS on the next iteration.

### MEDIUM

MEDIUM-1: Plan-Author Latitude #3 (revoked_seq column) requires explicit iter-1
disposition from security + database reviewers (PLAN:139-157)

PLAN section 2 surfaces Options A/B/C with a full tradeoff matrix and declares
Option A as default. Task 1 sub-steps section 1e + section 1f + AC-B2a-05 +
AC-B2a-08 all carry conditional text pending iter-1 choice. The executor cannot
begin Task 1 until iter-1 dispositions this. Option B violates CLAUDE.md Never-delete
Dev Rule; Option C re-introduces the timing oracle explicitly prohibited by nwrp202
section 4. Security + database reviewers must confirm Option A explicitly.

MEDIUM-2: Plan-Author Latitude #4 (sliding-window UPDATE 90-day to 1-year) requires
explicit iter-1 sign-off (PLAN:159-173)

PLAN section 2 surfaces in-scope vs defer for submit_client_portal_message +
mark_client_portal_message_read sliding-window UPDATE lines. Plan-author default
(in-scope) is already authored inline at PLAN:1162-1264. Given nwrp200 LOCKED
1-year token expiration, defer produces known-incorrect semantics (any token use
would roll the window back to 90 days) and requires a nwrp override. Iter-1
reviewers should confirm in-scope. AC-B2a-07 verification at PLAN:2059-2061
is contingent on this disposition.

### NOTE

NOTE-1: Rate-limit fail-open posture warrants security-reviewer confirmation
(PLAN:866-868)

The rate-limit.ts DB error path returns allowed=true with a Sentry breadcrumb.
The comment says Better to leak rate-limit than block users. For a HIGH-threat-model
plan the security-reviewer should explicitly confirm this is acceptable. Given 256-bit
token entropy the effective risk is low, but explicit sign-off is appropriate.

NOTE-2: PLAN frontmatter line 22 says 8 verification items; AC-B2a-13 lists 9
(PLAN:22 vs PLAN:1865-1875)

PLAN frontmatter line 22 reads 8 verification items in EXPANDED-SCOPE section 9.
AC-B2a-13 lists 9 numbered items including the Drummond backfill canary as item (9)
added per iter-1 plan-checker WARNING #3. Update line 22 to 9. Cosmetic; update
before /nx.

NOTE-3: action-labels.ts pre-edit baseline needs executor confirmation at execute
time (PLAN:1609-1620)

Exhaustiveness loop at PLAN:1617-1620 lists 12 entity types. The plan states
pre-edit baseline is 11 entries and post-edit expected is 12. The loop includes
user -- if pre-edit is truly 11, user is already present and only client_portal_access
is new. Executor should grep action-labels.ts before editing to confirm the 11-entry
baseline. The TypeScript exhaustiveness check (tsc --noEmit) at PLAN:1601 is the
authoritative gate regardless.

---

## Verdict

NEEDS-WORK

Two BLOCKING findings (PLAN_MISSING_CRITERIA_BLOCK + AC-B2a-06 Query 2 text
inconsistency) must be resolved before /nx. The plan is otherwise well-structured,
fully traced, covers all 10 locked decisions, and resolves all 11 in-scope iter-1
SYNTHESIS findings with concrete SQL.

Required before /nx:
1. Add structured criteria block (5 categories; visual=N/A acceptable with rationale)
2. Fix AC-B2a-06 definition text at PLAN:1845 to list all 6 function arguments

Strongly recommended before /nx:
3. Pin timing-oracle probe methodology in AC-B2a-05 verification commands (HIGH-1)

Iter-1 reviewer dispositions required:
4. Plan-Author Latitude #3: confirm Option A (revoked_seq column)
5. Plan-Author Latitude #4: confirm in-scope (sliding-window 1-year for both RPCs)

---

Report generated by nightwork-spec-checker (plan-review iter-1 mode, pre-execute).
No source files were modified.
