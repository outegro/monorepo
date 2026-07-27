import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { type AuthUser, CurrentUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import { PlacesService } from "../places/places.service";
import {
  type ConfirmInput,
  confirmSchema,
  type SubmitBatchInput,
  searchQuerySchema,
  submitBatchSchema,
  updateNoteSchema,
} from "./reels.contracts";
import { ReelsService } from "./reels.service";

@Controller("reels")
@UseGuards(JwtAuthGuard)
export class ReelsController {
  constructor(
    private readonly reels: ReelsService,
    private readonly places: PlacesService,
  ) {}

  /** Paste box: one reel per line, `<url>` or `<url> | <note>`. */
  @Post("batch")
  submitBatch(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(submitBatchSchema)) body: SubmitBatchInput,
  ) {
    return this.reels.submitBatch(user.userId, body.text);
  }

  /**
   * Kick the pipeline over whatever is still PENDING. Called from the UI rather than run on
   * a timer: with one user and a 3-day horizon, an explicit "process" button is easier to
   * reason about than a scheduler, and it makes rate limits visible instead of silent.
   */
  @Post("process")
  process(@CurrentUser() user: AuthUser) {
    return this.reels.processPending(user.userId);
  }

  @Get("queue")
  queue(@CurrentUser() user: AuthUser) {
    return this.reels.listForReview(user.userId);
  }

  @Get("counts")
  counts(@CurrentUser() user: AuthUser) {
    return this.reels.counts(user.userId);
  }

  /** Reviewer typed a better query than the model guessed. */
  @Post(":id/research")
  research(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Query(new ZodValidationPipe(searchQuerySchema)) q: { q: string; categoryGroup?: string },
  ) {
    return this.reels.researchAgain(user.userId, id, q.q, q.categoryGroup as never);
  }

  @Patch(":id/note")
  updateNote(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateNoteSchema)) body: { note: string | null },
  ) {
    return this.reels.updateNote(user.userId, id, body.note);
  }

  @Post(":id/confirm")
  confirm(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(confirmSchema)) body: ConfirmInput,
  ) {
    return this.reels.confirm(user.userId, id, body);
  }

  @Delete(":id")
  skip(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.reels.skip(user.userId, id);
  }
}
