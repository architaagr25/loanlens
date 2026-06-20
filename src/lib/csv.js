// build the CSV string for the schedule. no DOM here so it's testable - the
// actual download lives in the button component.

import { roundCurrency } from "./format";

// quote a field if it has a comma/quote/newline in it
function escapeCsv(value) {
  const s = String(value);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// rows -> CSV string, columns match the table on screen
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
