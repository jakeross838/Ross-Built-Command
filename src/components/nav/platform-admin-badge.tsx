"use client";

// src/components/nav/platform-admin-badge.tsx
//
// Per CONTEXT D-09: extracted from nav-bar.tsx:170-176 inline platform_admins
// query into dedicated badge component. Click → /platform-admin (Plan 6
// placeholder; existing /admin/platform/* sub-routes 308-redirect there
// via Plan 1 Task 3 wildcard per D-20).
//
// iter-2 mechanical #3 (token gap): tokens --text-on-dark + --border-on-dark
// do NOT exist in colors_and_type.css or globals.css (verified via grep).
// Adding tokens is PROPAGATION-RULES.md §3a workflow (out of scope for 1.5c).
// Plan 1 chose Option B per pre-audit: existing tokens with NO hex
// fallbacks — `var(--nw-white-sand)` for text on the dark nav-bar
// (matches Site Office locked palette), `var(--border-default)` for the
// border (resolves on both light + dark themes via colors_and_type.css).
// Plan 7 SUMMARY documents this as architectural debt → log to
// Wave 1.1-Lite if visual testing reveals contrast issue.
//
// Site Office signature: UPPERCASE 0.18em tracking, JetBrains Mono,
// fontWeight 500 (NOT 600 per TD-26 fix). NO hardcoded hex anywhere.
//
// platform_admins SELECT policy is user_id-bounded per migration 00048
// (line 82-83: `USING (user_id = auth.uid())`); NOT org_id-bounded by
// design (cross-org table for cross-tenant Nightwork operators). Verified
// per iter-2 multi-tenant W-4.

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function PlatformAdminBadge() {
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setIsPlatformAdmin(!!data);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!isPlatformAdmin) return null;

  return (
    <Link
      href="/platform-admin"
      className="px-[6px] py-[2px] text-[9px] tracking-[0.18em] uppercase border transition-colors"
      style={{
        fontFamily: "var(--font-jetbrains-mono)",
        fontWeight: 500,
        color: "var(--nw-white-sand)",
        borderColor: "var(--border-default)",
      }}
      aria-label="Platform Admin tools"
      title="Cross-org platform admin tools"
    >
      Platform
    </Link>
  );
}
