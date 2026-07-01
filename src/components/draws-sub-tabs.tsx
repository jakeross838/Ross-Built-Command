"use client";

import Link from "next/link";

// Gate-2 strip (2026-07): Lien Releases tab dropped — /jobs/[id]/lien-releases is
// now 404'd by PROJECT_OPS. Only the Draws tab renders. The full list + the
// "liens" key are kept so the (now-hidden) lien-releases page still typechecks
// and the tab can be restored on un-hide.
const ALL_TABS = [
  { key: "draws", label: "Draws", slug: "/draws" },
  { key: "liens", label: "Lien Releases", slug: "/lien-releases" },
] as const;

export type DrawsSection = (typeof ALL_TABS)[number]["key"];

const TABS = ALL_TABS.filter((t) => t.key === "draws");

export default function DrawsSubTabs({
  jobId,
  active,
}: {
  jobId: string;
  active: DrawsSection;
}) {
  return (
    <div className="flex items-center gap-1 mb-5 border-b border-[var(--border-default)]/50">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={`/jobs/${jobId}${tab.slug}`}
            className={`relative px-3 py-2 text-xs tracking-[0.04em] font-medium transition-colors whitespace-nowrap ${
              isActive ? "text-[color:var(--text-primary)]" : "text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[var(--nw-stone-blue)]" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
