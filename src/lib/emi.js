// ──────────────────────────────────────────────────────────────────────────
// EMI math core — pure functions, no React, no browser APIs.
// Reducing-balance method: interest each month is charged on the OUTSTANDING
// balance, not the original principal. All formulas follow the assignment.
// ──────────────────────────────────────────────────────────────────────────

import { RATE_OFFSETS, TENURE_OFFSETS, BOUNDS } from "./constants";

// Tolerance for floating-point comparisons so a sub-paisa residue (e.g. 2e-8)
// is treated as a closed loan rather than leaking into the final balance.
const EPSILON = 1e-6;

// Monthly interest rate (decimal) = annual rate ÷ 12 ÷ 100.
// e.g. 11% p.a. → 11/12/100 = 0.0091666…
export function monthlyRate(annualRatePct) {
  return annualRatePct / 12 / 100;
}

// Clamp a value into [min, max].
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Standard reducing-balance EMI:
//        P · r · (1 + r)^n
// EMI = ─────────────────────
//          (1 + r)^n − 1
// Edge cases: zero interest → straight-line P/n; guards against n ≤ 0.
export function calculateEMI(P, annualRatePct, n) {
  if (!Number.isFinite(P) || !Number.isFinite(annualRatePct) || !Number.isFinite(n)) {
    return 0;
  }
  if (P <= 0 || n <= 0) return 0;

  const r = monthlyRate(annualRatePct);
  if (r === 0) return P / n; // zero-interest loan: no compounding

  const pow = Math.pow(1 + r, n);
  return (P * r * pow) / (pow - 1);
}

// Headline summary for a loan. Once EMI is known, the rest follow directly.
//   Total Amount Payable = EMI × n
//   Total Interest       = (EMI × n) − P
//   Principal share %    = P / (EMI × n) × 100
//   Interest share %     = Total Interest / (EMI × n) × 100
export function summarize(P, annualRatePct, n) {
  const emi = calculateEMI(P, annualRatePct, n);
  const totalPayable = emi * n;
  const totalInterest = totalPayable - P;
  const principalPct = totalPayable > 0 ? (P / totalPayable) * 100 : 0;
  const interestPct = totalPayable > 0 ? (totalInterest / totalPayable) * 100 : 0;
  return { emi, totalPayable, totalInterest, principalPct, interestPct };
}

// Sum all prepayments scheduled for a given month (multiple-same-month → summed).
function prepaymentForMonth(prepayments, month) {
  let sum = 0;
  for (const p of prepayments) {
    if (Math.round(p.month) === month && Number.isFinite(p.amount) && p.amount > 0) {
      sum += p.amount;
    }
  }
  return sum;
}

// Build the month-by-month amortization schedule, carrying the balance forward.
// Returns rows: { month, emi, principalPaid, interestPaid, prepayment, balance }.
//
// Reduce-tenure strategy for prepayments: EMI stays fixed; a prepayment is
// applied to the balance at the START of its month (before interest), so the
// loan reaches zero in fewer months.
//
// Edge cases:
//   - prepayment larger than balance → capped (loan closes that month)
//   - prepayment month beyond tenure → never reached, harmlessly ignored
//   - multiple prepayments same month → summed
//   - final month → principal/EMI trimmed so balance lands exactly on 0
export function buildSchedule(P, annualRatePct, n, prepayments = []) {
  const rows = [];
  if (P <= 0 || n <= 0) return rows;

  const r = monthlyRate(annualRatePct);
  const emi = calculateEMI(P, annualRatePct, n);
  let balance = P;

  // Hard cap on iterations: never exceed the original tenure (reduce-tenure).
  for (let month = 1; month <= n && balance > 0; month++) {
    // 1) Apply any prepayment first, before interest is charged this month.
    let prepayment = prepaymentForMonth(prepayments, month);
    if (prepayment > 0) {
      prepayment = Math.min(prepayment, balance); // cap so balance never < 0
      balance -= prepayment;
    }

    if (balance <= 0) {
      // Prepayment alone closed the loan this month.
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

    // 2) Normal EMI split on the (possibly reduced) balance.
    const interestPaid = balance * r;
    let principalPaid = emi - interestPaid;
    let emiThisMonth = emi;

    if (principalPaid >= balance - EPSILON) {
      // Final regular month: clear the balance exactly, trim the last EMI.
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

// First month where cumulative principal repaid > cumulative interest paid.
// Computed correctly (NOT a hard-coded "month 1"). Returns null if it never
// happens (e.g. a loan closed very early). Prepayments count toward principal.
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

// Total interest across a schedule.
export function totalInterestOf(rows) {
  return rows.reduce((sum, row) => sum + row.interestPaid, 0);
}

// Prepayment impact vs the original (no-prepayment) plan.
//   Interest Saved = Total Interest (no prepay) − Total Interest (with prepay)
//   Tenure Reduced = Original tenure − Actual tenure after prepayment
export function prepaymentImpact(P, annualRatePct, n, prepayments = []) {
  const base = buildSchedule(P, annualRatePct, n, []);
  const adjusted = buildSchedule(P, annualRatePct, n, prepayments);

  const originalTotalInterest = totalInterestOf(base);
  const newTotalInterest = totalInterestOf(adjusted);

  const originalTenure = base.length; // may be < n only in degenerate cases
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

// Build a de-duplicated, clamped axis from a base value + offsets.
function buildAxis(base, offsets, min, max) {
  const values = offsets.map((o) => clamp(base + o, min, max));
  // De-duplicate while preserving order, then sort ascending.
  const unique = Array.from(new Set(values));
  unique.sort((a, b) => a - b);
  return unique;
}

// What-If sensitivity grid: EMI for every (tenure × rate) combination around
// the current selection. Principal is held constant.
//   rows    = tenures (current ± 6/12/24, clamped 1–84, de-duped)
//   columns = rates   (current ± 1/2/3,   clamped 1–36, de-duped)
//   cell    = calculateEMI(P, thatRate, thatTenure)
// centerRow/centerCol point at the current inputs (the headline EMI).
export function sensitivityGrid(P, currentRate, currentTenure) {
  const rates = buildAxis(currentRate, RATE_OFFSETS, BOUNDS.rate.min, BOUNDS.rate.max);
  const tenures = buildAxis(
    currentTenure,
    TENURE_OFFSETS,
    BOUNDS.tenure.min,
    BOUNDS.tenure.max
  );

  const cells = tenures.map((t) => rates.map((rate) => calculateEMI(P, rate, t)));

  // Find the cell matching the current inputs (after clamping).
  const clampedRate = clamp(currentRate, BOUNDS.rate.min, BOUNDS.rate.max);
  const clampedTenure = clamp(currentTenure, BOUNDS.tenure.min, BOUNDS.tenure.max);
  const centerCol = rates.indexOf(clampedRate);
  const centerRow = tenures.indexOf(clampedTenure);

  return { rates, tenures, cells, centerRow, centerCol };
}

// Compare mode: index of the scenario with the lowest Total Amount Payable.
// Each scenario: { amount, rate, tenure }. Returns -1 for an empty list.
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
