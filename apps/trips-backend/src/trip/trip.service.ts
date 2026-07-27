import { randomBytes } from "node:crypto";
import { ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { KOREA_2026 } from "./korea-2026";

/**
 * The trip, its team, and the day-by-day plan.
 *
 * A trip is shared by a small team rather than owned by one user: the plan is a joint artefact,
 * and the point of votes is seeing — before the day arrives — that one of you wants the full
 * Hallasan route and the other does not.
 */
@Injectable()
export class TripService {
  private readonly logger = new Logger(TripService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Trips this user belongs to. */
  async listMine(userId: string) {
    return this.prisma.trip.findMany({
      where: { members: { some: { userId } } },
      orderBy: { startDate: "asc" },
      include: { members: true, _count: { select: { days: true } } },
    });
  }

  /**
   * Membership check used by every read and write below. Kept explicit rather than folded into
   * a guard: a trip is the only shared object in this service, so "am I in this team" is the
   * one authorisation question worth being loud about.
   */
  private async assertMember(tripId: string, userId: string) {
    const member = await this.prisma.tripMember.findUnique({
      where: { tripId_userId: { tripId, userId } },
    });
    if (!member) throw new ForbiddenException({ code: "not_a_member" });
    return member;
  }

  /** A whole trip: days, items, votes, and any reel places slotted in. One request per trip. */
  async get(tripId: string, userId: string) {
    await this.assertMember(tripId, userId);
    return this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        members: true,
        days: {
          orderBy: { date: "asc" },
          include: {
            items: {
              orderBy: [{ position: "asc" }, { startsAt: "asc" }],
              include: {
                votes: true,
                place: {
                  select: {
                    id: true,
                    name: true,
                    lat: true,
                    lng: true,
                    kind: true,
                    categoryGroup: true,
                    kakaoUrl: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /** Join by the short code printed in the app. */
  async join(inviteCode: string, userId: string, label?: string) {
    const trip = await this.prisma.trip.findUnique({ where: { inviteCode } });
    if (!trip) throw new NotFoundException({ code: "trip_not_found" });

    await this.prisma.tripMember.upsert({
      where: { tripId_userId: { tripId: trip.id, userId } },
      create: { tripId: trip.id, userId, label: label ?? null },
      // Re-joining just refreshes the label; membership is idempotent.
      update: label ? { label } : {},
    });
    return trip;
  }

  /**
   * Set or clear this user's vote on an item. `value` is -1/0/1 — "I would skip this" is as
   * useful to see as "I want this", and 0 removes the vote entirely.
   */
  async vote(tripId: string, itemId: string, userId: string, value: number) {
    await this.assertMember(tripId, userId);
    const item = await this.prisma.tripItem.findFirst({
      where: { id: itemId, day: { tripId } },
    });
    if (!item) throw new NotFoundException({ code: "item_not_found" });

    if (value === 0) {
      await this.prisma.vote.deleteMany({ where: { itemId, userId } });
      return { ok: true };
    }
    const clamped = value > 0 ? 1 : -1;
    await this.prisma.vote.upsert({
      where: { itemId_userId: { itemId, userId } },
      create: { itemId, userId, tripId, value: clamped },
      update: { value: clamped },
    });
    return { ok: true };
  }

  /**
   * Settle an option group. Advisory: it clears `chosen` across the group and sets it on one
   * item, but nothing stops the team doing neither on the day.
   */
  async choose(tripId: string, itemId: string, userId: string) {
    await this.assertMember(tripId, userId);
    const item = await this.prisma.tripItem.findFirst({
      where: { id: itemId, day: { tripId } },
    });
    if (!item) throw new NotFoundException({ code: "item_not_found" });
    if (!item.optionGroup) throw new NotFoundException({ code: "not_an_option" });

    await this.prisma.$transaction([
      this.prisma.tripItem.updateMany({
        where: { optionGroup: item.optionGroup, day: { tripId } },
        data: { chosen: false },
      }),
      // The whole label wins, not just the clicked row: "Absolutely wrecked" is four items.
      this.prisma.tripItem.updateMany({
        where: {
          optionGroup: item.optionGroup,
          optionLabel: item.optionLabel,
          day: { tripId },
        },
        data: { chosen: true },
      }),
    ]);
    return { ok: true };
  }

  /** Hang a saved reel place onto a day as a new item, or clear it. */
  async attachPlace(tripId: string, dayId: string, placeId: string | null, userId: string) {
    await this.assertMember(tripId, userId);
    const day = await this.prisma.tripDay.findFirst({ where: { id: dayId, tripId } });
    if (!day) throw new NotFoundException({ code: "day_not_found" });
    if (!placeId) return { ok: true };

    const place = await this.prisma.place.findFirst({ where: { id: placeId, userId } });
    if (!place) throw new NotFoundException({ code: "place_not_found" });

    const last = await this.prisma.tripItem.findFirst({
      where: { dayId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    return this.prisma.tripItem.create({
      data: {
        dayId,
        title: place.name,
        titleKr: place.name,
        address: place.roadAddress ?? place.address,
        lat: place.lat,
        lng: place.lng,
        placeId: place.id,
        details: place.priceNote,
        position: (last?.position ?? 0) + 1,
      },
    });
  }

  /**
   * Import the authored itinerary. Idempotent by trip name: running it twice does not duplicate
   * the trip, which matters because the plan is still being edited a day before departure.
   */
  async importKorea2026(userId: string, label?: string) {
    const existing = await this.prisma.trip.findFirst({ where: { name: KOREA_2026.name } });
    if (existing) {
      await this.prisma.tripMember.upsert({
        where: { tripId_userId: { tripId: existing.id, userId } },
        create: { tripId: existing.id, userId, label: label ?? null, role: "MEMBER" },
        update: {},
      });
      return existing;
    }

    // 6 chars from a 32-symbol alphabet — enough for a two-person trip that contains no
    // secrets, and short enough to read out loud.
    const inviteCode = randomBytes(4).toString("base64url").slice(0, 6).toUpperCase();

    const trip = await this.prisma.trip.create({
      data: {
        name: KOREA_2026.name,
        startDate: new Date(KOREA_2026.startDate),
        endDate: new Date(KOREA_2026.endDate),
        baseName: KOREA_2026.baseName,
        baseAddress: `${KOREA_2026.baseAddress} / ${KOREA_2026.baseAddressKr}`,
        inviteCode,
        members: { create: { userId, label: label ?? null, role: "OWNER" } },
        days: {
          create: KOREA_2026.days.map((d) => ({
            date: new Date(d.date),
            title: d.title,
            city: d.city,
            items: {
              create: d.items.map((it, i) => ({
                position: i,
                startsAt: it.startsAt ?? null,
                endsAt: it.endsAt ?? null,
                title: it.title,
                titleKr: it.titleKr ?? null,
                details: it.details ?? null,
                address: it.address ?? null,
                addressKr: it.addressKr ?? null,
                cost: it.cost ?? null,
                bookingUrl: it.bookingUrl ?? null,
                optionGroup: it.optionGroup ?? null,
                optionLabel: it.optionLabel ?? null,
              })),
            },
          })),
        },
      },
    });

    this.logger.log(
      `imported ${KOREA_2026.name}: ${KOREA_2026.days.length} days, code ${inviteCode}`,
    );
    return trip;
  }
}
