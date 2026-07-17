"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * THE freshness pattern for mutation → list surfaces (perf run 2026-07-17).
 *
 * Mechanism it replaces: client list pages held data in useState filled by a
 * run-once mount effect and signaled `router.refresh()` after mutations — a
 * no-op for client state (router.refresh() only re-renders SERVER components),
 * so new records stayed invisible until a hard remount, and every remount
 * blanked the list to its skeleton then refilled it (the disappear/reappear
 * flicker, worsened where the same page mounts at two routes).
 *
 * The pattern (await-refetch + snapshot + sequence guard):
 *   1. Mount: paint the last known data instantly from a module-level
 *      snapshot (no skeleton flash on remount), then refetch in the
 *      background so the surface always converges on server truth.
 *   2. Mutation: `await refetch()` — the caller reveals success only after
 *      the list reflects the server's row. Never `router.refresh()` for
 *      client-state lists. (In-place patches from a server-confirmed
 *      response go through `mutate` so the snapshot stays coherent.)
 *   3. Stale-response guard: a sequence token drops out-of-order responses
 *      so an older in-flight fetch can never overwrite a newer one.
 *
 * The fetcher returns `null` to mean "keep whatever is shown" (auth/network
 * failure) — the hook never downgrades painted data to an empty state.
 */

const snapshots = new Map<string, unknown>();

export function useFreshList<T>(key: string, fetcher: () => Promise<T | null>) {
  const cached = snapshots.get(key) as T | undefined;
  const [data, setData] = useState<T | null>(cached ?? null);
  const [loading, setLoading] = useState(cached === undefined);
  const seqRef = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(async (): Promise<T | null> => {
    const seq = ++seqRef.current;
    try {
      const fresh = await fetcherRef.current();
      if (seq !== seqRef.current) return null; // superseded — drop the stale response
      if (fresh !== null) {
        snapshots.set(key, fresh);
        setData(fresh);
      }
      setLoading(false);
      return fresh;
    } catch {
      if (seq === seqRef.current) setLoading(false);
      return null;
    }
  }, [key]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  /** In-place patch from a server-confirmed mutation response (keeps the snapshot coherent). */
  const mutate = useCallback(
    (updater: (prev: T) => T) => {
      setData((prev) => {
        if (prev === null) return prev;
        const next = updater(prev);
        snapshots.set(key, next);
        return next;
      });
    },
    [key]
  );

  return { data, loading, refetch, mutate };
}

/**
 * Patch a list snapshot from OUTSIDE the list page (e.g. the review route
 * mutates an invoice, then navigates back to the list). The patch must come
 * from a SERVER-CONFIRMED response (returned status/row), never a client
 * guess — the background refetch on remount still converges on full truth;
 * the patch only prevents the snapshot from painting a ghost of the
 * pre-mutation row during that window.
 */
export function patchListSnapshot<T>(key: string, updater: (prev: T) => T): void {
  const prev = snapshots.get(key) as T | undefined;
  if (prev === undefined) return;
  snapshots.set(key, updater(prev));
}
