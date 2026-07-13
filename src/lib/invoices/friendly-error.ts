// src/lib/invoices/friendly-error.ts
//
// 2.5 — raw provider/parse error text (Claude JSON, stack traces, Supabase
// messages) must NEVER reach the user. Every invoice ingest surface (parse
// API, bulk import, save API, upload UI, import UI) maps the raw error to one
// of a few friendly, action-oriented messages via this single helper. The raw
// error is still console.error'd / stored server-side for debugging — only the
// user-facing string is sanitized.
//
// The function is IDEMPOTENT: passing an already-friendly message back returns
// it unchanged, so a route that pre-sanitizes AND a client that wraps at
// display don't downgrade a specific message to the generic one.

const MSG = {
  busy: "AI processing is busy right now. Try again in a moment, or enter the invoice manually.",
  unsupported: "That file type isn't supported. Upload a PDF or image, or enter the invoice manually.",
  upload: "The file couldn't be uploaded. Check the file and try again.",
  unreadable: "We couldn't read this document automatically. Try a clearer scan, or enter the invoice manually.",
  generic: "Something went wrong processing this document. Try again, or enter the invoice manually.",
} as const;

const FRIENDLY = new Set<string>(Object.values(MSG));

export function friendlyIngestError(raw: string | null | undefined): string {
  if (raw && FRIENDLY.has(raw)) return raw; // idempotent — already sanitized
  const s = (raw ?? "").toLowerCase();
  if (!s) return MSG.generic;
  if (s.includes("limit reached") || s.includes("rate limit") || s.includes("429") || s.includes("overloaded")) {
    return MSG.busy;
  }
  if (s.includes("unsupported") || s.includes("file type") || s.includes("mime")) {
    return MSG.unsupported;
  }
  if (s.includes("upload") || s.includes("storage")) {
    return MSG.upload;
  }
  if (
    s.includes("json") ||
    s.includes("parse") ||
    s.includes("extract") ||
    s.includes("invalid") ||
    s.includes("no invoice") ||
    s.includes("unreadable")
  ) {
    return MSG.unreadable;
  }
  return MSG.generic;
}
