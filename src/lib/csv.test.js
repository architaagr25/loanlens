import { describe, it, expect } from "vitest";
import { scheduleToCsv } from "./csv";
import { buildSchedule } from "./emi";

describe("scheduleToCsv", () => {
  it("starts with the header row", () => {
    const csv = scheduleToCsv([]);
    expect(csv).toBe("Month,EMI,Principal,Interest,Prepayment,Balance");
  });

  it("emits one line per schedule row plus the header", () => {
    const rows = buildSchedule(1500000, 11, 48);
    const csv = scheduleToCsv(rows);
    const lines = csv.split("\n");
    expect(lines.length).toBe(rows.length + 1); // 48 rows + header
  });

  it("rounds currency values to whole rupees", () => {
    const rows = buildSchedule(1500000, 11, 48);
    const firstDataLine = scheduleToCsv(rows).split("\n")[1];
    // Month 1: 38768, 25018, 13750, 0, 1474982 (approx, rounded)
    expect(firstDataLine.startsWith("1,38768,25018,13750,0,")).toBe(true);
  });
});
