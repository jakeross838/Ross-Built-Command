// src/components/prototypes/DrawActionBar.tsx
//
// SHARED draw lifecycle controls. Extracted from DrawApprovalView so the
// AIA renderer (DrawApprovalView) and the Cost-Plus Statement renderer
// (CostPlusStatementView) drive the SAME draft/submit/approve/send-back/void
// pipeline — the billing_method forks the renderer + totals only, never the
// lifecycle. Posts to /api/draws/[id]/action (+ /refresh-totals). Every
// button either fires a real transition or is disabled with a reason.

"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PrinterIcon,
  CheckBadgeIcon,
  ArrowUturnLeftIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import NwButton from "@/components/nw/Button";

export interface DrawActionBarProps {
  drawId: string;
  status: string;
  /** When true, buttons post to the real endpoints. Prototype gallery = false. */
  interactive?: boolean;
  editHref?: string;
  printHref: string;
  /** Draft-only: show a Refresh action to re-save stored totals from recompute. */
  storedSummaryStale?: boolean;
}

export default function DrawActionBar({
  drawId,
  status,
  interactive = false,
  editHref,
  printHref,
  storedSummaryStale = false,
}: DrawActionBarProps) {
  const router = useRouter();
  const [acting, setActing] = useState<null | string>(null);
  const [actionMsg, setActionMsg] = useState<{
    tone: "success" | "danger";
    text: string;
  } | null>(null);
  const [confirmVoid, setConfirmVoid] = useState(false);

  const isDraft = status === "draft";
  const canApprove = status === "submitted" || status === "pm_review";
  const canSendBack = status === "submitted" || status === "pm_review";
  // Void offered for draft/pm_review/submitted only — approved void is
  // reversal territory (post-snapshot), out of scope.
  const canVoid = ["draft", "pm_review", "submitted"].includes(status);
  const isTerminal = ["locked", "paid", "void"].includes(status);

  const disabledReason =
    status === "draft"
      ? "Submit for approval first"
      : status === "approved"
        ? "Already approved"
        : status === "paid"
          ? "Paid — closed"
          : status === "void"
            ? "Voided"
            : "Not available in this status";

  async function runAction(action: string, label: string) {
    if (!interactive) return;
    setActing(action);
    setActionMsg(null);
    try {
      const res = await fetch(`/api/draws/${drawId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setActionMsg({ tone: "success", text: `${label} — done.` });
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({ error: `${label} failed` }));
        setActionMsg({ tone: "danger", text: data.error ?? `${label} failed` });
      }
    } catch {
      setActionMsg({ tone: "danger", text: `${label} failed — network error` });
    } finally {
      setActing(null);
      setConfirmVoid(false);
    }
  }

  async function refreshTotals() {
    if (!interactive) return;
    setActing("refresh");
    setActionMsg(null);
    try {
      const res = await fetch(`/api/draws/${drawId}/refresh-totals`, { method: "POST" });
      if (res.ok) {
        setActionMsg({ tone: "success", text: "Stored totals refreshed from recompute." });
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({ error: "Refresh failed" }));
        setActionMsg({ tone: "danger", text: data.error ?? "Refresh failed" });
      }
    } catch {
      setActionMsg({ tone: "danger", text: "Refresh failed — network error" });
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <Link
          href={printHref}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-[11px] border uppercase font-medium"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.12em",
            borderColor: "var(--border-default)",
            color: "var(--text-primary)",
            background: "var(--bg-card)",
          }}
        >
          <PrinterIcon className="w-3.5 h-3.5" strokeWidth={1.5} /> Print
        </Link>

        {isDraft && editHref && (
          <Link
            href={editHref}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[11px] border uppercase font-medium"
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              letterSpacing: "0.12em",
              borderColor: "var(--border-default)",
              color: "var(--text-primary)",
              background: "var(--bg-card)",
            }}
          >
            <ArrowPathIcon className="w-3.5 h-3.5" strokeWidth={1.5} /> Edit draft
          </Link>
        )}

        {isDraft && storedSummaryStale && (
          <NwButton
            variant="secondary"
            size="md"
            loading={acting === "refresh"}
            disabled={!interactive || acting !== null}
            onClick={refreshTotals}
            title="Re-save the stored totals from a fresh recompute"
          >
            <ArrowPathIcon className="w-3.5 h-3.5" strokeWidth={1.5} /> Refresh
          </NwButton>
        )}

        {canVoid && (
          <NwButton
            variant="danger"
            size="md"
            loading={acting === "void"}
            disabled={!interactive || acting !== null}
            onClick={() => (confirmVoid ? runAction("void", "Voided") : setConfirmVoid(true))}
          >
            <XCircleIcon className="w-3.5 h-3.5" strokeWidth={1.5} />{" "}
            {confirmVoid ? "Confirm void" : "Void"}
          </NwButton>
        )}

        <NwButton
          variant="secondary"
          size="md"
          loading={acting === "send_back"}
          disabled={!interactive || !canSendBack || acting !== null}
          title={canSendBack ? undefined : disabledReason}
          onClick={() => runAction("send_back", "Sent back")}
        >
          <ArrowUturnLeftIcon className="w-3.5 h-3.5" strokeWidth={1.5} /> Send back
        </NwButton>

        {isDraft ? (
          <NwButton
            variant="primary"
            size="md"
            loading={acting === "submit"}
            disabled={!interactive || acting !== null}
            onClick={() => runAction("submit", "Submitted for approval")}
          >
            <PaperAirplaneIcon className="w-3.5 h-3.5" strokeWidth={1.5} /> Submit for approval
          </NwButton>
        ) : (
          <NwButton
            variant="primary"
            size="md"
            loading={acting === "approve"}
            disabled={!interactive || !canApprove || acting !== null}
            title={canApprove ? undefined : disabledReason}
            onClick={() => runAction("approve", "Approved")}
          >
            <CheckBadgeIcon className="w-3.5 h-3.5" strokeWidth={1.5} /> Approve
          </NwButton>
        )}
      </div>

      {actionMsg && (
        <span
          className="text-[11px]"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.04em",
            color: actionMsg.tone === "success" ? "var(--nw-success)" : "var(--nw-danger)",
          }}
        >
          {actionMsg.text}
        </span>
      )}
      {!interactive && !isTerminal && (
        <span
          className="text-[10px]"
          style={{
            fontFamily: "var(--font-jetbrains-mono)",
            letterSpacing: "0.04em",
            color: "var(--text-tertiary)",
          }}
        >
          Preview — actions disabled
        </span>
      )}
    </div>
  );
}
