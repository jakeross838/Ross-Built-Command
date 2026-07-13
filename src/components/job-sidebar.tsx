"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useNewJob } from "@/components/new-job/NewJobProvider";

type UserRole = "owner" | "admin" | "pm" | "accounting";
type SortKey = "alpha" | "status" | "recent";
type FilterKey = "all" | "mine";

interface SidebarJob {
  id: string;
  name: string;
  address: string | null;
  status: string;
  // F1-Wave-B Slice-1 B-1a-bis: client identity reads from clients table via
  // jobs.client_id FK. PostgREST embed narrowed to (id, full_name) per Q1 PII
  // fence (D-078 + D-079 + nwrp153). client_email is REMOVED — mailto restoration
  // deferred to F3 magic-link work per TD-B1abis-01.
  client: { id: string; full_name: string } | null;
  pm_id: string | null;
  updated_at: string;
}

const COLLAPSE_KEY = "nightwork:sidebar-collapsed";

function statusDot(status: string): string {
  if (status === "active") return "bg-[var(--dot-active)]";
  if (status === "complete") return "bg-[var(--dot-complete)]";
  if (status === "warranty") return "bg-[var(--dot-warranty)]";
  return "bg-[var(--dot-complete)]";
}

function statusLabel(status: string): string {
  if (status === "active") return "Active";
  if (status === "complete") return "Complete";
  if (status === "warranty") return "Warranty";
  if (status === "cancelled") return "Cancelled";
  return status;
}

