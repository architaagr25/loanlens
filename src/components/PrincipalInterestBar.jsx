"use client";

import { formatINR } from "@/lib/format";

// The Interest-to-Principal ratio as a split bar: indigo = principal,
// amber = interest, with percentage labels and a legend.
export default function PrincipalInterestBar({
  principal,
  totalInterest,
  principalPct,
  interestPct,
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Principal vs Interest</span>
        <span className="text-muted">
          {principalPct.toFixed(1)}% / {interestPct.toFixed(1)}%
        </span>
      </div>

      <div className="flex h-3 rounded-full overflow-hidden card-muted">
        <div
          className="bg-brand-600 h-full"
          style={{ width: `${principalPct}%` }}
          title={`Principal ${principalPct.toFixed(1)}%`}
        />
        <div
          className="h-full"
          style={{ width: `${interestPct}%`, backgroundColor: "#f5a623" }}
          title={`Interest ${interestPct.toFixed(1)}%`}
        />
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-brand-600 inline-block" />
          Principal {formatINR(principal)}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-sm inline-block"
            style={{ backgroundColor: "#f5a623" }}
          />
          Interest {formatINR(totalInterest)}
        </span>
      </div>
    </div>
  );
}
