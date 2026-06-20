// little formatting helpers - rupee grouping, month labels, etc.

// one place for rounding so the whole app rounds the same way
export function roundCurrency(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

// "₹15,00,000" - en-IN gives the lakh/crore grouping for free
export function formatINR(n) {
  const value = roundCurrency(n);
  return "₹" + value.toLocaleString("en-IN");
}

// same grouping without the ₹
export function formatNumber(n) {
  return roundCurrency(n).toLocaleString("en-IN");
}

// 48 -> "4 yr", 42 -> "3 yr 6 mo", 1 -> "1 mo"
export function formatMonths(months) {
  const m = Math.max(0, Math.round(months));
  const years = Math.floor(m / 12);
  const rem = m % 12;
  if (years === 0) return `${rem} mo`;
  if (rem === 0) return `${years} yr`;
  return `${years} yr ${rem} mo`;
}

// "11%" / "10.5%" - drop the trailing .0 on whole numbers
export function formatPercent(rate) {
  const r = Math.round(rate * 10) / 10;
  return `${r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)}%`;
}
