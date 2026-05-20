# UI Review -- Plan B-2 (Plan-review iter-1)

**Reviewer:** nightwork-ui-reviewer
**Date:** 2026-05-19
**Plan:** B-2 -- client_portal_access.client_id FK + Owner Portal Path A min UI
**Status:** AUTHORED -- PENDING JAKE REVIEW AT PLAN-REVIEW ITER-1

---

## Files audited (plan-level)

Plan-level review. Files are PROPOSED (not yet written):

- src/app/owner/[token]/page.tsx (NEW)
- src/app/owner/[token]/pay-apps/[id]/page.tsx (NEW)
- src/app/owner/layout.tsx (NEW)
- src/app/owner/error.tsx (NEW)
- src/app/api/owner-portal/resolve/route.ts (NEW)
- src/app/api/owner-portal/acknowledge-pay-app/route.ts (NEW)
- src/lib/owner-portal/token.ts (NEW)
- src/lib/activity-log.ts (modified)
- src/middleware.ts (modified)
- src/components/client-combobox.tsx (modified -- TD-B1abis-03)

Canonical view components reused (not modified):

- src/components/prototypes/OwnerDashboardView.tsx
- src/components/prototypes/OwnerDrawView.tsx

Design references read: PATTERNS.md, SYSTEM.md, COMPONENTS.md, src/components/nw/Button.tsx,
/owner-portal/page.tsx, /owner-portal/pay-apps/[id]/page.tsx

---

## Pillar scores

