import { createHash } from "node:crypto";
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../config/env.validation";
import {
  JOB_CACHE,
  JOB_EVENTS,
  JOB_REPOSITORY,
  type JobCache,
  type JobEvents,
  type JobRepository,
  RATE_LIMITER,
  type RateLimiter,
  type TaglineJob,
  type TaglineJobView,
} from "./ports";

/**
 * Request side of the tagline generator. Never calls the AI itself — it persists
 * the job, hands the slow work to RabbitMQ, and returns immediately. Identical
 * prompts are served from the Redis memo without a new job. Pure orchestration
 * over ports (no infra imports), so adapters swap freely (OCP).
 */
@Injectable()
export class TaglineService {
  private readonly logger = new Logger(TaglineService.name);
  private readonly rateLimit: number;
  private readonly rateWindowSec: number;

  constructor(
    @Inject(JOB_REPOSITORY) private readonly repo: JobRepository,
    @Inject(JOB_CACHE) private readonly cache: JobCache,
    @Inject(RATE_LIMITER) private readonly rateLimiter: RateLimiter,
    @Inject(JOB_EVENTS) private readonly events: JobEvents,
    config: ConfigService<Env, true>,
  ) {
    this.rateLimit = config.get("GENERATE_RATE_LIMIT", { infer: true });
    this.rateWindowSec = config.get("GENERATE_RATE_WINDOW_SEC", { infer: true });
  }

  async request(prompt: string, clientIp: string): Promise<TaglineJobView> {
    const { allowed } = await this.rateLimiter.consume(
      `taglines:ip:${clientIp}`,
      this.rateLimit,
      this.rateWindowSec,
    );
    if (!allowed) {
      throw new HttpException(
        "Too many requests, slow down a little",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const job = await this.repo.create(prompt);

    // Memoized prompt → resolve synchronously, skip the AI round-trip.
    const cached = await this.cache.recallPrompt(this.hash(prompt));
    if (cached) {
      await this.repo.markDone(job.id, cached);
      const view: TaglineJobView = { id: job.id, status: "done", taglines: cached, error: null };
      await this.cache.putView(view);
      return view;
    }

    const view: TaglineJobView = { id: job.id, status: "pending", taglines: [], error: null };
    await this.cache.putView(view);
    await this.events.publishRequested({ jobId: job.id, prompt });
    this.logger.log(`tagline job queued: ${job.id}`);
    return view;
  }

  async getJob(id: string): Promise<TaglineJobView> {
    const cached = await this.cache.getView(id);
    if (cached) return cached;

    const job = await this.repo.findById(id);
    if (!job) throw new NotFoundException("job not found");
    const view = this.toView(job);
    await this.cache.putView(view);
    return view;
  }

  async stats(): Promise<{ generated: number }> {
    const cached = await this.cache.doneCount();
    return { generated: cached ?? (await this.repo.countDone()) };
  }

  /** Stable key for memoization — case/space-insensitive. */
  hash(prompt: string): string {
    return createHash("sha256").update(prompt.trim().toLowerCase()).digest("hex");
  }

  private toView(job: TaglineJob): TaglineJobView {
    return { id: job.id, status: job.status, taglines: job.taglines, error: job.error };
  }
}
