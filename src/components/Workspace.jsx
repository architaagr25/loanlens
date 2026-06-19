"use client";

import { useMemo } from "react";
import { useSharedState } from "@/hooks/useSharedState";
import { summarize } from "@/lib/emi";
import Header from "./Header";
import ModeTabs from "./ModeTabs";
import InputPanel from "./InputPanel";
import SummaryCards from "./SummaryCards";
import PrincipalInterestBar from "./PrincipalInterestBar";

// Top-level layout. Reads the synced inputs, derives the summary (memoized so
// it only recomputes when inputs change), and renders the active mode.
export default function Workspace() {
  const { state } = useSharedState();
  const { amount, rate, tenure, mode } = state;

  const summary = useMemo(
    () => summarize(amount, rate, tenure),
    [amount, rate, tenure]
  );

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <Header />
      <ModeTabs />

      {mode === "single" && (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_1fr] gap-5 items-start">
          <InputPanel />

          <div className="space-y-5">
            <section className="card p-5 space-y-5">
              <h2 className="font-semibold">Summary</h2>
              <SummaryCards
                emi={summary.emi}
                totalInterest={summary.totalInterest}
                totalPayable={summary.totalPayable}
              />
              <PrincipalInterestBar
                principal={amount}
                totalInterest={summary.totalInterest}
                principalPct={summary.principalPct}
                interestPct={summary.interestPct}
              />
            </section>

            {/* Sensitivity grid arrives in Phase 6 */}
            <Placeholder title="Sensitivity Analysis" note="Coming in Phase 6" />
          </div>
        </div>
      )}

      {mode === "compare" && (
        <Placeholder title="Compare Scenarios" note="Coming in Phase 6" />
      )}

      {mode === "prepayment" && (
        <Placeholder title="Prepayment Planner" note="Coming in Phase 7" />
      )}

      {/* Amortization schedule (single & prepayment) arrives in Phase 5 */}
      {mode !== "compare" && (
        <Placeholder title="Amortization Schedule" note="Coming in Phase 5" />
      )}
    </div>
  );
}

function Placeholder({ title, note }) {
  return (
    <section className="card p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-muted text-sm mt-1">{note}</p>
    </section>
  );
}
