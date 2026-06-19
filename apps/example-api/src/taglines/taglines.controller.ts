import { Body, Controller, Get, Ip, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { TaglineService } from "./domain/tagline.service";

const requestSchema = z.object({
  prompt: z.string().trim().min(3).max(280),
});
type RequestInput = z.infer<typeof requestSchema>;

/** Thin HTTP layer — validate, delegate, return. Async: POST queues, GET polls. */
@Controller("taglines")
export class TaglinesController {
  constructor(private readonly taglines: TaglineService) {}

  @Post()
  request(@Body(new ZodValidationPipe(requestSchema)) body: RequestInput, @Ip() ip: string) {
    return this.taglines.request(body.prompt, ip);
  }

  @Get("stats")
  stats() {
    return this.taglines.stats();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.taglines.getJob(id);
  }
}
