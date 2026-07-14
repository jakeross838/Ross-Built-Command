"use client";

// useInvoiceApproval — the PM approval machinery (Quick-Approve + batch
// approve/hold/deny + selection) extracted from the PM Queue
// (src/app/invoices/queue/page.tsx) so BOTH the queue and the folded-in Bills
// list (coherence audit 3.2 "ONE QUEUE") drive the SAME money-gate logic.
//
// Source-agnostic: the hook takes data as PROPS (invoices, workflowSettings,
// lineItemSummary) and NEVER fetches — the caller loads via whatever path is
// correct for it (the list must stay on its server-route load per the standing
// client-auth-strand rule). Eligibility is delegated verbatim to the tested
// pure module `approval-eligibility.ts`. Mutations hit the same endpoints as
// the queue (`POST /api/invoices/[id]/action` + `POST /api/invoices/batch-action`)
// and the caller decides what to do with the mutated ids via `onMutated`
// (the queue REMOVES them from its list; the list updates status in place).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatCents } from "@/lib/utils/format";
import {
  getApprovalBlockers,
  isQuickApproveEligible,
  type ApprovalInvoice,
  type ApprovalWorkflowSettings,
  type ApprovalLineItemSummary,
} from "@/lib/invoices/approval-eligibility";

/** The minimal row shape the machinery reads (superset of ApprovalInvoice with
 * the display fields the toast + confirm modal need). Both QueueInvoice and the
 * Bills list Invoice satisfy this. */
export type ApprovalRow = ApprovalInvoice & {
  total_amount: number;
  vendor_name_raw: string | null;
  jobs?: { name: string } | null;
};

export type BatchAction = "approve" | "hold" | "deny" | "quick_approve";

export interface UseInvoiceApprovalArgs<T extends ApprovalRow> {
  /** The currently-visible actionable rows (the caller's `filtered` set). */
  invoices: T[];
  /** Module-shaped workflow settings; `null` while loading (gates the UI). */
  workflowSettings: ApprovalWorkflowSettings | null;
  /** Per-invoice budget-line / PO coverage keyed by invoice id. */
  lineItemSummary: Map<string, ApprovalLineItemSummary>;
  /** Fires after a successful mutation with the server-confirmed ids so the
   * caller can remove them (queue) or advance their status in place (list). */
  onMutated: (ids: string[], action: BatchAction) => void;
  /** Changes to this string clear the selection — the caller passes a signature
   * of its filter state so "clear selection on filter change" is preserved
   * without the hook knowing about the caller's filters. */
  filterKey: string;
}

export interface UseInvoiceApprovalReturn<T extends ApprovalRow> {
  // selection
  selectedIds: Set<string>;
  selectAllRef: React.RefObject<HTMLInputElement>;
  toggleSelect: (id: string) => void;
  toggleSelectAll: () => void;
  clearSelection: () => void;
  selectedTotalCents: number;
  // eligibility (bound to settings + summary)
  blockersFor: (inv: T) => string[];
  isQuickEligible: (inv: T) => boolean;
  // quick approve
  quickApproveConfirmId: string | null;
  quickApproveProcessingId: string | null;
  animatingOutIds: Set<string>;
  startQuickApprove: (id: string) => void;
  cancelQuickApprove: () => void;
  confirmQuickApprove: (inv: T) => void;
  // batch approve
  showApproveConfirm: boolean;
  approvalEligible: T[];
  approvalExcluded: Array<{ invoice: T; reasons: string[] }>;
  openBatchApprove: () => void;
  closeBatchApprove: () => void;
  confirmBatchApprove: () => void;
  // batch hold
  showHoldModal: boolean;
  holdNote: string;
  openHold: () => void;
  closeHold: () => void;
  setHoldNote: (v: string) => void;
  confirmHold: () => void;
  // batch deny
  showDenyModal: boolean;
  denyNote: string;
  openDeny: () => void;
  closeDeny: () => void;
  setDenyNote: (v: string) => void;
  confirmDeny: () => void;
  // shared
  batchProcessing: boolean;
  toast: { kind: "ok" | "err"; text: string } | null;
}

