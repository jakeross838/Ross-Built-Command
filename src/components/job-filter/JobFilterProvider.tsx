"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// ── Job filter (PART 2) ─────────────────────────────────────────────────────
// A single cross-surface job filter, driven by the left rail on Invoices +
// Draws. Selecting a job filters the current list IN PLACE (never navigation).
// The selection persists across surface switches (Invoices ↔ Draws) — the
// provider is mounted once in the root layout and mirrors the selection to
// sessionStorage, so it also survives a Price-Intel round-trip or a reload.
// Jobs load via a server route (standing pattern — no client-auth mount fetch).

export interface JobFilterOption {
  id: string;
  name: string;
  status?: string;
}

interface JobFilterApi {
  jobs: JobFilterOption[];
  jobsLoaded: boolean;
  selectedJobId: string | null;
  selectedJobName: string | null;
  select: (id: string, name: string) => void;
  clear: () => void;
  /** Trigger the one-time server load of the org job list (called by the rail). */
  ensureLoaded: () => void;
}

const JobFilterContext = createContext<JobFilterApi>({
  jobs: [],
  jobsLoaded: false,
  selectedJobId: null,
  selectedJobName: null,
  select: () => {},
  clear: () => {},
  ensureLoaded: () => {},
});

export function useJobFilter() {
  return useContext(JobFilterContext);
}

const SS_KEY = "nw_job_filter";

export function JobFilterProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<JobFilterOption[]>([]);
  const [jobsLoaded, setJobsLoaded] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedJobName, setSelectedJobName] = useState<string | null>(null);
  const loadingRef = useRef(false);

  // Restore the selection from sessionStorage on mount.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SS_KEY);
      if (raw) {
        const v = JSON.parse(raw) as { id?: string; name?: string };
        if (v?.id) {
          setSelectedJobId(v.id);
          setSelectedJobName(v.name ?? null);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((id: string | null, name: string | null) => {
    try {
      if (id) sessionStorage.setItem(SS_KEY, JSON.stringify({ id, name }));
      else sessionStorage.removeItem(SS_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const select = useCallback(
    (id: string, name: string) => {
      setSelectedJobId(id);
      setSelectedJobName(name);
      persist(id, name);
    },
    [persist],
  );

  const clear = useCallback(() => {
    setSelectedJobId(null);
    setSelectedJobName(null);
    persist(null, null);
  }, [persist]);

  const ensureLoaded = useCallback(() => {
    if (loadingRef.current || jobsLoaded) return;
    loadingRef.current = true;
    fetch("/api/jobs/list", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { jobs?: JobFilterOption[] } | null) => {
        if (d?.jobs) setJobs(d.jobs);
        setJobsLoaded(true);
      })
      .catch(() => setJobsLoaded(true))
      .finally(() => {
        loadingRef.current = false;
      });
  }, [jobsLoaded]);

  // Optimistic: a job created via the New Job slide-over appears in the rail
  // immediately (Pattern 5).
  useEffect(() => {
    const onCreated = (e: Event) => {
      const detail = (e as CustomEvent<{ id?: string; name?: string }>).detail;
      if (!detail?.id || !detail?.name) return;
      const id = detail.id;
      const name = detail.name;
      setJobs((prev) =>
        prev.some((j) => j.id === id)
          ? prev
          : [...prev, { id, name }].sort((a, b) => a.name.localeCompare(b.name)),
      );
    };
    window.addEventListener("nw:job-created", onCreated as EventListener);
    return () => window.removeEventListener("nw:job-created", onCreated as EventListener);
  }, []);

  return (
    <JobFilterContext.Provider
      value={{ jobs, jobsLoaded, selectedJobId, selectedJobName, select, clear, ensureLoaded }}
    >
      {children}
    </JobFilterContext.Provider>
  );
}
