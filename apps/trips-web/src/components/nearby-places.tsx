"use client";

import { Badge, Button, Card, CardContent, cn } from "@outegro/ui";
import { CheckIcon, MapPinIcon, PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAttachPlace, usePlaces } from "@/lib/api";
import { formatKm, nearestDistanceKm } from "@/lib/geo";
import type { TripDay } from "@/lib/types";
import { kakaoNavUrl } from "./kakao-map";

/** Anything further than this is a different part of the city, not "nearby". */
const NEARBY_KM = 2.5;
const COLLAPSED = 4;

/**
 * The saved catalogue, filtered to what is actually near today's plan.
 *
 * This is the point where the two halves of the app meet: a hundred reels are only useful if,
 * standing in Seongsu at 15:15, you can see the three you saved within walking distance. It is
 * pure client-side arithmetic over data already loaded — no request, so it works while the
 * network is being Korean-subway about it.
 *
 * Distance is straight-line and never presented as a travel time; see lib/geo.
 */
export function NearbyPlaces({ day, tripId }: { day: TripDay; tripId: string }) {
  const places = usePlaces();
  const attach = useAttachPlace(tripId);
  const [expanded, setExpanded] = useState(false);

  const anchors = useMemo(
    () =>
      day.items
        .filter((i) => i.lat != null && i.lng != null)
        .map((i) => ({ lat: i.lat as number, lng: i.lng as number })),
    [day.items],
  );

  const alreadyOnDay = useMemo(
    () => new Set(day.items.map((i) => i.placeId).filter(Boolean) as string[]),
    [day.items],
  );

  const ranked = useMemo(() => {
    if (!places.data) return [];
    return places.data
      .map((p) => ({ place: p, km: nearestDistanceKm({ lat: p.lat, lng: p.lng }, anchors) }))
      .filter((r): r is { place: (typeof r)["place"]; km: number } => r.km !== null)
      .filter((r) => r.km <= NEARBY_KM)
      .sort((a, b) => a.km - b.km);
  }, [places.data, anchors]);

  // A day with no coordinates (travel days, "wake up") has nothing to measure against, and an
  // empty box would just be noise.
  if (anchors.length === 0 || ranked.length === 0) return null;

  const shown = expanded ? ranked : ranked.slice(0, COLLAPSED);

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm">Saved places nearby</span>
          <Badge variant="secondary">{ranked.length}</Badge>
        </div>

        {shown.map(({ place, km }) => {
          const added = alreadyOnDay.has(place.id);
          return (
            <div
              key={place.id}
              className="flex items-center gap-2 border-t pt-2 first:border-0 first:pt-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="truncate font-medium text-sm">{place.name}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">{formatKm(km)}</span>
                </div>
                {place.categoryName ? (
                  <p className="truncate text-muted-foreground text-xs">{place.categoryName}</p>
                ) : null}
              </div>

              <Button variant="ghost" size="icon-sm" aria-label="Navigate" asChild>
                <a href={kakaoNavUrl(place)} target="_blank" rel="noreferrer">
                  <MapPinIcon />
                </a>
              </Button>
              <Button
                variant={added ? "ghost" : "outline"}
                size="sm"
                disabled={added || attach.isPending}
                onClick={() =>
                  attach.mutate(
                    { dayId: day.id, placeId: place.id },
                    {
                      onSuccess: () => toast.success(`${place.name} added to the day`),
                      onError: () => toast.error("Could not add it"),
                    },
                  )
                }
              >
                {added ? <CheckIcon /> : <PlusIcon />}
                {added ? "Added" : "Add"}
              </Button>
            </div>
          );
        })}

        {ranked.length > COLLAPSED ? (
          <Button
            variant="ghost"
            size="sm"
            className={cn("self-start text-muted-foreground")}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show less" : `Show all ${ranked.length}`}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
