"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useEscLayer } from "./layer-stack";

export interface PopModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Max width in px. Spec default 1120. */
  width?: number;
  busy?: boolean;
  ariaLabel?: string;
}

// Centered pop-modal container (Pattern 1): 1120px × near-full-height, backdrop
// via the --overlay-backdrop token, pops in 0.3s (scale .96 + y8) on the house
// curve.
// A CONTAINER only (F2): Phase B mounts the existing rich review inside it —
// this primitive does not implement review internals. Esc/backdrop close unless
// `busy`. Entrance animates; close is immediate.
export default function PopModal({
  open,
  onClose,
  children,
  width = 1120,
  busy = false,
  ariaLabel,
}: PopModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
    <div
      className="fixed inset-0 z-[9200] flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={guardedClose}
        className="absolute inset-0 animate-overlay-fade cursor-default bg-[var(--overlay-backdrop)]"
      />
      <div
        className="relative flex max-h-[92vh] w-full animate-pop-in flex-col overflow-hidden border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-panel)]"
        style={{ maxWidth: `${width}px` }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
