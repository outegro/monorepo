"use client";

import { Badge, Button, Card, CardContent, Skeleton } from "@outegro/ui";
import { ArrowLeftIcon, ExternalLinkIcon, MapPinIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useDeletePlace, usePlace } from "@/lib/api";
import { type TKey, useI18n } from "@/lib/i18n";
import { KakaoMap, kakaoNavUrl } from "./kakao-map";
import { ReelPlayer } from "./reel-player";

/**
 * One place, everything about it: an interactive map, every reel that pointed here, the Korean
 * name and address to show on arrival, and the way out to KakaoMap for navigation.
 *
 * The map is a full `Map` rather than the list's StaticMap — there is exactly one of them here,
 * and on a detail page panning to see what is around is the point.
 */
export function PlaceDetail({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const place = usePlace(id);
  const del = useDeletePlace();

  if (place.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }
  if (!place.data) return null;
  const p = place.data;

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" className="self-start" asChild>
        <Link href="/places">
          <ArrowLeftIcon />
          {t("places.title")}
        </Link>
      </Button>

      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-semibold text-2xl tracking-tight">{p.name}</h1>
          {p.categoryGroup ? (
            <Badge variant="secondary">{t(`cat.${p.categoryGroup}` as TKey)}</Badge>
          ) : null}
          {p.kind === "ROUTE" ? <Badge variant="outline">route</Badge> : null}
        </div>
        {p.categoryName ? <p className="text-muted-foreground text-sm">{p.categoryName}</p> : null}
        {/* Korean address, full size: this is what you show a taxi driver. */}
        {p.roadAddress || p.address ? (
          <p className="text-sm">{p.roadAddress ?? p.address}</p>
        ) : null}
        {p.priceNote ? <p className="text-muted-foreground text-sm">{p.priceNote}</p> : null}
      </div>

      <KakaoMap
        points={[{ id: p.id, name: p.name, lat: p.lat, lng: p.lng }]}
        className="h-64 w-full rounded-lg border"
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" asChild>
          <a href={kakaoNavUrl(p)} target="_blank" rel="noreferrer">
            <MapPinIcon />
            {t("places.navigate")}
          </a>
        </Button>
        {p.kakaoUrl ? (
          <Button variant="outline" size="sm" asChild>
            <a href={p.kakaoUrl} target="_blank" rel="noreferrer">
              <ExternalLinkIcon />
              {t("places.open")}
            </a>
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-muted-foreground hover:text-destructive"
          disabled={del.isPending}
          onClick={() => {
            if (!window.confirm(t("places.deleteConfirm"))) return;
            del
              .mutateAsync(p.id)
              .then(() => router.push("/places"))
              .catch(() => toast.error(t("toast.error")));
          }}
        >
          <Trash2Icon />
          {t("common.delete")}
        </Button>
      </div>

      {/* Every reel that pointed here — several people can save the same restaurant. */}
      {p.reels.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="font-medium text-muted-foreground text-sm">
            {t("places.fromReels", { n: p.reels.length })}
          </h2>
          {p.reels.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-3 sm:flex-row">
                <ReelPlayer
                  reel={{ ...r, shortcode: "", status: "CONFIRMED" } as never}
                  className="w-full shrink-0 sm:w-40"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {r.note ? <p className="text-sm leading-relaxed">{r.note}</p> : null}
                  {r.caption ? (
                    <details>
                      <summary className="cursor-pointer text-muted-foreground text-xs">
                        {t("queue.caption")}
                        {r.uploader ? ` · @${r.uploader}` : ""}
                      </summary>
                      <p className="mt-1.5 whitespace-pre-wrap text-muted-foreground text-xs leading-relaxed">
                        {r.caption}
                      </p>
                    </details>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="self-start text-muted-foreground"
                  >
                    <a href={r.url} target="_blank" rel="noreferrer">
                      <ExternalLinkIcon />
                      Instagram
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
