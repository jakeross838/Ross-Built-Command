"use client";

import { useEffect } from "react";
import { useJobFilter } from "./JobFilterProvider";

// Left job-filter rail (PART 2): ~220px, shown on the Invoices + Draws surfaces
// (gated in AppShell). "All Jobs" clears the filter; clicking a job filters the
// current list in place. It is a FILTER, not navigation — never routes to a
// job page. Sticks below the 54px nav. Desktop only (md+).
export default function JobFilterRail() {
  const { jobs, jobsLoaded, selectedJobId, select, clear, ensureLoaded } = useJobFilter();

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  const rowClass = (active: boolean) =>
    [
      "block w-full truncate border-l-2 px-4 py-2 text-left text-[13px] transition-colors",
      active
        ? "border-l-nw-stone-blue bg-[var(--bg-subtle)] font-medium text-[color:var(--text-primary)]"
        : "border-l-transparent text-[color:var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[color:var(--text-primary)]",
    ].join(" ");

  return (
    <aside className="hidden w-[220px] shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-card)] md:block">
      <div className="sticky top-[54px] max-h-[calc(100vh-54px)] overflow-y-auto">
        <div className="border-b border-[var(--border-default)] px-4 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
            Jobs
          </span>
        </div>
        <nav className="py-1">
          <button type="button" onClick={clear} className={rowClass(selectedJobId === null)}>
            All Jobs
          </button>
          {jobs.map((j) => (
            <button
              key={j.id}
              type="button"
              onClick={() => select(j.id, j.name)}
              className={rowClass(selectedJobId === j.id)}
              title={j.name}
            >
              {j.name}
            </button>
          ))}
          {jobsLoaded && jobs.length === 0 && (
            <p className="px-4 py-2 text-[12px] text-[color:var(--text-tertiary)]">No jobs yet</p>
          )}
        </nav>
      </div>
    </aside>
  );
}
