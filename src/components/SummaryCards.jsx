"use client";

import { formatINR } from "@/lib/format";
import { useCountUp } from "@/hooks/useCountUp";

// the three headline numbers. EMI is the main one so it gets the accent.
export default function SummaryCards({ emi, totalInterest, totalPayable }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Card label="Monthly EMI" amount={emi} accent />
      <Card label="Total Interest" amount={totalInterest} />
      <Card label="Total Payable" amount={totalPayable} />
    </div>
  );
}

// one stat tile, accent = the indigo EMI one. lifts a little on hover.
function Card({ label, amount, accent }) {
  const value = useCountUp(amount); // tween the number on change
  return (
    <div
      className={
        "rounded-xl p-4 border lift " +
        (accent
          ? "bg-brand-50 border-brand-100 dark:bg-brand-600/10 dark:border-brand-600/30"
          : "card-muted")
      }
    >
      <p className="text-muted text-[11px] font-medium uppercase tracking-wide">
        {label}
      </p>
      <p
        className={
          "text-2xl font-bold mt-1 tabular-nums " + (accent ? "text-brand-600" : "")
        }
      >
        {formatINR(value)}
      </p>
    </div>
  );
}
