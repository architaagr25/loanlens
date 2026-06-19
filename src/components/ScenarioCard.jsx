"use client";

import { BOUNDS } from "@/lib/constants";
import { formatINR, formatMonths } from "@/lib/format";
import SliderInput from "./SliderInput";

// One comparison scenario: editable name + Amount/Rate/Tenure inputs and the
// computed results. The lowest-total-cost card is highlighted as "BEST VALUE".
export default function ScenarioCard({
  scenario,
  summary,
  isBest,
  canRemove,
  onChange,
  onRemove,
}) {
  return (
    <div
      className={
        "rounded-xl p-4 border space-y-4 relative " +
        (isBest
          ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-500/10"
          : "card")
      }
    >
      {isBest && (
        <span className="absolute -top-2.5 left-4 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold tracking-wide">
          BEST VALUE
        </span>
      )}

      <div className="flex items-center justify-between gap-2">
        <input
          value={scenario.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="bg-transparent font-semibold outline-none w-full"
          aria-label="Scenario name"
        />
        {canRemove && (
          <button
            onClick={onRemove}
            aria-label="Remove scenario"
            className="text-muted hover:text-red-500 transition shrink-0"
          >
            ✕
          </button>
        )}
      </div>

      <SliderInput
        label="Amount"
        prefix="₹"
        value={scenario.amount}
        min={BOUNDS.amount.min}
        max={BOUNDS.amount.max}
        step={BOUNDS.amount.step}
        onChange={(v) => onChange({ amount: v })}
        minLabel={formatINR(BOUNDS.amount.min)}
        maxLabel={formatINR(BOUNDS.amount.max)}
      />
      <SliderInput
        label="Rate"
        suffix="%"
        value={scenario.rate}
        min={BOUNDS.rate.min}
        max={BOUNDS.rate.max}
        step={BOUNDS.rate.step}
        onChange={(v) => onChange({ rate: v })}
        minLabel={`${BOUNDS.rate.min}%`}
        maxLabel={`${BOUNDS.rate.max}%`}
      />
      <SliderInput
        label="Tenure"
        suffix="mo"
        value={scenario.tenure}
        min={BOUNDS.tenure.min}
        max={BOUNDS.tenure.max}
        step={BOUNDS.tenure.step}
        onChange={(v) => onChange({ tenure: v })}
        minLabel={formatMonths(BOUNDS.tenure.min)}
        maxLabel={formatMonths(BOUNDS.tenure.max)}
      />

      <div className="border-t divider pt-3 space-y-1.5 text-sm">
        <Row label="Monthly EMI" value={formatINR(summary.emi)} accent />
        <Row label="Total Interest" value={formatINR(summary.totalInterest)} />
        <Row label="Total Payable" value={formatINR(summary.totalPayable)} />
      </div>
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={accent ? "font-bold text-brand-600" : "font-medium"}>
        {value}
      </span>
    </div>
  );
}
