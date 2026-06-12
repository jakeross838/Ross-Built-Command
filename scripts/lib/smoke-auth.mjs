// scripts/lib/smoke-auth.mjs
//
// SmokeAuthHelper — the consolidated primitive (tiering-implementation per
// nwrp285; design contract: PLANNING-PIPELINE-TIERING.md §3; AC-8/AC-9).
// Consolidates the three production-exercised increments:
//   #1 scripts/smoke-auth-probe.mjs        (9/9 login validation, 2A-0)
//   #2 scripts/zz-2a-flow-driver.mjs       (cookie-jar authed app fetch, 2A/2D/2E)
//   #3 tmp/zz-listener-app-cell.mjs        (Playwright authed browser cells)
// The hard parts here are PROVEN code paths, not new ones.
//
// Credential sourcing (AC-9): SMOKE_EMAIL + SMOKE_PASSWORD env vars FIRST
// (per design §3 / PLANNING-PIPELINE-TIERING.md §229 convention). If absent,
// falls back to the smoke-seed lifecycle credentials file
// (.planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt,
// last-occurrence-wins per rotation). If NEITHER source yields a credential,
// every entry point SKIPS GRACEFULLY ({ skipped: true, reason }) — never
// throws on missing creds, never prints a password (nwrp139: presence
// checks only; no ${VAR:-...} expansions anywhere near secrets).
//
// ⚠ GIT-BASH: pass URL paths with MSYS_NO_PATHCONV=1 (leading-slash args
// get rewritten to Windows paths and surface as bogus ENOTFOUND — see
// PART-2D tooling lesson).

import { readFileSync, existsSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";

const CRED_FILE =
  ".planning/qa-runs/wave-d/smoke-seed-credentials-DO-NOT-COMMIT.txt";

function envLocal() {
  const out = {};
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
      if (m) out[m[1]] = m[2].trim();
    }
  } catch {
    /* no .env.local — rely on process.env */
  }
  return { ...out, ...process.env };
}

function resolveCredentials(emailArg) {
  const env = envLocal();
  const email = emailArg ?? env.SMOKE_EMAIL ?? null;
  if (email && env.SMOKE_PASSWORD && (!emailArg || emailArg === env.SMOKE_EMAIL)) {
    return { email, password: env.SMOKE_PASSWORD, source: "env" };
  }
  if (email && existsSync(CRED_FILE)) {
    let pw = null;
    for (const line of readFileSync(CRED_FILE, "utf8").split(/\r?\n/)) {
      const m = line.trim().match(/^(\S+@nightwork\.local)\s+(\S+)$/);
      if (m && m[1] === email) pw = m[2]; // last occurrence wins (rotation)
    }
    if (pw) return { email, password: pw, source: "credentials-file" };
  }
  return null;
}

function supabaseEnv() {
  const env = envLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anon ? { url, anon } : null;
}

/**
 * login(email?) → { skipped } | { session, user, cookieHeader, signOut() }
 *
 * Signs in via @supabase/ssr with a local cookie jar so the LIBRARY
 * produces its own cookie format (chunking included) — the proven
 * increment-#2 technique. `cookieHeader` replays against app routes.
 */
export async function login(emailArg) {
  const sb = supabaseEnv();
  if (!sb) return { skipped: true, reason: "missing NEXT_PUBLIC_SUPABASE_URL/ANON_KEY" };
  const creds = resolveCredentials(emailArg);
  if (!creds) {
    return {
      skipped: true,
      reason:
        "no smoke credentials (set SMOKE_EMAIL + SMOKE_PASSWORD, or provide the smoke-seed credentials file)",
    };
  }
  const jar = new Map();
  const supabase = createServerClient(sb.url, sb.anon, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cs) => cs.forEach((c) => jar.set(c.name, c.value)),
    },
  });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: creds.email,
    password: creds.password,
  });
  if (error || !data?.session) {
    return { skipped: false, ok: false, error: error?.message ?? "no session" };
  }
  const cookieHeader = [...jar]
    .map(([n, v]) => `${n}=${encodeURIComponent(v)}`)
    .join("; ");
  return {
    skipped: false,
    ok: true,
    user: data.user,
    session: data.session,
    cookieHeader,
    credentialSource: creds.source,
    signOut: () => supabase.auth.signOut(),
  };
}

/** getAuthCookies(email?) → { skipped } | { ok, cookieHeader } */
export async function getAuthCookies(emailArg) {
  const r = await login(emailArg);
  if (r.skipped || !r.ok) return r;
  return { skipped: false, ok: true, cookieHeader: r.cookieHeader };
}

/**
 * withAuthedContext(email, fn) — runs fn({ fetchAuthed, user, cookieHeader }).
 * fetchAuthed(url, init?) injects the auth cookies. Session is throwaway.
 */
export async function withAuthedContext(emailArg, fn) {
  const r = await login(emailArg);
  if (r.skipped || !r.ok) return r;
  const fetchAuthed = (url, init = {}) =>
    fetch(url, {
      ...init,
      headers: {
        cookie: r.cookieHeader,
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });
  try {
    const result = await fn({ fetchAuthed, user: r.user, cookieHeader: r.cookieHeader });
    return { skipped: false, ok: true, result };
  } finally {
    /* throwaway session; explicit signOut intentionally skipped — the
       signOut/exit race trips a libuv assertion on Windows (PART-2D). */
  }
}

/**
 * statusAuthed(url, email?) → { skipped } | { ok, status }
 * One authed GET; the smoke building block for hidden-route assertions
 * (L4's authed-page leg) and reachability checks.
 */
export async function statusAuthed(url, emailArg) {
  return withAuthedContext(emailArg, async ({ fetchAuthed }) => {
    const res = await fetchAuthed(url, { redirect: "manual" });
    return res.status;
  }).then((r) => (r.skipped || !r.ok ? r : { skipped: false, ok: true, status: r.result }));
}
