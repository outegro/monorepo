import { describe, expect, it } from "vitest";
import { DEFAULT_FX_RATES } from "../fx/fx.types";
import { computeMonthTotals } from "./budget.types";

describe("computeMonthTotals", () => {
  it("carries the starting balance forward when there is no activity", () => {
    const totals = computeMonthTotals(1000, [], [], 0, DEFAULT_FX_RATES);
    expect(totals).toEqual({
      expensesUsd: 0,
      incomesUsd: 0,
      netUsd: 0,
      endingBalanceUsd: 1000,
    });
  });

  it("nets incomes against expenses, converting each line to USD", () => {
    const totals = computeMonthTotals(
      500,
      [{ amount: 100, currency: "EUR" }],
      [{ amount: 200, currency: "USD" }],
      0,
      DEFAULT_FX_RATES,
    );
    const expectedExpenses = 100 * DEFAULT_FX_RATES.EUR;
    expect(totals.expensesUsd).toBeCloseTo(expectedExpenses);
    expect(totals.incomesUsd).toBe(200);
    expect(totals.netUsd).toBeCloseTo(200 - expectedExpenses);
    expect(totals.endingBalanceUsd).toBeCloseTo(500 + (200 - expectedExpenses));
  });

  it("folds cumulative-cap spend into expenses (already USD)", () => {
    const totals = computeMonthTotals(0, [], [], 150, DEFAULT_FX_RATES);
    expect(totals.expensesUsd).toBe(150);
    expect(totals.netUsd).toBe(-150);
    expect(totals.endingBalanceUsd).toBe(-150);
  });

  it("drives a negative ending balance when expenses exceed starting balance + income", () => {
    const totals = computeMonthTotals(
      10,
      [{ amount: 100, currency: "USD" }],
      [],
      0,
      DEFAULT_FX_RATES,
    );
    expect(totals.endingBalanceUsd).toBe(-90);
  });
});
