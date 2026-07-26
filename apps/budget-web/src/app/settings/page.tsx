"use client";

import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
} from "@outegro/ui";
import { ArrowLeftIcon, Loader2Icon, XIcon } from "lucide-react";
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
    <Card>
      <CardContent className="flex items-center gap-3">
        <Label htmlFor="initial-balance">{t("settings.initialBalance")}</Label>
        <Input
          id="initial-balance"
          type="number"
          step="0.01"
          value={shown}
          onChange={(e) => setValue(e.target.value)}
          className="w-32"
        />
        <Button size="sm" disabled={update.isPending} onClick={save}>
          {update.isPending ? <Loader2Icon className="animate-spin" /> : null}
          {t("common.save")}
        </Button>
      </CardContent>
    </Card>
  );
}

function FxPanel() {
  const { t } = useI18n();
  const { data } = useFx();
  const refresh = useRefreshFx();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{t("settings.fx")}</CardTitle>
        <CardAction>
          <Button
            size="sm"
            variant="outline"
            disabled={refresh.isPending}
            onClick={() => refresh.mutate()}
          >
            {refresh.isPending ? <Loader2Icon className="animate-spin" /> : null}
            {t("settings.fxRefresh")}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {data ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {(["GEL", "RUB", "EUR"] as const).map((c) => (
                <div key={c} className="rounded-lg border px-3 py-2 text-center">
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
      </CardContent>
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
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{t("settings.baseExpenses")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {(data ?? []).map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">
              {b.name}{" "}
              {b.isCumulative ? <span className="text-muted-foreground">(cap)</span> : null}
            </span>
            <span className="flex items-center gap-2 text-muted-foreground">
              {formatCurrency(Number(b.amount), b.currency)}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("common.delete")}
                onClick={() => del.mutate(b.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <XIcon />
              </Button>
            </span>
          </div>
        ))}
        {adding ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cumulative" className="text-xs">
              <Checkbox
                id="cumulative"
                checked={cumulative}
                onCheckedChange={(v) => setCumulative(v === true)}
              />
              {t("settings.cumulative")}
            </Label>
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
      </CardContent>
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
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{t("settings.baseIncomes")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {(data ?? []).map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">{b.name}</span>
            <span className="flex items-center gap-2 text-muted-foreground">
              {formatCurrency(Number(b.amount), b.currency)}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("common.delete")}
                onClick={() => del.mutate(b.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <XIcon />
              </Button>
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
      </CardContent>
    </Card>
  );
}

function SettingsBody() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link href="/">
          <ArrowLeftIcon />
          {t("settings.back")}
        </Link>
      </Button>
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
