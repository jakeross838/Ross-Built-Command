"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

// ── Flash strip (Pattern 5) ─────────────────────────────────────────────────
// A green confirmation strip that slides in (fadeUp 0.2s) at the top of the
// content area after a mutation, states WHAT happened and WHERE it went, and
// auto-dismisses in 5s. One strip at a time (a newer flash replaces an older).
// Global: mounted once in the root layout; any surface calls useFlash().show().

interface FlashApi {
  show: (message: ReactNode, opts?: { durationMs?: number }) => void;
}

const FlashContext = createContext<FlashApi>({ show: () => {} });

export function useFlash() {
  return useContext(FlashContext);
}

interface FlashState {
  id: number;
  message: ReactNode;
}

export function FlashProvider({ children }: { children: ReactNode }) {
  const [flash, setFlash] = useState<FlashState | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const show = useCallback<FlashApi["show"]>((message, opts) => {
    const id = Date.now() + Math.random();
    setFlash({ id, message });
    const durationMs = opts?.durationMs ?? 5000;
    window.setTimeout(() => {
      setFlash((cur) => (cur && cur.id === id ? null : cur));
    }, durationMs);
  }, []);

  return (
    <FlashContext.Provider value={{ show }}>
      {children}
      {mounted &&
        flash &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 top-0 z-[8000] flex justify-center px-4 pt-[68px]">
            <div
              key={flash.id}
              role="status"
              aria-live="polite"
              className="pointer-events-auto flex max-w-2xl animate-fade-up-fast items-start gap-3 border border-[var(--flash-border)] bg-[var(--flash-bg)] px-4 py-3 shadow-[var(--shadow-panel)]"
            >
              <span aria-hidden className="mt-px font-mono text-[13px] leading-none text-nw-success">
                ✓
              </span>
              <div className="flex-1 text-[13px] leading-snug text-[color:var(--text-primary)]">
                {flash.message}
              </div>
              <button
                type="button"
                onClick={() => setFlash(null)}
                aria-label="Dismiss"
                className="-mr-1 -mt-0.5 shrink-0 px-1 font-mono text-[13px] leading-none text-[color:var(--text-tertiary)] transition-colors hover:text-[color:var(--text-primary)]"
              >
                ×
              </button>
            </div>
          </div>,
          document.body,
        )}
    </FlashContext.Provider>
  );
}
