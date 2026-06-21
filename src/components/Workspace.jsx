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

// top-level layout. reads the synced inputs, works out the summary (memoized so
// it only recalcs when inputs change), and shows whichever mode is active.
export default function Workspace() {
  const { state } = useSharedState();
  const { amount, rate, tenure, mode } = state;

  const summary = useMemo(
    () => summarize(amount, rate, tenure),
    [amount, rate, tenure]
  );

  return (
    <div className="min-h-screen">
      <Header />
      <div className="px-3 sm:px-4 py-4 sm:py-6 max-w-7xl mx-auto space-y-5">
        <ModeTabs />

        {/* keyed by mode so the entrance animation replays on every switch */}
        <div key={mode} className="animate-modein space-y-5">
          {mode === "single" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-5">
                <InputPanel />

                <div className="space-y-5">
                  <section className="card p-5 space-y-5">
                    <h2 className="font-semibold border-b divider pb-3 -mx-5 px-5">
                      Summary
                    </h2>
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

              <AmortizationView />
            </>
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
        </div>
      </div>
    </div>
  );
}
