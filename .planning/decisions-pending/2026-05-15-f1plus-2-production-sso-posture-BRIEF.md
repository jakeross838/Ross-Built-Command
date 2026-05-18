---
type: decision-brief
status: PENDING JAKE
authored: 2026-05-15 NIGHT
authored_by: orchestrator (claude-opus-4-7[1m]) under nwrp165 weekend Option A deliverable #4
authorization: nwrp165 weekend scope + nwrp167 sequential autonomous execution
prerequisite_for: Wave 1.1-Lite Builder 20 Club commercial-customer onboarding; Q7 SOC2-pursuit trigger condition; possible Q5 retroactive revision
inherits_from: F1+-2 reference in F1 umbrella EXPANDED-SCOPE §516; Q5 A status quo (email + password for internal org-members); Q7 A (SOC2-capable, no active pursuit); B-5 magic-link primitive in Slice-2
---

# F1+-2 Production SSO Posture — decision brief

**Question for Jake:** what's the production authentication posture for internal Nightwork org-members (admin, accounting, PM roles) once Wave 1.1-Lite ships? Q5 A locked email+password for F1 as status quo; this brief surfaces the post-F1 evolution path.

This brief is investigative. It surfaces tradeoffs so the decision can land before Wave 1.1-Lite Builder 20 Club launches; no D-### entry written tonight, no code modified, no SSO provider contracted.

## §1 — What this decision affects

| Surface | SSO dependency | When it bites |
|---|---|---|
| Internal user login UX (admin, accounting, PM) | Q5 A = email+password via `signInWithPassword`. SSO would replace this surface. | Wave 1.1-Lite onwards (when real internal users hit the system hard). |
| External user auth (Owner Portal homeowners, F3 architects/inspectors, F4 sub-portal) | Already magic-link via 00074 + B-5 primitive. UNAFFECTED by this decision — external auth stays magic-link regardless. | Already locked. |
| SOC2 trajectory (Q7) | Q6.1 control (logical access controls) is friendlier with SSO + MFA than passwords + MFA. First enterprise customer demanding SOC2 attestation triggers pursuit per Q7. | Pursuit triggered by first SOC2-asking customer (months out per Q7). |
| Magic-link primitive reuse (B-5 in Slice-2) | B-5 ships magic-link for external use; if (b) chosen below, B-5 magic-link wraps INTERNAL login too. | B-5 ships in Slice-2; INTERNAL reuse would be a Wave 1.1-Lite-or-later refactor. |
| Vendor lock-in (Google/Microsoft) | Option C below introduces Google or Microsoft as auth IdP. Future migration cost if abandoned. | Reversibility bounded per Q5 — not a one-way door, but multi-day refactor. |

**Wave 1.1-Lite blocking dependency:** PARTIAL — internal users (RB staff) can survive on status-quo passwords through Wave 1.1-Lite Builder 20 Club. SSO becomes blocking when first commercial customer demands SOC2 (Q7 trigger).

## §2 — Four candidate options

### Option A — Keep email+password (Q5 A status quo) indefinitely

**Posture:** internal org-members continue with email+password via `signInWithPassword` + `create_signup` RPC. Migrate when forced (SOC2 trigger).

