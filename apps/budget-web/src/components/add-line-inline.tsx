"use client";

import { Button } from "@outegro/ui";
import { useState } from "react";
import { toast } from "sonner";
import type { Currency } from "@/lib/fx";
import { useI18n } from "@/lib/i18n";
import { MoneyInput } from "./money-input";

interface AddLineInlineProps {
  label: string;
  onSubmit: (input: { name: string; amount: number; currency: Currency }) => Promise<unknown>;
  onDone: () => void;
}

/** Small expanding form used for both "+ Expense" and "+ Income" on a month card. */
export function AddLineInline({ label, onSubmit, onDone }: AddLineInlineProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const value = Number(amount);
    if (!name.trim() || !Number.isFinite(value) || value === 0) return;
    setBusy(true);
    try {
      await onSubmit({ name: name.trim(), amount: value, currency });
      setName("");
      setAmount("");
      onDone();
    } catch {
      toast.error(t("toast.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border border-dashed p-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={`${label} — ${t("form.name")}`}
        className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-transparent px-2.5 text-sm outline-none focus:border-primary"
      />
      <MoneyInput
        amount={amount}
        currency={currency}
        onAmountChange={setAmount}
        onCurrencyChange={setCurrency}
      />
      <Button size="sm" loading={busy} onClick={submit}>
        {t("common.add")}
      </Button>
    </div>
  );
}
