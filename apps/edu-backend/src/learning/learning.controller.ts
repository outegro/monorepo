import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { type AuthUser, CurrentUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { ZodValidationPipe } from "../common/zod-validation.pipe";
import {
  type Ask,
  askSchema,
  type HomeworkSubmit,
  homeworkSubmitSchema,
  type VocabAdd,
  vocabAddSchema,
} from "./learning.contracts";
import { LearningService } from "./learning.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class LearningController {
  constructor(private readonly learning: LearningService) {}

  @Post("chapters/:id/homework")
  homework(
    @Param("id") id: string,
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(homeworkSubmitSchema)) body: HomeworkSubmit,
  ) {
    return this.learning.checkHomework(id, user.userId, body.answer);
  }

  @Post("chapters/:id/ask")
  ask(@Param("id") id: string, @Body(new ZodValidationPipe(askSchema)) body: Ask) {
    return this.learning.ask(id, body.question);
  }

  @Get("chapters/:id/quiz")
  quiz(@Param("id") id: string) {
    return this.learning.quiz(id);
  }

  @Post("chapters/:id/vocab")
  addChapterVocab(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.learning.addChapterVocab(id, user.userId);
  }

  @Get("vocab")
  listVocab(@CurrentUser() user: AuthUser) {
    return this.learning.listVocab(user.userId);
  }

  @Post("vocab")
  addVocab(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(vocabAddSchema)) body: VocabAdd,
  ) {
    return this.learning.addVocab(user.userId, body);
  }

  @Delete("vocab/:id")
  removeVocab(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.learning.removeVocab(user.userId, id);
  }
}
