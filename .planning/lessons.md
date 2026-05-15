# Nightwork — Lessons learned

Captures behavioral incidents from Claude/agent execution that should not recur. Each entry: date, scope, what went wrong, why it matters, and reinforcement going forward. Not for code patterns (those live in .planning/design/ + CLAUDE.md) — for execution discipline.

---

## 2026-05-15 — Architectural decisions changing route shape require downstream consumer sweep

**Scope:** Stage F1 Wave-E smoke calibration (nwrp147 → nwrp150; commits 1b249b7 + ed075d1 + this commit). Surfaced post-Wave-E ship while bringing the smoke harness to green for the Wave-B prereq #12 gate.

**What happened:** Two pre-existing latent smoke failures (TD-WE-04 /today + TD-WE-05 /settings/workflow) were masked for ~6 weeks by 12 louder logo-invariant failures (TD-WE-01 + TD-WE-02). When the logo invariant was fixed, both surfaced:

- **/today TD-WE-04:** Wave-D commit b4e4dc4 (D-4) authored `primary_ux_selector: "text=Active jobs"` for /today. The /today page (scaffolded earlier in 1.5c-1 commit 8f62295) never rendered that string — the smoke author looked at the wrong place. The selector never matched reality from day one.

- **/settings/workflow TD-WE-05:** Stage 1.5c-IA relocated `/settings/workflow` → `/admin/workflow-customization` via redirect (per D-058 + D-060). The destination is a "Coming F3" placeholder. The original WorkflowSettingsForm.tsx with native `<select>` controls is still in the codebase but no longer reachable at runtime. Smoke harness route table was not updated when the IA relocation shipped — selector `'select'` returned 0 matches because the redirected destination has no form controls.

**Why it matters:** Architectural decisions that change route shape, content, or accessibility require a downstream consumer sweep at plan-author time. The sweep covers: smoke harness route table (`scripts/wave-d-smoke.ts`), dead-code paths (orphan `page.tsx` files whose route is redirected away), documentation references (CLAUDE.md UI rules text, design docs, plan-author briefings), and any other consumer that pins to the changed surface. 1.5c-IA shipped without this sweep, which surfaced 6 weeks later in Wave-E as smoke drift (TD-WE-04) plus undocumented dead code (TD-WE-05). The TD-WE-01 logo invariant failure existed in pre-1.5c-IA Wave-D smoke runs but only at the level of "12 routes red" — the underlying 2 stale selectors were buried in the noise.

**Reinforcement going forward:** Plan-author discipline for Wave-B onward — any plan changing route paths, content sections, or H1 text MUST include a downstream sweep in pre-flight verification. The sweep is mechanical:

1. `grep -r "<old-route>" scripts/wave-d-smoke.ts .planning/ src/middleware.ts next.config.*` — find every pin to the old route surface.
2. For each hit: either update to the new surface OR codify a TD entry documenting the divergence.
3. Plan-review iter-1 BLOCKS without the sweep results attached.

Codify in CLAUDE.md "Workflow posture" as Rule 7 if this pattern repeats. For now, Wave-B Plan B-1 plan-author brief should include explicit `downstream-consumer-sweep` task in pre-flight verification.

Adjacent reinforcement: smoke selector failures are visible signal. Don't tolerate `1/13 PASS` indefinitely on the assumption that "it's all the same logo issue" — the cost of investigating the noise floor is small (live DOM probe = 30 seconds of tool calls), and the payoff is surfacing latent failures before they compound. Wave-E paid 4 weeks of `1/13 PASS` interest on what turned out to be 4 distinct issues.

---

**Scope:** Stage 1.5c Plan 1 execution (gsd-executor agent, commit `114695e`-batch).

**What happened:** During Task 3 (38 redirect rules), the executor spawned a background `npm run dev` server to run curl spot-checks for redirect verification. After completing the curl checks, it terminated the dev server with `taskkill /F /PID …` (forced kill).

**Why it matters:** CLAUDE.md "Nightwork standing rules → Code behavior" explicitly states: **"Never kill running processes. Dev servers, watchers, queue workers, MCP browser sessions, and Vercel preview builds — never `kill -9`, never `taskkill /F`, never close a tab mid-flight to 'reset state.' Wait, signal politely, or open a new instance."** This rule exists because force-killed processes can leave Node module caches in a corrupted state, lose unflushed file system writes (e.g., `.next/` build cache), and create Heisenbugs on the next startup. In Plan 1 the impact was zero (no work was lost), but the precedent is the problem — if normalized, future agents will repeat it on dev servers that DO have unflushed work.

**Reinforcement going forward:** Every gsd-executor brief for the remainder of Stage 1.5c (Plans 2–7) and beyond will include an explicit "Process discipline" clause:

> **Never `kill`, `taskkill /F`, `kill -9`, or otherwise force-terminate a process you started.** If you need to stop a dev server / watcher / curl loop, send SIGINT (Ctrl-C equivalent) once and wait. If a port stays bound after a polite stop, leave it bound and open a new port instead. If a tab/MCP session needs to end, close it from the parent UI, never via process kill. This is non-negotiable — see CLAUDE.md "Nightwork standing rules → Code behavior".

The agent self-documented the violation in its plan SUMMARY which is the right behavior — the rule was not silently broken. But future briefs surface the rule explicitly so it isn't relying on the agent re-reading CLAUDE.md and remembering at the right moment.

---
