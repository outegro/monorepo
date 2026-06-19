import { Module } from "@nestjs/common";
import {
  JOB_CACHE,
  JOB_EVENTS,
  JOB_REPOSITORY,
  RATE_LIMITER,
  TAGLINE_GENERATOR,
} from "./domain/ports";
import { TaglineService } from "./domain/tagline.service";
import { MiniMaxTaglineGenerator } from "./infra/minimax-tagline.generator";
import { PrismaJobRepository } from "./infra/prisma-job.repository";
import { RabbitJobEvents } from "./infra/rabbitmq-job.events";
import { RedisJobCache } from "./infra/redis-job.cache";
import { RedisRateLimiter } from "./infra/redis-rate-limiter";
import { TaglineWorker } from "./tagline.worker";
import { TaglinesController } from "./taglines.controller";

/**
 * Composition root for the tagline feature: binds domain ports to infra adapters.
 * The use-case, worker and controller see only interfaces. Redis/RabbitMQ/Prisma
 * modules are global.
 */
@Module({
  controllers: [TaglinesController],
  providers: [
    TaglineService,
    TaglineWorker,
    { provide: JOB_REPOSITORY, useClass: PrismaJobRepository },
    { provide: JOB_CACHE, useClass: RedisJobCache },
    { provide: RATE_LIMITER, useClass: RedisRateLimiter },
    { provide: TAGLINE_GENERATOR, useClass: MiniMaxTaglineGenerator },
    { provide: JOB_EVENTS, useClass: RabbitJobEvents },
  ],
})
export class TaglinesModule {}
