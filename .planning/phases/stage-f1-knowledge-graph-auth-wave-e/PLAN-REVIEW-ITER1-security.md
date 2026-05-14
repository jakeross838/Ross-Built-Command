---
phase: stage-f1-knowledge-graph-auth-wave-e
document: PLAN-REVIEW-ITER1-security
reviewer: security-reviewer (claude-sonnet-4-6)
reviewed: 2026-05-14
scope: E-1 + E-2 + E-3 PLAN.md files + D-079 wording + override audit trail + FINDING-2 remediation completeness + residual findings assessment
authorization: nwrp145 adjudication context
status: COMPLETE
---

# Wave-E Plan-Review Iter-1 — Security Lens

## Verdict: WARNING

Wave-E plans are directionally sound and close the two HIGH findings from Wave-D. No new CRITICAL or HIGH security issues are introduced by E-2 or E-3 as designed. Three WARNING-level concerns are raised below, none blocking Wave-E ship, but one requires an executor note before the smoke re-run.

---

## Section 1: D-079 Wording Precision

### Assessment: PASS with one minor gap noted

The D-079 entry at `.planning/MASTER-PLAN.md` line 255 is substantively correct and well-scoped. The following criteria are met:

**Customer-PII-vs-vendor-B2B-contact distinction:** Crisp. D-079 explicitly scopes the PII fence to (a) `profiles` columns, (b) `jobs` customer columns (`client_email`, `client_phone` via TD-WD-06), (c) future ENTITY-INVENTORY `PII?`-flagged columns. It carves out `vendors` by name with the rationale "vendor B2B contact info is published business data." The distinction is actionable: a future security reviewer can determine whether a given column is in-scope for the fence by checking (1) is it in `profiles`? (2) is it in `jobs` customer columns? (3) is it flagged PII? in ENTITY-INVENTORY? If all three are no, D-079 says it's not fenced.

**Trigger conditions for re-evaluation:** Appropriate and specific. Three conditions listed: (i) vendor master agreement restricting contact info distribution, (ii) GDPR-equivalent regulation classifying B2B contact as protected, (iii) new vendor table column introducing homeowner-equivalent PII (example given: `vendor_personal_email` for sole proprietors). The third trigger is the most architecturally important — it correctly anticipates the scenario where the vendors table evolves to contain genuinely personal data rather than purely commercial entity data. This trigger is actionable.

**SOC2 control implications (CC6.1):** Captured. D-079 notes "CC6.1 (access controls) — clarifies the access-control intent for vendor data without changing policy; the existing org-scoped RLS on `public.vendors` is the structural enforcement." This is accurate: no new control surface is introduced, and the existing RLS policy remains. The framing is appropriate for a "crystallizes implicit posture explicitly" decision.

