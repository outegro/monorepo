import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import type { Env } from "../config/env.validation";

/**
 * Thin ioredis wrapper. Owns the single connection and its lifecycle; feature
 * adapters (cache, rate limiter) depend on this, never on `new Redis()` directly.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(config: ConfigService<Env, true>) {
    this.client = new Redis(config.get("REDIS_URL", { infer: true }), {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
  }

  async ping(): Promise<void> {
    const res = await this.client.ping();
    if (res !== "PONG") throw new Error(`unexpected redis ping reply: ${res}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
