import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { type AuthUser, CurrentUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import {
  type CreateEntryInput,
  createEntrySchema,
  type IntakeInput,
  intakeSchema,
  type StructureInput,
  structureSchema,
  type UpdateEntryInput,
  type UpdateProfileInput,
  updateEntrySchema,
  updateProfileSchema,
} from "./lore.contracts";
import { LoreService } from "./lore.service";

@Controller("lore")
@UseGuards(JwtAuthGuard)
export class LoreController {
  constructor(private readonly lore: LoreService) {}

  /** Does the LLM have a key? (UI shows a disabled state otherwise.) */
  @Get("status")
  status() {
    return this.lore.status();
  }

  // ── Profile ──

  @Get("profile")
  getProfile(@CurrentUser() user: AuthUser) {
    return this.lore.getProfile(user.userId);
  }

  @Patch("profile")
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput,
  ) {
    return this.lore.updateProfile(user.userId, body);
  }

  // ── Intake flow (§2.1) ──

  /** Step 2: freeform text → improved version + red flags (structured JSON). */
  @Post("intake")
  review(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(intakeSchema)) body: IntakeInput,
  ) {
    return this.lore.review(user.userId, body.text);
  }

  /** Step 3: accepted text → structured lore_entries (persisted). */
  @Post("structure")
  structure(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(structureSchema)) body: StructureInput,
  ) {
    return this.lore.structure(user.userId, body.text);
  }

  // ── lore_entries CRUD ──

  @Get("entries")
  listEntries(@CurrentUser() user: AuthUser) {
    return this.lore.listEntries(user.userId);
  }

  @Post("entries")
  createEntry(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createEntrySchema)) body: CreateEntryInput,
  ) {
    return this.lore.createEntry(user.userId, body);
  }

  @Patch("entries/:id")
  updateEntry(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateEntrySchema)) body: UpdateEntryInput,
  ) {
    return this.lore.updateEntry(user.userId, id, body);
  }

  @Delete("entries/:id")
  deleteEntry(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.lore.deleteEntry(user.userId, id);
  }
}
