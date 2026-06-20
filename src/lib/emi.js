// All the loan math lives here. Pure functions only - no React, no browser stuff,
// so it's easy to test. Everything uses the reducing-balance method (interest on
// the outstanding balance each month, not the original principal).

import { RATE_OFFSETS, TENURE_OFFSETS, BOUNDS } from "./constants";

// small tolerance so floating point dust (like 2e-8) doesn't leak into the
// final balance and leave the loan looking unpaid
const EPSILON = 1e-6;

// annual % -> monthly decimal rate. 11% -> 11/12/100 = 0.009166...
export function monthlyRate(annualRatePct) {
  return annualRatePct / 12 / 100;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// the EMI formula: P*r*(1+r)^n / ((1+r)^n - 1)
// handles 0% (just P/n, otherwise we'd divide by zero) and bad inputs
export function calculateEMI(P, annualRatePct, n) {
  if (!Number.isFinite(P) || !Number.isFinite(annualRatePct) || !Number.isFinite(n)) {
    return 0;
  }
  if (P <= 0 || n <= 0) return 0;

  const r = monthlyRate(annualRatePct);
  if (r === 0) return P / n; // no interest, nothing to compound

  const pow = Math.pow(1 + r, n);
  return (P * r * pow) / (pow - 1);
}

// everything else falls out of the EMI once we have it
export function summarize(P, annualRatePct, n) {
  const emi = calculateEMI(P, annualRatePct, n);
  const totalPayable = emi * n;
  const totalInterest = totalPayable - P;
  const principalPct = totalPayable > 0 ? (P / totalPayable) * 100 : 0;
  const interestPct = totalPayable > 0 ? (totalInterest / totalPayable) * 100 : 0;
  return { emi, totalPayable, totalInterest, principalPct, interestPct };
}

// add up every prepayment that lands on this month (two on the same month -> sum)
function prepaymentForMonth(prepayments, month) {
  let sum = 0;
  for (const p of prepayments) {
    if (Math.round(p.month) === month && Number.isFinite(p.amount) && p.amount > 0) {
      sum += p.amount;
    }
  }
  return sum;
}

// Builds the full month-by-month schedule, carrying the balance forward.
// Prepayments use the reduce-tenure approach: EMI stays the same, the extra cash
// knocks down the balance at the start of its month (before interest), so the
// loan just finishes earlier.
// Edge cases handled here: prepayment bigger than balance gets capped, a month
// past the tenure is never reached, and the last month is trimmed so we land
// exactly on 0.
export function buildSchedule(P, annualRatePct, n, prepayments = []) {
  const rows = [];
  if (P <= 0 || n <= 0) return rows;

  const r = monthlyRate(annualRatePct);
  const emi = calculateEMI(P, annualRatePct, n);
  let balance = P;

  // never run past the original tenure
  for (let month = 1; month <= n && balance > 0; month++) {
    // prepayment first, before this month's interest
    let prepayment = prepaymentForMonth(prepayments, month);
    if (prepayment > 0) {
      prepayment = Math.min(prepayment, balance); // don't go below 0
      balance -= prepayment;
    }

    if (balance <= 0) {
      // the prepayment alone cleared it
      rows.push({
        month,
        emi: 0,
        principalPaid: 0,
        interestPaid: 0,
        prepayment,
        balance: 0,
      });
      break;
    }

    // normal split for the month
    const interestPaid = balance * r;
    let principalPaid = emi - interestPaid;
    let emiThisMonth = emi;

    if (principalPaid >= balance - EPSILON) {
      // last month - pay off exactly what's left and shrink the final EMI
      principalPaid = balance;
      emiThisMonth = principalPaid + interestPaid;
      balance = 0;
    } else {
      balance -= principalPaid;
    }

    rows.push({
      month,
      emi: emiThisMonth,
      principalPaid,
      interestPaid,
      prepayment,
      balance: Math.max(0, balance),
    });
  }

  return rows;
}

// first month where total principal paid overtakes total interest paid.
// actually computed (not hardcoded to month 1). null if it never happens.
// prepayments count as principal.
export function findBreakEvenMonth(rows) {
  let cumPrincipal = 0;
  let cumInterest = 0;
  for (const row of rows) {
    cumPrincipal += row.principalPaid + row.prepayment;
    cumInterest += row.interestPaid;
    if (cumPrincipal > cumInterest) return row.month;
  }
  return null;
}

export function totalInterestOf(rows) {
  return rows.reduce((sum, row) => sum + row.interestPaid, 0);
}

// compare the no-prepayment plan against the one with prepayments to get
// how much interest/time was saved
export function prepaymentImpact(P, annualRatePct, n, prepayments = []) {
  const base = buildSchedule(P, annualRatePct, n, []);
  const adjusted = buildSchedule(P, annualRatePct, n, prepayments);

  const originalTotalInterest = totalInterestOf(base);
  const newTotalInterest = totalInterestOf(adjusted);

  const originalTenure = base.length;
  const newTenure = adjusted.length;

  return {
    originalTenure,
    newTenure,
    tenureReduced: Math.max(0, originalTenure - newTenure),
    originalTotalInterest,
    newTotalInterest,
    interestSaved: Math.max(0, originalTotalInterest - newTotalInterest),
  };
}

// turn a base value + offsets into a sorted, clamped, de-duped axis.
// near the edges some offsets collapse onto the same value, hence the dedupe.
function buildAxis(base, offsets, min, max) {
  const values = offsets.map((o) => clamp(base + o, min, max));
  const unique = Array.from(new Set(values));
  unique.sort((a, b) => a - b);
  return unique;
}

// the what-if grid: EMI for each rate x tenure combo around the current pick,
// keeping the principal fixed. centerRow/centerCol point back at the current
// inputs so the UI can highlight that cell.
export function sensitivityGrid(P, currentRate, currentTenure) {
  const rates = buildAxis(currentRate, RATE_OFFSETS, BOUNDS.rate.min, BOUNDS.rate.max);
  const tenures = buildAxis(
    currentTenure,
    TENURE_OFFSETS,
    BOUNDS.tenure.min,
    BOUNDS.tenure.max
  );

  const cells = tenures.map((t) => rates.map((rate) => calculateEMI(P, rate, t)));

  const clampedRate = clamp(currentRate, BOUNDS.rate.min, BOUNDS.rate.max);
  const clampedTenure = clamp(currentTenure, BOUNDS.tenure.min, BOUNDS.tenure.max);
  const centerCol = rates.indexOf(clampedRate);
  const centerRow = tenures.indexOf(clampedTenure);

  return { rates, tenures, cells, centerRow, centerCol };
}

// which scenario is cheapest overall (lowest total payable). -1 if list is empty.
export function lowestCostScenarioIndex(scenarios) {
  let bestIdx = -1;
  let bestTotal = Infinity;
  scenarios.forEach((s, i) => {
    const { totalPayable } = summarize(s.amount, s.rate, s.tenure);
    if (totalPayable < bestTotal) {
      bestTotal = totalPayable;
      bestIdx = i;
    }
  });
  return bestIdx;
}
