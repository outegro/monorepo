import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { AuthUser } from "../common/current-user.decorator";
import { CurrentUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { attachPlaceSchema, joinTripSchema, voteSchema } from "./trip.contracts";
import { TripService } from "./trip.service";

@Controller("trips")
@UseGuards(JwtAuthGuard)
export class TripController {
  constructor(private readonly trips: TripService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.trips.listMine(user.userId);
  }

  /**
   * Idempotent bootstrap. The itinerary is checked into the repo, so "create my trip" is a
   * button rather than a migration — and running it twice just joins you to the existing one.
   */
  @Post("import/korea-2026")
  importKorea(@CurrentUser() user: AuthUser, @Body() body: { label?: string }) {
    return this.trips.importKorea2026(user.userId, body?.label);
  }

  @Post("join")
  join(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(joinTripSchema)) body: { inviteCode: string; label?: string },
  ) {
    return this.trips.join(body.inviteCode, user.userId, body.label);
  }

  @Get(":tripId")
  get(@CurrentUser() user: AuthUser, @Param("tripId") tripId: string) {
    return this.trips.get(tripId, user.userId);
  }

  @Post(":tripId/items/:itemId/vote")
  vote(
    @CurrentUser() user: AuthUser,
    @Param("tripId") tripId: string,
    @Param("itemId") itemId: string,
    @Body(new ZodValidationPipe(voteSchema)) body: { value: number },
  ) {
    return this.trips.vote(tripId, itemId, user.userId, body.value);
  }

  @Post(":tripId/items/:itemId/choose")
  choose(
    @CurrentUser() user: AuthUser,
    @Param("tripId") tripId: string,
    @Param("itemId") itemId: string,
  ) {
    return this.trips.choose(tripId, itemId, user.userId);
  }

  @Post(":tripId/days/:dayId/places")
  attach(
    @CurrentUser() user: AuthUser,
    @Param("tripId") tripId: string,
    @Param("dayId") dayId: string,
    @Body(new ZodValidationPipe(attachPlaceSchema)) body: { placeId: string | null },
  ) {
    return this.trips.attachPlace(tripId, dayId, body.placeId, user.userId);
  }
}
