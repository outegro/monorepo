import { createHash } from "node:crypto";
import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  EVENTS_EXCHANGE,
  type TaglineRequestedEvent,
  TaglineRoutingKey,
} from "../messaging/messaging.constants";
import {
  JOB_CACHE,
  JOB_REPOSITORY,
  type JobCache,
  type JobRepository,
  TAGLINE_GENERATOR,
  type TaglineGenerator,
} from "./domain/ports";

/**
 * Compute side. Consumes `tagline.requested`, calls the AI, and writes the result
 * to Postgres + Redis. This is why the broker exists: the slow AI call runs here,
 * off the request path, and could live in a separate replica/service entirely.
 * Failures are recorded on the job (not thrown) so a bad prompt doesn't poison
 * the queue; the HTTP poll surfaces `status: failed`.
 */
@Injectable()
export class TaglineWorker {
  private readonly logger = new Logger(TaglineWorker.name);

  constructor(
    @Inject(JOB_REPOSITORY) private readonly repo: JobRepository,
    @Inject(JOB_CACHE) private readonly cache: JobCache,
    @Inject(TAGLINE_GENERATOR) private readonly generator: TaglineGenerator,
  ) {}

  @RabbitSubscribe({
    exchange: EVENTS_EXCHANGE,
    routingKey: TaglineRoutingKey.Requested,
    queue: "example-api.tagline.requested",
    queueOptions: { durable: true },
  })
  async onRequested(event: TaglineRequestedEvent): Promise<void> {
    try {
      const taglines = await this.generator.generate(event.prompt);
      await this.repo.markDone(event.jobId, taglines);
      await this.cache.putView({ id: event.jobId, status: "done", taglines, error: null });
      await this.cache.rememberPrompt(this.hash(event.prompt), taglines);
      await this.cache.incrDone();
      this.logger.log(`tagline job done: ${event.jobId} (${taglines.length} lines)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "generation failed";
      await this.repo.markFailed(event.jobId, message);
      await this.cache.putView({ id: event.jobId, status: "failed", taglines: [], error: message });
      this.logger.error(`tagline job failed: ${event.jobId}: ${message}`);
    }
  }

  private hash(prompt: string): string {
    return createHash("sha256").update(prompt.trim().toLowerCase()).digest("hex");
  }
}
