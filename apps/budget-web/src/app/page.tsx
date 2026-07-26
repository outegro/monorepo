"use client";

import { AddMonthForm } from "@/components/add-month-form";
import { LiveBadge } from "@/components/live-badge";
import { MonthCard } from "@/components/month-card";
import { Shell } from "@/components/shell";
import { useMonths } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useLiveSync } from "@/lib/use-live-sync";

function Dashboard() {
  const { t } = useI18n();
  const { data: months, isLoading } = useMonths();
  const live = useLiveSync();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-semibold text-2xl tracking-tight">{t("dash.title")}</h1>
        <LiveBadge status={live} />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t("common.loading")}</p>
      ) : months && months.length > 0 ? (
        <div className="flex flex-col gap-4">
          {months.map((m) => (
            <MonthCard key={m.id} month={m} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{t("dash.empty")}</p>
      )}

      <AddMonthForm />
    </div>
  );
}

export default function Page() {
  return <Shell>{() => <Dashboard />}</Shell>;
}
