"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useEscLayer } from "./layer-stack";

export interface SlideoverProps {
  open: boolean;
  onClose: () => void;
  /** Title in the slate-deep header. */
  title: string;
  /** One-line promise under the title (Pattern 1), e.g. "TWO REQUIRED FIELDS…". */
  promise?: string;
  /** Sticky footer action bar. */
  footer?: ReactNode;
  children: ReactNode;
  /** Panel width in px. Spec default 600. */
  width?: number;
  /** When true, backdrop click / Esc are ignored (mid-submit). */
  busy?: boolean;
}

// Right slide-over container (Pattern 1): 600px, full height, slides in 0.32s
// on the house curve with a 0.2s backdrop fade. Header = slate-deep with title +
// promise + ESC chip; footer = sticky action bar. Entrance animates; close is
// immediate (Pattern 6 — entrances only). Esc/backdrop close unless `busy`.
export default function Slideover({
  open,
  onClose,
  title,
  promise,
  footer,
  children,
  width = 600,
  busy = false,
}: SlideoverProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Body scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const guardedClose = () => {
    if (!busy) onClose();
  };
  useEscLayer(open, guardedClose);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9200] flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={guardedClose}
        className="absolute inset-0 animate-overlay-fade cursor-default bg-[var(--overlay-backdrop)]"
      />
      {/* Panel */}
      <div
        className="relative flex h-full animate-slide-over-in flex-col border-l border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-panel)]"
        style={{ width: `min(${width}px, 100vw)` }}
      >
        {/* Header — slate-deep */}
        <div className="flex items-start justify-between gap-4 bg-nw-slate-deep px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate font-display text-[17px] font-medium leading-tight text-[color:var(--on-dark-text)]">
              {title}
            </h2>
            {promise && (
              <p className="mt-1 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-[color:var(--on-dark-text-muted)]">
                {promise}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={guardedClose}
            className="shrink-0 border border-[var(--on-dark-border)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--on-dark-text-muted)] transition-colors hover:border-[var(--on-dark-border-hover)] hover:text-[color:var(--on-dark-text)]"
          >
            ESC
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
        {/* Footer — sticky action bar */}
        {footer && (
          <div className="border-t border-[var(--border-default)] bg-[var(--bg-card)] px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
