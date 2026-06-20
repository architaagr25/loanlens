"use client";

import { useSharedState } from "@/hooks/useSharedState";

const ICONS = {
  // single - a square with a minus (one item)
  single: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  // compare - two columns side by side
  compare: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="18" rx="1" />
      <rect x="14" y="3" width="7" height="18" rx="1" />
    </svg>
  ),
  // prepayment - dollar sign
  prepayment: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
};

const MODES = [
  { key: "single", label: "Single" },
  { key: "compare", label: "Compare" },
  { key: "prepayment", label: "Prepayment" },
];

// the Single | Compare | Prepayment switch. mode is synced so all tabs follow.
export default function ModeTabs() {
  const { state, setMode, patch } = useSharedState();

  // going Compare -> Single carries over the last scenario you touched into the
  // single calculator. every other switch just changes the mode.
  const switchTo = (key) => {
    if (
      key === "single" &&
      state.mode === "compare" &&
      state.scenarios.length > 0
    ) {
      const last =
        state.scenarios.find((s) => s.id === state.lastActiveScenarioId) ??
        state.scenarios[0];
      patch({
        mode: "single",
        amount: last.amount,
        rate: last.rate,
        tenure: last.tenure,
      });
    } else {
      setMode(key);
    }
  };

  return (
    <div className="card p-1.5 flex w-full sm:w-auto sm:inline-flex gap-1">
      {MODES.map((m) => {
        const active = state.mode === m.key;
        return (
          <button
            key={m.key}
            onClick={() => switchTo(m.key)}
            className={
              "flex-1 sm:flex-none min-w-0 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition inline-flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 whitespace-nowrap " +
              (active
                ? "bg-brand-600 text-white"
                : "hover:bg-black/5 dark:hover:bg-white/5 text-muted")
            }
          >
            <span className="inline-flex">{ICONS[m.key]}</span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
