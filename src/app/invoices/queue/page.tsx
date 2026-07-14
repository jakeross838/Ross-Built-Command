"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase/client";
import { daysAgo, formatDate } from "@/lib/utils/format";
import FinancialViewTabs from "@/components/financial-view-tabs";
import EmptyState, { EmptyIcons } from "@/components/empty-state";
import { SkeletonList } from "@/components/loading-skeleton";
import NwBadge, { type BadgeVariant } from "@/components/nw/Badge";
import NwMoney from "@/components/nw/Money";
import { rowClickIntent } from "@/lib/utils/row-nav";
// 3.2 ONE QUEUE — the PM approval machinery (Quick-Approve + batch
// approve/hold/deny + selection) now lives in one shared hook + component set,
// consumed identically here and on the folded-in Bills list.
import { useInvoiceApproval } from "@/components/invoices/useInvoiceApproval";
import QuickApproveControl from "@/components/invoices/QuickApproveControl";
import BatchActionBar from "@/components/invoices/BatchActionBar";
import BatchNoteModal from "@/components/invoices/BatchNoteModal";
import BatchApproveConfirmModal from "@/components/invoices/BatchApproveConfirmModal";
import ApprovalToast from "@/components/invoices/ApprovalToast";

function confidenceVariant(score: number): BadgeVariant {
 if (score >= 0.85) return "success";
 if (score >= 0.7) return "warning";
 return "danger";
}

function agingBadgeInfo(days: number): { variant: BadgeVariant; label: string } | null {
 if (days >= 90) return { variant: "danger", label: "90d+" };
 if (days >= 61) return { variant: "danger", label: "60d+" };
 if (days >= 30) return { variant: "warning", label: "30d+" };
 return null;
}

interface QueueInvoice {
 id: string;
 vendor_name_raw: string | null;
 vendor_id: string | null;
 invoice_number: string | null;
 invoice_date: string | null;
 total_amount: number;
 confidence_score: number;
 received_date: string;
 status: string;
 job_id: string | null;
 cost_code_id: string | null;
 document_category: string | null;
 document_type: string | null;
 po_id: string | null;
 is_potential_duplicate: boolean;
 duplicate_dismissed_at: string | null;
 jobs: { name: string } | null;
 assigned_pm: { id: string; full_name: string } | null;
}

/**
 * Per-card pill set flagging missing required fields. Any of these means the
 * invoice is stuck in PM Queue until a human fills in the blank, so we surface
 * them loudly on the card.
 */
function MissingDataBadges({ inv }: { inv: QueueInvoice }) {
 const unknownVendor =
 !inv.vendor_id ||
 (inv.vendor_name_raw ?? "").trim().toLowerCase() === "unknown" ||
 !inv.vendor_name_raw?.trim();
 const missingNumber = !inv.invoice_number?.trim();
 const missingDate = !inv.invoice_date;
 if (!unknownVendor && !missingNumber && !missingDate) return null;
 return (
 <div className="mt-2 flex flex-wrap gap-1.5">
 {missingNumber && <NwBadge variant="warning" size="sm">No Invoice #</NwBadge>}
 {missingDate && <NwBadge variant="danger" size="sm">No Date</NwBadge>}
 {unknownVendor && <NwBadge variant="danger" size="sm">Unknown Vendor</NwBadge>}
 </div>
 );
}

function hasMissingData(inv: QueueInvoice): boolean {
 const unknownVendor =
 !inv.vendor_id ||
 (inv.vendor_name_raw ?? "").trim().toLowerCase() === "unknown" ||
 !inv.vendor_name_raw?.trim();
 return unknownVendor || !inv.invoice_number?.trim() || !inv.invoice_date;
}

interface PmUser {
 id: string;
 full_name: string;
}

interface WorkflowSettingsClient {
 batch_approval_enabled: boolean;
 quick_approve_enabled: boolean;
 quick_approve_min_confidence: number;
 require_invoice_date: boolean;
 require_budget_allocation: boolean;
 require_po_linkage: boolean;
 duplicate_detection_enabled: boolean;
 over_budget_requires_note: boolean;
}

type SortKey = "vendor" | "date" | "amount" | "confidence" | "waiting" | "pm";
type SortDir = "asc" | "desc";
type ConfidenceFilter = "all" | "high" | "medium" | "low";
type StatusFilter = "pending" | "held" | "denied" | "kicked_back" | "info_requested" | "needs_attention" | "all";
type AmountRange = "all" | "0-5k" | "5k-25k" | "25k-100k" | "100k+";

function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
 if (!active) return <span className="ml-1 text-[color:var(--text-secondary)]">&#8597;</span>;
 return <span className="ml-1 text-[color:var(--nw-stone-blue)]">{dir === "asc" ? "\u2191" : "\u2193"}</span>;
}

function OverheadBadge() {
 return <NwBadge variant="warning" size="sm">Overhead</NwBadge>;
}

