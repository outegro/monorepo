"use client";

import { Badge, Button, Card, CardContent, Skeleton } from "@outegro/ui";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { useDeleteEntry, useLoreEntries } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { LoreEntry } from "@/lib/types";

export default function LorePage() {
  return (
    <main className="min-h-dvh">
      <Shell>{() => <LoreView />}</Shell>
    </main>
  );
}

function LoreView() {
  const { t } = useI18n();
  const entries = useLoreEntries();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-semibold text-2xl tracking-tight">{t("lore.title")}</h1>
        <Button size="sm" variant="outline" asChild>
          <Link href="/">{t("lore.start")}</Link>
        </Button>
      </div>

      {entries.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : entries.data && entries.data.length > 0 ? (
        <div className="flex flex-col gap-3">
          {entries.data.map((e) => (
            <LoreCard key={e.id} entry={e} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 text-sm">
            <p className="text-muted-foreground">{t("lore.empty")}</p>
            <Button size="sm" asChild>
              <Link href="/">{t("lore.start")}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LoreCard({ entry }: { entry: LoreEntry }) {
  const { t } = useI18n();
  const del = useDeleteEntry();
  const period = [entry.startDate, entry.endDate].filter(Boolean).join(" – ");

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{entry.title}</span>
              <Badge variant="secondary">{entry.type}</Badge>
            </div>
            {entry.org || period ? (
              <span className="text-muted-foreground text-xs">
                {[entry.org, period].filter(Boolean).join(" · ")}
              </span>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => del.mutate(entry.id)}
            disabled={del.isPending}
            className="text-muted-foreground hover:text-destructive"
          >
            {t("lore.delete")}
          </Button>
        </div>

        {entry.body ? (
          <p className="whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
            {entry.body}
          </p>
        ) : null}

        {entry.metrics.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {entry.metrics.map((m) => (
              <Badge key={`${m.label}::${m.value}`} variant="outline" className="gap-1">
                <span className="font-semibold">{m.value}</span>
                <span className="text-muted-foreground">{m.label}</span>
              </Badge>
            ))}
          </div>
        ) : null}

        {entry.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {entry.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
