"use client";

import { useSharedState } from "@/hooks/useSharedState";

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