| Concern | Score | Notes |
|---|---|---|
| Layout fidelity | PASS | Owner Status View correctly not Document Review; standalone no-nav layout correct |
| Token discipline | FLAG | --shadow-popover does not exist; TD-B1abis-03 replacement target ambiguous |
| Component reuse | PASS | OwnerDashboardView + OwnerDrawView reused; NwButton, Eyebrow, Money, Badge, Card from nw/* |
| Status / state surfacing | FLAG | Error states correct; loading/skeleton absent; empty draw list falls through |
| Mobile responsiveness | FLAG | 56px CTA specified; raw button TD-20 exemption comment missing from plan |
| Audit / history visibility | PASS with caveat | actor_token_id audit wired; no homeowner audit timeline rendered (intentional) |

---

## Findings

### BLOCK (must resolve before execute dispatch)

**UI-BLOCK-01: --shadow-popover token does not exist; TD-B1abis-03 replacement target undefined**

Plan Task 5 specifies replacing boxShadow on client-combobox.tsx line 203 with shadow-[var(--shadow-popover)].
The plan notes to verify this token exists first.

Verification at review time: src/app/colors_and_type.css defines only --shadow-hover and --shadow-panel.
--shadow-popover does NOT exist. SYSTEM.md Section 1g confirms the two-token shadow catalog is complete.

The plan conditional fallback (replace with cost-code-combobox idiom verbatim) is under-specified.
cost-code-combobox.tsx was not verified to have a particular shadow idiom. If it also omits shadow,
the executor may drop shadow without realizing that is a deliberate decision.

Required resolution before execute -- pick one explicitly:

(a) Introduce --shadow-popover token: requires PROPAGATION-RULES.md event + SYSTEM.md + css update.
    Out of B-2 scope.

(b) Omit shadow entirely: acceptable only if cost-code-combobox.tsx verifiably has no shadow.
    Must be confirmed at plan-author time and stated in Task 5.

(c) Use shadow-[var(--shadow-panel)]: closest existing token. Tokenized; avoids propagation event.

Recommendation: option (c). Must be named explicitly in Task 5 before execute dispatch.

---

**UI-BLOCK-02: Acknowledge CTA -- 56px raw button TD-20 exemption comment not required in plan**

Plan Task 4 specifies a 56px-tall Acknowledge receipt CTA in OwnerDrawView.tsx.
NwButton.tsx confirmed: sizes are sm (h-[30px]) / md (h-[36px]) / lg (h-[44px]). No 56px size.

The existing OwnerDrawView.tsx Approve and sign button (lines 163-176) is a raw button with an
explicit TD-20 boundary exemption comment at lines 158-162. Plan Task 4 does NOT reproduce
this exemption requirement for the new acknowledge button.

Without explicit instruction, the executor will either:
(1) Write a raw button without the comment -- post-edit hook fires on undocumented custom button
(2) Use NwButton lg (44px) without acknowledging the touch-target regression from 56px

Required resolution: Task 4 must explicitly state the acknowledge CTA must be a raw button with
TD-20 boundary exemption comment mirroring OwnerDrawView.tsx:158-162, citing NwButton has no 56px
size and SYSTEM.md Section 11 requires 56px for high-stakes actions. OR explicitly accept
NwButton lg (44px) with named acknowledgment.

---

### FLAG (fix before QA ship, not blocking execute dispatch)

**UI-FLAG-01: Loading/skeleton state not specified for token resolution**

No loading.tsx in files_modified. If service-role token resolution plus 3 Supabase queries take
more than 200ms, the user sees a blank page during server render.

Resolution: Add src/app/owner/loading.tsx to Task 3 (skeleton, approx 20 lines) OR defer to
Wave 1.1-Lite with rationale.

---

**UI-FLAG-02: Empty draw list not handled in OwnerDashboardView**

OwnerDashboardView.tsx Recent activity renders jobDraws.slice().reverse().slice(0,5). If no
draws exist (new project), the ul renders empty -- no message, no illustration, no call to action.
PATTERNS.md Section 9 (Empty Workspace) applies. B-2 wires to real data for the first time.

Resolution: Add empty-state message in Recent activity to Task 3. If deferred: TD-B2-02.

---

**UI-FLAG-03: OwnerDashboardView inline style declarations are pre-existing TDs not documented**

OwnerDashboardView.tsx has inline style declarations using CSS var references (lines 111-116,
121-123, 184-189) -- same pattern TD-B1abis-03 corrects in client-combobox.tsx. These pass
HEX_HITS but use inline style over Tailwind bracket utilities. The hook sweeps only files_modified;
OwnerDashboardView.tsx is in files_referenced only. No hook halt expected at execute time.

Resolution: Document as TD-B2-03 for Wave 1.1-Lite polish. No execute-time action needed.

---

**UI-FLAG-04: Breadcrumb root verification not in Task 3 verify steps**

OwnerDrawView.tsx default breadcrumbRoot is href: /design-system/prototypes/owner-portal.
Production route must pass token-scoped href. Task 3 verify steps do not confirm this.

Resolution: Add to Task 3 verify steps: confirm breadcrumb routes to /owner/{token} not to
/design-system/prototypes/owner-portal.

---

**UI-FLAG-05: Referrer-Policy header in threat model but not in Task 3 deliverables**

Plan T-B2-11: Referrer-Policy: no-referrer on /owner/* added in Task 3 layout. But layout.tsx
cannot set HTTP response headers. Correct implementation: next.config.js headers() or middleware.

Resolution: Add next.config.js Referrer-Policy sub-task to Task 3 OR defer T-B2-11 explicitly.

---

### PASS / NOTE

**UI-PASS-01:** Route choice /owner/{token} vs /owner-portal/* is correct and well-justified.
Dual-route posture is intentional. Both share tenant-blind View components. No route conflict.
Middleware extension to PUBLIC_PATHS is correct.

**UI-PASS-02:** Standalone layout (no nav-bar) is correct. Anon homeowner has no org membership.
Ross Built logo top-left per CLAUDE.md UI rules. Confirmed.

**UI-PASS-03:** 320px floor single-column collapse is specified. OwnerDashboardView uses
grid-cols-2 md:grid-cols-4 (2-column at 320px -- acceptable for KPI tiles).

**UI-PASS-04:** data-direction and design-system-scope wrapper specified per CLAUDE.md requirement.

**UI-PASS-05:** Touch target contract correctly specified (44px standard / 56px high-stakes).
NwButton lg confirmed at h-[44px]. Touch target spec correct; implementation specification
incomplete -- see UI-BLOCK-02.

**UI-PASS-06:** Component reuse correctly specified. OwnerDashboardView + OwnerDrawView reused
verbatim from files_referenced. Both tenant-blind by construction.

**UI-PASS-07:** Token discipline specified for new /owner/* JSX. Sweep 5 prohibits hex / inline
color / inline fontFamily. Hook enforces at execute time.

**UI-PASS-08:** WCAG 2.2 AA adequately addressed. Semantic HTML, labeled Eyebrow components,
NwButton focus-visible rings. Minor gap: no aria-live for acknowledge state change -- acceptable
with server action + path.revalidate (full page update is inherently accessible).

**UI-PASS-09:** Owner Status View PATTERNS.md entry correctly flagged as conditional.
Design-pushback reviewer decides at iter-1. Deferral documented as TD-B2-01.

**UI-PASS-10:** Error state appropriately generic (timing-oracle-safe). Single generic message
for expired / revoked / not-found tokens. Correct per T-B2-11.

---

## Additional clarification needed (QA risk if unaddressed at execute time)

**Approve and sign button disposition in OwnerDrawView.tsx for production render:**

OwnerDrawView.tsx renders Approve and sign as an unconditional primary CTA (lines 163-176,
raw button, 56px, TD-20 exempt). Plan Task 4 adds onAcknowledge as an optional prop. The
existing button has no prop gate -- renders unconditionally regardless of whether onAcknowledge
is passed.

If the executor adds the acknowledge button without gating Approve and sign, homeowners see
a non-functional Approve and sign CTA alongside Acknowledge receipt. This will be caught at QA.

Recommendation: add showLegacyApproveButton?: boolean prop (default false in production, true
in design-system playground). Approximately 3-line change to OwnerDrawView.tsx. Must be in
Task 4 files_modified and verify steps.

---

## Compared to canonical

**Proposed /owner/[token]/page.tsx vs src/components/prototypes/OwnerDashboardView.tsx:**
New page.tsx is a server component wrapper querying real Drummond data via service-role API
and passing props to OwnerDashboardView. View component unchanged. Same thin-wrapper approach
as /owner-portal/page.tsx but with real data and token validation instead of Caldwell fixtures
and org-member auth. Shape match: YES. Implementation approach is sound.

**Proposed /owner/[token]/pay-apps/[id]/page.tsx vs src/components/prototypes/OwnerDrawView.tsx:**
Same reuse pattern. Adds URL-tampering validation (draw must belong to token client_id scope)
and wires the acknowledge prop. Breadcrumb root must be token-scoped per UI-FLAG-04. Shape
match: YES on content structure. Approve and sign button disposition is the remaining ambiguity.

---

## Compared to approved prototypes

**Owner portal dashboard (1.5c thin-wrapper):** B-2 correctly extends the Caldwell-fixture
thin-wrapper pattern with real data. Same component, same layout shape. Match: YES.

**Owner pay-app view (1.5c thin-wrapper):** Same pattern. Acknowledge prop is net-new. Plan
correctly distinguishes prototype placeholder from real production action. Match: YES.

---

## Summary verdict

**CONDITIONAL BLOCK on 2 items -- must be resolved in plan before execute dispatch:**

1. UI-BLOCK-01: Name the shadow token replacement explicitly in Task 5.
   Recommend shadow-[var(--shadow-panel)] as option (c) to avoid a propagation event.

2. UI-BLOCK-02: Task 4 must explicitly require the TD-20 boundary exemption comment on the
   56px acknowledge raw button OR explicitly accept NwButton lg (44px) with acknowledgment.

**5 FLAGS -- fix before QA ship:**

- UI-FLAG-01: Add src/app/owner/loading.tsx to Task 3 or explicitly defer to Wave 1.1-Lite.
- UI-FLAG-02: Add empty-draw-list state to Task 3 or document as TD-B2-02.
- UI-FLAG-03: Document OwnerDashboardView inline styles as TD-B2-03 (no execute-time action).
- UI-FLAG-04: Add breadcrumb back-link verification to Task 3 verify steps.
- UI-FLAG-05: Move Referrer-Policy to next.config.js sub-task in Task 3 or explicitly defer.

**Additional clarification needed before QA (not blocking execute dispatch):**
Approve and sign button must be gated in production render via showLegacyApproveButton?: boolean.
Plan Task 4 must address this disposition.

**Overall assessment:** The plan UI architecture is sound. Correct pattern choice (Owner Status
View, not Document Review), correct component reuse, correct token discipline posture, correct
mobile-first design for an anon homeowner surface. The BLOCKs are narrow plan-specification
gaps, not architectural problems -- each resolvable with one explicit sentence in the plan body.

---

*Authored by nightwork-ui-reviewer | 2026-05-19*
