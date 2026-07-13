"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import NwButton from "@/components/nw/Button";

export interface OverflowMenuItem {
  key: string;
  label: ReactNode;
  /** Button action. Ignored when `href` is set. */
  onClick?: () => void;
  /** Renders a download anchor instead of a button (e.g. Download PDF). */
  href?: string;
  /** Destructive action — red styling, grouped below a divider. */
  danger?: boolean;
  disabled?: boolean;
  title?: string;
}

interface Props {
  items: OverflowMenuItem[];
  /** Trigger label. */
  label?: string;
  ariaLabel?: string;
}

/**
 * A quiet "⋯ More" overflow menu for secondary + destructive row/detail
 * actions (coherence audit 3.6 / #15 — keep the destructive DELETE out of the
 * co-equal action row). Danger items sort below a divider and take danger
 * styling. Click-outside and Escape close it; the trigger reuses NwButton so
 * it matches the sibling action buttons exactly.
 */
export default function OverflowMenu({ items, label = "More", ariaLabel = "More actions" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  const normal = items.filter((i) => !i.danger);
  const danger = items.filter((i) => i.danger);

  const itemClass = (item: OverflowMenuItem) =>
    [
      "w-full text-left flex items-center gap-2 px-3 py-2 text-[13px] transition-colors",
      item.disabled
        ? "opacity-50 cursor-not-allowed text-[color:var(--text-tertiary)]"
        : item.danger
          ? "text-nw-danger hover:bg-nw-danger/[0.08]"
          : "text-[color:var(--text-primary)] hover:bg-[var(--bg-subtle)]",
    ].join(" ");

  const renderItem = (item: OverflowMenuItem) => {
    if (item.href && !item.disabled) {
      return (
        <a
          key={item.key}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          download
          role="menuitem"
          title={item.title}
          className={itemClass(item)}
          onClick={() => setOpen(false)}
        >
          {item.label}
        </a>
      );
    }
    return (
      <button
        key={item.key}
        type="button"
        role="menuitem"
        disabled={item.disabled}
        title={item.title}
        className={itemClass(item)}
        onClick={() => {
          if (item.disabled) return;
          setOpen(false);
          item.onClick?.();
        }}
      >
        {item.label}
      </button>
    );
  };

  return (
    <div ref={ref} className="relative">
      <NwButton
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        {label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M2.5 3.5l2.5 3 2.5-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </NwButton>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 min-w-[200px] z-50 py-1 border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-panel)]"
        >
          {normal.map(renderItem)}
          {danger.length > 0 && normal.length > 0 && (
            <div className="my-1 border-t border-[var(--border-default)]" aria-hidden="true" />
          )}
          {danger.map(renderItem)}
        </div>
      )}
    </div>
  );
}
