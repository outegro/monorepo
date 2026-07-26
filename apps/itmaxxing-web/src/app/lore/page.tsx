"use client";

import { Badge, Button, Card } from "@outegro/ui";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { useDeleteEntry, useLoreEntries } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { LoreEntry } from "@/lib/types";

export default function LorePage() {
  return (
    <main className="liquid-canvas min-h-dvh">
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
        <Link href="/">
          <Button size="sm" variant="outline">
            {t("lore.start")}
          </Button>
        </Link>
      </div>

      {entries.isLoading ? (
        <Card className="text-muted-foreground text-sm">{t("common.loading")}</Card>
      ) : entries.data && entries.data.length > 0 ? (
        <div className="flex flex-col gap-3">
          {entries.data.map((e) => (
            <LoreCard key={e.id} entry={e} />
          ))}
        </div>
      ) : (
        <Card tint="cool" className="flex flex-col items-start gap-3 text-sm">
          <p className="text-muted-foreground">{t("lore.empty")}</p>
          <Link href="/">
            <Button size="sm">{t("lore.start")}</Button>
          </Link>
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
    <Card className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{entry.title}</span>
            <Badge>{entry.type}</Badge>
          </div>
          {entry.org || period ? (
            <span className="text-muted-foreground text-xs">
              {[entry.org, period].filter(Boolean).join(" · ")}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => del.mutate(entry.id)}
          disabled={del.isPending}
          className="cursor-pointer text-muted-foreground text-xs hover:text-destructive"
        >
          {t("lore.delete")}
        </button>
      </div>

      {entry.body ? (
        <p className="whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
          {entry.body}
        </p>
      ) : null}

      {entry.metrics.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {entry.metrics.map((m) => (
            <span
              key={`${m.label}::${m.value}`}
              className="glass-tint-green rounded-lg px-2.5 py-1 text-xs"
            >
              <span className="font-semibold">{m.value}</span>{" "}
              <span className="text-muted-foreground">{m.label}</span>
            </span>
          ))}
        </div>
      ) : null}

      {entry.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-accent px-2 py-0.5 text-muted-foreground text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
