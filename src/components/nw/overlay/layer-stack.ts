"use client";

import { useEffect } from "react";

// ── Esc layer manager (Pattern 1) ──────────────────────────────────────────
// "Esc closes the topmost layer (editor → dropdown → modal → slide-over)."
//
// A single global keydown listener owns Escape. Each open overlay registers its
// close callback on a stack; Escape closes only the topmost. Inner controls that
// handle their own Escape (base-ui combobox/popover/select call preventDefault
// when they close) are respected: we bail on `e.defaultPrevented`, so an open
// dropdown inside a slide-over closes first, and only a second Escape closes the
// slide-over itself. Bubble phase (not capture) preserves that ordering.

type CloseFn = () => void;

const stack: CloseFn[] = [];
let attached = false;

function handleKeyDown(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  if (e.defaultPrevented) return; // an inner layer (dropdown/editor) took it
  const top = stack[stack.length - 1];
  if (!top) return;
  e.preventDefault();
  top();
}

function push(close: CloseFn): () => void {
  if (typeof window !== "undefined" && !attached) {
    window.addEventListener("keydown", handleKeyDown);
    attached = true;
  }
  stack.push(close);
  return () => {
    const i = stack.lastIndexOf(close);
    if (i !== -1) stack.splice(i, 1);
  };
}

/**
 * Register an overlay on the Esc stack while it is open. `onClose` is invoked
 * when Esc is pressed and this overlay is the topmost layer.
 */
export function useEscLayer(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const remove = push(onClose);
    return remove;
  }, [open, onClose]);
}
