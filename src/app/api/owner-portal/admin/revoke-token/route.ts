/**
 * Admin Owner Portal Token Revocation — F1 Wave-B Slice-2 B-2a.
 *
 * Per CONTEXT D-08 + D-09 + D-10 + D-11 + iter-1 SYNTHESIS H-2 +
 * CONTEXT D-23 type contract:
 *
 * POST /api/owner-portal/admin/revoke-token
 *   Body: { token_id: string, expected_updated_at: string }
 *   Response: 200 { revoked: true, revoked_at: <iso> }
 *
 * Flow:
 *   1. Middleware allows (PUBLIC_PATHS extended in src/middleware.ts
 *      via B-2a Task 5 — auth-redirect skip ONLY; this handler still
 *      enforces auth via getCurrentMembership)
 *   2. CSRF protection via Origin header validation per H-2 iter-1
 *      SYNTHESIS (same-origin OWASP pattern; Origin is a forbidden-
 *      write header per Fetch spec — cross-origin attacker cannot
 *      spoof it from a browser context)
 *   3. getCurrentMembership() — return 401 if not authenticated, 403
 *      if role NOT IN ('owner', 'admin'). PM role NOT allowed (admin
 *      function only).
 *   4. Per-IP rate-limit via recordOwnerPortalRequest (D-15;
 *      Wave 1.1-Lite may add per-membership.user_id rate-limit if
 *      observation surfaces abuse per T-B2a-08c W-2 disposition).
 *   5. Compute next revoked_seq (max + 1 for the row's logical key)
 *      per Plan-Author Latitude #3 APPROVED Option A.
 *   6. updateWithLock against client_portal_access with expected_
 *      updated_at per D-11.
 *   7. On success: write activity_log via logActivity with user_id =
 *      membership.user_id, actor_token_id = NULL, entity_type =
 *      'client_portal_access', action = 'revoked' per D-10 + D-23.
 *   8. Return 200 + { revoked: true, revoked_at: <iso> }. On
 *      isLockConflict: return the conflict response (409 or 403).
 *
 * Threat model entries:
 *   - T-B2a-08 (Tampering on admin revoke endpoint) — mitigated via
 *     route-handler auth check + role gate; PUBLIC_PATHS extension
 *     does NOT bypass auth-check, only auth-redirect.
 *   - T-B2a-08b (CSRF) — mitigated via Origin header validation.
 *   - T-B2a-08c (rate-limit IP-only) — accepted with rationale per
 *     iter-1 SYNTHESIS W-2 disposition (a).
 *   - T-B2a-09 (admin revoke race) — mitigated via updateWithLock
 *     with expected_updated_at.
 *
 * References:
 *   - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-PLAN.md §6.d + §5 Task 7
 *   - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-CONTEXT.md D-08..D-11 + D-23
 *   - supabase/migrations/00104_b2a_token_issuance_security_model.sql §1e (revoked_seq) + §4 (actor_token_id)
 *   - src/lib/owner-portal/rate-limit.ts (B-2a Task 6)
 *   - src/lib/api/optimistic-lock.ts (updateWithLock)
 *   - src/lib/activity-log.ts (B-2a Task 3 — actor_token_id contract)
 *   - iter-1 SYNTHESIS H-2 (CSRF Origin check) + W-2 (rate-limit disposition)
 */

import { NextRequest, NextResponse } from "next/server";
import { tryCreateServiceRoleClient } from "@/lib/supabase/service";
import { getCurrentMembership } from "@/lib/org/session";
import { updateWithLock, isLockConflict } from "@/lib/api/optimistic-lock";
import { logActivity } from "@/lib/activity-log";
import { recordOwnerPortalRequest } from "@/lib/owner-portal/rate-limit";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

interface RevokeTokenBody {
  token_id?: unknown;
  expected_updated_at?: unknown;
}

