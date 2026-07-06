"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { formatCents, formatStatus, formatDate, statusBadgeOutline } from "@/lib/utils/format";
import InvoiceUploadModal from "@/components/invoice-upload-modal";
import InvoiceImportModal from "@/components/invoice-import-modal";
import EmptyState, { EmptyIcons } from "@/components/empty-state";
import { SkeletonList } from "@/components/loading-skeleton";
import NwBadge, { type BadgeVariant } from "@/components/nw/Badge";
import NwMoney from "@/components/nw/Money";
import NwButton from "@/components/nw/Button";

function invoiceBadgeVariant(status: string): BadgeVariant {
 if (["pm_approved", "qa_approved", "pushed_to_qb", "in_draw", "paid", "approved", "complete"].includes(status)) return "success";
 if (["pm_review", "qa_review", "ai_processed", "received", "info_requested", "pm_held", "pending", "in_review", "submitted", "on_hold"].includes(status)) return "warning";
 if (["qa_kicked_back", "pm_denied", "void", "qb_failed", "denied", "rejected", "cancelled"].includes(status)) return "danger";
 return "neutral";
}

interface Invoice {
 id: string;
 vendor_name_raw: string | null;
 vendor_id: string | null;
 invoice_number: string | null;
 invoice_date: string | null;
 total_amount: number;
 confidence_score: number;
 received_date: string;
 payment_date: string | null;
 status: string;
 check_number: string | null;
 picked_up: boolean;
 mailed_date: string | null;
 document_category: string | null;
 document_type: string | null;
 is_change_order: boolean;
 parent_invoice_id: string | null;
 partial_approval_note: string | null;
 payment_status: string | null;
 draw_id: string | null;
 draws: { draw_number: number; status: string } | null;
 jobs: { id: string; name: string } | null;
 cost_codes: { code: string; description: string } | null;
 assigned_pm: { id: string; full_name: string } | null;
 /** Set by client after fetching per-invoice line-item splits. */
 line_item_cost_codes?: string[];
}

function isUnknownVendor(inv: Pick<Invoice, "vendor_id" | "vendor_name_raw">): boolean {
 if (!inv.vendor_id) return true;
 const name = (inv.vendor_name_raw ?? "").trim().toLowerCase();
 return name === "unknown" || name === "";
}

interface PmUser { id: string; full_name: string; }

type SortKey = "vendor" | "date" | "amount" | "status" | "pm" | "aging";

