import type { Currency, FxRates } from "../fx/fx.types";
import { toUSD } from "../fx/fx.types";

export interface MonthTotals {
  expensesUsd: number; // regular expenses + cumulative caps spent
  incomesUsd: number;
  netUsd: number;
  endingBalanceUsd: number;
}

/**
 * Pure calc — starting balance is NEVER stored as truth, it's always derived by
 * walking the chain of prior months (see BudgetService.deriveMonthsChain). This way
 * editing any expense in any month automatically re-flows every downstream month.
 */
export function computeMonthTotals(
  startingBalance: number,
  expenses: Array<{ amount: number; currency: Currency }>,
  incomes: Array<{ amount: number; currency: Currency }>,
  cumulativeSpentUsd: number,
  rates: FxRates,
): MonthTotals {
  const expensesUsd =
    expenses.reduce((sum, e) => sum + toUSD(e.amount, e.currency, rates), 0) + cumulativeSpentUsd;
  const incomesUsd = incomes.reduce((sum, i) => sum + toUSD(i.amount, i.currency, rates), 0);
  const netUsd = incomesUsd - expensesUsd;
  return { expensesUsd, incomesUsd, netUsd, endingBalanceUsd: startingBalance + netUsd };
}
