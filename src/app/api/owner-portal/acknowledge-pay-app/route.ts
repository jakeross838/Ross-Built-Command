// src/app/api/owner-portal/acknowledge-pay-app/route.ts
//
// F1-Wave-B Slice-2 B-2b — owner-portal pay-app acknowledge endpoint.
// Per CONTEXT D-15..D-21:
//   - Anon-token-resolved POST endpoint (token in request body acts as bearer
//     credential; CSRF N/A because no cookie-authenticated session).
//   - PUBLIC_PATHS extended in B-2b Task 5 (src/middleware.ts) for
//     `/api/owner-portal/acknowledge-pay-app` per BLK-1 fix — the existing
//     `/api/owner-portal/acknowledge` entry does NOT startsWith-match this
//     route due to hyphen vs slash boundary (matcher requires
//     `pathname === p || pathname.startsWith(`${p}/`)`).
//   - Rate-limit per-token + per-IP via B-2a's `recordOwnerPortalRequest`.
//   - `assertDrawBelongsToToken` cross-validation BEFORE audit write (closes
//     B-3 intra-org cross-client probe per B-2a §6.e pinned SQL).
//   - INSERT INTO activity_log via `logActivity` with `onConflictDoNothing=true`
//     — closes iter-1 SYNTHESIS B-12 (TOCTOU race on concurrent double-tap).
//     Migration 00106 partial unique index on (entity_id, actor_token_id,
//     action) WHERE action='acknowledged' AND actor_token_id IS NOT NULL
//     guarantees exactly 1 audit row.
//   - APPEND-ONLY — NO expected_updated_at; NO updateWithLock per D-16 +
//     iter-1 SYNTHESIS B-13 (audit_log is append-only, NOT versioned).
//
// Threat model entries:
//   - T-B2b-01 (Information Disclosure) — mitigated via getScopedOwnerPortal-
//     Client + assertDrawBelongsToToken from B-2a.
//   - T-B2b-02 (Tampering) — mitigated via token-in-body bearer + per-token +
//     per-IP rate-limit + HTTPS-only (Vercel default).
//   - T-B2b-05 (Information Disclosure on error) — handler returns generic
//     400 / 401 / 404 / 429; does NOT distinguish "invalid token" from
//     "draw not belonging to token" beyond what's necessary.
//
// References:
//   - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2b-PLAN.md §6.b
//   - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2b-CONTEXT.md D-15..D-21
//   - supabase/migrations/00106_b2b_activity_log_ack_dedupe.sql
//   - src/lib/owner-portal/token.ts (B-2a)
//   - src/lib/owner-portal/rate-limit.ts (B-2a)
//   - src/lib/activity-log.ts (logActivity + onConflictDoNothing flag — B-2b Task 2)

import { NextRequest, NextResponse } from "next/server";
import {
  resolveOwnerToken,
  assertDrawBelongsToToken,
} from "@/lib/owner-portal/token";
import { recordOwnerPortalRequest } from "@/lib/owner-portal/rate-limit";
import { logActivity } from "@/lib/activity-log";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

interface AckBody {
  token?: unknown;
  drawId?: unknown;
}

function isUuidLike(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  );
}
function isTokenLike(v: unknown): v is string {
  return typeof v === "string" && v.length === 64 && /^[0-9a-f]{64}$/i.test(v);
}

export async function POST(request: NextRequest) {
  // Step 1: parse + validate body
  let body: AckBody;
  try {
    body = (await request.json()) as AckBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isTokenLike(body.token) || !isUuidLike(body.drawId)) {
    return NextResponse.json(
      { error: "Invalid token or drawId" },
      { status: 400 },
    );
  }

  // Step 2: resolve token (timing-uniform null per B-2a)
  const resolved = await resolveOwnerToken(body.token);
  if (!resolved) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Step 3: rate-limit per-token + per-IP
  const requestIp =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const tokenRl = await recordOwnerPortalRequest(
    "token",
    resolved.portal_access_id,
  );
  if (!tokenRl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(tokenRl.retryAfterSeconds ?? 60) },
      },
    );
  }
  const ipRl = await recordOwnerPortalRequest("ip", requestIp);
  if (!ipRl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(ipRl.retryAfterSeconds ?? 60) },
      },
    );
  }

  // Step 4: cross-validate draw belongs to token's client+org scope
  // (closes B-3 intra-org cross-client probe per B-2a §6.e pinned SQL).
  const drawBelongs = await assertDrawBelongsToToken(body.drawId, resolved);
  if (!drawBelongs) {
    return NextResponse.json({ error: "Draw not found" }, { status: 404 });
  }

  // Step 5: write audit_log row via B-2a's logActivity helper.
  //   - entity_type='draw' (already in ActivityEntityType union — B-1a-bis)
  //   - action='acknowledged' (NEW B-2b union member — B-2b Task 2)
  //   - user_id=NULL (homeowner-via-token; mutual exclusion with actor_token_id)
  //   - actor_token_id=resolved.portal_access_id (D-16)
  //
  // TOCTOU close per D-19 + D-20: onConflictDoNothing=true wires the upsert
  // branch in logActivity (B-2b Task 2) to use
  // `onConflict='entity_id,actor_token_id,action'` + `ignoreDuplicates=true`,
  // which resolves to migration 00106's partial unique index. Concurrent
  // double-tap from the homeowner produces exactly 1 audit_log row — the
  // second insert hits the unique constraint and is silently ignored.
  //
  // WARN-2 (plan-checker iter-1) — Option (a) considered + REJECTED in favor
  // of (b) extending logActivity helper. Rationale: keeps ON CONFLICT
  // ergonomics central to the audit-log helper module; one call site; future
  // audit-action additions inherit the upsert semantic without re-implementing
  // per-call.
  await logActivity({
    org_id: resolved.org_id,
    user_id: null,
    actor_token_id: resolved.portal_access_id,
    entity_type: "draw",
    entity_id: body.drawId,
    action: "acknowledged",
    details: { acknowledged_via: "owner_portal" },
    onConflictDoNothing: true,
  });

  // Step 6: return success
  return NextResponse.json({ acknowledged: true });
}
