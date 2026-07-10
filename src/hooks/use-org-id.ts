"use client";

import { useEffect, useState } from "react";

/**
 * Current user's org_id, resolved SERVER-SIDE via /api/me (RLS-safe cookie
 * auth, not the client-auth strand). Returns null until loaded.
 *
 * Stage 2.1 cross-org sweep: client-side picker/queue/dropdown queries MUST
 * filter by org_id explicitly — RLS is bypassed by service-role AND by
 * platform_admin users, so a client query without `.eq("org_id", orgId)` leaks
 * every org's rows to a platform admin viewing the page. Gate such queries on
 * a non-null return from this hook, then add `.eq("org_id", orgId)`.
 *
 * This uses a plain `fetch("/api/me")` (server-resolved), NOT a client-side
 * `supabase.auth.*` call, so it does not add to the client-auth strand surface.
 */
export function useOrgId(): string | null {
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (!res.ok) return;
        const json = (await res.json()) as { org_id?: string | null };
        if (!cancelled && json?.org_id) setOrgId(json.org_id);
      } catch {
        /* leave null — callers must not query without an org_id */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return orgId;
}
