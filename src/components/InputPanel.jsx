"use client";

import { useSharedState } from "@/hooks/useSharedState";
import { BOUNDS } from "@/lib/constants";
import { formatINR, formatMonths } from "@/lib/format";
import SliderInput from "./SliderInput";

// the three loan inputs for single mode. they write straight to shared state,
// so edits sync across tabs and feed everything downstream.
export default function InputPanel() {
  const { state, setField } = useSharedState();

  return (
    <section className="card p-5 space-y-6">
      <div>
        <h2 className="font-semibold">Loan Details</h2>
        <p className="text-muted text-xs">Adjust and watch every tab update</p>
      </div>

      <SliderInput
        label="Loan Amount"
        prefix="₹"
        value={state.amount}
        min={BOUNDS.amount.min}
        max={BOUNDS.amount.max}
        step={BOUNDS.amount.step}
        onChange={(v) => setField("amount", v)}
        minLabel={formatINR(BOUNDS.amount.min)}
        maxLabel={formatINR(BOUNDS.amount.max)}
      />

      <SliderInput
        label="Interest Rate (p.a.)"
        suffix="%"
        value={state.rate}
        min={BOUNDS.rate.min}
        max={BOUNDS.rate.max}
        step={BOUNDS.rate.step}
        onChange={(v) => setField("rate", v)}
        minLabel={`${BOUNDS.rate.min}%`}
        maxLabel={`${BOUNDS.rate.max}%`}
      />

      <SliderInput
        label="Tenure"
        suffix="mo"
        value={state.tenure}
        min={BOUNDS.tenure.min}
        max={BOUNDS.tenure.max}
        step={BOUNDS.tenure.step}
        onChange={(v) => setField("tenure", v)}
        minLabel={formatMonths(BOUNDS.tenure.min)}
        maxLabel={formatMonths(BOUNDS.tenure.max)}
      />
    </section>
  );
}
