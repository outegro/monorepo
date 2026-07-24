export type Currency = "USD" | "GEL" | "RUB" | "EUR";

/** rates[X] = "1 X = rates[X] USD". */
export type FxRates = Record<Currency, number>;

export const DEFAULT_FX_RATES: FxRates = {
  USD: 1,
  GEL: 0.37,
  RUB: 0.0115,
  EUR: 1.08,
};

export function toUSD(amount: number, currency: Currency, rates: FxRates): number {
  return amount * (rates[currency] ?? DEFAULT_FX_RATES[currency]);
}
