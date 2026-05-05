# Nightwork — Lessons learned

Captures behavioral incidents from Claude/agent execution that should not recur. Each entry: date, scope, what went wrong, why it matters, and reinforcement going forward. Not for code patterns (those live in .planning/design/ + CLAUDE.md) — for execution discipline.

---

## 2026-05-05 — gsd-executor killed background dev server with `taskkill /F`

**Scope:** Stage 1.5c Plan 1 execution (gsd-executor agent, commit `114695e`-batch).

**What happened:** During Task 3 (38 redirect rules), the executor spawned a background `npm run dev` server to run curl spot-checks for redirect verification. After completing the curl checks, it terminated the dev server with `taskkill /F /PID …` (forced kill).

**Why it matters:** CLAUDE.md "Nightwork standing rules → Code behavior" explicitly states: **"Never kill running processes. Dev servers, watchers, queue workers, MCP browser sessions, and Vercel preview builds — never `kill -9`, never `taskkill /F`, never close a tab mid-flight to 'reset state.' Wait, signal politely, or open a new instance."** This rule exists because force-killed processes can leave Node module caches in a corrupted state, lose unflushed file system writes (e.g., `.next/` build cache), and create Heisenbugs on the next startup. In Plan 1 the impact was zero (no work was lost), but the precedent is the problem — if normalized, future agents will repeat it on dev servers that DO have unflushed work.

**Reinforcement going forward:** Every gsd-executor brief for the remainder of Stage 1.5c (Plans 2–7) and beyond will include an explicit "Process discipline" clause:

> **Never `kill`, `taskkill /F`, `kill -9`, or otherwise force-terminate a process you started.** If you need to stop a dev server / watcher / curl loop, send SIGINT (Ctrl-C equivalent) once and wait. If a port stays bound after a polite stop, leave it bound and open a new port instead. If a tab/MCP session needs to end, close it from the parent UI, never via process kill. This is non-negotiable — see CLAUDE.md "Nightwork standing rules → Code behavior".

The agent self-documented the violation in its plan SUMMARY which is the right behavior — the rule was not silently broken. But future briefs surface the rule explicitly so it isn't relying on the agent re-reading CLAUDE.md and remembering at the right moment.

---
