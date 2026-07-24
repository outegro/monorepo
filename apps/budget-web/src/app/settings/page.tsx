"use client";

import { Button, Card } from "@outegro/ui";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AddLineInline } from "@/components/add-line-inline";
import { Shell } from "@/components/shell";
import {
  useBaseExpenses,
  useBaseIncomes,
  useCreateBaseExpense,
  useCreateBaseIncome,
  useDeleteBaseExpense,
  useDeleteBaseIncome,
  useFx,
  useRefreshFx,
  useSettings,
  useUpdateSettings,
} from "@/lib/api";
import { displayRate, formatCurrency } from "@/lib/fx";
import { useI18n } from "@/lib/i18n";

function InitialBalance() {
  const { t } = useI18n();
  const { data } = useSettings();
  const update = useUpdateSettings();
  const [value, setValue] = useState<string | null>(null);

  const shown = value ?? (data ? String(data.initialBalance) : "");

  async function save() {
    const n = Number(shown);
    if (!Number.isFinite(n)) return;
    try {
      await update.mutateAsync({ initialBalance: n });
      toast.success(t("toast.saved"));
    } catch {
      toast.error(t("toast.error"));
    }
  }

  return (
    <Card className="flex items-center gap-3">
      <span className="text-sm">{t("settings.initialBalance")}</span>
      <input
        type="number"
        step="0.01"
        value={shown}
        onChange={(e) => setValue(e.target.value)}
        className="h-9 w-32 rounded-lg border border-border bg-transparent px-2.5 text-sm outline-none focus:border-primary"
      />
      <Button size="sm" loading={update.isPending} onClick={save}>
        {t("common.save")}
      </Button>
    </Card>
  );
}

function FxPanel() {
  const { t } = useI18n();
  const { data } = useFx();
  const refresh = useRefreshFx();

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm">{t("settings.fx")}</h2>
        <Button
          size="sm"
          variant="outline"
          loading={refresh.isPending}
          onClick={() => refresh.mutate()}
        >
          {t("settings.fxRefresh")}
        </Button>
      </div>
      {data ? (
        <>
          <div className="grid grid-cols-3 gap-2 text-sm">
            {(["GEL", "RUB", "EUR"] as const).map((c) => (
              <div key={c} className="glass rounded-lg px-3 py-2 text-center">
                <div className="text-muted-foreground text-xs">1 USD =</div>
                <div className="font-medium tabular-nums">
                  {displayRate(data.rates[c]).toFixed(4)} {c}
                </div>
              </div>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            {t("settings.fxSource")}: {data.source ?? "—"} · {t("settings.fxUpdated")}:{" "}
            {data.fetchedAt ? new Date(data.fetchedAt).toLocaleString() : "—"}
          </p>
        </>
      ) : null}
    </Card>
  );
}

function BaseExpenses() {
  const { t } = useI18n();
  const { data } = useBaseExpenses();
  const create = useCreateBaseExpense();
  const del = useDeleteBaseExpense();
  const [adding, setAdding] = useState(false);
  const [cumulative, setCumulative] = useState(false);

  return (
    <Card className="flex flex-col gap-2">
      <h2 className="font-semibold text-sm">{t("settings.baseExpenses")}</h2>
      {(data ?? []).map((b) => (
        <div key={b.id} className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate">
            {b.name} {b.isCumulative ? <span className="text-muted-foreground">(cap)</span> : null}
          </span>
          <span className="flex items-center gap-2 text-muted-foreground">
            {formatCurrency(Number(b.amount), b.currency)}
            <button
              type="button"
              onClick={() => del.mutate(b.id)}
              className="cursor-pointer text-destructive hover:opacity-80"
            >
              ×
            </button>
          </span>
        </div>
      ))}
      {adding ? (
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={cumulative}
              onChange={(e) => setCumulative(e.target.checked)}
              className="accent-primary"
            />
            {t("settings.cumulative")}
          </label>
          <AddLineInline
            label={t("settings.baseExpenses")}
            onSubmit={(input) => create.mutateAsync({ ...input, isCumulative: cumulative })}
            onDone={() => {
              setAdding(false);
              setCumulative(false);
              toast.success(t("toast.saved"));
            }}
          />
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setAdding(true)}>
          {t("common.add")}
        </Button>
      )}
    </Card>
  );
}

function BaseIncomes() {
  const { t } = useI18n();
  const { data } = useBaseIncomes();
  const create = useCreateBaseIncome();
  const del = useDeleteBaseIncome();
  const [adding, setAdding] = useState(false);

  return (
    <Card className="flex flex-col gap-2">
      <h2 className="font-semibold text-sm">{t("settings.baseIncomes")}</h2>
      {(data ?? []).map((b) => (
        <div key={b.id} className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate">{b.name}</span>
          <span className="flex items-center gap-2 text-muted-foreground">
            {formatCurrency(Number(b.amount), b.currency)}
            <button
              type="button"
              onClick={() => del.mutate(b.id)}
              className="cursor-pointer text-destructive hover:opacity-80"
            >
              ×
            </button>
          </span>
        </div>
      ))}
      {adding ? (
        <AddLineInline
          label={t("settings.baseIncomes")}
          onSubmit={(input) => create.mutateAsync(input)}
          onDone={() => {
            setAdding(false);
            toast.success(t("toast.saved"));
          }}
        />
      ) : (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setAdding(true)}>
          {t("common.add")}
        </Button>
      )}
    </Card>
  );
}

function SettingsBody() {
  const { t } = useI18n();
  return (
    <div className="liquid-canvas -mx-5 -my-8 flex min-h-[calc(100dvh-3.5rem)] flex-col gap-4 px-5 py-8">
      <Link href="/" className="text-muted-foreground text-sm hover:text-foreground">
        {t("settings.back")}
      </Link>
      <h1 className="font-semibold text-2xl tracking-tight">{t("settings.title")}</h1>
      <InitialBalance />
      <FxPanel />
      <BaseExpenses />
      <BaseIncomes />
    </div>
  );
}

export default function SettingsPage() {
  return <Shell>{() => <SettingsBody />}</Shell>;
}