function isUuidLike(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

function isIsoLike(v: unknown): v is string {
  return typeof v === "string" && v.length >= 20 && !Number.isNaN(new Date(v).getTime());
}

export async function POST(request: NextRequest) {
  // ===== Step 2: CSRF Origin check per H-2 iter-1 SYNTHESIS =====
  // Same-origin OWASP pattern. Origin is a forbidden-write header per
  // Fetch spec — cross-origin attacker cannot spoof from browser context.
  const origin = request.headers.get("origin");
  const expectedOrigin = process.env.NEXT_PUBLIC_APP_URL;
  if (!expectedOrigin) {
    // Misconfigured deployment: fail closed.
    return NextResponse.json(
      { error: "Service misconfigured (NEXT_PUBLIC_APP_URL not set)" },
      { status: 500 },
    );
  }
  if (!origin || origin !== expectedOrigin) {
    return NextResponse.json(
      { error: "Cross-origin request rejected" },
      { status: 403 },
    );
  }

  // ===== Step 3: Authentication + role gate =====
  const membership = await getCurrentMembership();
  if (!membership) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    // PM role NOT allowed — admin function only per D-08.
    return NextResponse.json(
      { error: "Forbidden: admin or owner role required" },
      { status: 403 },
    );
  }

  // ===== Step 4: Per-IP rate-limit per D-15 =====
  // Per-membership.user_id rate-limit deferred to Wave 1.1-Lite per
  // T-B2a-08c W-2 disposition (a).
  const requestIp =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const rateLimitResult = await recordOwnerPortalRequest("ip", requestIp);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded; retry shortly" },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitResult.retryAfterSeconds ?? 60),
        },
      },
    );
  }

  // ===== Step 1: Parse + validate body =====
  let body: RevokeTokenBody;
  try {
    body = (await request.json()) as RevokeTokenBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }
  if (!isUuidLike(body.token_id)) {
    return NextResponse.json(
      { error: "token_id must be a UUID string" },
      { status: 400 },
    );
  }
  if (!isIsoLike(body.expected_updated_at)) {
    return NextResponse.json(
      { error: "expected_updated_at must be an ISO timestamp string" },
      { status: 400 },
    );
  }
  const tokenId = body.token_id;
  const expectedUpdatedAt = body.expected_updated_at;

  // Service-role client. RLS on client_portal_access still scopes the
  // updateWithLock via the explicit orgId filter (updateWithLock applies
  // .eq("org_id", orgId) on every UPDATE per src/lib/api/optimistic-lock.ts
  // line 51). Service-role bypasses RLS but the explicit filter pins
  // tenant scope at the application layer; cross-tenant revoke returns
  // 0 rows → 403 per updateWithLock RLS-denial classification.
  const supabase = tryCreateServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Service misconfigured (SUPABASE_SERVICE_ROLE_KEY not set)" },
      { status: 500 },
    );
  }

  // ===== Step 5: Compute next revoked_seq per Plan-Author Latitude #3 Option A =====
  // The unique partial index client_portal_access_org_client_job_seq_unique
  // (created in migration 00104 §1f) covers (org_id, client_id, job_id,
  // revoked_seq) WHERE client_id IS NOT NULL. On revoke, bump the row's
  // revoked_seq to MAX(revoked_seq) + 1 across rows sharing the same
  // (org_id, client_id, job_id) triplet — collisions avoided because the
  // re-invitation INSERT uses revoked_seq=0 (a different unique slot).
  //
  // Read the target row's (org_id, client_id, job_id) triplet first to
  // compute the next seq. RLS scope enforced via .eq("org_id",
  // membership.org_id) — cross-tenant probe returns 0 rows → 404.
  const { data: target, error: targetErr } = await supabase
    .from("client_portal_access")
    .select("id, org_id, client_id, job_id, revoked_seq")
    .eq("id", tokenId)
    .eq("org_id", membership.org_id)
    .maybeSingle();
  if (targetErr) {
    return NextResponse.json(
      { error: `Lookup failed: ${targetErr.message}` },
      { status: 500 },
    );
  }
  if (!target) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }
  // MAX(revoked_seq) across rows sharing the (org_id, client_id, job_id)
  // triplet. If the row's client_id is NULL (pre-B-2a remnant; should not
  // happen post-backfill), fall back to revoked_seq+1 on the row itself.
  let nextRevokedSeq = (target.revoked_seq ?? 0) + 1;
  if (target.client_id !== null) {
    const { data: maxRow } = await supabase
      .from("client_portal_access")
      .select("revoked_seq")
      .eq("org_id", target.org_id)
      .eq("client_id", target.client_id)
      .eq("job_id", target.job_id)
      .order("revoked_seq", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxRow && typeof maxRow.revoked_seq === "number") {
      nextRevokedSeq = maxRow.revoked_seq + 1;
    }
  }

  // ===== Step 6: updateWithLock per D-11 =====
  const revokedAtIso = new Date().toISOString();
  const lockResult = await updateWithLock<{
    id: string;
    updated_at: string;
    revoked_at: string;
  }>(supabase, {
    table: "client_portal_access",
    id: tokenId,
    orgId: membership.org_id,
    expectedUpdatedAt,
    updates: {
      revoked_at: revokedAtIso,
      revoked_seq: nextRevokedSeq,
    },
    selectCols: "id, updated_at, revoked_at",
  });
  if (isLockConflict(lockResult)) {
    return lockResult.response;
  }

  // ===== Step 7: Write activity_log row per D-10 + D-23 =====
  // user_id = membership.user_id (revoker is authenticated admin).
  // actor_token_id = NULL (NOT a homeowner-via-token action).
  // entity_type = 'client_portal_access' + action = 'revoked' (added
  // to ActivityEntityType + ActivityAction unions in B-2a Task 3).
  //
  // membership.user_id is NOT a field of CurrentMembership (the type
  // carries org_id + role + is_active; auth.uid is not surfaced). Use
  // a separate auth getUser call via server client. Per src/lib/org/
  // session.ts the membership was already resolved via auth.getUser
  // upstream — repeating the call here is acceptable for explicit
  // user_id (the savings would require refactoring CurrentMembership
  // to carry user_id; out of B-2a scope).
  const { createServerClient } = await import("@/lib/supabase/server");
  const userClient = createServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  await logActivity({
    org_id: membership.org_id,
    user_id: user?.id ?? null,
    actor_token_id: null, // D-23: revoker is authenticated admin, NOT homeowner-via-token
    entity_type: "client_portal_access",
    entity_id: tokenId,
    action: "revoked",
    details: { revoked_at: revokedAtIso, revoked_seq: nextRevokedSeq },
  });

  // ===== Step 8: Return success =====
  return NextResponse.json({
    revoked: true,
    revoked_at: revokedAtIso,
  });
}
