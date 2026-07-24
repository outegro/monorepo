"use client";

import { CURRENCIES, type Currency } from "@/lib/fx";
import { cn } from "@/lib/utils";

interface MoneyInputProps {
  amount: string;
  currency: Currency;
  onAmountChange: (v: string) => void;
  onCurrencyChange: (v: Currency) => void;
  className?: string;
  placeholder?: string;
}

/** Amount + currency pair, styled to match the glass form inputs. */
export function MoneyInput({
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
  className,
  placeholder,
}: MoneyInputProps) {
  return (
    <div className={cn("flex gap-1.5", className)}>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        placeholder={placeholder ?? "0.00"}
        className="h-9 w-24 rounded-lg border border-border bg-transparent px-2.5 text-sm outline-none focus:border-primary"
      />
      <select
        value={currency}
        onChange={(e) => onCurrencyChange(e.target.value as Currency)}
        className="h-9 rounded-lg border border-border bg-transparent px-2 text-sm outline-none focus:border-primary"
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
