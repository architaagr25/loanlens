"use client";

import { useSharedState } from "@/hooks/useSharedState";

const ICONS = {
  // single - a panel/layout square
  single: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
    </svg>
  ),
  // compare - two columns side by side
  compare: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="18" rx="1" />
      <rect x="14" y="3" width="7" height="18" rx="1" />
    </svg>
  ),
  // prepayment - rupee sign
  prepayment: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h12M6 9h12M16 4c0 5-4 6-8 6 3 0 8 1 8 6l-6-6" />
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
    <div className="card p-1.5 inline-flex gap-1">
      {MODES.map((m) => {
        const active = state.mode === m.key;
        return (
          <button
            key={m.key}
            onClick={() => switchTo(m.key)}
            className={
              "px-4 py-2 rounded-lg text-sm font-medium transition inline-flex items-center gap-2 " +
              (active
                ? "bg-brand-600 text-white"
                : "hover:bg-black/5 dark:hover:bg-white/5 text-muted")
            }
          >
            {ICONS[m.key]}
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