/** Days since `received_date` (rounded, non-negative). */
function daysOutstanding(receivedDate: string | null): number {
  if (!receivedDate) return 0;
  const d = new Date(receivedDate);
  if (isNaN(d.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

/** True when invoice is unpaid — aging applies only to unpaid invoices.
 *  Paid by either the workflow status OR the payment_status column counts as
 *  paid (the two can drift if the user doesn't mark payment_status). Voided
 *  invoices never age. */
function isUnpaidInvoice(inv: { payment_status: string | null; status: string }): boolean {
  if (inv.payment_status === "paid") return false;
  if (inv.status === "paid") return false;
  if (inv.status === "void") return false;
  return true;
}
type SortDir = "asc" | "desc";
type ConfidenceFilter = "all" | "high" | "medium" | "low";
type AmountRange = "all" | "0-5k" | "5k-25k" | "25k-100k" | "100k+";

const ALL_STATUSES = [
 "received", "ai_processed", "pm_review", "pm_approved", "pm_held", "pm_denied",
 "qa_review", "qa_approved", "qa_kicked_back", "pushed_to_qb", "qb_failed",
 "in_draw", "paid", "void",
];

const statusBadgeColor = statusBadgeOutline;

// ── STEP 2: approval-stage tabs (Archived DEFERRED per Jake — no draw-funding
// signal exists yet). Three tabs map only to existing invoices.status values. ──
type StageTab = "to_review" | "needs_attention" | "ready_for_draw";
// Needs Attention = held / denied / waiting-on-info ONLY. NOTE (discovery
// caveat, accepted): kick_back auto-reverts to pm_review, so kicked-back
// invoices land under To Review, not here (0 rows carry qa_kicked_back today).
const NEEDS_ATTENTION_STATUSES = ["pm_held", "pm_denied", "info_requested"];
// Ready for Draw = approval-complete (independent of draw/pay state, which are
// their own row badges). Includes in_draw + paid since Archived is deferred.
const READY_FOR_DRAW_STATUSES = ["qa_approved", "in_draw", "paid"]; // QB states pulled (not live) — filter-reachable, not a tab
// To Review = still needs a decision, split by reviewer audience.
const TO_REVIEW_PM_STATUSES = ["received", "ai_processed", "pm_review", "info_received"];
const TO_REVIEW_QA_STATUSES = ["pm_approved", "qa_review"];
function stageOf(status: string): StageTab | null {
 if (NEEDS_ATTENTION_STATUSES.includes(status)) return "needs_attention";
 if (READY_FOR_DRAW_STATUSES.includes(status)) return "ready_for_draw";
 if (TO_REVIEW_PM_STATUSES.includes(status) || TO_REVIEW_QA_STATUSES.includes(status)) return "to_review";
 return null; // void / qb_failed / import_* — outside the 3 kept tabs (0 rows today)
}

// STEP 3: Paid indicator (independent of approval + draw). Uses payment_status.
function paymentBadgeVariant(ps: string | null): BadgeVariant {
 if (ps === "paid") return "success";
 if (ps === "scheduled") return "info";
 if (ps === "partial") return "warning";
 return "neutral"; // unpaid / null
}

function SortArrow({ active, dir }: { active: boolean; dir: SortDir }) {
 if (!active) return <span className="ml-1 text-[var(--text-tertiary)]">↕</span>;
 return <span className="ml-1 text-[var(--text-accent)]">{dir === "asc" ? "↑" : "↓"}</span>;
}

// StatCard removed with the contradicting stat cards (per Jake ship-review fix 1).

export default function AllInvoicesPage() {
 const searchParams = useSearchParams();
 const router = useRouter();
 const [invoices, setInvoices] = useState<Invoice[]>([]);
 const [pmUsers, setPmUsers] = useState<PmUser[]>([]);
 // Live setup progress — the SetupGuide derives step completion from these
 // actual data counts, not a stored onboarding flag.
 const [setupCounts, setSetupCounts] = useState<{ costCodes: number; jobs: number }>({ costCodes: 0, jobs: 0 });
 const [loading, setLoading] = useState(true);
 const [uploadOpen, setUploadOpen] = useState(searchParams.get("action") === "upload");
 const [importOpen, setImportOpen] = useState(searchParams.get("action") === "import");

 // Tabs — STEP 2 approval stages. (Legacy `activeTab` retained but no longer
 // switched: the Payment-Tracking branch below is now dormant, superseded by
 // the per-row Paid badge; kept in place to preserve inline check#/picked-up
 // editing pending Jake's call on whether to restore it as a view.)
 const [activeTab] = useState<"all" | "payment">("all");
 const [stageTab, setStageTab] = useState<StageTab>("to_review");
 const [reviewSub, setReviewSub] = useState<"all" | "pm" | "qa">("all");

 // Inline editing for payment tracking
 const [editingCheckId, setEditingCheckId] = useState<string | null>(null);
 const [editingCheckValue, setEditingCheckValue] = useState("");
 const [savingInline, setSavingInline] = useState<string | null>(null);

 // Filters
 const [search, setSearch] = useState("");
 const [jobFilter, setJobFilter] = useState("");
 const [pmFilter, setPmFilter] = useState("");
 const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>("all");

 // Advanced
 const [showMoreFilters, setShowMoreFilters] = useState(false);
 const [statusFilters, setStatusFilters] = useState<Set<string>>(new Set());
 const [amountRange, setAmountRange] = useState<AmountRange>("all");
 const [dateStart, setDateStart] = useState("");
 const [dateEnd, setDateEnd] = useState("");

 // Sort
 const [sortKey, setSortKey] = useState<SortKey>("date");
 const [sortDir, setSortDir] = useState<SortDir>("desc");

 useEffect(() => {
 // Backstop: the loading skeleton must NEVER be permanent. If fetchData
 // hasn't flipped `loading` within 15s (e.g. a hung network call), force it
 // so the user always reaches the empty state / list, never an endless spin.
 const loadingSafety = setTimeout(() => setLoading(false), 15000);
 async function fetchData() {
 // [DIAG lockfix] confirm the live build + time each load step via a window
 // global (browser network/console tooling proved unreliable). Remove after.
 const W = window as unknown as { __nwPerf?: { s: string; t: number }[]; __nwBuild?: string };
 W.__nwBuild = "lockfix-instr-1";
 W.__nwPerf = [{ s: "start", t: Math.round(performance.now()) }];
 const mark = (s: string) => W.__nwPerf!.push({ s, t: Math.round(performance.now()) });
 try {
 // Setup progress (server-side, INDEPENDENT of the invoice load so a slow /
 // hanging invoice query can't block it) — fire-and-forget; it updates the
 // SetupGuide as soon as it resolves.
 fetch("/api/setup-status", { cache: "no-store" })
 .then((r) => (r.ok ? r.json() : null))
 .then((s) => { if (s) setSetupCounts({ costCodes: s.costCodes ?? 0, jobs: s.jobs ?? 0 }); })
 .catch(() => {});
 // Auth pre-flight + membership.org_id fetch (Plan C-1 CR-C1-1; Option A
 // promoted from Option B per iter-2 multi-tenant-architect BLOCKING +
 // 4-of-5 reviewer consensus. Explicit org_id filter on PM query —
 // tenant safety by construction per D-30 / CLAUDE.md
 // "Filter every query by membership.org_id".)
 // getSession() reads the stored JWT locally (no /auth/v1/user network
 // round-trip) — avoids a permanent hang if that validation call stalls on
 // a fresh-signup session (the new-org stuck-spinner bug). The invoice /
 // membership queries below are RLS-protected server-side, so trusting the
 // local session here is sufficient for a read-only list load.
 const {
 data: { session },
 } = await supabase.auth.getSession();
 mark("getSession");
 const user = session?.user ?? null;
 let orgId: string | null = null;
 if (user) {
 const { data: membership } = await supabase
 .from("org_members")
 .select("role, org_id")
 .eq("user_id", user.id)
 .eq("is_active", true)
 .order("created_at", { ascending: true })
 .limit(1)
 .maybeSingle();
 orgId = (membership?.org_id as string | undefined) ?? null;
 if (!orgId) {
 console.error("[invoices] Membership has no org_id; PM dropdown will be empty", {
 user_id: user.id,
 membership,
 });
 }
 }
 mark("membership");
 // Try with partial-approval columns first (migration 00015). Fall back if
 // the columns don't exist yet so the page still renders.
 const INVOICES_FULL = "id, vendor_name_raw, vendor_id, invoice_number, invoice_date, total_amount, confidence_score, received_date, payment_date, status, check_number, picked_up, mailed_date, document_category, document_type, is_change_order, parent_invoice_id, partial_approval_note, payment_status, draw_id, draws:draw_id (draw_number, status), jobs:job_id (id, name), cost_codes:cost_code_id (code, description), assigned_pm:assigned_pm_id (id, full_name)";
 const INVOICES_MINIMAL = "id, vendor_name_raw, vendor_id, invoice_number, invoice_date, total_amount, confidence_score, received_date, payment_date, status, check_number, picked_up, mailed_date, document_category, document_type, is_change_order, payment_status, draw_id, draws:draw_id (draw_number, status), jobs:job_id (id, name), cost_codes:cost_code_id (code, description), assigned_pm:assigned_pm_id (id, full_name)";
 // Parallel: invoices + PMs. Line items fetched in a second pass with
 // an IN filter so we don't scan every line item in the org.
 const [invResult, pmResult] = await Promise.all([
 supabase
 .from("invoices")
 .select(INVOICES_FULL).eq("org_id", orgId ?? "")
 .is("deleted_at", null)
 .order("created_at", { ascending: false })
 .limit(2000)
 .then(async (r) => {
 if (r.error && /parent_invoice_id|partial_approval_note/i.test(r.error.message)) {
 return await supabase
 .from("invoices")
 .select(INVOICES_MINIMAL).eq("org_id", orgId ?? "")
 .is("deleted_at", null)
 .order("created_at", { ascending: false })
 .limit(2000);
 }
 return r;
 }),
 // PM dropdown sourced from org_members + profiles. Plan D-1 (Wave-D
 // Issue 1 fix): hint syntax updated from the broken column-disambiguation
 // form to `profile:profiles (...)` resolving via the FK
 // org_members_user_id_profiles_fkey created in 00098. Option A: explicit
 // org_id filter — tenant safety by construction per D-30 (preserved from
 // C-1 CR-C1-1 promotion).
 orgId
 ? supabase
 .from("org_members")
 .select("user_id, profile:profiles (id, full_name)")
 .eq("org_id", orgId)
 .eq("is_active", true)
 .in("role", ["pm", "admin"])
 : Promise.resolve({ data: null, error: null }),
 ]);
 mark("queries");

 // Build invoice_id → list of unique cost code strings — only for visible invoices
 const lineItemCodesByInvoice = new Map<string, Set<string>>();
 const invoiceIds = (invResult.data as unknown as Array<{ id: string }> | null)?.map((i) => i.id) ?? [];
 if (invoiceIds.length > 0) {
 const { data: lineItems } = await supabase
 .from("invoice_line_items")
 .select("invoice_id, cost_code_id, cost_codes:cost_code_id(code)")
 .in("invoice_id", invoiceIds)
 .is("deleted_at", null);
 for (const li of lineItems ?? []) {
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const cc = (li as any).cost_codes;
 const code = Array.isArray(cc) ? cc[0]?.code : cc?.code;
 if (!code) continue;
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 const invId = (li as any).invoice_id as string;
 if (!lineItemCodesByInvoice.has(invId)) lineItemCodesByInvoice.set(invId, new Set());
 lineItemCodesByInvoice.get(invId)!.add(code);
 }
 }

 if (!invResult.error && invResult.data) {
 const enriched = (invResult.data as unknown as Invoice[]).map(inv => ({
 ...inv,
 line_item_cost_codes: Array.from(lineItemCodesByInvoice.get(inv.id) ?? []),
 }));
 setInvoices(enriched);
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
 } catch (err) {
 // Robustness (new-org signup bug): never strand the page on the loading
 // skeleton. A thrown/rejected query anywhere in this async chain (auth,
 // RLS, network) must still resolve to the empty state, not spin forever.
 // The empty-state branch handles zero data; a real error is logged here.
 console.error("[invoices] load failed:", err);
 } finally {
 mark("finally");
 clearTimeout(loadingSafety);
 setLoading(false);
 }
 }
 fetchData();
 return () => clearTimeout(loadingSafety);
 }, []);

 // Unique job names
 const jobNames = useMemo(() => {
 const names = new Set<string>();
 invoices.forEach(inv => { if (inv.jobs?.name) names.add(inv.jobs.name); });
 return Array.from(names).sort();
 }, [invoices]);

 // Stat cards removed — they used stale status buckets that contradicted the
 // approval-stage tabs. Per-stage counts now live on the tab chips + sub-line.

 // STEP 2 — approval-stage tab counts (+ To Review PM/QA sub-counts).
 const stageCounts = useMemo(() => {
 const c = { to_review: 0, needs_attention: 0, ready_for_draw: 0, pm: 0, qa: 0 };
 for (const inv of invoices) {
 const st = stageOf(inv.status);
 if (st === "to_review") c.to_review++;
 else if (st === "needs_attention") c.needs_attention++;
 else if (st === "ready_for_draw") c.ready_for_draw++;
 if (TO_REVIEW_PM_STATUSES.includes(inv.status)) c.pm++;
 if (TO_REVIEW_QA_STATUSES.includes(inv.status)) c.qa++;
 }
 return c;
 }, [invoices]);

 // Advanced filter count
 const advancedFilterCount = useMemo(() => {
 let count = 0;
 if (statusFilters.size > 0) count++;
 if (amountRange !== "all") count++;
 if (dateStart || dateEnd) count++;
 if (jobFilter) count++;
 if (pmFilter) count++;
 if (confidenceFilter !== "all") count++;
 return count;
 }, [statusFilters, amountRange, dateStart, dateEnd, jobFilter, pmFilter, confidenceFilter]);

 // Filter + sort
 const filtered = useMemo(() => {
 let result = invoices;

 // STEP 2 — approval-stage tab governs the DEFAULT view. An explicit status
 // filter (advanced chips) overrides it, keeping non-tab statuses (void, the
 // QB states, import_*) filter-reachable without being tabs.
 if (statusFilters.size === 0) {
 result = result.filter(inv => stageOf(inv.status) === stageTab);
 if (stageTab === "to_review" && reviewSub !== "all") {
 result = result.filter(inv =>
 reviewSub === "pm"
 ? TO_REVIEW_PM_STATUSES.includes(inv.status)
 : TO_REVIEW_QA_STATUSES.includes(inv.status)
 );
 }
 }

 if (search.trim()) {
 const q = search.toLowerCase();
 result = result.filter(inv =>
 (inv.vendor_name_raw ?? "").toLowerCase().includes(q) ||
 (inv.invoice_number ?? "").toLowerCase().includes(q)
 );
 }
 if (jobFilter) result = result.filter(inv => inv.jobs?.name === jobFilter);
 if (pmFilter) {
 if (pmFilter === "__unassigned__") result = result.filter(inv => !inv.assigned_pm);
 else result = result.filter(inv => inv.assigned_pm?.id === pmFilter);
 }
 if (confidenceFilter !== "all") {
 result = result.filter(inv => {
 const s = inv.confidence_score;
 if (confidenceFilter === "high") return s >= 0.85;
 if (confidenceFilter === "medium") return s >= 0.70 && s < 0.85;
 return s < 0.70;
 });
 }
 if (statusFilters.size > 0) result = result.filter(inv => statusFilters.has(inv.status));
 if (amountRange !== "all") {
 result = result.filter(inv => {
 const amt = inv.total_amount;
 switch (amountRange) {
 case "0-5k": return amt < 500000;
 case "5k-25k": return amt >= 500000 && amt < 2500000;
 case "25k-100k": return amt >= 2500000 && amt < 10000000;
 case "100k+": return amt >= 10000000;
 default: return true;
 }
 });
 }
 if (dateStart) result = result.filter(inv => (inv.invoice_date ?? "") >= dateStart);
 if (dateEnd) result = result.filter(inv => (inv.invoice_date ?? "") <= dateEnd);

 return [...result].sort((a, b) => {
 let cmp = 0;
 switch (sortKey) {
 case "vendor": cmp = (a.vendor_name_raw ?? "").localeCompare(b.vendor_name_raw ?? ""); break;
 case "date": cmp = (a.invoice_date ?? "").localeCompare(b.invoice_date ?? ""); break;
 case "amount": cmp = a.total_amount - b.total_amount; break;
 case "status": cmp = a.status.localeCompare(b.status); break;
 case "pm": cmp = (a.assigned_pm?.full_name ?? "").localeCompare(b.assigned_pm?.full_name ?? ""); break;
 case "aging": cmp = daysOutstanding(a.received_date) - daysOutstanding(b.received_date); break;
 }
 return sortDir === "asc" ? cmp : -cmp;
 });
 }, [invoices, stageTab, reviewSub, search, jobFilter, pmFilter, confidenceFilter, statusFilters, amountRange, dateStart, dateEnd, sortKey, sortDir]);

 const toggleSort = (key: SortKey) => {
 if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
 else { setSortKey(key); setSortDir(key === "vendor" || key === "pm" ? "asc" : "desc"); }
 };

 const toggleStatus = (s: string) => {
 setStatusFilters(prev => {
 const next = new Set(prev);
 if (next.has(s)) next.delete(s); else next.add(s);
 return next;
 });
 };

 const isFiltered = search.trim() !== "" || jobFilter !== "" || pmFilter !== "" || confidenceFilter !== "all" || statusFilters.size > 0 || amountRange !== "all" || dateStart !== "" || dateEnd !== "";

 const clearAllFilters = () => { setSearch(""); setJobFilter(""); setPmFilter(""); setConfidenceFilter("all"); setStatusFilters(new Set()); setAmountRange("all"); setDateStart(""); setDateEnd(""); };

 // Payment tracking: filtered and grouped by payment_date
 const PAYMENT_STATUSES = ["qa_approved", "pushed_to_qb", "in_draw", "paid"];
 const paymentInvoices = useMemo(() => {
 return invoices.filter(inv => PAYMENT_STATUSES.includes(inv.status))
 .sort((a, b) => (a.payment_date ?? "").localeCompare(b.payment_date ?? ""));
 }, [invoices]);

 const paymentGroups = useMemo(() => {
 const groups: Record<string, Invoice[]> = {};
 paymentInvoices.forEach(inv => {
 const key = inv.payment_date ?? "No Date";
 if (!groups[key]) groups[key] = [];
 groups[key].push(inv);
 });
 return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
 }, [paymentInvoices]);

 const handleInlineCheckSave = async (invoiceId: string, value: string) => {
 setSavingInline(invoiceId);
 const res = await fetch(`/api/invoices/${invoiceId}`, {
 method: "PATCH", headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ check_number: value.trim() || null }),
 });
 if (res.ok) {
 setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, check_number: value.trim() || null } : inv));
 }
 setSavingInline(null);
 setEditingCheckId(null);
 };

 const handleInlinePickedUpToggle = async (invoiceId: string, current: boolean) => {
 setSavingInline(invoiceId);
 const res = await fetch(`/api/invoices/${invoiceId}`, {
 method: "PATCH", headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ picked_up: !current }),
 });
 if (res.ok) {
 setInvoices(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, picked_up: !current } : inv));
 }
 setSavingInline(null);
 };

 return (
 <>
 <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">
 {/* Invoices/Queue/QA sub-nav replaced by the STEP 2 approval-stage tabs below. */}
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
 Financial · Invoices
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
 Invoices
 </h2>
 <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
 {isFiltered
 ? `Showing ${filtered.length} filtered`
 : `${filtered.length} in this stage · ${invoices.length} total`}
 </p>
 </div>
 <div className="flex items-center gap-2">
 <NwButton variant="secondary" size="md" onClick={() => setImportOpen(true)}>
 Import CSV
 </NwButton>
 <NwButton variant="primary" size="md" onClick={() => setUploadOpen(true)}>
 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
 </svg>
 Upload Invoice
 </NwButton>
 </div>
 </div>

 {/* STEP 2 — approval-stage tabs (replaces the Invoices/Queue/QA bar). */}
 <div className="flex flex-wrap items-center gap-3 mb-4">
 <div className="flex gap-1 bg-[var(--bg-subtle)] border border-[var(--border-default)] p-1 w-fit">
 {([
 ["to_review", "To Review", stageCounts.to_review],
 ["needs_attention", "Needs Attention", stageCounts.needs_attention],
 ["ready_for_draw", "Ready for Draw", stageCounts.ready_for_draw],
 ] as [StageTab, string, number][]).map(([key, label, count]) => (
 <button
 key={key}
 onClick={() => setStageTab(key)}
 className={`px-4 py-2 font-mono text-[11px] tracking-[0.12em] uppercase font-medium transition-colors inline-flex items-center gap-2 ${
 stageTab === key ? "bg-[var(--bg-muted)] text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
 }`}>
 {label}
 <NwBadge variant={stageTab === key ? "accent" : "neutral"} size="sm">{String(count)}</NwBadge>
 </button>
 ))}
 </div>
 {/* To Review sub-toggle — keeps the PM-vs-accountant split the app is built on. */}
 {stageTab === "to_review" && (
 <div className="flex gap-1 bg-[var(--bg-subtle)] border border-[var(--border-default)] p-1 w-fit">
 {([
 ["all", "All", stageCounts.pm + stageCounts.qa],
 ["pm", "PM Review", stageCounts.pm],
 ["qa", "Accounting QA", stageCounts.qa],
 ] as ["all" | "pm" | "qa", string, number][]).map(([key, label, count]) => (
 <button
 key={key}
 onClick={() => setReviewSub(key)}
 className={`px-3 py-1.5 font-mono text-[10px] tracking-[0.12em] uppercase font-medium transition-colors inline-flex items-center gap-1.5 ${
 reviewSub === key ? "bg-[var(--bg-muted)] text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
 }`}>
 {label}
 <span className="text-[var(--text-tertiary)]">{count}</span>
 </button>
 ))}
 </div>
 )}
 </div>

 {loading ? (
 <div className="space-y-4">
 <SkeletonList rows={6} columns={["w-32", "w-20", "w-24", "w-32", "w-32", "w-20", "w-24"]} />
 </div>
 ) : (
 <>
 {activeTab === "all" ? (
 <>
 {/* Primary filters */}
 <div className="flex flex-col md:flex-row gap-3 mb-3">
 <div className="relative flex-1">
 <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
 </svg>
 <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
 placeholder="Search vendor or invoice #..."
 className="w-full pl-9 pr-8 py-2.5 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--nw-stone-blue)] focus:outline-none" />
 {search && (
 <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
 </button>
 )}
 </div>
 {/* Job / PM / Confidence moved into "More Filters" below — one filter system, not two. */}
 </div>

 {/* More Filters toggle */}
 <div className="flex items-center gap-3 mb-5">
 <button onClick={() => setShowMoreFilters(!showMoreFilters)}
 className="flex items-center gap-1.5 px-3 py-2 font-mono text-[11px] tracking-[0.12em] uppercase text-[var(--text-tertiary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-colors">
 <svg className={`w-4 h-4 transition-transform ${showMoreFilters ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
 <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
 </svg>
 More Filters
 {advancedFilterCount > 0 && (
 <span className="ml-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-nw-stone-blue text-nw-white-sand text-[10px] font-bold">
 {advancedFilterCount}
 </span>
 )}
 </button>
 {isFiltered && (
 <button onClick={clearAllFilters}
 className="px-3 py-2 font-mono text-[11px] tracking-[0.12em] uppercase text-[var(--text-tertiary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-colors">
 Clear all filters
 </button>
 )}
 </div>

 {/* Advanced filters */}
 {showMoreFilters && (
 <div className="mb-5 p-4 bg-[var(--bg-subtle)]/50 border border-[var(--border-default)] space-y-4 animate-fade-up">
 {/* Status multi-select */}
 <div>
 <p className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Status</p>
 <div className="flex flex-wrap gap-2">
 {ALL_STATUSES.map(s => (
 <button key={s} onClick={() => toggleStatus(s)}
 className={`px-2.5 py-1 text-xs border transition-colors ${
 statusFilters.has(s) ? statusBadgeColor(s) + " font-medium" : "text-[var(--text-tertiary)] border-[var(--border-default)] hover:border-[var(--border-strong)]"
 }`}>
 {formatStatus(s)}
 </button>
 ))}
 </div>
 </div>
 <div className="flex flex-col md:flex-row gap-4 mb-4">
 <div>
 <p className="text-[11px] font-mono font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Job</p>
 <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}
 className="px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:border-[var(--nw-stone-blue)] focus:outline-none md:w-48">
 <option value="">All Jobs</option>
 {jobNames.map(n => <option key={n} value={n}>{n}</option>)}
 </select>
 </div>
 <div>
 <p className="text-[11px] font-mono font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">PM</p>
 <select value={pmFilter} onChange={(e) => setPmFilter(e.target.value)}
 className="px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:border-[var(--nw-stone-blue)] focus:outline-none md:w-44">
 <option value="">All PMs</option>
 <option value="__unassigned__">Unassigned</option>
 {pmUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
 </select>
 </div>
 <div>
 <p className="text-[11px] font-mono font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Confidence</p>
 <select value={confidenceFilter} onChange={(e) => setConfidenceFilter(e.target.value as ConfidenceFilter)}
 className="px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:border-[var(--nw-stone-blue)] focus:outline-none md:w-40">
 <option value="all">All Confidence</option>
 <option value="high">High (≥85%)</option>
 <option value="medium">Medium (70–84%)</option>
 <option value="low">Low (&lt;70%)</option>
 </select>
 </div>
 </div>
 <div className="flex flex-col md:flex-row gap-4">
 {/* Amount range */}
 <div>
 <p className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Amount Range</p>
 <select value={amountRange} onChange={(e) => setAmountRange(e.target.value as AmountRange)}
 className="px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:border-[var(--nw-stone-blue)] focus:outline-none">
 <option value="all">All</option>
 <option value="0-5k">$0 – $5K</option>
 <option value="5k-25k">$5K – $25K</option>
 <option value="25k-100k">$25K – $100K</option>
 <option value="100k+">$100K+</option>
 </select>
 </div>
 {/* Date range */}
 <div>
 <p className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Invoice Date Range</p>
 <div className="flex items-center gap-2">
 <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)}
 className="px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:border-[var(--nw-stone-blue)] focus:outline-none" />
 <span className="text-[var(--text-tertiary)] text-sm">to</span>
 <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)}
 className="px-3 py-2 bg-[var(--bg-subtle)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:border-[var(--nw-stone-blue)] focus:outline-none" />
 </div>
 </div>
 </div>
 </div>
 )}

 {/* No results */}
 {filtered.length === 0 && (
 invoices.length === 0 ? (
 // Truly empty org (no invoices at all) — the post-signup landing. A
 // guiding 3-step setup path (cost codes → first job → upload invoice),
 // NOT a blank screen: a fast one-screen signup that dead-ended here would
 // strand new customers worse than the old wizard did.
 <SetupGuide
 onUpload={() => setUploadOpen(true)}
 costCodes={setupCounts.costCodes}
 jobs={setupCounts.jobs}
 invoicesCount={invoices.length}
 />
 ) : isFiltered ? (
 <EmptyState
 icon={<EmptyIcons.Search />}
 title="No invoices match your filters"
 message="Try adjusting your filters, or clear them to see every invoice in the system."
 primaryAction={{ label: "Clear filters", onClick: clearAllFilters }}
 />
 ) : (
 // Org has invoices, none in this stage tab, no filter applied.
 <EmptyState
 icon={<EmptyIcons.Check />}
 title="Nothing in this stage"
 message="No invoices are in this stage right now."
 />
 )
 )}

 {filtered.length > 0 && (
 <div className="overflow-x-auto border border-[var(--border-default)] animate-fade-up">
 <table className="w-full min-w-[1350px] text-sm">
 <thead>
 <tr className="bg-[var(--bg-subtle)] text-left">
 <th className="py-3 px-4 text-[10px] text-[var(--text-tertiary)] font-mono font-medium uppercase tracking-[0.14em] cursor-pointer select-none hover:text-[var(--text-accent)] transition-colors sticky left-0 bg-[var(--bg-subtle)] z-10" onClick={() => toggleSort("vendor")}>
 Vendor<SortArrow active={sortKey === "vendor"} dir={sortDir} />
 </th>
 <th className="py-3 px-4 text-[10px] text-[var(--text-tertiary)] font-mono font-medium uppercase tracking-[0.14em]">Inv #</th>
 <th className="py-3 px-4 text-[10px] text-[var(--text-tertiary)] font-mono font-medium uppercase tracking-[0.14em] cursor-pointer select-none hover:text-[var(--text-accent)] transition-colors" onClick={() => toggleSort("date")}>
 Date<SortArrow active={sortKey === "date"} dir={sortDir} />
 </th>
 <th className="py-3 px-4 text-[10px] text-[var(--text-tertiary)] font-mono font-medium uppercase tracking-[0.14em]">Job</th>
 <th className="py-3 px-4 text-[10px] text-[var(--text-tertiary)] font-mono font-medium uppercase tracking-[0.14em]">Cost Code</th>
 <th className="py-3 px-4 text-[10px] text-[var(--text-tertiary)] font-mono font-medium uppercase tracking-[0.14em] text-right cursor-pointer select-none hover:text-[var(--text-accent)] transition-colors" onClick={() => toggleSort("amount")}>
 Amount<SortArrow active={sortKey === "amount"} dir={sortDir} />
 </th>
 {/* Status column dropped — the active tab already names the stage. */}
 <th className="py-3 px-4 text-[10px] text-[var(--text-tertiary)] font-mono font-medium uppercase tracking-[0.14em]">Draw</th>
 <th className="py-3 px-4 text-[10px] text-[var(--text-tertiary)] font-mono font-medium uppercase tracking-[0.14em]">Paid</th>
 <th className="py-3 px-4 text-[10px] text-[var(--text-tertiary)] font-mono font-medium uppercase tracking-[0.14em] cursor-pointer select-none hover:text-[var(--text-accent)] transition-colors" onClick={() => toggleSort("pm")}>
 PM<SortArrow active={sortKey === "pm"} dir={sortDir} />
 </th>
 <th className="py-3 px-4 text-[10px] text-[var(--text-tertiary)] font-mono font-medium uppercase tracking-[0.14em] text-right cursor-pointer select-none hover:text-[var(--text-accent)] transition-colors" onClick={() => toggleSort("aging")}>
 Days Out<SortArrow active={sortKey === "aging"} dir={sortDir} />
 </th>
 <th className="py-3 px-4 text-[10px] text-[var(--text-tertiary)] font-mono font-medium uppercase tracking-[0.14em]">Payment</th>
 </tr>
 </thead>
 <tbody>
 {filtered.map((inv) => (
 <tr key={inv.id}
 className="group border-t border-[var(--border-default)] hover:bg-[var(--bg-muted)] transition-colors">
 <td className="py-3 px-4 text-[var(--text-primary)] font-medium sticky left-0 bg-[var(--bg-card)] group-hover:bg-[var(--bg-muted)] z-[1]">
 {/* Vendor name is the row's link target. Replaces a tr onClick
 that called window.location.href, restoring Cmd/Ctrl+click
 (open in new tab), keyboard Tab+Enter, and screen-reader
 link semantics. (audit ux U-2). */}
 <Link
 href={`/invoices/${inv.id}`}
 className="inline-flex items-center gap-2 hover:underline focus-visible:underline focus-visible:outline-none"
 >
 {inv.vendor_name_raw ?? "Unknown"}
 {inv.document_type === "receipt" && (
 <NwBadge variant="info" size="sm">Receipt</NwBadge>
 )}
 {isUnknownVendor(inv) && (
 <NwBadge variant="danger" size="sm">Unknown Vendor</NwBadge>
 )}
 {(inv.parent_invoice_id || inv.partial_approval_note) && (
 <NwBadge variant="warning" size="sm">Partial</NwBadge>
 )}
 </Link>
 </td>
 <td className="py-3 px-4 text-[var(--text-secondary)] font-mono text-xs">
 {inv.invoice_number ?? (
 <NwBadge variant="warning" size="sm">No Invoice #</NwBadge>
 )}
 </td>
 <td className="py-3 px-4 text-[var(--text-secondary)]">
 {inv.invoice_date ? (
 formatDate(inv.invoice_date)
 ) : (
 <NwBadge variant="danger" size="sm">No Date</NwBadge>
 )}
 </td>
 <td className="py-3 px-4">
 {inv.jobs?.name ? (
 <Link href={`/jobs/${inv.jobs.id}`} className="hover:opacity-80 transition-opacity"><NwBadge variant="info" size="sm">{inv.jobs.name}</NwBadge></Link>
 ) : inv.document_category === "overhead" ? (
 <NwBadge variant="warning" size="sm">Overhead</NwBadge>
 ) : (
 <span className="text-[var(--text-tertiary)]">—</span>
 )}
 </td>
 <td className="py-3 px-4 text-[var(--text-secondary)] text-xs">
 {inv.line_item_cost_codes && inv.line_item_cost_codes.length > 1 ? (
 <span title={inv.line_item_cost_codes.join(", ")}>
 <NwBadge variant="info" size="sm">Multiple ({inv.line_item_cost_codes.length})</NwBadge>
 </span>
 ) : inv.line_item_cost_codes && inv.line_item_cost_codes.length === 1 ? (
 <span>{inv.line_item_cost_codes[0]}</span>
 ) : inv.cost_codes ? (
 <span>{inv.cost_codes.code}</span>
 ) : (
 <span className="text-[var(--text-tertiary)]">—</span>
 )}
 </td>
 <td className="py-3 px-4 text-right">
 <NwMoney cents={inv.total_amount} />
 </td>
 {/* Status column dropped (fix 3) — the Partial flag moved to the vendor cell. */}
 <td className="py-3 px-4">
 {inv.draws ? (
 <NwBadge variant="info" size="sm">Draw #{inv.draws.draw_number} · {inv.draws.status}</NwBadge>
 ) : (
 <span className="text-[var(--text-tertiary)] text-xs">Not on a draw</span>
 )}
 </td>
 <td className="py-3 px-4">
 <NwBadge variant={paymentBadgeVariant(inv.payment_status)} size="sm">{inv.payment_status ?? "unpaid"}</NwBadge>
 </td>
 <td className="py-3 px-4 text-[var(--text-secondary)] text-xs">{inv.assigned_pm?.full_name ?? <span className="text-[var(--text-tertiary)]">—</span>}</td>
 <td className="py-3 px-4 text-right">
 {(() => {
 // Paid (or voided) invoices don't age — render a dash, no badge, no days text.
 if (!isUnpaidInvoice(inv)) {
 return <span className="text-[var(--text-tertiary)]">&mdash;</span>;
 }
 const days = daysOutstanding(inv.received_date);
 if (days >= 90) {
 return (
 <span title={`Outstanding for ${days} days (90+)`}>
 <NwBadge variant="danger" size="sm">90d+</NwBadge>
 </span>
 );
 }
 if (days >= 61) {
 return (
 <span title={`Outstanding for ${days} days (61-90)`}>
 <NwBadge variant="danger" size="sm">60d+</NwBadge>
 </span>
 );
 }
 if (days >= 30) {
 return (
 <span title={`Outstanding for ${days} days (30-60)`}>
 <NwBadge variant="warning" size="sm">30d+</NwBadge>
 </span>
 );
 }
 return (
 <span className="text-xs text-[var(--text-secondary)] tabular-nums">{days}d</span>
 );
 })()}
 </td>
 <td className="py-3 px-4 text-[var(--text-secondary)] text-xs">{formatDate(inv.payment_date)}</td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 )}
 </>
 ) : (
 /* Payment Tracking Tab */
 <>
 {paymentGroups.length === 0 ? (
 <EmptyState
 icon={<EmptyIcons.Check />}
 variant="success"
 title="No invoices ready for payment"
 message="Approved invoices will appear here once they're ready to be paid."
 />
 ) : (
 <div className="space-y-6">
 {paymentGroups.map(([dateKey, group]) => (
 <div key={dateKey} className="animate-fade-up">
 <div className="flex items-center gap-3 mb-3">
 <h3 className="text-sm font-medium text-[var(--text-primary)]">
 {dateKey === "No Date" ? "No Payment Date" : formatDate(dateKey)}
 </h3>
 <span className="text-[11px] text-[var(--text-tertiary)] bg-[var(--bg-subtle)] px-2 py-0.5 border border-[var(--border-default)]">
 {group.length} invoice{group.length !== 1 ? "s" : ""} &mdash; {formatCents(group.reduce((s, inv) => s + inv.total_amount, 0))}
 </span>
 </div>
 <div className="overflow-x-auto border border-[var(--border-default)]">
 <table className="w-full text-sm">
 <thead>
 <tr className="bg-[var(--bg-subtle)] text-left">
 <th className="py-3 px-4 text-[10px] text-[var(--text-tertiary)] font-mono font-medium uppercase tracking-[0.14em]">Vendor</th>
 <th className="py-3 px-4 text-[10px] text-[var(--text-tertiary)] font-mono font-medium uppercase tracking-[0.14em]">Inv #</th>
 <th className="py-3 px-4 text-[10px] text-[var(--text-tertiary)] font-mono font-medium uppercase tracking-[0.14em] text-right">Amount</th>
 <th className="py-3 px-4 text-[10px] text-[var(--text-tertiary)] font-mono font-medium uppercase tracking-[0.14em]">Status</th>
 <th className="py-3 px-4 text-[10px] text-[var(--text-tertiary)] font-mono font-medium uppercase tracking-[0.14em]">Payment Date</th>
 <th className="py-3 px-4 text-[10px] text-[var(--text-tertiary)] font-mono font-medium uppercase tracking-[0.14em]">Check #</th>
 <th className="py-3 px-4 text-[10px] text-[var(--text-tertiary)] font-mono font-medium uppercase tracking-[0.14em] text-center">Picked Up</th>
 </tr>
 </thead>
 <tbody>
 {group.map((inv) => (
 <tr key={inv.id} className="border-t border-[var(--border-default)] hover:bg-[var(--bg-muted)] transition-colors">
 <td className="py-3 px-4 text-[var(--text-primary)] font-medium cursor-pointer hover:text-[var(--text-accent)] transition-colors"
 onClick={() => window.location.href = `/invoices/${inv.id}`}>
 <span className="inline-flex items-center gap-2">
 {inv.vendor_name_raw ?? "Unknown"}
 {inv.document_type === "receipt" && (
 <NwBadge variant="info" size="sm">Receipt</NwBadge>
 )}
 </span>
 </td>
 <td className="py-3 px-4 text-[var(--text-secondary)] font-mono text-xs">{inv.invoice_number ?? <span className="text-[var(--text-tertiary)]">&mdash;</span>}</td>
 <td className="py-3 px-4 text-right">
 <NwMoney cents={inv.total_amount} />
 </td>
 <td className="py-3 px-4">
 <NwBadge variant={invoiceBadgeVariant(inv.status)} size="sm">
 {formatStatus(inv.status)}
 </NwBadge>
 </td>
 <td className="py-3 px-4 text-[var(--text-secondary)] text-xs">{formatDate(inv.payment_date)}</td>
 <td className="py-3 px-4">
 {editingCheckId === inv.id ? (
 <input
 type="text"
 value={editingCheckValue}
 onChange={(e) => setEditingCheckValue(e.target.value)}
 onBlur={() => handleInlineCheckSave(inv.id, editingCheckValue)}
 onKeyDown={(e) => { if (e.key === "Enter") handleInlineCheckSave(inv.id, editingCheckValue); if (e.key === "Escape") setEditingCheckId(null); }}
 autoFocus
 className="w-24 px-2 py-1 bg-[var(--bg-subtle)] border border-nw-stone-blue text-xs text-[var(--text-primary)] focus:outline-none"
 />
 ) : (
 <button
 onClick={(e) => { e.stopPropagation(); setEditingCheckId(inv.id); setEditingCheckValue(inv.check_number ?? ""); }}
 className="px-2 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors min-w-[60px] text-left"
 disabled={savingInline === inv.id}>
 {savingInline === inv.id ? "..." : (inv.check_number || <span className="text-[var(--text-tertiary)] italic">Add #</span>)}
 </button>
 )}
 </td>
 <td className="py-3 px-4 text-center">
 <button
 onClick={(e) => { e.stopPropagation(); handleInlinePickedUpToggle(inv.id, inv.picked_up); }}
 disabled={savingInline === inv.id}
 className={`relative inline-flex h-5 w-9 items-center transition-colors disabled:opacity-50 ${inv.picked_up ? "bg-[var(--nw-success)]" : "bg-[var(--border-default)]"}`}>
 <span className={`inline-block h-3 w-3 transform bg-nw-white-sand transition-transform ${inv.picked_up ? "translate-x-5" : "translate-x-1"}`} />
 </button>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 ))}
 </div>
 )}
 </>
 )}
 </>
 )}
 </main>
 <InvoiceUploadModal open={uploadOpen} onClose={() => {
 setUploadOpen(false);
 if (searchParams.get("action")) router.replace("/invoices");
 router.refresh();
 }} />
 <InvoiceImportModal open={importOpen} onClose={() => {
 setImportOpen(false);
 if (searchParams.get("action")) router.replace("/invoices");
 router.refresh();
 }} />
 </>
 );
}

// ---------------------------------------------------------------------------
// SetupGuide — the guiding empty state for a brand-new org (0 invoices).
//
// The one-screen signup gets a customer INTO the app fast; this is where they
// learn what to do next. It lays out the 3 prerequisites to a first approved
// invoice, in order, each with a direct action:
//   1. Cost codes  → /admin/cost-codes   (the trades invoices are coded to)
//   2. First job   → /jobs/new           (every invoice ties to a job)
//   3. Upload      → the upload modal     (parse → review → approve)
// Financial defaults (GC fee / deposit / payment schedule) and team invites
// live in Settings and are prompted later (at draw-creation), so they are
// intentionally NOT in this first-run path.
// ---------------------------------------------------------------------------
function SetupGuide({
  onUpload,
  costCodes,
  jobs,
  invoicesCount,
}: {
  onUpload: () => void;
  costCodes: number;
  jobs: number;
  invoicesCount: number;
}) {
  const doneCount = (costCodes > 0 ? 1 : 0) + (jobs > 0 ? 1 : 0) + (invoicesCount > 0 ? 1 : 0);
  return (
    <div className="border border-dashed border-[var(--border-default)] bg-[var(--bg-card)] px-6 py-12 animate-fade-up">
      <div className="max-w-xl mx-auto text-center">
        <span
          className="text-[10px] uppercase text-[color:var(--text-tertiary)]"
          style={{ fontFamily: "var(--font-jetbrains-mono)", letterSpacing: "0.14em" }}
        >
          Welcome to Nightwork
        </span>
        <h3 className="mt-2 font-display text-xl text-[color:var(--text-primary)]">
          {doneCount === 0
            ? "Three steps to your first invoice"
            : doneCount >= 2
            ? "Almost there — upload your first invoice"
            : "Keep going to your first invoice"}
        </h3>
        <p className="mt-1 text-sm text-[color:var(--text-secondary)]">
          Set up the essentials, then upload and approve invoices — all in one place.
        </p>
      </div>

      <ol className="mt-8 max-w-xl mx-auto flex flex-col gap-3">
        <SetupStep
          n={1}
          done={costCodes > 0}
          title="Set up your cost codes"
          desc="The trades you track — Framing, Electrical, Plumbing. Invoices get coded against these."
          action={{ label: "Set up cost codes", href: "/admin/cost-codes" }}
        />
        <SetupStep
          n={2}
          done={jobs > 0}
          title="Add your first job"
          desc="The project your invoices bill against. Every invoice ties to a job."
          action={{ label: "Add a job", href: "/jobs/new" }}
        />
        <SetupStep
          n={3}
          done={invoicesCount > 0}
          title="Upload your first invoice"
          desc="PDF, Word, or a photo — we parse the vendor, amount, and line items for you to review."
          action={{ label: "Upload invoice", onClick: onUpload }}
          primary
        />
      </ol>

      <p className="mt-6 text-center text-[11px] text-[color:var(--text-tertiary)]">
        GC fee, deposit, and payment schedule live in Settings — we&rsquo;ll prompt you when you create your first draw.
      </p>
    </div>
  );
}

function SetupStep({
  n,
  done,
  title,
  desc,
  action,
  primary,
}: {
  n: number;
  done?: boolean;
  title: string;
  desc: string;
  action: { label: string; href: string } | { label: string; onClick: () => void };
  primary?: boolean;
}) {
  const btnCls = primary
    ? "inline-block px-4 py-2 bg-[var(--nw-stone-blue)] text-[color:var(--nw-white-sand)] text-sm hover:bg-[var(--nw-gulf-blue)] transition-colors whitespace-nowrap"
    : "inline-block px-4 py-2 border border-[var(--border-default)] bg-[var(--bg-card)] text-[color:var(--text-primary)] text-sm hover:border-[rgba(91,134,153,0.5)] transition-colors whitespace-nowrap";
  return (
    <li
      className={`flex items-start gap-4 border border-[var(--border-default)] px-4 py-4 ${
        done ? "bg-[var(--bg-subtle)]" : "bg-[var(--bg-page)]"
      }`}
    >
      <span
        className={`shrink-0 w-8 h-8 flex items-center justify-center border text-[13px] ${
          done
            ? "border-[color:var(--nw-success)] text-[color:var(--nw-success)]"
            : "border-[var(--border-strong)] text-[color:var(--text-primary)]"
        }`}
        style={{ fontFamily: "var(--font-jetbrains-mono)" }}
      >
        {done ? "✓" : n}
      </span>
      <div className="flex-1 min-w-0 text-left">
        <h4 className="font-display text-[15px] text-[color:var(--text-primary)]">{title}</h4>
        <p className="mt-0.5 text-[13px] text-[color:var(--text-secondary)] leading-relaxed">{desc}</p>
      </div>
      <div className="shrink-0 self-center">
        {done ? (
          "href" in action ? (
            <Link
              href={action.href}
              className="inline-flex items-center gap-1.5 text-[13px] text-[color:var(--nw-success)] hover:underline whitespace-nowrap"
            >
              ✓ Done
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-[color:var(--nw-success)] whitespace-nowrap">
              ✓ Done
            </span>
          )
        ) : "href" in action ? (
          <Link href={action.href} className={btnCls}>
            {action.label}
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className={btnCls}>
            {action.label}
          </button>
        )}
      </div>
    </li>
  );
}
