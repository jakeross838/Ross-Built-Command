"use client";

/**
 * Shared client-side /api/me resolver (perf run 2026-07-17).
 *
 * Both the nav bar (role + name chrome) and useOrgId (org-scoped picker
 * queries) resolve identity via /api/me. Before this module each consumer
 * issued its OWN fetch — the review modal measured a duplicate /api/me
 * (~1.2s warm each) because useOrgId-mounting components appear after the
 * invoice loads. One module-level promise dedupes every consumer in the
 * page lifetime; failures are not cached so a retry is possible.
 */

export type MeResponse = {
  authenticated: boolean;
  id: string | null;
  full_name: string;
  role: string | null;
  org_id: string | null;
};

let mePromise: Promise<MeResponse | null> | null = null;

export function fetchMe(): Promise<MeResponse | null> {
  if (!mePromise) {
    mePromise = fetch("/api/me", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<MeResponse>) : null))
      .catch(() => null)
      .then((v) => {
        if (v === null || !v.authenticated) mePromise = null; // don't cache failures/signed-out
        return v;
      });
  }
  return mePromise;
}
