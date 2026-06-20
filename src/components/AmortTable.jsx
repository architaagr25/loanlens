"use client";

import { formatINR } from "@/lib/format";

// one page of the schedule table. break-even row is highlighted, and the
// prepayment column just shows "—" on months without one.
export default function AmortTable({ rows, breakEvenMonth }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted text-left border-b divider">
            <th className="py-2 pr-3 font-medium">Month</th>
            <th className="py-2 px-3 font-medium text-right">EMI</th>
            <th className="py-2 px-3 font-medium text-right">Principal</th>
            <th className="py-2 px-3 font-medium text-right">Interest</th>
            <th className="py-2 px-3 font-medium text-right">Prepayment</th>
            <th className="py-2 pl-3 font-medium text-right">Balance</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isBreakEven = row.month === breakEvenMonth;
            return (
              <tr
                key={row.month}
                className={
                  "border-b divider last:border-0 " +
                  (isBreakEven ? "bg-brand-50 dark:bg-brand-600/10" : "")
                }
              >
                <td className="py-2.5 pr-3">
                  <span className="inline-flex items-center gap-2">
                    {row.month}
                    {isBreakEven && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-600 text-white">
                        BE
                      </span>
                    )}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">{formatINR(row.emi)}</td>
                <td className="py-2.5 px-3 text-right text-brand-600">
                  {formatINR(row.principalPaid)}
                </td>
                <td
                  className="py-2.5 px-3 text-right"
                  style={{ color: "#e8910f" }}
                >
                  {formatINR(row.interestPaid)}
                </td>
                <td className="py-2.5 px-3 text-right text-muted">
                  {row.prepayment > 0 ? formatINR(row.prepayment) : "—"}
                </td>
                <td className="py-2.5 pl-3 text-right font-medium">
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
