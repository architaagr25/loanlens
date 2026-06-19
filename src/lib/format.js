// Display helpers: Indian-style currency grouping and tenure labels.

// Rounds to the nearest rupee. Centralized so every display rounds the same way.
export function roundCurrency(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

// "₹15,00,000" — Indian digit grouping (lakh/crore), no decimals.
export function formatINR(n) {
  const value = roundCurrency(n);
  return "₹" + value.toLocaleString("en-IN");
}

// Plain Indian-grouped number without the ₹ symbol (for inputs/labels).
export function formatNumber(n) {
  return roundCurrency(n).toLocaleString("en-IN");
}

// "4 yr", "3 yr 6 mo", "11 mo", "1 mo" — used for the sensitivity grid axis.
export function formatMonths(months) {
  const m = Math.max(0, Math.round(months));
  const years = Math.floor(m / 12);
  const rem = m % 12;
  if (years === 0) return `${rem} mo`;
  if (rem === 0) return `${years} yr`;
  return `${years} yr ${rem} mo`;
}

// "11%" / "10.5%" — trims a trailing ".0" so whole rates read cleanly.
export function formatPercent(rate) {
  const r = Math.round(rate * 10) / 10;
  return `${r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)}%`;
}