**Tradeoffs:**
- ✓ Zero migration work in Wave 1.1-Lite or near-term.
- ✓ Familiar UX for non-technical users (Diane, PMs).
- ✓ Works offline (Resend down doesn't block login).
- ✗ Passwords have well-known security drawbacks (reuse, phishing, weak choices).
- ✗ SOC2 CC6.1 mapping requires explicit password-policy + rotation evidence; passwordless paths score better with auditors.
- ✗ Mismatch with internal vs external posture: external is magic-link (B-5), internal is password. Two mental models in the codebase.

**Estimated migration cost (if later forced):** ~3-5 days of focused work (login.ts + signup.ts + existing-user migration script + UX testing across roles).

### Option B — Magic-link for everyone (internal + external)

**Posture:** drop `signInWithPassword`; everyone (internal + external) gets a magic-link via Resend. Reuses B-5 magic-link primitive for both surfaces.

**Tradeoffs:**
- ✓ One mental model: every login is a magic-link send. Code symmetry.
- ✓ Eliminates password storage entirely (smaller SOC2 surface).
- ✓ Phishing-resistant (no password to steal).
- ✓ Reuses B-5 primitive; minimal incremental code beyond Slice-2.
- ✗ Friction for power users — Jake/Andrew check email 50x/day; an extra "check email" round-trip per login session is annoying.
- ✗ Resend outage = login outage. Sentry alerting + Resend uptime SLA matters more.
- ✗ Mobile UX: switching between password manager and email inbox is friction.
- ✗ Diane (accounting) may resist; she logs in once per workday but doesn't want email round-trip.

**Estimated migration cost:** ~2-3 days (replace login.ts password form with magic-link form; deprecate signup.ts; ship pre-Wave-1.1-Lite). Smaller than Option A migration because B-5 primitive already exists.

### Option C — Google OAuth for internal + magic-link for external

**Posture:** RB likely uses Google Workspace (jake@rossbuilt.com, etc.). Use Google OAuth as SSO IdP for internal org-members. External actors continue with magic-link via B-5.

**Tradeoffs:**
- ✓ "One-click login" for internal users — Jake/Andrew/Diane don't fight password managers.
- ✓ Inherits Google's MFA (Workspace admin can enforce TOTP/security keys org-wide).
- ✓ Strong SOC2 CC6.1 posture — Google handles identity lifecycle.
- ✓ When Diane leaves RB, Workspace admin disables her account → Nightwork access revoked automatically (offboarding hygiene).
- ✓ External actors still magic-link (no Google dependency for homeowners).
- ✗ Vendor lock-in to Google Workspace; commercial-tenant customers may use Microsoft 365 → need parallel Microsoft OAuth path (Option D below).
- ✗ Supabase Auth supports Google OAuth out-of-the-box (no major auth-layer refactor); the UX flip is mainly login.tsx.
- ✗ Adds Google Cloud Console project + OAuth consent screen to RB's vendor inventory.
- ✗ **Pre-requisite check needed:** does RB actually use Google Workspace for jake@rossbuilt.com / andrew@rossbuilt.com email? Or is RB on a non-Google email provider? **Cannot recommend C without this answer.**

**Estimated migration cost:** ~3-4 days (Supabase Auth Google provider setup + login UX rebuild + OAuth consent screen + Workspace admin coordination + existing-user migration script). One-time.

### Option D — Hybrid: magic-link for external + multi-IdP SSO for internal (Google + Microsoft)

**Posture:** internal users pick their identity provider on login (Google Workspace OR Microsoft 365). External actors stay magic-link.

**Tradeoffs:**
- ✓ Best for commercial-tenant trajectory (Builder 20 Club customers will be on Google OR Microsoft, not consistent).
- ✓ Same SOC2 + offboarding benefits as Option C.
- ✓ Supabase Auth supports both providers natively.
- ✗ Higher initial integration cost (two OAuth providers vs one).
- ✗ Account-linking edge cases (what if user has both Google AND Microsoft addresses?).
- ✗ Premature if commercial tenants are all on one IdP (more likely Google for construction-industry-on-GSuite + scattered Microsoft).

**Estimated migration cost:** ~5-7 days (both providers setup + login UX with provider picker + existing-user migration + per-tenant IdP enforcement option for Wave 4+ enterprise).

## §3 — Recommendation

**Tentative recommendation: Option C (Google OAuth internal + magic-link external)** — **CONDITIONAL on RB actually using Google Workspace.**

Reasoning:
1. **Option C optimizes the realistic next 6-12 months.** RB is the only tenant through Wave 1.1-Lite; if Jake/Andrew/Diane use Google Workspace for email already, OAuth is the highest-leverage single change.
2. **Magic-link-everywhere (Option B) underperforms for power users.** Jake said in earlier nwrp messages he's checking the build 5-15x/day; 50x/day during Slice-2-Slice-3 dispatch. Email-round-trip per login is materially worse UX than Google OAuth one-click.
3. **Option D is over-engineering for current scale.** Microsoft 365 support can land in Wave 4 alongside commercial onboarding; no commercial customer exists yet to force the decision.
4. **Option A (status quo) is the right answer ONLY IF Option C is blocked by "RB doesn't use Google Workspace" AND Jake actively prefers passwords over magic-link.** Otherwise it's deferring a decision that wants making.

**Sub-question that gates this:** does RB actually use Google Workspace? Specifically:
- Does `jake@rossbuilt.com` resolve via Google MX records?
- Does Diane log into Gmail-like UX for her email?
- Does RB have a Workspace admin console (`admin.google.com`)?

If YES → Option C is the clear pick. If NO → Option B (magic-link everywhere) becomes the right call; the friction is real but better than vendor lock-in to a non-IdP RB doesn't actually use.

## §4 — Migration sequence if Option C picked

1. RB Workspace admin (Jake or Andrew) creates Google Cloud project + OAuth consent screen.
2. Configure Supabase Auth's Google provider with Client ID + Client Secret from Google Cloud project.
3. Rebuild login UX (`src/app/login/page.tsx`) — add "Sign in with Google" button; keep email+password form as fallback during migration window.
4. Author existing-user migration script — link existing `auth.users` rows to Google identity by email match; flag mismatches.
5. Communicate cutover to RB staff (~1 week notice; Diane needs the hand-holding).
6. After cutover window, remove email+password form from login UX.
7. Document SSO posture in CLAUDE.md Platform admin section (NB: platform_admin role survives separately — `platform_admins` table is independent of OrgMemberRole enum).

## §5 — Q5 (Magic link vs password) retroactive impact

Q5 A locked email+password for F1. F1+-2 may retroactively revise this:
- If Option C chosen: Q5 A's `signInWithPassword` path becomes a fallback / deprecated path post-cutover. NOT a "retroactive revision" of Q5 — Q5 A was for F1 ship; F1+-2 is for post-F1 evolution. No code rework in F1.
- If Option A chosen: Q5 A stays canonical; nothing changes.
- If Option B chosen: Q5 A's `signInWithPassword` is fully deprecated post-cutover.

**No F1-Wave-B work changes regardless of F1+-2 decision.** Slice-2 B-5 magic-link primitive is required regardless (external actors need magic-link; that's locked per ARCHITECTURE.md §8 + Q4b).

## §6 — SOC2 trajectory (Q7) interaction

Q7 A: SOC2-capable, no active pursuit until first enterprise customer asks.

| Option | SOC2 CC6.1 posture |
|---|---|
| A — passwords | Lowest. Need formal password policy + rotation + storage hardening evidence. Auditor scrutiny higher. |
| B — magic-link everywhere | Better. No password storage; passwordless paths score well with auditors. |
| C — Google OAuth + magic-link | Best for internal (Google handles identity lifecycle including disablement). External is same as B. |
| D — Multi-IdP + magic-link | Same as C for SOC2; broader IdP support is commercial advantage, not SOC2 advantage. |

**SOC2 implication:** Option C optimizes for when SOC2 pursuit triggers (estimated months out per Q7). Switching from A → C under SOC2 deadline pressure is more stressful than choosing C now and inheriting the readiness.

## §7 — Wave 1.1-Lite blocking summary

| Dependency | Status |
|---|---|
| Wave 1.1-Lite internal user login UX | NOT BLOCKING (Option A status-quo works through Wave 1.1-Lite). |
| Wave 1.1-Lite Builder 20 Club commercial-customer onboarding | PARTIAL — first enterprise customer asking for SSO triggers Q7 pursuit; Option A blocks; Option C unblocks. |
| Wave 4 commercial readiness | BLOCKING per Q7 pursuit trigger. Option A → forced migration; Option C → already done. |

**Recommendation:** Confirm RB Google Workspace status. If RB on Google → Option C is the call; do migration during/before Wave 1.1-Lite to inherit SOC2 readiness without deadline pressure. If RB not on Google → Option B (magic-link everywhere) is the call. **Either way, do NOT pick Option A through inertia** — the answer to "what about SSO?" is more decisive than "we'll deal with it later."

## §8 — Information Jake needs to provide for decision

1. **Does RB use Google Workspace for jake@rossbuilt.com / andrew@rossbuilt.com email?** (Yes/No.)
2. **Preference between magic-link friction vs Google OAuth vendor lock-in?** (Optional; tilts B vs C if RB is on Workspace.)
3. **Acceptable to wait through Wave 1.1-Lite for SSO?** (Q7 trigger condition; if early enterprise interest is anticipated, accelerate.)

Without (1) the recommendation is conditional. With (1)=YES, recommendation is Option C. With (1)=NO, recommendation is Option B.
