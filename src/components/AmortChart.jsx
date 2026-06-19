"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatINR } from "@/lib/format";

// Stacked bar chart: one bar per month, principal (indigo) + interest (amber).
// Makes the interest-heavy-early → principal-heavy-late shift visible.
export default function AmortChart({ rows, theme }) {
  const data = useMemo(
    () =>
      rows.map((r) => ({
        month: r.month,
        Principal: Math.round(r.principalPaid),
        Interest: Math.round(r.interestPaid),
      })),
    [rows]
  );

  const axisColor = theme === "dark" ? "#9aa1ad" : "#6b7280";

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: axisColor }}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <YAxis
            tick={{ fontSize: 11, fill: axisColor }}
            width={70}
            tickFormatter={(v) => "₹" + (v / 1000).toFixed(0) + "k"}
          />
          <Tooltip
            formatter={(value, name) => [formatINR(value), name]}
            labelFormatter={(m) => `Month ${m}`}
            contentStyle={{
              background: theme === "dark" ? "#14171d" : "#ffffff",
              border: "1px solid",
              borderColor: theme === "dark" ? "#262b34" : "#e6e8ec",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Principal" stackId="a" fill="#4f46e5" />
          <Bar dataKey="Interest" stackId="a" fill="#f5a623" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
