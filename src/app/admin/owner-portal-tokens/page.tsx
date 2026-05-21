// src/app/admin/owner-portal-tokens/page.tsx
//
// F1-Wave-B Slice-2 B-2a per CONTEXT D-08 + D-09 — minimum-viable
// admin UI surface for owner-portal token list + revocation action.
//
// Server component:
//   1. getCurrentMembership() + role gate (owner|admin only; 403 →
//      redirect /admin per Stage 1.5c D-22 redirect convention)
//   2. Query client_portal_access for the org (RLS-scoped; ordered
//      created_at DESC). JOIN clients (full_name) + jobs (name) via
//      PostgREST embed — cites FK constraints `client_portal_access_
//      client_id_fkey` (B-2a §1b inline; auto-named) +
//      `client_portal_access_job_id_fkey` (existing 00074:152 inline)
//      per CLAUDE.md Workflow Rule 2.
//   3. Render table: token id (truncated 8 chars), client name, job
//      name, created_at, expires_at, last_accessed_at, status badge
//      (Active / Revoked / Expired), action button.
//   4. Each row delegates the action affordance to RevokeTokenRow
//      (client component).
//
// Layout consumes existing admin section design tokens — no hardcoded
// hex; bracket-value utilities with CSS vars + nw-* tokens only.
//
// References:
//   - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-PLAN.md §6.d + §5 Task 8
//   - .planning/phases/stage-f1-knowledge-graph-auth-wave-b-slice-2/B-2a-CONTEXT.md D-09
//   - src/app/api/owner-portal/admin/revoke-token/route.ts (B-2a Task 7)
//   - src/app/admin/users/page.tsx (pattern reference)
//   - supabase/migrations/00104_b2a_token_issuance_security_model.sql §1b + §1d
//   - CLAUDE.md Workflow posture Rule 2 (PostgREST FK citation)

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org/session";
import Badge, { type BadgeVariant } from "@/components/nw/Badge";
import RevokeTokenRow from "./_components/RevokeTokenRow";

export const dynamic = "force-dynamic";

interface TokenRow {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  expires_at: string;
  last_accessed_at: string | null;
  revoked_at: string | null;
  updated_at: string;
  client: { id: string; full_name: string | null } | null;
  job: { id: string; name: string } | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function tokenStatus(row: {
  expires_at: string;
  revoked_at: string | null;
}): {
  label: string;
  tone: "active" | "revoked" | "expired";
  variant: BadgeVariant;
} {
  if (row.revoked_at !== null) {
    return { label: "Revoked", tone: "revoked", variant: "danger" };
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return { label: "Expired", tone: "expired", variant: "warning" };
  }
  return { label: "Active", tone: "active", variant: "success" };
}

export default async function OwnerPortalTokensPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/login");
  if (membership.role !== "admin" && membership.role !== "owner") {
    redirect("/admin");
  }

  const supabase = createServerClient();
  // PostgREST embed:
  //   client:clients!client_portal_access_client_id_fkey(id, full_name)
  //   job:jobs!client_portal_access_job_id_fkey(id, name)
  // per CLAUDE.md Workflow posture Rule 2.
  const { data: rowsRaw } = await supabase
    .from("client_portal_access")
    .select(
      `id, email, name, created_at, expires_at, last_accessed_at, revoked_at, updated_at,
       client:clients!client_portal_access_client_id_fkey(id, full_name),
       job:jobs!client_portal_access_job_id_fkey(id, name)`,
    )
    .eq("org_id", membership.org_id)
    .order("created_at", { ascending: false });

  const rows = (rowsRaw ?? []) as unknown as TokenRow[];

  return (
    <main className="px-6 py-8">
      <div className="max-w-6xl mx-auto">
        <p
          className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--text-tertiary)]"
          style={{ fontFamily: "var(--font-jetbrains-mono)" }}
        >
          ADMIN
        </p>
        <h1
          className="mt-2 text-[28px] tracking-[-0.02em] text-[color:var(--text-primary)]"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          Owner Portal Tokens
        </h1>
        <p className="mt-1 text-[13px] text-[color:var(--text-secondary)]">
          Active owner-portal tokens for this org. Revoke a token to
          immediately end the homeowner&apos;s access — they will see a
          404 on next request.
        </p>

        <div
          className="mt-6 overflow-hidden rounded-[var(--radius-card)] border border-[color:var(--border-default)] bg-[var(--bg-card)]"
        >
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[color:var(--border-default)] bg-[var(--bg-elevated)]">
                <th className="px-4 py-3 text-left font-medium text-[color:var(--text-secondary)]">
                  Token
                </th>
                <th className="px-4 py-3 text-left font-medium text-[color:var(--text-secondary)]">
                  Client
                </th>
                <th className="px-4 py-3 text-left font-medium text-[color:var(--text-secondary)]">
                  Job
                </th>
                <th className="px-4 py-3 text-left font-medium text-[color:var(--text-secondary)]">
                  Invited
                </th>
                <th className="px-4 py-3 text-left font-medium text-[color:var(--text-secondary)]">
                  Expires
                </th>
                <th className="px-4 py-3 text-left font-medium text-[color:var(--text-secondary)]">
                  Last accessed
                </th>
                <th className="px-4 py-3 text-left font-medium text-[color:var(--text-secondary)]">
                  Status
                </th>
                <th className="px-4 py-3 text-right font-medium text-[color:var(--text-secondary)]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-[color:var(--text-tertiary)]"
                  >
                    No owner-portal tokens yet. Invite a homeowner from
                    a job&apos;s owner-portal tab.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const status = tokenStatus(row);
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-[color:var(--border-subtle)] last:border-b-0"
                    >
                      <td
                        className="px-4 py-3 text-[color:var(--text-primary)]"
                        style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: "11px" }}
                      >
                        {row.id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 text-[color:var(--text-primary)]">
                        {row.client?.full_name ?? row.email ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--text-primary)]">
                        {row.job?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--text-secondary)]">
                        {fmtDate(row.created_at)}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--text-secondary)]">
                        {fmtDate(row.expires_at)}
                      </td>
                      <td className="px-4 py-3 text-[color:var(--text-secondary)]">
                        {fmtDate(row.last_accessed_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <RevokeTokenRow
                          tokenId={row.id}
                          expectedUpdatedAt={row.updated_at}
                          status={status.tone}
                          clientName={row.client?.full_name ?? row.email}
                          jobName={row.job?.name ?? "—"}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
