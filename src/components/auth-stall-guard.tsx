"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

// ── Rider-2 guard: bound the client auth init so a strand can't hang the app ──
//
// The client supabase-js singleton's auth init (`getSession()` → `initialize()`
// → token refresh inside a navigator Web Lock) can STRAND and never resolve — a
// client-side auth-js deadlock that fires (before any network call) when the
// browser loads a page needing to refresh an expired access_token. When it
// strands it blocks every client-side `supabase.auth.*` / `supabase.from(...)`
// behind it, so the page renders only via 15s safety timeouts (the invoices
// hang) — or never. Diagnosed as systemic, not a corrupted token (RIDER-2).
//
// This bounds that init: if `getSession()` doesn't settle within STALL_MS we
// treat the client session as unrecoverable, clear the stuck auth cookies, and
// hard-navigate to /login for a fresh sign-in. An expired token must never
// produce an infinite hang.
//
// Does NOT false-fire on normal loads: a healthy `getSession()` settles in well
// under a second (local JWT read; even a network refresh is ~300-500ms), so the
// 5s budget only trips on a genuine strand. Runs once on initial mount — the
// client auth singleton initializes exactly once; App-Router client navigations
// reuse it and don't re-init.

const STALL_MS = 5000;

// Auth-optional surfaces: a missing/quiet session here is expected — never
// bounce (and never risk a /login → /login loop).
const SKIP_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/owner",
  "/sub-portal",
];

function clearSupabaseAuthCookies() {
  for (const cookie of document.cookie.split("; ")) {
    const name = cookie.split("=")[0];
    if (name.startsWith("sb-") && name.includes("-auth-token")) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    }
  }
}

export default function AuthStallGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (SKIP_PREFIXES.some((p) => pathname?.startsWith(p))) return;

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      // Cannot use supabase.auth.signOut() — it acquires the same stuck auth
      // lock and would hang too. Clear the cookies directly, then hard-navigate
      // so the middleware re-runs against a clean (signed-out) request.
      clearSupabaseAuthCookies();
      window.location.assign("/login?reason=session_stalled");
    }, STALL_MS);

    supabase.auth
      .getSession()
      .then(() => {
        settled = true;
        clearTimeout(timer);
      })
      .catch(() => {
        settled = true;
        clearTimeout(timer);
      });

    return () => {
      settled = true;
      clearTimeout(timer);
    };
    // Intentionally runs once on mount (initial client-auth init is the only
    // moment the strand occurs); pathname is read once to decide skip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
