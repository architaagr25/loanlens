// Pure CSV builder for the amortization schedule (no DOM here, so it's testable).

import { roundCurrency } from "./format";

// Escape a CSV field if it contains a comma, quote, or newline.
function escapeCsv(value) {
  const s = String(value);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// Turn schedule rows into a CSV string with a header row.
// Columns mirror the on-screen table.
export function scheduleToCsv(rows) {
  const header = [
    "Month",
    "EMI",
    "Principal",
    "Interest",
    "Prepayment",
    "Balance",
  ];
  const lines = [header.join(",")];

  for (const r of rows) {
    lines.push(
      [
        r.month,
        roundCurrency(r.emi),
        roundCurrency(r.principalPaid),
        roundCurrency(r.interestPaid),
        roundCurrency(r.prepayment),
        roundCurrency(r.balance),
      ]
        .map(escapeCsv)
        .join(",")
    );
  }

  return lines.join("\n");
}
