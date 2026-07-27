"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  Input,
  Skeleton,
} from "@outegro/ui";
import { CopyIcon, PlaneIcon, UsersIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DayPlan } from "@/components/day-plan";
import { KakaoMap } from "@/components/kakao-map";
import { Shell } from "@/components/shell";
import { useImportKorea, useJoinTrip, useTrip, useTrips } from "@/lib/api";

export default function PlanPage() {
  return (
    <main className="min-h-dvh">
      <Shell>{(me) => <PlanView meId={me.userId} />}</Shell>
    </main>
  );
}

function PlanView({ meId }: { meId: string }) {
  const trips = useTrips();
  const tripId = trips.data?.[0]?.id ?? null;
  const trip = useTrip(tripId);
  const importKorea = useImportKorea();
  const join = useJoinTrip();
  const [code, setCode] = useState("");
  const [dayIdx, setDayIdx] = useState(0);

  // Open on today when the trip is running — the day you need is almost never day 1.
  useEffect(() => {
    if (!trip.data) return;
    const today = new Date().toISOString().slice(0, 10);
    const i = trip.data.days.findIndex((d) => d.date.slice(0, 10) === today);
    if (i >= 0) setDayIdx(i);
  }, [trip.data]);

  if (trips.isLoading) return <Skeleton className="h-64 w-full" />;

  if (!tripId) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>No trip yet</CardTitle>
            <CardDescription>
              Import the Korea 2026 itinerary, or join one with a code from your friend.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={() => importKorea.mutate(undefined)} disabled={importKorea.isPending}>
              <PlaneIcon />
              Import Korea 2026
            </Button>
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Invite code"
                className="uppercase"
              />
              <Button
                variant="outline"
                disabled={!code || join.isPending}
                onClick={() =>
                  join.mutate(
                    { inviteCode: code },
                    { onError: () => toast.error("No trip with that code") },
                  )
                }
              >
                Join
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (trip.isLoading || !trip.data) return <Skeleton className="h-64 w-full" />;

  const t = trip.data;
  const day = t.days[dayIdx];
  const points = (day?.items ?? [])
    .filter((i) => i.lat != null && i.lng != null)
    .map((i, n) => ({
      id: i.id,
      name: i.titleKr ?? i.title,
      lat: i.lat as number,
      lng: i.lng as number,
      order: n + 1,
    }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">{t.name}</h1>
          <p className="text-muted-foreground text-sm">
            {t.baseName ? `Base: ${t.baseName}` : null}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            navigator.clipboard?.writeText(t.inviteCode);
            toast.success(`Invite code ${t.inviteCode} copied`);
          }}
        >
          <UsersIcon />
          {t.inviteCode}
          <CopyIcon />
        </Button>
      </div>

      {/* Horizontal day strip — 16 days do not fit as tabs on a phone. */}
      <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1">
        {t.days.map((d, i) => {
          const dt = new Date(d.date);
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setDayIdx(i)}
              className={cn(
                "flex shrink-0 flex-col items-center rounded-lg border px-3 py-1.5 text-xs transition-colors",
                i === dayIdx
                  ? "border-foreground bg-foreground text-background"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              <span className="font-medium">
                {dt.toLocaleDateString("en", { day: "numeric", month: "short" })}
              </span>
              <span className="text-[10px] opacity-70">
                {dt.toLocaleDateString("en", { weekday: "short" })}
              </span>
            </button>
          );
        })}
      </div>

      {day ? (
        <>
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="font-semibold text-lg">{day.title ?? "Day"}</h2>
            {day.city ? <Badge variant="secondary">{day.city}</Badge> : null}
          </div>
          {points.length > 0 ? (
            <KakaoMap points={points} className="h-56 w-full rounded-lg" />
          ) : null}
          <DayPlan day={day} tripId={t.id} members={t.members} meId={meId} />
        </>
      ) : null}
    </div>
  );
}
