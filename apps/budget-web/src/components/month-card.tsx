"use client";

import { Badge, Button, Card } from "@outegro/ui";
import { useState } from "react";
import { toast } from "sonner";
import {
  useCreateExpense,
  useCreateIncome,
  useDeleteExpense,
  useDeleteIncome,
  useDeleteMonth,
  useSetCumulativeSpend,
  useUpdateExpense,
  useUpdateMonth,
} from "@/lib/api";
import { formatCurrency, formatUSD } from "@/lib/fx";
import { useI18n } from "@/lib/i18n";
import type { MonthWithItems } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AddLineInline } from "./add-line-inline";

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function MonthCard({ month }: { month: MonthWithItems }) {
  const { t } = useI18n();
  const [addingExpense, setAddingExpense] = useState(false);
  const [addingIncome, setAddingIncome] = useState(false);

  const createExpense = useCreateExpense();
  const createIncome = useCreateIncome();
  const deleteExpense = useDeleteExpense();
  const deleteIncome = useDeleteIncome();
  const updateExpense = useUpdateExpense();
  const updateMonth = useUpdateMonth();
  const deleteMonth = useDeleteMonth();
  const setCumulativeSpend = useSetCumulativeSpend();

  const net = month.totals.netUsd;
  const heading = `${MONTH_ABBR[month.month - 1]} ${month.year}`;

  return (
    <Card strong className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-lg tracking-tight">{heading}</h2>
          <p className="text-muted-foreground text-xs">{month.label}</p>
        </div>
        <div className="flex items-center gap-2">
          {month.isClosed ? <Badge className="border-none">{t("month.closed")}</Badge> : null}
          <button
            type="button"
            onClick={() => updateMonth.mutate({ id: month.id, isClosed: !month.isClosed })}
            className="cursor-pointer text-muted-foreground text-xs hover:text-foreground"
          >
            {month.isClosed ? t("month.reopen") : t("month.close")}
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(t("month.delete"))) deleteMonth.mutate(month.id);
            }}
            className="cursor-pointer text-destructive text-xs hover:opacity-80"
          >
            {t("common.delete")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t("dash.startingBalance")} value={formatUSD(month.startingBalance)} />
        <Stat label={t("dash.expenses")} value={formatUSD(month.totals.expensesUsd)} tone="down" />
        <Stat label={t("dash.incomes")} value={formatUSD(month.totals.incomesUsd)} tone="up" />
        <Stat
          label={t("dash.endingBalance")}
          value={formatUSD(month.totals.endingBalanceUsd)}
          tone={net >= 0 ? "up" : "down"}
          strong
        />
      </div>

      {month.cumulative.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            {t("month.cumulative")}
          </p>
          {month.cumulative.map((cap) => (
            <div
              key={cap.baseExpenseId}
              className="glass flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm"
            >
              <span>{cap.name}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  defaultValue={cap.spent || undefined}
                  placeholder="0.00"
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v !== cap.spent) {
                      setCumulativeSpend.mutate({
                        monthId: month.id,
                        baseExpenseId: cap.baseExpenseId,
                        spent: v,
                      });
                    }
                  }}
                  className="h-7 w-20 rounded-md border border-border bg-transparent px-2 text-right text-xs outline-none focus:border-primary"
                />
                <span
                  className={cn(
                    "text-xs",
                    cap.remaining < 0 ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  / {formatUSD(cap.cap)} ({formatUSD(cap.remaining)} {t("month.remaining")})
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        {month.expenses.map((e) => (
          <div
            key={e.id}
            className="flex items-center justify-between gap-2 rounded-lg px-1 py-1 text-sm"
          >
            <button
              type="button"
              onClick={() =>
                updateExpense.mutate({
                  id: e.id,
                  status: e.status === "paid" ? "planned" : "paid",
                })
              }
              className={cn(
                "cursor-pointer truncate text-left",
                e.status === "paid" && "text-muted-foreground line-through",
              )}
              title={t("month.markPaid")}
            >
              {e.name}
            </button>
            <span className="flex items-center gap-2 text-muted-foreground">
              {formatCurrency(e.amount, e.currency)}
              <button
                type="button"
                onClick={() => deleteExpense.mutate(e.id)}
                className="cursor-pointer text-destructive hover:opacity-80"
              >
                ×
              </button>
            </span>
          </div>
        ))}
        {addingExpense ? (
          <AddLineInline
            label={t("month.addExpense")}
            onSubmit={(input) => createExpense.mutateAsync({ monthId: month.id, ...input })}
            onDone={() => {
              setAddingExpense(false);
              toast.success(t("toast.saved"));
            }}
          />
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setAddingExpense(true)}>
            {t("month.addExpense")}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {month.incomes.map((i) => (
          <div
            key={i.id}
            className="flex items-center justify-between gap-2 rounded-lg px-1 py-1 text-sm"
          >
            <span className="truncate">{i.name}</span>
            <span className="flex items-center gap-2 text-muted-foreground">
              {formatCurrency(i.amount, i.currency)}
              <button
                type="button"
                onClick={() => deleteIncome.mutate(i.id)}
                className="cursor-pointer text-destructive hover:opacity-80"
              >
                ×
              </button>
            </span>
          </div>
        ))}
        {addingIncome ? (
          <AddLineInline
            label={t("month.addIncome")}
            onSubmit={(input) => createIncome.mutateAsync({ monthId: month.id, ...input })}
            onDone={() => {
              setAddingIncome(false);
              toast.success(t("toast.saved"));
            }}
          />
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setAddingIncome(true)}>
            {t("month.addIncome")}
          </Button>
        )}
      </div>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
  strong?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          strong ? "font-semibold text-base" : "text-sm",
          tone === "up" && "text-chart-2",
          tone === "down" && "text-destructive",
        )}
      >
        {value}
      </span>
    </div>
  );
}
