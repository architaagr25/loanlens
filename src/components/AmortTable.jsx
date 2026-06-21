"use client";

import { formatINR } from "@/lib/format";

// one page of the schedule table. rounded bordered wrapper, shaded header row,
// break-even row highlighted, and the prepayment column shows "—" when empty.
export default function AmortTable({ rows, breakEvenMonth }) {
  return (
    <div className="overflow-x-auto rounded-xl border divider">
      <table className="w-full text-sm">
        <thead>
          <tr className="card-muted text-muted text-left">
            <th className="px-4 py-3 font-medium">Month</th>
            <th className="px-4 py-3 font-medium text-right">EMI</th>
            <th className="px-4 py-3 font-medium text-right">Principal</th>
            <th className="px-4 py-3 font-medium text-right">Interest</th>
            <th className="px-4 py-3 font-medium text-right">Prepayment</th>
            <th className="px-4 py-3 font-medium text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isBreakEven = row.month === breakEvenMonth;
            return (
              <tr
                key={row.month}
                className={
                  "border-t divider transition-colors " +
                  (isBreakEven
                    ? "bg-blue-50 dark:bg-blue-500/10"
                    : "hover:bg-black/[0.025] dark:hover:bg-white/[0.04]")
                }
              >
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-2">
                    {row.month}
                    {isBreakEven && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        B/E
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">{formatINR(row.emi)}</td>
                <td className="px-4 py-2.5 text-right text-brand-600">
                  {formatINR(row.principalPaid)}
                </td>
                <td
                  className="px-4 py-2.5 text-right"
                  style={{ color: "#e8910f" }}
                >
                  {formatINR(row.interestPaid)}
                </td>
                <td className="px-4 py-2.5 text-right text-muted">
                  {row.prepayment > 0 ? formatINR(row.prepayment) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right font-medium">
                  {formatINR(row.balance)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