export default function JobSidebar({ mobile }: { mobile?: boolean } = {}) {
  const pathname = usePathname();
  // 3.4 ONE NEW-JOB — open the create drawer in place, not a /jobs/new nav.
  const { open: openNewJob } = useNewJob();
  const [jobs, setJobs] = useState<SidebarJob[]>([]);
  const [role, setRole] = useState<UserRole | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("alpha");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(true);
  // nwrp290: never spin forever. loadError surfaces a retry state instead of a
  // permanent spinner when auth.getUser() returns null or a fetch hangs/errors;
  // reloadKey re-runs both effects on retry.
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Parse current job ID and tab from pathname
  const currentJobId = useMemo(() => {
    const m = pathname.match(/^\/jobs\/([a-f0-9-]+)/);
    return m?.[1] ?? null;
  }, [pathname]);

  const currentTab = useMemo(() => {
    const m = pathname.match(/^\/jobs\/[a-f0-9-]+\/(.*)/);
    return m?.[1] ?? "";
  }, [pathname]);

  // Load collapse state from localStorage
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(COLLAPSE_KEY) : null;
    if (stored === "1") setCollapsed(true);
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  // Fetch user info (re-runs on retry via reloadKey)
  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;
        if (!user) {
          // No client session (e.g. hydration race). Don't spin forever —
          // surface a retry state. A transient resolves on retry; a real
          // signed-out state shows the fallback instead of a dead spinner.
          setLoadError(true);
          setLoading(false);
          return;
        }
        setUserId(user.id);

        const { data: membership } = await supabase
          .from("org_members")
          .select("role")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;
        const userRole = (membership?.role as UserRole) ?? null;
        setRole(userRole);
        if (userRole === "pm") setFilter("mine");
      } catch {
        if (!cancelled) {
          setLoadError(true);
          setLoading(false);
        }
      }
    }
    loadUser();
    return () => { cancelled = true; };
  }, [reloadKey]);

  // Fetch jobs — refetches when filter changes so the server
  // only sends what the user should see (F-012 fix).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function loadJobs() {
      setLoading(true);
      setLoadError(false);
      try {
        let query = supabase
          .from("jobs")
          .select("id, name, address, status, client:clients(id, full_name), pm_id, updated_at")
          .is("deleted_at", null)
          .order("name");

        if (filter === "mine" && role === "pm") {
          query = query.eq("pm_id", userId);
        }

        const { data: jobsData, error } = await query;
        if (cancelled) return;
        if (error) throw error;
        // F1-Wave-B Slice-1 B-1a-bis: normalize PostgREST embed shape. Supabase
        // typegen returns `client:clients(...)` as an array even though the FK
        // relationship is many-to-one (jobs.client_id -> clients.id); coerce to
        // single object for consumer consistency.
        type RawSidebarRow = Omit<SidebarJob, "client"> & {
          client: { id: string; full_name: string } | { id: string; full_name: string }[] | null;
        };
        const normalized: SidebarJob[] = ((jobsData ?? []) as unknown as RawSidebarRow[]).map((j) => ({
          ...j,
          client: Array.isArray(j.client) ? (j.client[0] ?? null) : j.client,
        }));
        setJobs(normalized);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadJobs();
    return () => { cancelled = true; };
  }, [userId, filter, role, reloadKey]);

  // nwrp290 failsafe: if loading hasn't resolved within 10s (getUser or the
  // jobs query hung and never settled), surface the retry state instead of an
  // indefinite spinner. Resolving loading->false clears the timer via cleanup.
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      setLoading(false);
      setLoadError(true);
    }, 10000);
    return () => clearTimeout(t);
  }, [loading, reloadKey]);

  const retry = useCallback(() => {
    setLoadError(false);
    setLoading(true);
    setReloadKey((k) => k + 1);
  }, []);

  // Search + sort (pm_id filter is now server-side)
  const filtered = useMemo(() => {
    let list = jobs;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (j) =>
          j.name.toLowerCase().includes(q) ||
          (j.address ?? "").toLowerCase().includes(q)
      );
    }
    if (sort === "alpha") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "status") list = [...list].sort((a, b) => a.status.localeCompare(b.status) || a.name.localeCompare(b.name));
    else if (sort === "recent") list = [...list].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return list;
  }, [jobs, search, sort]);

  const selectedJob = useMemo(
    () => (currentJobId ? jobs.find((j) => j.id === currentJobId) ?? null : null),
    [jobs, currentJobId]
  );

  const otherJobs = useMemo(
    () => filtered.filter((j) => j.id !== currentJobId),
    [filtered, currentJobId]
  );

  const canCreateJob = role === "owner" || role === "admin";

  function jobHref(jobId: string): string {
    if (currentTab) return `/jobs/${jobId}/${currentTab}`;
    return `/jobs/${jobId}`;
  }

  // Mobile mode: render job list inline for the drawer (no collapse, no aside wrapper)
  if (mobile) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 space-y-2">
          {canCreateJob && (
            <button
              type="button"
              onClick={openNewJob}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 text-[11px] tracking-[0.06em] uppercase font-medium border border-nw-stone-blue text-nw-stone-blue hover:bg-nw-stone-blue hover:text-[color:var(--nw-white-sand)] transition-colors"
            >
              + New Job
            </button>
          )}
          {role === "pm" && (
            <div className="flex gap-1 bg-[var(--bg-subtle)] border border-[var(--border-default)] p-0.5">
              <button type="button" onClick={() => setFilter("mine")}
                className={`flex-1 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                  filter === "mine" ? "bg-[var(--bg-card)] text-[color:var(--text-primary)] font-medium shadow-sm" : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                }`}
                style={{ fontFamily: "var(--font-mono)" }}
              >My Jobs</button>
              <button type="button" onClick={() => setFilter("all")}
                className={`flex-1 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                  filter === "all" ? "bg-[var(--bg-card)] text-[color:var(--text-primary)] font-medium shadow-sm" : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                }`}
                style={{ fontFamily: "var(--font-mono)" }}
              >All Jobs</button>
            </div>
          )}
          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1.5 text-xs border border-[var(--border-default)] bg-[var(--bg-card)] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-secondary)]/50 focus:outline-none focus:border-nw-stone-blue" />
        </div>
        {selectedJob && (
          <div className="px-3 pb-3 border-b border-[var(--border-default)] bg-[rgba(91,134,153,0.05)]">
            <p className="text-sm font-medium text-[color:var(--text-primary)]">{selectedJob.name}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusDot(selectedJob.status)}`} />
              <span
                className="text-[10px] uppercase tracking-wider text-[color:var(--text-secondary)]"
                style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}
              >{statusLabel(selectedJob.status)}</span>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {loadError ? (
            <div className="p-4 text-center space-y-2">
              <p className="text-xs text-[color:var(--text-secondary)]">Couldn&apos;t load jobs.</p>
              <button
                type="button"
                onClick={retry}
                className="px-3 py-1 text-[11px] uppercase tracking-[0.06em] font-medium border border-nw-stone-blue text-nw-stone-blue hover:bg-nw-stone-blue hover:text-[color:var(--nw-white-sand)] transition-colors"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="p-4 text-center">
              <div className="w-5 h-5 border-2 border-[rgba(91,134,153,0.3)] border-t-nw-stone-blue animate-spin mx-auto" />
            </div>
          ) : otherJobs.length === 0 ? (
            <p className="p-3 text-xs text-[color:var(--text-secondary)] text-center">{search ? "No matches" : "No jobs"}</p>
          ) : (
            otherJobs.map((j) => (
              <Link key={j.id} href={jobHref(j.id)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-[rgba(91,134,153,0.04)] border-b border-[var(--border-default)]/30"
                title={j.address ?? j.name}>
                <span className={`shrink-0 inline-block w-1.5 h-1.5 rounded-full ${statusDot(j.status)}`} />
                <span className="truncate text-[color:var(--text-primary)] text-[13px]">{j.name}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    );
  }

  // Collapsed rail
  if (collapsed) {
    return (
      <aside
        data-component="job-sidebar"
        className="hidden md:flex flex-col items-center w-12 shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-card)] py-4 gap-3"
      >
        <button
          onClick={toggleCollapse}
          className="w-8 h-8 flex items-center justify-center text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div className="flex-1 overflow-y-auto w-full">
          {filtered.slice(0, 20).map((j) => {
            const active = j.id === currentJobId;
            return (
              <Link
                key={j.id}
                href={jobHref(j.id)}
                className={`block w-full py-2 px-1 text-center transition-colors ${
                  active ? "bg-[rgba(91,134,153,0.08)] border-l-2 border-nw-stone-blue" : "hover:bg-[rgba(91,134,153,0.04)]"
                }`}
                title={j.name}
              >
                <span className={`inline-block w-2 h-2 rounded-full ${statusDot(j.status)}`} />
              </Link>
            );
          })}
        </div>
      </aside>
    );
  }

  // Expanded sidebar
  return (
    <aside
      data-component="job-sidebar"
      className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden"
    >
      {/* Header */}
      <div className="p-3 border-b border-[var(--border-default)] space-y-2">
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] tracking-[0.12em] uppercase text-[color:var(--text-secondary)] font-medium"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Jobs
          </span>
          <button
            onClick={toggleCollapse}
            className="w-6 h-6 flex items-center justify-center text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {canCreateJob && (
          <button
            type="button"
            onClick={openNewJob}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 text-[11px] tracking-[0.06em] uppercase font-medium border border-nw-stone-blue text-nw-stone-blue hover:bg-nw-stone-blue hover:text-[color:var(--nw-white-sand)] transition-colors"
          >
            + New Job
          </button>
        )}

        {/* Filter toggle — only shown for PMs who have a meaningful distinction */}
        {role === "pm" && (
          <div className="flex gap-1 bg-[var(--bg-subtle)] border border-[var(--border-default)] p-0.5">
            <button
              type="button"
              onClick={() => setFilter("mine")}
              className={`flex-1 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                filter === "mine" ? "bg-[var(--bg-card)] text-[color:var(--text-primary)] font-medium shadow-sm" : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
              }`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              My Jobs
            </button>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`flex-1 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                filter === "all" ? "bg-[var(--bg-card)] text-[color:var(--text-primary)] font-medium shadow-sm" : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
              }`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              All Jobs
            </button>
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-2 py-1.5 text-xs border border-[var(--border-default)] bg-[var(--bg-card)] text-[color:var(--text-primary)] placeholder:text-[color:var(--text-secondary)]/50 focus:outline-none focus:border-nw-stone-blue"
        />

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="w-full px-2 py-1 text-[10px] border border-[var(--border-default)] bg-[var(--bg-card)] text-[color:var(--text-secondary)] focus:outline-none focus:border-nw-stone-blue"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          <option value="alpha">A-Z</option>
          <option value="status">Status</option>
          <option value="recent">Recent</option>
        </select>
      </div>

      {/* Selected job details */}
      {selectedJob && (
        <div className="p-3 border-b border-[var(--border-default)] bg-[rgba(91,134,153,0.05)]">
          <p className="text-sm font-medium text-[color:var(--text-primary)] truncate">{selectedJob.name}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusDot(selectedJob.status)}`} />
            <span
              className="text-[10px] uppercase text-[color:var(--text-secondary)]"
              style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}
            >
              {statusLabel(selectedJob.status)}
            </span>
          </div>
          {selectedJob.client?.full_name && (
            <p className="text-[11px] text-[color:var(--text-secondary)] mt-1.5 truncate">{selectedJob.client.full_name}</p>
          )}
          {selectedJob.address && (
            <p className="text-[11px] text-[color:var(--text-secondary)] mt-0.5 truncate">{selectedJob.address}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            {/* F1-Wave-B Slice-1 B-1a-bis interim affordance per ITER-2-PATCHES §3.11
                + TD-B1abis-01: client email + mailto link removed pending F3 magic-link
                + Owner Portal Path A (Slice-2 Plan B-2). Email restoration ships via
                /api/clients/[id] GET endpoint (admin-gated), NOT a PostgREST embed. */}
            {selectedJob.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedJob.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-nw-gulf-blue hover:underline"
                title="View on map"
              >
                Map
              </a>
            )}
          </div>
        </div>
      )}

      {/* Job list */}
      <div className="flex-1 overflow-y-auto">
        <Link
          href="/jobs"
          className="block px-3 py-2 text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] border-b border-[var(--border-default)]/50"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          All {filtered.length} Job{filtered.length !== 1 ? "s" : ""}
        </Link>
        {loadError ? (
          <div className="p-4 text-center space-y-2">
            <p className="text-xs text-[color:var(--text-secondary)]">Couldn&apos;t load jobs.</p>
            <button
              type="button"
              onClick={retry}
              className="px-3 py-1 text-[11px] uppercase tracking-[0.06em] font-medium border border-nw-stone-blue text-nw-stone-blue hover:bg-nw-stone-blue hover:text-[color:var(--nw-white-sand)] transition-colors"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="p-4 text-center">
            <div className="w-5 h-5 border-2 border-[rgba(91,134,153,0.3)] border-t-nw-stone-blue animate-spin mx-auto" />
          </div>
        ) : otherJobs.length === 0 ? (
          <p className="p-3 text-xs text-[color:var(--text-secondary)] text-center">
            {search ? "No matches" : "No other jobs"}
          </p>
        ) : (
          otherJobs.map((j) => (
            <Link
              key={j.id}
              href={jobHref(j.id)}
              className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[rgba(91,134,153,0.04)] border-b border-[var(--border-default)]/30"
              title={j.address ?? j.name}
            >
              <span className={`shrink-0 inline-block w-1.5 h-1.5 rounded-full ${statusDot(j.status)}`} />
              <span className="truncate text-[color:var(--text-primary)] text-[13px]">{j.name}</span>
            </Link>
          ))
        )}
      </div>
    </aside>
  );
}
