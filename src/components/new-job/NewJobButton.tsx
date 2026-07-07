"use client";

import { useNewJob } from "@/components/new-job/NewJobProvider";

// Global "＋ NEW JOB" accent button for the top nav. Opens the New Job
// slide-over from any module (Exemplar 1 trigger). Accent + raised affordance
// (Pattern 7); reads well on the slate-deep nav bar.
export default function NewJobButton({ full = false }: { full?: boolean }) {
  const { open } = useNewJob();
  return (
    <button
      type="button"
      onClick={open}
      style={{ fontFamily: "var(--font-jetbrains-mono)", letterSpacing: "0.12em" }}
      className={[
        "inline-flex h-[32px] items-center justify-center gap-1.5 px-3 text-[11px] font-medium uppercase leading-none",
        "border border-nw-gulf-blue bg-nw-stone-blue text-nw-white-sand",
        "shadow-[var(--shadow-raise-accent)] transition-all duration-150",
        "hover:-translate-y-px hover:bg-nw-gulf-blue active:translate-y-px active:shadow-[var(--shadow-raise-accent-active)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nw-white-sand/40",
        full ? "w-full" : "",
      ].join(" ")}
    >
      <span aria-hidden className="text-[14px] leading-none">
        +
      </span>
      New Job
    </button>
  );
}
