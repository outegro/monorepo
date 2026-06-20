import { Body, Controller, Get, Headers, Ip, Param, Post } from "@nestjs/common";
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
  request(
    @Body(new ZodValidationPipe(requestSchema)) body: RequestInput,
    @Ip() ip: string,
    // Behind Cloudflare the true client IP is in cf-connecting-ip (the BFF forwards
    // it). Prefer it; fall back to @Ip() (X-Forwarded-For) for local/direct calls.
    @Headers("cf-connecting-ip") cfIp?: string,
  ) {
    return this.taglines.request(body.prompt, (cfIp || ip || "").trim());
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
