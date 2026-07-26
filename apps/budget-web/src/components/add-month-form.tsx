"use client";

import { Button, Card } from "@outegro/ui";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateMonths } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export function AddMonthForm() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(1);
  const [useBase, setUseBase] = useState(true);
  const createMonths = useCreateMonths();

  if (!open) {
    return (
      <Button variant="outline" className="self-start" onClick={() => setOpen(true)}>
        {t("dash.addMonth")}
      </Button>
    );
  }

  async function submit() {
    try {
      await createMonths.mutateAsync({
        count,
        useBaseExpenses: useBase,
        useBaseIncomes: useBase,
      });
      setOpen(false);
      toast.success(t("toast.saved"));
    } catch {
      toast.error(t("toast.error"));
    }
  }

  return (
    <Card className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm">
        {t("form.count")}
        <input
          type="number"
          min={1}
          max={36}
          value={count}
          onChange={(e) => setCount(Number(e.target.value) || 1)}
          className="h-9 w-16 rounded-lg border border-border bg-transparent px-2 text-sm outline-none focus:border-primary"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={useBase}
          onChange={(e) => setUseBase(e.target.checked)}
          className="accent-primary"
        />
        {t("form.useBase")}
      </label>
      <div className="flex gap-2">
        <Button size="sm" loading={createMonths.isPending} onClick={submit}>
          {t("common.add")}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {t("common.cancel")}
        </Button>
      </div>
    </Card>
  );
}