export function useInvoiceApproval<T extends ApprovalRow>({
  invoices,
  workflowSettings,
  lineItemSummary,
  onMutated,
  filterKey,
}: UseInvoiceApprovalArgs<T>): UseInvoiceApprovalReturn<T> {
  // Keep `onMutated` in a ref so the mutation handlers have stable identity and
  // never fire a stale caller callback (the caller need not memoize it).
  const onMutatedRef = useRef(onMutated);
  onMutatedRef.current = onMutated;

  // ── Selection ──────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const allFilteredIds = invoices.map((inv) => inv.id);
    const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allFilteredIds));
  }, [invoices, selectedIds]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Clear selection when the caller's filters change (byte-equivalent to the
  // queue's clear-on-filter-change effect, keyed by the caller's signature).
  useEffect(() => {
    setSelectedIds(new Set());
  }, [filterKey]);

  // Indeterminate state on the select-all checkbox (byte-equivalent to queue).
  useEffect(() => {
    if (selectAllRef.current) {
      const allSelected = invoices.length > 0 && invoices.every((inv) => selectedIds.has(inv.id));
      const someSelected = invoices.some((inv) => selectedIds.has(inv.id));
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [selectedIds, invoices]);

  const selectedTotalCents = useMemo(() => {
    return invoices
      .filter((inv) => selectedIds.has(inv.id))
      .reduce((sum, inv) => sum + (inv.total_amount ?? 0), 0);
  }, [invoices, selectedIds]);

  // ── Eligibility (delegated to the tested module) ───────────────────────
  const blockersFor = useCallback(
    (inv: T): string[] => getApprovalBlockers(inv, workflowSettings, lineItemSummary.get(inv.id)),
    [workflowSettings, lineItemSummary],
  );
  const isQuickEligible = useCallback(
    (inv: T): boolean => isQuickApproveEligible(inv, workflowSettings, lineItemSummary.get(inv.id)),
    [workflowSettings, lineItemSummary],
  );

  // ── Toast ──────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // ── Quick Approve ──────────────────────────────────────────────────────
  const [quickApproveConfirmId, setQuickApproveConfirmId] = useState<string | null>(null);
  const [quickApproveProcessingId, setQuickApproveProcessingId] = useState<string | null>(null);
  const [animatingOutIds, setAnimatingOutIds] = useState<Set<string>>(new Set());

  const startQuickApprove = useCallback((id: string) => setQuickApproveConfirmId(id), []);
  const cancelQuickApprove = useCallback(() => setQuickApproveConfirmId(null), []);

  const confirmQuickApprove = useCallback(async (inv: T) => {
    setQuickApproveProcessingId(inv.id);
    try {
      const res = await fetch(`/api/invoices/${inv.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", note: "Quick approve" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setToast({ kind: "err", text: err.error ?? "Quick approve failed" });
        setTimeout(() => setToast(null), 4500);
        return;
      }
      // Animate card out, then hand the id to the caller to remove/advance.
      setAnimatingOutIds((prev) => new Set(prev).add(inv.id));
      setQuickApproveConfirmId(null);
      setTimeout(() => {
        onMutatedRef.current([inv.id], "quick_approve");
        // Selection hygiene (3.2 re-gauntlet NEW-1): if this row was also
        // checkbox-selected for a batch, drop it from the selection so the
        // floating bar's count can't include a row that has already departed
        // (count vs total mismatch), and a later hold/deny can't ship a stale
        // id the server would only reject as "not reviewable".
        setSelectedIds((prev) => {
          if (!prev.has(inv.id)) return prev;
          const next = new Set(prev);
          next.delete(inv.id);
          return next;
        });
        setAnimatingOutIds((prev) => {
          const next = new Set(prev);
          next.delete(inv.id);
          return next;
        });
      }, 300);
      setToast({
        kind: "ok",
        text: `Approved ${inv.vendor_name_raw ?? "invoice"} · ${formatCents(inv.total_amount)}`,
      });
      setTimeout(() => setToast(null), 3500);
    } finally {
      setQuickApproveProcessingId(null);
    }
  }, []);

  // ── Batch approve ──────────────────────────────────────────────────────
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [approvalEligible, setApprovalEligible] = useState<T[]>([]);
  const [approvalExcluded, setApprovalExcluded] = useState<Array<{ invoice: T; reasons: string[] }>>([]);

  const openBatchApprove = useCallback(() => {
    const selected = invoices.filter((inv) => selectedIds.has(inv.id));
    const eligible: T[] = [];
    const excluded: Array<{ invoice: T; reasons: string[] }> = [];
    for (const inv of selected) {
      const reasons = blockersFor(inv);
      if (reasons.length === 0) eligible.push(inv);
      else excluded.push({ invoice: inv, reasons });
    }
    setApprovalEligible(eligible);
    setApprovalExcluded(excluded);
    setShowApproveConfirm(true);
  }, [invoices, selectedIds, blockersFor]);

  const closeBatchApprove = useCallback(() => setShowApproveConfirm(false), []);

  const confirmBatchApprove = useCallback(async () => {
    if (approvalEligible.length === 0) {
      setShowApproveConfirm(false);
      return;
    }
    setBatchProcessing(true);
    try {
      const res = await fetch("/api/invoices/batch-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          invoice_ids: approvalEligible.map((i) => i.id),
        }),
      });
      if (res.ok) {
        const result = await res.json();
        onMutatedRef.current(result.success as string[], "approve");
        setSelectedIds(new Set());
        setToast({
          kind: "ok",
          text: `Approved ${result.success.length} invoice${result.success.length !== 1 ? "s" : ""}`,
        });
        setTimeout(() => setToast(null), 3500);
      } else {
        const err = await res.json().catch(() => ({}));
        setToast({ kind: "err", text: err.error ?? "Batch approve failed" });
        setTimeout(() => setToast(null), 4500);
      }
    } finally {
      setBatchProcessing(false);
      setShowApproveConfirm(false);
    }
  }, [approvalEligible]);

  // ── Batch hold ─────────────────────────────────────────────────────────
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdNote, setHoldNote] = useState("");
  const openHold = useCallback(() => {
    setHoldNote("");
    setShowHoldModal(true);
  }, []);
  const closeHold = useCallback(() => setShowHoldModal(false), []);

  const confirmHold = useCallback(async () => {
    if (!holdNote.trim()) return;
    setBatchProcessing(true);
    setShowHoldModal(false);
    try {
      const res = await fetch("/api/invoices/batch-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hold", invoice_ids: Array.from(selectedIds), note: holdNote.trim() }),
      });
      if (res.ok) {
        const result = await res.json();
        onMutatedRef.current(result.success as string[], "hold");
        setSelectedIds(new Set());
        setHoldNote("");
        setToast({
          kind: "ok",
          text: `Held ${result.success.length} invoice${result.success.length !== 1 ? "s" : ""}`,
        });
        setTimeout(() => setToast(null), 3500);
      }
    } finally {
      setBatchProcessing(false);
    }
  }, [selectedIds, holdNote]);

  // ── Batch deny ─────────────────────────────────────────────────────────
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [denyNote, setDenyNote] = useState("");
  const openDeny = useCallback(() => {
    setDenyNote("");
    setShowDenyModal(true);
  }, []);
  const closeDeny = useCallback(() => setShowDenyModal(false), []);

  const confirmDeny = useCallback(async () => {
    if (!denyNote.trim()) return;
    setBatchProcessing(true);
    setShowDenyModal(false);
    try {
      const res = await fetch("/api/invoices/batch-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deny", invoice_ids: Array.from(selectedIds), note: denyNote.trim() }),
      });
      if (res.ok) {
        const result = await res.json();
        onMutatedRef.current(result.success as string[], "deny");
        setSelectedIds(new Set());
        setDenyNote("");
        setToast({
          kind: "ok",
          text: `Denied ${result.success.length} invoice${result.success.length !== 1 ? "s" : ""}`,
        });
        setTimeout(() => setToast(null), 3500);
      }
    } finally {
      setBatchProcessing(false);
    }
  }, [selectedIds, denyNote]);

  return {
    selectedIds,
    selectAllRef,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    selectedTotalCents,
    blockersFor,
    isQuickEligible,
    quickApproveConfirmId,
    quickApproveProcessingId,
    animatingOutIds,
    startQuickApprove,
    cancelQuickApprove,
    confirmQuickApprove,
    showApproveConfirm,
    approvalEligible,
    approvalExcluded,
    openBatchApprove,
    closeBatchApprove,
    confirmBatchApprove,
    showHoldModal,
    holdNote,
    openHold,
    closeHold,
    setHoldNote,
    confirmHold,
    showDenyModal,
    denyNote,
    openDeny,
    closeDeny,
    setDenyNote,
    confirmDeny,
    batchProcessing,
    toast,
  };
}
