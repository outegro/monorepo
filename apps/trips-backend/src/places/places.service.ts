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
      orderBy: [{ day: { sort: "asc", nulls: "last" } }, { orderInDay: "asc" }, { name: "asc" }],
      include: { reel: { select: { url: true, note: true } } },
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
    // Drop the place but send the reel back to review rather than losing it — the reel was
    // worth keeping or it would have been skipped.
    await this.prisma.$transaction([
      this.prisma.place.delete({ where: { id } }),
      this.prisma.reel.update({ where: { id: place.reelId }, data: { status: "NEEDS_REVIEW" } }),
    ]);
    return { ok: true };
  }
}
