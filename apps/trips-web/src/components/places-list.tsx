"use client";

import { Badge, Button, Card, CardContent, Skeleton } from "@outegro/ui";
import { MapPinIcon, NavigationIcon } from "lucide-react";
import { usePlaces } from "@/lib/api";
import { type TKey, useI18n } from "@/lib/i18n";
import type { Place } from "@/lib/types";

/**
 * KakaoMap deep link. This is why no routing API is needed for v1: handing the coordinates to
 * the KakaoMap app gets real Korean transit directions for free, which is the one thing that
 * actually matters while standing on a street in Seoul.
 */
function navigateUrl(p: Place): string {
  return `https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lng}`;
}

export function PlacesList() {
  const { t } = useI18n();
  const places = usePlaces();

  if (places.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const items = places.data ?? [];
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground text-sm">{t("places.empty")}</CardContent>
      </Card>
    );
  }

  // Group by trip day; unscheduled places sink to the bottom under their own heading.
  const byDay = new Map<number | null, Place[]>();
  for (const p of items) {
    const key = p.day ?? null;
    byDay.set(key, [...(byDay.get(key) ?? []), p]);
  }
  const days = [...byDay.keys()].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a - b;
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-semibold text-2xl tracking-tight">{t("places.title")}</h1>
        <Badge variant="secondary">{t("places.count", { n: items.length })}</Badge>
      </div>

      {days.map((day) => (
        <section key={String(day)} className="flex flex-col gap-2">
          <h2 className="font-medium text-muted-foreground text-sm">
            {day === null ? t("places.noDay") : `${t("places.day")} ${day}`}
          </h2>
          {(byDay.get(day) ?? []).map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    {p.categoryGroup ? (
                      <Badge variant="secondary">{t(`cat.${p.categoryGroup}` as TKey)}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-muted-foreground text-xs">
                    <MapPinIcon className="size-3 shrink-0" />
                    {p.roadAddress || p.address}
                  </p>
                  {p.priceNote ? (
                    <p className="text-muted-foreground text-xs">{p.priceNote}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  {p.kakaoUrl ? (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={p.kakaoUrl} target="_blank" rel="noreferrer">
                        {t("places.open")}
                      </a>
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" asChild>
                    <a href={navigateUrl(p)} target="_blank" rel="noreferrer">
                      <NavigationIcon />
                      {t("places.navigate")}
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      ))}
    </div>
  );
}
