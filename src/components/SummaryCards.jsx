"use client";

import { formatINR } from "@/lib/format";

// the three headline numbers. EMI is the main one so it gets the accent.
export default function SummaryCards({ emi, totalInterest, totalPayable }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Card
        label="Monthly EMI"
        value={formatINR(emi)}
        accent
      />
      <Card label="Total Interest" value={formatINR(totalInterest)} />
      <Card label="Total Payable" value={formatINR(totalPayable)} />
    </div>
  );
}

// one stat tile, accent = the indigo EMI one
function Card({ label, value, accent }) {
  return (
    <div
      className={
        "rounded-xl p-4 border " +
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
          "text-2xl font-bold mt-1 " + (accent ? "text-brand-600" : "")
        }
      >
        {value}
      </p>
    </div>
  );
}
