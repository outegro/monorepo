import { describe, expect, it } from "vitest";
import { DEFAULT_FX_RATES, toUSD } from "./fx.types";

describe("toUSD", () => {
  it("passes USD through unchanged", () => {
    expect(toUSD(100, "USD", DEFAULT_FX_RATES)).toBe(100);
  });

  it("converts using the given rate", () => {
    const rates = { ...DEFAULT_FX_RATES, GEL: 0.4 };
    expect(toUSD(50, "GEL", rates)).toBeCloseTo(20);
  });

  it("falls back to DEFAULT_FX_RATES when a currency is missing from the given rates", () => {
    const rates = { ...DEFAULT_FX_RATES, EUR: undefined as unknown as number };
    expect(toUSD(10, "EUR", rates)).toBeCloseTo(10 * DEFAULT_FX_RATES.EUR);
  });
});
