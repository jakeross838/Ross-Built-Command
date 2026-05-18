"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { OrgMemberRole } from "@/lib/org/session";

/**
 * Client-side hook that resolves the current authenticated user's
 * primary org role. Mirrors the server-side `getCurrentMembership()`
 * pattern: looks up the earliest-created active org_members row for
 * the authenticated user and returns its `role`.
 *
 * Returns `null` while loading OR when no authenticated/active
 * membership exists. Callers should treat `null` as non-privileged
 * by default — any lock/permission gate should fail-closed until the
 * hook resolves a concrete role.
 *
 * W.1 LISTENER (per F1-Wave-B Plan B-1b + nwrp153 Q5)
 * ---------------------------------------------------
 * The second useEffect below subscribes to `supabase.auth.onAuthStateChange`
 * so role state invalidates correctly on SIGNED_OUT / TOKEN_REFRESHED /
 * USER_UPDATED / SIGNED_IN events. The subscription is GATED behind
 * NEXT_PUBLIC_AUTH_STATE_LISTENER='true'; with the env var unset
 * (default), the subscription itself is NOT created (early return), so
 * production blast radius is zero on slice ship.
 *
 * UNFLAG PATH: see .planning/tech-debt/TD-WB-LISTENER-UNFLAG.md.
 */
export function useCurrentRole(): OrgMemberRole | null {
  const [role, setRole] = useState<OrgMemberRole | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("org_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data?.role) {
        setRole(data.role as OrgMemberRole);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // W.1 listener — invalidate role on auth state changes. Env-flag-gated
  // (slice B-1b ship posture: wiring lands dormant; activation deferred
  // to Slice-2 follow-up after observation window per Q5 nwrp153 + TD-
  // WB-LISTENER-UNFLAG.md).
  //
  // Reading NEXT_PUBLIC_AUTH_STATE_LISTENER:
  //   Next.js inlines NEXT_PUBLIC_* env vars at build time. With the
  //   env var unset, `process.env.NEXT_PUBLIC_AUTH_STATE_LISTENER`
  //   evaluates to `undefined` at build time and the early return
  //   short-circuits BEFORE the supabase.auth.onAuthStateChange call.
  //   The subscription is never created; cleanup is a no-op.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_AUTH_STATE_LISTENER !== "true") {
      return; // env-flag-off: no-op (slice ship default posture)
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setRole(null);
        return;
      }
      if (
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED" ||
        event === "SIGNED_IN"
      ) {
        const userId = session?.user?.id;
        if (!userId) {
          setRole(null);
          return;
        }
        const { data } = await supabase
          .from("org_members")
          .select("role")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        setRole((data?.role as OrgMemberRole | undefined) ?? null);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return role;
}
