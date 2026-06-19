import { describe, it, expect } from "vitest";
import { encodeInputs, decodeInputs } from "./url";

describe("encode/decode round-trip", () => {
  it("preserves inputs through encode → decode", () => {
    const inputs = { amount: 1500000, rate: 11, tenure: 48, mode: "single", theme: "dark" };
    const decoded = decodeInputs(encodeInputs(inputs));
    expect(decoded).toEqual(inputs);
  });
});

describe("decodeInputs validation", () => {
  it("clamps out-of-range values to bounds", () => {
    const decoded = decodeInputs("a=999999999&r=99&t=999");
    expect(decoded.amount).toBe(5000000); // max
    expect(decoded.rate).toBe(36); // max
    expect(decoded.tenure).toBe(84); // max
  });

  it("drops invalid/non-numeric params", () => {
    const decoded = decodeInputs("a=abc&r=&m=bogus");
    expect(decoded.amount).toBeUndefined();
    expect(decoded.rate).toBeUndefined();
    expect(decoded.mode).toBeUndefined();
  });

  it("returns an empty object for an empty query", () => {
    expect(decodeInputs("")).toEqual({});
  });

  it("accepts only valid modes and themes", () => {
    expect(decodeInputs("m=compare").mode).toBe("compare");
    expect(decodeInputs("th=light").theme).toBe("light");
  });
});
