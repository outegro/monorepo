"use client";

import {
  cn,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@outegro/ui";
import { CURRENCIES, type Currency } from "@/lib/fx";

interface MoneyInputProps {
  amount: string;
  currency: Currency;
  onAmountChange: (v: string) => void;
  onCurrencyChange: (v: Currency) => void;
  className?: string;
  placeholder?: string;
}

/** Amount + currency pair. */
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
      <Input
        type="number"
        inputMode="decimal"
        step="0.01"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        placeholder={placeholder ?? "0.00"}
        className="w-24"
      />
      <Select value={currency} onValueChange={(v) => onCurrencyChange(v as Currency)}>
        <SelectTrigger aria-label="Currency">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CURRENCIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
