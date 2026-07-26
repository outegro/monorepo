export type Currency = "USD" | "GEL" | "RUB" | "EUR";

export const CURRENCIES: Currency[] = ["USD", "GEL", "RUB", "EUR"];

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  GEL: "₾",
  RUB: "₽",
  EUR: "€",
};

/** Format a USD number as a money string ($ prefix, 2 decimals, thousands separators). */
export function formatUSD(value: number, fractionDigits = 2): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return `${sign}$${formatted}`;
}

/** Format an amount with its native currency symbol. */
export function formatCurrency(amount: number, currency: Currency, fractionDigits = 2): string {
  const symbol = CURRENCY_SYMBOL[currency];
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return `${formatted} ${symbol}`;
}

/** Display-friendly rate: "1 USD = X <currency>" — inverse of the internal "1 X = rate USD". */
export function displayRate(rate: number): number {
  if (!rate || rate <= 0) return 0;
  return 1 / rate;
}
