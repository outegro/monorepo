"use client";

import { Badge, Button, Card, CardContent, cn, Separator } from "@outegro/ui";
import {
  CheckIcon,
  ExternalLinkIcon,
  MapPinIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  TicketIcon,
} from "lucide-react";
import { useChooseOption, useVote } from "@/lib/api";
import type { TripDay, TripItem, TripMember } from "@/lib/types";
import { kakaoNavUrl } from "./kakao-map";

/**
 * One day of the plan, as read on a phone while standing in a station.
 *
 * Two things drive the layout. Korean names get equal billing with English ones — a taxi driver
 * needs 삼부골든타워, not "Sambu Golden Tower". And items that belong to an option group are
 * boxed together, because the plan genuinely branches (normal vs wrecked morning; full vs short
 * Hallasan route) and the useful question is "which are we doing", not "what is on the list".
 */
export function DayPlan({
  day,
  tripId,
  members,
  meId,
}: {
  day: TripDay;
  tripId: string;
  members: TripMember[];
  meId: string;
}) {
  // Preserve the authored order while pulling each option group into one block at the position
  // of its first member — reordering the day would lose the plan's own sequencing.
  const blocks: (TripItem | { group: string; items: TripItem[] })[] = [];
  const seen = new Set<string>();
  for (const item of day.items) {
    if (!item.optionGroup) {
      blocks.push(item);
      continue;
    }
    if (seen.has(item.optionGroup)) continue;
    seen.add(item.optionGroup);
    blocks.push({
      group: item.optionGroup,
      items: day.items.filter((i) => i.optionGroup === item.optionGroup),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b) =>
        "group" in b ? (
          <OptionGroup
            key={b.group}
            items={b.items}
            tripId={tripId}
            members={members}
            meId={meId}
          />
        ) : (
          <ItemRow key={b.id} item={b} tripId={tripId} members={members} meId={meId} />
        ),
      )}
    </div>
  );
}

function OptionGroup({
  items,
  tripId,
  members,
  meId,
}: {
  items: TripItem[];
  tripId: string;
  members: TripMember[];
  meId: string;
}) {
  const choose = useChooseOption(tripId);
  // One label can span several items ("Absolutely wrecked" is four rows), so group by label.
  const labels = [...new Set(items.map((i) => i.optionLabel ?? "Option"))];

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Choose one</Badge>
          <span className="text-muted-foreground text-xs">{labels.length} options</span>
        </div>
        {labels.map((label, i) => {
          const own = items.filter((it) => (it.optionLabel ?? "Option") === label);
          const chosen = own.some((it) => it.chosen);
          const first = own[0];
          return (
            <div key={label}>
              {i > 0 ? <Separator className="mb-3" /> : null}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("font-medium text-sm", chosen && "text-foreground")}>
                    {label}
                  </span>
                  <Button
                    size="sm"
                    variant={chosen ? "default" : "outline"}
                    disabled={!first || choose.isPending}
                    onClick={() => first && choose.mutate(first.id)}
                  >
                    {chosen ? <CheckIcon /> : null}
                    {chosen ? "Chosen" : "Pick this"}
                  </Button>
                </div>
                {own.map((it) => (
                  <ItemRow
                    key={it.id}
                    item={it}
                    tripId={tripId}
                    members={members}
                    meId={meId}
                    compact
                  />
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ItemRow({
  item,
  tripId,
  members,
  meId,
  compact,
}: {
  item: TripItem;
  tripId: string;
  members: TripMember[];
  meId: string;
  compact?: boolean;
}) {
  const vote = useVote(tripId);
  const mine = item.votes.find((v) => v.userId === meId)?.value ?? 0;
  const others = item.votes.filter((v) => v.userId !== meId);

  const nav =
    item.lat != null && item.lng != null
      ? kakaoNavUrl({ name: item.titleKr ?? item.title, lat: item.lat, lng: item.lng })
      : item.place
        ? kakaoNavUrl(item.place)
        : null;

  const body = (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-medium text-sm">{item.title}</span>
        {item.titleKr && item.titleKr !== item.title ? (
          // Korean gets equal billing — this is the string you show a driver.
          <span className="text-muted-foreground text-sm">{item.titleKr}</span>
        ) : null}
      </div>
      {item.details ? (
        <p className="text-muted-foreground text-xs leading-relaxed">{item.details}</p>
      ) : null}
      {item.addressKr || item.address ? (
        <p className="text-muted-foreground text-xs">{item.addressKr ?? item.address}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {item.cost ? (
          <Badge variant="outline" className="gap-1">
            <TicketIcon />
            {item.cost}
          </Badge>
        ) : null}
        {item.place ? <Badge variant="secondary">from a reel</Badge> : null}
        {nav ? (
          <Button variant="ghost" size="sm" asChild className="h-6 px-2 text-xs">
            <a href={nav} target="_blank" rel="noreferrer">
              <MapPinIcon />
              Navigate
            </a>
          </Button>
        ) : null}
        {item.bookingUrl ? (
          <Button variant="ghost" size="sm" asChild className="h-6 px-2 text-xs">
            <a href={item.bookingUrl} target="_blank" rel="noreferrer">
              <ExternalLinkIcon />
              Booking
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className={cn("flex gap-3", compact ? "py-1" : "py-2")}>
      <div className="w-14 shrink-0 pt-0.5 text-right">
        <span className="font-medium text-muted-foreground text-xs tabular-nums">
          {item.startsAt ?? "—"}
        </span>
        {item.endsAt ? (
          <div className="text-[10px] text-muted-foreground tabular-nums">{item.endsAt}</div>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">{body}</div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Want this"
            className={cn(mine === 1 && "text-foreground")}
            onClick={() => vote.mutate({ itemId: item.id, value: mine === 1 ? 0 : 1 })}
          >
            <ThumbsUpIcon className={cn(mine !== 1 && "opacity-40")} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Would skip"
            className={cn(mine === -1 && "text-destructive")}
            onClick={() => vote.mutate({ itemId: item.id, value: mine === -1 ? 0 : -1 })}
          >
            <ThumbsDownIcon className={cn(mine !== -1 && "opacity-40")} />
          </Button>
        </div>
        {/* The whole point of a team: see what the other person thinks before the day arrives. */}
        {others.length > 0 ? (
          <div className="flex flex-wrap justify-end gap-1">
            {others.map((v) => {
              const who = members.find((m) => m.userId === v.userId);
              return (
                <Badge
                  key={v.userId}
                  variant={v.value > 0 ? "secondary" : "outline"}
                  className="px-1.5 py-0 text-[10px]"
                >
                  {v.value > 0 ? "👍" : "👎"} {who?.label ?? "friend"}
                </Badge>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
