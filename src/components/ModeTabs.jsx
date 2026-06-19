"use client";

import { useSharedState } from "@/hooks/useSharedState";

const MODES = [
  { key: "single", label: "Single" },
  { key: "compare", label: "Compare" },
  { key: "prepayment", label: "Prepayment" },
];

// Single | Compare | Prepayment switcher. The active mode is synced, so all
// tabs follow when one switches.
export default function ModeTabs() {
  const { state, setMode } = useSharedState();

  return (
    <div className="card p-1.5 inline-flex gap-1">
      {MODES.map((m) => {
        const active = state.mode === m.key;
        return (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={
              "px-4 py-2 rounded-lg text-sm font-medium transition " +
              (active
                ? "bg-brand-600 text-white"
                : "hover:bg-black/5 dark:hover:bg-white/5 text-muted")
            }
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
