"use client";

import { useMemo } from "react";
import { useSharedState } from "@/hooks/useSharedState";
import { sensitivityGrid } from "@/lib/emi";
import { formatINR, formatMonths, formatPercent } from "@/lib/format";

// read-only grid of EMIs for nearby rate/tenure combos. the current cell is
// highlighted (plus its row and column). memoized so it only recomputes when an
// input actually changes - it's up to 49 EMI calls.
export default function SensitivityGrid() {
  const { state } = useSharedState();
  const { amount, rate, tenure } = state;

  const grid = useMemo(
    () => sensitivityGrid(amount, rate, tenure),
    [amount, rate, tenure]
  );

  return (
    <section className="card p-5 space-y-3">
      <div>
        <h2 className="font-semibold">Sensitivity Analysis</h2>
        <p className="text-muted text-xs">
          EMI across rate × tenure — current values highlighted
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="py-2 px-2 text-left text-muted font-medium whitespace-nowrap">
                Tenure ＼ Rate
              </th>
              {grid.rates.map((r, c) => (
                <th
                  key={r}
                  className={
                    "py-2 px-2 text-right font-medium whitespace-nowrap " +
                    (c === grid.centerCol ? "text-brand-600" : "text-muted")
                  }
                >
                  {formatPercent(r)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.tenures.map((t, rowIdx) => (
              <tr key={t} className="border-t divider">
                <td
                  className={
                    "py-2 px-2 whitespace-nowrap " +
                    (rowIdx === grid.centerRow
                      ? "text-brand-600 font-semibold"
                      : "text-muted")
                  }
                >
                  {formatMonths(t)}
                </td>
                {grid.cells[rowIdx].map((emi, colIdx) => {
                  const isCenter =
                    rowIdx === grid.centerRow && colIdx === grid.centerCol;
                  return (
                    <td
                      key={colIdx}
                      className={
                        "py-2 px-2 text-right tabular-nums " +
                        (isCenter
                          ? "bg-brand-600 text-white font-semibold rounded"
                          : "")
                      }
                    >
                      {formatINR(emi)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
