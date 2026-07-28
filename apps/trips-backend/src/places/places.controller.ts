import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from "@nestjs/common";
import type { z } from "zod";
import { type AuthUser, CurrentUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { updatePlaceSchema } from "../reels/reels.contracts";
import { PlacesService } from "./places.service";

@Controller("places")
@UseGuards(JwtAuthGuard)
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.places.list(user.userId);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updatePlaceSchema)) body: z.infer<typeof updatePlaceSchema>,
  ) {
    return this.places.update(user.userId, id, body);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.places.get(user.userId, id);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.places.remove(user.userId, id);
  }
}
