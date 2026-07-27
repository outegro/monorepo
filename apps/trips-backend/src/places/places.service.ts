import { Injectable, NotFoundException } from "@nestjs/common";
import type { z } from "zod";
import { PrismaService } from "../prisma/prisma.service";
import type { updatePlaceSchema } from "../reels/reels.contracts";

type UpdatePlaceInput = z.infer<typeof updatePlaceSchema>;

@Injectable()
export class PlacesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The whole confirmed catalogue. Deliberately unpaginated: ~100 places is one small JSON
   * payload, and on a Korean SIM a single request beats pagination round-trips. Ordered so
   * scheduled days come first in trip order, unscheduled places after.
   */
  async list(userId: string) {
    return this.prisma.place.findMany({
      where: { userId },
      orderBy: [{ categoryGroup: "asc" }, { name: "asc" }],
      // Every reel that pointed here — the trip UI shows them as a strip under the place, so
      // you can rewatch what made you save it.
      include: {
        // Which day(s) of the trip this place is slotted into — the only place scheduling
        // lives now, so the catalogue reads it from here rather than from its own column.
        tripItems: {
          select: { id: true, dayId: true, day: { select: { date: true, title: true } } },
        },
        reels: {
          select: { id: true, url: true, note: true, caption: true, thumbnail: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }

  async update(userId: string, id: string, input: UpdatePlaceInput) {
    const place = await this.prisma.place.findFirst({ where: { id, userId } });
    if (!place) throw new NotFoundException({ code: "place_not_found" });
    return this.prisma.place.update({ where: { id }, data: input });
  }

  async remove(userId: string, id: string) {
    const place = await this.prisma.place.findFirst({ where: { id, userId } });
    if (!place) throw new NotFoundException({ code: "place_not_found" });
    // Drop the place but send every reel that pointed at it back to review rather than losing
    // them — they were worth keeping or they would have been skipped. The FK is SetNull, so
    // placeId clears itself; the status has to be reset explicitly.
    await this.prisma.$transaction([
      this.prisma.reel.updateMany({
        where: { placeId: id },
        data: { status: "NEEDS_REVIEW" },
      }),
      this.prisma.place.delete({ where: { id } }),
    ]);
    return { ok: true };
  }
}
