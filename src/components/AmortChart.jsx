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
  ReferenceLine,
} from "recharts";
import { formatINR } from "@/lib/format";

// stacked bars, one per month - principal (indigo) on interest (amber). makes
// the "mostly interest early, mostly principal late" shift obvious. the dashed
// line marks break-even so it shows up here too, not just in the table.
export default function AmortChart({ rows, theme, breakEvenMonth }) {
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
    <div className="h-[360px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 28, right: 12, left: 12, bottom: 28 }}>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: axisColor }}
            interval="preserveStartEnd"
            minTickGap={16}
            label={{
              value: "Month",
              position: "insideBottom",
              offset: -6,
              fontSize: 12,
              fill: axisColor,
            }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: axisColor }}
            width={78}
            tickFormatter={(v) => "₹" + (v / 1000).toFixed(0) + "k"}
            label={{
              value: "Amount (₹)",
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle" },
              fontSize: 12,
              fill: axisColor,
            }}
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
          <Legend
            verticalAlign="top"
            align="center"
            height={28}
            wrapperStyle={{ fontSize: 12, color: axisColor }}
          />
          <Bar dataKey="Principal" stackId="a" fill="#4f46e5" isAnimationActive={false} />
          <Bar dataKey="Interest" stackId="a" fill="#f5a623" isAnimationActive={false} />
          {breakEvenMonth && (
            <ReferenceLine
              x={breakEvenMonth}
              stroke="#10b981"
              strokeDasharray="4 3"
              label={{
                value: "Break-even",
                position: "top",
                fontSize: 11,
                fill: "#10b981",
              }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