export default function QueuePage() {
 const [invoices, setInvoices] = useState<QueueInvoice[]>([]);
 const [pmUsers, setPmUsers] = useState<PmUser[]>([]);
 const [loading, setLoading] = useState(true);

 // Current user (from Supabase auth) — drives PM-only self-filter
 const [currentUserId, setCurrentUserId] = useState<string | null>(null);
 const [currentRole, setCurrentRole] = useState<"admin" | "pm" | "accounting" | null>(null);
 const [myJobIds, setMyJobIds] = useState<Set<string>>(new Set());

 // Primary filters (always visible)
 const [search, setSearch] = useState("");
 const [jobFilter, setJobFilter] = useState("");
 const [pmFilter, setPmFilter] = useState("");
 const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>("all");

 // Advanced filters (collapsible)
 const [showMoreFilters, setShowMoreFilters] = useState(false);
 const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
 const [amountRange, setAmountRange] = useState<AmountRange>("all");
 const [dateStart, setDateStart] = useState("");
 const [dateEnd, setDateEnd] = useState("");

 // Sort
 const [sortKey, setSortKey] = useState<SortKey>("waiting");
 const [sortDir, setSortDir] = useState<SortDir>("desc");

 // Approval selection / batch / quick-approve / toast state now lives in the
 // shared useInvoiceApproval hook (mounted below, after `filtered`).

 // Workflow settings (null while loading — UI gates off this)
 const [workflowSettings, setWorkflowSettings] = useState<WorkflowSettingsClient | null>(null);

 // Line items allocation map (id -> { hasAllBudgetLines, hasAllPOs, lineCount })
 const [lineItemSummary, setLineItemSummary] = useState<
 Map<string, { hasAllBudgetLines: boolean; hasAllPOs: boolean; lineCount: number }>
 >(new Map());

 useEffect(() => {
 async function fetchData() {
 const {
 data: { user },
 } = await supabase.auth.getUser();

 let role: "admin" | "pm" | "accounting" | null = null;
 let orgId: string | null = null;
 if (user) {
 setCurrentUserId(user.id);
 const { data: membership } = await supabase
 .from("org_members")
 .select("role, org_id")
 .eq("user_id", user.id)
 .eq("is_active", true)
 .order("created_at", { ascending: true })
 .limit(1)
 .maybeSingle();
 role = (membership?.role as typeof role) ?? null;
 setCurrentRole(role);
 orgId = (membership?.org_id as string | undefined) ?? null;
 if (!orgId) {
 console.error("[invoices/queue] Membership has no org_id; PM dropdown will be empty", {
 user_id: user.id,
 membership,
 });
 }

 // For PMs, pre-load the set of jobs they own so we can include
 // any invoice on those jobs (not just ones explicitly assigned).
 if (role === "pm") {
 const { data: myJobs } = await supabase
 .from("jobs")
 .select("id")
 .eq("pm_id", user.id)
 .is("deleted_at", null);
 if (myJobs) setMyJobIds(new Set(myJobs.map((j) => j.id as string)));
 }
 }

 if (!orgId) {
 // No org (unauthenticated / membership missing) — never render cross-org
 // rows. Empty out + stop (Stage 2.1 cross-org sweep: platform_admins bypass
 // RLS, so this client-side queue MUST filter by org_id explicitly).
 setInvoices([]);
 setPmUsers([]);
 setLoading(false);
 return;
 }
 const oid = orgId;

 const [invoiceResult, pmResult, settingsResult] = await Promise.all([
 supabase
 .from("invoices")
 .select(
 "id, vendor_name_raw, vendor_id, invoice_number, invoice_date, total_amount, confidence_score, received_date, status, job_id, cost_code_id, document_category, document_type, po_id, is_potential_duplicate, duplicate_dismissed_at, jobs:job_id (name), assigned_pm:assigned_pm_id (id, full_name)"
 )
 .eq("org_id", oid)
 .in("status", ["pm_review", "ai_processed", "pm_held", "pm_denied", "info_requested"])
 .is("deleted_at", null)
 .order("received_date", { ascending: true }),
 // PM dropdown sourced from org_members + profiles. Plan D-1 (Wave-D
 // Issue 1 fix): hint syntax updated to `profile:profiles (...)` resolving
 // via the FK org_members_user_id_profiles_fkey created in 00098.
 orgId
 ? supabase
 .from("org_members")
 .select("user_id, profile:profiles (id, full_name)")
 .eq("org_id", orgId)
 .eq("is_active", true)
 .in("role", ["pm", "admin"])
 : Promise.resolve({ data: null, error: null }),
 fetch("/api/workflow-settings").then((r) => (r.ok ? r.json() : null)).catch(() => null),
 ]);

 if (!invoiceResult.error && invoiceResult.data) {
 const rows = invoiceResult.data as unknown as QueueInvoice[];
 setInvoices(rows);
 // Load line item allocation summary for batch workflow checks.
 const ids = rows.map((r) => r.id);
 if (ids.length > 0) {
 const { data: lines } = await supabase
 .from("invoice_line_items")
 .select("invoice_id, budget_line_id, po_id")
 .in("invoice_id", ids)
 .is("deleted_at", null);
 const map = new Map<string, { hasAllBudgetLines: boolean; hasAllPOs: boolean; lineCount: number }>();
 for (const r of rows) {
 const myLines = (lines ?? []).filter((l) => l.invoice_id === r.id);
 map.set(r.id, {
 hasAllBudgetLines: myLines.length > 0 && myLines.every((l) => !!l.budget_line_id),
 hasAllPOs: myLines.length > 0 && myLines.every((l) => !!l.po_id),
 lineCount: myLines.length,
 });
 }
 setLineItemSummary(map);
 }
 }
 if (!pmResult.error && pmResult.data) {
 const pms = (pmResult.data as Array<{ user_id: string; profile: { id: string; full_name: string } | { id: string; full_name: string }[] | null }>)
 .map((m) => {
 const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
 return profile && profile.id && profile.full_name
 ? { id: profile.id, full_name: profile.full_name }
 : null;
 })
 .filter((p): p is PmUser => p !== null)
 .sort((a, b) => a.full_name.localeCompare(b.full_name));
 setPmUsers(pms);
 }
 if (settingsResult?.settings) {
 setWorkflowSettings({
 batch_approval_enabled: settingsResult.settings.batch_approval_enabled,
 quick_approve_enabled: settingsResult.settings.quick_approve_enabled,
 quick_approve_min_confidence: settingsResult.settings.quick_approve_min_confidence,
 require_invoice_date: settingsResult.settings.require_invoice_date,
 require_budget_allocation: settingsResult.settings.require_budget_allocation,
 require_po_linkage: settingsResult.settings.require_po_linkage,
 duplicate_detection_enabled: settingsResult.settings.duplicate_detection_enabled,
 over_budget_requires_note: settingsResult.settings.over_budget_requires_note,
 });
 } else {
 // Fallback defaults if settings couldn't load.
 setWorkflowSettings({
 batch_approval_enabled: true,
 quick_approve_enabled: true,
 quick_approve_min_confidence: 95,
 require_invoice_date: true,
 require_budget_allocation: false,
 require_po_linkage: false,
 duplicate_detection_enabled: true,
 over_budget_requires_note: true,
 });
 }
 setLoading(false);
 }
 fetchData();
 }, []);

 const batchEnabled = workflowSettings?.batch_approval_enabled ?? false;
 const quickApproveEnabled = workflowSettings?.quick_approve_enabled ?? false;
 // Eligibility (getApprovalBlockers / isQuickApproveEligible) + the quick /
 // batch mutation handlers now live in the shared useInvoiceApproval hook,
 // delegating to the tested approval-eligibility module.

 // Unique job names for dropdown
 const jobNames = useMemo(() => {
 const names = new Set<string>();
 invoices.forEach((inv) => {
 if (inv.jobs?.name) names.add(inv.jobs.name);
 });
 return Array.from(names).sort();
 }, [invoices]);

 // Count active advanced filters for badge
 const advancedFilterCount = useMemo(() => {
 let count = 0;
 if (statusFilter !== "pending") count++;
 if (amountRange !== "all") count++;
 if (dateStart || dateEnd) count++;
 return count;
 }, [statusFilter, amountRange, dateStart, dateEnd]);

 // Filter + sort
 const filtered = useMemo(() => {
 let result = invoices;

 // PM self-filter: a PM only ever sees invoices on their own jobs
 // (either explicitly assigned to them OR on a job where they are pm_id).
 if (currentRole === "pm" && currentUserId) {
 result = result.filter(
 (inv) =>
 inv.assigned_pm?.id === currentUserId ||
 (inv.job_id != null && myJobIds.has(inv.job_id))
 );
 }

 // Text search
 if (search.trim()) {
 const q = search.toLowerCase();
 result = result.filter(
 (inv) =>
 (inv.vendor_name_raw ?? "").toLowerCase().includes(q) ||
 (inv.invoice_number ?? "").toLowerCase().includes(q)
 );
 }

 // Job filter
 if (jobFilter) {
 result = result.filter((inv) => inv.jobs?.name === jobFilter);
 }

 // PM filter
 if (pmFilter) {
 if (pmFilter === "__unassigned__") {
 result = result.filter((inv) => !inv.assigned_pm);
 } else {
 result = result.filter((inv) => inv.assigned_pm?.id === pmFilter);
 }
 }

 // Confidence filter
 if (confidenceFilter !== "all") {
 result = result.filter((inv) => {
 const s = inv.confidence_score;
 if (confidenceFilter === "high") return s >= 0.85;
 if (confidenceFilter === "medium") return s >= 0.7 && s < 0.85;
 return s < 0.7; // low
 });
 }

 // Status filter
 if (statusFilter !== "all") {
 if (statusFilter === "pending") {
 result = result.filter(
 (inv) => inv.status === "pm_review" || inv.status === "ai_processed"
 );
 } else if (statusFilter === "held") {
 result = result.filter((inv) => inv.status === "pm_held");
 } else if (statusFilter === "denied") {
 result = result.filter((inv) => inv.status === "pm_denied");
 } else if (statusFilter === "kicked_back") {
 // Kicked-back items return to pm_review status
 result = result.filter((inv) => inv.status === "pm_review");
 } else if (statusFilter === "info_requested") {
 result = result.filter((inv) => inv.status === "info_requested");
 } else if (statusFilter === "needs_attention") {
 result = result.filter(hasMissingData);
 }
 }

 // Amount range filter
 if (amountRange !== "all") {
 result = result.filter((inv) => {
 const amt = inv.total_amount;
 switch (amountRange) {
 case "0-5k":
 return amt >= 0 && amt < 500000;
 case "5k-25k":
 return amt >= 500000 && amt < 2500000;
 case "25k-100k":
 return amt >= 2500000 && amt < 10000000;
 case "100k+":
 return amt >= 10000000;
 default:
 return true;
 }
 });
 }

 // Date range filter (received_date)
 if (dateStart) {
 result = result.filter((inv) => inv.received_date >= dateStart);
 }
 if (dateEnd) {
 result = result.filter((inv) => inv.received_date <= dateEnd);
 }

 // Sort
 result = [...result].sort((a, b) => {
 let cmp = 0;
 switch (sortKey) {
 case "vendor":
 cmp = (a.vendor_name_raw ?? "").localeCompare(
 b.vendor_name_raw ?? ""
 );
 break;
 case "date":
 cmp = (a.invoice_date ?? "").localeCompare(b.invoice_date ?? "");
 break;
 case "amount":
 cmp = a.total_amount - b.total_amount;
 break;
 case "confidence":
 cmp = a.confidence_score - b.confidence_score;
 break;
 case "waiting":
 cmp = daysAgo(a.received_date) - daysAgo(b.received_date);
 break;
 case "pm":
 cmp = (a.assigned_pm?.full_name ?? "").localeCompare(
 b.assigned_pm?.full_name ?? ""
 );
 break;
 }
 return sortDir === "asc" ? cmp : -cmp;
 });

 return result;
 }, [
 invoices,
 currentRole,
 currentUserId,
 myJobIds,
 search,
 jobFilter,
 pmFilter,
 confidenceFilter,
 statusFilter,
 amountRange,
 dateStart,
 dateEnd,
 sortKey,
 sortDir,
 ]);

 const toggleSort = (key: SortKey) => {
 if (sortKey === key) {
 setSortDir((d) => (d === "asc" ? "desc" : "asc"));
 } else {
 setSortKey(key);
 setSortDir(key === "vendor" || key === "pm" ? "asc" : "desc");
 }
 };

 const isFiltered =
 search.trim() !== "" ||
 jobFilter !== "" ||
 pmFilter !== "" ||
 confidenceFilter !== "all" ||
 statusFilter !== "pending" ||
 amountRange !== "all" ||
 dateStart !== "" ||
 dateEnd !== "";

 const clearAllFilters = () => {
 setSearch("");
 setJobFilter("");
 setPmFilter("");
 setConfidenceFilter("all");
 setStatusFilter("pending");
 setAmountRange("all");
 setDateStart("");
 setDateEnd("");
 };

 // Selection / batch / quick-approve / toast machinery — the shared hook,
 // mounted after `filtered` so it acts on the visible set. `onMutated` REMOVES
 // the mutated rows from this queue's list (byte-equivalent to the
 // pre-extraction optimistic filter). `filterKey` reproduces the old
 // clear-selection-on-filter-change effect deps.
 const filterKey = `${search}|${jobFilter}|${pmFilter}|${confidenceFilter}|${statusFilter}|${amountRange}|${dateStart}|${dateEnd}`;
 const {
  selectedIds,
  selectAllRef,
  toggleSelect,
  toggleSelectAll,
  clearSelection,
  selectedTotalCents,
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
 } = useInvoiceApproval<QueueInvoice>({
  invoices: filtered,
  workflowSettings,
  lineItemSummary,
  filterKey,
  onMutated: (ids) => setInvoices((prev) => prev.filter((inv) => !ids.includes(inv.id))),
 });

 return (
 <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">
 <FinancialViewTabs active="queue" />
 <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
 <div>
 <span
 className="block mb-2 text-[10px] uppercase"
 style={{
 fontFamily: "var(--font-jetbrains-mono)",
 letterSpacing: "0.14em",
 color: "var(--text-tertiary)",
 }}
 >
 Financials · PM Queue
 </span>
 <h2
 className="m-0"
 style={{
 fontFamily: "var(--font-space-grotesk)",
 fontWeight: 500,
 fontSize: "30px",
 letterSpacing: "-0.02em",
 color: "var(--text-primary)",
 }}
 >
 PM Queue
 </h2>
 <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
 {isFiltered
 ? `Showing ${filtered.length} of ${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`
 : `${filtered.length} invoice${filtered.length !== 1 ? "s" : ""} pending PM review`}
 </p>
 </div>
 </div>

 {loading ? (
 <SkeletonList rows={5} columns={["w-40", "w-32", "w-24", "w-24", "w-20"]} />
 ) : invoices.length === 0 ? (
 <EmptyState
 icon={<EmptyIcons.Check />}
 variant="success"
 title="You're all caught up!"
 message="No invoices waiting for PM review. Newly uploaded invoices will appear here."
 primaryAction={{ label: "Upload Invoices", href: "/invoices?action=upload" }}
 />
 ) : (
 <>
 {/* Primary filter row */}
 <div className="flex flex-col md:flex-row gap-3 mb-3">
 {/* Search */}
 <div className="relative flex-1">
 <svg
 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--text-secondary)]"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 strokeWidth={2}
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
 />
 </svg>
 <input
 type="text"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 placeholder="Search vendor or invoice #..."
 className="w-full pl-9 pr-3 py-2.5 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-secondary)] focus:border-[var(--nw-stone-blue)] focus:outline-none"
 />
 {search && (
 <button
 onClick={() => setSearch("")}
 className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
 >
 <svg
 className="w-4 h-4"
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 strokeWidth={2}
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 d="M6 18L18 6M6 6l12 12"
 />
 </svg>
 </button>
 )}
 </div>

 {/* Job dropdown */}
 <select
 value={jobFilter}
 onChange={(e) => setJobFilter(e.target.value)}
 className="px-3 py-2.5 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[color:var(--text-primary)] focus:border-[var(--nw-stone-blue)] focus:outline-none md:w-48"
 >
 <option value="">All Jobs</option>
 {jobNames.map((name) => (
 <option key={name} value={name}>
 {name}
 </option>
 ))}
 </select>

 {/* PM dropdown */}
 <select
 value={pmFilter}
 onChange={(e) => setPmFilter(e.target.value)}
 className="px-3 py-2.5 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[color:var(--text-primary)] focus:border-[var(--nw-stone-blue)] focus:outline-none md:w-48"
 >
 <option value="">All PMs</option>
 <option value="__unassigned__">Unassigned</option>
 {pmUsers.map((pm) => (
 <option key={pm.id} value={pm.id}>
 {pm.full_name}
 </option>
 ))}
 </select>

 {/* Confidence filter */}
 <select
 value={confidenceFilter}
 onChange={(e) =>
 setConfidenceFilter(e.target.value as ConfidenceFilter)
 }
 className="px-3 py-2.5 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[color:var(--text-primary)] focus:border-[var(--nw-stone-blue)] focus:outline-none md:w-40"
 >
 <option value="all">All Confidence</option>
 <option value="high">High (&ge;85%)</option>
 <option value="medium">Medium (70-84%)</option>
 <option value="low">Low (&lt;70%)</option>
 </select>
 </div>

 {/* More Filters toggle + advanced filters */}
 <div className="mb-5">
 <div className="flex items-center gap-3">
 <button
 onClick={() => setShowMoreFilters((v) => !v)}
 className="flex items-center gap-1.5 px-3 py-2 text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-colors"
 >
 <svg
 className={`w-4 h-4 transition-transform ${showMoreFilters ? "rotate-180" : ""}`}
 fill="none"
 viewBox="0 0 24 24"
 stroke="currentColor"
 strokeWidth={2}
 >
 <path
 strokeLinecap="round"
 strokeLinejoin="round"
 d="M19 9l-7 7-7-7"
 />
 </svg>
 More Filters
 {!showMoreFilters && advancedFilterCount > 0 && (
 <span className="ml-1 inline-flex items-center justify-center w-5 h-5 bg-[rgba(91,134,153,0.24)] text-[color:var(--nw-stone-blue)] text-xs font-semibold">
 {advancedFilterCount}
 </span>
 )}
 </button>

 {/* Clear filters */}
 {isFiltered && (
 <button
 onClick={clearAllFilters}
 className="px-3 py-2 text-sm text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-colors whitespace-nowrap"
 >
 Clear filters
 </button>
 )}
 </div>

 {showMoreFilters && (
 <div className="flex flex-col md:flex-row gap-3 mt-3 pl-0 md:pl-0">
 {/* Status filter */}
 <select
 value={statusFilter}
 onChange={(e) =>
 setStatusFilter(e.target.value as StatusFilter)
 }
 className="px-3 py-2.5 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[color:var(--text-primary)] focus:border-[var(--nw-stone-blue)] focus:outline-none md:w-44"
 >
 <option value="pending">Pending Review</option>
 <option value="needs_attention">Needs Attention</option>
 <option value="held">Held</option>
 <option value="denied">Denied</option>
 <option value="kicked_back">Kicked Back</option>
 <option value="info_requested">Info Requested</option>
 <option value="all">All Statuses</option>
 </select>

 {/* Amount range */}
 <select
 value={amountRange}
 onChange={(e) =>
 setAmountRange(e.target.value as AmountRange)
 }
 className="px-3 py-2.5 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[color:var(--text-primary)] focus:border-[var(--nw-stone-blue)] focus:outline-none md:w-40"
 >
 <option value="all">All Amounts</option>
 <option value="0-5k">$0 - $5K</option>
 <option value="5k-25k">$5K - $25K</option>
 <option value="25k-100k">$25K - $100K</option>
 <option value="100k+">$100K+</option>
 </select>

 {/* Date range start */}
 <div className="flex items-center gap-2">
 <label className="text-xs text-[color:var(--text-secondary)] whitespace-nowrap">
 From
 </label>
 <input
 type="date"
 value={dateStart}
 onChange={(e) => setDateStart(e.target.value)}
 className="px-3 py-2.5 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[color:var(--text-primary)] focus:border-[var(--nw-stone-blue)] focus:outline-none"
 />
 </div>

 {/* Date range end */}
 <div className="flex items-center gap-2">
 <label className="text-xs text-[color:var(--text-secondary)] whitespace-nowrap">
 To
 </label>
 <input
 type="date"
 value={dateEnd}
 onChange={(e) => setDateEnd(e.target.value)}
 className="px-3 py-2.5 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[color:var(--text-primary)] focus:border-[var(--nw-stone-blue)] focus:outline-none"
 />
 </div>
 </div>
 )}
 </div>

 {/* No results after filtering */}
 {filtered.length === 0 && (
 <div className="text-center py-16 animate-fade-up">
 <p className="text-[color:var(--text-muted)] text-sm">
 No invoices match your filters
 </p>
 <button
 onClick={clearAllFilters}
 className="mt-2 text-sm text-[color:var(--nw-stone-blue)] hover:text-[color:var(--nw-gulf-blue)] transition-colors"
 >
 Clear all filters
 </button>
 </div>
 )}

 {filtered.length > 0 && (
 <>
 {/* Mobile card layout */}
 <div className={`flex flex-col gap-3 md:hidden ${selectedIds.size > 0 ? "pb-20" : ""}`}>
 {filtered.map((inv, i) => (
 <div
 key={inv.id}
 className={`bg-[var(--bg-card)] border p-4 cursor-pointer active:opacity-80 transition-all duration-300 animate-fade-up ${selectedIds.has(inv.id) ? "border-[rgba(91,134,153,0.5)] bg-[rgba(91,134,153,0.08)]" : "border-[var(--border-default)]"} ${animatingOutIds.has(inv.id) ? "opacity-0 scale-95" : ""}`}
 style={{ animationDelay: `${0.05 + i * 0.03}s` }}
 onClick={(e) => {
 if (rowClickIntent(e, `/invoices/${inv.id}`) === "nav")
 window.location.href = `/invoices/${inv.id}`;
 }}
 >
 <div className="flex items-start justify-between">
 <span className="text-[color:var(--text-primary)] font-medium text-base inline-flex items-center gap-2">
 {inv.vendor_name_raw ?? "Unknown"}
 {inv.document_type === "receipt" && (
 <NwBadge variant="info" size="sm">Receipt</NwBadge>
 )}
 </span>
 <div className="flex items-center gap-2">
 <NwMoney cents={inv.total_amount} size="lg" />

 {batchEnabled && (
 <label
 onClick={(e) => e.stopPropagation()}
 className="flex items-center justify-center w-11 h-11 -mr-2 -my-2 cursor-pointer"
 aria-label="Select invoice for batch action"
 >
 <input
 type="checkbox"
 checked={selectedIds.has(inv.id)}
 onChange={() => toggleSelect(inv.id)}
 className="w-5 h-5 accent-[var(--nw-stone-blue)] cursor-pointer"
 />
 </label>
 )}
 </div>
 </div>
 <div className="flex items-center justify-between mt-2">
 <div>
 {inv.jobs?.name ? (
 <NwBadge variant="info" size="sm">{inv.jobs.name}</NwBadge>
 ) : inv.document_category === "overhead" ? (
 <OverheadBadge />
 ) : (
 <span className="text-[color:var(--text-secondary)] text-xs">
 Unmatched
 </span>
 )}
 </div>
 <div className="flex items-center gap-2">
 <NwBadge variant={confidenceVariant(inv.confidence_score)} size="sm">
 {Math.round(inv.confidence_score * 100)}%
 </NwBadge>
 {(() => {
 const d = daysAgo(inv.received_date);
 const aging = agingBadgeInfo(d);
 return (
 <>
 <span className={`text-sm font-medium ${d > 5 ? "text-[color:var(--nw-danger)]" : d > 2 ? "text-[color:var(--nw-warn)]" : "text-[color:var(--text-secondary)]"}`}>
 {d}d
 </span>
 {aging && <NwBadge variant={aging.variant} size="sm">{aging.label}</NwBadge>}
 </>
 );
 })()}
 </div>
 </div>
 {/* PM name + invoice details */}
 <div className="flex items-center gap-2 mt-2 text-xs text-[color:var(--text-muted)]">
 <span className={inv.assigned_pm ? "text-[color:var(--text-muted)]" : "text-[color:var(--text-secondary)]"}>
 {inv.assigned_pm?.full_name ?? "Unassigned"}
 </span>
 {(inv.invoice_number || inv.invoice_date) && (
 <>
 <span>&middot;</span>
 {inv.invoice_number && (
 <span className="font-mono">
 #{inv.invoice_number}
 </span>
 )}
 {inv.invoice_number && inv.invoice_date && (
 <span>&middot;</span>
 )}
 {inv.invoice_date && <span>{formatDate(inv.invoice_date)}</span>}
 </>
 )}
 </div>
 <MissingDataBadges inv={inv} />
 {inv.status === "pm_held" && (
 <div className="mt-2"><NwBadge variant="warning" size="sm">Held</NwBadge></div>
 )}
 {inv.status === "pm_denied" && (
 <div className="mt-2"><NwBadge variant="danger" size="sm">Denied</NwBadge></div>
 )}
 {inv.status === "info_requested" && (
 <div className="mt-2"><NwBadge variant="warning" size="sm">Info Requested</NwBadge></div>
 )}
 {inv.is_potential_duplicate && !inv.duplicate_dismissed_at && (
 <div className="mt-2"><NwBadge variant="warning" size="sm">Duplicate?</NwBadge></div>
 )}
 {/* Quick Approve — mobile card */}
 {isQuickEligible(inv) && (
 <QuickApproveControl
  inv={inv}
  variant="card"
  confirming={quickApproveConfirmId === inv.id}
  processing={quickApproveProcessingId === inv.id}
  onStartConfirm={() => startQuickApprove(inv.id)}
  onCancel={cancelQuickApprove}
  onConfirm={() => confirmQuickApprove(inv)}
 />
 )}
 </div>
 ))}
 </div>

 {/* Desktop table layout */}
 <div className={`hidden md:block overflow-x-auto border border-[var(--border-default)] animate-fade-up ${selectedIds.size > 0 ? "mb-20" : ""}`}>
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-[var(--bg-subtle)] text-left">
 {batchEnabled && (
 <th className="py-3 px-3 w-10">
 <input
 ref={selectAllRef}
 type="checkbox"
 checked={filtered.length > 0 && filtered.every((inv) => selectedIds.has(inv.id))}
 onChange={toggleSelectAll}
 className="w-4 h-4 accent-[var(--nw-stone-blue)] cursor-pointer"
 aria-label="Select all invoices"
 />
 </th>
 )}
 <th
 className="py-3 px-5 text-[10px] uppercase font-mono font-medium tracking-[0.14em] text-[color:var(--text-secondary)] cursor-pointer select-none hover:text-[color:var(--nw-stone-blue)] transition-colors"
 onClick={() => toggleSort("vendor")}
 >
 Vendor
 <SortArrow
 active={sortKey === "vendor"}
 dir={sortDir}
 />
 </th>
 <th className="py-3 px-5 text-[10px] uppercase font-mono font-medium tracking-[0.14em] text-[color:var(--text-secondary)]">
 Invoice #
 </th>
 <th
 className="py-3 px-5 text-[10px] uppercase font-mono font-medium tracking-[0.14em] text-[color:var(--text-secondary)] cursor-pointer select-none hover:text-[color:var(--nw-stone-blue)] transition-colors"
 onClick={() => toggleSort("date")}
 >
 Date
 <SortArrow
 active={sortKey === "date"}
 dir={sortDir}
 />
 </th>
 <th className="py-3 px-5 text-[10px] uppercase font-mono font-medium tracking-[0.14em] text-[color:var(--text-secondary)]">
 Job
 </th>
 <th
 className="py-3 px-5 text-[10px] uppercase font-mono font-medium tracking-[0.14em] text-[color:var(--text-secondary)] cursor-pointer select-none hover:text-[color:var(--nw-stone-blue)] transition-colors"
 onClick={() => toggleSort("pm")}
 >
 PM
 <SortArrow
 active={sortKey === "pm"}
 dir={sortDir}
 />
 </th>
 <th
 className="py-3 px-5 text-[10px] uppercase font-mono font-medium tracking-[0.14em] text-[color:var(--text-secondary)] text-right cursor-pointer select-none hover:text-[color:var(--nw-stone-blue)] transition-colors"
 onClick={() => toggleSort("amount")}
 >
 Amount
 <SortArrow
 active={sortKey === "amount"}
 dir={sortDir}
 />
 </th>
 <th
 className="py-3 px-5 text-[10px] uppercase font-mono font-medium tracking-[0.14em] text-[color:var(--text-secondary)] cursor-pointer select-none hover:text-[color:var(--nw-stone-blue)] transition-colors"
 onClick={() => toggleSort("confidence")}
 >
 Confidence
 <SortArrow
 active={sortKey === "confidence"}
 dir={sortDir}
 />
 </th>
 <th
 className="py-3 px-5 text-[10px] uppercase font-mono font-medium tracking-[0.14em] text-[color:var(--text-secondary)] text-right cursor-pointer select-none hover:text-[color:var(--nw-stone-blue)] transition-colors"
 onClick={() => toggleSort("waiting")}
 >
 Waiting
 <SortArrow
 active={sortKey === "waiting"}
 dir={sortDir}
 />
 </th>
 {quickApproveEnabled && <th className="py-3 px-5 w-40" />}
 </tr>
 </thead>
 <tbody>
 {filtered.map((inv) => (
 <tr
 key={inv.id}
 className={`border-t border-[var(--border-default)] hover:bg-[var(--bg-muted)] cursor-pointer transition-all duration-300 ${selectedIds.has(inv.id) ? "bg-[rgba(91,134,153,0.08)]" : ""} ${animatingOutIds.has(inv.id) ? "opacity-0" : ""}`}
 onClick={(e) => {
 if (rowClickIntent(e, `/invoices/${inv.id}`) === "nav")
 window.location.href = `/invoices/${inv.id}`;
 }}
 >
 {batchEnabled && (
 <td className="py-4 px-3 w-10">
 <input
 type="checkbox"
 checked={selectedIds.has(inv.id)}
 onChange={() => toggleSelect(inv.id)}
 onClick={(e) => e.stopPropagation()}
 className="w-4 h-4 accent-[var(--nw-stone-blue)] cursor-pointer"
 aria-label="Select invoice for batch action"
 />
 </td>
 )}
 <td className="py-4 px-5 text-[color:var(--text-primary)] font-medium">
 {inv.vendor_name_raw ?? "Unknown"}
 {inv.document_type === "receipt" && <span className="ml-2"><NwBadge variant="info" size="sm">Receipt</NwBadge></span>}
 {inv.status === "pm_held" && <span className="ml-2"><NwBadge variant="warning" size="sm">Held</NwBadge></span>}
 {inv.status === "pm_denied" && <span className="ml-2"><NwBadge variant="danger" size="sm">Denied</NwBadge></span>}
 {inv.status === "info_requested" && <span className="ml-2"><NwBadge variant="warning" size="sm">Info Requested</NwBadge></span>}
 {inv.is_potential_duplicate && !inv.duplicate_dismissed_at && <span className="ml-2"><NwBadge variant="warning" size="sm">Duplicate?</NwBadge></span>}
 <MissingDataBadges inv={inv} />
 </td>
 <td className="py-4 px-5 text-[color:var(--text-muted)] font-mono text-xs">
 {inv.invoice_number ?? (
 <span className="text-[color:var(--nw-danger)]">No #</span>
 )}
 </td>
 <td className="py-4 px-5 text-[color:var(--text-muted)]">
 {inv.invoice_date ? (
 formatDate(inv.invoice_date)
 ) : (
 <span className="text-[color:var(--nw-danger)]">No Date</span>
 )}
 </td>
 <td className="py-4 px-5">
 {inv.jobs?.name ? (
 <NwBadge variant="info" size="sm">{inv.jobs.name}</NwBadge>
 ) : inv.document_category === "overhead" ? (
 <OverheadBadge />
 ) : (
 <span className="text-[color:var(--text-secondary)]">Unmatched</span>
 )}
 </td>
 <td className="py-4 px-5">
 <span
 className={
 inv.assigned_pm
 ? "text-[color:var(--text-muted)] text-sm"
 : "text-[color:var(--text-secondary)] text-sm"
 }
 >
 {inv.assigned_pm?.full_name ?? "Unassigned"}
 </span>
 </td>
 <td className="py-4 px-5 text-right">
 <NwMoney cents={inv.total_amount} />
 </td>
 <td className="py-4 px-5">
 <NwBadge variant={confidenceVariant(inv.confidence_score)} size="sm">
 {Math.round(inv.confidence_score * 100)}%
 </NwBadge>
 </td>
 <td className="py-4 px-5 text-right">
 {(() => {
 const d = daysAgo(inv.received_date);
 const aging = agingBadgeInfo(d);
 return (
 <div className="flex items-center justify-end gap-1.5">
 <span className={`text-sm font-medium ${d > 5 ? "text-[color:var(--nw-danger)]" : d > 2 ? "text-[color:var(--nw-warn)]" : "text-[color:var(--text-secondary)]"}`}>
 {d}d
 </span>
 {aging && <NwBadge variant={aging.variant} size="sm">{aging.label}</NwBadge>}
 </div>
 );
 })()}
 </td>
 {quickApproveEnabled && (
 <td className="py-4 px-3 w-40" onClick={(e) => e.stopPropagation()}>
  {isQuickEligible(inv) ? (
  <QuickApproveControl
   inv={inv}
   variant="row"
   confirming={quickApproveConfirmId === inv.id}
   processing={quickApproveProcessingId === inv.id}
   onStartConfirm={() => startQuickApprove(inv.id)}
   onCancel={cancelQuickApprove}
   onConfirm={() => confirmQuickApprove(inv)}
  />
  ) : null}
 </td>
 )}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </>
 )}
 </>
 )}
 {/* Floating batch action bar */}
 {batchEnabled && selectedIds.size > 0 && (
 <BatchActionBar
  count={selectedIds.size}
  totalCents={selectedTotalCents}
  processing={batchProcessing}
  onClearSelection={clearSelection}
  onHold={openHold}
  onDeny={openDeny}
  onApprove={openBatchApprove}
 />
 )}

 {/* Toast */}
 <ApprovalToast toast={toast} />

 {/* Batch Hold / Deny note modals */}
 <BatchNoteModal
  open={showHoldModal}
  variant="hold"
  count={selectedIds.size}
  note={holdNote}
  processing={batchProcessing}
  onNoteChange={setHoldNote}
  onCancel={closeHold}
  onConfirm={confirmHold}
 />

 <BatchNoteModal
  open={showDenyModal}
  variant="deny"
  count={selectedIds.size}
  note={denyNote}
  processing={batchProcessing}
  onNoteChange={setDenyNote}
  onCancel={closeDeny}
  onConfirm={confirmDeny}
 />

 {/* Approve Confirmation Modal */}
 <BatchApproveConfirmModal
  open={showApproveConfirm}
  eligible={approvalEligible}
  excluded={approvalExcluded}
  processing={batchProcessing}
  onCancel={closeBatchApprove}
  onConfirm={confirmBatchApprove}
 />
 </main>
 );
}
