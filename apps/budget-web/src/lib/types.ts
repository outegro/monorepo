import type { Currency } from "./fx";

export interface LineItem {
  id: string;
  name: string;
  amount: number;
  currency: Currency;
  category?: string | null;
  group?: string | null;
  isBase: boolean;
  status?: "planned" | "paid";
  order: number;
}

export interface CumulativeCap {
  id: string | null;
  baseExpenseId: string;
  name: string;
  cap: number;
  spent: number;
  remaining: number;
}

export interface MonthTotals {
  expensesUsd: number;
  incomesUsd: number;
  netUsd: number;
  endingBalanceUsd: number;
}

export interface MonthWithItems {
  id: string;
  year: number;
  month: number;
  label: string;
  startingBalance: number;
  notes: string | null;
  isClosed: boolean;
  expenses: LineItem[];
  incomes: LineItem[];
  cumulative: CumulativeCap[];
  totals: MonthTotals;
}

export interface BaseItem {
  id: string;
  name: string;
  // Prisma Decimal serializes to a numeric string over JSON — always Number() this before math.
  amount: string;
  currency: Currency;
  category?: string | null;
  group?: string | null;
  order: number;
  isActive: boolean;
  isCumulative?: boolean;
}

export interface FxState {
  rates: Record<Currency, number>;
  fetchedAt: number | null;
  source: string | null;
}
