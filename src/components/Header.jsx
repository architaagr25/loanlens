"use client";

import { usePresence } from "@/hooks/usePresence";
import ThemeToggle from "./ThemeToggle";
import UndoRedo from "./UndoRedo";

// Top bar: product identity on the left; tab id + LEADER badge + live tab count
// + theme toggle on the right (matches the design reference header).
export default function Header() {
  const { label, tabCount, isLeader } = usePresence();

  return (
    <header className="card px-5 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-600 grid place-items-center text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="M7 14l4-4 3 3 5-6" />
          </svg>
        </div>
        <div>
          <h1 className="font-bold leading-tight">EMI Workspace</h1>
          <p className="text-muted text-xs">Loan calculator · synced across tabs</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <UndoRedo />
        <span className="card-muted px-2.5 py-1 rounded-lg text-sm font-medium">
          {label}
        </span>
        {isLeader && (
          <span className="px-2 py-1 rounded-lg bg-brand-100 text-brand-700 text-[11px] font-semibold tracking-wide">
            LEADER
          </span>
        )}
        <span className="card-muted px-2.5 py-1 rounded-lg text-sm flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          {tabCount} {tabCount === 1 ? "tab" : "tabs"}
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}
