// Shared row-as-link click handling for list tables (coherence audit 3.5 —
// ROW SEMANTICS). A clickable table row is a mouse convenience, but a bare
// `window.location.href` / `router.push` on the row hijacks the two things a
// real anchor gives for free: Cmd/Ctrl+click and middle-click to open in a
// new tab. This helper restores those. Keyboard + screen-reader "open"
// semantics are handled separately by keeping a real <Link> on a cell inside
// the row (see the Inv # cell on the invoices list) — never by overriding the
// <tr>'s implicit `row` role.
//
// A genuine drag to select text does NOT fire a `click` event (mousedown and
// mouseup land on different points), so it never reaches this handler — there
// is deliberately no document-wide `getSelection()` guard here. An earlier
// version had one and it swallowed the first row click whenever a stale
// selection existed anywhere on the page.
//
// Usage:
//   onClick={(e) => { if (rowClickIntent(e, href) === "nav") router.push(href); }}
// The caller performs same-tab navigation only when this returns "nav";
// "handled" means the helper already opened a new tab, so the caller does
// nothing.

export type RowClickIntent = "nav" | "handled";

export function rowClickIntent(
  e: { metaKey?: boolean; ctrlKey?: boolean; button?: number },
  href: string,
): RowClickIntent {
  // Cmd/Ctrl+click or middle-click → new tab, matching native anchor behavior.
  if (e.metaKey || e.ctrlKey || e.button === 1) {
    window.open(href, "_blank", "noopener,noreferrer");
    return "handled";
  }

  return "nav";
}
