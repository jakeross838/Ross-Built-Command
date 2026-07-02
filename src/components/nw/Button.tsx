"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

// Slate primitive button. Square corners (no rounded), JetBrains Mono uppercase
// with 0.12em tracking per design system. Variants follow Slate Invoice Detail
// reference: primary = stone-blue, secondary = outlined slate, ghost = text only,
// danger = danger color.
//
// Theme awareness: secondary and ghost use semantic CSS vars
// (--text-primary, --border-strong, --bg-subtle) so they swap when
// data-theme="dark" is set. Primary keeps stone-blue (it's a CTA, designed
// to stand out on both backgrounds). Danger keeps the danger hue (also
// readable on both per Slate refs).
const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "h-[30px] px-3 text-[10px]",
  md: "h-[36px] px-4 text-[11px]",
  lg: "h-[44px] px-5 text-[12px]",
};

// Raised affordance per the Slate invoice-inbox handoff: primary = stone-blue
// with a darker bottom edge; secondary/danger = white bg with a subtle edge.
// The raise is a hard 2px bottom line + soft ambient drop, defined as
// --shadow-raise-* tokens in globals.css (no component hex). Hover lifts 1px,
// press pushes 1px down + collapses the edge — the tactile "button" feel.
// `ghost` intentionally stays flat + quiet (minimal-emphasis inline action).
const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-nw-stone-blue text-nw-white-sand border border-nw-gulf-blue " +
    "shadow-[var(--shadow-raise-accent)] " +
    "hover:bg-nw-gulf-blue hover:border-nw-gulf-blue hover:-translate-y-px " +
    "active:translate-y-px active:shadow-[var(--shadow-raise-accent-active)] " +
    "disabled:bg-nw-stone-blue/40 disabled:border-nw-stone-blue/40 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed",
  secondary:
    "bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-strong)] " +
    "shadow-[var(--shadow-raise-ghost)] " +
    "hover:border-nw-stone-blue hover:text-nw-stone-blue hover:-translate-y-px " +
    "active:translate-y-px active:shadow-[var(--shadow-raise-ghost-active)] " +
    "disabled:opacity-40 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed",
  ghost:
    "bg-transparent text-[var(--text-primary)] border border-transparent " +
    "hover:bg-[var(--bg-subtle)] " +
    "disabled:opacity-40 disabled:cursor-not-allowed",
  danger:
    "bg-[var(--bg-card)] text-nw-danger border border-nw-danger/50 " +
    "shadow-[var(--shadow-raise-danger)] " +
    "hover:bg-nw-danger/[0.08] hover:border-nw-danger hover:-translate-y-px " +
    "active:translate-y-px active:shadow-[var(--shadow-raise-danger-active)] " +
    "disabled:opacity-40 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    disabled,
    type = "button",
    className,
    children,
    ...rest
  },
  ref,
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={[
        "inline-flex items-center justify-center gap-2",
        "uppercase font-medium leading-none",
        "transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-stone-blue/40 focus-visible:ring-offset-1",
        SIZE_STYLES[size],
        VARIANT_STYLES[variant],
        className ?? "",
      ].join(" ")}
      style={{
        fontFamily: "var(--font-jetbrains-mono)",
        letterSpacing: "0.12em",
      }}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"
        />
      )}
      {children}
    </button>
  );
});

export default Button;
