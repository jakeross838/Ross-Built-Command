"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNewJob } from "@/components/new-job/NewJobProvider";

// The old full-page New Job form is gone — creation is a slide-over now
// (Exemplar 1, Pattern 1: never a page navigation for create). Any lingering
// link/bookmark to /jobs/new lands on the Bills view with the slide-over open.
export default function NewJobRedirect() {
  const router = useRouter();
  const { open } = useNewJob();

  useEffect(() => {
    router.replace("/financials/bills");
    open();
  }, [router, open]);

  return null;
}
