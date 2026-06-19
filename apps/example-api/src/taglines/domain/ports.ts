/**
 * Domain ports — `TaglineService` (request side) and `TaglineWorker` (compute
 * side) depend only on these interfaces, never on Prisma/Redis/RabbitMQ/MiniMax
 * directly (DIP). Adapters in `../infra` implement them; bound in the module.
 * Split by responsibility (ISP): store, cache, rate-limit, AI, events.
 */

export type TaglineJobStatus = "pending" | "done" | "failed";

export interface TaglineJob {
  id: string;
  prompt: string;
  status: TaglineJobStatus;
  taglines: string[];
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

/** A compact, pollable view of a job (what the API returns / caches). */
export interface TaglineJobView {
  id: string;
  status: TaglineJobStatus;
  taglines: string[];
  error: string | null;
}

/** Durable store (Postgres). */
export interface JobRepository {
  create(prompt: string): Promise<TaglineJob>;
  markDone(id: string, taglines: string[]): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  findById(id: string): Promise<TaglineJob | null>;
  countDone(): Promise<number>;
}
export const JOB_REPOSITORY = Symbol("JOB_REPOSITORY");

/** Read-through cache (Redis): job status views, prompt-result memoization, counter. */
export interface JobCache {
  putView(view: TaglineJobView): Promise<void>;
  getView(id: string): Promise<TaglineJobView | null>;
  rememberPrompt(promptHash: string, taglines: string[]): Promise<void>;
  recallPrompt(promptHash: string): Promise<string[] | null>;
  incrDone(): Promise<void>;
  doneCount(): Promise<number | null>;
}
export const JOB_CACHE = Symbol("JOB_CACHE");

/** Generic fixed-window rate limiter (Redis). */
export interface RateLimiter {
  consume(key: string, limit: number, windowSec: number): Promise<{ allowed: boolean }>;
}
export const RATE_LIMITER = Symbol("RATE_LIMITER");

/** AI tagline generation (MiniMax). The only place that knows about the model. */
export interface TaglineGenerator {
  generate(prompt: string): Promise<string[]>;
}
export const TAGLINE_GENERATOR = Symbol("TAGLINE_GENERATOR");

/** Domain-event publisher (RabbitMQ) — hands slow work to the worker. */
export interface JobEvents {
  publishRequested(event: { jobId: string; prompt: string }): Promise<void>;
}
export const JOB_EVENTS = Symbol("JOB_EVENTS");
