"use client";

import { useMemo } from "react";
import { useSharedState } from "@/hooks/useSharedState";
import { summarize } from "@/lib/emi";
import Header from "./Header";
import ModeTabs from "./ModeTabs";
import InputPanel from "./InputPanel";
import SummaryCards from "./SummaryCards";
import PrincipalInterestBar from "./PrincipalInterestBar";
import AmortizationView from "./AmortizationView";
import SensitivityGrid from "./SensitivityGrid";
import CompareMode from "./CompareMode";
import PrepaymentPlanner from "./PrepaymentPlanner";

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

            <SensitivityGrid />
          </div>
        </div>
      )}

      {mode === "compare" && <CompareMode />}

      {mode === "prepayment" && (
        <>
          <PrepaymentPlanner />
          <AmortizationView
            title="Adjusted Schedule"
            subtitle="Amortization reflecting your prepayments"
            usePrepayments
          />
        </>
      )}

      {/* Single mode shows the base (no-prepayment) schedule. */}
      {mode === "single" && <AmortizationView />}
    </div>
  );
}
