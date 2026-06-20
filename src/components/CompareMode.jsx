"use client";

import { useMemo } from "react";
import { useSharedState } from "@/hooks/useSharedState";
import { summarize, lowestCostScenarioIndex } from "@/lib/emi";
import { MAX_SCENARIOS, DEFAULT_STATE } from "@/lib/constants";
import ScenarioCard from "./ScenarioCard";

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return "s-" + crypto.randomUUID().slice(0, 6);
  }
  return "s-" + Math.random().toString(36).slice(2, 8);
}

// up to 3 scenarios side by side, cheapest one highlighted. scenarios live in
// shared state so they sync across tabs. editing one marks it as "last active"
// so it can seed the single calculator when you switch back.
export default function CompareMode() {
  const { state, patch } = useSharedState();
  const { scenarios } = state;

  const summaries = useMemo(
    () => scenarios.map((s) => summarize(s.amount, s.rate, s.tenure)),
    [scenarios]
  );
  const bestIndex = useMemo(
    () => lowestCostScenarioIndex(scenarios),
    [scenarios]
  );

  const updateScenario = (id, partial) => {
    const next = scenarios.map((s) => (s.id === id ? { ...s, ...partial } : s));
    patch({ scenarios: next, lastActiveScenarioId: id });
  };

  const addScenario = () => {
    if (scenarios.length >= MAX_SCENARIOS) return;
    const base = scenarios[scenarios.length - 1] ?? DEFAULT_STATE;
    const scenario = {
      id: newId(),
      name: `Scenario ${scenarios.length + 1}`,
      amount: base.amount,
      rate: base.rate,
      tenure: base.tenure,
    };
    patch({
      scenarios: [...scenarios, scenario],
      lastActiveScenarioId: scenario.id,
    });
  };

  const removeScenario = (id) => {
    if (scenarios.length <= 1) return; // keep at least one card around
    patch({ scenarios: scenarios.filter((s) => s.id !== id) });
  };

  return (
    <section className="card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b divider pb-4 -mx-5 px-5">
        <div>
          <h2 className="font-semibold">Compare Scenarios</h2>
          <p className="text-muted text-xs">
            Configure up to {MAX_SCENARIOS} scenarios — the lowest total cost is
            highlighted.
          </p>
        </div>
        <button
          onClick={addScenario}
          disabled={scenarios.length >= MAX_SCENARIOS}
          className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium disabled:opacity-40"
        >
          + Add Scenario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((s, i) => (
          <ScenarioCard
            key={s.id}
            scenario={s}
            summary={summaries[i]}
            isBest={i === bestIndex && scenarios.length > 1}
            canRemove={scenarios.length > 1}
            onChange={(partial) => updateScenario(s.id, partial)}
            onRemove={() => removeScenario(s.id)}
          />
        ))}
      </div>
    </section>
  );
}