**Minor gap — sole proprietor scenario requires a Wave-4 reminder:** D-079's trigger condition (iii) mentions `vendor_personal_email` for sole proprietors as the re-evaluation trigger. This is correct but passive. Wave 4's vendor portal work (mentioned in E-1 PLAN.md plan-review notes) will introduce vendor-facing registration and potentially require vendors to supply personal contact information (e.g., a sole-prop electrician's personal mobile number). At that point the B2B-contact-is-published-business-data rationale may not hold. D-079 currently relies on the trigger being noticed at plan-review time for Wave 4. The gap is acceptable at this stage; the trigger condition text is sufficient to catch it. No action needed before Wave-E ship.

---

## Section 2: Override Audit Trail Assessment

### Assessment: PASS — Meets SOC2-equivalent documented control activity discipline

The override audit trail at `.planning/qa-runs/wave-d/finding-1-reclassification.md` (confirmed gitignored via `.gitignore:107`) satisfies the requirements for a documented control override:

**Timestamp:** Present ("Date: 2026-05-14").

**Authorization:** Present and specific ("Authorization: nwrp145 — Jake explicit Path C decision").

**Reviewer identity:** Present ("Jake" explicit; the file attributes the decision to the project owner by name and by nwrp reference number).

**Original finding documented:** Present (full reproduction of FINDING-1 text, pointing to `src/app/api/invoices/[id]/route.ts:76`).

**Rationale documented:** Present and numbered (5 points, matching the 5 points in the nwrp145 adjudication description).

**Scope of override documented:** Present — explicitly states what does NOT change (vendor RLS posture, other PII fences, Wave-B security expectations, TD-WD-06 for `client_email`/`client_phone`). This scoping is critical for a correct override — it prevents future reviewers from using D-079 to argue that customer PII fences are loosened.

**Trigger conditions for reversal:** Present (vendor master agreement, GDPR-equivalent, new vendor PII columns — matching D-079).

**SOC2 control mapping:** Present (CC6.1 with rationale). The statement "no new SOC2 controls introduced; audit trail (this file + D-079) satisfies the documented-override discipline implied by SOC2's 'control activities must be documented' principle" is accurate.

**Cross-reference density:** Four locations cross-reference each other (this file + D-079 + Wave-E EXPANDED-SCOPE + E-1 PLAN.md). The cross-reference chain is sufficient to prevent the override from being orphaned in any of those four locations.

**One observation — gitignored-only audit trail:** The `finding-1-reclassification.md` is gitignored, meaning it does not travel with the repo. Future contributors on a fresh checkout will not have it. D-079 in MASTER-PLAN.md (which IS tracked) carries the rationale in summary form, so the override is not lost. However, the full 5-point rationale and the explicit "what does not change" scoping are in the gitignored file only. For a SOC2 audit this is an observation, not a finding: the override is documented in a tracked artifact (D-079), and the gitignored file is the detailed supporting evidence available on the committer's machine. This is the same posture as `finding-2-remediation.md` and is consistent with the project's general posture for wave-level audit artifacts. No action needed.

---

## Section 3: FINDING-2 Remediation Completeness

### Assessment: CONDITIONALLY CLOSED — one gap must be confirmed before Wave-E smoke re-run

FINDING-2 had two components: (A) 9 production smoke accounts with known plaintext credential, and (B) plaintext password committed to the repo in `scripts/fixtures/smoke-seed.sql`.

**Component A — Production account deletion:** CLOSED. The `finding-2-remediation.md` documents a thorough cascade analysis (56 FK columns checked across 37 NO ACTION references, UNION probe returned zero rows), atomic DELETE, and post-state verification table confirming fixture-harness-org returned to its canonical pre-nwrp135 state. The cleanup is well-executed and the audit trail is complete.

**Component B — Plaintext password in committed file:** CONDITIONALLY CLOSED by E-2's plan. The E-2 plan correctly designs the rewrite to use `crypt(gen_random_uuid()::text, gen_salt('bf'))` at apply time with credentials persisted to a gitignored file via Postgres NOTICE output. However:

The current committed state of `scripts/fixtures/smoke-seed.sql` still contains `v_password TEXT := 'SmokeSeed2026!'` at line 65. The E-2 plan is the remediation, but it has not yet executed. The committed plaintext password is still in the git history of the main branch (commit `ec68df2`). Deleting the 9 production accounts (Component A) prevents authentication against production, but the credential is still readable from `git log` and the current file.

**This is known and expected** — E-2 is the planned fix. The plan's design is correct. Once E-2 executes and commits the rewritten seed, Component B closes at the file level. However, `SmokeSeed2026!` will remain readable in git history indefinitely. This is not a blocker for Wave-E, but the executor should be aware:

- If smoke harness tests re-run against production before E-2 lands and the seed is re-applied, the old password would re-create the 9 accounts.
- The EXPANDED-SCOPE explicitly notes "apply rewritten seed post-merge" as an orchestrator step (not in plan body), which is the correct posture.

**Credentials-file mechanism for E-2:** The NOTICE-to-stdout → pipe-to-file approach is novel. The plan body interface section shows the SQL using `RAISE NOTICE` with credentials in the message body. The orchestrator is expected to pipe `psql` stdout to the credentials file. This is workable but has two implementation-level risks the executor must handle correctly:

1. **psql NOTICE output format:** Postgres `RAISE NOTICE` output goes to stderr in `psql`, not stdout (unless `psql` is invoked with flags that merge them). The apply procedure must use `psql ... 2>&1 | grep -A9999 'SMOKE_SEED_CREDENTIALS_START'` or equivalent, or the credentials will not appear in the captured output. The plan body shows the interface but does not specify the exact pipe command. The executor MUST verify the capture mechanism before declaring E-2 complete. If NOTICE goes to stderr and the pipe only captures stdout, the credentials file will be empty and harness-auth-bootstrap.ts will throw.

2. **Credentials file on re-apply:** The plan correctly notes the file is rewritten on every apply. The executor must ensure the file-write step is atomic (not partially written on a failed apply). Since the credentials are generated inside the DO block and emitted at end of block via a single RAISE NOTICE, a transaction failure before the NOTICE fires would produce no credentials output — harness-auth-bootstrap.ts would throw a clear error rather than silently use stale credentials. This is acceptable behavior.

**No new security issues introduced by the credentials-file mechanism:** The file is gitignored (confirmed via `git check-ignore` returning `.gitignore:107`), named with `DO-NOT-COMMIT` as a human tripwire, and lives under `.planning/qa-runs/wave-d/` which inherits the `/.planning/*` exclusion. The bcrypt hashing in the DB (via `crypt(v_password, gen_salt('bf'))`) is correct — the cleartext UUID lives only in the DO block's local variable and the NOTICE output; it is never stored in the DB. Entropy is adequate (UUID v4 = ~122 bits, overkill for synthetic fixture accounts). The approach is sound.

---

## Section 4: New Security Findings in E-2 and E-3

### E-2 Credentials-File Injection Risk

The `harness-auth-bootstrap.ts` credentials-file fallback reads the file and parses each line via `line.split(/\s+/)`. The `[credEmail, credPw]` destructure takes the first two whitespace-delimited tokens. There is no structural injection risk here because:

- The credentials file is written by the Postgres seed script, not by user input.
- The file is gitignored and lives on Jake's local machine only.
- The parsed `credPw` value is passed directly to `page.fill('input[name="password"]', password)` in Playwright — it goes into a form field in a controlled browser session, not into a shell command or SQL query.
- The email filter `email.startsWith("smoke-")` before attempting the file read is a correct guard that prevents the fallback from being reached for the harness-fixture user.

**One observation:** If the credentials file contains a line with only one whitespace-delimited token (malformed line), `credPw` will be `undefined`. The `if (credEmail === email && credPw)` check in the bootstrap code (per plan interface) correctly guards against using an undefined password — it will fall through to the throw. This is safe behavior. No injection risk identified.

### E-3 RLS Posture on `/financials/bills/[id]`

The E-3 plan correctly identifies and addresses the auth boundary. The design calls for:

- `getCurrentMembership()` called before any DB access, with `notFound()` on null
- `.eq('org_id', membership.org_id)` explicit org filter (belt-and-suspenders with RLS)
- `.is('deleted_at', null)` soft-delete filter
- `.maybeSingle()` rather than `.single()` (returns null on not-found rather than throwing, enabling the explicit notFound() call)

The vendor embed in E-3 uses `vendor:vendor_id (id, name, address)` — the narrowed shape excluding phone/email, consistent with the post-D-079 convention (vendor B2B contact info not in scope for the PII fence, but E-3 explicitly chooses the narrowed embed anyway, which is conservative and correct). This means E-3 does not re-introduce the FINDING-1 surface even on its own terms.

The Caldwell fixture import removal (verified by AC-E3-03 grep) eliminates the current page.tsx's dependency on in-memory fixture data for the production route. This is a security improvement: the current code's `CALDWELL_INVOICES.find((i) => i.id === params.id)` would return results on any Caldwell string ID regardless of org membership, because the fixture lookup has no org scope. Post-E-3, the DB query with `.eq('org_id', orgId)` and RLS enforces org isolation properly.

The current page (pre-E-3) is effectively a static fixture server gated only by middleware. It cannot serve another org's data because there is no other org's data in the fixtures — but it also has no auth check of its own. E-3 correctly adds application-layer auth. No new security issues introduced.

**One observation:** The E-3 plan's threat model T-E-3-01 includes an AC-E3-04 grep to verify no UUID-pattern string literal is hardcoded in the page.tsx. The grep pattern as described ("no string literal matching UUID pattern in page.tsx post-wire, excluding the synthetic seed UUID PREFIX `33333333-` if it appears in a doc-comment") relies on the executor remembering to exclude comment-only occurrences. The plan's acceptance criteria table at AC-E3-04 should explicitly state `grep -nE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' src/app/financials/bills/\[id\]/page.tsx | grep -v '//'` or equivalent. As written it is ambiguous. This is LOW severity — the executor will likely implement it correctly, but the acceptance criterion text should be precise.

---

## Section 5: Residual Findings Assessment (FINDING-3 through FINDING-8)

### FINDING-3 [MEDIUM] — HARNESS_FIXTURE_PASSWORD leaked in conversation transcript; no rotation performed

**Wave-E disposition:** OUT OF SCOPE — explicitly deferred by nwrp141 Q2 ("don't-rotate decision"). The E-2 plan confirms this at the "Out of E-2 scope" bullet: "harness-fixture password rotation (override per nwrp141 Q2; documented in calibration log)."

**Assessment:** The deferral is documented. The no-rotation decision rests on the fact that `harness-fixture@nightwork.local` is scoped to fixture-harness-org (synthetic data only) and that the credential exposure was in a conversation transcript rather than in committed code. The risk is that org-admin in fixture-harness-org is the highest-privilege credential in the harness scope, and an attacker with both the transcript and the production Supabase URL could authenticate and probe. With the 9 smoke accounts deleted, the harness-fixture user is the only remaining auth account with a potentially-known credential.

**Escalation assessment:** MAINTAIN as MEDIUM. The deferral rationale is reasonable but the underlying exposure remains live. TD-WD escalation to Wave-B prerequisite is not warranted because (a) the credential scope is limited to synthetic fixture org, (b) transcript exposure is outside git history, (c) rotation is low-cost and should be done before Wave-B execution as a matter of hygiene even if not formally blocked.

**Recommendation:** Add a Wave-B prerequisite bullet for `HARNESS_FIXTURE_PASSWORD` rotation alongside the existing Wave-B prerequisites. The calibration log already documents the deferral; adding it to the Wave-B prerequisite list makes it actionable rather than advisory.

### FINDING-4 [MEDIUM] — `SELECT *` on jobs table in job overview endpoint returning `client_email` / `client_phone`

**Wave-E disposition:** OUT OF SCOPE — correctly scoped to TD-WD-06 for Wave 1.1-Lite. E-1's "What does NOT change" section explicitly confirms TD-WD-06 remains active. D-079 explicitly states "Path C does NOT relax that."

**Assessment:** Appropriately scoped. `client_email` and `client_phone` are customer PII (homeowner contact info). The D-078 fence plus D-079's explicit carve-preservation make clear this is a future remediation item, not a Wave-E concern. MAINTAIN as MEDIUM in Tech Debt Registry. No escalation.

### FINDING-5 [MEDIUM] — `dangerouslySetInnerHTML` without DOMPurify on typography playground

**Wave-E disposition:** Not mentioned in Wave-E plans. It was originally classified as LOW in the security review (the report lists it as MEDIUM in the finding header but the "Verdict: FALSE POSITIVE for production code" downgrades it practically).

**Assessment:** FALSE POSITIVE confirmed. The `b.reason` values at `src/app/design-system/typography/page.tsx:512` are hardcoded static HTML entity strings (e.g., `"Office-document association &mdash; wrong tonal register..."`). No user input reaches this path. The page is gated to `platform_admin` only. The concern is code-review hygiene rather than an active vulnerability. Scoping to Wave 1.1-Lite cosmetic cleanup or a single-line comment addition is appropriate. No escalation from Wave-D classification.

### FINDING-6 [LOW] — `--no-verify` near-miss on D-1 first commit

**Wave-E disposition:** Resolved before Wave-D shipped. The commit was reset before push to origin/main. CLOSED.

### FINDING-7 [LOW] — `SmokeSeed2026!` committed in plaintext

**Wave-E disposition:** BEING REMEDIATED by E-2. The current state (plaintext still in committed file) is known and expected. Post-E-2 the file will be rewritten. Git history will retain the old password, but the production accounts were already deleted (Component A, FINDING-2 remediation). WILL CLOSE at E-2 execution.

**One residual concern:** The git history contains the plaintext password at commit `ec68df2`. If the repository ever becomes public (unlikely for an internal ops platform, but possible in a future open-source or vendor-audit scenario), the credential will be accessible via `git log -p`. For a synthetic fixture account with a narrow RLS scope, this is LOW risk. If the repository's access model ever changes, a `git filter-repo` pass to scrub `ec68df2` would be warranted.

### FINDING-8 [LOW] — No staging layer (push-to-main deploys directly to production)

**Wave-E disposition:** OUT OF SCOPE — documented as Wave-B prerequisite per nwrp136. Wave-E's harness improvements (E-2 selector fixes, E-3 real DB wire) are improvements to the smoke harness quality but do not change the deployment architecture.

**Assessment:** Appropriately deferred. The harness runs against Vercel preview URLs when invoked correctly; the issue is that there is no CI-gated enforcement that the smoke fires before main is updated. This is a process gap, not a code gap. MAINTAIN at LOW in Tech Debt Registry pending Wave-B architectural decision (D-arch-1/2/3 per nwrp136).

---

## Summary Table

| Item | Verdict | Action |
|------|---------|--------|
| D-079 wording precision | PASS | Minor: Wave-4 planner should re-evaluate sole-proprietor vendor scenario |
| D-079 customer-vs-vendor distinction | PASS | Crisp and actionable |
| D-079 trigger conditions | PASS | Three specific conditions listed |
| D-079 SOC2 CC6.1 mapping | PASS | Accurate — crystallizes posture, no new controls |
| Override audit trail completeness | PASS | Timestamp, authorization, rationale, scoping, triggers all present |
| Override audit trail gitignored risk | OBSERVATION | D-079 (tracked) carries summary; gitignored file is detailed evidence |
| FINDING-2 production accounts deleted | PASS | Cascade analysis complete; post-state verified |
| FINDING-2 seed rewrite (E-2) | CONDITIONALLY PASS | Executor must verify NOTICE→stderr pipe capture mechanism |
| Credentials-file gitignore coverage | PASS | `.gitignore:107` confirmed via `git check-ignore` |
| Credentials-file injection risk | PASS | No injection vector; malformed-line guard present |
| E-3 RLS posture | PASS | getCurrentMembership() + org_id filter + RLS = defense in depth |
| E-3 vendor embed PII posture | PASS | Narrowed to (id, name, address) — conservative even under D-079 |
| E-3 org isolation improvement | POSITIVE | Post-wire removes fixture-only path that had no app-layer auth check |
| AC-E3-04 grep precision | LOW CONCERN | Grep pattern should explicitly exclude comment-only UUID occurrences |
| FINDING-3 (HARNESS_FIXTURE_PASSWORD) | MEDIUM OPEN | Should be Wave-B prerequisite; currently advisory only |
| FINDING-4 (SELECT * client PII) | MEDIUM OPEN | Correctly scoped to TD-WD-06 / Wave 1.1-Lite |
| FINDING-5 (dangerouslySetInnerHTML) | FALSE POSITIVE | Static strings only; platform_admin-gated; no action needed |
| FINDING-6 (--no-verify near-miss) | CLOSED | Reset before push |
| FINDING-7 (plaintext password in git history) | LOW RESIDUAL | Will close at file level post-E-2; git history retention is acceptable |
| FINDING-8 (no staging layer) | LOW OPEN | Wave-B prerequisite per nwrp136 |

---

## Top 3 Concerns

### 1. NOTICE-to-credentials-file capture mechanism is unspecified (MEDIUM — executor blocker)

The E-2 plan describes using `RAISE NOTICE` to emit credentials at seed-apply time, with the orchestrator piping psql stdout to the gitignored credentials file. In Postgres, `RAISE NOTICE` output goes to **stderr** (not stdout) when running via `psql -f`. If the orchestrator's apply command only captures stdout, the credentials file will be empty, harness-auth-bootstrap.ts will throw, and the smoke re-run will fail with a confusing error rather than a meaningful one.

The executor must either: (a) use `psql ... 2>&1 | ...` to merge stderr into stdout before filtering for the `SMOKE_SEED_CREDENTIALS_START`/`SMOKE_SEED_CREDENTIALS_END` sentinel, or (b) use `\copy` or a temp-table-based approach to write credentials to a file directly from within the SQL session. The plan interface section shows the SQL and harness-side code correctly, but the orchestrator-level pipe command is not specified. This must be resolved before the smoke re-run or the credentials handoff will be silent-empty.

**This concern does not block Wave-E plan-review. It must be resolved by the executor before declaring E-2 complete.**

### 2. HARNESS_FIXTURE_PASSWORD rotation remains advisory rather than scheduled (MEDIUM)

FINDING-3 was explicitly deferred at nwrp141. The deferral is documented in the calibration log. However, it is not in the Wave-B prerequisite list — it is described as advisory. The `harness-fixture@nightwork.local` credential was exposed in a conversation transcript. While the fixture-org scope limits blast radius, this is an org-admin credential in the production Supabase instance (even if it only has access to synthetic data). Given that rotation is low-cost (update `.env.local` + Vercel env var + GitHub Actions secret), the risk of indefinite deferral outweighs the cost of rotation. If the transcript exists in any Anthropic log accessible to parties outside the project, the credential remains exposed.

**Recommendation:** Promote from calibration-log advisory to explicit Wave-B prerequisite bullet alongside the existing Wave-B prerequisites in the EXPANDED-SCOPE or STATE.md. No code change needed; this is a process item.

### 3. Smoke-seed git history contains `SmokeSeed2026!` (LOW RESIDUAL)

The plaintext password `SmokeSeed2026!` is in git history at commit `ec68df2` and visible in the current file until E-2 executes. Post-E-2, the file is clean. The 9 production accounts it corresponded to are deleted. The residual risk is that if the repository ever gains broader read access (vendor audit, future open-source pivot), the credential is discoverable via `git log -p`. This is LOW risk given the account scope (synthetic fixture org only). No action required for Wave-E. A `git filter-repo` scrub is available if access model changes.

---

## Conclusion

Wave-E is cleared from a security perspective to proceed to execution with the following notes:

1. **E-2 executor MUST verify the NOTICE→file pipe mechanism before declaring E-2 complete.** This is an operational concern, not a plan-design flaw.

2. **FINDING-3 (HARNESS_FIXTURE_PASSWORD) should be promoted to a Wave-B prerequisite bullet.** The current advisory-only posture creates risk that rotation never happens.

3. No new security findings are introduced by E-2 or E-3 as designed. The E-3 real-DB wire is a security improvement over the current fixture-only path.

4. D-079 wording is precise and actionable. The override audit trail meets SOC2-equivalent discipline. FINDING-2 Component A is cleanly remediated; Component B will close at E-2 execution pending the pipe-capture verification above.

5. FINDING-3 through FINDING-8 are appropriately scoped: three remain open at their original severity (FINDING-3 MEDIUM, FINDING-4 MEDIUM, FINDING-8 LOW), two are closed (FINDING-6 resolved, FINDING-7 will close at E-2), and one is a confirmed false positive (FINDING-5).
