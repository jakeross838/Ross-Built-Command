// src/app/owner/layout.tsx
//
// F1-Wave-B Slice-2 B-2b — owner-portal standalone layout (anon homeowner UI).
// Per CONTEXT D-03 + Latitude #2:
//   - Standalone (NOT auth-redirect-protected; PUBLIC_PATHS extended in B-2a).
//   - Minimal top bar: Ross Built logo top-left per CLAUDE.md UI rules.
//     Collapses to icon-only at <360px viewport per Q13 (F1+-4 viewport contract).
//   - No <main> element here — page.tsx files own their <main data-prototype="...">
//     wrappers per BLK-3 fix (avoid nested <main>).
//   - Bottom safe-area padding applied at the page wrapper layer.
//   - NOTE-1 fix: font-display utility (Space Grotesk per tailwind.config.ts:64)
//     replaces inline `style={{ fontFamily: 'var(--font-space-grotesk)' }}`.
//
// Pattern citations:
//   - PATTERNS.md §4h.3 (Owner Portal Dashboard, Dashboard pattern)
//   - PATTERNS.md §2h.3 (Owner Draw Review, Document Review extension)
//   - CLAUDE.md UI rules ("logo top-left", "design tokens, always")

import "@/app/design-system/design-system.css"; // load design tokens for /owner/**
import "@/app/colors_and_type.css"; // load --bg-page / --text-primary / shadow tokens

export const dynamic = "force-dynamic";

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <header
        className="sticky top-0 z-10 border-b border-[var(--border-default)] bg-[var(--bg-page)] px-[var(--space-4)] py-[var(--space-3)]"
        role="banner"
      >
        <div className="flex items-center gap-[var(--space-3)]">
          {/* Logo top-left per CLAUDE.md UI rule. NOTE-1 fix: font-display
              utility (Space Grotesk per tailwind.config.ts:64); inline
              fontFamily removed. */}
          <span className="font-display text-[16px] tracking-[0.02em] text-[color:var(--text-primary)]">
            Ross Built
          </span>
        </div>
      </header>
      {children}
    </div>
  );
}
