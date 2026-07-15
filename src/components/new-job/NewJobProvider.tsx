"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import NewJobModal from "./NewJobModal";

// Global New Job host. Mounted once in the root layout so the "＋ NEW JOB" nav
// button (or any surface) can open it from anywhere. Container is the centered
// PopModal (one overlay language) — the slide-over was retired for this surface.

interface NewJobApi {
  open: () => void;
}

const NewJobContext = createContext<NewJobApi>({ open: () => {} });

export function useNewJob() {
  return useContext(NewJobContext);
}

export function NewJobProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <NewJobContext.Provider value={{ open }}>
      {children}
      <NewJobModal open={isOpen} onClose={close} />
    </NewJobContext.Provider>
  );
}
