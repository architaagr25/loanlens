import { describe, it, expect } from "vitest";
import {
  monthlyRate,
  calculateEMI,
  summarize,
  buildSchedule,
  findBreakEvenMonth,
  prepaymentImpact,
  sensitivityGrid,
  lowestCostScenarioIndex,
} from "./emi";

// the expected numbers here come straight from the worked examples in the doc.
// the loose tolerances are because the PDF rounds its intermediate steps and we
// don't, so we're off by a few rupees (which is fine, we're more accurate).

describe("monthlyRate", () => {
  it("converts 11% p.a. to ~0.009167 monthly", () => {
    expect(monthlyRate(11)).toBeCloseTo(0.009167, 5);
  });
});

describe("calculateEMI — base loan ₹15,00,000 @ 11% / 48mo", () => {
  it("EMI ≈ ₹38,768", () => {
    expect(calculateEMI(1500000, 11, 48)).toBeCloseTo(38768, 0);
  });

  it("zero-interest loan is straight-line P/n", () => {
    expect(calculateEMI(120000, 0, 12)).toBe(10000);
  });

  it("handles extreme 36% rate without blowing up", () => {
    const emi = calculateEMI(1500000, 36, 48);
    expect(emi).toBeGreaterThan(0);
    expect(Number.isFinite(emi)).toBe(true);
  });

  it("guards against zero/invalid inputs", () => {
    expect(calculateEMI(0, 11, 48)).toBe(0);
    expect(calculateEMI(1500000, 11, 0)).toBe(0);
  });
});

describe("summarize — base loan", () => {
  const s = summarize(1500000, 11, 48);
  it("total payable ≈ ₹18,60,878", () => {
    expect(s.totalPayable).toBeCloseTo(1860878, -2); // within ~₹100
  });
  it("total interest ≈ ₹3,60,878", () => {
    expect(s.totalInterest).toBeCloseTo(360878, -2);
  });
  it("principal + interest shares sum to 100%", () => {
    expect(s.principalPct + s.interestPct).toBeCloseTo(100, 5);
  });
});

describe("buildSchedule — base loan, no prepayment", () => {
  const rows = buildSchedule(1500000, 11, 48);

  it("has 48 rows", () => {
    expect(rows.length).toBe(48);
  });

  it("month 1: interest ₹13,750, principal ₹25,018, balance ₹14,74,982", () => {
    expect(rows[0].interestPaid).toBeCloseTo(13750, 0);
    expect(rows[0].principalPaid).toBeCloseTo(25018, 0);
    expect(rows[0].balance).toBeCloseTo(1474982, -1);
  });

  it("month 2: balance ≈ ₹14,49,734", () => {
    expect(rows[1].balance).toBeCloseTo(1449734, -1);
  });

  it("final balance lands exactly on 0", () => {
    expect(rows[rows.length - 1].balance).toBe(0);
  });
});

describe("findBreakEvenMonth", () => {
  it("base loan breaks even at month 1 (principal portion already > interest)", () => {
    // the screenshot's "month 1" is actually right, not a placeholder -
    // month 1 principal (25,018) already beats the interest (13,750)
    const rows = buildSchedule(1500000, 11, 48);
    expect(findBreakEvenMonth(rows)).toBe(1);
  });

  it("computes a LATER break-even for an interest-heavy loan", () => {
    // 18% / 60mo: early months are interest-heavy (month 1 principal 15,592 <
    // interest 22,500), so principal only overtakes interest partway through
    const rows = buildSchedule(1500000, 18, 60);
    const be = findBreakEvenMonth(rows);
    expect(be).toBeGreaterThan(1);
    expect(be).toBeLessThanOrEqual(60);
  });
});

describe("prepaymentImpact — ₹1,00,000 in month 12", () => {
  const impact = prepaymentImpact(1500000, 11, 48, [
    { id: "p1", month: 12, amount: 100000 },
  ]);

  it("shortens tenure to ~45 months", () => {
    expect(impact.newTenure).toBeGreaterThanOrEqual(44);
    expect(impact.newTenure).toBeLessThanOrEqual(46);
  });

  it("saves roughly ₹38,000 in interest", () => {
    expect(impact.interestSaved).toBeGreaterThan(30000);
    expect(impact.interestSaved).toBeLessThan(45000);
  });

  it("reduces tenure by ~3 months", () => {
    expect(impact.tenureReduced).toBeGreaterThanOrEqual(2);
    expect(impact.tenureReduced).toBeLessThanOrEqual(4);
  });
});

describe("prepayment edge cases", () => {
  it("prepayment larger than balance closes the loan and never goes negative", () => {
    const rows = buildSchedule(1500000, 11, 48, [
      { id: "p1", month: 2, amount: 99999999 },
    ]);
    const last = rows[rows.length - 1];
    expect(last.balance).toBe(0);
    expect(rows.every((r) => r.balance >= 0)).toBe(true);
    expect(rows.length).toBeLessThan(5); // closed almost immediately
  });

  it("multiple prepayments in the same month are summed", () => {
    const one = buildSchedule(1500000, 11, 48, [{ id: "a", month: 6, amount: 200000 }]);
    const two = buildSchedule(1500000, 11, 48, [
      { id: "a", month: 6, amount: 100000 },
      { id: "b", month: 6, amount: 100000 },
    ]);
    expect(two.length).toBe(one.length);
    expect(two[one.length - 1].balance).toBeCloseTo(one[one.length - 1].balance, 0);
  });

  it("prepayment month beyond tenure is harmlessly ignored", () => {
    const rows = buildSchedule(1500000, 11, 48, [
      { id: "p1", month: 999, amount: 100000 },
    ]);
    expect(rows.length).toBe(48); // unchanged
  });
});

describe("sensitivityGrid", () => {
  const grid = sensitivityGrid(1500000, 11, 48);

  it("center cell equals the headline EMI", () => {
    expect(grid.cells[grid.centerRow][grid.centerCol]).toBeCloseTo(
      calculateEMI(1500000, 11, 48),
      5
    );
  });

  it("worked-example row: 9/10/11/12/13% → ~37328/38044/38768/39501/40241", () => {
    const row = grid.tenures.indexOf(48);
    const at = (rate) => grid.cells[row][grid.rates.indexOf(rate)];
    expect(at(9)).toBeCloseTo(37328, -1);
    expect(at(10)).toBeCloseTo(38044, -1);
    expect(at(11)).toBeCloseTo(38768, -1);
    expect(at(12)).toBeCloseTo(39501, -1);
    expect(at(13)).toBeCloseTo(40241, -1);
  });

  it("clamps and de-duplicates near the edges (tenure = 3)", () => {
    const edge = sensitivityGrid(1500000, 11, 3);
    // at tenure 3 the -6/-12/-24 offsets all clamp to 1 and collapse into one row
    expect(new Set(edge.tenures).size).toBe(edge.tenures.length);
    expect(Math.min(...edge.tenures)).toBe(1);
    expect(edge.tenures).toContain(3); // current tenure present
  });
});

describe("lowestCostScenarioIndex — same ₹15,00,000 @ 11%, varying tenure", () => {
  it("picks the 24-month scenario (lowest total payable)", () => {
    const scenarios = [
      { amount: 1500000, rate: 11, tenure: 24 }, // A — lowest total
      { amount: 1500000, rate: 11, tenure: 48 }, // B
      { amount: 1500000, rate: 11, tenure: 60 }, // C
    ];
    expect(lowestCostScenarioIndex(scenarios)).toBe(0);
  });
});
