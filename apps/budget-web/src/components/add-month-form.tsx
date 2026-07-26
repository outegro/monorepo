"use client";

import { Button, Card, CardContent, Checkbox, Input, Label } from "@outegro/ui";
import { Loader2Icon } from "lucide-react";
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
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3">
        <Label htmlFor="month-count" className="gap-2">
          {t("form.count")}
          <Input
            id="month-count"
            type="number"
            min={1}
            max={36}
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 1)}
            className="w-16"
          />
        </Label>
        <Label htmlFor="use-base" className="gap-2">
          <Checkbox
            id="use-base"
            checked={useBase}
            onCheckedChange={(v) => setUseBase(v === true)}
          />
          {t("form.useBase")}
        </Label>
        <div className="flex gap-2">
          <Button size="sm" disabled={createMonths.isPending} onClick={submit}>
            {createMonths.isPending ? <Loader2Icon className="animate-spin" /> : null}
            {t("common.add")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
